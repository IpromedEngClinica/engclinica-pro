import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  cleanText,
  normalizeComparableText,
  normalizeExactCompanyName,
  outputDir,
  writeCsv,
} from "./lib.mjs";
import {
  budgetBaseNumber,
  buildMigrationIdentifier,
  isStandaloneBudgetByNumber,
} from "./regras_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--confirmar-normalizacao") &&
  process.env.CONFIRMAR_IMPORTACAO_ORCAMENTOS === "true";
const LOT_PATH = path.join(outputDir, "avulsos_menor_1400.csv");
const REPORT_DIR = path.join(outputDir, "avulsos_1400");
const REPORT_PATH = path.join(REPORT_DIR, "normalizacao_avulsos_menor_1400.csv");

const COMPANY_ALIASES = new Map([
  [normalizeComparableText("Clínica Infantil Querubim"), "59cd0e13-07d1-4784-95b2-a601af7d6754"],
  [normalizeComparableText("Dra. Lívia Moreira"), "838706da-2512-4753-a9d6-d955e9a3d4a7"],
  [normalizeComparableText("Hospital São Sebastião de Viçosa"), "da1eaa9a-77a3-4061-b439-f516811e49dd"],
  [normalizeComparableText("Asilo São Vicente de Paula"), "bb73c191-6fa9-44e8-8dea-5db4ceb8f7b5"],
]);

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

function appendToMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function resolveCompany(row, companies, byLegalName, byName) {
  const aliasId = COMPANY_ALIASES.get(normalizeComparableText(row.arkmeds_solicitante));
  if (aliasId && companies.some((company) => company.id === aliasId)) {
    return { id: aliasId, method: "alias_migracao_avulsos" };
  }

  const legalMatches = byLegalName.get(normalizeExactCompanyName(row.arkmeds_solicitante)) || [];
  const legalIds = [...new Set(legalMatches.map((company) => company.id))];
  if (legalIds.length === 1) return { id: legalIds[0], method: "razao_social_exata" };

  const matches = byName.get(normalizeComparableText(row.arkmeds_solicitante)) || [];
  const ids = [...new Set(matches.map((company) => company.id))];
  if (ids.length === 1) return { id: ids[0], method: "nome_exato_normalizado" };

  const prefix = cleanText(row.arkmeds_solicitante).split(/\s+-\s+/)[0];
  const prefixMatches = byName.get(normalizeComparableText(prefix)) || [];
  const prefixIds = [...new Set(prefixMatches.map((company) => company.id))];
  if (prefixIds.length === 1) return { id: prefixIds[0], method: "prefixo_nome_setor" };

  return { id: null, method: "nao_resolvida" };
}

function removeAssociationBlockers(reasons) {
  return (Array.isArray(reasons) ? reasons : []).filter(
    (reason) => !["OS_AMBIGUA", "POSSIVEL_OS_POR_NUMERO"].includes(reason)
  );
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const [{ rows: stagingRows }, { rows: companies }] = await Promise.all([
      client.query("select * from public.staging_arkmeds_orcamentos order by arkmeds_orcamento_id"),
      client.query("select id, nome, nome_fantasia from public.empresas where ativo = true"),
    ]);
    const targets = stagingRows.filter((row) => isStandaloneBudgetByNumber(row));
    const targetIds = targets.map((row) => row.arkmeds_orcamento_id);

    const [{ rows: items }, { rows: importedRows }] = await Promise.all([
      client.query(
        `select * from public.staging_arkmeds_orcamento_itens
         where arkmeds_orcamento_id = any($1::int[])
         order by arkmeds_orcamento_id, tipo_item, id`,
        [targetIds]
      ),
      client.query(
        `select id, numero, empresa_id, equipamento_id, ordem_servico_id, origem,
                identificador, arkmeds_orcamento_id, arkmeds_ordem_servico_numero,
                classificacao_vinculo_os, dados_migracao_json
         from public.orcamentos
         where origem_migracao = 'arkmeds'
           and arkmeds_orcamento_id = any($1::int[])`,
        [targetIds]
      ),
    ]);

    const itemsByBudget = new Map();
    for (const item of items) appendToMap(itemsByBudget, item.arkmeds_orcamento_id, item);
    const importedByArkmedsId = new Map(importedRows.map((row) => [row.arkmeds_orcamento_id, row]));
    const byLegalName = new Map();
    const byName = new Map();
    for (const company of companies) {
      appendToMap(byLegalName, normalizeExactCompanyName(company.nome), company);
      appendToMap(byName, normalizeComparableText(company.nome), company);
      appendToMap(byName, normalizeComparableText(company.nome_fantasia), company);
    }

    const report = [];
    for (const row of targets) {
      row.__items = itemsByBudget.get(row.arkmeds_orcamento_id) || [];
      const imported = importedByArkmedsId.get(row.arkmeds_orcamento_id) || null;
      const company = resolveCompany(row, companies, byLegalName, byName);
      const identifier = buildMigrationIdentifier(row);
      const requiresCorrection = Boolean(imported && (
        imported.origem !== "avulso" ||
        imported.ordem_servico_id ||
        imported.equipamento_id ||
        imported.arkmeds_ordem_servico_numero ||
        imported.classificacao_vinculo_os !== "sem_os_avulso" ||
        imported.identificador !== identifier ||
        (company.id && imported.empresa_id !== company.id)
      ));

      report.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        numero_base: budgetBaseNumber(row),
        cliente_arkmeds: row.arkmeds_solicitante,
        empresa_id_resolvida: company.id || "",
        empresa_resolvida_por: company.method,
        identificador: identifier,
        quantidade_itens_staging: row.__items.length,
        status: imported ? "ja_importado" : "pendente_importacao",
        precisa_correcao: requiresCorrection ? "sim" : "nao",
        origem_anterior: imported?.origem || "",
        os_anterior: imported?.arkmeds_ordem_servico_numero || "",
        resultado: company.id ? "pronto" : "empresa_nao_resolvida",
      });

      if (!APPLY || !company.id) continue;

      const blockers = removeAssociationBlockers(row.motivos_bloqueantes);
      const nextValidationStatus = row.status_validacao === "pendente_os" && !blockers.length
        ? "ok_para_importar_com_detalhes_parciais"
        : row.status_validacao;
      await client.query(
        `update public.staging_arkmeds_orcamentos
         set empresa_id_resolvida = $2,
             ordem_servico_id_resolvida = null,
             equipamento_id_resolvido = null,
             os_candidata_id = null,
             os_candidata_numero = null,
             classificacao_vinculo_os = 'sem_os_avulso',
             motivos_bloqueantes = $3::text[],
             status_validacao = $4,
             atualizado_em = now()
         where arkmeds_orcamento_id = $1`,
        [row.arkmeds_orcamento_id, company.id, blockers, nextValidationStatus]
      );

      if (imported) {
        await client.query(
          `update public.orcamentos
           set empresa_id = $2,
               equipamento_id = null,
               ordem_servico_id = null,
               origem = 'avulso',
               arkmeds_ordem_servico_numero = null,
               classificacao_vinculo_os = 'sem_os_avulso',
               identificador = $3,
               dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb) || $4::jsonb,
               updated_at = now()
           where id = $1`,
          [
            imported.id,
            company.id,
            identifier,
            JSON.stringify({
              normalizacao_avulso_1400: {
                aplicada_em: new Date().toISOString(),
                regra: "numero_base_menor_1400",
                numero_base: budgetBaseNumber(row),
                origem_anterior: imported.origem,
                ordem_servico_id_anterior: imported.ordem_servico_id,
                equipamento_id_anterior: imported.equipamento_id,
                arkmeds_ordem_servico_numero_anterior: imported.arkmeds_ordem_servico_numero,
              },
            }),
          ]
        );
      }
    }

    if (APPLY) {
      await client.query(
        `insert into public.migracao_arkmeds_logs
          (tipo_execucao, entidade, status, mensagem, payload_json)
         values ('real', 'orcamentos_avulsos_1400', 'concluido', $1, $2::jsonb)`,
        [
          "Normalizacao dos orcamentos ArkMeds com numero-base menor que 1400.",
          JSON.stringify({
            total_alvo: targets.length,
            ja_importados: importedRows.length,
            pendentes_importacao: targets.length - importedRows.length,
            empresas_nao_resolvidas: report.filter((item) => item.resultado !== "pronto").length,
          }),
        ]
      );
    }

    await writeCsv(LOT_PATH, report.filter((row) => row.resultado === "pronto"), [
      "arkmeds_orcamento_id", "numero_orcamento", "numero_base", "cliente_arkmeds",
      "empresa_id_resolvida", "empresa_resolvida_por", "identificador",
      "quantidade_itens_staging", "status", "precisa_correcao", "origem_anterior",
      "os_anterior", "resultado",
    ]);
    await writeCsv(REPORT_PATH, report, [
      "arkmeds_orcamento_id", "numero_orcamento", "numero_base", "cliente_arkmeds",
      "empresa_id_resolvida", "empresa_resolvida_por", "identificador",
      "quantidade_itens_staging", "status", "precisa_correcao", "origem_anterior",
      "os_anterior", "resultado",
    ]);

    console.log(JSON.stringify({
      modo: APPLY ? "aplicado" : "simulacao",
      total_alvo: targets.length,
      ja_importados: importedRows.length,
      pendentes_importacao: targets.length - importedRows.length,
      precisam_correcao: report.filter((item) => item.precisa_correcao === "sim").length,
      empresas_nao_resolvidas: report.filter((item) => item.resultado !== "pronto").length,
      lote: LOT_PATH,
      relatorio: REPORT_PATH,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

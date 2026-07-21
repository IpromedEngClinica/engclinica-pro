import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { cleanText, outputDir, writeCsv } from "./lib.mjs";

const { Client } = pg;
const REPORT_DIR = path.join(outputDir, "resolucoes-manuais-2026-07-20");
const LOT_PATH = path.join(outputDir, "lote_resolucoes_manuais_2026_07_20.csv");
const STANDALONE_MARKER = "AVULSO_CONFIRMADO_PELO_USUARIO";
const LINK_MARKER = "VINCULO_CONFIRMADO_PELO_USUARIO";

const ACTIONS = [
  { id: 216, numero: "30987", mode: "standalone", companyName: "TecMed Barbacena" },
  { id: 388, numero: "25139", mode: "link", osNumber: "25139" },
  { id: 508, numero: "34695", mode: "link", osNumber: "34695" },
  { id: 554, numero: "35918", mode: "link", osNumber: "35918", companyLegacyId: 386 },
  { id: 594, numero: "35858", mode: "link", osNumber: "35858", companyLegacyId: 713 },
  { id: 781, numero: "39054", mode: "link", osNumber: "39054", companyLegacyId: 548 },
  { id: 1209, numero: "24764", mode: "link", osNumber: "24764" },
  { id: 1578, numero: "12386", mode: "link", osNumber: "12386" },
  { id: 2305, numero: "47660", mode: "standalone", companyName: "Ana do Padre Frederico" },
  { id: 2479, numero: "48307", mode: "link", osNumber: "48307", companyLegacyId: 548 },
  { id: 2607, numero: "48717", mode: "link", osNumber: "48717", companyLegacyId: 548 },
  { id: 2811, numero: "49578", mode: "link", osNumber: "49578", companyLegacyId: 548 },
  { id: 3476, numero: "51438", mode: "link", osNumber: "51438", companyLegacyId: 1125 },
  {
    id: 2910,
    numero: "48899.1",
    mode: "link",
    osNumber: "48899",
    companyName: "Hospital Universitário Juiz de Fora - Unidade Santa Catarina",
    holdOnCompanyMismatch: true,
  },
  {
    id: 2915,
    numero: "46444.1",
    mode: "link",
    osNumber: "46444",
    companyName: "Hospital Universitário Juiz de Fora - Unidade Dom Bosco",
    holdOnCompanyMismatch: true,
  },
];

function parseArgs(argv) {
  return { apply: argv.includes("--aplicar") };
}

function uniqueById(rows) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

async function resolveCompany(client, action) {
  if (action.companyLegacyId != null) {
    const { rows } = await client.query(
      `select id, nome, numero_cadastro
       from public.empresas
       where ativo = true and numero_cadastro = $1::bigint`,
      [String(action.companyLegacyId)]
    );
    return rows.length === 1 ? rows[0] : null;
  }

  if (action.companyName) {
    const { rows } = await client.query(
      `select id, nome, numero_cadastro
       from public.empresas
       where ativo = true
         and lower(trim(nome)) = lower(trim($1))`,
      [action.companyName]
    );
    return rows.length === 1 ? rows[0] : null;
  }

  return null;
}

async function resolveOrder(client, number) {
  const { rows } = await client.query(
    `select os.id, os.numero, os.empresa_id, os.equipamento_id,
            empresa.nome as empresa, tipo_equipamento.nome as tipo_equipamento
     from public.ordens_servico os
     left join public.empresas empresa on empresa.id = os.empresa_id
     left join public.equipamentos equipamento on equipamento.id = os.equipamento_id
     left join public.tipos_equipamento tipo_equipamento
       on tipo_equipamento.id = equipamento.tipo_equipamento_id
     where os.numero = $1`,
    [number]
  );
  const unique = uniqueById(rows);
  return unique.length === 1 ? unique[0] : null;
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const report = [];
  const approved = [];

  try {
    for (const action of ACTIONS) {
      const { rows: budgets } = await client.query(
        `select arkmeds_orcamento_id, arkmeds_orcamento_numero_original,
                arkmeds_solicitante, motivos_bloqueantes
         from public.staging_arkmeds_orcamentos
         where arkmeds_orcamento_id = $1`,
        [action.id]
      );
      const budget = budgets[0] || null;
      const requestedCompany = await resolveCompany(client, action);
      const order = action.mode === "link" ? await resolveOrder(client, action.osNumber) : null;
      const company = action.mode === "link" && !requestedCompany
        ? order && { id: order.empresa_id, nome: order.empresa }
        : requestedCompany;

      let result = "aprovado";
      let reason = action.mode === "standalone"
        ? STANDALONE_MARKER
        : LINK_MARKER;

      if (!budget) {
        result = "bloqueado";
        reason = "ORCAMENTO_NAO_LOCALIZADO_NO_STAGING";
      } else if (!company) {
        result = "bloqueado";
        reason = "EMPRESA_NAO_LOCALIZADA_DE_FORMA_UNICA";
      } else if (action.mode === "link" && !order) {
        result = "bloqueado";
        reason = "OS_NAO_LOCALIZADA_DE_FORMA_UNICA";
      } else if (
        action.mode === "link" &&
        action.holdOnCompanyMismatch &&
        company.id !== order.empresa_id
      ) {
        result = "bloqueado";
        reason = "CLIENTE_INFORMADO_DIVERGE_DO_CLIENTE_DA_OS";
      } else if (
        action.mode === "link" &&
        requestedCompany &&
        requestedCompany.id !== order.empresa_id
      ) {
        result = "bloqueado";
        reason = "CLIENTE_ARKMEDS_DIVERGE_DO_CLIENTE_DA_OS";
      }

      const row = {
        arkmeds_orcamento_id: action.id,
        numero_orcamento: budget?.arkmeds_orcamento_numero_original || action.numero,
        cliente_origem: budget?.arkmeds_solicitante || "",
        modo_resolucao: action.mode === "link" ? "vinculado_os" : "avulso",
        empresa_resolvida: company?.nome || "",
        empresa_id_resolvida: company?.id || "",
        os_numero: order?.numero || "",
        os_empresa: order?.empresa || "",
        os_id: order?.id || "",
        equipamento_id: order?.equipamento_id || "",
        resultado: result,
        motivo: reason,
        modo_execucao: apply ? "aplicacao" : "dry_run",
      };
      report.push(row);
      if (result === "aprovado") approved.push({ action, budget, company, order, row });
    }

    if (apply) {
      await client.query("begin");
      try {
        for (const item of approved) {
          const { action, company, order } = item;
          const isStandalone = action.mode === "standalone";
          const marker = isStandalone ? STANDALONE_MARKER : LINK_MARKER;
          await client.query(
            `update public.staging_arkmeds_orcamentos
             set arkmeds_ordem_servico_id = case when $2 then null else arkmeds_ordem_servico_id end,
                 arkmeds_ordem_servico_numero = case when $2 then null else $3 end,
                 os_candidata_id = case when $2 then null else $4::uuid end,
                 os_candidata_numero = case when $2 then null else $3 end,
                 cliente_os_candidato = case when $2 then null else $5 end,
                 empresa_id_resolvida = $6::uuid,
                 ordem_servico_id_resolvida = case when $2 then null else $4::uuid end,
                 equipamento_id_resolvido = case when $2 then null else $7::uuid end,
                 classificacao_vinculo_os = case when $2 then 'sem_os_avulso' else 'com_os_confirmada' end,
                 score_os = 100,
                 confianca_os = 'alta',
                 motivos_associacao_os = array[$8]::text[],
                 motivos_bloqueantes = array_remove(
                   array_remove(
                     array_remove(coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                     'POSSIVEL_OS_POR_NUMERO'
                   ),
                   'EMPRESA_NAO_RESOLVIDA'
                 ),
                 status_validacao = case
                   when cardinality(array_remove(
                     array_remove(
                       array_remove(coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                       'POSSIVEL_OS_POR_NUMERO'
                     ),
                     'EMPRESA_NAO_RESOLVIDA'
                   )) = 0
                   then 'ok_para_importar_com_detalhes_parciais'
                   else status_validacao
                 end,
                 recomendacao_migracao = case when $2 then 'tratar_como_avulso' else 'confirmar_vinculo' end,
                 atualizado_em = now()
             where arkmeds_orcamento_id = $1`,
            [
              action.id,
              isStandalone,
              order?.numero || null,
              order?.id || null,
              order?.empresa || null,
              company.id,
              order?.equipamento_id || null,
              marker,
            ]
          );
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const columns = [
      "arkmeds_orcamento_id", "numero_orcamento", "cliente_origem", "modo_resolucao",
      "empresa_resolvida", "empresa_id_resolvida", "os_numero", "os_empresa", "os_id",
      "equipamento_id", "resultado", "motivo", "modo_execucao",
    ];
    await writeCsv(
      path.join(REPORT_DIR, apply ? "resultado_aplicacao.csv" : "resultado_dry_run.csv"),
      report,
      columns
    );
    await writeCsv(
      LOT_PATH,
      approved.map(({ action }) => ({
        arkmeds_orcamento_id: action.id,
        numero_orcamento: action.numero,
      })),
      ["arkmeds_orcamento_id", "numero_orcamento"]
    );

    console.log(JSON.stringify({
      modo: apply ? "aplicacao" : "dry_run",
      total_analisado: report.length,
      aprovados: approved.length,
      bloqueados: report.filter((row) => row.resultado === "bloqueado").length,
      bloqueios: report
        .filter((row) => row.resultado === "bloqueado")
        .map((row) => ({ numero: row.numero_orcamento, motivo: row.motivo })),
      lote: LOT_PATH,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

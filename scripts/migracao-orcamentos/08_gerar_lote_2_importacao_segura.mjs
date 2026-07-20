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
  buildMigrationIdentifier,
  getSpreadsheetOsNumber,
  identifierNeedsReview,
  isSpreadsheetAvulso,
} from "./regras_orcamentos.mjs";

const { Client } = pg;
const loteArg = process.argv.find((arg) => arg.startsWith("--lote="));
const lote = loteArg ? loteArg.slice("--lote=".length) : "lote_2";
if (!["lote_2", "lote_3"].includes(lote)) {
  throw new Error(`Lote de saida invalido: ${lote}.`);
}
const outputPath = path.join(outputDir, `${lote}_importacao_segura.csv`);

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Configure SUPABASE_DB_URL para gerar o Lote 2.");
  }
  return process.env.SUPABASE_DB_URL;
}

function appendToMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function selectUniqueSourceOrder(candidates) {
  if (candidates.length === 1) return candidates[0];
  const arkmedsOrders = candidates.filter(
    (order) => order.arkmeds_os_id != null
  );
  return arkmedsOrders.length === 1 ? arkmedsOrders[0] : null;
}

async function main() {
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows: candidates } = await client.query(`
      select s.*
      from public.staging_arkmeds_orcamentos s
      where not exists (
        select 1
        from public.orcamentos o
        where o.origem_migracao = 'arkmeds'
          and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
      )
        and lower(coalesce(s.arkmeds_status_grupo, '')) not in ('cancelado', 'cancelados', 'recusado', 'recusados')
        and s.status_normalizado_importacao in ('pendente', 'aprovado_em_curso', 'faturado', 'reprovado_em_curso')
        and s.tem_itens_preservados = true
        and s.status_preservacao_itens = 'itens_preservados'
        and nullif(trim(coalesce(s.pdf_original_url, '')), '') is not null
        and coalesce(s.motivos_bloqueantes, '{}'::text[]) <@ array['OS_AMBIGUA', 'POSSIVEL_OS_POR_NUMERO']::text[]
        and exists (
          select 1
          from public.staging_arkmeds_orcamento_itens i
          where i.arkmeds_orcamento_id = s.arkmeds_orcamento_id
        )
      order by s.arkmeds_orcamento_id
    `);

    const { rows: companies } = await client.query(`
      select id, nome, nome_fantasia
      from public.empresas
      where ativo = true
    `);
    const companiesByName = new Map();
    const companiesByLegalName = new Map();
    for (const company of companies) {
      appendToMap(companiesByLegalName, normalizeExactCompanyName(company.nome), company);
      for (const name of [company.nome, company.nome_fantasia]) {
        const key = normalizeComparableText(name);
        if (!key) continue;
        appendToMap(companiesByName, key, company);
      }
    }
    for (const row of candidates) {
      if (row.empresa_id_resolvida) continue;
      const legalMatches = companiesByLegalName.get(
        normalizeExactCompanyName(row.arkmeds_solicitante)
      ) || [];
      const legalIds = [...new Set(legalMatches.map((company) => company.id))];
      if (legalIds.length === 1) {
        row.empresa_id_resolvida = legalIds[0];
        continue;
      }
      const exact = companiesByName.get(normalizeComparableText(row.arkmeds_solicitante)) || [];
      const exactIds = [...new Set(exact.map((company) => company.id))];
      if (exactIds.length === 1) {
        row.empresa_id_resolvida = exactIds[0];
        continue;
      }
      const prefix = cleanText(row.arkmeds_solicitante).split(/\s+-\s+/)[0];
      const prefixMatches = companiesByName.get(normalizeComparableText(prefix)) || [];
      const prefixIds = [...new Set(prefixMatches.map((company) => company.id))];
      if (prefixIds.length === 1) row.empresa_id_resolvida = prefixIds[0];
    }

    const resolvedCandidates = candidates.filter((row) => row.empresa_id_resolvida);
    const excluded = {
      empresa_nao_resolvida: candidates.length - resolvedCandidates.length,
      identificador_generico: 0,
      vinculo_nao_comprovado: 0,
    };
    const sourceNumbers = [...new Set(resolvedCandidates
      .map((row) => getSpreadsheetOsNumber(row) || cleanText(row.arkmeds_ordem_servico_numero))
      .filter(Boolean))];
    const sourceArkmedsIds = [...new Set(resolvedCandidates
      .map((row) => Number.parseInt(row.arkmeds_ordem_servico_id, 10))
      .filter(Number.isInteger))];
    const { rows: orders } = await client.query(`
      select id, numero, arkmeds_os_id, empresa_id
      from public.ordens_servico
      where numero = any($1::text[])
         or arkmeds_os_id = any($2::bigint[])
    `, [sourceNumbers, sourceArkmedsIds]);

    const byNumberAndCompany = new Map();
    const byNumber = new Map();
    const byArkmedsId = new Map();
    for (const order of orders) {
      appendToMap(byNumber, order.numero, order);
      appendToMap(byNumberAndCompany, `${order.numero}|${order.empresa_id}`, order);
      if (order.arkmeds_os_id != null) appendToMap(byArkmedsId, String(order.arkmeds_os_id), order);
    }

    const safeRows = [];
    for (const row of resolvedCandidates) {
      const sourceNumber = getSpreadsheetOsNumber(row) || cleanText(row.arkmeds_ordem_servico_numero);
      const sourceArkmedsId = cleanText(row.arkmeds_ordem_servico_id);
      const directMatches = sourceArkmedsId ? byArkmedsId.get(sourceArkmedsId) || [] : [];
      const numberMatches = sourceNumber
        ? byNumberAndCompany.get(`${sourceNumber}|${row.empresa_id_resolvida}`) || []
        : [];
      const globalNumberMatches = sourceNumber ? byNumber.get(sourceNumber) || [] : [];
      const exactOrder = directMatches.length === 1
        ? directMatches[0]
        : selectUniqueSourceOrder(numberMatches) || selectUniqueSourceOrder(globalNumberMatches);
      const avulsoSeguro = (!sourceArkmedsId && !sourceNumber &&
        ["sem_os_avulso", "provavel_avulso_numero_baixo"].includes(row.classificacao_vinculo_os)) ||
        isSpreadsheetAvulso(row);

      if (!exactOrder && !avulsoSeguro) {
        excluded.vinculo_nao_comprovado += 1;
        continue;
      }
      const identifier = buildMigrationIdentifier(row);
      if (identifierNeedsReview(identifier)) {
        excluded.identificador_generico += 1;
        continue;
      }
      safeRows.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        cliente: row.arkmeds_solicitante,
        status_arkmeds: row.arkmeds_status_grupo,
        status_normalizado: row.status_normalizado_importacao,
        classificacao_anterior: row.classificacao_vinculo_os,
        os_origem: sourceNumber || sourceArkmedsId || "",
        os_resolvida_id: exactOrder?.id || "",
        criterio_seguranca: exactOrder
          ? "os_unica_mesmo_cliente"
          : isSpreadsheetAvulso(row)
            ? "avulso_confirmado_planilha"
            : "avulso_sem_referencia_os",
      });
    }

    await writeCsv(outputPath, safeRows, [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "cliente",
      "status_arkmeds",
      "status_normalizado",
      "classificacao_anterior",
      "os_origem",
      "os_resolvida_id",
      "criterio_seguranca",
    ]);

    const byStatus = safeRows.reduce((acc, row) => {
      acc[row.status_normalizado] = (acc[row.status_normalizado] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify({
      candidatos_base: candidates.length,
      candidatos_com_empresa: resolvedCandidates.length,
      lote,
      lote_seguro: safeRows.length,
      excluidos: excluded,
      por_status: byStatus,
      arquivo: outputPath,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

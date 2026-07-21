import path from "node:path";
import pg from "pg";
import {
  normalizeComparableText,
  normalizeExactCompanyName,
  outputDir,
  writeCsv,
} from "./lib.mjs";

const { Client } = pg;
const OUTPUT_PATH = path.join(outputDir, "lote_cancelados_avulsos_seguros.csv");

function appendToMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function hasUniqueCompany(row, companiesByLegalName, companiesByName) {
  if (row.empresa_id_resolvida) return true;

  const legalMatches = companiesByLegalName.get(
    normalizeExactCompanyName(row.arkmeds_solicitante),
  ) || [];
  if (new Set(legalMatches.map((company) => company.id)).size === 1) return true;

  const nameMatches = companiesByName.get(
    normalizeComparableText(row.arkmeds_solicitante),
  ) || [];
  return new Set(nameMatches.map((company) => company.id)).size === 1;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const [{ rows }, { rows: companies }] = await Promise.all([
      client.query(`
        select
          s.*,
          coalesce(items.quantidade, 0)::int as quantidade_itens
        from public.staging_arkmeds_orcamentos s
        left join lateral (
          select count(*) as quantidade
          from public.staging_arkmeds_orcamento_itens item
          where item.staging_orcamento_id = s.id
        ) items on true
        where s.arkmeds_status_grupo = 'cancelados'
          and s.status_validacao = 'historico_consulta'
          and s.classificacao_vinculo_os in ('com_os_confirmada', 'sem_os_avulso')
          and coalesce(cardinality(s.motivos_bloqueantes), 0) = 0
          and s.tem_itens_preservados = true
          and abs(coalesce(s.diferenca_valor, 0)) <= 0.01
          and not exists (
            select 1
            from public.orcamentos o
            where o.origem_migracao = 'arkmeds'
              and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
          )
        order by s.arkmeds_orcamento_id
      `),
      client.query(`
        select id, nome, nome_fantasia
        from public.empresas
        where ativo = true
      `),
    ]);

    const companiesByLegalName = new Map();
    const companiesByName = new Map();
    for (const company of companies) {
      appendToMap(companiesByLegalName, normalizeExactCompanyName(company.nome), company);
      appendToMap(companiesByName, normalizeComparableText(company.nome), company);
      appendToMap(companiesByName, normalizeComparableText(company.nome_fantasia), company);
    }

    const accepted = [];
    const rejected = [];
    for (const row of rows) {
      const linked = row.classificacao_vinculo_os === "com_os_confirmada" &&
        Boolean(row.ordem_servico_id_resolvida);
      const standalone = row.classificacao_vinculo_os === "sem_os_avulso" &&
        hasUniqueCompany(row, companiesByLegalName, companiesByName);
      const hasItems = Number(row.quantidade_itens) > 0;

      const output = {
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        cliente: row.arkmeds_solicitante,
        classificacao_vinculo_os: row.classificacao_vinculo_os,
        status_validacao: row.status_validacao,
        quantidade_itens: row.quantidade_itens,
        resultado: linked ? "os_confirmada" : standalone ? "avulso_seguro" : "excluido",
      };

      if (hasItems && (linked || standalone)) accepted.push(output);
      else rejected.push(output);
    }

    await writeCsv(OUTPUT_PATH, accepted, [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "cliente",
      "classificacao_vinculo_os",
      "status_validacao",
      "quantidade_itens",
      "resultado",
    ]);

    console.log(JSON.stringify({
      output: OUTPUT_PATH,
      candidatos_staging: rows.length,
      aceitos: accepted.length,
      com_os_confirmada: accepted.filter((row) => row.resultado === "os_confirmada").length,
      avulsos_seguros: accepted.filter((row) => row.resultado === "avulso_seguro").length,
      excluidos: rejected.length,
      excluidos_ids: rejected.map((row) => row.arkmeds_orcamento_id),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

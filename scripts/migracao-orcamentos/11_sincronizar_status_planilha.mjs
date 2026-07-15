import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { outputDir, writeCsv } from "./lib.mjs";
import {
  destinationStatus,
  effectiveNormalizedStatus,
  effectiveStatusPolicy,
} from "./planilha_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const OUTPUT_FILE = path.join(
  outputDir,
  "importacao",
  "sincronizacao_status_planilha.csv",
);

function databaseUrl() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Configure SUPABASE_DB_URL.");
  }
  return process.env.SUPABASE_DB_URL;
}

async function loadImportedBudgets(client) {
  const { rows } = await client.query(`
    select
      o.id as orcamento_id,
      o.numero,
      o.status as status_atual,
      o.status_normalizado_importacao as status_normalizado_atual,
      o.politica_importacao_status as politica_atual,
      o.arkmeds_orcamento_id,
      e.nome as cliente,
      s.dados_planilha_json->>'etapa_atual' as status_planilha,
      s.*
    from public.orcamentos o
    join public.empresas e on e.id = o.empresa_id
    join public.staging_arkmeds_orcamentos s
      on s.arkmeds_orcamento_id = o.arkmeds_orcamento_id
    where o.origem_migracao = 'arkmeds'
    order by o.arkmeds_orcamento_id
  `);
  return rows;
}

function expectedStatus(row) {
  return {
    status: destinationStatus(row) || row.status_atual,
    normalized: effectiveNormalizedStatus(row),
    policy: effectiveStatusPolicy(row),
  };
}

function hasChanges(row, expected) {
  return row.status_atual !== expected.status
    || row.status_normalizado_atual !== expected.normalized
    || row.politica_atual !== expected.policy;
}

async function applyStatus(client, row, expected) {
  await client.query(`
    update public.orcamentos
    set status = $2,
        status_normalizado_importacao = $3,
        politica_importacao_status = $4,
        data_aprovacao = $5,
        data_reprovacao = $6,
        data_faturamento = $7,
        data_cancelamento = $8,
        dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
          || jsonb_build_object(
            'status_planilha_sincronizado_em', now(),
            'status_planilha', $9::text
          ),
        updated_at = now()
    where id = $1
  `, [
    row.orcamento_id,
    expected.status,
    expected.normalized,
    expected.policy,
    row.arkmeds_data_aprovacao || null,
    row.arkmeds_data_reprovacao || null,
    row.arkmeds_data_faturamento || null,
    row.arkmeds_data_cancelamento || null,
    row.status_planilha || null,
  ]);
}

async function main() {
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  const client = new Client({
    connectionString: databaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const rows = await loadImportedBudgets(client);
    const changes = rows
      .map((row) => ({ row, expected: expectedStatus(row) }))
      .filter(({ row, expected }) => hasChanges(row, expected));

    if (APPLY) await client.query("begin");
    for (const { row, expected } of changes) {
      if (APPLY) await applyStatus(client, row, expected);
    }
    if (APPLY) await client.query("commit");

    const reportRows = changes.map(({ row, expected }) => ({
      arkmeds_orcamento_id: row.arkmeds_orcamento_id,
      numero_orcamento: row.numero,
      cliente: row.cliente,
      status_planilha: row.status_planilha,
      status_anterior: row.status_atual,
      status_novo: expected.status,
      resultado: APPLY ? "atualizado" : "simulado",
    }));
    await writeCsv(OUTPUT_FILE, reportRows, [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "cliente",
      "status_planilha",
      "status_anterior",
      "status_novo",
      "resultado",
    ]);

    console.log(JSON.stringify({
      modo: APPLY ? "aplicacao" : "simulacao",
      importados_analisados: rows.length,
      alteracoes: changes.length,
      relatorio: OUTPUT_FILE,
    }, null, 2));
  } catch (error) {
    if (APPLY) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

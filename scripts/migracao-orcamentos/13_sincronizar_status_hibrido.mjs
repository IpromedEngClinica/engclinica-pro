import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  arkmedsStatusLabel,
  normalizeArkmedsStatusGroup,
  outputDir,
  statusImportPolicy,
  writeCsv,
} from "./lib.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const CONFIRMED = process.env.CONFIRMAR_SINCRONIZACAO_ORCAMENTOS === "true";
const REAL_APPLY = APPLY && CONFIRMED;
const REPORT_DIR = path.join(outputDir, "sincronizacao-hibrida");
const SNAPSHOT_FILE = path.join(
  outputDir,
  "conferencia-status-atual",
  "snapshot_arkmeds_atual.json",
);

const destinationByGroup = {
  pendentes: "pendente",
  aprovados_em_curso: "aprovado",
  reprovados_em_curso: "reprovado",
  faturados: "faturado",
  cancelados: "cancelado",
  recusados: "recusado",
};

function databaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

async function loadSnapshot() {
  const rows = JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf-8"));
  const byId = new Map();
  for (const row of rows) {
    const id = Number(row.arkmeds_orcamento_id);
    if (!Number.isInteger(id)) continue;
    if (byId.has(id)) throw new Error(`ID ArkMeds duplicado no snapshot: ${id}`);
    byId.set(id, row);
  }
  return [...byId.values()];
}

async function loadStored(client) {
  const { rows } = await client.query(`
    select
      s.arkmeds_orcamento_id,
      s.arkmeds_orcamento_numero,
      s.arkmeds_status_grupo,
      s.arkmeds_status_planilha,
      s.arkmeds_data_faturamento,
      s.arkmeds_data_aprovacao,
      s.arkmeds_data_reprovacao,
      s.arkmeds_data_cancelamento,
      o.id as orcamento_ipromed_id,
      o.status as status_ipromed
    from public.staging_arkmeds_orcamentos s
    left join public.orcamentos o
      on o.origem_migracao = 'arkmeds'
     and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
  `);
  return new Map(rows.map((row) => [Number(row.arkmeds_orcamento_id), row]));
}

function buildPlan(snapshot, storedById) {
  return snapshot.map((live) => {
    const id = Number(live.arkmeds_orcamento_id);
    const stored = storedById.get(id) || {};
    const destination = destinationByGroup[live.status_grupo] || null;
    return {
      arkmeds_orcamento_id: id,
      numero: live.numero || stored.arkmeds_orcamento_numero || null,
      status_planilha: stored.arkmeds_status_planilha || null,
      status_staging_anterior: stored.arkmeds_status_grupo || null,
      status_arkmeds_atual: live.status_grupo,
      status_ipromed_anterior: stored.status_ipromed || null,
      status_ipromed_novo: destination,
      importado_ipromed: stored.orcamento_ipromed_id ? "sim" : "nao",
      atualizar_staging: stored.arkmeds_status_grupo !== live.status_grupo ? "sim" : "nao",
      atualizar_ipromed:
        stored.orcamento_ipromed_id && destination && stored.status_ipromed !== destination
          ? "sim"
          : "nao",
      orcamento_ipromed_id: stored.orcamento_ipromed_id || null,
      data_faturamento: stored.arkmeds_data_faturamento || null,
      data_aprovacao: stored.arkmeds_data_aprovacao || null,
      data_reprovacao: stored.arkmeds_data_reprovacao || null,
      data_cancelamento: stored.arkmeds_data_cancelamento || null,
    };
  });
}

async function applyStaging(client, row) {
  await client.query(`
    update public.staging_arkmeds_orcamentos
       set arkmeds_status_grupo = $2,
           arkmeds_status_label = $3,
           arkmeds_status_original = $3,
           status_normalizado_importacao = $4,
           politica_importacao_status = $5
     where arkmeds_orcamento_id = $1
  `, [
    row.arkmeds_orcamento_id,
    row.status_arkmeds_atual,
    arkmedsStatusLabel(row.status_arkmeds_atual),
    normalizeArkmedsStatusGroup(row.status_arkmeds_atual),
    statusImportPolicy(row.status_arkmeds_atual),
  ]);
}

async function applyIpromed(client, row) {
  await client.query(`
    update public.orcamentos
       set status = $2,
           arkmeds_status_original = $3,
           status_normalizado_importacao = $4,
           politica_importacao_status = $5,
           data_faturamento = case when $2 = 'faturado' then coalesce(data_faturamento, $6) else data_faturamento end,
           data_aprovacao = case when $2 = 'aprovado' then coalesce(data_aprovacao, $7) else data_aprovacao end,
           data_reprovacao = case when $2 = 'reprovado' then coalesce(data_reprovacao, $8) else data_reprovacao end,
           data_cancelamento = case when $2 = 'cancelado' then coalesce(data_cancelamento, $9) else data_cancelamento end,
           dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
             || jsonb_build_object(
               'status_arkmeds_sincronizado_em', now(),
               'status_arkmeds_grupo', $10::text,
               'status_planilha_preservado', $11::text
             ),
           updated_at = now()
     where id = $1
  `, [
    row.orcamento_ipromed_id,
    row.status_ipromed_novo,
    arkmedsStatusLabel(row.status_arkmeds_atual),
    normalizeArkmedsStatusGroup(row.status_arkmeds_atual),
    statusImportPolicy(row.status_arkmeds_atual),
    row.data_faturamento,
    row.data_aprovacao,
    row.data_reprovacao,
    row.data_cancelamento,
    row.status_arkmeds_atual,
    row.status_planilha,
  ]);
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const snapshot = await loadSnapshot();
  const client = new Client({
    connectionString: databaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const storedById = await loadStored(client);
    const plan = buildPlan(snapshot, storedById);
    const stagingChanges = plan.filter((row) => row.atualizar_staging === "sim");
    const ipromedChanges = plan.filter((row) => row.atualizar_ipromed === "sim");

    if (REAL_APPLY) {
      await client.query("begin");
      for (const row of stagingChanges) await applyStaging(client, row);
      for (const row of ipromedChanges) await applyIpromed(client, row);
      await client.query("commit");
    }

    const columns = [
      "arkmeds_orcamento_id", "numero", "status_planilha", "status_staging_anterior",
      "status_arkmeds_atual", "status_ipromed_anterior", "status_ipromed_novo",
      "importado_ipromed", "atualizar_staging", "atualizar_ipromed",
    ];
    await writeCsv(path.join(REPORT_DIR, "plano_status.csv"), plan, columns);
    await writeCsv(path.join(REPORT_DIR, "alteracoes_ipromed.csv"), ipromedChanges, columns);

    const summary = {
      modo: REAL_APPLY ? "aplicacao" : "simulacao",
      aplicar_solicitado: APPLY,
      confirmacao_ambiente: CONFIRMED,
      snapshot_arkmeds: snapshot.length,
      staging_encontrado: storedById.size,
      alteracoes_staging: stagingChanges.length,
      importados_ipromed_analisados: plan.filter((row) => row.importado_ipromed === "sim").length,
      alteracoes_ipromed: ipromedChanges.length,
      arkmeds: "somente leitura; este script nao faz requisicoes ao ArkMeds",
      gerado_em: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(REPORT_DIR, "resumo.json"),
      JSON.stringify(summary, null, 2),
      "utf-8",
    );
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (REAL_APPLY) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

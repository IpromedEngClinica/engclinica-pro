import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { cleanText, normalizeComparableText, outputDir, writeCsv } from "./lib.mjs";

const { Client } = pg;

const REPORT_DIR = path.join(outputDir, "reconciliacao-pendentes");
const LIVE_SNAPSHOT = path.join(
  outputDir,
  "conferencia-status-atual",
  "snapshot_arkmeds_atual.json"
);
const LOT_PATH = path.join(outputDir, "lote_pendentes_reconciliados.csv");
const MANUAL_COMPANY_EXCEPTIONS = new Set([
  697, // Orcamento 37849, confirmado pelo usuario.
  4604, // Santa Casa de Estiva/Nossa Senhora de Fatima, confirmado anteriormente.
]);

function parseArgs(argv) {
  return { apply: argv.includes("--aplicar") };
}

function baseNumber(value) {
  return cleanText(value).match(/^\d+/)?.[0] || "";
}

function sameCompany(left, right) {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");

  const liveRows = JSON.parse(await fs.readFile(LIVE_SNAPSHOT, "utf8"));
  const livePendingIds = new Set(
    liveRows
      .filter((row) => row.status_grupo === "pendentes")
      .map((row) => Number(row.arkmeds_orcamento_id))
  );

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows: budgets } = await client.query(`
      select s.*
      from public.staging_arkmeds_orcamentos s
      where not exists (
        select 1
        from public.orcamentos o
        where o.origem_migracao = 'arkmeds'
          and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
      )
      order by s.arkmeds_orcamento_id
    `);

    const pendingBudgets = budgets.filter((row) =>
      livePendingIds.has(Number(row.arkmeds_orcamento_id))
    );
    const numbers = [...new Set(pendingBudgets
      .map((row) => baseNumber(
        row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero
      ))
      .filter(Boolean))];

    const { rows: orders } = await client.query(`
      select
        os.id,
        os.numero,
        os.empresa_id,
        empresa.nome as empresa,
        os.equipamento_id,
        tipo_equipamento.nome as tipo_equipamento,
        tipo_os.nome as tipo_servico
      from public.ordens_servico os
      left join public.empresas empresa on empresa.id = os.empresa_id
      left join public.equipamentos equipamento on equipamento.id = os.equipamento_id
      left join public.tipos_equipamento tipo_equipamento
        on tipo_equipamento.id = equipamento.tipo_equipamento_id
      left join public.tipos_os tipo_os on tipo_os.id = os.tipo_os_id
      where os.numero = any($1::text[])
    `, [numbers]);

    const ordersByNumber = new Map();
    for (const order of orders) {
      const key = cleanText(order.numero);
      if (!ordersByNumber.has(key)) ordersByNumber.set(key, []);
      ordersByNumber.get(key).push(order);
    }

    const report = [];
    const approved = [];

    for (const budget of pendingBudgets) {
      const number = baseNumber(
        budget.arkmeds_orcamento_numero_original || budget.arkmeds_orcamento_numero
      );
      const candidates = ordersByNumber.get(number) || [];
      const uniqueOrder = candidates.length === 1 ? candidates[0] : null;
      const manualException = MANUAL_COMPANY_EXCEPTIONS.has(
        Number(budget.arkmeds_orcamento_id)
      );
      const companyMatch = uniqueOrder
        ? sameCompany(budget.arkmeds_solicitante, uniqueOrder.empresa)
        : false;
      const approvedMatch = Boolean(uniqueOrder && (companyMatch || manualException));
      const reason = !uniqueOrder
        ? candidates.length > 1 ? "OS_NUMERO_AMBIGUO" : "OS_NUMERO_NAO_LOCALIZADA"
        : companyMatch ? "NUMERO_UNICO_E_CLIENTE_COMPATIVEL"
        : manualException ? "EXCECAO_37849_CONFIRMADA_PELO_USUARIO"
        : "CLIENTE_DIVERGENTE";

      const row = {
        arkmeds_orcamento_id: budget.arkmeds_orcamento_id,
        numero_orcamento: budget.arkmeds_orcamento_numero_original || budget.arkmeds_orcamento_numero,
        cliente_arkmeds: budget.arkmeds_solicitante,
        os_ipromed_id: uniqueOrder?.id || "",
        os_ipromed_numero: uniqueOrder?.numero || "",
        cliente_os: uniqueOrder?.empresa || "",
        equipamento_os: uniqueOrder?.tipo_equipamento || "",
        tipo_servico_os: uniqueOrder?.tipo_servico || "",
        quantidade_candidatas: candidates.length,
        resultado: approvedMatch ? "match_aprovado" : "pendente",
        motivo: reason,
        modo: apply ? "aplicacao" : "dry_run",
      };
      report.push(row);

      if (!approvedMatch) continue;
      approved.push({ budget, order: uniqueOrder, reason });
    }

    if (apply) {
      await client.query("begin");
      try {
        for (const { budget, order, reason } of approved) {
          await client.query(`
            update public.staging_arkmeds_orcamentos
            set
              arkmeds_ordem_servico_numero = $2,
              os_candidata_id = $3,
              os_candidata_numero = $2,
              cliente_os_candidato = $4,
              empresa_id_resolvida = $5,
              ordem_servico_id_resolvida = $3,
              equipamento_id_resolvido = $6,
              classificacao_vinculo_os = 'com_os_confirmada',
              score_os = 100,
              confianca_os = 'alta',
              motivos_associacao_os = $7::text[],
              motivos_bloqueantes = array_remove(
                array_remove(coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                'POSSIVEL_OS_POR_NUMERO'
              ),
              status_validacao = case
                when status_validacao = 'pendente_os'
                  and cardinality(array_remove(
                    array_remove(coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                    'POSSIVEL_OS_POR_NUMERO'
                  )) = 0
                then 'ok_para_importar_com_detalhes_parciais'
                else status_validacao
              end,
              atualizado_em = now()
            where arkmeds_orcamento_id = $1
          `, [
            budget.arkmeds_orcamento_id,
            order.numero,
            order.id,
            order.empresa,
            order.empresa_id,
            order.equipamento_id,
            [reason],
          ]);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const columns = [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "cliente_arkmeds",
      "os_ipromed_id",
      "os_ipromed_numero",
      "cliente_os",
      "equipamento_os",
      "tipo_servico_os",
      "quantidade_candidatas",
      "resultado",
      "motivo",
      "modo",
    ];
    await writeCsv(
      path.join(REPORT_DIR, apply ? "resultado_aplicacao.csv" : "resultado_dry_run.csv"),
      report,
      columns
    );
    await writeCsv(
      LOT_PATH,
      approved.map(({ budget }) => ({
        arkmeds_orcamento_id: budget.arkmeds_orcamento_id,
        numero_orcamento: budget.arkmeds_orcamento_numero_original || budget.arkmeds_orcamento_numero,
      })),
      ["arkmeds_orcamento_id", "numero_orcamento"]
    );

    console.log(JSON.stringify({
      modo: apply ? "aplicacao" : "dry_run",
      pendentes_arkmeds_analisados: pendingBudgets.length,
      matches_aprovados: approved.length,
      ainda_pendentes: report.length - approved.length,
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

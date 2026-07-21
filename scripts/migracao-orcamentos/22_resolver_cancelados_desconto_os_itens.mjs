import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  cleanText,
  normalizeComparableText,
  outputDir,
  writeCsv,
} from "./lib.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar") &&
  process.env.CONFIRMAR_IMPORTACAO_ORCAMENTOS === "true";
const REPORT_DIR = path.join(outputDir, "resolucao-cancelados-2026-07-21");
const LOT_PATH = path.join(outputDir, "lote_cancelados_resolvidos_2026_07_21.csv");
const IGNORE_MARKER = "IGNORAR_SEM_ITENS_PELO_USUARIO";

function baseNumber(value) {
  return cleanText(value).match(/^\d+/)?.[0] || "";
}

function appendToMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function sameCompany(budgetName, order) {
  const expected = normalizeComparableText(budgetName);
  return [order.empresa, order.nome_fantasia]
    .some((value) => normalizeComparableText(value) === expected);
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  client.on("error", () => {});
  await client.connect();

  try {
    const { rows: budgets } = await client.query(`
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
        and s.status_validacao in ('pendente_valor', 'pendente_os', 'pendente_itens')
        and not exists (
          select 1
          from public.orcamentos o
          where o.origem_migracao = 'arkmeds'
            and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
        )
      order by s.arkmeds_orcamento_id
    `);

    const pendingOs = budgets.filter((row) => row.status_validacao === "pendente_os");
    const orderNumbers = [...new Set(pendingOs
      .map((row) => baseNumber(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero))
      .filter(Boolean))];
    const { rows: orders } = await client.query(`
      select
        os.id,
        os.numero,
        os.empresa_id,
        os.equipamento_id,
        os.arkmeds_os_id,
        empresa.nome as empresa,
        empresa.nome_fantasia
      from public.ordens_servico os
      join public.empresas empresa on empresa.id = os.empresa_id
      where os.numero = any($1::text[])
    `, [orderNumbers]);

    const ordersByNumber = new Map();
    for (const order of orders) appendToMap(ordersByNumber, cleanText(order.numero), order);

    const discounts = budgets
      .filter((row) => row.status_validacao === "pendente_valor")
      .filter((row) => Number(row.quantidade_itens) > 0 && Number(row.diferenca_valor) < -0.01)
      .map((row) => ({
        row,
        discount: Number(Math.abs(Number(row.diferenca_valor)).toFixed(2)),
      }));

    const linked = [];
    const unresolvedOs = [];
    for (const row of pendingOs) {
      const number = baseNumber(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
      const companyMatches = (ordersByNumber.get(number) || [])
        .filter((order) => sameCompany(row.arkmeds_solicitante, order));
      const arkmedsMatches = companyMatches.filter((order) => order.arkmeds_os_id != null);
      const selected = arkmedsMatches.length === 1
        ? arkmedsMatches[0]
        : companyMatches.length === 1 ? companyMatches[0] : null;

      if (selected) linked.push({ row, order: selected });
      else unresolvedOs.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        cliente: row.arkmeds_solicitante,
        candidatas_mesmo_numero: (ordersByNumber.get(number) || []).length,
        candidatas_mesmo_cliente: companyMatches.length,
      });
    }

    const ignored = budgets
      .filter((row) => row.status_validacao === "pendente_itens")
      .filter((row) => Number(row.quantidade_itens) === 0);
    const pendingItemsWithContent = budgets
      .filter((row) => row.status_validacao === "pendente_itens")
      .filter((row) => Number(row.quantidade_itens) > 0);

    if (APPLY) {
      await client.query("begin");
      try {
        for (const { row, discount } of discounts) {
          await client.query(`
            update public.staging_arkmeds_orcamentos
            set
              arkmeds_desconto = $2,
              arkmeds_desconto_tipo = 'valor',
              motivos_bloqueantes = array_remove(
                coalesce(motivos_bloqueantes, '{}'::text[]),
                'DIVERGENCIA_VALOR'
              ),
              status_validacao = 'historico_consulta',
              atualizado_em = now()
            where arkmeds_orcamento_id = $1
          `, [row.arkmeds_orcamento_id, discount]);
        }

        for (const { row, order } of linked) {
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
              motivos_associacao_os = array['NUMERO_OS_ORCAMENTO_E_CLIENTE_COINCIDENTES']::text[],
              motivos_bloqueantes = array_remove(
                array_remove(coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                'POSSIVEL_OS_POR_NUMERO'
              ),
              status_validacao = 'historico_consulta',
              atualizado_em = now()
            where arkmeds_orcamento_id = $1
          `, [
            row.arkmeds_orcamento_id,
            order.numero,
            order.id,
            order.empresa,
            order.empresa_id,
            order.equipamento_id,
          ]);
        }

        for (const row of ignored) {
          await client.query(`
            update public.staging_arkmeds_orcamentos
            set
              motivos_associacao_os = array_append(
                array_remove(coalesce(motivos_associacao_os, '{}'::text[]), $2),
                $2
              ),
              atualizado_em = now()
            where arkmeds_orcamento_id = $1
          `, [row.arkmeds_orcamento_id, IGNORE_MARKER]);
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const lot = [
      ...discounts.map(({ row }) => ({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        resolucao: "desconto_valor",
      })),
      ...linked.map(({ row }) => ({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        resolucao: "os_cliente_numero_exatos",
      })),
    ];
    await writeCsv(LOT_PATH, lot, [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "resolucao",
    ]);
    await writeCsv(path.join(REPORT_DIR, APPLY ? "aplicacao.csv" : "dry_run.csv"), [
      ...lot.map((row) => ({ ...row, resultado: "pronto_para_importar" })),
      ...ignored.map((row) => ({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        resolucao: "ignorar_sem_itens",
        resultado: "excluido_do_saldo",
      })),
      ...pendingItemsWithContent.map((row) => ({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        resolucao: "pendente_itens_com_conteudo",
        resultado: "mantido_para_revisao",
      })),
    ], ["arkmeds_orcamento_id", "numero_orcamento", "resolucao", "resultado"]);
    await writeCsv(path.join(REPORT_DIR, "os_nao_resolvidas.csv"), unresolvedOs, [
      "arkmeds_orcamento_id",
      "numero_orcamento",
      "cliente",
      "candidatas_mesmo_numero",
      "candidatas_mesmo_cliente",
    ]);

    console.log(JSON.stringify({
      modo: APPLY ? "aplicacao" : "dry_run",
      descontos: discounts.length,
      valor_total_descontos: discounts.reduce((sum, item) => sum + item.discount, 0),
      vinculos_exatos: linked.length,
      os_nao_resolvidas: unresolvedOs.length,
      ignorados_sem_itens: ignored.length,
      pendentes_itens_com_conteudo: pendingItemsWithContent.length,
      lote_importacao: LOT_PATH,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

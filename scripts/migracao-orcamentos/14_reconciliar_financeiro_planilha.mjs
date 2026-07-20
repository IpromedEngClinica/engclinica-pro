import path from "node:path";
import fs from "node:fs/promises";
import pg from "pg";
import { outputDir, writeCsv } from "./lib.mjs";
import {
  buildAdditionalCostDefinitions,
  normalizeMoney,
  spreadsheetData,
} from "./planilha_orcamentos.mjs";

const { Client } = pg;
const CONFIRM_FLAG = "--confirmar-atualizacao";
const isConfirmed = process.argv.includes(CONFIRM_FLAG) &&
  process.env.CONFIRMAR_RECONCILIACAO_ORCAMENTOS === "true";
const mode = isConfirmed ? "atualizacao" : "dry_run";
const tolerance = 0.05;
const reportDir = path.join(outputDir, "reconciliacao-financeira-planilha");

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

function withoutValueDivergence(values) {
  return (values || []).filter((value) => value !== "DIVERGENCIA_VALOR");
}

function nextValidationStatus(current, remainingBlockers) {
  if (!remainingBlockers.length) return "ok_para_importar_com_detalhes_parciais";
  if (remainingBlockers.every((reason) => ["OS_AMBIGUA", "POSSIVEL_OS_POR_NUMERO"].includes(reason))) {
    return "pendente_os";
  }
  return current;
}

function spreadsheetFinancials(row) {
  const sheet = spreadsheetData(row);
  return {
    desconto: normalizeMoney(sheet.desconto ?? row.arkmeds_desconto),
    deslocamento: normalizeMoney(sheet.valor_deslocamento ?? row.arkmeds_valor_deslocamento),
    viagem: normalizeMoney(sheet.valor_viagem ?? row.arkmeds_valor_viagem),
    frete: normalizeMoney(sheet.valor_frete ?? row.arkmeds_valor_frete),
  };
}

async function main() {
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await fs.mkdir(reportDir, { recursive: true });
    const { rows } = await client.query(`
      select s.*
      from public.staging_arkmeds_orcamentos s
      where 'DIVERGENCIA_VALOR' = any(coalesce(s.motivos_bloqueantes, '{}'::text[]))
        and s.status_normalizado_importacao in ('pendente', 'aprovado_em_curso', 'faturado', 'reprovado_em_curso')
        and not exists (
          select 1
          from public.orcamentos o
          where o.origem_migracao = 'arkmeds'
            and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
        )
      order by s.arkmeds_orcamento_id
    `);

    const ids = rows.map((row) => row.arkmeds_orcamento_id);
    const { rows: items } = ids.length
      ? await client.query(`
          select *
          from public.staging_arkmeds_orcamento_itens
          where arkmeds_orcamento_id = any($1::int[])
          order by arkmeds_orcamento_id, criado_em, id
        `, [ids])
      : { rows: [] };
    const itemsByBudget = new Map();
    for (const item of items) {
      if (!itemsByBudget.has(item.arkmeds_orcamento_id)) itemsByBudget.set(item.arkmeds_orcamento_id, []);
      itemsByBudget.get(item.arkmeds_orcamento_id).push(item);
    }

    const results = [];
    for (const row of rows) {
      row.__items = itemsByBudget.get(row.arkmeds_orcamento_id) || [];
      const financials = spreadsheetFinancials(row);
      const rawItems = row.__items.reduce(
        (sum, item) => sum + normalizeMoney(item.valor_total_calculado ?? item.valor_total),
        0
      );
      const missingCosts = buildAdditionalCostDefinitions(row, row.__items);
      const missingCostsValue = missingCosts.reduce((sum, definition) => sum + definition.value, 0);
      const expectedTotal = Number((rawItems + missingCostsValue - financials.desconto).toFixed(2));
      const sourceTotal = normalizeMoney(row.arkmeds_valor_total);
      const residual = Number((sourceTotal - expectedTotal).toFixed(2));
      const reconciled = Math.abs(residual) <= tolerance;
      const remainingBlockers = reconciled
        ? withoutValueDivergence(row.motivos_bloqueantes)
        : row.motivos_bloqueantes || [];
      const nextStatus = reconciled
        ? nextValidationStatus(row.status_validacao, remainingBlockers)
        : row.status_validacao;

      results.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
        cliente: row.arkmeds_solicitante,
        status: row.status_normalizado_importacao,
        total_planilha: sourceTotal,
        soma_itens: Number(rawItems.toFixed(2)),
        desconto: financials.desconto,
        deslocamento: financials.deslocamento,
        viagem: financials.viagem,
        frete: financials.frete,
        custos_a_criar: missingCosts.map((definition) => `${definition.kind}:${definition.value.toFixed(2)}`).join(" | "),
        total_recalculado: expectedTotal,
        diferenca_residual: residual,
        resultado: reconciled ? "conciliado" : "pendente",
        bloqueios_restantes: remainingBlockers.join(" | "),
        status_validacao_novo: nextStatus,
      });

      if (!reconciled || !isConfirmed) continue;

      await client.query(`
        update public.staging_arkmeds_orcamentos
        set arkmeds_desconto = $2,
            arkmeds_valor_deslocamento = $3,
            arkmeds_valor_viagem = $4,
            arkmeds_valor_frete = $5,
            motivos_bloqueantes = $6::text[],
            motivos_validacao = array_remove(coalesce(motivos_validacao, '{}'::text[]), 'DIVERGENCIA_VALOR'),
            avisos_validacao = array_append(
              array_remove(coalesce(avisos_validacao, '{}'::text[]), 'FINANCEIRO_CONCILIADO_PLANILHA'),
              'FINANCEIRO_CONCILIADO_PLANILHA'
            ),
            status_validacao = $7,
            fonte_planilha_atualizada_em = now()
        where arkmeds_orcamento_id = $1
      `, [
        row.arkmeds_orcamento_id,
        financials.desconto,
        financials.deslocamento,
        financials.viagem,
        financials.frete,
        remainingBlockers,
        nextStatus,
      ]);
    }

    await writeCsv(path.join(reportDir, `reconciliacao_${mode}.csv`), results, [
      "arkmeds_orcamento_id",
      "numero",
      "cliente",
      "status",
      "total_planilha",
      "soma_itens",
      "desconto",
      "deslocamento",
      "viagem",
      "frete",
      "custos_a_criar",
      "total_recalculado",
      "diferenca_residual",
      "resultado",
      "bloqueios_restantes",
      "status_validacao_novo",
    ]);

    const summary = results.reduce((acc, result) => {
      acc.total += 1;
      acc[result.resultado] += 1;
      if (result.resultado === "conciliado" && !result.bloqueios_restantes) acc.liberados += 1;
      return acc;
    }, { total: 0, conciliado: 0, pendente: 0, liberados: 0 });
    console.log(JSON.stringify({ mode, ...summary, reportDir }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  asTextOrNull,
  expectedItemEndpoints,
  fetchArkmedsJson,
  outputDir,
  parseArkmedsInteger,
  parseArkmedsNumber,
} from "./lib.mjs";

const { Client } = pg;
const CONFIRM_FLAG = "--confirmar-atualizacao";
const isConfirmed = process.argv.includes(CONFIRM_FLAG) &&
  process.env.CONFIRMAR_AJUSTES_FINANCEIROS_ORCAMENTOS === "true";
const mode = isConfirmed ? "atualizacao" : "dry_run";
const reportDir = path.join(outputDir, "ajustes-financeiros-manuais");
const tolerance = 0.05;

const decisions = [
  { numero: "1393", frete: 80, desconto: 0, decisao: "Frete de R$ 80,00." },
  { numero: "1392", frete: 120, desconto: 0, decisao: "Frete de R$ 120,00." },
  { numero: "487233444445", frete: 0, desconto: 50, decisao: "Desconto de R$ 50,00." },
  { numero: "56155", frete: 0, desconto: 0, decisao: "Manter itens e valor atuais do ArkMeds." },
  { numero: "56189", frete: 0, desconto: 0, decisao: "Manter itens e valor atuais do ArkMeds." },
  { numero: "1314", frete: 0, desconto: 0, decisao: "Sincronizar os itens atuais e manter o total de R$ 864,00." },
  { numero: "55533", frete: 0, desconto: 0, decisao: "Sincronizar o item atual e manter o total de R$ 610,00." },
  { numero: "53442", frete: 0, desconto: 0, decisao: "Manter o valor atual do item no ArkMeds." },
  { numero: "53444", frete: 0, desconto: 0, decisao: "Manter o valor atual do item no ArkMeds." },
  { numero: "56320", frete: 0, desconto: 0, decisao: "Manter itens e valor atuais do ArkMeds." },
  { numero: "56132", frete: 0, desconto: 0, decisao: "Manter o valor atual de R$ 956,00." },
];

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function nextValidationStatus(current, blockers) {
  if (!blockers.length) return "ok_para_importar_com_detalhes_parciais";
  if (blockers.every((reason) => ["OS_AMBIGUA", "POSSIVEL_OS_POR_NUMERO"].includes(reason))) {
    return "pendente_os";
  }
  return current;
}

function normalizeItem(staging, endpoint, item) {
  const quantidade = parseArkmedsNumber(item.quantidade) ?? 0;
  const valorUnitario = parseArkmedsNumber(item.valor_unitario) ?? 0;
  const isService = endpoint === "servicos";

  return {
    staging_orcamento_id: staging.id,
    arkmeds_orcamento_id: staging.arkmeds_orcamento_id,
    arkmeds_item_id: parseArkmedsInteger(item.id),
    tipo_item: isService ? "servico" : "peca",
    descricao: asTextOrNull(isService ? item.servico_descricao : item.peca_descricao),
    quantidade,
    garantia: parseArkmedsInteger(item.garantia),
    valor_unitario: valorUnitario,
    valor_total_calculado: money(quantidade * valorUnitario),
    observacoes: asTextOrNull(item.observacoes),
    arkmeds_servico_id: isService ? parseArkmedsInteger(item.servico) : null,
    arkmeds_peca_id: isService ? null : parseArkmedsInteger(item.peca),
    peca_tipo_descricao: isService ? null : asTextOrNull(item.peca_tipo_descricao),
    unidade_medida: isService ? null : asTextOrNull(item.unidade_medida),
    modelo_fabricante: asTextOrNull(
      item.modelo_fabricante || item.modeloFabricante || item.peca_modelo_fabricante ||
      item.peca_modelo || item.modelo || item.fabricante
    ),
    dados_brutos_json: item,
  };
}

async function fetchCurrentItems(staging) {
  const items = [];
  for (const endpoint of expectedItemEndpoints(staging.arkmeds_tipo_texto)) {
    const pathname = endpoint === "servicos"
      ? `/orcamento/api/carregar_servicos_orcamento/?orcamento_id=${staging.arkmeds_orcamento_id}`
      : `/orcamento/api/carregar_pecas_orcamento/?orcamento_id=${staging.arkmeds_orcamento_id}`;
    const payload = await fetchArkmedsJson(pathname);
    for (const item of Array.isArray(payload.data) ? payload.data : []) {
      items.push(normalizeItem(staging, endpoint, item));
    }
  }
  return items;
}

async function insertItems(client, items) {
  for (const item of items) {
    await client.query(`
      insert into public.staging_arkmeds_orcamento_itens (
        staging_orcamento_id, arkmeds_orcamento_id, arkmeds_item_id, tipo_item,
        descricao, quantidade, garantia, valor_unitario, valor_total_calculado,
        observacoes, arkmeds_servico_id, arkmeds_peca_id, peca_tipo_descricao,
        unidade_medida, modelo_fabricante, dados_brutos_json
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb
      )
    `, [
      item.staging_orcamento_id,
      item.arkmeds_orcamento_id,
      item.arkmeds_item_id,
      item.tipo_item,
      item.descricao,
      item.quantidade,
      item.garantia,
      item.valor_unitario,
      item.valor_total_calculado,
      item.observacoes,
      item.arkmeds_servico_id,
      item.arkmeds_peca_id,
      item.peca_tipo_descricao,
      item.unidade_medida,
      item.modelo_fabricante,
      JSON.stringify(item.dados_brutos_json),
    ]);
  }
}

async function main() {
  await fs.mkdir(reportDir, { recursive: true });
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const numbers = decisions.map((decision) => decision.numero);
    const { rows: stagingRows } = await client.query(`
      select *
      from public.staging_arkmeds_orcamentos
      where arkmeds_orcamento_numero_original = any($1::text[])
      order by arkmeds_orcamento_id
    `, [numbers]);

    const byNumber = new Map(stagingRows.map((row) => [row.arkmeds_orcamento_numero_original, row]));
    const missing = numbers.filter((number) => !byNumber.has(number));
    if (missing.length) throw new Error(`Orcamentos nao encontrados no staging: ${missing.join(", ")}`);

    const { rows: previousItems } = await client.query(`
      select *
      from public.staging_arkmeds_orcamento_itens
      where arkmeds_orcamento_id = any($1::int[])
      order by arkmeds_orcamento_id, criado_em, id
    `, [stagingRows.map((row) => row.arkmeds_orcamento_id)]);

    const backup = {
      criado_em: new Date().toISOString(),
      modo: mode,
      cabecalhos: stagingRows,
      itens: previousItems,
    };
    await fs.writeFile(
      path.join(reportDir, `backup_antes_${mode}.json`),
      `${JSON.stringify(backup, null, 2)}\n`,
      "utf8"
    );

    const prepared = [];
    for (const decision of decisions) {
      const staging = byNumber.get(decision.numero);
      const items = await fetchCurrentItems(staging);
      if (!items.length) throw new Error(`ArkMeds nao retornou itens para o orcamento ${decision.numero}.`);

      const itemsTotal = money(items.reduce((sum, item) => sum + item.valor_total_calculado, 0));
      const recalculated = money(itemsTotal + decision.frete - decision.desconto);
      const sourceTotal = money(staging.arkmeds_valor_total);
      const difference = money(sourceTotal - recalculated);
      if (Math.abs(difference) > tolerance) {
        throw new Error(
          `Decisao do orcamento ${decision.numero} nao fecha: total ${sourceTotal}, ` +
          `itens ${itemsTotal}, frete ${decision.frete}, desconto ${decision.desconto}, diferenca ${difference}.`
        );
      }

      prepared.push({ decision, staging, items, itemsTotal, sourceTotal, recalculated, difference });
    }

    const report = prepared.map(({ decision, staging, items, itemsTotal, sourceTotal, difference }) => ({
      numero: decision.numero,
      arkmeds_orcamento_id: staging.arkmeds_orcamento_id,
      decisao: decision.decisao,
      quantidade_itens_antes: previousItems.filter(
        (item) => item.arkmeds_orcamento_id === staging.arkmeds_orcamento_id
      ).length,
      quantidade_itens_atual: items.length,
      soma_itens_atual: itemsTotal,
      frete: decision.frete,
      desconto: decision.desconto,
      total_arkmeds: sourceTotal,
      diferenca: difference,
      resultado: "conciliado",
    }));

    if (isConfirmed) {
      for (const entry of prepared) {
        const { decision, staging, items, itemsTotal } = entry;
        await client.query("begin");
        try {
          const { rows: lockedRows } = await client.query(`
            select * from public.staging_arkmeds_orcamentos
            where id = $1
            for update
          `, [staging.id]);
          const locked = lockedRows[0];
          if (!locked) throw new Error(`Staging ${staging.id} nao encontrado durante o ajuste.`);

          await client.query(`
            delete from public.staging_arkmeds_orcamento_itens
            where arkmeds_orcamento_id = $1
          `, [staging.arkmeds_orcamento_id]);
          await insertItems(client, items);

          const blockers = (locked.motivos_bloqueantes || []).filter(
            (reason) => reason !== "DIVERGENCIA_VALOR"
          );
          const validations = (locked.motivos_validacao || []).filter(
            (reason) => reason !== "DIVERGENCIA_VALOR"
          );
          const warnings = [
            ...(locked.avisos_validacao || []).filter(
              (warning) => warning !== "FINANCEIRO_CONCILIADO_DECISAO_USUARIO"
            ),
            "FINANCEIRO_CONCILIADO_DECISAO_USUARIO",
          ];
          const nextStatus = nextValidationStatus(locked.status_validacao, blockers);
          const servicesCount = items.filter((item) => item.tipo_item === "servico").length;
          const partsCount = items.filter((item) => item.tipo_item === "peca").length;

          await client.query(`
            update public.staging_arkmeds_orcamentos
            set arkmeds_desconto = $2,
                arkmeds_valor_frete = $3,
                soma_itens = $4,
                diferenca_valor = 0,
                motivos_bloqueantes = $5::text[],
                motivos_validacao = $6::text[],
                avisos_validacao = $7::text[],
                status_validacao = $8,
                itens_servicos_status = case when $9 > 0 then 'ok' else 'nao_aplicavel' end,
                itens_pecas_status = case when $10 > 0 then 'ok' else 'nao_aplicavel' end,
                itens_servicos_quantidade = $9,
                itens_pecas_quantidade = $10,
                qtd_servicos_endpoint = $9,
                qtd_pecas_endpoint = $10,
                tem_itens_preservados = true,
                status_preservacao_itens = 'itens_preservados',
                erro_itens_endpoint = null,
                itens_ultima_coleta_quantidade = $9 + $10,
                itens_ultima_coleta_status = 'itens_preservados',
                itens_ultima_coleta_em = now(),
                fonte_planilha_atualizada_em = now()
            where id = $1
          `, [
            staging.id,
            decision.desconto,
            decision.frete,
            itemsTotal,
            blockers,
            validations,
            warnings,
            nextStatus,
            servicesCount,
            partsCount,
          ]);

          await client.query(`
            insert into public.migracao_arkmeds_logs
              (tipo_execucao, entidade, arkmeds_id, identificador_migracao, status, mensagem, payload_json)
            values
              ('ajuste_financeiro_manual', 'orcamentos_staging', $1, $2, 'conciliado', $3, $4::jsonb)
          `, [
            String(staging.arkmeds_orcamento_id),
            staging.identificador_migracao,
            decision.decisao,
            JSON.stringify(report.find((item) => item.numero === decision.numero)),
          ]);

          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }

    const csvHeader = Object.keys(report[0]);
    const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      csvHeader.map(csvValue).join(","),
      ...report.map((row) => csvHeader.map((key) => csvValue(row[key])).join(",")),
    ].join("\r\n");
    await fs.writeFile(path.join(reportDir, `resultado_${mode}.csv`), `${csv}\r\n`, "utf8");
    await fs.writeFile(
      path.join(reportDir, `resumo_${mode}.md`),
      [
        "# Ajustes financeiros manuais",
        "",
        `- Modo: ${mode}`,
        `- Orcamentos avaliados: ${report.length}`,
        `- Orcamentos conciliados: ${report.filter((item) => item.resultado === "conciliado").length}`,
        `- Atualizacoes gravadas: ${isConfirmed ? report.length : 0}`,
        "- Fonte dos itens: endpoints de consulta do ArkMeds.",
        "- ArkMeds alterado: nao.",
        "",
      ].join("\n"),
      "utf8"
    );

    console.log(JSON.stringify({ mode, total: report.length, conciliados: report.length, reportDir }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

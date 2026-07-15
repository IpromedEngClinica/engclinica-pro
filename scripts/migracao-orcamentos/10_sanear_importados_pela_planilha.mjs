import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { cleanText, outputDir, writeCsv } from "./lib.mjs";
import {
  buildAdditionalCostDefinitions,
  buildCatalogIndex,
  cleanSpreadsheetObservations,
  destinationStatus,
  effectiveNormalizedStatus,
  effectiveStatusPolicy,
  formatDeliveryDeadline,
  mapSpreadsheetFreight,
  matchSpreadsheetServices,
  normalizeMoney,
  parseSpreadsheetPayment,
  preservePendingNotes,
  resolveCatalogItem,
  spreadsheetData,
} from "./planilha_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const OUTPUT_DIR = path.join(outputDir, "revisao_100");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "saneamento_planilha_resultado.csv");

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

async function loadData(client) {
  const { rows: budgets } = await client.query(`
    select
      o.id as orcamento_id, o.numero, o.valor_total, o.observacoes, o.detalhes_orcamento,
      o.prazo_entrega, o.forma_pagamento, o.modo_pagamento,
      o.numero_parcelas, o.dias_entre_parcelas, o.valor_entrada,
      o.arkmeds_orcamento_id, o.dados_migracao_json,
      e.nome as cliente,
      s.*
    from public.orcamentos o
    join public.empresas e on e.id = o.empresa_id
    join public.staging_arkmeds_orcamentos s
      on s.arkmeds_orcamento_id = o.arkmeds_orcamento_id
    where o.origem_migracao = 'arkmeds'
    order by o.arkmeds_orcamento_id
  `);
  const budgetIds = budgets.map((row) => row.orcamento_id);
  const { rows: items } = await client.query(`
    select *
    from public.orcamento_itens
    where orcamento_id = any($1::uuid[])
    order by orcamento_id, ordem, id
  `, [budgetIds]);
  const [{ rows: serviceTypes }, { rows: equipmentTypes }] = await Promise.all([
    client.query("select id, nome from public.tipos_os where ativo = true"),
    client.query("select id, nome from public.tipos_equipamento where ativo = true"),
  ]);

  const itemsByBudget = new Map();
  for (const item of items) {
    if (!itemsByBudget.has(item.orcamento_id)) itemsByBudget.set(item.orcamento_id, []);
    itemsByBudget.get(item.orcamento_id).push(item);
  }

  return {
    budgets: budgets.map((row) => ({
      ...row,
      id: row.orcamento_id,
      __items: itemsByBudget.get(row.orcamento_id) || [],
    })),
    serviceTypeIndex: buildCatalogIndex(serviceTypes),
    equipmentTypeIndex: buildCatalogIndex(equipmentTypes),
  };
}

function buildHeaderCorrection(row) {
  const sheet = spreadsheetData(row);
  const observations = cleanSpreadsheetObservations(row);
  const payment = parseSpreadsheetPayment(row);
  const deliveryDeadline = formatDeliveryDeadline(sheet.prazo_de_entrega ?? row.prazo_entrega);

  return {
    status: destinationStatus(row) || row.status,
    status_normalizado_importacao: effectiveNormalizedStatus(row),
    politica_importacao_status: effectiveStatusPolicy(row),
    data_aprovacao: row.arkmeds_data_aprovacao || null,
    data_reprovacao: row.arkmeds_data_reprovacao || null,
    data_faturamento: row.arkmeds_data_faturamento || null,
    data_cancelamento: row.arkmeds_data_cancelamento || null,
    observacoes: preservePendingNotes(row.observacoes, observations),
    detalhes_orcamento: observations,
    prazo_entrega: deliveryDeadline,
    prazo_execucao: deliveryDeadline,
    frete: mapSpreadsheetFreight(sheet.frete),
    condicoes_pagamento: payment.sourceText,
    forma_pagamento: payment.paymentForm,
    modo_pagamento: payment.paymentMode,
    numero_parcelas: payment.installments,
    dias_entre_parcelas: payment.installmentIntervalDays,
    valor_entrada: payment.entryValue,
    valor_parcela: null,
    responsavel_orcamentista: cleanText(sheet.responsavel_pelo_orcamento) || row.responsavel_orcamentista,
  };
}

async function updateHeader(client, row, correction) {
  await client.query(`
    update public.orcamentos
    set status = $2,
        status_normalizado_importacao = $3,
        politica_importacao_status = $4,
        data_aprovacao = $5,
        data_reprovacao = $6,
        data_faturamento = $7,
        data_cancelamento = $8,
        observacoes = $9,
        detalhes_orcamento = $10,
        prazo_entrega = $11,
        prazo_execucao = $12,
        frete = $13,
        condicoes_pagamento = $14,
        forma_pagamento = $15,
        modo_pagamento = $16,
        numero_parcelas = $17,
        dias_entre_parcelas = $18,
        valor_entrada = $19,
        valor_parcela = $20,
        responsavel_orcamentista = $21,
        dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
          || jsonb_build_object('dados_planilha_json', $22::jsonb, 'saneado_pela_planilha_em', now()),
        updated_at = now()
    where id = $1
  `, [
    row.id,
    correction.status,
    correction.status_normalizado_importacao,
    correction.politica_importacao_status,
    correction.data_aprovacao,
    correction.data_reprovacao,
    correction.data_faturamento,
    correction.data_cancelamento,
    correction.observacoes,
    correction.detalhes_orcamento,
    correction.prazo_entrega,
    correction.prazo_execucao,
    correction.frete,
    correction.condicoes_pagamento,
    correction.forma_pagamento,
    correction.modo_pagamento,
    correction.numero_parcelas,
    correction.dias_entre_parcelas,
    correction.valor_entrada,
    correction.valor_parcela,
    correction.responsavel_orcamentista,
    JSON.stringify(spreadsheetData(row)),
  ]);
}

async function ensureAdditionalCosts(client, row) {
  const definitions = buildAdditionalCostDefinitions(row);
  const currentItems = row.__items;
  let nextOrder = currentItems.reduce((max, item) => Math.max(max, Number(item.ordem || 0)), 0) + 1;

  for (const definition of definitions) {
    const existing = currentItems.find((item) => {
      if (definition.tipo === "deslocamento") return item.tipo === "deslocamento";
      if (definition.tipo === "outro") return item.tipo === "outro" && /viagem/i.test(item.descricao || "");
      return item.tipo === "peca" && /frete/i.test(item.peca_nome || item.descricao || "");
    });

    if (existing) {
      if (APPLY) {
        await client.query(`
          update public.orcamento_itens
          set valor_unitario = $2, valor_total = $2, quantidade = 1
          where id = $1
        `, [existing.id, definition.value]);
      }
      continue;
    }

    if (APPLY) {
      await client.query(`
        insert into public.orcamento_itens (
          orcamento_id, tipo, descricao, quantidade, valor_unitario, valor_total,
          ordem, peca_nome, origem_migracao, dados_migracao_json
        ) values ($1, $2, $3, 1, $4, $4, $5, $6, 'arkmeds', $7::jsonb)
      `, [
        row.id,
        definition.tipo,
        definition.descricao,
        definition.value,
        nextOrder,
        definition.pecaNome || null,
        JSON.stringify({ origem: "planilha", tipo_custo: definition.tipo }),
      ]);
    }
    nextOrder += 1;
  }

  return definitions;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const client = new Client({ connectionString: requireDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const { budgets, serviceTypeIndex, equipmentTypeIndex } = await loadData(client);
    const report = [];
    const errors = [];

    if (APPLY) await client.query("begin");

    for (const row of budgets) {
      const serviceItems = row.__items.filter((item) => item.tipo === "servico");
      const serviceMatches = matchSpreadsheetServices(serviceItems, row);
      if (serviceItems.length !== serviceMatches.filter(Boolean).length) {
        errors.push(`Orçamento ${row.numero}: quantidade de serviços da planilha não corresponde aos itens.`);
        continue;
      }

      const mapped = serviceItems.map((item, index) => {
        const match = serviceMatches[index];
        const serviceType = resolveCatalogItem(serviceTypeIndex, match.service);
        const equipmentType = resolveCatalogItem(equipmentTypeIndex, match.equipment);
        if (!serviceType || !equipmentType) {
          errors.push(
            `Orçamento ${row.numero}: catálogo não resolvido para ${match.service} / ${match.equipment}.`
          );
        }
        return { item, match, serviceType, equipmentType };
      });
      if (mapped.some((entry) => !entry.serviceType || !entry.equipmentType)) continue;

      const header = buildHeaderCorrection(row);
      if (APPLY) {
        await updateHeader(client, row, header);
        for (const entry of mapped) {
          await client.query(`
            update public.orcamento_itens
            set tipo_servico_id = $2,
                tipo_equipamento_id = $3,
                dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
                  || jsonb_build_object(
                    'servico_planilha', $4::text,
                    'equipamento_planilha', $5::text
                  )
            where id = $1
          `, [entry.item.id, entry.serviceType.id, entry.equipmentType.id, entry.match.service, entry.match.equipment]);
        }
      }

      const additionalCosts = await ensureAdditionalCosts(client, row);
      if (APPLY) await client.query("select public.recalcular_total_orcamento($1::uuid)", [row.id]);

      report.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.numero,
        cliente: row.cliente,
        status: header.status,
        status_normalizado_importacao: header.status_normalizado_importacao,
        servicos_mapeados: mapped.length,
        prazo_entrega: header.prazo_entrega,
        forma_pagamento: header.forma_pagamento,
        modo_pagamento: header.modo_pagamento,
        numero_parcelas: header.numero_parcelas,
        dias_entre_parcelas: header.dias_entre_parcelas,
        valor_entrada: header.valor_entrada,
        custos_adicionais: additionalCosts.map((item) => `${item.descricao}: ${item.value}`).join(" | "),
        detalhes_origem: header.detalhes_orcamento ? "observacoes_planilha" : "vazio",
        resultado: APPLY ? "corrigido" : "simulado",
      });
    }

    if (errors.length) {
      if (APPLY) await client.query("rollback");
      throw new Error(`Saneamento cancelado. ${errors.length} erro(s):\n${errors.join("\n")}`);
    }

    if (APPLY) await client.query("commit");

    await writeCsv(OUTPUT_FILE, report, [
      "arkmeds_orcamento_id", "numero_orcamento", "cliente", "servicos_mapeados",
      "status", "status_normalizado_importacao",
      "prazo_entrega", "forma_pagamento", "modo_pagamento", "numero_parcelas",
      "dias_entre_parcelas", "valor_entrada", "custos_adicionais", "detalhes_origem", "resultado",
    ]);

    console.log(JSON.stringify({
      modo: APPLY ? "aplicado" : "simulacao",
      total: report.length,
      servicos_mapeados: report.reduce((sum, item) => sum + item.servicos_mapeados, 0),
      relatorio: OUTPUT_FILE,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();

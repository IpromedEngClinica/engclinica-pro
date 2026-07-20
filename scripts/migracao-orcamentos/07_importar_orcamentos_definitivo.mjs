import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  cleanText,
  normalizeComparableText,
  normalizeExactCompanyName,
  outputDir,
  parseArkmedsNumber,
  writeCsv,
} from "./lib.mjs";
import {
  buildMigrationIdentifier,
  getSpreadsheetOsNumber,
  identifierNeedsReview,
  isSpreadsheetAvulso,
} from "./regras_orcamentos.mjs";
import {
  buildAdditionalCostDefinitions,
  classifyAdditionalCostItem,
  buildCatalogIndex,
  cleanSpreadsheetObservations,
  destinationStatus,
  effectiveNormalizedStatus,
  effectiveStatusPolicy,
  formatDeliveryDeadline,
  mapSpreadsheetFreight,
  matchSpreadsheetServices,
  parseSpreadsheetPayment,
  preservePendingNotes,
  resolveCatalogItem,
  spreadsheetData,
} from "./planilha_orcamentos.mjs";

const { Client } = pg;

const IMPORT_OUTPUT_DIR = path.join(outputDir, "importacao");
const LOTE_PATHS = new Map([
  ["lote_1", path.join(outputDir, "lote_1_importacao_segura.csv")],
  ["lote_2", path.join(outputDir, "lote_2_importacao_segura.csv")],
  ["lote_3", path.join(outputDir, "lote_3_importacao_segura.csv")],
]);

const resultColumns = [
  "arkmeds_orcamento_id",
  "orcamento_id_novo",
  "numero_orcamento",
  "cliente",
  "valor_total",
  "quantidade_itens",
  "status_orcamento",
  "vinculo",
  "os_vinculada",
  "pdf_original_url",
  "resultado",
  "mensagem",
];

const errorColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "erro",
  "fase",
  "dados",
];

function parseArgs(argv) {
  const args = {
    lote: null,
    limit: null,
    confirmarImportacao: false,
    statusPlanilha: [],
    statusArkmeds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--confirmar-importacao") {
      args.confirmarImportacao = true;
      continue;
    }
    if (arg === "--lote") {
      args.lote = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--lote=")) {
      args.lote = arg.slice("--lote=".length);
      continue;
    }
    if (arg === "--limit") {
      args.limit = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
      continue;
    }
    if (arg === "--status-planilha") {
      args.statusPlanilha = String(argv[index + 1] || "")
        .split(",")
        .map((value) => normalizeComparableText(value))
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (arg.startsWith("--status-planilha=")) {
      args.statusPlanilha = arg
        .slice("--status-planilha=".length)
        .split(",")
        .map((value) => normalizeComparableText(value))
        .filter(Boolean);
      continue;
    }
    if (arg === "--status-arkmeds") {
      args.statusArkmeds = String(argv[index + 1] || "")
        .split(",")
        .map((value) => normalizeComparableText(value))
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (arg.startsWith("--status-arkmeds=")) {
      args.statusArkmeds = arg
        .slice("--status-arkmeds=".length)
        .split(",")
        .map((value) => normalizeComparableText(value))
        .filter(Boolean);
    }
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    args.limit = null;
  }

  return args;
}

function isRealImport(args) {
  return (
    args.confirmarImportacao === true &&
    process.env.CONFIRMAR_IMPORTACAO_ORCAMENTOS === "true" &&
    LOTE_PATHS.has(args.lote)
  );
}

function requireDatabaseUrl() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Configure SUPABASE_DB_URL para executar a importacao de orcamentos.");
  }
  return connectionString;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ";" && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

async function readCsv(filePath) {
  const text = await fs.readFile(filePath, "utf-8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizeMoney(value) {
  const parsed = parseArkmedsNumber(value);
  return parsed == null ? 0 : Number(parsed.toFixed(2));
}

function mapStatus(row) {
  const status = destinationStatus(row);
  if (status) return status;
  throw new Error(`Status normalizado nao permitido para Lote 1: ${effectiveNormalizedStatus(row) || "-"}`);
}

function mapBudgetType(row) {
  const text = cleanText(row.arkmeds_tipo_texto)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const hasParts = text.includes("peca");
  const hasServices = text.includes("servico");
  if (hasParts && hasServices) return "pecas_servicos";
  if (hasParts) return "pecas";
  return "servico";
}

function mapOrigin(row) {
  return getSpreadsheetOsNumber(row) ? "os" : "avulso";
}

function splitModelManufacturer(value) {
  const text = cleanText(value);
  if (!text) return { fabricante: null, modelo: null };

  const parts = text.split(/\s+\|\s+|\s+-\s+/).map(cleanText).filter(Boolean);
  if (parts.length >= 2) {
    return { fabricante: parts[0], modelo: parts.slice(1).join(" - ") };
  }

  return { fabricante: text, modelo: null };
}

function buildIdentifier(row) {
  return buildMigrationIdentifier(row);
}

function combineNotes(...values) {
  return values.map(cleanText).filter(Boolean).join("\n\n") || null;
}

function selectUniqueSourceOrder(candidates) {
  if (candidates.length === 1) return candidates[0];
  const arkmedsOrders = candidates.filter((order) => order.arkmeds_os_id != null);
  return arkmedsOrders.length === 1 ? arkmedsOrders[0] : null;
}

function buildBudgetPayload(row, organizacaoId) {
  const status = mapStatus(row);
  const normalizedStatus = effectiveNormalizedStatus(row);
  const importPolicy = effectiveStatusPolicy(row);
  const sheet = spreadsheetData(row);
  const payment = parseSpreadsheetPayment(row);
  const additionalCosts = buildAdditionalCostDefinitions(row, row.__items);
  const total = normalizeMoney(row.arkmeds_valor_total);
  const servicesValue = row.__items
    .filter((item) => item.tipo_item === "servico")
    .reduce((sum, item) => sum + normalizeMoney(item.valor_total_calculado), 0) +
    additionalCosts
      .filter((item) => item.tipo === "deslocamento" || item.tipo === "outro")
      .reduce((sum, item) => sum + item.value, 0);
  const partsValue = row.__items
    .filter((item) => item.tipo_item === "peca")
    .reduce((sum, item) => sum + normalizeMoney(item.valor_total_calculado), 0) +
    additionalCosts
      .filter((item) => item.tipo === "peca")
      .reduce((sum, item) => sum + item.value, 0);
  const descontoValor = normalizeMoney(row.arkmeds_desconto);
  const cleanObservations = cleanSpreadsheetObservations(row);
  const observationsWithPending = combineNotes(
    cleanObservations,
    getSpreadsheetOsNumber(row) && !row.ordem_servico_id_resolvida
      ? `Pendente de revisão da migração ArkMeds: OS ${getSpreadsheetOsNumber(row)} não foi localizada de forma única para o mesmo cliente; vínculo não aplicado.`
      : null
  );
  const observacoes = preservePendingNotes(row.observacoes_gerais, observationsWithPending);
  const deliveryDeadline = formatDeliveryDeadline(sheet.prazo_de_entrega ?? row.prazo_entrega);

  return {
    organizacao_id: organizacaoId,
    numero: cleanText(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero),
    empresa_id: row.empresa_id_resolvida,
    equipamento_id: row.equipamento_id_resolvido || null,
    ordem_servico_id: row.ordem_servico_id_resolvida || null,
    data_orcamento: row.arkmeds_data_criacao || new Date().toISOString(),
    data_validade: row.arkmeds_data_validade || null,
    status,
    observacoes,
    condicoes_pagamento: payment.sourceText,
    prazo_execucao: deliveryDeadline,
    garantia: null,
    valor_total: total,
    desconto_tipo: row.arkmeds_desconto_tipo === "percentual" ? "percentual" : "valor",
    desconto_valor: descontoValor,
    aprovado_por: null,
    data_aprovacao: row.arkmeds_data_aprovacao || null,
    data_reprovacao: row.arkmeds_data_reprovacao || null,
    data_faturamento: row.arkmeds_data_faturamento || null,
    data_cancelamento: row.arkmeds_data_cancelamento || null,
    motivo_reprovacao: null,
    ativo: true,
    created_at: row.arkmeds_data_criacao || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tipo_orcamento: mapBudgetType(row),
    origem: mapOrigin(row),
    forma_pagamento: payment.paymentForm,
    modo_pagamento: payment.paymentMode,
    numero_parcelas: payment.installments,
    valor_entrada: payment.entryValue,
    valor_parcela: null,
    valor_pecas: Number(partsValue.toFixed(2)),
    valor_servicos: Number(servicesValue.toFixed(2)),
    prazo_entrega: deliveryDeadline,
    frete: mapSpreadsheetFreight(sheet.frete ?? row.frete),
    detalhes_orcamento: cleanObservations,
    responsavel_orcamentista: sheet.responsavel_pelo_orcamento || row.responsavel_orcamentista || "Icaro Rezende",
    identificador: buildIdentifier(row),
    dias_entre_parcelas: payment.installmentIntervalDays,
    origem_migracao: "arkmeds",
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    arkmeds_status_original: row.arkmeds_status_original || row.arkmeds_status_label || row.arkmeds_status_grupo || null,
    status_normalizado_importacao: normalizedStatus,
    politica_importacao_status: importPolicy,
    arkmeds_tipo_texto: row.arkmeds_tipo_texto || null,
    arkmeds_ordem_servico_numero: getSpreadsheetOsNumber(row),
    pdf_original_url: row.pdf_original_url || null,
    soma_itens_migracao: normalizeMoney(row.soma_itens),
    classificacao_vinculo_os: row.classificacao_vinculo_os || null,
    dados_migracao_json: {
      staging_orcamento_id: row.id,
      arkmeds_orcamento_id: row.arkmeds_orcamento_id,
      arkmeds_orcamento_numero: row.arkmeds_orcamento_numero,
      arkmeds_orcamento_numero_original: row.arkmeds_orcamento_numero_original,
      arkmeds_tipo_codigo: row.arkmeds_tipo_codigo,
      arkmeds_tipo_texto: row.arkmeds_tipo_texto,
      arkmeds_status_grupo: row.arkmeds_status_grupo,
      arkmeds_status_label: row.arkmeds_status_label,
      arkmeds_status_original: row.arkmeds_status_original,
      status_normalizado_importacao: normalizedStatus,
      politica_importacao_status: importPolicy,
      arkmeds_status_planilha: row.arkmeds_status_planilha,
      classificacao_vinculo_os: row.classificacao_vinculo_os,
      classificacao_cliente: row.classificacao_cliente,
      score_cliente: row.score_cliente,
      score_os: row.score_os,
      confianca_os: row.confianca_os,
      status_validacao: row.status_validacao,
      motivos_bloqueantes: row.motivos_bloqueantes,
      avisos_validacao: row.avisos_validacao,
      arkmeds_data_aprovacao: row.arkmeds_data_aprovacao,
      arkmeds_data_reprovacao: row.arkmeds_data_reprovacao,
      arkmeds_data_faturamento: row.arkmeds_data_faturamento,
      arkmeds_data_cancelamento: row.arkmeds_data_cancelamento,
      arkmeds_desconto: descontoValor,
      arkmeds_desconto_tipo: row.arkmeds_desconto_tipo,
      arkmeds_valor_deslocamento: normalizeMoney(row.arkmeds_valor_deslocamento),
      arkmeds_valor_viagem: normalizeMoney(row.arkmeds_valor_viagem),
      arkmeds_valor_frete: normalizeMoney(row.arkmeds_valor_frete),
      dados_planilha_json: sheet,
      dados_brutos_json: row.dados_brutos_json,
      detalhes_extraidos_json: row.detalhes_extraidos_json,
    },
    migrado_em: new Date().toISOString(),
  };
}

function buildItemPayload(item, orcamentoId, order) {
  const additionalCost = classifyAdditionalCostItem(item);
  const tipo = additionalCost?.tipo || (
    item.tipo_item === "peca" ? "peca" : item.tipo_item === "servico" ? "servico" : "outro"
  );
  const { fabricante, modelo } = splitModelManufacturer(item.modelo_fabricante);
  const quantidade = normalizeMoney(item.quantidade || 1) || 1;
  const valorUnitario = normalizeMoney(item.valor_unitario);
  const valorTotal = normalizeMoney(item.valor_total_calculado || quantidade * valorUnitario);

  return {
    orcamento_id: orcamentoId,
    tipo,
    descricao: additionalCost?.descricao || cleanText(item.descricao) || `Item ArkMeds ${item.arkmeds_item_id || order}`,
    quantidade,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    observacoes: item.observacoes || null,
    ordem: order,
    garantia: item.garantia == null ? null : String(item.garantia),
    tipo_servico_id: item.__tipo_servico_id || null,
    tipo_equipamento_id: item.__tipo_equipamento_id || null,
    peca_id: null,
    peca_nome: tipo === "peca" ? additionalCost?.pecaNome || cleanText(item.descricao) || null : null,
    peca_fabricante_id: null,
    peca_modelo_id: null,
    fabricante_texto: fabricante,
    modelo_texto: modelo,
    mostrar_fabricante: Boolean(fabricante),
    mostrar_modelo: Boolean(modelo),
    peca_variacao_id: null,
    origem_migracao: "arkmeds",
    arkmeds_item_id: item.arkmeds_item_id,
    arkmeds_servico_id: item.arkmeds_servico_id,
    arkmeds_peca_id: item.arkmeds_peca_id,
    unidade_medida: item.unidade_medida || null,
    peca_tipo_descricao: item.peca_tipo_descricao || null,
    dados_migracao_json: {
      staging_item_id: item.id,
      arkmeds_orcamento_id: item.arkmeds_orcamento_id,
      arkmeds_item_id: item.arkmeds_item_id,
      tipo_item_original: item.tipo_item,
      unidade_medida: item.unidade_medida,
      peca_tipo_descricao: item.peca_tipo_descricao,
      modelo_fabricante: item.modelo_fabricante,
      dados_brutos_json: item.dados_brutos_json,
    },
  };
}

function buildAdditionalCostPayload(definition, orcamentoId, order) {
  return {
    orcamento_id: orcamentoId,
    tipo: definition.tipo,
    descricao: definition.descricao,
    quantidade: 1,
    valor_unitario: definition.value,
    valor_total: definition.value,
    observacoes: null,
    ordem: order,
    garantia: null,
    tipo_servico_id: null,
    tipo_equipamento_id: null,
    peca_id: null,
    peca_nome: definition.pecaNome || null,
    peca_fabricante_id: null,
    peca_modelo_id: null,
    fabricante_texto: null,
    modelo_texto: null,
    mostrar_fabricante: false,
    mostrar_modelo: false,
    peca_variacao_id: null,
    origem_migracao: "arkmeds",
    arkmeds_item_id: null,
    arkmeds_servico_id: null,
    arkmeds_peca_id: null,
    unidade_medida: null,
    peca_tipo_descricao: null,
    dados_migracao_json: { origem: "planilha", tipo_custo: definition.tipo },
  };
}

async function logMigration(client, payload) {
  try {
    await client.query(
      `insert into public.migracao_arkmeds_logs
        (tipo_execucao, entidade, arkmeds_id, identificador_migracao, status, mensagem, payload_json)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        payload.tipo_execucao,
        payload.entidade || "orcamentos_importacao",
        payload.arkmeds_id == null ? null : String(payload.arkmeds_id),
        payload.identificador_migracao || null,
        payload.status || "info",
        payload.mensagem || null,
        JSON.stringify(payload.payload_json || {}),
      ]
    );
  } catch (error) {
    console.warn(`Aviso: falha ao registrar log de migracao: ${error.message}`);
  }
}

async function getOrganizationId(client) {
  const { rows } = await client.query(
    "select id from public.organizacoes order by created_at nulls last, id limit 1"
  );
  if (!rows[0]?.id) throw new Error("Nenhuma organizacao encontrada para importacao.");
  return rows[0].id;
}

async function loadBatchRows(client, ids) {
  if (!ids.length) return [];

  const { rows } = await client.query(
    `select s.*
     from public.staging_arkmeds_orcamentos s
     where s.arkmeds_orcamento_id = any($1::int[])
     order by s.arkmeds_orcamento_id`,
    [ids]
  );

  const { rows: items } = await client.query(
    `select *
     from public.staging_arkmeds_orcamento_itens
     where arkmeds_orcamento_id = any($1::int[])
     order by arkmeds_orcamento_id, tipo_item, id`,
    [ids]
  );

  const itemsByBudget = new Map();
  for (const item of items) {
    if (!itemsByBudget.has(item.arkmeds_orcamento_id)) itemsByBudget.set(item.arkmeds_orcamento_id, []);
    itemsByBudget.get(item.arkmeds_orcamento_id).push(item);
  }

  for (const row of rows) {
    row.__items = itemsByBudget.get(row.arkmeds_orcamento_id) || [];
  }

  const [{ rows: serviceTypes }, { rows: equipmentTypes }] = await Promise.all([
    client.query("select id, nome from public.tipos_os where ativo = true"),
    client.query("select id, nome from public.tipos_equipamento where ativo = true"),
  ]);
  const serviceTypeIndex = buildCatalogIndex(serviceTypes);
  const equipmentTypeIndex = buildCatalogIndex(equipmentTypes);

  for (const row of rows) {
    const serviceItems = row.__items.filter((item) => item.tipo_item === "servico");
    const matches = matchSpreadsheetServices(serviceItems, row);
    serviceItems.forEach((item, index) => {
      const match = matches[index];
      item.__sheet_entry = match || null;
      item.__tipo_servico_id = resolveCatalogItem(serviceTypeIndex, match?.service)?.id || null;
      item.__tipo_equipamento_id = resolveCatalogItem(equipmentTypeIndex, match?.equipment)?.id || null;
    });
  }

  await resolveCompaniesByUniqueName(client, rows);

  const sourceNumbers = [...new Set(rows
    .map((row) => getSpreadsheetOsNumber(row) || cleanText(row.arkmeds_ordem_servico_numero))
    .filter(Boolean))];
  const sourceArkmedsIds = [...new Set(rows
    .map((row) => Number.parseInt(row.arkmeds_ordem_servico_id, 10))
    .filter(Number.isInteger))];
  const { rows: exactOrders } = sourceNumbers.length
    ? await client.query(
        `select os.id, os.numero, os.arkmeds_os_id, os.empresa_id, os.equipamento_id,
                coalesce(te.nome, e.tipo_texto) as os_tipo_equipamento
         from public.ordens_servico os
         left join public.equipamentos e on e.id = os.equipamento_id
         left join public.tipos_equipamento te on te.id = e.tipo_equipamento_id
         where os.numero = any($1::text[])
            or os.arkmeds_os_id = any($2::bigint[])`,
        [sourceNumbers, sourceArkmedsIds]
      )
    : sourceArkmedsIds.length
      ? await client.query(
          `select os.id, os.numero, os.arkmeds_os_id, os.empresa_id, os.equipamento_id,
                  coalesce(te.nome, e.tipo_texto) as os_tipo_equipamento
           from public.ordens_servico os
           left join public.equipamentos e on e.id = os.equipamento_id
           left join public.tipos_equipamento te on te.id = e.tipo_equipamento_id
           where os.arkmeds_os_id = any($1::bigint[])`,
          [sourceArkmedsIds]
        )
      : { rows: [] };
  const ordersByNumber = new Map();
  const ordersByArkmedsId = new Map();
  for (const order of exactOrders) {
    if (!ordersByNumber.has(order.numero)) ordersByNumber.set(order.numero, []);
    ordersByNumber.get(order.numero).push(order);
    if (order.arkmeds_os_id != null) {
      const key = String(order.arkmeds_os_id);
      if (!ordersByArkmedsId.has(key)) ordersByArkmedsId.set(key, []);
      ordersByArkmedsId.get(key).push(order);
    }
  }
  for (const row of rows) {
    const sourceOs = getSpreadsheetOsNumber(row) || cleanText(row.arkmeds_ordem_servico_numero);
    const sourceArkmedsId = cleanText(row.arkmeds_ordem_servico_id);
    const directCandidates = sourceArkmedsId ? ordersByArkmedsId.get(sourceArkmedsId) || [] : [];
    const globalNumberCandidates = ordersByNumber.get(sourceOs) || [];
    const numberCandidates = globalNumberCandidates.filter(
      (order) => order.empresa_id === row.empresa_id_resolvida
    );
    const exactOrder = directCandidates.length === 1
      ? directCandidates[0]
      : selectUniqueSourceOrder(numberCandidates) || selectUniqueSourceOrder(globalNumberCandidates);
    row.arkmeds_ordem_servico_numero = sourceOs;
    row.ordem_servico_id_resolvida = exactOrder?.id || null;
    row.equipamento_id_resolvido = exactOrder?.equipamento_id || null;
    row.os_tipo_equipamento = exactOrder?.os_tipo_equipamento || row.os_tipo_equipamento || null;
    if (exactOrder) {
      row.empresa_id_resolvida = exactOrder.empresa_id;
      row.classificacao_vinculo_os = "com_os_confirmada";
      row.motivos_bloqueantes = (row.motivos_bloqueantes || []).filter(
        (reason) => !["OS_AMBIGUA", "POSSIVEL_OS_POR_NUMERO"].includes(reason)
      );
      if (row.status_validacao === "pendente_os" && !row.motivos_bloqueantes.length) {
        row.status_validacao = "ok_para_importar_com_detalhes_parciais";
      }
    } else if (isSpreadsheetAvulso(row)) {
      row.ordem_servico_id_resolvida = null;
      row.equipamento_id_resolvido = null;
      row.classificacao_vinculo_os = "sem_os_avulso";
      row.motivos_bloqueantes = (row.motivos_bloqueantes || []).filter(
        (reason) => !["OS_AMBIGUA", "POSSIVEL_OS_POR_NUMERO"].includes(reason)
      );
      if (row.status_validacao === "pendente_os" && !row.motivos_bloqueantes.length) {
        row.status_validacao = "ok_para_importar_com_detalhes_parciais";
      }
    }
  }

  const byId = new Map(rows.map((row) => [row.arkmeds_orcamento_id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function selectBatchIds(client, loteIds, args) {
  if (args.statusArkmeds.length) {
    const { rows } = await client.query(
      `select s.arkmeds_orcamento_id
       from public.staging_arkmeds_orcamentos s
       where s.arkmeds_orcamento_id = any($1::int[])
         and lower(coalesce(s.arkmeds_status_grupo, '')) = any($2::text[])
         and not exists (
           select 1
           from public.orcamentos o
           where o.origem_migracao = 'arkmeds'
             and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
         )
       order by s.arkmeds_orcamento_id`,
      [loteIds, args.statusArkmeds]
    );

    const ids = rows.map((row) => Number(row.arkmeds_orcamento_id));
    return args.limit ? ids.slice(0, args.limit) : ids;
  }

  if (!args.statusPlanilha.length) {
    const { rows } = await client.query(
      `select s.arkmeds_orcamento_id
       from public.staging_arkmeds_orcamentos s
       where s.arkmeds_orcamento_id = any($1::int[])
         and not exists (
           select 1
           from public.orcamentos o
           where o.origem_migracao = 'arkmeds'
             and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
         )
       order by s.arkmeds_orcamento_id`,
      [loteIds],
    );
    const ids = rows.map((row) => Number(row.arkmeds_orcamento_id));
    return args.limit ? ids.slice(0, args.limit) : ids;
  }

  const { rows } = await client.query(
    `select s.arkmeds_orcamento_id,
            lower(coalesce(s.arkmeds_status_planilha, s.dados_planilha_json ->> 'etapa_atual', '')) as status_planilha,
            row_number() over (
              partition by lower(coalesce(s.arkmeds_status_planilha, s.dados_planilha_json ->> 'etapa_atual', ''))
              order by s.arkmeds_orcamento_id
            ) as ordem_status
     from public.staging_arkmeds_orcamentos s
     where s.arkmeds_orcamento_id = any($1::int[])
       and lower(coalesce(s.arkmeds_status_planilha, s.dados_planilha_json ->> 'etapa_atual', '')) = any($2::text[])
       and not exists (
         select 1
         from public.orcamentos o
         where o.origem_migracao = 'arkmeds'
           and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
       )
     order by ordem_status, status_planilha, s.arkmeds_orcamento_id`,
    [loteIds, args.statusPlanilha]
  );

  const ids = rows.map((row) => Number(row.arkmeds_orcamento_id));
  return args.limit ? ids.slice(0, args.limit) : ids;
}

async function resolveCompaniesByUniqueName(client, rows) {
  const unresolved = rows.filter((row) => !row.empresa_id_resolvida && cleanText(row.arkmeds_solicitante));
  if (!unresolved.length) return;

  const { rows: companies } = await client.query(
    `select id, nome, nome_fantasia
     from public.empresas
     where ativo = true`
  );

  const companiesByKey = new Map();
  const companiesByLegalName = new Map();
  for (const company of companies) {
    const legalKey = normalizeExactCompanyName(company.nome);
    if (legalKey) {
      if (!companiesByLegalName.has(legalKey)) companiesByLegalName.set(legalKey, []);
      companiesByLegalName.get(legalKey).push(company);
    }
    for (const name of [company.nome, company.nome_fantasia]) {
      const key = normalizeComparableText(name);
      if (!key) continue;
      if (!companiesByKey.has(key)) companiesByKey.set(key, []);
      companiesByKey.get(key).push(company);
    }
  }

  for (const row of unresolved) {
    const legalMatches = companiesByLegalName.get(
      normalizeExactCompanyName(row.arkmeds_solicitante)
    ) || [];
    const uniqueLegalIds = [...new Set(legalMatches.map((company) => company.id))];
    if (uniqueLegalIds.length === 1) {
      row.empresa_id_resolvida = uniqueLegalIds[0];
      row.__empresa_resolvida_por = "razao_social_exata";
      continue;
    }
    const key = normalizeComparableText(row.arkmeds_solicitante);
    const matches = companiesByKey.get(key) || [];
    const uniqueIds = [...new Set(matches.map((company) => company.id))];
    if (uniqueIds.length === 1) {
      row.empresa_id_resolvida = uniqueIds[0];
      row.__empresa_resolvida_por = "nome_exato_normalizado";
      continue;
    }

    const prefix = cleanText(row.arkmeds_solicitante).split(/\s+-\s+/)[0];
    const prefixKey = normalizeComparableText(prefix);
    const prefixMatches = prefixKey ? companiesByKey.get(prefixKey) || [] : [];
    const uniquePrefixIds = [...new Set(prefixMatches.map((company) => company.id))];
    if (uniquePrefixIds.length === 1) {
      row.empresa_id_resolvida = uniquePrefixIds[0];
      row.__empresa_resolvida_por = "prefixo_nome_setor";
    }
  }
}

function validateLote1Row(row) {
  const blockingReasons = row.motivos_bloqueantes || [];
  const normalizedStatus = effectiveNormalizedStatus(row);
  const isRejectedHistorical =
    row.status_validacao === "historico_consulta" &&
    normalizedStatus === "reprovado_em_curso";
  const isCancelledHistorical =
    row.status_validacao === "historico_consulta" &&
    normalizedStatus === "cancelado";
  const allowedValidation =
    ["ok_para_importar", "ok_para_importar_com_detalhes_parciais"].includes(row.status_validacao) ||
    isRejectedHistorical ||
    isCancelledHistorical;
  const allowedStatus = ["pendente", "aprovado_em_curso", "faturado", "reprovado_em_curso", "cancelado"].includes(normalizedStatus);
  const safeAssociation = ["com_os_confirmada", "sem_os_avulso", "provavel_avulso_numero_baixo"].includes(row.classificacao_vinculo_os);
  const explicitOsReference = cleanText(row.arkmeds_ordem_servico_id) || getSpreadsheetOsNumber(row) || cleanText(row.arkmeds_ordem_servico_numero);
  const diferencaValor = Number(row.diferenca_valor || 0);
  const descontoValor = normalizeMoney(row.arkmeds_desconto);
  const additionalCostsValue = buildAdditionalCostDefinitions(row, row.__items)
    .reduce((sum, item) => sum + item.value, 0);
  const coherentValue =
    Math.abs(diferencaValor) <= 0.05 ||
    (descontoValor > 0 && Math.abs(diferencaValor + descontoValor) <= 0.05) ||
    Math.abs(diferencaValor - additionalCostsValue + descontoValor) <= 0.05;
  const identifier = buildMigrationIdentifier(row);

  if (!allowedValidation) throw new Error(`Status de validacao fora do Lote 1: ${row.status_validacao || "-"}`);
  if (identifierNeedsReview(identifier)) {
    throw new Error(`Identificador generico exige conferencia manual: ${identifier || "-"}`);
  }
  if (!allowedStatus) throw new Error(`Status normalizado nao permitido: ${normalizedStatus || "-"}`);
  if (!safeAssociation) throw new Error(`Vinculo OS/avulso inseguro: ${row.classificacao_vinculo_os || "-"}`);
  if (explicitOsReference && !row.ordem_servico_id_resolvida) {
    throw new Error(`OS explicita nao localizada de forma segura: ${explicitOsReference}`);
  }
  if (blockingReasons.length) throw new Error(`Motivos bloqueantes presentes: ${blockingReasons.join(", ")}`);
  if (row.tem_itens_preservados !== true) throw new Error("Itens nao marcados como preservados.");
  if (row.status_preservacao_itens !== "itens_preservados") throw new Error(`Preservacao de itens invalida: ${row.status_preservacao_itens || "-"}`);
  if (!row.__items.length) throw new Error("Orcamento sem itens no staging.");
  if (!coherentValue) {
    throw new Error(
      `Divergencia de valor: ${row.diferenca_valor}; desconto: ${descontoValor}`
    );
  }
  if (!cleanText(row.pdf_original_url)) throw new Error("PDF original nao referenciado.");
  if (!row.empresa_id_resolvida) throw new Error("Empresa resolvida ausente.");
  if (!cleanText(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero)) {
    throw new Error("Numero do orcamento ArkMeds ausente.");
  }
}

async function alreadyImported(client, arkmedsId) {
  const { rows } = await client.query(
    `select id, numero
     from public.orcamentos
     where origem_migracao = 'arkmeds'
       and arkmeds_orcamento_id = $1
     limit 1`,
    [arkmedsId]
  );
  return rows[0] || null;
}

async function numberCollision(client, organizacaoId, numero, arkmedsId) {
  const { rows } = await client.query(
    `select id, numero, origem_migracao, arkmeds_orcamento_id
     from public.orcamentos
     where organizacao_id = $1
       and numero = $2
       and not (origem_migracao = 'arkmeds' and arkmeds_orcamento_id = $3)
     limit 1`,
    [organizacaoId, numero, arkmedsId]
  );
  return rows[0] || null;
}

async function importOneBudget(client, row, organizacaoId, mode) {
  const numero = cleanText(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
  const imported = await alreadyImported(client, row.arkmeds_orcamento_id);
  if (imported) {
    return {
      status: "ja_importado",
      orcamentoId: imported.id,
      message: `Ja importado como orcamento ${imported.numero}`,
    };
  }

  validateLote1Row(row);

  const collision = await numberCollision(client, organizacaoId, numero, row.arkmeds_orcamento_id);
  if (collision) {
    throw new Error(`Numero ${numero} ja existe no orcamento ${collision.id} sem o mesmo arkmeds_orcamento_id.`);
  }

  if (mode === "dry_run") {
    return {
      status: "simulado",
      orcamentoId: null,
      message: "Importacao simulada; nenhuma linha definitiva criada.",
    };
  }

  await client.query("begin");
  try {
    const payload = buildBudgetPayload(row, organizacaoId);
    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

    const { rows } = await client.query(
      `insert into public.orcamentos (${columns.join(", ")})
       values (${placeholders})
       returning id, numero`,
      values
    );

    const orcamentoId = rows[0].id;
    const itemPayloads = row.__items.map((item, index) => buildItemPayload(item, orcamentoId, index + 1));
    const additionalCosts = buildAdditionalCostDefinitions(row, row.__items).map((definition, index) =>
      buildAdditionalCostPayload(definition, orcamentoId, itemPayloads.length + index + 1)
    );
    itemPayloads.push(...additionalCosts);
    if (!itemPayloads.length) {
      throw new Error("Nenhum item para inserir; rollback executado.");
    }

    for (const itemPayload of itemPayloads) {
      const itemColumns = Object.keys(itemPayload);
      const itemValues = Object.values(itemPayload);
      const itemPlaceholders = itemColumns.map((_, index) => `$${index + 1}`).join(", ");
      await client.query(
        `insert into public.orcamento_itens (${itemColumns.join(", ")})
         values (${itemPlaceholders})`,
        itemValues
      );
    }

    await client.query("select public.recalcular_total_orcamento($1::uuid)", [orcamentoId]);
    await client.query("commit");

    return {
      status: "importado",
      orcamentoId,
      message: `Importado com ${itemPayloads.length} item(ns).`,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function adjustBudgetSequence(client) {
  await client.query(`
    select setval(
      'public.orcamentos_numero_seq',
      greatest(
        coalesce((select max(numero::bigint) from public.orcamentos where numero ~ '^\\d+$'), 1),
        coalesce((select last_value from public.orcamentos_numero_seq), 1)
      ),
      true
    )
  `);
}

function toResultRow(row, importResult, result = importResult.status, message = importResult.message) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    orcamento_id_novo: importResult.orcamentoId || "",
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    cliente: row.arkmeds_solicitante,
    valor_total: row.arkmeds_valor_total,
    quantidade_itens: row.__items?.length || 0,
    status_orcamento: effectiveNormalizedStatus(row),
    vinculo: row.classificacao_vinculo_os,
    os_vinculada: row.os_candidata_numero || row.arkmeds_ordem_servico_numero || "",
    pdf_original_url: row.pdf_original_url,
    resultado: result,
    mensagem: message,
  };
}

function toErrorRow(row, error, phase = "importacao") {
  return {
    arkmeds_orcamento_id: row?.arkmeds_orcamento_id || "",
    numero_orcamento: row?.arkmeds_orcamento_numero_original || row?.arkmeds_orcamento_numero || "",
    cliente: row?.arkmeds_solicitante || "",
    erro: error.message || String(error),
    fase: phase,
    dados: JSON.stringify({
      status_validacao: row?.status_validacao,
      status_normalizado_importacao: row?.status_normalizado_importacao,
      classificacao_vinculo_os: row?.classificacao_vinculo_os,
      motivos_bloqueantes: row?.motivos_bloqueantes,
    }),
  };
}

function sumBy(rows, predicate, field) {
  return rows
    .filter(predicate)
    .reduce((sum, row) => sum + normalizeMoney(row[field]), 0);
}

async function writeSummary({ args, mode, planned, rows, resultRows, errorRows, startedAt, finishedAt }) {
  const imported = resultRows.filter((row) => row.resultado === "importado");
  const simulated = resultRows.filter((row) => row.resultado === "simulado");
  const existing = resultRows.filter((row) => row.resultado === "ja_importado");
  const importedIds = new Set(imported.map((row) => Number(row.arkmeds_orcamento_id)));
  const importedRows = rows.filter((row) => importedIds.has(row.arkmeds_orcamento_id));
  const importedItems = importedRows.flatMap((row) => row.__items || []);
  const serviceCount = importedItems.filter((item) => item.tipo_item === "servico").length;
  const partCount = importedItems.filter((item) => item.tipo_item === "peca").length;
  const withOs = resultRows.filter((row) => row.resultado !== "erro" && cleanText(row.os_vinculada)).length;
  const avulso = resultRows.filter((row) => row.resultado !== "erro" && !cleanText(row.os_vinculada)).length;
  const importedValue = sumBy(imported, () => true, "valor_total");

  const lote = args.lote || "lote_1";
  const markdown = `# Importacao definitiva de orcamentos ArkMeds - ${lote}

Gerado em: ${finishedAt.toISOString()}

## Modo

- Modo executado: ${mode === "real" ? "IMPORTACAO REAL" : "DRY-RUN / SIMULACAO"}
- Lote solicitado: ${args.lote || "-"}
- Limit: ${args.limit || "sem limite"}
- Inicio: ${startedAt.toISOString()}
- Fim: ${finishedAt.toISOString()}

## Totais

- Total previsto no lote: ${planned}
- Total processado nesta execucao: ${rows.length}
- Total simulado: ${simulated.length}
- Total importado: ${imported.length}
- Total ja existente: ${existing.length}
- Total com erro: ${errorRows.length}
- Valor total importado: ${importedValue.toFixed(2)}
- Quantidade de servicos importados: ${serviceCount}
- Quantidade de pecas importadas: ${partCount}
- Quantidade com OS vinculada: ${withOs}
- Quantidade avulsa: ${avulso}

## Conferencia pos-importacao

${imported.length || existing.length ? resultRows
  .filter((row) => ["importado", "ja_importado"].includes(row.resultado))
  .slice(0, 20)
  .map((row) => `- ${row.orcamento_id_novo || "-"} | Orcamento ${row.numero_orcamento} | ${row.cliente} | R$ ${row.valor_total || "0"} | ${row.quantidade_itens} item(ns) | ${row.status_orcamento} | ${row.os_vinculada ? `OS ${row.os_vinculada}` : "avulso"} | ${row.pdf_original_url || "-"}`)
  .join("\n") : "- Nenhum orcamento importado ou existente nesta execucao."}

## Recomendacoes para conferencia manual

- Conferir os primeiros orcamentos importados na tela de Orcamentos pelo numero ArkMeds.
- Conferir se os itens batem com o PDF original em pelo menos uma amostra de servico, uma de peca e uma mista.
- Conferir orcamentos marcados como avulsos antes de liberar importacao em lote maior.
- Se houver erros por numero ja existente, decidir manualmente se o registro local deve ser preservado ou vinculado ao ArkMeds antes de criar qualquer rotina de atualizacao.
- Nao rodar sem limit em modo real antes de validar a amostra pequena.
`;

  await fs.writeFile(path.join(IMPORT_OUTPUT_DIR, `importacao_${lote}_resumo.md`), markdown, "utf-8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = isRealImport(args) ? "real" : "dry_run";
  const connectionString = requireDatabaseUrl();
  await fs.mkdir(IMPORT_OUTPUT_DIR, { recursive: true });

  const lote = args.lote || "lote_1";
  const lotePath = LOTE_PATHS.get(lote);
  if (!lotePath) {
    throw new Error(`Lote desconhecido: ${lote}.`);
  }
  const loteRows = await readCsv(lotePath);

  const loteIds = loteRows
    .map((row) => Number.parseInt(row.arkmeds_orcamento_id, 10))
    .filter(Number.isFinite);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const selectedIds = await selectBatchIds(client, loteIds, args);

  const startedAt = new Date();
  const resultRows = [];
  const errorRows = [];

  try {
    await logMigration(client, {
      tipo_execucao: mode,
      status: "inicio",
      mensagem: "Inicio da importacao definitiva de orcamentos ArkMeds Lote 1",
      payload_json: {
        lote: args.lote || "lote_1",
        limit: args.limit,
        status_planilha: args.statusPlanilha,
        status_arkmeds: args.statusArkmeds,
        modo: mode,
        total_lote: loteIds.length,
        total_selecionado: selectedIds.length,
      },
    });

    const organizacaoId = await getOrganizationId(client);
    const rows = await loadBatchRows(client, selectedIds);

    for (const row of rows) {
      try {
        const importResult = await importOneBudget(client, row, organizacaoId, mode);
        resultRows.push(toResultRow(row, importResult));
        await logMigration(client, {
          tipo_execucao: mode,
          status: importResult.status,
          arkmeds_id: row.arkmeds_orcamento_id,
          identificador_migracao: row.identificador_migracao,
          mensagem: importResult.message,
          payload_json: {
            lote,
            orcamento_id_novo: importResult.orcamentoId,
            numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
            quantidade_itens: row.__items.length,
          },
        });
      } catch (error) {
        errorRows.push(toErrorRow(row, error));
        resultRows.push(toResultRow(row, { status: "erro", orcamentoId: "", message: error.message }, "erro", error.message));
        await logMigration(client, {
          tipo_execucao: mode,
          status: "erro",
          arkmeds_id: row.arkmeds_orcamento_id,
          identificador_migracao: row.identificador_migracao,
          mensagem: error.message,
          payload_json: {
            lote,
            numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
          },
        });
      }
    }

    if (mode === "real") {
      await adjustBudgetSequence(client);
    }

    const missingIds = selectedIds.filter((id) => !rows.some((row) => row.arkmeds_orcamento_id === id));
    for (const id of missingIds) {
      const error = new Error("ID do lote nao encontrado no staging.");
      errorRows.push(toErrorRow({ arkmeds_orcamento_id: id }, error, "carregamento_staging"));
      resultRows.push({
        arkmeds_orcamento_id: id,
        orcamento_id_novo: "",
        numero_orcamento: "",
        cliente: "",
        valor_total: "",
        quantidade_itens: 0,
        status_orcamento: "",
        vinculo: "",
        os_vinculada: "",
        pdf_original_url: "",
        resultado: "erro",
        mensagem: error.message,
      });
    }

    await writeCsv(path.join(IMPORT_OUTPUT_DIR, `importacao_${lote}_resultado.csv`), resultRows, resultColumns);
    await writeCsv(path.join(IMPORT_OUTPUT_DIR, `importacao_${lote}_erros.csv`), errorRows, errorColumns);
    await writeSummary({
      args,
      mode,
      planned: loteIds.length,
      rows,
      resultRows,
      errorRows,
      startedAt,
      finishedAt: new Date(),
    });

    const summaryPayload = {
      modo: mode,
      lote: args.lote || "lote_1",
      limit: args.limit,
      status_planilha: args.statusPlanilha,
      status_arkmeds: args.statusArkmeds,
      total_previsto_lote: loteIds.length,
      total_processado: resultRows.length,
      total_simulado: resultRows.filter((row) => row.resultado === "simulado").length,
      total_importado: resultRows.filter((row) => row.resultado === "importado").length,
      total_ja_existente: resultRows.filter((row) => row.resultado === "ja_importado").length,
      total_erro: errorRows.length,
      output_dir: IMPORT_OUTPUT_DIR,
    };

    await logMigration(client, {
      tipo_execucao: mode,
      status: "fim",
      mensagem: "Fim da importacao definitiva de orcamentos ArkMeds Lote 1",
      payload_json: summaryPayload,
    });

    console.log(JSON.stringify(summaryPayload, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import {
  cleanText,
  ensureOutputDir,
  logMigration,
  outputDir,
  requireSupabase,
  supabaseAll,
  writeCsv,
} from "./lib.mjs";

const supabase = requireSupabase();

const orcamentoColumns = [
  "arkmeds_orcamento_id",
  "arkmeds_orcamento_numero",
  "arkmeds_orcamento_numero_original",
  "arkmeds_orcamento_numero_base",
  "arkmeds_orcamento_sufixo",
  "possui_sufixo_correcao",
  "arkmeds_tipo_texto",
  "arkmeds_status_grupo",
  "arkmeds_status_label",
  "arkmeds_status_original",
  "status_normalizado_importacao",
  "politica_importacao_status",
  "arkmeds_solicitante",
  "arkmeds_data_criacao",
  "arkmeds_data_validade",
  "arkmeds_valor_total",
  "soma_itens",
  "diferenca_valor",
  "arkmeds_ordem_servico_numero",
  "os_candidata_numero",
  "cliente_os_candidato",
  "score_cliente",
  "classificacao_cliente",
  "score_os",
  "confianca_os",
  "classificacao_vinculo_os",
  "status_validacao",
  "status_preservacao_itens",
  "status_extracao_detalhes",
  "status_comparacao_pdf_endpoint",
  "motivos_validacao",
  "motivos_bloqueantes",
  "avisos_validacao",
  "motivos_associacao_os",
  "motivos_comparacao_pdf_endpoint",
  "recomendacao_migracao",
  "identificador_migracao",
  "pdf_original_url",
];

const itemColumns = [
  "arkmeds_orcamento_id",
  "arkmeds_orcamento_numero",
  "tipo_item",
  "descricao",
  "quantidade",
  "garantia",
  "valor_unitario",
  "valor_total_calculado",
  "observacoes",
  "arkmeds_servico_id",
  "arkmeds_peca_id",
  "peca_tipo_descricao",
  "unidade_medida",
  "modelo_fabricante",
];

const associacaoColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento_original",
  "numero_orcamento_base",
  "sufixo_correcao",
  "cliente_orcamento",
  "os_candidata_numero",
  "cliente_os",
  "score_cliente",
  "classificacao_cliente",
  "data_orcamento",
  "data_os",
  "score_os",
  "confianca_os",
  "classificacao_vinculo_os",
  "motivos_validacao",
  "recomendacao",
];

const preservacaoColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "tipo_orcamento",
  "status_arkmeds",
  "valor_total_cabecalho",
  "soma_itens",
  "qtd_servicos",
  "qtd_pecas",
  "tem_servicos",
  "tem_pecas",
  "tipo_misto_completo",
  "status_preservacao_itens",
  "motivos_validacao",
  "pdf_original_url",
];

const integridadeColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "tipo_orcamento",
  "qtd_itens_staging",
  "qtd_itens_ultima_coleta",
  "status_endpoint",
  "possui_duplicidade_itens",
  "soma_itens",
  "valor_total_cabecalho",
  "diferenca_valor",
  "recomendacao",
];

const conferenciaLoteColumns = [
  "tipo_linha",
  "grupo",
  "chave",
  "quantidade",
  "valor_total",
  "observacao",
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "tipo_orcamento",
  "status_arkmeds",
  "status_normalizado",
  "classificacao_vinculo_os",
  "status_validacao",
];

const detalhesColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "informacoes_tecnicas",
  "equipamento_texto",
  "fabricante",
  "modelo",
  "numero_serie",
  "patrimonio",
  "observacoes_gerais",
  "pdf_original_url",
  "status_extracao_detalhes",
];

const comparacaoColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "valor_total_cabecalho",
  "valor_total_pdf",
  "soma_itens_endpoint",
  "qtd_servicos_pdf",
  "qtd_servicos_endpoint",
  "qtd_pecas_pdf",
  "qtd_pecas_endpoint",
  "status_comparacao",
  "motivos",
];

const loteColumns = [
  "arkmeds_orcamento_id",
  "numero_orcamento",
  "cliente",
  "tipo_orcamento",
  "status_arkmeds",
  "status_normalizado",
  "politica_importacao_status",
  "status_validacao",
  "classificacao_vinculo_os",
  "os_candidata_numero",
  "valor_total_cabecalho",
  "soma_itens",
  "qtd_servicos",
  "qtd_pecas",
  "tem_itens_preservados",
  "tem_detalhes_tecnicos",
  "pdf_original_url",
  "status_preservacao_itens",
  "status_extracao_detalhes",
  "motivos_bloqueantes",
  "avisos_validacao",
];

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = cleanText(row[key]) || "-";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function reasonCounts(rows) {
  return reasonCountsFromField(rows, "motivos_validacao");
}

function reasonCountsFromField(rows, field) {
  const counts = {};
  for (const row of rows) {
    for (const reason of row[field] || []) {
      counts[reason] = (counts[reason] || 0) + 1;
    }
  }
  return counts;
}

function mdListFromCounts(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!entries.length) return "- Nenhum registro.";
  return entries.map(([label, count]) => `- ${label}: ${count}`).join("\n");
}

function toAssociacaoRow(row) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento_original: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    numero_orcamento_base: row.arkmeds_orcamento_numero_base,
    sufixo_correcao: row.arkmeds_orcamento_sufixo,
    cliente_orcamento: row.arkmeds_solicitante,
    os_candidata_numero: row.os_candidata_numero,
    cliente_os: row.cliente_os_candidato,
    score_cliente: row.score_cliente,
    classificacao_cliente: row.classificacao_cliente,
    data_orcamento: row.arkmeds_data_criacao,
    data_os: row.data_os_candidata,
    score_os: row.score_os,
    confianca_os: row.confianca_os,
    classificacao_vinculo_os: row.classificacao_vinculo_os,
    motivos_validacao: row.motivos_validacao,
    recomendacao: row.recomendacao_migracao,
  };
}

function toPreservacaoRow(row) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    cliente: row.arkmeds_solicitante,
    tipo_orcamento: row.arkmeds_tipo_texto,
    status_arkmeds: row.arkmeds_status_grupo,
    valor_total_cabecalho: row.arkmeds_valor_total,
    soma_itens: row.soma_itens,
    qtd_servicos: row.qtd_servicos_endpoint ?? row.itens_servicos_quantidade,
    qtd_pecas: row.qtd_pecas_endpoint ?? row.itens_pecas_quantidade,
    tem_servicos: Number(row.qtd_servicos_endpoint ?? row.itens_servicos_quantidade ?? 0) > 0,
    tem_pecas: Number(row.qtd_pecas_endpoint ?? row.itens_pecas_quantidade ?? 0) > 0,
    tipo_misto_completo: row.tipo_misto_completo,
    status_preservacao_itens: row.status_preservacao_itens,
    motivos_validacao: row.motivos_validacao,
    pdf_original_url: row.pdf_original_url,
  };
}

function toDetalhesRow(row) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    cliente: row.arkmeds_solicitante,
    informacoes_tecnicas: row.informacoes_tecnicas,
    equipamento_texto: row.equipamento_texto,
    fabricante: row.fabricante,
    modelo: row.modelo,
    numero_serie: row.numero_serie,
    patrimonio: row.patrimonio,
    observacoes_gerais: row.observacoes_gerais,
    pdf_original_url: row.pdf_original_url,
    status_extracao_detalhes: row.status_extracao_detalhes,
  };
}

function toComparacaoRow(row) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    cliente: row.arkmeds_solicitante,
    valor_total_cabecalho: row.arkmeds_valor_total,
    valor_total_pdf: row.valor_total_pdf,
    soma_itens_endpoint: row.soma_itens,
    qtd_servicos_pdf: row.qtd_servicos_pdf,
    qtd_servicos_endpoint: row.qtd_servicos_endpoint ?? row.itens_servicos_quantidade,
    qtd_pecas_pdf: row.qtd_pecas_pdf,
    qtd_pecas_endpoint: row.qtd_pecas_endpoint ?? row.itens_pecas_quantidade,
    status_comparacao: row.status_comparacao_pdf_endpoint,
    motivos: row.motivos_comparacao_pdf_endpoint,
  };
}

function toLoteRow(row) {
  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    cliente: row.arkmeds_solicitante,
    tipo_orcamento: row.arkmeds_tipo_texto,
    status_arkmeds: row.arkmeds_status_label || row.arkmeds_status_grupo,
    status_normalizado: row.status_normalizado_importacao,
    politica_importacao_status: row.politica_importacao_status,
    status_validacao: row.status_validacao,
    classificacao_vinculo_os: row.classificacao_vinculo_os,
    os_candidata_numero: row.os_candidata_numero,
    valor_total_cabecalho: row.arkmeds_valor_total,
    soma_itens: row.soma_itens,
    qtd_servicos: row.qtd_servicos_endpoint ?? row.itens_servicos_quantidade,
    qtd_pecas: row.qtd_pecas_endpoint ?? row.itens_pecas_quantidade,
    tem_itens_preservados: row.tem_itens_preservados,
    tem_detalhes_tecnicos: row.tem_detalhes_tecnicos,
    pdf_original_url: row.pdf_original_url,
    status_preservacao_itens: row.status_preservacao_itens,
    status_extracao_detalhes: row.status_extracao_detalhes,
    motivos_bloqueantes: row.motivos_bloqueantes,
    avisos_validacao: row.avisos_validacao,
  };
}

function itemDuplicationKey(item) {
  if (item.arkmeds_item_id != null) {
    return [item.arkmeds_orcamento_id, item.arkmeds_item_id, item.tipo_item].join("|");
  }

  return [
    item.arkmeds_orcamento_id,
    item.tipo_item,
    cleanText(item.descricao).toLowerCase(),
    Number(item.quantidade || 0).toFixed(2),
    Number(item.valor_unitario || 0).toFixed(2),
  ].join("|");
}

function hasDuplicatedItems(items) {
  const keys = new Set();
  for (const item of items) {
    const key = itemDuplicationKey(item);
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}

function toIntegridadeRow(row, itemsByBudget) {
  const budgetItems = itemsByBudget.get(row.arkmeds_orcamento_id) || [];
  const qtdStaging = budgetItems.length;
  const qtdUltimaColeta = row.itens_ultima_coleta_quantidade == null
    ? Number(row.qtd_servicos_endpoint ?? 0) + Number(row.qtd_pecas_endpoint ?? 0)
    : Number(row.itens_ultima_coleta_quantidade || 0);
  const hasDupes = hasDuplicatedItems(budgetItems);
  const statusEndpoint = row.erro_itens_endpoint
    ? "erro_endpoint"
    : row.status_preservacao_itens || row.itens_ultima_coleta_status || "-";
  const diff = Number(row.diferenca_valor || 0);
  const recommendations = [];

  if (hasDupes) recommendations.push("remover_duplicidades");
  if (row.erro_itens_endpoint) recommendations.push("reprocessar_endpoint");
  if (!qtdStaging && row.arkmeds_orcamento_id) recommendations.push("recoletar_itens");
  if (Math.abs(diff) > 0.05) recommendations.push("conferir_valores");
  if (!recommendations.length) recommendations.push("ok");

  return {
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    tipo_orcamento: row.arkmeds_tipo_texto,
    qtd_itens_staging: qtdStaging,
    qtd_itens_ultima_coleta: qtdUltimaColeta,
    status_endpoint: statusEndpoint,
    possui_duplicidade_itens: hasDupes,
    soma_itens: row.soma_itens,
    valor_total_cabecalho: row.arkmeds_valor_total,
    diferenca_valor: row.diferenca_valor,
    recomendacao: recommendations.join("|"),
  };
}

function isSafeBatchRow(row) {
  const acceptedStatus = ["ok_para_importar", "ok_para_importar_com_detalhes_parciais"].includes(row.status_validacao);
  const safeAssociation = ["com_os_confirmada", "sem_os_avulso", "provavel_avulso_numero_baixo"].includes(row.classificacao_vinculo_os);
  const allowedStatus = ["pendente", "aprovado_em_curso", "faturado"].includes(row.status_normalizado_importacao);
  const coherentValue = Math.abs(Number(row.diferenca_valor || 0)) <= 0.05;
  return (
    acceptedStatus &&
    allowedStatus &&
    safeAssociation &&
    row.tem_itens_preservados === true &&
    row.status_preservacao_itens === "itens_preservados" &&
    coherentValue &&
    cleanText(row.pdf_original_url) &&
    !(row.motivos_bloqueantes || []).length
  );
}

function buildConferenceRows(loteRows, loteHeaders, loteItems) {
  const rows = [];
  const totalValue = loteHeaders.reduce((sum, row) => sum + Number(row.arkmeds_valor_total || 0), 0);

  rows.push({
    tipo_linha: "total",
    grupo: "lote_1",
    chave: "registros",
    quantidade: loteHeaders.length,
    valor_total: totalValue.toFixed(2),
    observacao: "Total do Lote 1 de importacao segura",
  });
  rows.push({
    tipo_linha: "total",
    grupo: "lote_1",
    chave: "servicos",
    quantidade: loteItems.filter((item) => item.tipo_item === "servico").length,
    valor_total: "",
    observacao: "Quantidade de itens de servico no lote",
  });
  rows.push({
    tipo_linha: "total",
    grupo: "lote_1",
    chave: "pecas",
    quantidade: loteItems.filter((item) => item.tipo_item === "peca").length,
    valor_total: "",
    observacao: "Quantidade de itens de peca no lote",
  });
  rows.push({
    tipo_linha: "total",
    grupo: "lote_1",
    chave: "pdf_referenciado",
    quantidade: loteHeaders.filter((row) => cleanText(row.pdf_original_url)).length,
    valor_total: "",
    observacao: "Orcamentos do lote com PDF original referenciado",
  });

  const groupedChecks = [
    ["status_arkmeds", "arkmeds_status_grupo"],
    ["status_normalizado", "status_normalizado_importacao"],
    ["classificacao_os", "classificacao_vinculo_os"],
    ["tipo_orcamento", "arkmeds_tipo_texto"],
  ];

  for (const [groupName, key] of groupedChecks) {
    for (const [value, count] of Object.entries(countBy(loteHeaders, key))) {
      rows.push({
        tipo_linha: "subtotal",
        grupo: groupName,
        chave: value,
        quantidade: count,
        valor_total: "",
        observacao: "",
      });
    }
  }

  const violations = loteHeaders.filter((row) => !isSafeBatchRow(row));
  rows.push({
    tipo_linha: "violacao",
    grupo: "regras",
    chave: "violacoes_lote_1",
    quantidade: violations.length,
    valor_total: "",
    observacao: violations.length ? "Revisar lote antes de importar" : "Nenhuma violacao encontrada",
  });

  for (const row of loteRows.slice(0, 50)) {
    rows.push({
      tipo_linha: "amostra",
      grupo: "primeiros_50",
      chave: row.numero_orcamento,
      quantidade: "",
      valor_total: row.valor_total_cabecalho,
      observacao: "",
      arkmeds_orcamento_id: row.arkmeds_orcamento_id,
      numero_orcamento: row.numero_orcamento,
      cliente: row.cliente,
      tipo_orcamento: row.tipo_orcamento,
      status_arkmeds: row.status_arkmeds || row.status_normalizado,
      status_normalizado: row.status_normalizado,
      classificacao_vinculo_os: row.classificacao_vinculo_os,
      status_validacao: row.status_validacao,
    });
  }

  return rows;
}

async function main() {
  await ensureOutputDir();

  await logMigration(supabase, {
    entidade: "orcamentos_relatorios",
    status: "inicio",
    mensagem: "Inicio geracao relatorios CSV staging orcamentos",
  });

  const headerSelect = [
    ...orcamentoColumns,
    "data_os_candidata",
    "itens_servicos_quantidade",
    "itens_pecas_quantidade",
    "itens_ultima_coleta_quantidade",
    "itens_ultima_coleta_status",
    "erro_itens_endpoint",
    "qtd_servicos_endpoint",
    "qtd_pecas_endpoint",
    "tipo_misto_completo",
    "tem_itens_preservados",
    "tem_detalhes_tecnicos",
    "informacoes_tecnicas",
    "equipamento_texto",
    "fabricante",
    "modelo",
    "numero_serie",
    "patrimonio",
    "observacoes_gerais",
    "valor_total_pdf",
    "qtd_servicos_pdf",
    "qtd_pecas_pdf",
  ].join(",");

  const [headers, items] = await Promise.all([
    supabaseAll(
      supabase,
      "staging_arkmeds_orcamentos",
      headerSelect,
      (query) => query.order("arkmeds_orcamento_id", { ascending: true })
    ),
    supabaseAll(
      supabase,
      "staging_arkmeds_orcamento_itens",
      "arkmeds_orcamento_id,arkmeds_item_id,tipo_item,descricao,quantidade,garantia,valor_unitario,valor_total_calculado,observacoes,arkmeds_servico_id,arkmeds_peca_id,peca_tipo_descricao,unidade_medida,modelo_fabricante",
      (query) => query.order("arkmeds_orcamento_id", { ascending: true })
    ),
  ]);

  const numberById = new Map(headers.map((row) => [row.arkmeds_orcamento_id, row.arkmeds_orcamento_numero]));
  const itemRows = items.map((item) => ({
    ...item,
    arkmeds_orcamento_numero: numberById.get(item.arkmeds_orcamento_id) || "",
  }));
  const itemsByBudget = new Map();
  for (const item of items) {
    if (!itemsByBudget.has(item.arkmeds_orcamento_id)) itemsByBudget.set(item.arkmeds_orcamento_id, []);
    itemsByBudget.get(item.arkmeds_orcamento_id).push(item);
  }

  const inconsistentRows = headers.filter((row) => !["ok_para_importar", "ok_para_importar_com_detalhes_parciais"].includes(row.status_validacao));
  const associationRows = headers.map(toAssociacaoRow);
  const candidateRows = associationRows.filter((row) =>
    ["com_os_confirmada", "possivel_os_por_numero_cliente", "possivel_os_por_numero", "os_sugerida_baixa_confianca", "os_ambigua"].includes(row.classificacao_vinculo_os)
  );
  const confirmedRows = associationRows.filter((row) => row.classificacao_vinculo_os === "com_os_confirmada");
  const mediumRows = associationRows.filter((row) => row.confianca_os === "media");
  const lowRows = associationRows.filter((row) => row.confianca_os === "baixa");
  const avulsoRows = associationRows.filter((row) => ["sem_os_avulso", "provavel_avulso_numero_baixo"].includes(row.classificacao_vinculo_os));
  const preservacaoRows = headers.map(toPreservacaoRow);
  const detalhesRows = headers.map(toDetalhesRow);
  const comparacaoRows = headers.map(toComparacaoRow);
  const loteSeguroRows = headers
    .filter(isSafeBatchRow)
    .map(toLoteRow);
  const loteSeguroIds = new Set(loteSeguroRows.map((row) => row.arkmeds_orcamento_id));
  const loteSeguroHeaders = headers.filter((row) => loteSeguroIds.has(row.arkmeds_orcamento_id));
  const loteSeguroItems = items.filter((item) => loteSeguroIds.has(item.arkmeds_orcamento_id));
  const integridadeRows = headers.map((row) => toIntegridadeRow(row, itemsByBudget));
  const loteHistoricoCanceladosRows = headers
    .filter((row) => row.status_normalizado_importacao === "cancelado" && row.status_validacao === "historico_consulta")
    .map(toLoteRow);
  const loteHistoricoReprovadosRows = headers
    .filter((row) => row.status_normalizado_importacao === "reprovado_em_curso" && row.status_validacao === "historico_consulta")
    .map(toLoteRow);
  const loteIgnoradosRows = headers
    .filter((row) => ["ignorar"].includes(row.status_validacao) || row.status_normalizado_importacao === "recusado_ignorado")
    .map(toLoteRow);
  const conferenciaLoteRows = buildConferenceRows(loteSeguroRows, loteSeguroHeaders, loteSeguroItems);

  await writeCsv(path.join(outputDir, "relatorio_orcamentos_staging.csv"), headers, orcamentoColumns);
  await writeCsv(path.join(outputDir, "relatorio_orcamento_itens_staging.csv"), itemRows, itemColumns);
  await writeCsv(path.join(outputDir, "relatorio_inconsistencias_orcamentos.csv"), inconsistentRows, orcamentoColumns);
  await writeCsv(path.join(outputDir, "relatorio_associacao_os_score.csv"), associationRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_associacao_os_por_numero_cliente.csv"), candidateRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_os_confirmadas.csv"), confirmedRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_os_sugeridas_media_confianca.csv"), mediumRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_os_baixa_confianca.csv"), lowRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_orcamentos_avulsos.csv"), avulsoRows, associacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_preservacao_itens_orcamentos.csv"), preservacaoRows, preservacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_detalhes_tecnicos_orcamentos.csv"), detalhesRows, detalhesColumns);
  await writeCsv(path.join(outputDir, "relatorio_comparacao_pdf_endpoint.csv"), comparacaoRows, comparacaoColumns);
  await writeCsv(path.join(outputDir, "relatorio_integridade_itens_staging.csv"), integridadeRows, integridadeColumns);
  await writeCsv(path.join(outputDir, "lote_1_importacao_segura.csv"), loteSeguroRows, loteColumns);
  await writeCsv(path.join(outputDir, "lote_historico_cancelados.csv"), loteHistoricoCanceladosRows, loteColumns);
  await writeCsv(path.join(outputDir, "lote_historico_reprovados.csv"), loteHistoricoReprovadosRows, loteColumns);
  await writeCsv(path.join(outputDir, "lote_ignorados.csv"), loteIgnoradosRows, loteColumns);
  await writeCsv(path.join(outputDir, "relatorio_conferencia_lote_1.csv"), conferenciaLoteRows, conferenciaLoteColumns);

  const byType = countBy(headers, "arkmeds_tipo_texto");
  const byArkStatus = countBy(headers, "arkmeds_status_grupo");
  const byArkStatusLabel = countBy(headers, "arkmeds_status_label");
  const byNormalizedStatus = countBy(headers, "status_normalizado_importacao");
  const byPolicy = countBy(headers, "politica_importacao_status");
  const byOsClass = countBy(headers, "classificacao_vinculo_os");
  const byValidationStatus = countBy(headers, "status_validacao");
  const byReason = reasonCounts(headers);
  const byBlockingReason = reasonCountsFromField(headers, "motivos_bloqueantes");
  const byWarning = reasonCountsFromField(headers, "avisos_validacao");
  const okCount = headers.filter((row) => row.status_validacao === "ok_para_importar").length;
  const partialCount = headers.filter((row) => row.status_validacao === "ok_para_importar_com_detalhes_parciais").length;
  const loteSeguroCount = loteSeguroRows.length;
  const blockedCount = headers.filter((row) => (row.motivos_bloqueantes || []).length).length;
  const ignoredCount = headers.filter((row) => row.status_validacao === "ignorar").length;
  const historicalCount = headers.filter((row) => row.status_validacao === "historico_consulta").length;
  const pendingCount = headers.length - okCount - partialCount - ignoredCount - historicalCount;
  const servicesPreserved = items.filter((item) => item.tipo_item === "servico").length;
  const partsPreserved = items.filter((item) => item.tipo_item === "peca").length;
  const mixedComplete = headers.filter((row) => row.tipo_misto_completo === true).length;
  const technicalExtracted = headers.filter((row) => row.tem_detalhes_tecnicos).length;
  const pdfReferenced = headers.filter((row) => cleanText(row.pdf_original_url)).length;
  const pdfDivergences = headers.filter((row) =>
    (row.avisos_validacao || []).some((reason) =>
      ["DIVERGENCIA_TOTAL_ENDPOINT_PDF", "DIVERGENCIA_ITENS_ENDPOINT_PDF"].includes(reason)
    )
  ).length;
  const noItems = headers.filter((row) => (Number(row.qtd_servicos_endpoint || 0) + Number(row.qtd_pecas_endpoint || 0)) === 0).length;

  const markdown = `# Resumo da migracao de orcamentos ArkMeds

Gerado em: ${new Date().toISOString()}

## Totais

- Total de orcamentos lidos: ${headers.length}
- Total de itens lidos: ${items.length}
- Prontos para importar sem ressalva: ${okCount}
- Prontos para importar com detalhes parciais: ${partialCount}
- Total do Lote 1 de importacao segura: ${loteSeguroCount}
- Total bloqueado: ${blockedCount}
- Total ignorado: ${ignoredCount}
- Total para consulta historica: ${historicalCount}
- Orcamentos pendentes de validacao: ${pendingCount}
- OS confirmadas: ${confirmedRows.length}
- OS sugeridas com confianca media: ${mediumRows.length}
- OS sugeridas com baixa confianca: ${lowRows.length}
- Orcamentos avulsos/provaveis avulsos: ${avulsoRows.length}

## Preservacao dos dados do orcamento

- Orcamentos com itens preservados: ${headers.filter((row) => row.tem_itens_preservados).length}
- Servicos preservados: ${servicesPreserved}
- Pecas preservadas: ${partsPreserved}
- Orcamentos mistos completos: ${mixedComplete}
- Orcamentos com informacoes tecnicas extraidas: ${technicalExtracted}
- Orcamentos com PDF referenciado: ${pdfReferenced}
- Divergencias PDF x endpoint: ${pdfDivergences}
- Orcamentos sem itens: ${noItems}
- Orcamentos com detalhes parciais: ${partialCount}

## Total por tipo

${mdListFromCounts(byType)}

## Total por status ArkMeds

${mdListFromCounts(byArkStatus)}

## Total por aba real do ArkMeds

${mdListFromCounts(byArkStatusLabel)}

## Total por status normalizado

${mdListFromCounts(byNormalizedStatus)}

## Politica de importacao por status

${mdListFromCounts(byPolicy)}

- Entrarao no sistema novo para operacao/consulta operacional: ${headers.filter((row) => row.politica_importacao_status === "importar_operacional").length}
- Entrarao apenas para historico/consulta: ${historicalCount}
- Serao ignorados: ${ignoredCount}
- Estao bloqueados por inconsistencia: ${blockedCount}

## Total por classificacao de vinculo com OS

${mdListFromCounts(byOsClass)}

## Total por status de validacao

${mdListFromCounts(byValidationStatus)}

## Principais inconsistencias

${mdListFromCounts(byReason)}

## Erros bloqueantes

${mdListFromCounts(byBlockingReason)}

## Avisos nao bloqueantes

${mdListFromCounts(byWarning)}

## Arquivos gerados

- relatorio_orcamentos_staging.csv
- relatorio_orcamento_itens_staging.csv
- relatorio_inconsistencias_orcamentos.csv
- relatorio_associacao_os_score.csv
- relatorio_associacao_os_por_numero_cliente.csv
- relatorio_os_confirmadas.csv
- relatorio_os_sugeridas_media_confianca.csv
- relatorio_os_baixa_confianca.csv
- relatorio_orcamentos_avulsos.csv
- relatorio_preservacao_itens_orcamentos.csv
- relatorio_detalhes_tecnicos_orcamentos.csv
- relatorio_comparacao_pdf_endpoint.csv
- relatorio_integridade_itens_staging.csv
- relatorio_conferencia_lote_1.csv
- lote_1_importacao_segura.csv
- lote_historico_cancelados.csv
- lote_historico_reprovados.csv
- lote_ignorados.csv
- relatorio_resumo_migracao_orcamentos.md

## Recomendacao para proxima etapa

Revise primeiro os relatorios de preservacao de itens, comparacao PDF x endpoint e associacao com OS. A importacao definitiva so deve ser criada depois de validar os vinculos confirmados, decidir a politica para sugestoes de media/baixa confianca e revisar divergencias de valor ou itens.
`;

  await fs.writeFile(path.join(outputDir, "relatorio_resumo_migracao_orcamentos.md"), markdown, "utf-8");

  const result = {
    dry_run: true,
    outputDir,
    headers: headers.length,
    items: items.length,
    inconsistentRows: inconsistentRows.length,
    okCount,
    partialCount,
    pendingCount,
    confirmedOs: confirmedRows.length,
    mediumOs: mediumRows.length,
    lowOs: lowRows.length,
    avulsos: avulsoRows.length,
    loteSeguro: loteSeguroRows.length,
  };

  await fs.writeFile(path.join(outputDir, "relatorios_resultado.json"), JSON.stringify(result, null, 2), "utf-8");

  await logMigration(supabase, {
    entidade: "orcamentos_relatorios",
    status: "fim",
    mensagem: "Fim geracao relatorios CSV staging orcamentos",
    payload_json: result,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await logMigration(supabase, {
      entidade: "orcamentos_relatorios",
      status: "erro",
      mensagem: error.message,
    });
  } catch {
    // ignore logging failure
  }
  process.exit(1);
});

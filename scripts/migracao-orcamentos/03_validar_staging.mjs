import fs from "node:fs/promises";
import path from "node:path";
import {
  cleanText,
  compararCliente,
  confiancaPorScore,
  daysBetween,
  ensureOutputDir,
  logMigration,
  normalizarNumeroBaseOrcamento,
  normalizeArkmedsStatusGroup,
  outputDir,
  recomendacaoPorClassificacao,
  requireSupabase,
  statusImportPolicy,
  supabaseAll,
} from "./lib.mjs";

const supabase = requireSupabase();
const symbolicValues = new Set(["0.01", "0.02", "0.03", "0.10"]);
const nonBlockingReasons = new Set([
  "PDF_SEM_TEXTO_EXTRAIVEL",
  "PDF_NAO_BAIXADO",
  "DETALHES_TECNICOS_PARCIAIS",
  "DIVERGENCIA_ITENS_ENDPOINT_PDF",
  "DIVERGENCIA_TOTAL_ENDPOINT_PDF",
  "SEM_VALIDADE",
  "STATUS_FATURADO",
  "STATUS_PENDENTE",
  "STATUS_CANCELADO",
  "STATUS_REPROVADO",
  "STATUS_RECUSADO",
  "VALOR_ZERO",
  "VALOR_SIMBOLICO",
  "COM_ANEXO",
  "JA_GEROU_OS",
  "NUMERO_IGUAL_OS",
  "PROVAVEL_AVULSO_NUMERO_BAIXO",
  "ORCAMENTO_REALMENTE_SEM_ITENS",
]);

function rounded(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function statusGroupReason(statusGroup) {
  const group = cleanText(statusGroup).toLowerCase();
  if (group.includes("cancel")) return "STATUS_CANCELADO";
  if (group.includes("recus")) return "STATUS_RECUSADO";
  if (group.includes("reprov")) return "STATUS_REPROVADO";
  if (group.includes("fatur")) return "STATUS_FATURADO";
  if (group.includes("pend")) return "STATUS_PENDENTE";
  return null;
}

function shouldIgnoreByPolicy(statusGroup) {
  const policy = statusImportPolicy(cleanText(statusGroup));
  return policy === "ignorar";
}

function shouldImportAsHistory(statusGroup) {
  return statusImportPolicy(statusGroup) === "importar_historico";
}

function normalizeNumberKey(value) {
  return cleanText(value);
}

function hasMixedType(tipoTexto) {
  const text = cleanText(tipoTexto)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return text.includes("peca") && text.includes("servico");
}

function textContains(haystack, needle) {
  const text = cleanText(haystack).toLowerCase();
  const target = cleanText(needle).toLowerCase();
  return target.length >= 3 && text.includes(target);
}

function makeBudgetText(row, items) {
  const parts = [
    row.arkmeds_solicitante,
    row.arkmeds_orcamento_numero,
    row.arkmeds_tipo_texto,
    ...(items || []).flatMap((item) => [item.descricao, item.observacoes, item.peca_tipo_descricao]),
  ];
  return parts.filter(Boolean).join(" | ");
}

function buildOsCandidateIndexes(osRows, empresasById, equipamentosById) {
  const byNumber = new Map();

  for (const row of osRows) {
    const numero = cleanText(row.numero || row.numero_ordem);
    if (!numero) continue;

    const empresa = empresasById.get(row.empresa_id);
    const equipamento = equipamentosById.get(row.equipamento_id);
    const enriched = {
      ...row,
      numero,
      cliente_nome: cleanText(empresa?.nome || empresa?.nome_fantasia),
      equipamento,
    };

    if (!byNumber.has(numero)) byNumber.set(numero, []);
    byNumber.get(numero).push(enriched);
  }

  return byNumber;
}

function equipmentMatchScore(candidate, budgetText) {
  const equipamento = candidate.equipamento || {};
  const fields = [
    equipamento.numero_serie,
    equipamento.patrimonio,
    equipamento.tag,
    equipamento.modelo,
    equipamento.fabricante,
    equipamento.tipo_texto,
  ].filter(Boolean);

  for (const field of fields) {
    if (textContains(budgetText, field)) return 20;
  }

  return 0;
}

function scoreCandidate(row, budgetItems, candidate, candidateCount) {
  const numeroInfo = normalizarNumeroBaseOrcamento(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
  const budgetText = makeBudgetText(row, budgetItems);
  const cliente = compararCliente(row.arkmeds_solicitante, candidate.cliente_nome);
  const dateDiff = daysBetween(row.arkmeds_data_criacao, candidate.data_abertura || candidate.created_at);
  const motifs = [];
  let score = 0;

  if (cleanText(row.arkmeds_ordem_servico_id)) {
    score += 40;
    motifs.push("OS_ID_DIRETA_ARKMEDS");
  }
  if (cleanText(row.arkmeds_ordem_servico_numero)) {
    score += 35;
    motifs.push("OS_NUMERO_DIRETO_ARKMEDS");
  }
  if (numeroInfo.base && numeroInfo.base === candidate.numero) {
    score += 30;
    motifs.push("NUMERO_BASE_BATE_OS");
  }
  if (numeroInfo.possuiSufixo && numeroInfo.base === candidate.numero) {
    score += 20;
    motifs.push("SUFIXO_CORRECAO_BATE_BASE_OS");
  }

  if (["cliente_igual", "cliente_muito_semelhante"].includes(cliente.classificacao)) {
    score += 25;
    motifs.push(cliente.classificacao.toUpperCase());
  } else if (cliente.classificacao === "cliente_possivel") {
    score += 10;
    motifs.push("CLIENTE_POSSIVEL");
  } else {
    score -= 25;
    motifs.push("CLIENTE_DIVERGENTE");
  }

  if (dateDiff != null && dateDiff <= 30) {
    score += 15;
    motifs.push("DATA_PROXIMA_30_DIAS");
  } else if (dateDiff != null && dateDiff <= 90) {
    score += 8;
    motifs.push("DATA_PROXIMA_90_DIAS");
  }

  const equipmentScore = equipmentMatchScore(candidate, budgetText);
  if (equipmentScore > 0) {
    score += equipmentScore;
    motifs.push("EQUIPAMENTO_OU_IDENTIFICACAO_BATE");
  }

  if (candidate.numero && textContains(budgetText, `OS ${candidate.numero}`)) {
    score += 10;
    motifs.push("DESCRITIVO_MENCIONA_OS");
  }

  if (numeroInfo.baseNumber > 10000) {
    score += 10;
    motifs.push("NUMERO_ALTO_RECENTE");
  }

  if (numeroInfo.baseNumber != null && numeroInfo.baseNumber <= 1373 && !cleanText(row.arkmeds_ordem_servico_numero) && !cleanText(row.arkmeds_ordem_servico_id)) {
    score -= 20;
    motifs.push("NUMERO_BAIXO_SEM_OS_EXPLICITA");
  }

  if (candidateCount > 1) {
    score -= 30;
    motifs.push("MULTIPLAS_OS_CANDIDATAS");
  }

  if (numeroInfo.base === candidate.numero && cliente.classificacao === "cliente_divergente") {
    score -= 40;
    motifs.push("NUMERO_BATE_CLIENTE_DIVERGE");
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    candidate,
    score: clampedScore,
    cliente,
    dateDiff,
    motifs: [...new Set(motifs)],
  };
}

function classifyAssociation(row, budgetItems, candidates) {
  const numeroInfo = normalizarNumeroBaseOrcamento(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
  const hasDirectOs = cleanText(row.arkmeds_ordem_servico_id) || cleanText(row.arkmeds_ordem_servico_numero);

  if (!cleanText(row.arkmeds_solicitante) || !numeroInfo.original || !row.arkmeds_data_criacao) {
    return { classificacao: "pendente_validacao", score: 0, confianca: "pendente", motifs: ["DADOS_CRITICOS_AUSENTES"] };
  }

  if (!candidates.length) {
    const classificacao = numeroInfo.baseNumber != null && numeroInfo.baseNumber <= 1373 && !hasDirectOs
      ? "provavel_avulso_numero_baixo"
      : "sem_os_avulso";
    return { classificacao, score: 0, confianca: "pendente", motifs: ["SEM_OS_CANDIDATA"] };
  }

  const scored = candidates
    .map((candidate) => scoreCandidate(row, budgetItems, candidate, candidates.length))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  const confianca = confiancaPorScore(best.score);
  const clienteClass = best.cliente.classificacao;

  let classificacao = "pendente_validacao";

  if (hasDirectOs) {
    classificacao = "com_os_confirmada";
    best.score = Math.max(best.score, 80);
  } else if (candidates.length > 1 && (!second || best.score - second.score < 15)) {
    classificacao = "os_ambigua";
  } else if (clienteClass === "cliente_divergente" && numeroInfo.base === best.candidate.numero) {
    classificacao = "os_ambigua";
  } else if (best.score >= 80) {
    classificacao = "com_os_confirmada";
  } else if (best.score >= 60 && ["cliente_igual", "cliente_muito_semelhante"].includes(clienteClass)) {
    classificacao = "possivel_os_por_numero_cliente";
  } else if (best.score >= 60) {
    classificacao = "possivel_os_por_numero";
  } else if (best.score >= 40) {
    classificacao = "os_sugerida_baixa_confianca";
  } else if (numeroInfo.baseNumber != null && numeroInfo.baseNumber <= 1373) {
    classificacao = "provavel_avulso_numero_baixo";
  }

  return {
    classificacao,
    score: best.score,
    confianca: confiancaPorScore(best.score),
    candidate: best.candidate,
    cliente: best.cliente,
    dateDiff: best.dateDiff,
    motifs: best.motifs,
  };
}

function splitValidationReasons(reasons) {
  const avisos = [];
  const bloqueantes = [];

  for (const reason of reasons) {
    if (nonBlockingReasons.has(reason)) avisos.push(reason);
    else bloqueantes.push(reason);
  }

  return { bloqueantes, avisos };
}

function normalizeComparisonStatus(row, warnings, blockingReasons) {
  if (blockingReasons.includes("ERRO_ENDPOINT_ITENS")) return "erro_endpoint_critico";
  if (warnings.includes("PDF_SEM_TEXTO_EXTRAIVEL") || warnings.includes("PDF_NAO_BAIXADO")) return "nao_aplicavel_pdf_sem_texto";
  if (warnings.includes("DIVERGENCIA_ITENS_ENDPOINT_PDF") || warnings.includes("DIVERGENCIA_TOTAL_ENDPOINT_PDF")) return "aviso_pdf_divergente";
  if (row.status_comparacao_pdf_endpoint) return "ok_pdf_endpoint";
  return null;
}

function validationStatus(blockingReasons, warningReasons, row, ignoredByPolicy, historicalByPolicy) {
  if (ignoredByPolicy) return "ignorar";
  if (blockingReasons.includes("ERRO_LEITURA")) return "erro_leitura";
  if (blockingReasons.includes("SEM_CLIENTE")) return "pendente_empresa";
  if (blockingReasons.includes("DIVERGENCIA_VALOR")) return "pendente_valor";
  if (
    blockingReasons.includes("SEM_ITENS_RETORNADOS") ||
    blockingReasons.includes("ERRO_ENDPOINT_ITENS") ||
    blockingReasons.includes("TIPO_MISTO_ENDPOINT_INCOMPLETO") ||
    blockingReasons.includes("ENDPOINT_ITENS_NAO_TENTADO")
  ) {
    return "pendente_itens";
  }
  if (["possivel_os_por_numero_cliente", "possivel_os_por_numero", "os_sugerida_baixa_confianca", "os_ambigua", "pendente_validacao"].includes(row.classificacao_vinculo_os)) return "pendente_os";
  if (blockingReasons.includes("NUMERO_REPETIDO")) return "duplicidade_suspeita";
  if (historicalByPolicy) return "historico_consulta";
  if (warningReasons.length) {
    return "ok_para_importar_com_detalhes_parciais";
  }
  return "ok_para_importar";
}

async function main() {
  await ensureOutputDir();

  await logMigration(supabase, {
    entidade: "orcamentos_validacao",
    status: "inicio",
    mensagem: "Inicio validacao staging orcamentos ArkMeds",
  });

  const [headers, items, osRows, empresas, equipamentos] = await Promise.all([
    supabaseAll(
      supabase,
      "staging_arkmeds_orcamentos",
      "id,arkmeds_orcamento_id,arkmeds_orcamento_numero,arkmeds_orcamento_numero_original,arkmeds_orcamento_numero_base,arkmeds_orcamento_sufixo,possui_sufixo_correcao,arkmeds_tipo_texto,arkmeds_status_grupo,arkmeds_status_label,arkmeds_status_original,status_normalizado_importacao,politica_importacao_status,arkmeds_valor_total,arkmeds_solicitante,arkmeds_data_criacao,arkmeds_data_validade,arkmeds_ordem_servico_id,arkmeds_ordem_servico_numero,arkmeds_has_attachment,arkmeds_already_generate_os,classificacao_vinculo_os,identificador_migracao,itens_servicos_status,itens_pecas_status,itens_servicos_quantidade,itens_pecas_quantidade,itens_ultima_coleta_quantidade,itens_ultima_coleta_status,erro_itens_endpoint,status_preservacao_itens,tipo_misto_completo,tem_itens_preservados,tem_detalhes_tecnicos,status_extracao_detalhes,status_comparacao_pdf_endpoint,motivos_comparacao_pdf_endpoint,pdf_original_url,valor_total_pdf,qtd_servicos_endpoint,qtd_pecas_endpoint,qtd_servicos_pdf,qtd_pecas_pdf",
      (query) => query.order("arkmeds_orcamento_id", { ascending: true })
    ),
    supabaseAll(
      supabase,
      "staging_arkmeds_orcamento_itens",
      "arkmeds_orcamento_id,tipo_item,descricao,observacoes,peca_tipo_descricao,valor_total_calculado",
      (query) => query.order("arkmeds_orcamento_id", { ascending: true })
    ),
    supabaseAll(
      supabase,
      "ordens_servico",
      "id,numero,numero_ordem,empresa_id,equipamento_id,data_abertura,created_at,problema_relatado,descricao_servico,observacoes",
      (query) => query.not("numero", "is", null)
    ),
    supabaseAll(supabase, "empresas", "id,nome,nome_fantasia"),
    supabaseAll(supabase, "equipamentos", "id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,tag"),
  ]);

  const empresasById = new Map(empresas.map((row) => [row.id, row]));
  const equipamentosById = new Map(equipamentos.map((row) => [row.id, row]));
  const osByNumber = buildOsCandidateIndexes(osRows, empresasById, equipamentosById);

  const numberCounts = new Map();
  for (const row of headers) {
    const key = normalizeNumberKey(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
    if (!key) continue;
    numberCounts.set(key, (numberCounts.get(key) || 0) + 1);
  }

  const itemsByBudget = new Map();
  for (const item of items) {
    const key = item.arkmeds_orcamento_id;
    if (!itemsByBudget.has(key)) itemsByBudget.set(key, []);
    itemsByBudget.get(key).push(item);
  }

  const updates = [];

  for (const row of headers) {
    const numeroInfo = normalizarNumeroBaseOrcamento(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
    const candidates = numeroInfo.base ? osByNumber.get(numeroInfo.base) || [] : [];
    const budgetItems = itemsByBudget.get(row.arkmeds_orcamento_id) || [];
    const assoc = classifyAssociation(row, budgetItems, candidates);
    const ignoredByPolicy = shouldIgnoreByPolicy(row.arkmeds_status_grupo);
    const historicalByPolicy = shouldImportAsHistory(row.arkmeds_status_grupo);

    const reasons = [];
    const somaItens = rounded(budgetItems.reduce((sum, item) => sum + Number(item.valor_total_calculado || 0), 0));
    const valorTotal = rounded(row.arkmeds_valor_total);
    const diferenca = rounded(valorTotal - somaItens);
    const numeroOriginal = cleanText(numeroInfo.original);
    const osNumero = cleanText(row.arkmeds_ordem_servico_numero);

    if (!cleanText(row.arkmeds_solicitante)) reasons.push("SEM_CLIENTE");
    if (!numeroOriginal) reasons.push("SEM_NUMERO");
    if (!row.arkmeds_data_criacao) reasons.push("SEM_DATA");
    if (!row.arkmeds_data_validade) reasons.push("SEM_VALIDADE");
    if (valorTotal === 0) reasons.push("VALOR_ZERO");
    if (symbolicValues.has(valorTotal.toFixed(2))) reasons.push("VALOR_SIMBOLICO");
    if (row.erro_itens_endpoint) reasons.push("ERRO_ENDPOINT_ITENS");
    if (row.status_preservacao_itens === "endpoint_nao_tentado") reasons.push("ENDPOINT_ITENS_NAO_TENTADO");
    if (row.status_preservacao_itens === "tipo_misto_incompleto" || row.tipo_misto_completo === false) reasons.push("TIPO_MISTO_ENDPOINT_INCOMPLETO");
    if (row.status_preservacao_itens === "erro_endpoint_itens") reasons.push("ERRO_ENDPOINT_ITENS");
    if (!budgetItems.length && !ignoredByPolicy) reasons.push("SEM_ITENS_RETORNADOS");
    if (!budgetItems.length && ignoredByPolicy) reasons.push("ORCAMENTO_REALMENTE_SEM_ITENS");
    if (budgetItems.length && Math.abs(diferenca) > 0.05) reasons.push("DIVERGENCIA_VALOR");
    if (!row.pdf_original_url && !ignoredByPolicy) reasons.push("PDF_INDISPONIVEL");
    if (row.status_extracao_detalhes === "sem_texto") reasons.push("PDF_SEM_TEXTO_EXTRAIVEL");
    if (row.status_extracao_detalhes === "erro") reasons.push("PDF_NAO_BAIXADO");
    if (row.status_extracao_detalhes && row.status_extracao_detalhes !== "extraido") reasons.push("DETALHES_TECNICOS_PARCIAIS");
    for (const reason of row.motivos_comparacao_pdf_endpoint || []) reasons.push(reason);
    if (numeroOriginal && (numberCounts.get(numeroOriginal) || 0) > 1) reasons.push("NUMERO_REPETIDO");
    if (numeroOriginal && osNumero && numeroOriginal === osNumero) reasons.push("NUMERO_IGUAL_OS");
    if (["possivel_os_por_numero_cliente", "possivel_os_por_numero", "os_sugerida_baixa_confianca"].includes(assoc.classificacao)) reasons.push("POSSIVEL_OS_POR_NUMERO");
    if (assoc.classificacao === "os_ambigua") reasons.push("OS_AMBIGUA");
    if (assoc.classificacao === "provavel_avulso_numero_baixo") reasons.push("PROVAVEL_AVULSO_NUMERO_BAIXO");
    if (hasMixedType(row.arkmeds_tipo_texto)) {
      const hasService = budgetItems.some((item) => item.tipo_item === "servico");
      const hasPart = budgetItems.some((item) => item.tipo_item === "peca");
      if (!hasService || !hasPart) reasons.push("TIPO_MISTO_ENDPOINT_INCOMPLETO");
    }
    if (row.arkmeds_has_attachment) reasons.push("COM_ANEXO");
    if (row.arkmeds_already_generate_os) reasons.push("JA_GEROU_OS");

    const statusReason = statusGroupReason(row.arkmeds_status_grupo);
    if (statusReason) reasons.push(statusReason);

    const uniqueReasons = [...new Set(reasons)];
    const { bloqueantes, avisos } = splitValidationReasons(uniqueReasons);
    const statusValidacao = validationStatus(
      bloqueantes,
      avisos,
      { ...row, classificacao_vinculo_os: assoc.classificacao },
      ignoredByPolicy,
      historicalByPolicy
    );
    const recomendacao = recomendacaoPorClassificacao(assoc.classificacao, statusValidacao);
    const statusComparacao = normalizeComparisonStatus(row, avisos, bloqueantes);

    updates.push({
      id: row.id,
      arkmeds_orcamento_numero_original: numeroInfo.original,
      arkmeds_orcamento_numero_base: numeroInfo.base,
      arkmeds_orcamento_sufixo: numeroInfo.sufixo,
      possui_sufixo_correcao: numeroInfo.possuiSufixo,
      status_normalizado_importacao: row.status_normalizado_importacao || normalizeArkmedsStatusGroup(row.arkmeds_status_grupo),
      politica_importacao_status: row.politica_importacao_status || statusImportPolicy(row.arkmeds_status_grupo),
      soma_itens: somaItens,
      diferenca_valor: diferenca,
      motivos_validacao: uniqueReasons,
      motivos_bloqueantes: bloqueantes,
      avisos_validacao: avisos,
      status_validacao: statusValidacao,
      status_comparacao_pdf_endpoint: statusComparacao,
      classificacao_vinculo_os: assoc.classificacao,
      ordem_servico_id_resolvida: assoc.candidate?.id || null,
      os_candidata_id: assoc.candidate?.id || null,
      os_candidata_numero: assoc.candidate?.numero || null,
      cliente_os_candidato: assoc.candidate?.cliente_nome || null,
      data_os_candidata: assoc.candidate?.data_abertura || assoc.candidate?.created_at || null,
      score_cliente: assoc.cliente?.score ?? null,
      classificacao_cliente: assoc.cliente?.classificacao || null,
      score_os: assoc.score ?? null,
      confianca_os: assoc.confianca || null,
      motivos_associacao_os: assoc.motifs || [],
      recomendacao_migracao: recomendacao,
    });
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("staging_arkmeds_orcamentos")
      .update(update)
      .eq("id", update.id);

    if (error) throw new Error(`Erro ao atualizar validacao ${update.id}: ${error.message}`);
  }

  const byStatus = updates.reduce((acc, row) => {
    acc[row.status_validacao] = (acc[row.status_validacao] || 0) + 1;
    return acc;
  }, {});

  const byReason = updates.reduce((acc, row) => {
    for (const reason of row.motivos_validacao || []) {
      acc[reason] = (acc[reason] || 0) + 1;
    }
    return acc;
  }, {});

  const byAssociation = updates.reduce((acc, row) => {
    acc[row.classificacao_vinculo_os] = (acc[row.classificacao_vinculo_os] || 0) + 1;
    return acc;
  }, {});

  const result = {
    dry_run: true,
    totalHeaders: headers.length,
    totalItems: items.length,
    byStatus,
    byReason,
    byAssociation,
    finishedAt: new Date().toISOString(),
  };

  await fs.writeFile(path.join(outputDir, "validacao_resultado.json"), JSON.stringify(result, null, 2), "utf-8");

  await logMigration(supabase, {
    entidade: "orcamentos_validacao",
    status: "fim",
    mensagem: "Fim validacao staging orcamentos ArkMeds",
    payload_json: result,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await logMigration(supabase, {
      entidade: "orcamentos_validacao",
      status: "erro",
      mensagem: error.message,
    });
  } catch {
    // ignore logging failure
  }
  process.exit(1);
});

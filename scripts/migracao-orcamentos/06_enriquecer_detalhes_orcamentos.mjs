import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  cleanText,
  ensureOutputDir,
  extractArkmedsMoreInformation,
  extractEquipmentFromText,
  extractFirstMatch,
  fetchArkmedsText,
  inferOrcamentoEditPath,
  isMixedBudget,
  logMigration,
  outputDir,
  parseArkmedsInteger,
  parseArkmedsNumber,
  readIntegerIdsFile,
  requireSupabase,
  stripHtml,
  supabaseAll,
} from "./lib.mjs";

const supabase = requireSupabase();
const maxArg = process.argv.find((arg) => arg.startsWith("--max="));
const maxRows = maxArg ? Number.parseInt(maxArg.split("=")[1], 10) : null;
const idsFileArg = process.argv.find((arg) => arg.startsWith("--ids-file="));
const idsFile = idsFileArg ? path.resolve(idsFileArg.slice("--ids-file=".length)) : null;

function rounded(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function textAfterLabel(text, labels, maxLength = 220) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:${labelPattern})\\s*:?\\s*([^\\n\\r|]{1,${maxLength}})`, "i");
  const match = text.match(pattern);
  return match?.[1] ? cleanText(match[1]) : null;
}

function countOccurrences(text, patterns) {
  let total = 0;
  for (const pattern of patterns) {
    total += [...text.matchAll(pattern)].length;
  }
  return total;
}

function decodeJsString(value) {
  return String(value ?? "")
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseJsLiteral(expression) {
  const source = String(expression ?? "").trim();
  const quoted = source.match(/^(['"])([\s\S]*)\1$/);
  if (quoted) return decodeJsString(quoted[2]);
  if (/^(?:null|none)$/i.test(source)) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(source)) return Number(source);
  return undefined;
}

function lastJsInputValue(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\$\\(["']#${escapedId}["']\\)\\.val\\(([^;)]*)\\)`, "g");
  let selected;
  for (const match of html.matchAll(pattern)) {
    const value = parseJsLiteral(match[1]);
    if (value !== undefined) selected = value;
  }
  return selected;
}

function lastSelect2Value(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\$\\(["']#${escapedId}["']\\)\\.select2\\(["']val["']\\s*,\\s*([^;)]+)\\)`,
    "g",
  );
  let selected;
  for (const match of html.matchAll(pattern)) {
    const value = parseJsLiteral(match[1]);
    if (value !== undefined) selected = value;
  }
  return selected;
}

function selectOptionText(document, id, value) {
  if (value == null) return null;
  const select = document.getElementById(id);
  const option = [...(select?.querySelectorAll("option") || [])]
    .find((item) => String(item.value) === String(value));
  return cleanText(option?.textContent) || null;
}

function structuredEditDetails(html) {
  if (!html) return {};
  const document = new JSDOM(html).window.document;
  const informacoes = extractArkmedsMoreInformation(html);
  const equipmentLine = informacoes?.match(/(?:^|\n)\s*(?:equipamento|instrumento)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const equipamentoTexto = equipmentLine && !/^proposta\b/i.test(equipmentLine)
    ? equipmentLine
    : null;
  const formaPagamentoId = lastSelect2Value(html, "forma_pagamento");
  const modoPagamentoMatch = html.match(/var\s+modo_pagamento\s*=\s*(\d+)\s*;/);
  const modoPagamentoId = modoPagamentoMatch ? Number(modoPagamentoMatch[1]) : null;
  const freteMatch = [...html.matchAll(/var\s+frete\s*=\s*([^;]+);/g)].at(-1);
  const freteValue = freteMatch ? parseJsLiteral(freteMatch[1]) : undefined;
  const responsavelMatch = html.match(
    /selected=["']selected["']>'\+"([^"]+)"\+'<\/option>/i,
  );

  return {
    informacoes_tecnicas: null,
    descricao_equipamento: equipamentoTexto,
    equipamento_texto: equipamentoTexto,
    fabricante: null,
    modelo: null,
    numero_serie: null,
    patrimonio: null,
    observacoes_gerais: informacoes || null,
    prazo_entrega: lastJsInputValue(html, "prazo_entrega") ?? null,
    validade_dias: lastJsInputValue(html, "validade") ?? null,
    frete: freteValue == null ? null : cleanText(freteValue),
    forma_pagamento: selectOptionText(document, "forma_pagamento", formaPagamentoId),
    modo_pagamento: selectOptionText(document, "pagamento", modoPagamentoId),
    responsavel_orcamentista: cleanText(responsavelMatch?.[1]) || null,
    data_criacao_formulario: lastJsInputValue(html, "data_criacao") ?? null,
    numero_formulario: lastJsInputValue(html, "numero") ?? null,
  };
}

function extractTotal(text) {
  const totalByLabel = extractFirstMatch(text, [
    /(?:valor\s+total\s+do\s+orcamento|total\s+do\s+orcamento|valor\s+total|total)\s*:?\s*(R?\$?\s*[\d.,]+)/i,
  ]);
  if (totalByLabel) return parseArkmedsNumber(totalByLabel);

  const values = [...text.matchAll(/R?\$?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|R?\$?\s*\d+(?:\.\d{2})/g)]
    .map((match) => parseArkmedsNumber(match[0]))
    .filter((value) => value != null);
  return values.length ? values.at(-1) : null;
}

function extractDetailsFromText(text, editHtml = "") {
  const source = cleanText(text);
  const structured = structuredEditDetails(editHtml);
  const equipmentInfo = source ? extractEquipmentFromText(source) : {};
  const formaPagamento = textAfterLabel(source, ["Forma de pagamento", "Pagamento"]);
  const modoPagamento = textAfterLabel(source, ["Modo de pagamento", "Condicao de pagamento", "Condicoes de pagamento"]);
  const prazoEntrega = textAfterLabel(source, ["Prazo de entrega", "Prazo"]);
  const frete = textAfterLabel(source, ["Frete"]);
  const responsavel = textAfterLabel(source, ["Responsavel orcamentista", "Orcamentista", "Vendedor", "Responsavel"]);
  const observacoes = textAfterLabel(source, ["Observacoes gerais", "Observacoes", "Obs"], 600);
  const validadeText = textAfterLabel(source, ["Validade da proposta", "Validade"], 80);
  const validadeDias = validadeText ? parseArkmedsInteger(validadeText) : null;
  const estado = extractFirstMatch(source, [
    /\b(Aprovado|Reprovado|Cancelado|Pendente|Faturado|Recusado|Emitido)\b/i,
  ]);

  const fallback = {
    ...equipmentInfo,
    observacoes_gerais: observacoes,
    prazo_entrega: prazoEntrega,
    validade_dias: validadeDias,
    frete,
    forma_pagamento: formaPagamento,
    modo_pagamento: modoPagamento,
    responsavel_orcamentista: responsavel,
    estado_orcamento_pdf: estado,
    valor_total_pdf: extractTotal(source),
    qtd_servicos_pdf: countOccurrences(source, [/servi[c\u00e7]o\s*:/gi, /\bservi[c\u00e7]os\b/gi]),
    qtd_pecas_pdf: countOccurrences(source, [/pe[c\u00e7]a\s*:/gi, /\bpe[c\u00e7]as\b/gi]),
  };
  const merged = { ...fallback, ...structured };
  for (const key of [
    "informacoes_tecnicas", "descricao_equipamento", "equipamento_texto",
    "fabricante", "modelo", "numero_serie", "patrimonio",
  ]) {
    if (!(key in merged)) merged[key] = null;
  }
  return merged;
}

function compareDetails(staging, details, pdfStatus) {
  const reasons = [];
  const valorCabecalho = rounded(staging.arkmeds_valor_total);
  const somaItens = rounded(staging.soma_itens);
  const valorPdf = details.valor_total_pdf == null ? null : rounded(details.valor_total_pdf);

  if (pdfStatus === "pdf_binary") reasons.push("PDF_SEM_TEXTO_EXTRAIVEL");
  if (pdfStatus === "pdf_error") reasons.push("PDF_NAO_BAIXADO");
  if (!staging.pdf_original_url) reasons.push("PDF_INDISPONIVEL");
  if (valorPdf != null && Math.abs(valorCabecalho - valorPdf) > 0.05) reasons.push("DIVERGENCIA_TOTAL_ENDPOINT_PDF");
  if (somaItens > 0 && valorPdf != null && Math.abs(somaItens - valorPdf) > 0.05) reasons.push("DIVERGENCIA_TOTAL_ENDPOINT_PDF");

  const qtdServicosEndpoint = staging.qtd_servicos_endpoint ?? staging.itens_servicos_quantidade ?? 0;
  const qtdPecasEndpoint = staging.qtd_pecas_endpoint ?? staging.itens_pecas_quantidade ?? 0;

  if (details.qtd_servicos_pdf > 0 && qtdServicosEndpoint > 0 && details.qtd_servicos_pdf !== qtdServicosEndpoint) {
    reasons.push("DIVERGENCIA_ITENS_ENDPOINT_PDF");
  }
  if (details.qtd_pecas_pdf > 0 && qtdPecasEndpoint > 0 && details.qtd_pecas_pdf !== qtdPecasEndpoint) {
    reasons.push("DIVERGENCIA_ITENS_ENDPOINT_PDF");
  }

  const uniqueReasons = [...new Set(reasons)];
  let status = "ok_pdf_endpoint";
  if (uniqueReasons.includes("ERRO_ENDPOINT_ITENS")) status = "erro_endpoint_critico";
  else if (uniqueReasons.includes("DIVERGENCIA_TOTAL_ENDPOINT_PDF") || uniqueReasons.includes("DIVERGENCIA_ITENS_ENDPOINT_PDF")) status = "aviso_pdf_divergente";
  else if (uniqueReasons.includes("PDF_SEM_TEXTO_EXTRAIVEL") || uniqueReasons.includes("PDF_NAO_BAIXADO")) status = "nao_aplicavel_pdf_sem_texto";

  return { status, reasons: uniqueReasons };
}

async function fetchBudgetTexts(staging) {
  const printPath = `/orcamento/${staging.arkmeds_orcamento_id}/imprimir/`;
  const editPath = inferOrcamentoEditPath(staging.arkmeds_tipo_texto, staging.arkmeds_orcamento_id);
  let pdfStatus = "nao_tentado";
  let printText = "";
  let editText = "";
  let printMeta = null;
  let editMeta = null;

  try {
    printMeta = await fetchArkmedsText(printPath);
    pdfStatus = printMeta.isPdf ? "pdf_binary" : "ok";
    printText = printMeta.isPdf ? "" : stripHtml(printMeta.text);
  } catch (error) {
    pdfStatus = "pdf_error";
    printMeta = { error: error.message, pathname: printPath };
  }

  try {
    editMeta = await fetchArkmedsText(editPath);
    editText = editMeta.isPdf ? "" : stripHtml(editMeta.text);
  } catch (error) {
    editMeta = { error: error.message, pathname: editPath };
  }

  return {
    pdfStatus,
    printMeta,
    editMeta,
    editHtml: editMeta?.text || "",
    text: cleanText(printText),
  };
}

async function updateDetails(staging, payload) {
  const { error } = await supabase
    .from("staging_arkmeds_orcamentos")
    .update(payload)
    .eq("id", staging.id);

  if (error) throw new Error(`Erro ao atualizar detalhes ${staging.arkmeds_orcamento_id}: ${error.message}`);
}

async function main() {
  await ensureOutputDir();
  const selectedIds = idsFile ? new Set(await readIntegerIdsFile(idsFile)) : null;

  await logMigration(supabase, {
    entidade: "orcamentos_detalhes",
    status: "inicio",
    mensagem: "Inicio enriquecimento de detalhes de orcamentos ArkMeds",
    payload_json: { maxRows, idsFile, selectedIds: selectedIds?.size || null },
  });

  let rows = await supabaseAll(
    supabase,
    "staging_arkmeds_orcamentos",
    [
      "id",
      "arkmeds_orcamento_id",
      "arkmeds_orcamento_numero",
      "arkmeds_tipo_texto",
      "arkmeds_valor_total",
      "soma_itens",
      "pdf_original_url",
      "itens_servicos_quantidade",
      "itens_pecas_quantidade",
      "qtd_servicos_endpoint",
      "qtd_pecas_endpoint",
      "tipo_misto_completo",
    ].join(","),
    (query) => query.order("arkmeds_orcamento_id", { ascending: true })
  );

  if (selectedIds) {
    rows = rows.filter((row) => selectedIds.has(Number(row.arkmeds_orcamento_id)));
  }

  if (maxRows != null) rows = rows.slice(0, maxRows);

  let processed = 0;
  let extracted = 0;
  let partial = 0;
  let errors = 0;
  const samples = [];

  for (const staging of rows) {
    try {
      const fetched = await fetchBudgetTexts(staging);
      const details = extractDetailsFromText(fetched.text, fetched.editHtml);
      const hasText = Boolean(fetched.text || fetched.editHtml);
      const hasTechnical =
        Boolean(details.informacoes_tecnicas || details.equipamento_texto || details.modelo || details.numero_serie || details.patrimonio);
      const statusExtracao = !hasText ? "sem_texto" : hasTechnical ? "extraido" : "parcial";
      const comparison = compareDetails(staging, details, fetched.pdfStatus);
      const payload = {
        informacoes_tecnicas: details.informacoes_tecnicas,
        descricao_equipamento: details.descricao_equipamento,
        equipamento_texto: details.equipamento_texto,
        fabricante: details.fabricante,
        modelo: details.modelo,
        numero_serie: details.numero_serie,
        patrimonio: details.patrimonio,
        observacoes_gerais: details.observacoes_gerais,
        prazo_entrega: details.prazo_entrega,
        validade_dias: details.validade_dias,
        frete: details.frete,
        forma_pagamento: details.forma_pagamento,
        modo_pagamento: details.modo_pagamento,
        responsavel_orcamentista: details.responsavel_orcamentista,
        estado_orcamento_pdf: details.estado_orcamento_pdf,
        valor_total_pdf: details.valor_total_pdf,
        qtd_servicos_pdf: details.qtd_servicos_pdf,
        qtd_pecas_pdf: details.qtd_pecas_pdf,
        pdf_original_url: staging.pdf_original_url || fetched.printMeta?.url || null,
        pdf_texto_extraido: fetched.text || null,
        detalhes_extraidos_json: {
          print: fetched.printMeta,
          edit: fetched.editMeta ? {
            url: fetched.editMeta.url,
            pathname: fetched.editMeta.pathname,
            status: fetched.editMeta.status,
            contentType: fetched.editMeta.contentType,
          } : null,
          mixedBudget: isMixedBudget(staging.arkmeds_tipo_texto),
          details,
        },
        status_extracao_detalhes: statusExtracao,
        status_comparacao_pdf_endpoint: comparison.status,
        motivos_comparacao_pdf_endpoint: comparison.reasons,
        tem_detalhes_tecnicos: hasTechnical,
        detalhes_atualizado_em: new Date().toISOString(),
      };

      await updateDetails(staging, payload);
      processed += 1;
      if (statusExtracao === "extraido") extracted += 1;
      else partial += 1;
      if (samples.length < 10) {
        samples.push({
          arkmeds_orcamento_id: staging.arkmeds_orcamento_id,
          statusExtracao,
          statusComparacao: comparison.status,
          motivos: comparison.reasons,
          equipamento: details.equipamento_texto,
        });
      }
    } catch (error) {
      errors += 1;
      await updateDetails(staging, {
        status_extracao_detalhes: "erro",
        status_comparacao_pdf_endpoint: "erro",
        motivos_comparacao_pdf_endpoint: [error.message],
        detalhes_extraidos_json: { error: error.message },
        detalhes_atualizado_em: new Date().toISOString(),
      });
      await logMigration(supabase, {
        entidade: "orcamentos_detalhes",
        arkmeds_id: staging.arkmeds_orcamento_id,
        status: "erro_detalhes",
        mensagem: error.message,
      });
    }

    if ((processed + errors) % 100 === 0) {
      console.log(`Detalhes: ${processed + errors}/${rows.length}`);
    }
  }

  const result = {
    dry_run: true,
    idsFile,
    selectedIds: selectedIds?.size || null,
    processed,
    extracted,
    partial,
    errors,
    samples,
    finishedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(outputDir, "enriquecimento_detalhes_resultado.json"),
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  await logMigration(supabase, {
    entidade: "orcamentos_detalhes",
    status: "fim",
    mensagem: "Fim enriquecimento de detalhes de orcamentos ArkMeds",
    payload_json: result,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await logMigration(supabase, {
      entidade: "orcamentos_detalhes",
      status: "erro",
      mensagem: error.message,
    });
  } catch {
    // ignore logging failure
  }
  process.exit(1);
});

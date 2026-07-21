import {
  cleanText,
  normalizeArkmedsStatusGroup,
  normalizeKindText,
  parseArkmedsNumber,
  statusImportPolicy,
} from "./lib.mjs";
import { parseSpreadsheetServiceEntries } from "./regras_orcamentos.mjs";

const PENDING_PREFIX = "Pendente de revisão da migração ArkMeds:";

function cleanMultilineText(value) {
  const text = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text || text === "-" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return null;
  }
  return text;
}

export function spreadsheetData(row) {
  return row?.dados_planilha_json && typeof row.dados_planilha_json === "object"
    ? row.dados_planilha_json
    : {};
}

export function spreadsheetText(row, key, ...fallbacks) {
  const sheet = spreadsheetData(row);
  return [sheet[key], ...fallbacks].map(cleanText).find(Boolean) || null;
}

const SPREADSHEET_STATUS_MAP = {
  aprovado: { normalized: "aprovado_em_curso", destination: "aprovado", policy: "importar_operacional" },
  cancelado: { normalized: "cancelado", destination: "cancelado", policy: "importar_historico" },
  faturado: { normalized: "faturado", destination: "faturado", policy: "importar_operacional" },
  pendente: { normalized: "pendente", destination: "pendente", policy: "importar_operacional" },
  reprovado: { normalized: "reprovado_em_curso", destination: "reprovado", policy: "importar_historico" },
};

const LIVE_STATUS_DESTINATION = {
  pendente: "pendente",
  aprovado_em_curso: "aprovado",
  reprovado_em_curso: "reprovado",
  faturado: "faturado",
  cancelado: "cancelado",
  recusado_ignorado: "reprovado",
};

export function currentArkmedsStatus(row) {
  const group = cleanText(row?.arkmeds_status_grupo);
  if (!group) return null;
  const normalized = normalizeArkmedsStatusGroup(group);
  return {
    raw: cleanText(row.arkmeds_status_original || row.arkmeds_status_label || group),
    normalized,
    destination: LIVE_STATUS_DESTINATION[normalized] || null,
    policy: statusImportPolicy(group),
  };
}

export function spreadsheetStatus(row) {
  const raw = spreadsheetText(row, "etapa_atual", row.arkmeds_status_planilha);
  const mapped = SPREADSHEET_STATUS_MAP[normalizeKindText(raw)] || null;
  return { raw, ...mapped };
}

export function effectiveNormalizedStatus(row) {
  return currentArkmedsStatus(row)?.normalized
    || spreadsheetStatus(row).normalized
    || cleanText(row.status_normalizado_importacao)
    || null;
}

export function effectiveStatusPolicy(row) {
  return currentArkmedsStatus(row)?.policy
    || spreadsheetStatus(row).policy
    || cleanText(row.politica_importacao_status)
    || null;
}

export function destinationStatus(row) {
  const status = currentArkmedsStatus(row)?.destination || spreadsheetStatus(row).destination;
  if (status) return status;

  const normalized = effectiveNormalizedStatus(row);
  if (normalized === "aprovado_em_curso") return "aprovado";
  if (normalized === "cancelado") return "cancelado";
  if (normalized === "faturado") return "faturado";
  if (normalized === "pendente") return "pendente";
  if (normalized === "reprovado_em_curso") return "reprovado";
  if (normalized === "recusado_ignorado") return "reprovado";
  return null;
}

export function normalizeMoney(value) {
  const parsed = parseArkmedsNumber(value);
  return parsed == null ? 0 : Number(parsed.toFixed(2));
}

export function buildCatalogIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const key = normalizeKindText(row.nome);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }
  return index;
}

export function resolveCatalogItem(index, name) {
  const matches = index.get(normalizeKindText(name)) || [];
  return matches.length === 1 ? matches[0] : null;
}

export function matchSpreadsheetServices(items, row) {
  const entries = parseSpreadsheetServiceEntries(spreadsheetData(row).servicos);
  const available = entries.map((entry, index) => ({ ...entry, index, used: false }));

  return items.map((item) => {
    const value = normalizeMoney(item.valor_total_calculado ?? item.valor_total);
    const sameValue = available.filter(
      (entry) => !entry.used && Math.abs(normalizeMoney(entry.value) - value) <= 0.01
    );
    const descriptionKey = normalizeKindText(item.descricao);
    const byDescription = sameValue.find((entry) => {
      const equipmentKey = normalizeKindText(entry.equipment);
      return equipmentKey && descriptionKey && (
        descriptionKey.includes(equipmentKey) || equipmentKey.includes(descriptionKey)
      );
    });
    const selected = byDescription || sameValue[0] || available.find((entry) => !entry.used) || null;
    if (selected) selected.used = true;
    return selected;
  });
}

export function formatDeliveryDeadline(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (/^\d+$/.test(text)) return `${text} dias`;
  return text;
}

export function mapSpreadsheetFreight(value) {
  const key = normalizeKindText(value);
  if (key.includes("cif")) return "cif";
  if (key.includes("fob")) return "fob";
  return null;
}

export function mapSpreadsheetPaymentForm(value) {
  const key = normalizeKindText(value);
  if (key.includes("pix")) return "pix";
  if (key.includes("boleto")) return "boleto";
  if (key.includes("cartao") || key.includes("credito") || key.includes("debito")) return "cartao";
  if (key.includes("dinheiro")) return "dinheiro";
  return null;
}

export function mapSpreadsheetPaymentMode(value) {
  const key = normalizeKindText(value);
  if (!key || key === "outros" || key === "outro") return null;
  if (key.includes("entrada")) return "entrada_parcela";
  if (key.includes("parcel")) return "parcelado";
  if (key.includes("vista")) return "avista";
  return null;
}

export function parseSpreadsheetPayment(row) {
  const sheet = spreadsheetData(row);
  const paymentFormText = cleanText(sheet.forma_de_pagamento);
  const paymentModeText = cleanText(sheet.modo_de_pagamento);
  const relevantMode = normalizeKindText(paymentModeText) === "outros" ? null : paymentModeText;
  const sourceText = [paymentFormText, relevantMode].filter(Boolean).join(" - ") || null;
  const combined = [paymentFormText, paymentModeText].filter(Boolean).join(" ");

  const installmentsMatch = combined.match(/(?:em\s+)?(\d+)\s*(?:x|parcelas?)/i);
  const intervalMatch = combined.match(/(?:a\s+cada|cada)\s+(\d+)\s+dias?/i);
  const entryMatch = combined.match(/entrada[^0-9]*([\d.,]+)/i);

  return {
    paymentForm: mapSpreadsheetPaymentForm(paymentFormText),
    paymentMode: mapSpreadsheetPaymentMode(paymentModeText),
    installments: installmentsMatch ? Number(installmentsMatch[1]) : null,
    installmentIntervalDays: intervalMatch ? Number(intervalMatch[1]) : null,
    entryValue: entryMatch ? normalizeMoney(entryMatch[1]) : null,
    sourceText,
  };
}

export function cleanSpreadsheetObservations(row) {
  const sheet = spreadsheetData(row);
  return cleanMultilineText(sheet.observacoes) || cleanMultilineText(row.arkmeds_observacoes_planilha);
}

export function preservePendingNotes(currentObservations, cleanObservations) {
  const pending = String(currentObservations ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith(PENDING_PREFIX));
  return [cleanMultilineText(cleanObservations), ...pending].filter(Boolean).join("\n\n") || null;
}

function additionalCostKindFromItem(item) {
  const description = normalizeKindText(item?.descricao);
  if (!description) return null;
  if (description.includes("deslocamento")) return "deslocamento";
  if (description.includes("viagem")) return "viagem";
  if (description.includes("frete")) return "frete";
  return null;
}

export function classifyAdditionalCostItem(item) {
  const kind = additionalCostKindFromItem(item);
  if (kind === "deslocamento") {
    return { kind, tipo: "deslocamento", descricao: "Deslocamento" };
  }
  if (kind === "viagem") {
    return { kind, tipo: "outro", descricao: "Despesas de viagem" };
  }
  if (kind === "frete") {
    return { kind, tipo: "peca", descricao: "Frete", pecaNome: "Frete" };
  }
  return null;
}

function costAlreadyRepresented(definition, existingItems) {
  const matchingItems = existingItems.filter(
    (item) => classifyAdditionalCostItem(item)?.kind === definition.kind
  );
  if (!matchingItems.length) return false;

  const total = matchingItems.reduce(
    (sum, item) => sum + normalizeMoney(item.valor_total_calculado ?? item.valor_total),
    0
  );
  return Math.abs(total - definition.value) <= 0.05;
}

export function buildAdditionalCostDefinitions(row, existingItems = []) {
  const sheet = spreadsheetData(row);
  const displacement = normalizeMoney(sheet.valor_deslocamento ?? row.arkmeds_valor_deslocamento);
  const travel = normalizeMoney(sheet.valor_viagem ?? row.arkmeds_valor_viagem);
  const freight = normalizeMoney(sheet.valor_frete ?? row.arkmeds_valor_frete);
  const definitions = [];

  if (displacement > 0) {
    definitions.push({ kind: "deslocamento", tipo: "deslocamento", descricao: "Deslocamento", value: displacement });
  }
  if (travel > 0) {
    definitions.push({ kind: "viagem", tipo: "outro", descricao: "Despesas de viagem", value: travel });
  }
  if (freight > 0) {
    definitions.push({ kind: "frete", tipo: "peca", descricao: "Frete", value: freight, pecaNome: "Frete" });
  }
  return definitions.filter((definition) => !costAlreadyRepresented(definition, existingItems));
}

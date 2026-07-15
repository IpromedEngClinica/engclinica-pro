import { cleanText, normalizeKindText, parseArkmedsNumber } from "./lib.mjs";

const SERVICE_NAMES = new Map([
  ["mp", "Manutenção Preventiva"],
  ["preventiva", "Manutenção Preventiva"],
  ["manutencao preventiva", "Manutenção Preventiva"],
  ["mc", "Manutenção Corretiva"],
  ["corretiva", "Manutenção Corretiva"],
  ["manutencao corretiva", "Manutenção Corretiva"],
  ["cal", "Calibração"],
  ["calibracao", "Calibração"],
  ["certificacao", "Certificação"],
]);

const EQUIPMENT_NAMES = new Map([
  ["monitor", "Monitor Multiparâmetro"],
  ["monitor multiparametro", "Monitor Multiparâmetro"],
  ["bomba", "Bomba de Infusão"],
  ["bomba de infusao", "Bomba de Infusão"],
  ["pa", "Aparelho de Pressão Arterial"],
  ["aparelho de aferir pressao", "Aparelho de Pressão Arterial"],
  ["aparelhos de aferir pressao", "Aparelho de Pressão Arterial"],
  ["aparelho de pressao arterial", "Aparelho de Pressão Arterial"],
  ["dea", "Desfibrilador Externo Automático DEA"],
  ["desfibrilador externo automatico", "Desfibrilador Externo Automático DEA"],
  ["cardio", "Cardioversor"],
  ["cardioversor cmos drake modelo vivo serie 314096726", "Cardioversor"],
  ["desfibrilador externo automatico dea", "Desfibrilador Externo Automático DEA"],
  ["autoclave vertical", "Autoclave"],
  ["autoclave horizontal", "Autoclave"],
  ["tens", "TENS"],
  ["centrifuga", "Centrífuga"],
  ["microcentrifuga", "Microcentrífuga"],
  ["luximetro", "Luxímetro"],
  ["oximetro", "Oxímetro"],
  ["equipamentos de estetica", "Equipamento de Estética"],
  ["profilaxia", "Jato de Bicarbonato(Profilaxia)"],
]);

export function normalizeMigrationService(value) {
  const normalized = normalizeKindText(value);
  if (!normalized) return "";
  if (SERVICE_NAMES.has(normalized)) return SERVICE_NAMES.get(normalized);
  if (normalized.includes("prevent")) return "Manutenção Preventiva";
  if (normalized.includes("corret") || normalized.includes("reparo") || normalized.includes("conserto")) {
    return "Manutenção Corretiva";
  }
  if (normalized.includes("calibr")) return "Calibração";
  if (normalized.includes("certific")) return "Certificação";
  return cleanText(value);
}

export function normalizeMigrationEquipment(value) {
  const original = cleanText(value)
    .replace(/^em\s+/i, "")
    .replace(/\s+os\s+\d+.*$/i, "")
    .trim();
  const normalized = normalizeKindText(original);
  if (!normalized) return "";
  if (EQUIPMENT_NAMES.has(normalized)) return EQUIPMENT_NAMES.get(normalized);
  if (normalized === "equipamento" || normalized === "equipamentos") return "Equipamentos";
  return original;
}

export function parseSpreadsheetServiceEntries(value) {
  return cleanText(value)
    .split(/\s+\/\s+/)
    .map((entry) => {
      const parts = entry.split(/\s+\+\s+/).map(cleanText).filter(Boolean);
      if (!parts.length) return null;
      const possibleValue = parseArkmedsNumber(parts.at(-1));
      const hasValue = possibleValue != null && /\d/.test(parts.at(-1) || "");
      return {
        service: normalizeMigrationService(parts[0]),
        equipment: normalizeMigrationEquipment(parts.slice(1, hasValue ? -1 : undefined).join(" - ")),
        value: hasValue ? possibleValue : 0,
      };
    })
    .filter(Boolean);
}

function inferGroup(text) {
  const normalized = normalizeKindText(text);
  if (!normalized) return "";
  if (normalized.includes("odont")) return "Odontologia";
  if (normalized.includes("laborator")) return "Equipamentos Laboratoriais";
  if (normalized.includes("refriger") || normalized.includes("camara de conservacao") || normalized.includes("geladeira") || normalized.includes("freezer")) {
    return "Equipamentos de Refrigeração";
  }
  if (normalized.includes("estet")) return "Equipamentos de Estética";
  if (normalized.includes("hospitalar")) return "Equipamentos Hospitalares";
  return "";
}

function selectPredominantService(entries) {
  const totals = new Map();
  for (const entry of entries) {
    if (!entry.service) continue;
    const current = totals.get(entry.service) || { count: 0, value: 0 };
    current.count += 1;
    current.value += Number(entry.value || 0);
    totals.set(entry.service, current);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].value - a[1].value || b[1].count - a[1].count || a[0].localeCompare(b[0], "pt-BR"))[0]?.[0] || "";
}

export function getSpreadsheetOsNumber(row) {
  const raw = row?.dados_planilha_json?.ordens_de_servico;
  return cleanText(raw) || null;
}

export function buildMigrationIdentifier(row) {
  const sheet = row.dados_planilha_json || {};
  const entries = parseSpreadsheetServiceEntries(sheet.servicos);
  const observations = [sheet.observacoes, row.arkmeds_observacoes_planilha, row.observacoes_gerais]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");
  const group = inferGroup(`${sheet.servicos || ""} ${observations}`);

  let service = selectPredominantService(entries);
  if (!service && cleanText(sheet.pecas)) service = "Troca de Peças";
  if (!service) service = normalizeMigrationService(row.arkmeds_tipo_texto) || "Serviço";

  const equipments = [...new Set(entries.map((entry) => entry.equipment).filter(Boolean))];
  let equipment = "";
  if (group) equipment = group;
  else if (equipments.length === 1) equipment = equipments[0];
  else if (equipments.length > 1) equipment = "Equipamentos";
  else {
    equipment = normalizeMigrationEquipment(
      row.os_tipo_equipamento ||
      sheet.tipo_de_equipamento_extraido ||
      row.equipamento_texto ||
      row.descricao_equipamento
    );
  }

  if (!equipment && service !== "Troca de Peças") equipment = "Equipamentos";
  return [service, equipment].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function identifierNeedsReview(identifier) {
  const normalized = normalizeKindText(identifier);
  return normalized === "troca de pecas" || normalized === "servico";
}

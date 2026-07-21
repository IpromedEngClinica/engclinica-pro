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
  ["bomba a vacuo", "Bomba a Vácuo"],
  ["ultrassom e jato de bicarbonato", "Ultrassom e jato de bicarbonato"],
  ["cadeira odontologica", "Cadeira Odontológica"],
  ["consultorio odontologico", "Consultório Odontológico"],
  ["eletrocardiografo", "Eletrocardiógrafo"],
  ["rede de oxigenio", "Rede de Oxigênio"],
  ["espectrofotometro", "Espectrofotômetro"],
  ["secadora de traqueias", "Secadora de Traqueias"],
  ["resistencias", "Resistências"],
  ["detector fetal", "Detector Fetal"],
]);

const OS_NUMBER_OVERRIDES_BY_ARKMEDS_ID = new Map([
  [4604, "55549"],
  [4609, "56369"],
  [4636, "56366"],
]);

const IDENTIFIER_OVERRIDES_BY_ARKMEDS_ID = new Map([
  [3081, "Peças Sugador"],
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

export function budgetBaseNumber(row) {
  const candidates = [
    row?.arkmeds_orcamento_numero_base,
    row?.arkmeds_orcamento_numero_original,
    row?.arkmeds_orcamento_numero,
    row?.numero,
  ];

  for (const candidate of candidates) {
    const text = cleanText(candidate);
    if (!text) continue;
    const match = text.match(/^(\d+)/);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  return null;
}

export function isStandaloneBudgetByNumber(row, maxExclusive = 1400) {
  const baseNumber = budgetBaseNumber(row);
  return baseNumber != null && baseNumber < maxExclusive;
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
  if (isStandaloneBudgetByNumber(row)) return null;
  const override = OS_NUMBER_OVERRIDES_BY_ARKMEDS_ID.get(
    Number(row?.arkmeds_orcamento_id)
  );
  if (override) return override;
  const raw = row?.dados_planilha_json?.ordens_de_servico;
  return cleanText(raw) || null;
}

export function isSpreadsheetAvulso(row) {
  if (isStandaloneBudgetByNumber(row)) return true;
  const explicitOs = getSpreadsheetOsNumber(row) ||
    cleanText(row?.arkmeds_ordem_servico_numero) ||
    cleanText(row?.arkmeds_ordem_servico_id);
  if (explicitOs) return false;

  const sheet = row?.dados_planilha_json || {};
  const classification = normalizeKindText(sheet.conferencia_os);
  const result = normalizeKindText(sheet.resultado_da_conferencia);
  return classification === "avulso provavel" ||
    result === "sem relacao com os" ||
    result === "conferencia manual";
}

function isContaminatedEquipmentText(value) {
  const normalized = normalizeKindText(value);
  if (!normalized) return false;
  return [
    "resolucao padrao",
    "arkmeds.com",
    "conectado como",
    "perfil desconectar",
    "limpar cancelar",
    "personalizado extra aviso",
  ].some((marker) => normalized.includes(marker));
}

function sanitizeEquipmentCandidate(value) {
  const text = cleanText(value);
  if (!text || text.length > 120 || isContaminatedEquipmentText(text)) return "";
  return normalizeMigrationEquipment(text);
}

function extractSpreadsheetEquipment(sheet) {
  const explicit = sanitizeEquipmentCandidate(sheet.tipo_de_equipamento_extraido);
  if (explicit) return explicit;

  const lines = String(sheet.observacoes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = normalizeKindText(line);
    if (normalized.startsWith("para aplicacao no equipamento")) {
      const candidate = sanitizeEquipmentCandidate(line.split(":").slice(1).join(":").split(",")[0]);
      if (candidate) return candidate;
    }
    if (/^equipamento(?:\s+\d+)?(?:\s*[:\-])?\s+/i.test(line)) {
      const candidate = sanitizeEquipmentCandidate(
        line
          .replace(/^equipamento(?:\s+\d+)?(?:\s*[:\-])?\s+/i, "")
          .split(",")[0]
      );
      if (candidate) return candidate;
    }
  }

  return "";
}

function inferEquipmentFromObservation(value) {
  const normalized = normalizeKindText(value);
  if (!normalized) return "";

  const equipmentGroups = [
    /(?:desfibrilador|cardiomax|pas(?:\/eletrodos| de disparo))/,
    /(?:aspirador|frasco coletor|vacuometro)/,
    /(?:oximetro|sensor de oximetria)/,
    /(?:balanca|regua antropometrica|estadiometro)/,
    /(?:eletrocardiogra|cardioclip|peras precordiais)/,
    /(?:bisturi|placa neutra)/,
    /(?:foco cirurgico|foco auxiliar|lampada para foco)/,
  ];
  if (equipmentGroups.filter((pattern) => pattern.test(normalized)).length > 1) {
    return normalizeMigrationEquipment("Equipamentos Diversos");
  }

  const patterns = [
    [/(?:analisador bioquimico|bioplus 2000)/, "Analisador Bioquimico"],
    [/(?:reprocessadora.*endoscopio|endoscopio flexivel)/, "Reprocessadora de Endoscopios"],
    [/(?:sensor de temperatura rn|berco aquecido)/, "Berco Aquecido"],
    [/(?:aparelho de anestesia|datex ohmeda)/, "Aparelho de Anestesia"],
    [/(?:lampada infravermelha|peca para infravermelho)/, "Infravermelho"],
    [/(?:lampada de fenda|lampada led apramed)/, "Lampada de Fenda"],
    [/(?:foco olidef|lampada para foco|foco auxiliar)/, "Foco Cirurgico"],
    [/(?:contra angulo|micro motor|caneta de alta rotacao|pecas? de mao|turbina interna)/, "Peca de Mao Odontologica"],
    [/(?:phmetro|sensor externo de vidro)/, "pHmetro"],
    [/(?:pas\/eletrodos|pas de disparo|cardiomax)/, "Desfibrilador"],
    [/(?:placa neutra|cabo da placa neutra|bisturi deltronix)/, "Bisturi Eletrico"],
    [/(?:bracadeira pni|circuito pni|monitor cardiaco)/, "Monitor Multiparametro"],
    [/(?:radio frequencia|radiofrequencia)/, "Radiofrequencia"],
    [/(?:regua antropometrica|braco da regua|pecas? para balanca|teclado de membrana para balanca)/, "Balanca"],
    [/(?:mangueira triplice|mangueira dupla|mangueira para sugador|filtro de sugador|suporte frontal do refletor|valvula do pedal|valvula de sugador)/, "Consultorio Odontologico"],
    [/(?:autoclave|guarnicao stermax|valvula.*stermax)/, "Autoclave"],
    [/(?:osmose reversa|filtros da osmose)/, "Osmose Reversa"],
    [/(?:eletrocardiograma|cardioclips|peras precordiais)/, "Eletrocardiografo"],
    [/(?:valvula reguladora de ar|rede de ar comprimido)/, "Rede de Ar Comprimido"],
    [/(?:placa prot|alto falante \(ventilador\))/, "Ventilador Pulmonar"],
    [/(?:conservadora|controlador tc960)/, "Camara de Conservacao"],
    [/(?:pecas para aspirador|frasco coletor|mangueira de aspiracao)/, "Aspirador"],
    [/(?:bomba\s+(?:a|de)?\s*vacuo|suctron)/, "Bomba a Vacuo"],
    [/(?:aparelho de profilaxia|placa de ultrassom|caneta de ultrassom)/, "Ultrassom e jato de bicarbonato"],
    [/(?:placa de comando da cadeira|corpo da unidade da cuspideira)/, "Cadeira Odontologica"],
    [/(?:seringa triplice|mangueira.*cuspideira|garrafa.*consultorio)/, "Consultorio Odontologico"],
    [/(?:eletro\s+bionet|cabo de ecg)/, "Eletrocardiografo"],
    [/(?:valvula reguladora.*oxigenio.*rede|rede de oxigenio)/, "Rede de Oxigenio"],
    [/amalgamador/, "Amalgamador"],
    [/(?:espectro\s+marca|espectrofotometro)/, "Espectrofotometro"],
    [/(?:bateria para monitor|monitor inmax)/, "Monitor Multiparametro"],
    [/(?:sensor de oximetria|oximetro)/, "Oximetro"],
    [/destilador/, "Destilador"],
    [/secadora de traqueia/, "Secadora de Traqueias"],
    [/resistencia/, "Resistencias"],
    [/detector fetal/, "Detector Fetal"],
  ];

  const match = patterns.find(([pattern]) => pattern.test(normalized));
  return match ? normalizeMigrationEquipment(match[1]) : "";
}

export function buildMigrationIdentifier(row) {
  const override = IDENTIFIER_OVERRIDES_BY_ARKMEDS_ID.get(
    Number(row?.arkmeds_orcamento_id)
  );
  if (override) return override;

  const sheet = row.dados_planilha_json || {};
  const entries = parseSpreadsheetServiceEntries(sheet.servicos);
  const observations = [sheet.observacoes, row.arkmeds_observacoes_planilha, row.observacoes_gerais]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");
  const group = inferGroup(`${sheet.servicos || ""} ${observations}`);

  const stagingItems = Array.isArray(row.__items) ? row.__items : [];
  const stagingServiceItems = stagingItems.filter((item) => item.tipo_item === "servico");
  const stagingPartItems = stagingItems.filter((item) => item.tipo_item === "peca");
  const stagingEquipments = [...new Set(stagingServiceItems
    .map((item) => sanitizeEquipmentCandidate(item.descricao))
    .filter(Boolean))];

  let service = selectPredominantService(entries);
  if (!service && cleanText(sheet.pecas)) service = "Troca de Peças";
  if (!service && stagingPartItems.length && !stagingServiceItems.length) service = "Troca de Peças";
  if (!service && normalizeKindText(observations).includes("prevent")) service = normalizeMigrationService("preventiva");
  if (!service && normalizeKindText(observations).includes("calibr")) service = normalizeMigrationService("calibracao");
  if (!service && normalizeKindText(observations).includes("corret")) service = normalizeMigrationService("corretiva");
  if (!service) service = normalizeMigrationService(row.arkmeds_tipo_texto) || "Serviço";

  const equipments = [...new Set(entries.map((entry) => entry.equipment).filter(Boolean))];
  const spreadsheetEquipment = extractSpreadsheetEquipment(sheet);
  const inferredEquipment = inferEquipmentFromObservation(`${observations} ${sheet.pecas || ""}`);
  const isPartsBudget = normalizeKindText(service) === "troca de pecas";
  let equipment = "";
  if (isPartsBudget && spreadsheetEquipment) equipment = spreadsheetEquipment;
  else if (isPartsBudget && inferredEquipment) equipment = inferredEquipment;
  else if (isPartsBudget && row.os_tipo_equipamento) equipment = normalizeMigrationEquipment(row.os_tipo_equipamento);
  else if (group) equipment = group;
  else if (equipments.length === 1) equipment = equipments[0];
  else if (equipments.length > 1) equipment = "Equipamentos";
  else if (stagingEquipments.length === 1) equipment = stagingEquipments[0];
  else if (stagingEquipments.length > 1) equipment = "Equipamentos";
  else if (spreadsheetEquipment) equipment = spreadsheetEquipment;
  else {
    equipment = sanitizeEquipmentCandidate(
      row.os_tipo_equipamento ||
      row.equipamento_texto ||
      row.descricao_equipamento
    );
  }

  if (!equipment && isPartsBudget) {
    const firstSpreadsheetPart = cleanText(sheet.pecas).split(/\s+\/\s+/)[0]?.split(/\s+\+\s+/)[0];
    equipment = sanitizeEquipmentCandidate(firstSpreadsheetPart || stagingPartItems[0]?.descricao);
  }

  if (!equipment && service !== "Troca de Peças") equipment = "Equipamentos";
  return [service, equipment].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function identifierNeedsReview(identifier) {
  const normalized = normalizeKindText(identifier);
  return normalized === "troca de pecas" || normalized === "servico";
}

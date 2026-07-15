import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

export const rootDir = process.cwd();
export const outputDir = path.join(rootDir, "outputs", "migracao-orcamentos");
export const statePath = path.join(rootDir, "tmp", "arkmeds-state.json");
export const arkmedsBaseUrl = "https://aci.arkmeds.com";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function requireSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o dry-run.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "migracao-orcamentos-arkmeds-dry-run" } },
  });
}

export async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

export async function readArkmedsCookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  const cookies = state.cookies || [];
  const cookieHeader = cookies
    .filter((item) => String(item.domain || "").includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  if (!cookieHeader) {
    throw new Error("Sessao ArkMeds nao encontrada em tmp/arkmeds-state.json.");
  }

  return cookieHeader;
}

export async function fetchArkmedsJson(pathname, { method = "GET", body, headers = {} } = {}) {
  const cookie = await readArkmedsCookieHeader();
  const response = await fetch(`${arkmedsBaseUrl}${pathname}`, {
    method,
    body,
    headers: {
      cookie,
      accept: "application/json, text/javascript, */*; q=0.01",
      "x-requested-with": "XMLHttpRequest",
      referer: `${arkmedsBaseUrl}/orcamento/`,
      ...headers,
    },
  });

  const text = await response.text();

  if (/usuarios\/conectar|name=["']username["']/i.test(text)) {
    throw new Error("Sessao ArkMeds expirada. Renove o login e atualize tmp/arkmeds-state.json.");
  }

  if (!response.ok) {
    throw new Error(`ArkMeds HTTP ${response.status} em ${pathname}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Resposta ArkMeds nao e JSON em ${pathname}: ${text.slice(0, 300)}`);
  }
}

export async function fetchArkmedsText(pathname, { method = "GET", body, headers = {} } = {}) {
  const cookie = await readArkmedsCookieHeader();
  const response = await fetch(`${arkmedsBaseUrl}${pathname}`, {
    method,
    body,
    headers: {
      cookie,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
      referer: `${arkmedsBaseUrl}/orcamento/`,
      ...headers,
    },
  });

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "";
  const isPdf = /pdf|octet-stream/i.test(contentType) || buffer.subarray(0, 4).toString("utf-8") === "%PDF";
  const text = isPdf ? "" : buffer.toString("utf-8");

  if (/usuarios\/conectar|name=["']username["']/i.test(text)) {
    throw new Error("Sessao ArkMeds expirada. Renove o login e atualize tmp/arkmeds-state.json.");
  }

  if (!response.ok) {
    throw new Error(`ArkMeds HTTP ${response.status} em ${pathname}: ${text.slice(0, 300)}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    url: `${arkmedsBaseUrl}${pathname}`,
    pathname,
    contentType,
    isPdf,
    bytes: buffer.length,
    text,
  };
}

export function cleanText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || text === "-" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return "";
  }
  return text;
}

export function normalizeKindText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

export function stripHtml(value) {
  return cleanText(
    decodeHtmlEntities(String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|section|article|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " "))
  );
}

export function normalizeSearchText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return null;
}

export function inferOrcamentoEditPath(tipoTexto, arkmedsId) {
  const text = normalizeKindText(tipoTexto);
  if (text.includes("peca") && text.includes("servico")) return `/orcamento/pecas_e_servicos/${arkmedsId}/`;
  if (text.includes("peca")) return `/orcamento/pecas/${arkmedsId}/`;
  return `/orcamento/servicos/${arkmedsId}/`;
}

export function isMixedBudget(tipoTexto) {
  const text = normalizeKindText(tipoTexto);
  return text.includes("peca") && text.includes("servico");
}

export function expectedItemEndpoints(tipoTexto) {
  const text = normalizeKindText(tipoTexto);
  const hasPeca = text.includes("peca");
  const hasServico = text.includes("servico");
  const hasOs = text.includes("ordem de servico");

  if (!text || hasOs || (hasPeca && hasServico)) return ["servicos", "pecas"];
  if (hasPeca) return ["pecas"];
  if (hasServico) return ["servicos"];
  return ["servicos", "pecas"];
}

export function extractEquipmentFromText(value) {
  const text = cleanText(value);
  if (!text) {
    return {
      informacoes_tecnicas: null,
      descricao_equipamento: null,
      equipamento_texto: null,
      fabricante: null,
      modelo: null,
      numero_serie: null,
      patrimonio: null,
    };
  }

  const line = extractFirstMatch(text, [
    /(?:informacoes tecnicas|informacoes tecnicas do equipamento|informa(?:c|ç)(?:o|õ)es tecnicas)\s*:?\s*([^|]{8,300})/i,
    /equipamento\s*:?\s*([^|]{3,260})/i,
    /instrumento\s*:?\s*([^|]{3,260})/i,
  ]) || text.slice(0, 300);

  const modelo = extractFirstMatch(line, [
    /(?:modelo|mod\.)\s*:?\s*([^,;|]+?)(?=\s*(?:,|;| - | ns\b| n[ouúº°]*\s*s[eé]rie| s[eé]rie| patrim[oô]nio| pat\.|$))/i,
  ]);
  const numeroSerie = extractFirstMatch(line, [
    /(?:\bns\b|n[ouúº°]*\s*s[eé]rie|numero\s+de\s+s[eé]rie|\bs[eé]rie\b)\s*:?\s*([^,;|]+?)(?=\s*(?:,|;| - | patrim[oô]nio| pat\.|$))/i,
  ]);
  const patrimonio = extractFirstMatch(line, [
    /(?:patrim[oô]nio|pat\.)\s*:?\s*([^,;|]+?)(?=\s*(?:,|;| - |$))/i,
  ]);

  let equipamentoTexto = line
    .replace(/^.*?equipamento\s*:?\s*/i, "")
    .replace(/^.*?instrumento\s*:?\s*/i, "")
    .replace(/(?:modelo|mod\.)\s*:?\s*[^,;|]+/i, "")
    .replace(/(?:\bns\b|n[ouúº°]*\s*s[eé]rie|numero\s+de\s+s[eé]rie|\bs[eé]rie\b)\s*:?\s*[^,;|]+/i, "")
    .replace(/(?:patrim[oô]nio|pat\.)\s*:?\s*[^,;|]+/i, "")
    .replace(/[;,|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let fabricante = null;
  if (equipamentoTexto) {
    const words = equipamentoTexto.split(" ").filter(Boolean);
    if (words.length > 3) {
      fabricante = words.at(-1) || null;
      equipamentoTexto = words.slice(0, -1).join(" ");
    }
  }

  return {
    informacoes_tecnicas: line || text,
    descricao_equipamento: line || null,
    equipamento_texto: equipamentoTexto || null,
    fabricante: fabricante || null,
    modelo: modelo || null,
    numero_serie: numeroSerie || null,
    patrimonio: patrimonio || null,
  };
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function parseArkmedsNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = cleanText(value)
    .replace(/[R$\s\u00a0]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!text) return null;

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = text.split(".");
    if (parts.length > 2) {
      text = `${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
    }
  }

  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseArkmedsInteger(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  const digits = onlyDigits(value);
  return digits ? Number.parseInt(digits, 10) : null;
}

export function parseArkmedsDate(value) {
  const text = cleanText(value);
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  return null;
}

export function asTextOrNull(value) {
  const text = cleanText(Array.isArray(value) ? value.filter(Boolean).join(", ") : value);
  return text || null;
}

export function asBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = cleanText(value).toLowerCase();
  return ["true", "1", "sim", "yes"].includes(text);
}

export function normalizarNumeroBaseOrcamento(numero) {
  const original = cleanText(numero);
  const match = original.match(/^(\d+)(?:\.(\d+))?$/);

  if (!match) {
    return {
      original: original || null,
      base: original || null,
      sufixo: null,
      possuiSufixo: false,
      baseNumber: null,
    };
  }

  return {
    original,
    base: match[1],
    sufixo: match[2] || null,
    possuiSufixo: Boolean(match[2]),
    baseNumber: Number.parseInt(match[1], 10),
  };
}

export function normalizeComparableText(value) {
  const empresarial = [
    "PREFEITURA MUNICIPAL DE",
    "FUNDO MUNICIPAL DE SAUDE",
    "FUNDO MUNICIPAL DE SAÚDE",
    "HOSPITAL",
    "CLINICA",
    "CLÍNICA",
    "LTDA",
    "EIRELI",
    "EPP",
    " ME ",
    " S A ",
    " SA ",
  ];

  let text = cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();

  text = ` ${text} `;
  for (const term of empresarial) {
    const normalizedTerm = term
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();
    text = text.replaceAll(` ${normalizedTerm.trim()} `, " ");
  }

  return text
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function tokenScore(a, b) {
  const tokensA = new Set(a.split(" ").filter((token) => token.length > 1));
  const tokensB = new Set(b.split(" ").filter((token) => token.length > 1));
  if (!tokensA.size || !tokensB.size) return 0;
  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

export function compararCliente(clienteOrcamento, clienteOs) {
  const a = normalizeComparableText(clienteOrcamento);
  const b = normalizeComparableText(clienteOs);

  if (!a || !b) {
    return { score: 0, classificacao: "cliente_divergente", normalizado_orcamento: a, normalizado_os: b };
  }

  const maxLength = Math.max(a.length, b.length);
  const editScore = maxLength ? 1 - levenshtein(a, b) / maxLength : 0;
  const tokens = tokenScore(a, b);
  const score = Math.max(editScore, tokens);

  let classificacao = "cliente_divergente";
  if (score >= 0.9) classificacao = "cliente_igual";
  else if (score >= 0.8) classificacao = "cliente_muito_semelhante";
  else if (score >= 0.65) classificacao = "cliente_possivel";

  return {
    score: Number(score.toFixed(4)),
    classificacao,
    normalizado_orcamento: a,
    normalizado_os: b,
  };
}

export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

export function confiancaPorScore(score) {
  if (score >= 80) return "alta";
  if (score >= 60) return "media";
  if (score >= 40) return "baixa";
  return "pendente";
}

export function recomendacaoPorClassificacao(classificacao, statusValidacao) {
  if (statusValidacao === "ignorar") return "ignorar_por_status";
  if (classificacao === "com_os_confirmada") return "confirmar_vinculo";
  if (["possivel_os_por_numero_cliente", "possivel_os_por_numero", "os_sugerida_baixa_confianca", "os_ambigua", "pendente_validacao"].includes(classificacao)) {
    return "revisar_manualmente";
  }
  if (["sem_os_avulso", "provavel_avulso_numero_baixo"].includes(classificacao)) return "tratar_como_avulso";
  return "corrigir_dados";
}

export function buildIdentifier(row) {
  const numero = cleanText(row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero);
  const osNumero = cleanText(row.arkmeds_ordem_servico_numero);
  const cliente = cleanText(row.arkmeds_solicitante);
  const tipo = cleanText(row.arkmeds_tipo_texto);
  const data = cleanText(row.arkmeds_data_criacao);

  if (!numero || !cliente || !data) {
    return `PENDENTE | ORC-${numero || "-"} | ID-${row.arkmeds_orcamento_id} | ${cliente || "-"}`;
  }

  if (osNumero || cleanText(row.arkmeds_ordem_servico_id)) {
    return `OS-${osNumero || row.arkmeds_ordem_servico_id} | ORC-${numero} | ${cliente} | ${tipo || "-"} | ${data}`;
  }

  return `ORC-AVULSO-${numero} | ${cliente} | ${tipo || "-"} | ${data} | ID-${row.arkmeds_orcamento_id}`;
}

export function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join("; "));
  const text = value == null ? "" : String(value);
  if (/[",\r\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(";"),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(";")),
  ];
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf-8");
}

export async function supabaseAll(supabase, table, select, apply = (query) => query) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const query = apply(supabase.from(table).select(select).range(from, from + pageSize - 1));
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function logMigration(supabase, payload) {
  const { error } = await supabase.from("migracao_arkmeds_logs").insert({
    tipo_execucao: "dry_run",
    entidade: payload.entidade || "orcamentos",
    arkmeds_id: payload.arkmeds_id == null ? null : String(payload.arkmeds_id),
    identificador_migracao: payload.identificador_migracao || null,
    status: payload.status || "info",
    mensagem: payload.mensagem || null,
    payload_json: payload.payload_json || null,
  });

  if (error) {
    console.warn(`Aviso: nao foi possivel registrar log: ${error.message}`);
  }
}

export function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter((value) => value != null && value !== "")).size;
}

export const groupConfigs = [
  { key: "pendentes", label: "Pendentes", tipo: ["1"], statusNormalizado: "pendente" },
  { key: "aprovados_em_curso", label: "Aprovados Em curso", tipo: ["2"], statusNormalizado: "aprovado_em_curso" },
  { key: "reprovados_em_curso", label: "Reprovados Em curso", tipo: ["3"], statusNormalizado: "reprovado_em_curso" },
  { key: "faturados", label: "Faturados", tipo: ["4"], statusNormalizado: "faturado" },
  { key: "cancelados", label: "Cancelados", tipo: ["5", "6", "7"], statusNormalizado: "cancelado" },
  { key: "recusados", label: "Recusado", tipo: ["8"], statusNormalizado: "recusado_ignorado" },
];

export const statusPolicy = {
  cancelados: "importar_historico",
  recusados: "ignorar",
  reprovados_em_curso: process.env.MIGRACAO_ORCAMENTOS_REPROVADOS || "importar_historico",
  faturados: "importar_operacional",
  aprovados_em_curso: "importar_operacional",
  pendentes: "importar_operacional",
};

export function normalizeArkmedsStatusGroup(statusGroup) {
  const key = cleanText(statusGroup);
  if (key === "faturados_aprovados") return "faturado";
  const config = groupConfigs.find((item) => item.key === key);
  return config?.statusNormalizado || key || null;
}

export function arkmedsStatusLabel(statusGroup) {
  const key = cleanText(statusGroup);
  if (key === "faturados_aprovados") return "Faturados";
  const config = groupConfigs.find((item) => item.key === key);
  return config?.label || key || null;
}

export function statusImportPolicy(statusGroup) {
  const key = cleanText(statusGroup);
  if (key === "faturados_aprovados") return statusPolicy.faturados;
  return statusPolicy[key] || "pendente_politica";
}

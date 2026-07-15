import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const rootDir = process.cwd();
export const outputDir = path.join(rootDir, "outputs", "migracao-calibracoes");
export const statePath = path.join(rootDir, "tmp", "arkmeds-state.json");
export const arkmedsBaseUrl = "https://aci.arkmeds.com";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

export function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function requireSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "migracao-calibracoes-arkmeds" } },
  });
}

export async function resolveOrganizacaoId(supabase) {
  if (process.env.ORGANIZACAO_ID) return process.env.ORGANIZACAO_ID;

  const { data, error } = await supabase.from("organizacoes").select("id,nome").limit(2);
  if (error) throw new Error(`Falha ao consultar organizacao: ${error.message}`);
  if (data?.length !== 1) {
    throw new Error("Defina ORGANIZACAO_ID quando existir mais de uma organizacao.");
  }
  return data[0].id;
}

export async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function arkmedsHeaders(accept) {
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  const cookies = state.cookies || [];
  const cookie = cookies
    .filter((item) => String(item.domain || "").includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  if (!cookie) throw new Error("Sessao ArkMeds nao encontrada em tmp/arkmeds-state.json.");
  return {
    cookie,
    accept,
    "x-requested-with": "XMLHttpRequest",
    referer: `${arkmedsBaseUrl}/calibracao/balanca/`,
  };
}

async function fetchArkmeds(pathname, accept) {
  const response = await fetch(`${arkmedsBaseUrl}${pathname}`, {
    headers: await arkmedsHeaders(accept),
    signal: AbortSignal.timeout(45_000),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString("utf-8");

  if (/usuarios\/conectar|name=["']username["']/i.test(text)) {
    throw new Error("Sessao ArkMeds expirada. Renove tmp/arkmeds-state.json.");
  }
  if (!response.ok) {
    throw new Error(`ArkMeds HTTP ${response.status} em ${pathname}: ${text.slice(0, 250)}`);
  }
  return { response, buffer, text };
}

export async function fetchArkmedsJson(pathname) {
  const { text } = await fetchArkmeds(
    pathname,
    "application/json, text/javascript, */*; q=0.01"
  );
  return JSON.parse(text);
}

export async function fetchCalibrationList({ start, length }) {
  const query = new URLSearchParams({
    draw: "1",
    start: String(start),
    length: String(length),
    filters: "",
    url: `${arkmedsBaseUrl}/calibracao/balanca/`,
    "search[value]": "",
    "order[0][column]": "8",
    "order[0][dir]": "desc",
  });
  const { text } = await fetchArkmeds(
    `/calibracao/api/list_calib_balanca/?${query.toString()}`,
    "application/json, text/javascript, */*; q=0.01"
  );
  return JSON.parse(text);
}

export async function fetchCalibrationHtml(pathname) {
  const { text } = await fetchArkmeds(pathname, "text/html,application/xhtml+xml");
  return text;
}

export async function fetchCalibrationPdf(pathname) {
  const { response, buffer } = await fetchArkmeds(pathname, "application/pdf,*/*;q=0.8");
  const contentType = response.headers.get("content-type") || "";
  if (buffer.subarray(0, 4).toString("utf-8") !== "%PDF" && !/pdf/i.test(contentType)) {
    throw new Error(`Resposta de ${pathname} nao e PDF.`);
  }
  return {
    buffer,
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

export function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractInputValue(html, name) {
  const tag = html.match(new RegExp(`<input\\b(?=[^>]*\\bname=["']${escapeRegex(name)}["'])[^>]*>`, "i"))?.[0];
  if (!tag) return "";
  return decodeHtmlEntities(tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] || "").trim();
}

function extractTextareaValue(html, name) {
  return decodeHtmlEntities(
    html.match(new RegExp(`<textarea\\b(?=[^>]*\\bname=["']${escapeRegex(name)}["'])[^>]*>([\\s\\S]*?)<\\/textarea>`, "i"))?.[1] || ""
  ).trim();
}

function extractSelectValue(html, name) {
  const block = html.match(new RegExp(`<select\\b(?=[^>]*\\bname=["']${escapeRegex(name)}["'])[^>]*>([\\s\\S]*?)<\\/select>`, "i"))?.[1] || "";
  const option = block.match(/<option\b(?=[^>]*\bselected(?:=["'][^"']*["'])?)[^>]*>([\s\S]*?)<\/option>/i)?.[0];
  if (!option) return { id: "", text: "" };
  return {
    id: decodeHtmlEntities(option.match(/\bvalue=["']([^"']*)["']/i)?.[1] || "").trim(),
    text: stripHtml(option),
  };
}

export function inferDetailPath(item) {
  const id = Number(item.id);
  const type = Number(item.type_calibration || 1);
  if (type === 1) return `/calibracao/equipamento/editar/${id}`;
  if (type === 4) return `/calibracao/manual/editar/${id}`;
  return null;
}

export function parseArkmedsDate(value) {
  const match = String(value ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function parseCalibrationHtml(html) {
  const selectedNames = [
    "solicitante",
    "equipamento",
    "ordem_servico",
    "procedimento",
    "tecnico_executor",
    "responsavel_tecnico",
  ];
  const textNames = [
    "numero",
    "local",
    "temperatura",
    "incerteza_temperatura",
    "umidade",
    "incerteza_umidade",
    "pressao_atmosferica",
    "incerteza_pressao",
    "data_criacao",
    "data_emissao",
    "validade",
    "responsavel_solicitante",
  ];
  const fields = {};
  for (const name of selectedNames) fields[name] = extractSelectValue(html, name);
  for (const name of textNames) fields[name] = extractInputValue(html, name);
  fields.observacoes = extractTextareaValue(html, "observacoes");

  const tablesRaw = extractTextareaValue(html, "tabelas");
  let tables = [];
  let tablesError = null;
  if (tablesRaw) {
    try {
      tables = JSON.parse(tablesRaw);
    } catch (error) {
      tablesError = error.message;
    }
  }

  return { fields, tables, tablesError };
}

export function parseStandardCertificateHtml(html) {
  const selectedStandard = extractSelectValue(html, "padrao");
  const resultsRaw = extractInputValue(html, "resultados");
  let results = [];
  let resultsError = null;

  if (resultsRaw) {
    try {
      results = JSON.parse(resultsRaw);
    } catch (error) {
      resultsError = error.message;
    }
  }

  return {
    numero: extractInputValue(html, "numero"),
    padrao: selectedStandard,
    dataCalibracao: parseArkmedsDate(extractInputValue(html, "data_calibracao")),
    validade: parseArkmedsDate(extractInputValue(html, "validade")),
    orgaoCalibrador: extractInputValue(html, "orgao_calibrador"),
    observacoes: extractTextareaValue(html, "observacoes"),
    results,
    resultsError,
  };
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, columns) {
  const lines = [columns.map((column) => csvEscape(column.label)).join(";")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column.key])).join(";"));
  }
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

export async function fetchAllRows(supabase, table, select, filters = []) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    for (const filter of filters) query = query.eq(filter.column, filter.value);
    const { data, error } = await query;
    if (error) throw new Error(`Falha ao consultar ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

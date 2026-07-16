import { createClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const baseUrl = "https://aci.arkmeds.com";
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const outputDir = path.join(root, "outputs", "sincronizacao-empresas");
const execute = process.argv.includes("--execute");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Number.parseInt(limitArg?.split("=")[1] || "125", 10) || 125);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ufPorNome = new Map([
  ["acre", "AC"], ["alagoas", "AL"], ["amapa", "AP"], ["amazonas", "AM"],
  ["bahia", "BA"], ["ceara", "CE"], ["distrito federal", "DF"], ["espirito santo", "ES"],
  ["goias", "GO"], ["maranhao", "MA"], ["mato grosso", "MT"], ["mato grosso do sul", "MS"],
  ["minas gerais", "MG"], ["para", "PA"], ["paraiba", "PB"], ["parana", "PR"],
  ["pernambuco", "PE"], ["piaui", "PI"], ["rio de janeiro", "RJ"], ["rio grande do norte", "RN"],
  ["rio grande do sul", "RS"], ["rondonia", "RO"], ["roraima", "RR"], ["santa catarina", "SC"],
  ["sao paulo", "SP"], ["sergipe", "SE"], ["tocantins", "TO"],
]);

const clean = (value) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return !text || text === "-" ? "" : text;
};

const normalize = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

const digits = (value) => String(value ?? "").replace(/\D/g, "");

const formatCpfCnpj = (value) => {
  const valueDigits = digits(value).slice(0, 14);
  if (valueDigits.length === 11) {
    return valueDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (valueDigits.length === 14) {
    return valueDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return valueDigits;
};

const formatCep = (value) => {
  const valueDigits = digits(value).slice(0, 8);
  return valueDigits.length === 8
    ? valueDigits.replace(/(\d{5})(\d{3})/, "$1-$2")
    : valueDigits;
};

const estadoUf = (value) => ufPorNome.get(normalize(value)) || clean(value).toUpperCase();

const valuesEqual = (field, left, right) => {
  if (field === "cpf_cnpj" || field === "cep") return digits(left) === digits(right);
  if (field === "estado") return estadoUf(left) === estadoUf(right);
  return normalize(left) === normalize(right);
};

const inferTipoRelacao = (value) =>
  normalize(value).includes("fornecedor") ? "fornecedor" : "cliente";

const inferTipoCliente = (nome, documento) => {
  if (normalize(nome).startsWith("prefeitura")) return "Prefeitura";
  return digits(documento).length === 11 ? "Particular" : "Pessoa Jurídica";
};

async function cookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  const cookie = state.cookies
    .filter((item) => item.domain.includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  if (!cookie) throw new Error("Sessao ArkMeds nao encontrada.");
  return cookie;
}

async function fetchArkmeds(pathname, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: { cookie } });
  const html = await response.text();
  if (/usuarios\/conectar|name="username"/i.test(html)) {
    throw new Error("Sessao ArkMeds expirada. Renove o login antes de sincronizar.");
  }
  if (!response.ok) throw new Error(`ArkMeds HTTP ${response.status}: ${pathname}`);
  return html;
}

function parseListPage(html) {
  const document = new JSDOM(html).window.document;
  const table = document.querySelector("table.table");
  if (!table) return [];
  const headers = [...table.querySelectorAll("thead th")].map((item) => clean(item.textContent));
  return [...table.querySelectorAll("tbody tr")]
    .map((row) => {
      const record = {};
      [...row.querySelectorAll("td")].forEach((cell, index) => {
        record[headers[index] || `col_${index}`] = clean(cell.textContent);
      });
      record.arkmeds_empresa_id = Number.parseInt(record["#"], 10);
      return record;
    })
    .filter((record) => Number.isFinite(record.arkmeds_empresa_id));
}

function readDetailValue(document, label) {
  const expected = normalize(label).replace(/:$/, "");
  const element = [...document.querySelectorAll("strong")].find(
    (item) => normalize(item.textContent).replace(/:$/, "") === expected
  );
  if (!element) return "";
  const parentText = clean(element.parentElement?.textContent);
  return clean(parentText.slice(parentText.indexOf(":") + 1));
}

function parseDetailPage(html) {
  const document = new JSDOM(html).window.document;
  return {
    nome: readDetailValue(document, "Nome"),
    tipo_arkmeds: readDetailValue(document, "Tipo"),
    cpf_cnpj: readDetailValue(document, "CNPJ"),
    cep: readDetailValue(document, "CEP"),
    rua: readDetailValue(document, "Rua"),
    numero: readDetailValue(document, "Numero") || readDetailValue(document, "Número"),
    bairro: readDetailValue(document, "Bairro"),
    cidade: readDetailValue(document, "Cidade"),
    estado: readDetailValue(document, "Estado"),
  };
}

async function fetchLatestCompanies(cookie) {
  const rows = [];
  for (let page = 1; rows.length < limit; page += 1) {
    const pageRows = parseListPage(await fetchArkmeds(`/cadastros/empresa/?page=${page}`, cookie));
    if (!pageRows.length) break;
    rows.push(...pageRows);
  }
  return rows.slice(0, limit);
}

async function fetchAllCompanies() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function getOrganizacaoId() {
  const { data, error } = await supabase.from("organizacoes").select("id").limit(1).single();
  if (error) throw error;
  return data.id;
}

function buildSource(listItem, detail) {
  const nome = detail.nome || listItem.Nome;
  const documento = detail.cpf_cnpj || listItem["CNPJ / CPF"];
  return {
    nome,
    nome_fantasia: listItem["Nome Fantasia"],
    cpf_cnpj: formatCpfCnpj(documento),
    cep: formatCep(detail.cep),
    rua: detail.rua,
    numero: detail.numero,
    bairro: detail.bairro,
    cidade: detail.cidade || listItem.Cidade,
    estado: estadoUf(detail.estado || listItem.Estado),
    contato: listItem.Contato,
    email: listItem.Email,
    tipo_arkmeds: detail.tipo_arkmeds || listItem.Tipo,
  };
}

function createPayload(organizacaoId, listItem, source) {
  return {
    organizacao_id: organizacaoId,
    numero_cadastro: listItem.arkmeds_empresa_id,
    nome: source.nome || `Cliente ArkMeds ${listItem.arkmeds_empresa_id}`,
    nome_fantasia: source.nome_fantasia || null,
    tipo_cliente: inferTipoCliente(source.nome, source.cpf_cnpj),
    tipo_relacao: inferTipoRelacao(source.tipo_arkmeds),
    cpf_cnpj: source.cpf_cnpj || null,
    cep: source.cep || null,
    rua: source.rua || null,
    numero: source.numero || null,
    bairro: source.bairro || null,
    cidade: source.cidade || null,
    estado: source.estado || null,
    contato: source.contato || null,
    email: source.email || null,
    observacoes: "Sincronizado do ArkMeds.",
    ativo: true,
  };
}

function updatePayload(existing, source) {
  const payload = {};
  for (const field of [
    "nome", "nome_fantasia", "cpf_cnpj", "cep", "rua", "numero",
    "bairro", "cidade", "estado", "contato", "email",
  ]) {
    const sourceValue = clean(source[field]);
    if (sourceValue && !valuesEqual(field, existing[field], sourceValue)) {
      payload[field] = sourceValue;
    }
  }
  return payload;
}

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const cookie = await cookieHeader();
  const [organizacaoId, arkmedsCompanies, ipromedCompanies] = await Promise.all([
    getOrganizacaoId(),
    fetchLatestCompanies(cookie),
    fetchAllCompanies(),
  ]);
  const byNumber = new Map(
    ipromedCompanies.map((company) => [Number(company.numero_cadastro), company])
  );

  const preparedCompanies = await mapConcurrent(arkmedsCompanies, 8, async (listItem) => {
    const existing = byNumber.get(listItem.arkmeds_empresa_id) || null;
    const detail = parseDetailPage(
      await fetchArkmeds(`/cadastros/empresa/visual/${listItem.arkmeds_empresa_id}/`, cookie)
    );
    const source = buildSource(listItem, detail);
    return { listItem, existing, source };
  });

  const results = [];
  for (const { listItem, existing, source } of preparedCompanies) {

    if (!existing) {
      const payload = createPayload(organizacaoId, listItem, source);
      let newId = null;
      if (execute) {
        const { data, error } = await supabase.from("empresas").insert(payload).select("id").single();
        if (error) throw new Error(`Empresa ArkMeds ${listItem.arkmeds_empresa_id}: ${error.message}`);
        newId = data.id;
      }
      results.push({
        arkmeds_empresa_id: listItem.arkmeds_empresa_id,
        ipromed_empresa_id: newId,
        nome: payload.nome,
        acao: "criar",
        campos: Object.keys(payload).join(","),
      });
      continue;
    }

    const payload = updatePayload(existing, source);
    if (!Object.keys(payload).length) {
      results.push({
        arkmeds_empresa_id: listItem.arkmeds_empresa_id,
        ipromed_empresa_id: existing.id,
        nome: existing.nome,
        acao: "sem_alteracao",
        campos: "",
      });
      continue;
    }

    if (execute) {
      const { error } = await supabase.from("empresas").update(payload).eq("id", existing.id);
      if (error) throw new Error(`Empresa ArkMeds ${listItem.arkmeds_empresa_id}: ${error.message}`);
    }
    results.push({
      arkmeds_empresa_id: listItem.arkmeds_empresa_id,
      ipromed_empresa_id: existing.id,
      nome: payload.nome || existing.nome,
      acao: "atualizar",
      campos: Object.keys(payload).join(","),
    });
  }

  const summary = {
    modo: execute ? "execute" : "dry-run",
    limite: limit,
    arkmeds_lidas: arkmedsCompanies.length,
    criar: results.filter((item) => item.acao === "criar").length,
    atualizar: results.filter((item) => item.acao === "atualizar").length,
    sem_alteracao: results.filter((item) => item.acao === "sem_alteracao").length,
    empresas: results.filter((item) => item.acao !== "sem_alteracao"),
  };

  const suffix = execute ? "execute" : "dry_run";
  await fs.writeFile(
    path.join(outputDir, `sincronizacao_empresas_${suffix}.json`),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  const headers = ["arkmeds_empresa_id", "ipromed_empresa_id", "nome", "acao", "campos"];
  const csv = [headers.join(";"), ...results.map((row) => headers.map((key) => csvCell(row[key])).join(";"))].join("\n");
  await fs.writeFile(path.join(outputDir, `sincronizacao_empresas_${suffix}.csv`), csv, "utf-8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

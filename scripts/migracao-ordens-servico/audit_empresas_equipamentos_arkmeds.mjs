import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outputs = path.join(root, "outputs");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const baseUrl = "https://aci.arkmeds.com";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ARKMEDS_EMAIL;
const password = process.env.ARKMEDS_PASSWORD;
const auditAll = process.argv.includes("--all");
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(
  1,
  Number.parseInt(concurrencyArg?.split("=")[1] || "8", 10) || 8
);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const normalizeKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const compareName = (value) => normalizeText(value).toLowerCase();

const parseAfterLabel = (text, label) => {
  const lines = normalizeText(text).split("\n");
  const expected = normalizeKey(label);
  for (const line of lines) {
    const [rawLabel, ...rest] = line.split(":");
    if (normalizeKey(rawLabel) === expected) {
      return rest.join(":").trim();
    }
  }
  return "";
};

const parseHtmlLabel = (html, label) => {
  const expected = normalizeKey(label);
  const matches = html.matchAll(/<strong>\s*([^<:]+):\s*<\/strong>\s*([^<]*)/gi);
  for (const match of matches) {
    if (normalizeKey(match[1]) === expected) {
      return match[2]
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
    }
  }
  return "";
};

const parseHtmlTitle = (html) => {
  const match = html.match(/Equipamento\s+([^<\n]+)/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
};

const toCsvValue = (value) => {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

async function fetchAll(table, select, orderBy = "numero_cadastro") {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase.from(table).select(select).range(from, to);
    if (orderBy) query = query.order(orderBy, { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function createStorageStateWithLogin() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!/usuarios\/conectar/i.test(page.url())) {
    await context.storageState({ path: statePath });
    await browser.close();
    return;
  }

  if (!email || !password) {
    throw new Error(
      "Sessao ArkMeds expirada. Configure ARKMEDS_EMAIL e ARKMEDS_PASSWORD para renovar o login."
    );
  }

  await page.locator('input[name="username"], input[type="email"]').first().fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => !/usuarios\/conectar/.test(url.href), { timeout: 30000 }),
    page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar")').first().click(),
  ]);
  await page.waitForLoadState("networkidle").catch(() => null);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });
  await browser.close();
}

async function cookieHeaderFromState() {
  try {
    await fs.access(statePath);
  } catch {
    await createStorageStateWithLogin();
  }

  let state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  let cookie = state.cookies
    .filter((item) => item.domain.includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  if (!cookie) {
    await createStorageStateWithLogin();
    state = JSON.parse(await fs.readFile(statePath, "utf-8"));
    cookie = state.cookies
      .filter((item) => item.domain.includes("aci.arkmeds.com"))
      .map((item) => `${item.name}=${item.value}`)
      .join("; ");
  }

  return cookie;
}

async function readArkmedsEquipment(cookie, equipamentoNumeroCadastro) {
  const url = `${baseUrl}/cadastros/equipamento/visual/${equipamentoNumeroCadastro}/`;
  let response = await fetch(url, { headers: { cookie } });
  let html = await response.text();

  if (/usuarios\/conectar/i.test(response.url) || /name="username"/i.test(html)) {
    await createStorageStateWithLogin();
    const refreshedCookie = await cookieHeaderFromState();
    response = await fetch(url, { headers: { cookie: refreshedCookie } });
    html = await response.text();
  }

  return {
    arkmeds_url: url,
    arkmeds_status_http: response.status,
    arkmeds_titulo: parseHtmlTitle(html),
    arkmeds_estado: parseHtmlLabel(html, "Estado"),
    arkmeds_proprietario: parseHtmlLabel(html, "Proprietário"),
    arkmeds_tipo: parseHtmlLabel(html, "Tipo"),
    arkmeds_fabricante: parseHtmlLabel(html, "Fabricante"),
    arkmeds_modelo: parseHtmlLabel(html, "Modelo"),
    arkmeds_numero_serie: parseHtmlLabel(html, "Número de Série"),
  };
}

function buildDuplicateGroups(empresas) {
  const groups = new Map();
  for (const empresa of empresas) {
    const key = normalizeKey(empresa.nome);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(empresa);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, empresas: group }));
}

async function main() {
  const empresas = await fetchAll(
    "empresas",
    "id,numero_cadastro,nome,nome_fantasia,cpf_cnpj,telefone,celular,email,cep,rua,numero,complemento,bairro,cidade,estado,observacoes,ativo,tipo_relacao",
    "numero_cadastro"
  );
  const equipamentos = await fetchAll(
    "equipamentos",
    "id,numero_cadastro,empresa_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,tag,setor,status,ativo",
    "numero_cadastro"
  );

  const empresasById = new Map(empresas.map((empresa) => [empresa.id, empresa]));
  const duplicateGroups = buildDuplicateGroups(empresas.filter((empresa) => empresa.ativo !== false));
  const empresaIdToGroup = new Map();
  for (const group of duplicateGroups) {
    for (const empresa of group.empresas) {
      empresaIdToGroup.set(empresa.id, group);
    }
  }

  const targets = equipamentos
    .filter((equipamento) => {
      if (!equipamento.numero_cadastro) return false;
      return auditAll || empresaIdToGroup.has(equipamento.empresa_id);
    })
    .map((equipamento) => ({
      equipamento,
      empresaAtual: empresasById.get(equipamento.empresa_id),
      group: empresaIdToGroup.get(equipamento.empresa_id) || null,
    }));

  await fs.mkdir(outputs, { recursive: true });

  const rows = [];
  const cookie = await cookieHeaderFromState();

  async function auditTarget(target, index) {
    const { equipamento, empresaAtual, group } = targets[index];
    let arkmeds = {};
    let erro = "";
    try {
      arkmeds = await readArkmedsEquipment(cookie, equipamento.numero_cadastro);
    } catch (error) {
      erro = error.message;
    }

    const proprietarioName = compareName(arkmeds.arkmeds_proprietario);
    const proprietarioKey = normalizeKey(arkmeds.arkmeds_proprietario);
    const empresaAtualName = compareName(empresaAtual?.nome);
    const empresaAtualKey = normalizeKey(empresaAtual?.nome);
    const groupEmpresas = group?.empresas || empresas;
    const empresaSugeridaExata = groupEmpresas.find(
      (empresa) => compareName(empresa.nome) === proprietarioName
    );
    const empresaSugeridaNormalizada = groupEmpresas.find(
      (empresa) => normalizeKey(empresa.nome) === proprietarioKey
    );
    const empresaSugerida = empresaSugeridaExata || empresaSugeridaNormalizada;

    const statusAuditoria = erro
      ? "erro_consulta_arkmeds"
      : empresaSugeridaExata && empresaSugeridaExata.id !== empresaAtual?.id
        ? "corrigir_empresa_do_equipamento"
        : proprietarioName === empresaAtualName || proprietarioKey === empresaAtualKey
        ? "ok"
        : empresaSugerida
          ? "corrigir_empresa_do_equipamento"
          : "proprietario_nao_encontrado_no_grupo";

    return {
      status_auditoria: statusAuditoria,
      grupo_normalizado: group?.key || "",
      equipamento_id: equipamento.id,
      equipamento_numero_cadastro: equipamento.numero_cadastro,
      tipo_sistema: equipamento.tipo_texto,
      fabricante_sistema: equipamento.fabricante,
      modelo_sistema: equipamento.modelo,
      ns_sistema: equipamento.numero_serie,
      patrimonio_sistema: equipamento.patrimonio,
      empresa_atual_id: empresaAtual?.id || "",
      empresa_atual_numero_cadastro: empresaAtual?.numero_cadastro || "",
      empresa_atual_nome: empresaAtual?.nome || "",
      empresa_atual_cidade: empresaAtual?.cidade || "",
      arkmeds_proprietario: arkmeds.arkmeds_proprietario || "",
      arkmeds_titulo: arkmeds.arkmeds_titulo || "",
      arkmeds_tipo: arkmeds.arkmeds_tipo || "",
      arkmeds_fabricante: arkmeds.arkmeds_fabricante || "",
      arkmeds_modelo: arkmeds.arkmeds_modelo || "",
      arkmeds_ns: arkmeds.arkmeds_numero_serie || "",
      empresa_sugerida_id: empresaSugerida?.id || "",
      empresa_sugerida_numero_cadastro: empresaSugerida?.numero_cadastro || "",
      empresa_sugerida_nome: empresaSugerida?.nome || "",
      erro,
    };
  }

  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    const batchRows = await Promise.all(
      batch.map((target, offset) => auditTarget(target, index + offset))
    );
    rows.push(...batchRows);
    console.log(`auditados ${Math.min(index + batch.length, targets.length)}/${targets.length}`);
  }

  const suffix = auditAll ? "todos" : "duplicados";
  const jsonPath = path.join(outputs, `auditoria_empresas_equipamentos_arkmeds_${suffix}.json`);
  const csvPath = path.join(outputs, `auditoria_empresas_equipamentos_arkmeds_${suffix}.csv`);
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf-8");

  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(";")),
  ].join("\n");
  await fs.writeFile(csvPath, `\uFEFF${csv}`, "utf-8");

  const summary = rows.reduce((acc, row) => {
    acc[row.status_auditoria] = (acc[row.status_auditoria] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        arquivo_json: path.relative(root, jsonPath),
        arquivo_csv: path.relative(root, csvPath),
        grupos_duplicados: duplicateGroups.length,
        equipamentos_auditados: rows.length,
        resumo: summary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

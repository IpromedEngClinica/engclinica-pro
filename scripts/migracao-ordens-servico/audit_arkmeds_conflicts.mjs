import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outputs = path.join(root, "outputs");
const baseUrl = "https://aci.arkmeds.com";

const statePath = path.join(root, "tmp", "arkmeds-state.json");
const samplePath = path.join(outputs, "arkmeds_conflict_sample.json");
const outPath = path.join(outputs, "arkmeds_conflict_endpoint_probe.json");

const email = process.env.ARKMEDS_EMAIL;
const password = process.env.ARKMEDS_PASSWORD;

if (!email || !password) {
  console.error("Configure ARKMEDS_EMAIL e ARKMEDS_PASSWORD para consultar a Arkmeds.");
  process.exit(1);
}

async function login(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!/login|entrar|accounts|usuarios\/conectar/i.test(page.url())) return;

  await page.locator('input[name="username"], input[type="email"]').first().fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => !/usuarios\/conectar/.test(url.href), { timeout: 30000 }),
    page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar")').first().click(),
  ]);
  await page.waitForLoadState("networkidle").catch(() => null);

  if (/usuarios\/conectar/.test(page.url()) || /Conecte-se/i.test(await page.title())) {
    throw new Error("Falha ao autenticar na Arkmeds.");
  }
}

async function fetchText(page, url) {
  return page.evaluate(async (targetUrl) => {
    const response = await fetch(targetUrl, {
      credentials: "include",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    return {
      url: targetUrl,
      status: response.status,
      contentType: response.headers.get("content-type"),
      text: await response.text(),
    };
  }, url);
}

async function fetchJson(page, url) {
  const result = await fetchText(page, url);
  try {
    return { ...result, json: JSON.parse(result.text), text: undefined };
  } catch {
    return { ...result, text: result.text.slice(0, 1200) };
  }
}

function endpointsFor(item) {
  const equipamentoId = item.arkmeds_equipamento_id;
  const clienteId = item.arkmeds_cliente_id;
  const osId = item.arkmeds_os_id;
  return [
    `${baseUrl}/cadastros/equipamento/visual/${equipamentoId}/`,
    `${baseUrl}/cadastros/equipamento/editar/${equipamentoId}/`,
    `${baseUrl}/cadastros/equipamento/${equipamentoId}/`,
    `${baseUrl}/cadastros/apis/load_equipament_search/?texto=${encodeURIComponent(item.numero_serie || item.modelo || item.tipo_equipamento || "")}`,
    `${baseUrl}/cadastros/solicitante/visual/${clienteId}/`,
    `${baseUrl}/cadastros/solicitante/editar/${clienteId}/`,
    `${baseUrl}/cadastros/apis/load_requester_search/?search=&val=${encodeURIComponent(JSON.stringify([{ id: clienteId, texto: "" }]))}`,
    `${baseUrl}/ordem_servico/visualizar/${osId}/`,
    `${baseUrl}/ordem_servico/editar/${osId}/`,
  ];
}

async function main() {
  const sample = JSON.parse(await fs.readFile(samplePath, "utf-8"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });

  const results = [];
  for (const item of sample.slice(0, 12)) {
    const probes = [];
    for (const endpoint of endpointsFor(item)) {
      const result = await fetchJson(page, endpoint);
      probes.push({
        url: result.url,
        status: result.status,
        contentType: result.contentType,
        jsonPreview: result.json ? JSON.stringify(result.json).slice(0, 1200) : null,
        textPreview: result.text || null,
      });
    }
    results.push({ item, probes });
  }

  await fs.writeFile(outPath, JSON.stringify(results, null, 2), "utf-8");
  await browser.close();
  console.log(JSON.stringify({ arquivo: path.relative(root, outPath), itens: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

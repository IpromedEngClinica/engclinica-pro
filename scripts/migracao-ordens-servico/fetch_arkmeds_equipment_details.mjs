import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outputs = path.join(root, "outputs");
const baseUrl = "https://aci.arkmeds.com";

const email = process.env.ARKMEDS_EMAIL;
const password = process.env.ARKMEDS_PASSWORD;

if (!email || !password) {
  console.error("Configure ARKMEDS_EMAIL e ARKMEDS_PASSWORD.");
  process.exit(1);
}

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const afterLabel = (text, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}:\\s*([^\\n]+)`, "i"));
  return match ? match[1].trim() : "";
};

async function login(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!/usuarios\/conectar/i.test(page.url())) return;
  await page.locator('input[name="username"], input[type="email"]').first().fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => !/usuarios\/conectar/.test(url.href), { timeout: 30000 }),
    page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar")').first().click(),
  ]);
  await page.waitForLoadState("networkidle").catch(() => null);
}

async function main() {
  const conflicts = JSON.parse(
    await fs.readFile(path.join(outputs, "arkmeds_conflicts_all.json"), "utf-8")
  );
  const ids = [...new Set(conflicts.map((item) => item.arkmeds_equipamento_id).filter(Boolean))];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page);

  const details = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const url = `${baseUrl}/cadastros/equipamento/visual/${id}/`;
    let item;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => null);
      const text = normalizeText(await page.locator("body").innerText());
      item = {
        arkmeds_equipamento_id: id,
        status: 200,
        url,
        titulo: (text.match(/Equipamento ([^\n]+)/i)?.[1] || "").trim(),
        estado: afterLabel(text, "Estado"),
        patrimonio: afterLabel(text, "Patrimônio"),
        tipo: afterLabel(text, "Tipo"),
        proprietario: afterLabel(text, "Proprietário"),
        fabricante: afterLabel(text, "Fabricante"),
        modelo: afterLabel(text, "Modelo"),
        numero_serie: afterLabel(text, "Número de Série"),
        text_preview: text.slice(0, 2500),
      };
    } catch (error) {
      item = {
        arkmeds_equipamento_id: id,
        status: 0,
        url,
        error: error.message,
      };
    }
    details.push(item);
    if ((index + 1) % 50 === 0) {
      console.log(`coletados ${index + 1}/${ids.length}`);
    }
  }

  await browser.close();
  const outPath = path.join(outputs, "arkmeds_equipment_details.json");
  await fs.writeFile(outPath, JSON.stringify(details, null, 2), "utf-8");
  console.log(JSON.stringify({ arquivo: path.relative(root, outPath), equipamentos: details.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

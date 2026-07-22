import { JSDOM } from "jsdom";
import fs from "node:fs/promises";
import path from "node:path";

const fixMojibake = (value) => {
  const text = String(value ?? "");
  if (!/[ÃƒÃ‚]/.test(text)) return text;

  const fixed = Buffer.from(text, "latin1").toString("utf8");
  return fixed.includes("ï¿½") || fixed.includes("�") ? text : fixed;
};

const clean = (value) => {
  const text = fixMojibake(value).replace(/\s+/g, " ").trim();
  return !text || /^-+$/.test(text) ? "" : text;
};

const normalizeDetail = (detail) => ({
  problema_relatado: clean(detail?.problema_relatado),
  origem_problema: clean(detail?.origem_problema),
  descricao_servico: clean(detail?.descricao_servico),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, { attempts = 5, timeoutMs = 30000 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.status !== 429 && response.status < 500) return response;

      lastError = new Error(`ArkMeds HTTP ${response.status}.`);
      const retryAfter = Number.parseInt(response.headers.get("retry-after") || "0", 10);
      await response.body?.cancel();
      if (attempt < attempts) {
        await sleep(retryAfter > 0 ? retryAfter * 1000 : Math.min(10000, 1500 * 2 ** (attempt - 1)));
        continue;
      }
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) await sleep(Math.min(10000, 750 * 2 ** (attempt - 1)));
  }

  throw lastError;
}

export function parseArkmedsOsDetail(html) {
  const document = new JSDOM(html).window.document;

  const fieldValue = (name) => {
    const element = document.querySelector(`[name="${name}"]`);
    return clean(element?.value);
  };

  const selectedText = (name) => {
    const element = document.querySelector(`select[name="${name}"]`);
    return clean(element?.selectedOptions?.[0]?.textContent);
  };

  return normalizeDetail({
    problema_relatado: selectedText("problema"),
    origem_problema: selectedText("origem_problema"),
    descricao_servico: fieldValue("descricao_servico"),
  });
}

export async function fetchArkmedsOsDetail({
  baseUrl,
  cookie,
  arkmedsId,
  choiceMaps,
}) {
  const response = await fetchWithRetry(`${baseUrl}/api/v5/ordem_servico/${arkmedsId}/`, {
    headers: {
      cookie,
      referer: `${baseUrl}/ordem_servico/`,
      accept: "application/json",
    },
  });
  const body = await response.text();

  if (/usuarios\/conectar|name="username"/i.test(body) || response.status === 401 || response.status === 403) {
    throw new Error("Sessao ArkMeds expirada.");
  }
  if (!response.ok) {
    throw new Error(`ArkMeds HTTP ${response.status} na OS ${arkmedsId}.`);
  }

  const data = JSON.parse(body);
  return normalizeDetail({
    problema_relatado: choiceMaps.problemas[String(data.problema)] || "",
    origem_problema: choiceMaps.origens[String(data.origem_problema)] || "",
    descricao_servico: data.descricao_servico,
  });
}

function parseChoiceMaps(html) {
  const document = new JSDOM(html).window.document;
  const optionMap = (name) => Object.fromEntries(
    [...document.querySelectorAll(`select[name="${name}"] option`)]
      .map((option) => [String(option.value), clean(option.textContent)])
      .filter(([id, label]) => id && label)
  );

  return {
    problemas: optionMap("problema"),
    origens: optionMap("origem_problema"),
  };
}

async function loadChoiceMaps({ baseUrl, cookie, arkmedsIds, cacheDir, maxAgeMs }) {
  const cachePath = path.join(cacheDir, "_choice-maps.json");
  const cached = await readFreshCache(cachePath, maxAgeMs);
  if (cached?.problemas && cached?.origens) return cached;

  for (const arkmedsId of arkmedsIds.slice(0, 10)) {
    const response = await fetchWithRetry(`${baseUrl}/ordem_servico/${arkmedsId}/`, {
      headers: { cookie, referer: `${baseUrl}/ordem_servico/` },
    });
    const html = await response.text();
    if (/usuarios\/conectar|name="username"/i.test(html)) throw new Error("Sessao ArkMeds expirada.");
    if (!response.ok) continue;

    const choiceMaps = parseChoiceMaps(html);
    if (!Object.keys(choiceMaps.problemas).length || !Object.keys(choiceMaps.origens).length) continue;
    await fs.writeFile(cachePath, JSON.stringify(choiceMaps, null, 2), "utf8");
    return choiceMaps;
  }

  throw new Error("Nao foi possivel carregar os catalogos de problema e origem do ArkMeds.");
}

async function readFreshCache(cachePath, maxAgeMs) {
  try {
    const stat = await fs.stat(cachePath);
    if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
    return JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch {
    return null;
  }
}

export async function loadArkmedsOsDetails({
  ids,
  baseUrl,
  cookie,
  cacheDir,
  concurrency = 6,
  maxAgeMs = 6 * 60 * 60 * 1000,
  onProgress,
}) {
  const uniqueIds = [...new Set(ids.map(Number).filter(Boolean))];
  const detailsById = new Map();
  const errors = [];
  let fetched = 0;
  let cached = 0;
  let completed = 0;
  let cursor = 0;

  await fs.mkdir(cacheDir, { recursive: true });
  const choiceMaps = uniqueIds.length
    ? await loadChoiceMaps({ baseUrl, cookie, arkmedsIds: uniqueIds, cacheDir, maxAgeMs })
    : { problemas: {}, origens: {} };

  const worker = async () => {
    while (cursor < uniqueIds.length) {
      const index = cursor;
      cursor += 1;
      const arkmedsId = uniqueIds[index];
      const cachePath = path.join(cacheDir, `${arkmedsId}.json`);

      try {
        let detail = await readFreshCache(cachePath, maxAgeMs);
        if (detail) {
          cached += 1;
        } else {
          detail = await fetchArkmedsOsDetail({ baseUrl, cookie, arkmedsId, choiceMaps });
          await fs.writeFile(
            cachePath,
            JSON.stringify({ ...detail, arkmeds_id: arkmedsId, fetched_at: new Date().toISOString() }, null, 2),
            "utf8"
          );
          fetched += 1;
        }
        detail = normalizeDetail(detail);
        detailsById.set(arkmedsId, detail);
      } catch (error) {
        errors.push({ arkmeds_id: arkmedsId, erro: error.message });
      } finally {
        completed += 1;
        onProgress?.({ completed, total: uniqueIds.length, fetched, cached, errors: errors.length });
      }
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, uniqueIds.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { detailsById, errors, fetched, cached };
}

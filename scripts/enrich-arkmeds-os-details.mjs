import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadArkmedsOsDetails } from "./lib/arkmeds-os-details.mjs";

const { Client } = pg;
const root = process.cwd();
const baseUrl = "https://aci.arkmeds.com";
const outputDir = path.join(root, "outputs", "sincronizacao-os");
const cacheDir = path.join(outputDir, "detalhes-cache");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const execute = process.argv.includes("--execute");
const scopeAll = process.argv.includes("--scope=all");
const refresh = process.argv.includes("--refresh");
const numberArg = process.argv.find((arg) => arg.startsWith("--numero="));
const numero = numberArg?.split("=")[1] || null;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number.parseInt(limitArg?.split("=")[1] || "600", 10) || 600;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Number.parseInt(concurrencyArg?.split("=")[1] || "8", 10) || 8;
const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Number.parseInt(batchSizeArg?.split("=")[1] || "500", 10) || 500;

if (!process.env.SUPABASE_DB_URL) {
  console.error("Configure SUPABASE_DB_URL.");
  process.exit(1);
}

const isBlank = (value) => !String(value ?? "").trim();

async function cookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  return state.cookies
    .filter((item) => item.domain.includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  try {
    const conditions = ["arkmeds_os_id is not null"];
    const params = [];
    if (!scopeAll) {
      conditions.push("observacoes like '%Sincronizado do ArkMeds. ID ArkMeds:%'");
    }
    if (numero) {
      params.push(numero);
      conditions.push(`numero = $${params.length}`);
    }
    params.push(limit);

    const rowsResult = await client.query(
      `select id, numero, arkmeds_os_id, problema_relatado, origem_problema, descricao_servico
       from public.ordens_servico
       where ${conditions.join(" and ")}
         and (
           nullif(btrim(problema_relatado), '') is null
           or nullif(btrim(origem_problema), '') is null
           or nullif(btrim(descricao_servico), '') is null
         )
       order by numero_ordem desc nulls last
       limit $${params.length}`,
      params
    );
    const rows = rowsResult.rows;
    const rowByArkmedsId = new Map(rows.map((row) => [Number(row.arkmeds_os_id), row]));

    let lastProgress = 0;
    const detailResult = await loadArkmedsOsDetails({
      ids: rows.map((row) => row.arkmeds_os_id),
      baseUrl,
      cookie: await cookieHeader(),
      cacheDir,
      concurrency,
      maxAgeMs: refresh ? 0 : 30 * 24 * 60 * 60 * 1000,
      onProgress: ({ completed, total, fetched, cached, errors }) => {
        if (completed === total || completed - lastProgress >= 25) {
          lastProgress = completed;
          console.log(`Detalhes ${completed}/${total} (rede: ${fetched}, cache: ${cached}, erros: ${errors})`);
        }
      },
    });

    const updates = [];
    for (const [arkmedsId, detail] of detailResult.detailsById) {
      const row = rowByArkmedsId.get(arkmedsId);
      if (!row) continue;
      const payload = {
        problema_relatado: isBlank(row.problema_relatado) ? detail.problema_relatado || null : null,
        origem_problema: isBlank(row.origem_problema) ? detail.origem_problema || null : null,
        descricao_servico: isBlank(row.descricao_servico) ? detail.descricao_servico || null : null,
      };
      const preenchimentos = Object.entries(payload)
        .filter(([, value]) => value)
        .map(([field]) => field);
      updates.push({
        id: row.id,
        numero: row.numero,
        arkmeds_os_id: arkmedsId,
        preenchimentos,
        ...payload,
      });
    }

    if (execute) {
      const pendingUpdates = updates.filter((item) => item.preenchimentos.length);
      for (let offset = 0; offset < pendingUpdates.length; offset += batchSize) {
        const batch = pendingUpdates.slice(offset, offset + batchSize);
        const values = [];
        const placeholders = batch.map((item, index) => {
          const base = index * 4;
          values.push(item.id, item.problema_relatado, item.origem_problema, item.descricao_servico);
          return `($${base + 1}::uuid, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text)`;
        });

        await client.query("begin");
        try {
          await client.query(
            `with dados(id, problema_relatado, origem_problema, descricao_servico) as (
               values ${placeholders.join(",")}
             )
             update public.ordens_servico os
             set problema_relatado = case
                   when nullif(btrim(os.problema_relatado), '') is null and dados.problema_relatado is not null
                     then dados.problema_relatado else os.problema_relatado end,
                 origem_problema = case
                   when nullif(btrim(os.origem_problema), '') is null and dados.origem_problema is not null
                     then dados.origem_problema else os.origem_problema end,
                 descricao_servico = case
                   when nullif(btrim(os.descricao_servico), '') is null and dados.descricao_servico is not null
                     then dados.descricao_servico else os.descricao_servico end,
                 updated_at = now()
             from dados
             where os.id = dados.id`,
            values
          );
          await client.query("commit");
          console.log(`Banco ${Math.min(offset + batch.length, pendingUpdates.length)}/${pendingUpdates.length}`);
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }

    const report = {
      gerado_em: new Date().toISOString(),
      modo: execute ? "execute" : "dry-run",
      escopo: scopeAll ? "todas_arkmeds" : "sincronizadas_recentes",
      numero: numero || null,
      selecionadas: rows.length,
      detalhes_lidos: detailResult.detailsById.size,
      cache: detailResult.cached,
      rede: detailResult.fetched,
      erros: detailResult.errors,
      os_com_algum_preenchimento: updates.filter((item) => item.preenchimentos.length).length,
      campos: {
        problema_relatado: updates.filter((item) => item.problema_relatado).length,
        origem_problema: updates.filter((item) => item.origem_problema).length,
        descricao_servico: updates.filter((item) => item.descricao_servico).length,
      },
      atualizacoes: updates,
    };

    const suffix = execute ? "execute" : "dry_run";
    const reportPath = path.join(outputDir, `enriquecimento_detalhes_${suffix}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({ ...report, atualizacoes: undefined }, null, 2));
    console.log(`Relatorio: ${reportPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

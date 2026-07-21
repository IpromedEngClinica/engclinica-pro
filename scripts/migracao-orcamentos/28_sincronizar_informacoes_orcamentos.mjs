import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";
import {
  arkmedsBaseUrl,
  extractArkmedsMoreInformation,
  fetchArkmedsText,
  inferOrcamentoEditPath,
  outputDir,
  readArkmedsCookieHeader,
} from "./lib.mjs";

const applyChanges = process.argv.includes("--apply");
const skipFetchMissing = process.argv.includes("--skip-fetch-missing");
const onlyEmptyDestination = process.argv.includes("--only-empty-destination");
const pdfFallback = !process.argv.includes("--no-pdf-fallback");
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const concurrency = Math.max(1, Number.parseInt(concurrencyArg?.split("=")[1] || "10", 10));
const limit = limitArg ? Math.max(1, Number.parseInt(limitArg.split("=")[1], 10)) : null;
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!databaseUrl) throw new Error("Configure SUPABASE_DB_URL.");

const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchInformation(row) {
  const pathname = inferOrcamentoEditPath(row.arkmeds_tipo_texto, row.arkmeds_orcamento_id);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const page = await fetchArkmedsText(pathname);
      const informacoes = extractArkmedsMoreInformation(page.text);
      if (!informacoes && pdfFallback) {
        return await fetchInformationFromPdf(row, pathname);
      }
      return {
        arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
        informacoes,
        origem: "tela_edicao",
        pathname,
        erro: null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(400 * attempt);
    }
  }
  if (pdfFallback) {
    try {
      return await fetchInformationFromPdf(row, pathname);
    } catch (pdfError) {
      lastError = new Error(`${lastError?.message || "Tela de edicao indisponivel"}; PDF: ${pdfError.message}`);
    }
  }
  return {
    arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
    informacoes: null,
    origem: null,
    pathname,
    erro: lastError?.message || "Falha desconhecida",
  };
}

function extractInformationSection(pdfText) {
  const text = String(pdfText || "").replace(/\r/g, "");
  const marker = /Informa(?:coes|ções)\s+t(?:e|é)cnicas\s*:/i.exec(text);
  if (!marker) return null;

  const remainder = text.slice(marker.index + marker[0].length);
  const endMarker = /\n\s*(?:Pagamento|Autorizacao para realizacao|Autorização para realização|Assistencia Tecnica|Assistência Técnica)\b/i.exec(remainder);
  const section = (endMarker ? remainder.slice(0, endMarker.index) : remainder)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/^Informa(?:coes|ções)\s+t(?:e|é)cnicas\s*:\s*/i, "")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return section || null;
}

async function fetchInformationFromPdf(row, editPathname) {
  const cookie = await readArkmedsCookieHeader();
  const pathname = `/orcamento/${row.arkmeds_orcamento_id}/imprimir/`;
  const response = await fetch(`${arkmedsBaseUrl}${pathname}`, {
    headers: {
      cookie,
      accept: "application/pdf,*/*;q=0.8",
      referer: `${arkmedsBaseUrl}/orcamento/`,
    },
  });
  if (!response.ok) throw new Error(`ArkMeds HTTP ${response.status} em ${pathname}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 4).toString("utf-8") !== "%PDF") {
    throw new Error(`Resposta de ${pathname} nao e um PDF`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ipromed-orcamento-"));
  const pdfPath = path.join(tempDir, `${row.arkmeds_orcamento_id}.pdf`);
  const textPath = path.join(tempDir, `${row.arkmeds_orcamento_id}.txt`);
  try {
    await fs.writeFile(pdfPath, buffer);
    await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath]);
    const informacoes = extractInformationSection(await fs.readFile(textPath, "utf-8"));
    return {
      arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
      informacoes,
      origem: informacoes ? "pdf_original" : null,
      pathname: editPathname,
      erro: informacoes ? null : `Secao Informacoes tecnicas nao encontrada em ${pathname}`,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function mapConcurrent(rows, worker) {
  const results = new Array(rows.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(rows[index], index);
      const completed = results.filter(Boolean).length;
      if (completed % 100 === 0 || completed === rows.length) {
        console.log(`Coleta ArkMeds: ${completed}/${rows.length}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const columns = [
    "arkmeds_orcamento_id",
    "numero",
    "acao",
    "detalhes_anteriores",
    "informacoes_arkmeds",
    "origem_informacoes",
    "erro",
  ];
  return [
    columns.join(";"),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(";")),
  ].join("\n");
}

async function main() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: "ipromed-sincronizar-informacoes-orcamentos",
  });
  await client.connect();

  try {
    const { rows: importedRows } = await client.query(`
      select
        o.id as orcamento_id,
        o.numero,
        o.arkmeds_orcamento_id,
        o.detalhes_orcamento,
        s.id as staging_id,
        s.arkmeds_tipo_texto,
        s.observacoes_gerais
      from public.orcamentos o
      join public.staging_arkmeds_orcamentos s
        on s.arkmeds_orcamento_id = o.arkmeds_orcamento_id
      where o.origem_migracao = 'arkmeds'
        and o.arkmeds_orcamento_id is not null
      order by o.arkmeds_orcamento_id
    `);

    const scopedRows = onlyEmptyDestination
      ? importedRows.filter((row) => !String(row.detalhes_orcamento || "").trim())
      : importedRows;
    const rows = limit ? scopedRows.slice(0, limit) : scopedRows;
    const missingSource = skipFetchMissing
      ? []
      : rows.filter((row) => !String(row.observacoes_gerais || "").trim());
    console.log(JSON.stringify({
      modo: applyChanges ? "aplicar" : "simular",
      importados: rows.length,
      fonte_ja_coletada: rows.length - missingSource.length,
      fonte_a_coletar: missingSource.length,
      coleta_ausentes_ignorada: skipFetchMissing,
      fallback_pdf: pdfFallback,
      somente_destino_vazio: onlyEmptyDestination,
      concorrencia: concurrency,
    }, null, 2));

    const fetched = await mapConcurrent(missingSource, fetchInformation);
    const fetchedById = new Map(fetched.map((item) => [item.arkmeds_orcamento_id, item]));
    const reportRows = rows.map((row) => {
      const remote = fetchedById.get(Number(row.arkmeds_orcamento_id));
      const source = String(remote?.informacoes ?? row.observacoes_gerais ?? "").trim() || null;
      const current = String(row.detalhes_orcamento ?? "").trim() || null;
      return {
        arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
        numero: row.numero,
        acao: !source ? "sem_informacoes_na_origem" : source === current ? "sem_alteracao" : "atualizar",
        detalhes_anteriores: current,
        informacoes_arkmeds: source,
        origem_informacoes: remote?.origem || (row.observacoes_gerais ? "staging" : null),
        erro: remote?.erro || null,
      };
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportDir = path.join(outputDir, "sincronizacao-informacoes");
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(
      path.join(reportDir, `backup_e_resultado_${timestamp}.json`),
      JSON.stringify(reportRows, null, 2),
      "utf-8",
    );
    await fs.writeFile(
      path.join(reportDir, `backup_e_resultado_${timestamp}.csv`),
      toCsv(reportRows),
      "utf-8",
    );

    if (applyChanges) {
      const collected = fetched.filter((item) => item.informacoes);
      await client.query("begin");
      try {
        if (collected.length) {
          await client.query(`
            update public.staging_arkmeds_orcamentos s
            set observacoes_gerais = x.informacoes,
                detalhes_atualizado_em = now(),
                atualizado_em = now()
            from jsonb_to_recordset($1::jsonb)
              as x(arkmeds_orcamento_id integer, informacoes text)
            where s.arkmeds_orcamento_id = x.arkmeds_orcamento_id
          `, [JSON.stringify(collected)]);
        }

        const targetIds = reportRows
          .filter((row) => row.acao === "atualizar")
          .map((row) => row.arkmeds_orcamento_id);
        if (targetIds.length) {
          await client.query(`
            update public.orcamentos o
            set detalhes_orcamento = s.observacoes_gerais,
                updated_at = now()
            from public.staging_arkmeds_orcamentos s
            where o.origem_migracao = 'arkmeds'
              and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
              and o.arkmeds_orcamento_id = any($1::integer[])
              and nullif(btrim(s.observacoes_gerais), '') is not null
          `, [targetIds]);
        }

        await client.query(`
          insert into public.migracao_arkmeds_logs
            (tipo_execucao, entidade, status, mensagem, payload_json)
          values ('importacao_real', 'orcamentos_informacoes', 'concluido',
            'Informacoes tecnicas dos orcamentos sincronizadas do ArkMeds.', $1::jsonb)
        `, [JSON.stringify({
          total: rows.length,
          atualizados: targetIds.length,
          coletados_agora: collected.length,
          erros: fetched.filter((item) => item.erro).length,
        })]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const summary = {
      modo: applyChanges ? "aplicado" : "simulado",
      total: rows.length,
      atualizaveis: reportRows.filter((row) => row.acao === "atualizar").length,
      sem_alteracao: reportRows.filter((row) => row.acao === "sem_alteracao").length,
      sem_informacoes_na_origem: reportRows.filter((row) => row.acao === "sem_informacoes_na_origem").length,
      coletados_agora: fetched.filter((item) => item.informacoes).length,
      coletados_pdf: fetched.filter((item) => item.origem === "pdf_original").length,
      erros_coleta: fetched.filter((item) => item.erro).length,
      relatorio: reportDir,
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

await main();

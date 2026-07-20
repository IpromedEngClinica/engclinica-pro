import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  arkmedsStatusLabel,
  cleanText,
  ensureOutputDir,
  fetchArkmedsJson,
  groupConfigs,
  normalizeArkmedsStatusGroup,
  outputDir,
  parseArkmedsDate,
  parseArkmedsInteger,
  parseArkmedsNumber,
  writeCsv,
} from "./lib.mjs";

const { Client } = pg;
const pageSize = 250;
const reportDir = path.join(outputDir, "conferencia-status-atual");

const destinationByGroup = {
  pendentes: "pendente",
  aprovados_em_curso: "aprovado",
  reprovados_em_curso: "reprovado",
  faturados: "faturado",
  cancelados: "cancelado",
  recusados: "recusado",
};

const destinationBySpreadsheet = {
  pendente: "pendente",
  aprovado: "aprovado",
  reprovado: "reprovado",
  faturado: "faturado",
  cancelado: "cancelado",
  recusado: "recusado",
};

function normalizeKey(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function spreadsheetDestination(value) {
  return destinationBySpreadsheet[normalizeKey(value)] || null;
}

function listPath(group, start, draw) {
  const params = new URLSearchParams({
    draw: String(draw),
    start: String(start),
    length: String(pageSize),
    "search[value]": "",
    "search[regex]": "false",
    _: String(Date.now()),
  });
  const columns = ["id", "id", "id", "id", "id", "id", "numero", "id", "tipo_trans", "solicitante_str", "data_criacao", "data_validade", "valor_total", "id"];
  columns.forEach((name, index) => {
    params.set(`columns[${index}][data]`, name);
    params.set(`columns[${index}][name]`, "");
    params.set(`columns[${index}][searchable]`, "true");
    params.set(`columns[${index}][orderable]`, "true");
    params.set(`columns[${index}][search][value]`, "");
    params.set(`columns[${index}][search][regex]`, "false");
  });
  params.set("order[0][column]", "6");
  params.set("order[0][dir]", "asc");
  group.tipo.forEach((tipo) => params.append("tipo_orcamento[]", tipo));
  return `/orcamento/api/list_orcamentos_paginados/?${params}`;
}

async function collectLive() {
  const rows = [];
  for (const group of groupConfigs) {
    let start = 0;
    let draw = 1;
    let total = null;
    do {
      const payload = await fetchArkmedsJson(listPath(group, start, draw));
      const page = Array.isArray(payload.data) ? payload.data : [];
      total = Number(payload.recordsFiltered ?? payload.recordsTotal ?? 0);
      rows.push(...page.map((row) => ({
        arkmeds_orcamento_id: parseArkmedsInteger(row.id),
        numero: cleanText(row.numero) || null,
        solicitante: cleanText(row.solicitante_str) || null,
        data_criacao: parseArkmedsDate(row.data_criacao),
        valor_total: parseArkmedsNumber(row.valor_total),
        status_grupo: group.key,
        status_label: arkmedsStatusLabel(group.key),
        status_normalizado: normalizeArkmedsStatusGroup(group.key),
        status_ipromed: destinationByGroup[group.key] || null,
      })).filter((row) => row.arkmeds_orcamento_id));
      start += page.length || pageSize;
      draw += 1;
      if (!page.length) break;
    } while (start < total);
    console.log(`${group.key}: ${rows.filter((row) => row.status_grupo === group.key).length}`);
  }
  return rows;
}

async function loadIpromed() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(`
      select
        s.arkmeds_orcamento_id,
        s.arkmeds_orcamento_numero,
        s.arkmeds_solicitante,
        s.arkmeds_status_planilha,
        s.arkmeds_status_grupo as staging_status_grupo,
        s.arkmeds_data_criacao,
        s.arkmeds_valor_total,
        o.id as orcamento_ipromed_id,
        o.status as status_ipromed,
        o.updated_at as atualizado_ipromed_em
      from public.staging_arkmeds_orcamentos s
      left join public.orcamentos o
        on o.origem_migracao = 'arkmeds'
       and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
    `);
    return rows;
  } finally {
    await client.end();
  }
}

async function main() {
  await ensureOutputDir();
  await fs.mkdir(reportDir, { recursive: true });
  const [liveRows, ipromedRows] = await Promise.all([collectLive(), loadIpromed()]);
  const liveById = new Map();
  const duplicateIds = new Set();
  for (const row of liveRows) {
    if (liveById.has(row.arkmeds_orcamento_id)) duplicateIds.add(row.arkmeds_orcamento_id);
    liveById.set(row.arkmeds_orcamento_id, row);
  }
  const ipromedById = new Map(ipromedRows.map((row) => [Number(row.arkmeds_orcamento_id), row]));

  const comparison = [...new Set([...liveById.keys(), ...ipromedById.keys()])].map((id) => {
    const live = liveById.get(id) || {};
    const stored = ipromedById.get(id) || {};
    const planStatus = spreadsheetDestination(stored.arkmeds_status_planilha);
    return {
      arkmeds_orcamento_id: id,
      numero: live.numero || stored.arkmeds_orcamento_numero || null,
      solicitante: live.solicitante || stored.arkmeds_solicitante || null,
      data_criacao: live.data_criacao || stored.arkmeds_data_criacao || null,
      valor_total: live.valor_total ?? stored.arkmeds_valor_total ?? null,
      status_planilha: stored.arkmeds_status_planilha || null,
      status_planilha_ipromed: planStatus,
      status_arkmeds_atual: live.status_label || null,
      status_arkmeds_ipromed: live.status_ipromed || null,
      status_ipromed_atual: stored.status_ipromed || null,
      presente_planilha: stored.arkmeds_status_planilha ? "sim" : "nao",
      presente_arkmeds: live.arkmeds_orcamento_id ? "sim" : "nao",
      importado_ipromed: stored.orcamento_ipromed_id ? "sim" : "nao",
      divergencia_planilha_arkmeds: planStatus && live.status_ipromed && planStatus !== live.status_ipromed ? "sim" : "nao",
      divergencia_ipromed_arkmeds: stored.status_ipromed && live.status_ipromed && stored.status_ipromed !== live.status_ipromed ? "sim" : "nao",
      recomendacao_status: live.status_ipromed || planStatus || stored.status_ipromed || null,
    };
  }).sort((a, b) => Number(b.arkmeds_orcamento_id) - Number(a.arkmeds_orcamento_id));

  const columns = Object.keys(comparison[0] || {});
  await writeCsv(path.join(reportDir, "comparacao_completa.csv"), comparison, columns);
  await writeCsv(
    path.join(reportDir, "divergencias_planilha_arkmeds.csv"),
    comparison.filter((row) => row.divergencia_planilha_arkmeds === "sim"),
    columns
  );
  await writeCsv(
    path.join(reportDir, "divergencias_ipromed_arkmeds.csv"),
    comparison.filter((row) => row.divergencia_ipromed_arkmeds === "sim"),
    columns
  );
  await writeCsv(
    path.join(reportDir, "novos_arkmeds_ausentes_planilha.csv"),
    comparison.filter((row) => row.presente_arkmeds === "sim" && row.presente_planilha === "nao"),
    columns
  );
  await fs.writeFile(path.join(reportDir, "snapshot_arkmeds_atual.json"), JSON.stringify(liveRows, null, 2), "utf8");

  const summary = {
    gerado_em: new Date().toISOString(),
    modo_arkmeds: "somente_leitura",
    total_arkmeds_atual: liveById.size,
    total_staging: ipromedRows.length,
    total_importado_ipromed: comparison.filter((row) => row.importado_ipromed === "sim").length,
    ids_duplicados_entre_status_arkmeds: [...duplicateIds],
    divergencias_planilha_arkmeds: comparison.filter((row) => row.divergencia_planilha_arkmeds === "sim").length,
    divergencias_ipromed_arkmeds: comparison.filter((row) => row.divergencia_ipromed_arkmeds === "sim").length,
    novos_arkmeds_ausentes_planilha: comparison.filter((row) => row.presente_arkmeds === "sim" && row.presente_planilha === "nao").length,
    ausentes_arkmeds_presentes_staging: comparison.filter((row) => row.presente_arkmeds === "nao").length,
    status_arkmeds: Object.fromEntries(groupConfigs.map((group) => [group.key, liveRows.filter((row) => row.status_grupo === group.key).length])),
  };
  await fs.writeFile(path.join(reportDir, "resumo.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

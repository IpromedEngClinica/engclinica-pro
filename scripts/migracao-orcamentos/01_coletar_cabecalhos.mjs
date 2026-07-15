import fs from "node:fs/promises";
import path from "node:path";
import {
  arkmedsBaseUrl,
  arkmedsStatusLabel,
  asBoolean,
  asTextOrNull,
  buildIdentifier,
  ensureOutputDir,
  fetchArkmedsJson,
  groupConfigs,
  logMigration,
  normalizarNumeroBaseOrcamento,
  outputDir,
  parseArkmedsDate,
  parseArkmedsInteger,
  parseArkmedsNumber,
  requireSupabase,
  normalizeArkmedsStatusGroup,
  statusImportPolicy,
} from "./lib.mjs";

const supabase = requireSupabase();
const lengthArg = process.argv.find((arg) => arg.startsWith("--page-size="));
const pageSize = Number.parseInt(lengthArg?.split("=")[1] || "500", 10) || 500;
const maxArg = process.argv.find((arg) => arg.startsWith("--max="));
const maxRows = maxArg ? Number.parseInt(maxArg.split("=")[1], 10) : null;

const columnNames = [
  "id",
  "id",
  "id",
  "id",
  "id",
  "id",
  "numero",
  "id",
  "tipo_trans",
  "solicitante_str",
  "data_criacao",
  "data_validade",
  "valor_total",
  "id",
];

function buildListPath(group, start, draw) {
  const params = new URLSearchParams();
  params.set("draw", String(draw));

  columnNames.forEach((name, index) => {
    params.set(`columns[${index}][data]`, name);
    params.set(`columns[${index}][name]`, "");
    params.set(`columns[${index}][searchable]`, ["numero", "tipo_trans", "solicitante_str", "data_criacao", "data_validade", "valor_total"].includes(name) ? "true" : "false");
    params.set(`columns[${index}][orderable]`, ["numero", "tipo_trans", "solicitante_str", "data_criacao", "data_validade", "valor_total"].includes(name) ? "true" : "false");
    params.set(`columns[${index}][search][value]`, "");
    params.set(`columns[${index}][search][regex]`, "false");
  });

  params.set("order[0][column]", "6");
  params.set("order[0][dir]", "asc");
  params.set("start", String(start));
  params.set("length", String(pageSize));
  params.set("search[value]", "");
  params.set("search[regex]", "false");
  for (const tipo of group.tipo) params.append("tipo_orcamento[]", tipo);
  params.set("_", String(Date.now()));

  return `/orcamento/api/list_orcamentos_paginados/?${params.toString()}`;
}

function buildRequestAudit(group, start, draw, pathName) {
  return {
    endpoint: "/orcamento/api/list_orcamentos_paginados/",
    metodo: "GET",
    grupo: group.key,
    label: group.label,
    tipo_orcamento: group.tipo,
    status_normalizado: group.statusNormalizado,
    start,
    length: pageSize,
    draw,
    pathName,
  };
}

function normalizeHeader(row, group, requestAudit) {
  const arkmedsId = parseArkmedsInteger(row.id);
  const osNumero = asTextOrNull(row.ordem_servico_numero);
  const osId = asTextOrNull(row.ordem_servico_id);
  const numero = asTextOrNull(row.numero);
  const numeroInfo = normalizarNumeroBaseOrcamento(numero);
  const cliente = asTextOrNull(row.solicitante_str);
  const dataCriacao = parseArkmedsDate(row.data_criacao);
  const tipoTexto = asTextOrNull(row.tipo_trans || row.tipo_str);

  let classificacao = "sem_os_avulso";

  if (osId || osNumero) {
    classificacao = "com_os_confirmada";
  } else if (!cliente || !numero || !dataCriacao) {
    classificacao = "pendente_validacao";
  } else if (numeroInfo.baseNumber != null && numeroInfo.baseNumber <= 1373) {
    classificacao = "provavel_avulso_numero_baixo";
  }

  const normalized = {
    arkmeds_orcamento_id: arkmedsId,
    arkmeds_orcamento_numero: numero,
    arkmeds_orcamento_numero_original: numeroInfo.original,
    arkmeds_orcamento_numero_base: numeroInfo.base,
    arkmeds_orcamento_sufixo: numeroInfo.sufixo,
    possui_sufixo_correcao: numeroInfo.possuiSufixo,
    arkmeds_tipo_codigo: parseArkmedsInteger(row.tipo),
    arkmeds_tipo_texto: tipoTexto,
    arkmeds_status_grupo: group.key,
    arkmeds_status_label: arkmedsStatusLabel(group.key),
    arkmeds_status_original: group.label,
    status_normalizado_importacao: normalizeArkmedsStatusGroup(group.key),
    politica_importacao_status: statusImportPolicy(group.key),
    arkmeds_valor_total: parseArkmedsNumber(row.valor_total),
    arkmeds_solicitante: cliente,
    arkmeds_data_criacao: dataCriacao,
    arkmeds_data_validade: parseArkmedsDate(row.data_validade),
    arkmeds_email_solicitante: asTextOrNull(row.email_solicitante),
    arkmeds_ordem_servico_id: osId,
    arkmeds_ordem_servico_numero: osNumero,
    arkmeds_has_attachment: asBoolean(row.has_attachment),
    arkmeds_already_generate_os: asBoolean(row.already_generate_os),
    pdf_original_url: arkmedsId ? `${arkmedsBaseUrl}/orcamento/${arkmedsId}/imprimir/` : null,
    origem_migracao: "arkmeds_orcamentos_web",
    classificacao_vinculo_os: classificacao,
    ordem_servico_id_resolvida: null,
    status_validacao: "pendente_itens",
    motivos_validacao: ["ITENS_NAO_COLETADOS"],
    parametros_coleta_json: requestAudit,
    dados_brutos_json: { ...row, _grupo_label: group.label, _grupo_key: group.key, _parametros_coleta: requestAudit },
  };

  normalized.identificador_migracao = buildIdentifier(normalized);
  return normalized;
}

async function upsertHeaders(headers) {
  if (!headers.length) return;

  const { error } = await supabase
    .from("staging_arkmeds_orcamentos")
    .upsert(headers, { onConflict: "arkmeds_orcamento_id" });

  if (error) {
    throw new Error(`Erro ao salvar staging_arkmeds_orcamentos: ${error.message}`);
  }
}

async function collectGroup(group) {
  let start = 0;
  let draw = 1;
  let recordsTotal = null;
  let collected = 0;
  const sample = [];

  await logMigration(supabase, {
    entidade: "orcamentos",
    status: "inicio",
    mensagem: `Inicio coleta cabecalhos ${group.key}`,
    payload_json: { group, pageSize, maxRows },
  });

  while (recordsTotal == null || start < recordsTotal) {
    if (maxRows != null && collected >= maxRows) break;

    const pathName = buildListPath(group, start, draw);
    const requestAudit = buildRequestAudit(group, start, draw, pathName);
    let payload;

    try {
      payload = await fetchArkmedsJson(pathName);
    } catch (error) {
      await logMigration(supabase, {
        entidade: "orcamentos",
        status: "erro_pagina",
        mensagem: error.message,
        payload_json: { group: group.key, start, pageSize },
      });
      throw error;
    }

    recordsTotal = Number(payload.recordsFiltered ?? payload.recordsTotal ?? 0);
    const pageRows = Array.isArray(payload.data) ? payload.data : [];
    const limitedRows = maxRows == null ? pageRows : pageRows.slice(0, Math.max(0, maxRows - collected));
    const headers = limitedRows
      .map((row) => normalizeHeader(row, group, requestAudit))
      .filter((row) => row.arkmeds_orcamento_id);

    await upsertHeaders(headers);
    sample.push(...headers.slice(0, Math.max(0, 5 - sample.length)));

    collected += headers.length;
    start += pageRows.length || pageSize;
    draw += 1;

    await logMigration(supabase, {
      entidade: "orcamentos",
      status: "pagina",
      mensagem: `Pagina coletada ${group.key}`,
      payload_json: { ...requestAudit, pageRows: pageRows.length, collected, recordsTotal },
    });

    if (!pageRows.length) break;
  }

  await logMigration(supabase, {
    entidade: "orcamentos",
    status: "fim",
    mensagem: `Fim coleta cabecalhos ${group.key}`,
    payload_json: { group: group.key, collected, recordsTotal },
  });

  return { group: group.key, label: group.label, collected, recordsTotal, sample };
}

async function main() {
  await ensureOutputDir();
  const startedAt = new Date().toISOString();
  const summaries = [];

  await logMigration(supabase, {
    entidade: "orcamentos",
    status: "inicio",
    mensagem: "Inicio coleta cabecalhos de orcamentos ArkMeds",
  });

  for (const group of groupConfigs) {
    summaries.push(await collectGroup(group));
  }

  const result = {
    dry_run: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    pageSize,
    maxRows,
    summaries,
    totalCollected: summaries.reduce((sum, item) => sum + item.collected, 0),
  };

  await fs.writeFile(
    path.join(outputDir, "coleta_cabecalhos_resultado.json"),
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  await logMigration(supabase, {
    entidade: "orcamentos",
    status: "fim",
    mensagem: "Fim coleta cabecalhos de orcamentos ArkMeds",
    payload_json: result,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await logMigration(supabase, {
      entidade: "orcamentos",
      status: "erro",
      mensagem: error.message,
    });
  } catch {
    // ignore logging failure
  }
  process.exit(1);
});

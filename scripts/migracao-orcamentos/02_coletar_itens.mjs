import fs from "node:fs/promises";
import path from "node:path";
import {
  asTextOrNull,
  cleanText,
  ensureOutputDir,
  expectedItemEndpoints,
  fetchArkmedsJson,
  isMixedBudget,
  logMigration,
  parseArkmedsInteger,
  parseArkmedsNumber,
  outputDir,
  requireSupabase,
  supabaseAll,
} from "./lib.mjs";

const supabase = requireSupabase();
const maxArg = process.argv.find((arg) => arg.startsWith("--max="));
const maxRows = maxArg ? Number.parseInt(maxArg.split("=")[1], 10) : null;

function firstText(item, keys) {
  for (const key of keys) {
    const text = asTextOrNull(item[key]);
    if (text) return text;
  }
  return null;
}

function normalizeServiceItem(staging, item) {
  const quantidade = parseArkmedsNumber(item.quantidade) ?? 0;
  const valorUnitario = parseArkmedsNumber(item.valor_unitario) ?? 0;
  return {
    staging_orcamento_id: staging.id,
    arkmeds_orcamento_id: staging.arkmeds_orcamento_id,
    arkmeds_item_id: parseArkmedsInteger(item.id),
    tipo_item: "servico",
    descricao: asTextOrNull(item.servico_descricao),
    quantidade,
    garantia: parseArkmedsInteger(item.garantia),
    valor_unitario: valorUnitario,
    valor_total_calculado: Number((quantidade * valorUnitario).toFixed(2)),
    observacoes: asTextOrNull(item.observacoes),
    arkmeds_servico_id: parseArkmedsInteger(item.servico),
    arkmeds_peca_id: null,
    peca_tipo_descricao: null,
    unidade_medida: null,
    modelo_fabricante: firstText(item, ["modelo_fabricante", "modeloFabricante", "modelo", "fabricante"]),
    dados_brutos_json: item,
  };
}

function normalizePartItem(staging, item) {
  const quantidade = parseArkmedsNumber(item.quantidade) ?? 0;
  const valorUnitario = parseArkmedsNumber(item.valor_unitario) ?? 0;
  return {
    staging_orcamento_id: staging.id,
    arkmeds_orcamento_id: staging.arkmeds_orcamento_id,
    arkmeds_item_id: parseArkmedsInteger(item.id),
    tipo_item: "peca",
    descricao: asTextOrNull(item.peca_descricao),
    quantidade,
    garantia: parseArkmedsInteger(item.garantia),
    valor_unitario: valorUnitario,
    valor_total_calculado: Number((quantidade * valorUnitario).toFixed(2)),
    observacoes: asTextOrNull(item.observacoes),
    arkmeds_servico_id: null,
    arkmeds_peca_id: parseArkmedsInteger(item.peca),
    peca_tipo_descricao: asTextOrNull(item.peca_tipo_descricao),
    unidade_medida: asTextOrNull(item.unidade_medida),
    modelo_fabricante: firstText(item, [
      "modelo_fabricante",
      "modeloFabricante",
      "peca_modelo_fabricante",
      "peca_modelo",
      "modelo",
      "fabricante",
    ]),
    dados_brutos_json: item,
  };
}

function itemLogicalKey(item) {
  if (item.arkmeds_item_id != null) {
    return [
      item.arkmeds_orcamento_id,
      item.arkmeds_item_id,
      item.tipo_item,
    ].join("|");
  }

  return [
    item.arkmeds_orcamento_id,
    item.tipo_item,
    cleanText(item.descricao).toLowerCase(),
    Number(item.quantidade || 0).toFixed(2),
    Number(item.valor_unitario || 0).toFixed(2),
  ].join("|");
}

function dedupeItems(items) {
  const byKey = new Map();
  for (const item of items) {
    byKey.set(itemLogicalKey(item), item);
  }
  return [...byKey.values()];
}

async function deleteItemsForBudget(arkmedsOrcamentoId) {
  const { error } = await supabase
    .from("staging_arkmeds_orcamento_itens")
    .delete()
    .eq("arkmeds_orcamento_id", arkmedsOrcamentoId);

  if (error) {
    throw new Error(`Erro ao limpar itens do orcamento ${arkmedsOrcamentoId}: ${error.message}`);
  }
}

async function saveItems(items) {
  if (!items.length) return;
  const deduped = dedupeItems(items);
  const { error } = await supabase.from("staging_arkmeds_orcamento_itens").insert(deduped);

  if (error) throw new Error(`Erro ao salvar itens: ${error.message}`);
}

async function fetchEndpoint(staging, endpoint) {
  const pathName =
    endpoint === "servicos"
      ? `/orcamento/api/carregar_servicos_orcamento/?orcamento_id=${staging.arkmeds_orcamento_id}`
      : `/orcamento/api/carregar_pecas_orcamento/?orcamento_id=${staging.arkmeds_orcamento_id}`;

  const payload = await fetchArkmedsJson(pathName);
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const normalized =
    endpoint === "servicos"
      ? rows.map((item) => normalizeServiceItem(staging, item))
      : rows.map((item) => normalizePartItem(staging, item));

  await saveItems(normalized);
  return { endpoint, count: normalized.length };
}

async function updateEndpointStatus(staging, results) {
  const statusByEndpoint = { servicos: "nao_aplicavel", pecas: "nao_aplicavel" };
  const countByEndpoint = { servicos: 0, pecas: 0 };
  const errors = [];
  const expected = expectedItemEndpoints(staging.arkmeds_tipo_texto);

  for (const result of results) {
    statusByEndpoint[result.endpoint] = result.error ? "erro" : result.count > 0 ? "ok" : "sem_retorno";
    countByEndpoint[result.endpoint] = result.count || 0;
    if (result.error) errors.push(`${result.endpoint}: ${result.error}`);
  }

  const attempted = new Set(results.map((result) => result.endpoint));
  const missingAttempts = expected.filter((endpoint) => !attempted.has(endpoint));
  const tipoMistoCompleto =
    !isMixedBudget(staging.arkmeds_tipo_texto) ||
    (attempted.has("servicos") && attempted.has("pecas") && !errors.length);
  const totalItems = countByEndpoint.servicos + countByEndpoint.pecas;
  let statusPreservacaoItens = "itens_preservados";

  if (errors.length) statusPreservacaoItens = "erro_endpoint_itens";
  else if (missingAttempts.length) statusPreservacaoItens = "endpoint_nao_tentado";
  else if (isMixedBudget(staging.arkmeds_tipo_texto) && !tipoMistoCompleto) statusPreservacaoItens = "tipo_misto_incompleto";
  else if (totalItems === 0) statusPreservacaoItens = "sem_itens_retorno";

  const { error } = await supabase
    .from("staging_arkmeds_orcamentos")
    .update({
      itens_servicos_status: statusByEndpoint.servicos,
      itens_pecas_status: statusByEndpoint.pecas,
      itens_servicos_quantidade: countByEndpoint.servicos,
      itens_pecas_quantidade: countByEndpoint.pecas,
      qtd_servicos_endpoint: countByEndpoint.servicos,
      qtd_pecas_endpoint: countByEndpoint.pecas,
      tipo_misto_completo: tipoMistoCompleto,
      tem_itens_preservados: totalItems > 0 && !errors.length && !missingAttempts.length,
      status_preservacao_itens: statusPreservacaoItens,
      erro_itens_endpoint: [...errors, ...missingAttempts.map((endpoint) => `${endpoint}: nao_tentado`)].join(" | ") || null,
      itens_ultima_coleta_quantidade: totalItems,
      itens_ultima_coleta_status: statusPreservacaoItens,
      itens_ultima_coleta_em: new Date().toISOString(),
      possui_duplicidade_itens: false,
    })
    .eq("id", staging.id);

  if (error) throw new Error(`Erro ao atualizar status de itens ${staging.arkmeds_orcamento_id}: ${error.message}`);
}

async function collectItemsFor(staging) {
  const endpoints = expectedItemEndpoints(staging.arkmeds_tipo_texto);
  const results = [];

  await deleteItemsForBudget(staging.arkmeds_orcamento_id);

  for (const endpoint of endpoints) {
    try {
      results.push(await fetchEndpoint(staging, endpoint));
    } catch (error) {
      await logMigration(supabase, {
        entidade: "orcamento_itens",
        arkmeds_id: staging.arkmeds_orcamento_id,
        identificador_migracao: staging.identificador_migracao,
        status: "erro_endpoint",
        mensagem: error.message,
        payload_json: { endpoint },
      });
      results.push({ endpoint, count: 0, error: error.message });
    }
  }

  await updateEndpointStatus(staging, results);
  return results;
}

async function main() {
  await ensureOutputDir();

  await logMigration(supabase, {
    entidade: "orcamento_itens",
    status: "inicio",
    mensagem: "Inicio coleta itens de orcamentos ArkMeds",
    payload_json: { maxRows },
  });

  let stagingRows = await supabaseAll(
    supabase,
    "staging_arkmeds_orcamentos",
    "id,arkmeds_orcamento_id,arkmeds_tipo_texto,identificador_migracao",
    (query) => query.order("arkmeds_orcamento_id", { ascending: true })
  );

  if (maxRows != null) stagingRows = stagingRows.slice(0, maxRows);

  let processed = 0;
  let totalItems = 0;
  let errors = 0;
  const samples = [];

  for (const staging of stagingRows) {
    const results = await collectItemsFor(staging);
    processed += 1;
    totalItems += results.reduce((sum, item) => sum + item.count, 0);
    errors += results.filter((item) => item.error).length;
    if (samples.length < 10) samples.push({ arkmeds_orcamento_id: staging.arkmeds_orcamento_id, results });

    if (processed % 100 === 0) {
      await logMigration(supabase, {
        entidade: "orcamento_itens",
        status: "progresso",
        mensagem: "Coleta de itens em andamento",
        payload_json: { processed, totalItems, errors },
      });
      console.log(`Itens: ${processed}/${stagingRows.length}`);
    }
  }

  const result = {
    dry_run: true,
    processed,
    totalItems,
    endpointErrors: errors,
    samples,
    finishedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(outputDir, "coleta_itens_resultado.json"),
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  await logMigration(supabase, {
    entidade: "orcamento_itens",
    status: "fim",
    mensagem: "Fim coleta itens de orcamentos ArkMeds",
    payload_json: result,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await logMigration(supabase, {
      entidade: "orcamento_itens",
      status: "erro",
      mensagem: error.message,
    });
  } catch {
    // ignore logging failure
  }
  process.exit(1);
});

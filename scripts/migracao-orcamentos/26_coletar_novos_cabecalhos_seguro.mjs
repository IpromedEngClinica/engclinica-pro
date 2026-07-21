import fs from "node:fs/promises";
import path from "node:path";
import {
  arkmedsBaseUrl,
  arkmedsStatusLabel,
  asBoolean,
  asTextOrNull,
  buildIdentifier,
  extractArkmedsMoreInformation,
  fetchArkmedsJson,
  fetchArkmedsText,
  groupConfigs,
  inferOrcamentoEditPath,
  normalizarNumeroBaseOrcamento,
  normalizeArkmedsStatusGroup,
  outputDir,
  parseArkmedsDate,
  parseArkmedsInteger,
  parseArkmedsNumber,
  requireSupabase,
  statusImportPolicy,
  supabaseAll,
} from "./lib.mjs";

const supabase = requireSupabase();
const SNAPSHOT_FILE = path.join(
  outputDir,
  "conferencia-status-atual",
  "snapshot_arkmeds_atual.json",
);
const EXCLUDED_IDS = new Set([3843, 3845]);
const columnNames = [
  "id", "id", "id", "id", "id", "id", "numero", "id", "tipo_trans",
  "solicitante_str", "data_criacao", "data_validade", "valor_total", "id",
];

function buildSearchPath(group, numero) {
  const params = new URLSearchParams();
  params.set("draw", "1");
  columnNames.forEach((name, index) => {
    params.set(`columns[${index}][data]`, name);
    params.set(`columns[${index}][name]`, "");
    params.set(`columns[${index}][searchable]`, "true");
    params.set(`columns[${index}][orderable]`, "true");
    params.set(`columns[${index}][search][value]`, "");
    params.set(`columns[${index}][search][regex]`, "false");
  });
  params.set("order[0][column]", "6");
  params.set("order[0][dir]", "asc");
  params.set("start", "0");
  params.set("length", "25");
  params.set("search[value]", String(numero));
  params.set("search[regex]", "false");
  for (const tipo of group.tipo) params.append("tipo_orcamento[]", tipo);
  params.set("_", String(Date.now()));
  return `/orcamento/api/list_orcamentos_paginados/?${params.toString()}`;
}

function normalizeHeader(row, group, requestPath) {
  const arkmedsId = parseArkmedsInteger(row.id);
  const numero = asTextOrNull(row.numero);
  const numeroInfo = normalizarNumeroBaseOrcamento(numero);
  const osNumeroRaw = Array.isArray(row.ordem_servico_numero)
    ? row.ordem_servico_numero[0]
    : row.ordem_servico_numero;
  const osNumero = asTextOrNull(osNumeroRaw);
  const osId = asTextOrNull(row.ordem_servico_id);
  const normalized = {
    arkmeds_orcamento_id: arkmedsId,
    arkmeds_orcamento_numero: numero,
    arkmeds_orcamento_numero_original: numeroInfo.original,
    arkmeds_orcamento_numero_base: numeroInfo.base,
    arkmeds_orcamento_sufixo: numeroInfo.sufixo,
    possui_sufixo_correcao: numeroInfo.possuiSufixo,
    arkmeds_tipo_codigo: parseArkmedsInteger(row.tipo),
    arkmeds_tipo_texto: asTextOrNull(row.tipo_trans || row.tipo_str),
    arkmeds_status_grupo: group.key,
    arkmeds_status_label: arkmedsStatusLabel(group.key),
    arkmeds_status_original: group.label,
    status_normalizado_importacao: normalizeArkmedsStatusGroup(group.key),
    politica_importacao_status: statusImportPolicy(group.key),
    arkmeds_valor_total: parseArkmedsNumber(row.valor_total),
    arkmeds_solicitante: asTextOrNull(row.solicitante_str),
    arkmeds_data_criacao: parseArkmedsDate(row.data_criacao),
    arkmeds_data_validade: parseArkmedsDate(row.data_validade),
    arkmeds_email_solicitante: asTextOrNull(row.email_solicitante),
    arkmeds_ordem_servico_id: osId,
    arkmeds_ordem_servico_numero: osNumero,
    arkmeds_has_attachment: asBoolean(row.has_attachment),
    arkmeds_already_generate_os: asBoolean(row.already_generate_os),
    pdf_original_url: arkmedsId ? `${arkmedsBaseUrl}/orcamento/${arkmedsId}/imprimir/` : null,
    origem_migracao: "arkmeds_orcamentos_web",
    classificacao_vinculo_os: osId || osNumero ? "com_os_confirmada" : "sem_os_avulso",
    ordem_servico_id_resolvida: null,
    status_validacao: "pendente_itens",
    motivos_validacao: ["ITENS_NAO_COLETADOS"],
    parametros_coleta_json: {
      endpoint: "/orcamento/api/list_orcamentos_paginados/",
      grupo: group.key,
      busca_exata_numero: numero,
      modo: "insert_only_novos",
      path: requestPath,
    },
    dados_brutos_json: {
      ...row,
      _grupo_label: group.label,
      _grupo_key: group.key,
      _modo_coleta: "insert_only_novos",
    },
  };
  normalized.identificador_migracao = buildIdentifier(normalized);
  return normalized;
}

async function main() {
  const snapshot = JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf-8"));
  const existing = await supabaseAll(
    supabase,
    "staging_arkmeds_orcamentos",
    "arkmeds_orcamento_id",
  );
  const existingIds = new Set(existing.map((row) => Number(row.arkmeds_orcamento_id)));
  const targets = snapshot.filter((row) => {
    const id = Number(row.arkmeds_orcamento_id);
    return Number.isInteger(id) && !existingIds.has(id) && !EXCLUDED_IDS.has(id);
  });
  const inserted = [];

  for (const target of targets) {
    const group = groupConfigs.find((item) => item.key === target.status_grupo);
    if (!group) throw new Error(`Grupo ArkMeds desconhecido: ${target.status_grupo}`);
    const requestPath = buildSearchPath(group, target.numero);
    const payload = await fetchArkmedsJson(requestPath);
    const matches = (Array.isArray(payload.data) ? payload.data : [])
      .filter((row) => Number(row.id) === Number(target.arkmeds_orcamento_id));
    if (matches.length !== 1) {
      throw new Error(`Cabecalho ${target.arkmeds_orcamento_id}/${target.numero} nao localizado de forma unica.`);
    }
    const header = normalizeHeader(matches[0], group, requestPath);
    const editPath = inferOrcamentoEditPath(header.arkmeds_tipo_texto, header.arkmeds_orcamento_id);
    const editPage = await fetchArkmedsText(editPath);
    header.observacoes_gerais = extractArkmedsMoreInformation(editPage.text);
    header.detalhes_atualizado_em = new Date().toISOString();
    header.parametros_coleta_json.edit_path = editPath;
    const { error } = await supabase.from("staging_arkmeds_orcamentos").insert(header);
    if (error) throw new Error(`Erro ao inserir ${header.arkmeds_orcamento_id}: ${error.message}`);
    inserted.push({
      arkmeds_orcamento_id: header.arkmeds_orcamento_id,
      numero: header.arkmeds_orcamento_numero,
      status: header.arkmeds_status_grupo,
      solicitante: header.arkmeds_solicitante,
      valor_total: header.arkmeds_valor_total,
    });
  }

  const report = {
    modo: "insert_only",
    snapshot_total: snapshot.length,
    staging_antes: existing.length,
    excluidos: [...EXCLUDED_IDS],
    inseridos: inserted.length,
    registros: inserted,
    arkmeds: "somente leitura",
  };
  await fs.writeFile(
    path.join(outputDir, "novos_orcamentos_insert_only.json"),
    JSON.stringify(report, null, 2),
    "utf-8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

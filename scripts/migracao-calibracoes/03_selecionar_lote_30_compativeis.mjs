import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureOutputDir,
  fetchAllRows,
  fetchArkmedsJson,
  fetchCalibrationHtml,
  fetchCalibrationList,
  fetchCalibrationPdf,
  normalizeText,
  outputDir,
  parseArkmedsDate,
  parseCalibrationHtml,
  parseStandardCertificateHtml,
  requireSupabase,
  resolveOrganizacaoId,
  toCsv,
} from "./lib.mjs";

const TARGET_COUNT = Number.parseInt(process.env.TARGET_COUNT || "30", 10);
const LOTE_NOME = String(process.env.LOTE_NOME || "lote_30_compativeis").replace(/[^a-zA-Z0-9_-]/g, "_");
const LIST_PAGE_SIZE = Number.parseInt(process.env.LIST_PAGE_SIZE || "500", 10);
const LIST_FETCH_PAGE_SIZE = Math.min(
  Number.parseInt(process.env.LIST_FETCH_PAGE_SIZE || "500", 10),
  LIST_PAGE_SIZE
);
const requestedIdsFromEnv =
  String(process.env.ARKMEDS_CALIBRATION_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const requestedIdsFile = process.env.ARKMEDS_CALIBRATION_IDS_FILE;
const requestedIdsFromFile = requestedIdsFile
  ? JSON.parse(await fs.readFile(requestedIdsFile, "utf-8")).map(String)
  : [];
const requestedIds = new Set([...requestedIdsFromEnv, ...requestedIdsFromFile]);
const allowImportedRequestedIds =
  requestedIds.size > 0 && process.env.ALLOW_IMPORTED_REQUESTED_IDS === "true";
const allowPartialLot = process.env.ALLOW_PARTIAL_LOT === "true";
const quiet = process.env.MIGRACAO_CALIBRACOES_QUIET === "true";

function normalizeProcedureName(value) {
  return normalizeText(value)
    .replace(/\bcalibracao\b/g, " ")
    .replace(/\bem\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCertificateNumber(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function parseDecimal(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPlaces(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  return normalized.includes(".") ? normalized.split(".")[1].replace(/\D/g, "").length : 0;
}

function extractPdfText(buffer) {
  // O modo raw preserva os cinco valores da linha metrologica juntos. No modo
  // layout, o fator k pode ser deslocado para outra linha pelo PDF do ArkMeds.
  const result = spawnSync("pdftotext", ["-raw", "-", "-"], {
    input: buffer,
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pdftotext falhou: ${String(result.stderr || "erro desconhecido").trim()}`);
  }
  return result.stdout;
}

function parsePdfResultRows(text) {
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const start = normalized.search(/7\.\s*Resultados/i);
  if (start < 0) return [];
  const section = normalized.slice(start).split(/Resumo da calibracao/i)[0];
  const numberPattern = /[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][-+]?\d+)?/g;
  const rows = [];

  for (const line of section.split(/\r?\n/)) {
    const tokens = line.match(numberPattern) || [];
    if (tokens.length !== 5) continue;
    const values = tokens.map(parseDecimal);
    if (values.some((value) => value === null)) continue;
    rows.push({
      valor_nominal: values[0],
      media: values[1],
      tendencia: values[2],
      incerteza_expandida: values[3],
      fator_k: values[4],
      origem_linha_pdf: line.trim(),
    });
  }
  return rows;
}

function standardResultTable(certificate, tableId) {
  return certificate.results.find((item) => Number(item.id) === Number(tableId)) || null;
}

function standardPoints(resultTable) {
  if (!resultTable?.tabela) return [];
  const table = resultTable.tabela;
  return (table.nominal || []).map((nominal, index) => ({
    valor_nominal: parseDecimal(nominal),
    valor_nominal_texto: String(nominal ?? ""),
    valor_medido: parseDecimal(table.medido?.[index]),
    tendencia: parseDecimal(table.t?.[index]),
    incerteza_expandida: parseDecimal(table.ie?.[index]),
    fator_k: parseDecimal(table.k?.[index]),
    veff: /^inf$/i.test(String(table.veff?.[index] ?? ""))
      ? null
      : parseDecimal(table.veff?.[index]),
    veff_infinito: /^inf$/i.test(String(table.veff?.[index] ?? "")),
  }));
}

function closestStandardPoint(value, points) {
  return [...points].sort(
    (left, right) =>
      Math.abs((left.valor_nominal ?? 0) - value) -
      Math.abs((right.valor_nominal ?? 0) - value)
  )[0] || null;
}

await ensureOutputDir();
const pdfDirName = process.env.PDF_DIR_NAME || (
  LOTE_NOME === "lote_30_compativeis" ? "lote-30-pdfs" : `${LOTE_NOME.replace(/_/g, "-")}-pdfs`
);
const pdfDir = path.join(outputDir, pdfDirName);
await fs.mkdir(pdfDir, { recursive: true });

const supabase = requireSupabase();
const organizacaoId = await resolveOrganizacaoId(supabase);
const organizationFilter = [{ column: "organizacao_id", value: organizacaoId }];
const [companies, equipment, procedures, procedureTables, procedureTypes, standards, standardTables, importedExecutions] = await Promise.all([
  fetchAllRows(supabase, "empresas", "id,numero_cadastro,nome,ativo", organizationFilter),
  fetchAllRows(supabase, "equipamentos", "id,numero_cadastro,empresa_id,tipo_equipamento_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,tag,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_procedimentos", "id,nome,versao,metodo_referencia,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_procedimento_tabelas", "id,procedimento_id,nome,grandeza,unidade,ordem,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_procedimento_tipos_equipamento", "procedimento_id,tipo_equipamento_id", organizationFilter),
  fetchAllRows(supabase, "calibracao_padroes", "id,numero_certificado,nome_padrao,fabricante,modelo,numero_serie,patrimonio,tag,laboratorio_calibrador,data_validade,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_padrao_tabelas", "id,padrao_id,nome,grandeza,unidade,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_execucoes", "arkmeds_calibracao_id", [
    ...organizationFilter,
    { column: "origem", value: "arkmeds" },
  ]),
]);

if (!Number.isInteger(TARGET_COUNT) || TARGET_COUNT <= 0) {
  throw new Error("TARGET_COUNT deve ser um inteiro positivo.");
}
if (!Number.isInteger(LIST_PAGE_SIZE) || LIST_PAGE_SIZE < TARGET_COUNT) {
  throw new Error("LIST_PAGE_SIZE deve ser um inteiro maior ou igual a TARGET_COUNT.");
}
if (!Number.isInteger(LIST_FETCH_PAGE_SIZE) || LIST_FETCH_PAGE_SIZE <= 0) {
  throw new Error("LIST_FETCH_PAGE_SIZE deve ser um inteiro positivo.");
}

const importedArkmedsIds = new Set(
  importedExecutions
    .map((item) => item.arkmeds_calibracao_id)
    .filter((value) => value != null)
    .map(String)
);

const companiesByLegacyId = new Map(
  companies.filter((item) => item.numero_cadastro != null).map((item) => [String(item.numero_cadastro), item])
);
const equipmentByLegacyId = new Map(
  equipment.filter((item) => item.numero_cadastro != null).map((item) => [String(item.numero_cadastro), item])
);
const proceduresByName = new Map();
for (const procedure of procedures.filter((item) => item.ativo)) {
  const key = normalizeProcedureName(procedure.nome);
  if (!proceduresByName.has(key)) proceduresByName.set(key, []);
  proceduresByName.get(key).push(procedure);
}
const procedureIdsByEquipmentType = new Map();
for (const link of procedureTypes) {
  if (!procedureIdsByEquipmentType.has(link.tipo_equipamento_id)) {
    procedureIdsByEquipmentType.set(link.tipo_equipamento_id, new Set());
  }
  procedureIdsByEquipmentType.get(link.tipo_equipamento_id).add(link.procedimento_id);
}

function resolveProcedure(name, equipmentTypeId) {
  const normalized = normalizeProcedureName(name);
  const exact = proceduresByName.get(normalized) || [];
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const associatedProcedureIds = procedureIdsByEquipmentType.get(equipmentTypeId) || new Set();
  const candidates = procedures.filter((procedure) => {
    if (!procedure.ativo || !associatedProcedureIds.has(procedure.id)) return false;
    const target = normalizeProcedureName(procedure.nome);
    return normalized && (target.includes(normalized) || normalized.includes(target));
  });
  return candidates.length === 1 ? candidates[0] : null;
}
const procedureTablesByProcedure = new Map();
for (const table of procedureTables.filter((item) => item.ativo)) {
  if (!procedureTablesByProcedure.has(table.procedimento_id)) {
    procedureTablesByProcedure.set(table.procedimento_id, []);
  }
  procedureTablesByProcedure.get(table.procedimento_id).push(table);
}
const standardsByCertificate = new Map(
  standards.map((item) => [normalizeCertificateNumber(item.numero_certificado), item])
);
const standardTablesByStandard = new Map();
for (const table of standardTables.filter((item) => item.ativo)) {
  if (!standardTablesByStandard.has(table.padrao_id)) standardTablesByStandard.set(table.padrao_id, []);
  standardTablesByStandard.get(table.padrao_id).push(table);
}

const standardCertificateCache = new Map();
const selected = [];
const rejected = [];
const listItems = [];
let arkmedsTotal = null;
for (let start = 0; start < LIST_PAGE_SIZE; start += LIST_FETCH_PAGE_SIZE) {
  const length = Math.min(LIST_FETCH_PAGE_SIZE, LIST_PAGE_SIZE - start);
  const page = await fetchCalibrationList({ start, length });
  arkmedsTotal ??= Number(page.recordsTotal || 0);
  listItems.push(...(page.data || []));
  if (!page.data?.length || listItems.length >= arkmedsTotal) break;
}

const candidates = listItems.filter((item) => {
  if (requestedIds.size && !requestedIds.has(String(item.id))) return false;
  if (!allowImportedRequestedIds && importedArkmedsIds.has(String(item.id))) return false;
  const company = companiesByLegacyId.get(String(item.solicitante_id));
  const localEquipment = equipmentByLegacyId.get(String(item.equipamento_id));
  return company && localEquipment && localEquipment.empresa_id === company.id;
});

console.log(
  `${candidates.length} candidato(s) ${allowImportedRequestedIds ? "solicitado(s) para auditoria" : "novo(s)"} ` +
  `com empresa/equipamento exatos nos ${LIST_PAGE_SIZE} certificados mais recentes; ` +
  `${allowImportedRequestedIds ? 0 : importedArkmedsIds.size} certificado(s) ArkMeds ja importado(s) foram ignorados.`
);

for (const [candidateIndex, item] of candidates.entries()) {
  if (selected.length >= TARGET_COUNT) break;
  const reasons = [];
  if (!quiet) console.log(`Analisando ${item.id} - ${item.numero}...`);
  try {
    const company = companiesByLegacyId.get(String(item.solicitante_id));
    const localEquipment = equipmentByLegacyId.get(String(item.equipamento_id));
    const parsed = parseCalibrationHtml(
      await fetchCalibrationHtml(`/calibracao/equipamento/editar/${item.id}`)
    );
    const certificateNumber = String(parsed.fields.numero || item.numero || "").trim();
    if (!/^\d+$/.test(certificateNumber)) {
      throw new Error(`numero_certificado_nao_numerico_${certificateNumber || "vazio"}`);
    }
    if (parsed.tablesError || !parsed.tables.length) reasons.push("tabelas_nao_extraidas");
    if (String(parsed.fields.solicitante.id) !== String(item.solicitante_id)) reasons.push("empresa_divergente_no_detalhe");
    if (String(parsed.fields.equipamento.id) !== String(item.equipamento_id)) reasons.push("equipamento_divergente_no_detalhe");

    const procedure = resolveProcedure(parsed.fields.procedimento.text, localEquipment.tipo_equipamento_id);
    if (!procedure) reasons.push("procedimento_nao_resolvido_por_nome_e_tipo");
    if (reasons.length) throw new Error(reasons.join("|"));

    const pdf = await fetchCalibrationPdf(item.print_url);
    const pdfText = extractPdfText(pdf.buffer);
    const pdfRows = parsePdfResultRows(pdfText);
    const expectedPoints = parsed.tables.reduce((sum, table) => sum + (table.linhas || []).length, 0);
    if (pdfRows.length !== expectedPoints) {
      throw new Error(`pontos_pdf_${pdfRows.length}_esperado_${expectedPoints}`);
    }

    const localProcedureTables = procedureTablesByProcedure.get(procedure.id) || [];
    let pdfRowIndex = 0;
    const mappedTables = [];
    for (const [tableIndex, sourceTable] of parsed.tables.entries()) {
      const tableMetadata = await fetchArkmedsJson(
        `/calibracao/tabs_certificado_padrao/?id_padrao=${encodeURIComponent(sourceTable.padrao)}&tab_certificado_padrao=${encodeURIComponent(sourceTable.tab_certificado_padrao)}`
      );
      const selectedMetadata = tableMetadata.find(
        (metadata) => Number(metadata.id) === Number(sourceTable.tab_certificado_padrao)
      );
      if (!selectedMetadata?.id_certificado) {
        throw new Error(`certificado_padrao_nao_encontrado_tabela_${tableIndex + 1}`);
      }

      if (!standardCertificateCache.has(selectedMetadata.id_certificado)) {
        const certificateHtml = await fetchCalibrationHtml(
          `/calibracao/padrao_novo_editar/${selectedMetadata.id_certificado}/`
        );
        standardCertificateCache.set(
          selectedMetadata.id_certificado,
          parseStandardCertificateHtml(certificateHtml)
        );
      }
      const sourceStandardCertificate = standardCertificateCache.get(selectedMetadata.id_certificado);
      if (sourceStandardCertificate.resultsError) {
        throw new Error(`resultado_padrao_invalido_${selectedMetadata.id_certificado}`);
      }
      const sourceStandardResult = standardResultTable(
        sourceStandardCertificate,
        sourceTable.tab_certificado_padrao
      );
      if (!sourceStandardResult) {
        throw new Error(`tabela_padrao_nao_encontrada_${sourceTable.tab_certificado_padrao}`);
      }

      const localStandard = standardsByCertificate.get(
        normalizeCertificateNumber(sourceStandardCertificate.numero)
      ) || null;
      const localStandardTable = localStandard
        ? (standardTablesByStandard.get(localStandard.id) || []).find(
            (table) => normalizeText(table.nome) === normalizeText(sourceStandardResult.nome_tabela)
          ) || null
        : null;
      const localProcedureTable = localProcedureTables.find(
        (table) => normalizeText(table.nome) === normalizeText(sourceTable.nome)
      ) || null;
      const sourceStandardPoints = standardPoints(sourceStandardResult);
      const points = (sourceTable.linhas || []).map((sourcePoint, pointIndex) => {
        const pdfResult = pdfRows[pdfRowIndex++];
        const nominal = parseDecimal(sourcePoint.nominal);
        const referencePoint = closestStandardPoint(nominal, sourceStandardPoints);
        return {
          ordem: pointIndex + 1,
          valor_nominal: nominal,
          valor_nominal_texto: String(sourcePoint.nominal ?? ""),
          casas_decimais_valor_medido: Math.max(
            0,
            ...(sourcePoint.medidos || []).map(decimalPlaces)
          ),
          leituras: (sourcePoint.medidos || []).map((value, readingIndex) => ({
            ordem: readingIndex + 1,
            valor: parseDecimal(value),
            valor_texto: String(value ?? ""),
            casas_decimais: decimalPlaces(value),
          })),
          resultado_pdf: pdfResult,
          ponto_padrao_referencia: referencePoint,
          dados_origem_json: sourcePoint,
        };
      });

      mappedTables.push({
        ordem: tableIndex + 1,
        procedimento_tabela_id: localProcedureTable?.id || null,
        arkmeds_tabela_id: Number(sourceTable.id) || null,
        arkmeds_padrao_id: Number(sourceTable.padrao) || null,
        arkmeds_certificado_padrao_id: Number(selectedMetadata.id_certificado),
        nome: sourceTable.nome || `Tabela ${tableIndex + 1}`,
        grandeza: localProcedureTable?.grandeza || sourceTable.nome || "Grandeza",
        unidade: sourceTable.unidade || localProcedureTable?.unidade || "-",
        quantidade_leituras: Math.max(1, ...(sourceTable.linhas || []).map((point) => (point.medidos || []).length)),
        padrao_id: localStandard?.id || null,
        padrao_tabela_id: localStandardTable?.id || null,
        padrao_nome: sourceStandardCertificate.padrao.text || null,
        padrao_numero_certificado: sourceStandardCertificate.numero || null,
        padrao_validade: sourceStandardCertificate.validade || selectedMetadata.validade_certificado || null,
        padrao_laboratorio: sourceStandardCertificate.orgaoCalibrador || null,
        resolucao_padrao: parseDecimal(sourceTable.resolucao_padrao),
        resolucao_equipamento: parseDecimal(sourceTable.resolucao_equipamento),
        resolucao_equipamento_texto: String(sourceTable.resolucao_equipamento ?? "") || null,
        pontos: points,
        certificado_padrao_origem: sourceStandardCertificate,
        dados_origem_json: sourceTable,
      });
    }

    const dataCalibracao = parseArkmedsDate(parsed.fields.data_criacao || item.data_criacao);
    const dataEmissao = parseArkmedsDate(parsed.fields.data_emissao) || parseArkmedsDate(item.data_criacao);
    const dataValidade = parseArkmedsDate(parsed.fields.validade || item.validade);
    const missingDates = [
      !dataCalibracao && "calibracao",
      !dataEmissao && "emissao",
      !dataValidade && "validade",
    ].filter(Boolean);
    if (missingDates.length) {
      throw new Error(`datas_obrigatorias_ausentes_${missingDates.join("_")}`);
    }

    const pdfPath = path.join(pdfDir, `${item.id}.pdf`);
    await fs.writeFile(pdfPath, pdf.buffer);
    selected.push({
      arkmeds_calibracao_id: Number(item.id),
      arkmeds_numero_certificado: certificateNumber,
      arkmeds_tipo_calibracao: Number(item.type_calibration || 1),
      arkmeds_empresa_id: Number(item.solicitante_id),
      arkmeds_equipamento_id: Number(item.equipamento_id),
      empresa_id: company.id,
      empresa_nome: company.nome,
      equipamento_id: localEquipment.id,
      equipamento_descricao: parsed.fields.equipamento.text || item.equipamento,
      procedimento_id: procedure.id,
      procedimento_nome: procedure.nome,
      procedimento_versao: procedure.versao,
      norma_utilizada: procedure.metodo_referencia || null,
      data_calibracao: dataCalibracao,
      data_emissao: dataEmissao,
      data_validade: dataValidade,
      local_calibracao: parsed.fields.local || null,
      temperatura: parseDecimal(parsed.fields.temperatura),
      incerteza_temperatura: parseDecimal(parsed.fields.incerteza_temperatura),
      umidade: parseDecimal(parsed.fields.umidade),
      incerteza_umidade: parseDecimal(parsed.fields.incerteza_umidade),
      pressao_atmosferica: parseDecimal(parsed.fields.pressao_atmosferica),
      incerteza_pressao: parseDecimal(parsed.fields.incerteza_pressao),
      tecnico_executor: parsed.fields.tecnico_executor.text || "Nao informado no legado",
      responsavel_tecnico: parsed.fields.responsavel_tecnico.text || "Nao informado no legado",
      responsavel_solicitante: parsed.fields.responsavel_solicitante || null,
      observacoes: parsed.fields.observacoes || null,
      pdf_original_url: `https://aci.arkmeds.com${item.print_url}`,
      pdf_original_hash: pdf.sha256,
      pdf_original_bytes: pdf.bytes,
      pdf_local_path: pdfPath,
      tabelas: mappedTables,
      dados_lista_json: item,
      dados_formulario_json: parsed.fields,
    });
    if (!quiet || selected.length % 25 === 0 || selected.length === TARGET_COUNT) {
      console.log(`[${selected.length}/${TARGET_COUNT}] ${item.numero} - ${company.nome}`);
    }
  } catch (error) {
    console.warn(`Rejeitado ${item.id}: ${error.message}`);
    rejected.push({
      arkmeds_calibracao_id: item.id,
      certificado: item.numero,
      equipamento: item.equipamento,
      motivo: error.message,
    });
    if ((candidateIndex + 1) % 10 === 0) {
      console.log(`Analisados ${candidateIndex + 1}; selecionados ${selected.length}; rejeitados ${rejected.length}.`);
    }
  }
}

if (selected.length !== TARGET_COUNT && !allowPartialLot) {
  throw new Error(`Foram selecionados apenas ${selected.length} de ${TARGET_COUNT} certificados compativeis.`);
}

const jsonPath = path.join(outputDir, `${LOTE_NOME}.json`);
const csvPath = path.join(outputDir, `${LOTE_NOME}.csv`);
const rejectedPath = path.join(outputDir, `${LOTE_NOME}_rejeitados.csv`);
await fs.writeFile(
  jsonPath,
  JSON.stringify({
    organizacaoId,
    lote: LOTE_NOME,
    janela_consultada: LIST_PAGE_SIZE,
    total_arkmeds: arkmedsTotal,
    certificados_arkmeds_ja_importados: importedArkmedsIds.size,
    selected,
    rejected,
  }, null, 2)
);
await fs.writeFile(
  csvPath,
  toCsv(selected.map((item) => ({
    arkmeds_id: item.arkmeds_calibracao_id,
    certificado: item.arkmeds_numero_certificado,
    empresa: item.empresa_nome,
    equipamento: item.equipamento_descricao,
    procedimento: item.procedimento_nome,
    data_calibracao: item.data_calibracao,
    validade: item.data_validade,
    tabelas: item.tabelas.length,
    pontos: item.tabelas.reduce((sum, table) => sum + table.pontos.length, 0),
    pdf_bytes: item.pdf_original_bytes,
  })), [
    { key: "arkmeds_id", label: "ID ArkMeds" },
    { key: "certificado", label: "Certificado" },
    { key: "empresa", label: "Empresa" },
    { key: "equipamento", label: "Equipamento" },
    { key: "procedimento", label: "Procedimento" },
    { key: "data_calibracao", label: "Data calibracao" },
    { key: "validade", label: "Validade" },
    { key: "tabelas", label: "Tabelas" },
    { key: "pontos", label: "Pontos" },
    { key: "pdf_bytes", label: "PDF bytes" },
  ])
);
await fs.writeFile(
  rejectedPath,
  toCsv(rejected, [
    { key: "arkmeds_calibracao_id", label: "ID ArkMeds" },
    { key: "certificado", label: "Certificado" },
    { key: "equipamento", label: "Equipamento" },
    { key: "motivo", label: "Motivo" },
  ])
);
console.log(`Lote fechado com ${selected.length} certificado(s). Arquivo: ${jsonPath}`);

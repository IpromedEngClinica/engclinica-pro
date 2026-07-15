import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureOutputDir,
  fetchAllRows,
  normalizeText,
  outputDir,
  parseArgs,
  requireSupabase,
  resolveOrganizacaoId,
  toCsv,
} from "./lib.mjs";

parseArgs();
await ensureOutputDir();

const inputPath = path.join(outputDir, "coleta_calibracoes.json");
const input = JSON.parse(await fs.readFile(inputPath, "utf-8"));
const supabase = requireSupabase();
const organizacaoId = await resolveOrganizacaoId(supabase);
const organizationFilter = [{ column: "organizacao_id", value: organizacaoId }];

const [companies, equipment, serviceOrders, procedures, procedureTables] = await Promise.all([
  fetchAllRows(supabase, "empresas", "id,numero_cadastro,nome,nome_fantasia,ativo", organizationFilter),
  fetchAllRows(supabase, "equipamentos", "id,numero_cadastro,empresa_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,ativo", organizationFilter),
  fetchAllRows(supabase, "ordens_servico", "id,numero,arkmeds_os_id,empresa_id,equipamento_id,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_procedimentos", "id,codigo,nome,versao,ativo", organizationFilter),
  fetchAllRows(supabase, "calibracao_procedimento_tabelas", "id,procedimento_id,nome,grandeza,unidade,ativo", organizationFilter),
]);

const companiesByLegacyId = new Map(companies.map((item) => [String(item.numero_cadastro), item]));
const equipmentByLegacyId = new Map(equipment.map((item) => [String(item.numero_cadastro), item]));
const equipmentByCompanyAndSerial = new Map();
for (const item of equipment) {
  const serial = normalizeText(item.numero_serie);
  if (!serial) continue;
  const key = `${item.empresa_id}:${serial}`;
  if (!equipmentByCompanyAndSerial.has(key)) equipmentByCompanyAndSerial.set(key, []);
  equipmentByCompanyAndSerial.get(key).push(item);
}
const ordersByArkmedsId = new Map(serviceOrders.filter((item) => item.arkmeds_os_id).map((item) => [String(item.arkmeds_os_id), item]));
const proceduresByName = new Map();
for (const procedure of procedures.filter((item) => item.ativo)) {
  const key = normalizeText(procedure.nome);
  if (!proceduresByName.has(key)) proceduresByName.set(key, []);
  proceduresByName.get(key).push(procedure);
}
const tablesByProcedure = new Map();
for (const table of procedureTables.filter((item) => item.ativo)) {
  if (!tablesByProcedure.has(table.procedimento_id)) tablesByProcedure.set(table.procedimento_id, []);
  tablesByProcedure.get(table.procedimento_id).push(table);
}

function findProcedure(name) {
  const normalized = normalizeText(name);
  const exact = proceduresByName.get(normalized) || [];
  if (exact.length === 1) return { match: exact[0], method: "nome_exato", candidates: exact };
  if (exact.length > 1) return { match: null, method: "ambiguo", candidates: exact };

  const candidates = procedures.filter((item) => {
    if (!item.ativo) return false;
    const target = normalizeText(item.nome);
    return normalized && (target.includes(normalized) || normalized.includes(target));
  });
  return {
    match: candidates.length === 1 ? candidates[0] : null,
    method: candidates.length === 1 ? "nome_aproximado" : candidates.length ? "ambiguo" : "nao_encontrado",
    candidates,
  };
}

function extractSerial(description) {
  const match = String(description ?? "").match(/(?:\bns\b|numero\s+de\s+serie|n[. ]*serie)\s*:\s*([^|,;]+)$/i);
  return match?.[1]?.trim() || "";
}

function findEquipment(record, company) {
  const direct = equipmentByLegacyId.get(String(record.arkmeds_equipamento_id)) || null;
  if (direct) return { match: direct, method: "id_legado", candidates: [direct] };
  if (!company) return { match: null, method: "empresa_ausente", candidates: [] };

  const serial = normalizeText(extractSerial(record.equipamento_descricao));
  const candidates = serial
    ? equipmentByCompanyAndSerial.get(`${company.id}:${serial}`) || []
    : [];
  return {
    match: candidates.length === 1 ? candidates[0] : null,
    method: candidates.length === 1 ? "numero_serie" : candidates.length > 1 ? "numero_serie_ambiguo" : "nao_encontrado",
    candidates,
  };
}

const results = input.records.map((record) => {
  const blockers = [];
  const warnings = [...(record.avisos_extracao || [])];
  const company = companiesByLegacyId.get(String(record.arkmeds_empresa_id)) || null;
  const equipmentResult = findEquipment(record, company);
  const localEquipment = equipmentResult.match;
  const order = record.arkmeds_ordem_servico_id
    ? ordersByArkmedsId.get(String(record.arkmeds_ordem_servico_id)) || null
    : null;
  const procedureResult = findProcedure(record.procedimento_nome);
  const procedure = procedureResult.match;

  if (record.status_extracao !== "coletado") blockers.push(`extracao_${record.status_extracao}`);
  if (!company) blockers.push("empresa_nao_encontrada_por_id_arkmeds");
  if (!localEquipment) blockers.push(`equipamento_${equipmentResult.method}`);
  if (equipmentResult.method === "numero_serie") warnings.push("equipamento_correspondido_por_numero_serie");
  if (company && localEquipment && localEquipment.empresa_id !== company.id) {
    blockers.push("equipamento_vinculado_a_outra_empresa");
  }
  if (!procedure) blockers.push(`procedimento_${procedureResult.method}`);
  if (record.arkmeds_ordem_servico_id && !order) warnings.push("os_arkmeds_nao_encontrada_no_ipromed");
  if (order && company && order.empresa_id !== company.id) warnings.push("os_vinculada_a_outra_empresa");
  if (order && localEquipment && order.equipamento_id !== localEquipment.id) warnings.push("os_vinculada_a_outro_equipamento");

  const localTables = procedure ? tablesByProcedure.get(procedure.id) || [] : [];
  const sourceTableNames = record.tabelas.map((table) => normalizeText(table.nome));
  const localTableNames = localTables.map((table) => normalizeText(table.nome));
  const missingTables = sourceTableNames.filter((name) => name && !localTableNames.includes(name));
  if (procedure && missingTables.length) warnings.push(`tabelas_nao_correspondentes:${missingTables.length}`);
  if (procedureResult.method === "nome_aproximado") warnings.push("procedimento_correspondido_por_aproximacao");
  if (record.arkmeds_padrao_ids.length) warnings.push("padroes_arkmeds_ainda_exigem_mapeamento_de_certificado");
  warnings.push("calculos_finais_devem_ser_conferidos_com_pdf_original");

  const status = blockers.length ? "bloqueado" : warnings.length ? "revisao_manual" : "compativel";
  return {
    ...record,
    empresa_id_resolvida: company?.id || null,
    empresa_ipromed: company?.nome || null,
    equipamento_id_resolvido: localEquipment?.id || null,
    equipamento_metodo_match: equipmentResult.method,
    equipamento_ipromed: localEquipment
      ? [localEquipment.tipo_texto, localEquipment.fabricante, localEquipment.modelo, localEquipment.numero_serie].filter(Boolean).join(" - ")
      : null,
    ordem_servico_id_resolvida: order?.id || null,
    ordem_servico_numero_ipromed: order?.numero || null,
    procedimento_id_resolvido: procedure?.id || null,
    procedimento_ipromed: procedure?.nome || null,
    procedimento_metodo_match: procedureResult.method,
    tabelas_ipromed: localTables.map((table) => table.nome),
    tabelas_arkmeds_sem_correspondencia: missingTables,
    status_compatibilidade: status,
    motivos_bloqueantes: [...new Set(blockers)],
    avisos_validacao: [...new Set(warnings)],
  };
});

const jsonPath = path.join(outputDir, "compatibilidade_calibracoes.json");
const csvPath = path.join(outputDir, "compatibilidade_calibracoes.csv");
const summaryPath = path.join(outputDir, "compatibilidade_calibracoes_resumo.md");
await fs.writeFile(jsonPath, JSON.stringify({ organizacaoId, sourceExecution: input.executionId, results }, null, 2));
await fs.writeFile(
  csvPath,
  toCsv(results, [
    { key: "arkmeds_calibracao_id", label: "ID ArkMeds" },
    { key: "arkmeds_numero_certificado", label: "Certificado" },
    { key: "empresa_nome", label: "Empresa ArkMeds" },
    { key: "empresa_ipromed", label: "Empresa Ipromed" },
    { key: "equipamento_descricao", label: "Equipamento ArkMeds" },
    { key: "equipamento_ipromed", label: "Equipamento Ipromed" },
    { key: "procedimento_nome", label: "Procedimento ArkMeds" },
    { key: "procedimento_ipromed", label: "Procedimento Ipromed" },
    { key: "numero_ordem_servico", label: "OS ArkMeds" },
    { key: "ordem_servico_numero_ipromed", label: "OS Ipromed" },
    { key: "status_compatibilidade", label: "Status" },
    { key: "motivos_bloqueantes", label: "Bloqueios" },
    { key: "avisos_validacao", label: "Avisos" },
  ])
);

const counts = {
  total: results.length,
  compativel: results.filter((item) => item.status_compatibilidade === "compativel").length,
  revisaoManual: results.filter((item) => item.status_compatibilidade === "revisao_manual").length,
  bloqueado: results.filter((item) => item.status_compatibilidade === "bloqueado").length,
  empresaEncontrada: results.filter((item) => item.empresa_id_resolvida).length,
  equipamentoEncontrado: results.filter((item) => item.equipamento_id_resolvido).length,
  procedimentoEncontrado: results.filter((item) => item.procedimento_id_resolvido).length,
  osEncontrada: results.filter((item) => item.ordem_servico_id_resolvida).length,
};

await fs.writeFile(summaryPath, [
  "# Compatibilidade da migracao de calibracoes",
  "",
  `- Certificados analisados: ${counts.total}`,
  `- Compativeis sem aviso: ${counts.compativel}`,
  `- Exigem revisao manual: ${counts.revisaoManual}`,
  `- Bloqueados: ${counts.bloqueado}`,
  `- Empresas encontradas por ID legado: ${counts.empresaEncontrada}`,
  `- Equipamentos encontrados por ID legado: ${counts.equipamentoEncontrado}`,
  `- Procedimentos encontrados: ${counts.procedimentoEncontrado}`,
  `- OS encontradas pelo ID ArkMeds: ${counts.osEncontrada}`,
  "",
  "## Travas mantidas",
  "",
  "- Nenhuma calibracao foi criada em calibracao_execucoes.",
  "- Certificados sem empresa, equipamento ou procedimento ficam bloqueados.",
  "- Padroes e calculos finais ainda precisam ser confrontados com o certificado original.",
  "- O PDF original deve ser preservado como evidencia historica.",
  "",
].join("\n"));

console.log(`Compatibilidade concluida: ${counts.total} analisado(s), ${counts.bloqueado} bloqueado(s), ${counts.revisaoManual} para revisao.`);
console.log(`Relatorio: ${summaryPath}`);

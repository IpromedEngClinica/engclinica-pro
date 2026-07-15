import fs from "node:fs/promises";
import path from "node:path";
import {
  arkmedsBaseUrl,
  ensureOutputDir,
  fetchCalibrationHtml,
  fetchCalibrationList,
  fetchCalibrationPdf,
  inferDetailPath,
  outputDir,
  parseArgs,
  parseArkmedsDate,
  parseCalibrationHtml,
  positiveInteger,
  requireSupabase,
  resolveOrganizacaoId,
  toCsv,
} from "./lib.mjs";

const args = parseArgs();
const limit = Math.min(positiveInteger(args.limit, 20), 500);
const offset = positiveInteger(args.offset, 0);
const downloadPdfs = args["baixar-pdfs"] === true;
const stagingRequested = args["gravar-staging"] === true;
const stagingConfirmed = process.env.CONFIRMAR_STAGING_CALIBRACOES === "true";
const writeStaging = stagingRequested && stagingConfirmed;
const executionId = `calibracoes-${new Date().toISOString().replace(/[:.]/g, "-")}`;

function buildCalibrationRecord(listItem, detailPath, parsed, pdf) {
  const fields = parsed?.fields || {};
  const tables = parsed?.tables || [];
  const standardIds = [...new Set(tables.map((table) => Number(table.padrao)).filter(Number.isFinite))];
  let extractionStatus = "coletado";
  const extractionWarnings = [];

  if (!detailPath) extractionStatus = "formato_nao_suportado";
  else if (parsed?.tablesError) extractionStatus = "erro";
  else if (!tables.length) extractionStatus = "parcial";
  if (!tables.length) extractionWarnings.push("certificado_sem_tabelas_extraidas");
  if (parsed?.tablesError) extractionWarnings.push(`json_tabelas_invalido:${parsed.tablesError}`);

  return {
    arkmeds_calibracao_id: Number(listItem.id),
    arkmeds_numero_certificado: String(fields.numero || listItem.numero || ""),
    arkmeds_tipo_calibracao: Number(listItem.type_calibration || 1),
    arkmeds_empresa_id: Number(fields.solicitante?.id || listItem.solicitante_id) || null,
    arkmeds_equipamento_id: Number(fields.equipamento?.id || listItem.equipamento_id) || null,
    arkmeds_ordem_servico_id: Number(fields.ordem_servico?.id || listItem.ordem_servico) || null,
    arkmeds_procedimento_id: Number(fields.procedimento?.id) || null,
    arkmeds_padrao_ids: standardIds,
    empresa_nome: fields.solicitante?.text || listItem.solicitante || "",
    equipamento_descricao: fields.equipamento?.text || listItem.equipamento || "",
    procedimento_nome: fields.procedimento?.text || "",
    numero_ordem_servico: fields.ordem_servico?.text || String(listItem.ordem_servico || ""),
    data_calibracao: parseArkmedsDate(fields.data_criacao || listItem.data_criacao),
    data_emissao: parseArkmedsDate(fields.data_emissao),
    data_validade: parseArkmedsDate(fields.validade || listItem.validade),
    local_calibracao: fields.local || "",
    temperatura_texto: fields.temperatura || "",
    incerteza_temperatura_texto: fields.incerteza_temperatura || "",
    umidade_texto: fields.umidade || "",
    incerteza_umidade_texto: fields.incerteza_umidade || "",
    pressao_atmosferica_texto: fields.pressao_atmosferica || "",
    incerteza_pressao_texto: fields.incerteza_pressao || "",
    tecnico_executor: fields.tecnico_executor?.text || "",
    responsavel_tecnico: fields.responsavel_tecnico?.text || "",
    responsavel_solicitante: fields.responsavel_solicitante || "",
    observacoes: fields.observacoes || "",
    pdf_original_url: listItem.print_url ? `${arkmedsBaseUrl}${listItem.print_url}` : "",
    pdf_original_hash: pdf?.sha256 || null,
    pdf_original_bytes: pdf?.bytes || null,
    rota_detalhe: detailPath || "",
    tipo_formulario: detailPath?.includes("/manual/") ? "manual" : detailPath ? "equipamento" : "desconhecido",
    status_extracao: extractionStatus,
    avisos_extracao: extractionWarnings,
    dados_lista_json: listItem,
    dados_formulario_json: fields,
    tabelas_brutas_json: tables,
    tabelas: tables.map((table, tableIndex) => ({
      ordem: tableIndex + 1,
      ...table,
      pontos: (table.linhas || []).map((point, pointIndex) => ({
        ordem: pointIndex + 1,
        ...point,
        leituras: (point.medidos || []).map((value, readingIndex) => ({
          ordem: readingIndex + 1,
          valor: value,
        })),
      })),
    })),
  };
}

async function saveToStaging(supabase, organizacaoId, records) {
  for (const record of records) {
    const parentPayload = {
      organizacao_id: organizacaoId,
      arkmeds_calibracao_id: record.arkmeds_calibracao_id,
      arkmeds_numero_certificado: record.arkmeds_numero_certificado || null,
      arkmeds_tipo_calibracao: record.arkmeds_tipo_calibracao,
      arkmeds_empresa_id: record.arkmeds_empresa_id,
      arkmeds_equipamento_id: record.arkmeds_equipamento_id,
      arkmeds_ordem_servico_id: record.arkmeds_ordem_servico_id,
      arkmeds_procedimento_id: record.arkmeds_procedimento_id,
      arkmeds_padrao_ids: record.arkmeds_padrao_ids,
      empresa_nome: record.empresa_nome || null,
      equipamento_descricao: record.equipamento_descricao || null,
      procedimento_nome: record.procedimento_nome || null,
      numero_ordem_servico: record.numero_ordem_servico || null,
      data_calibracao: record.data_calibracao,
      data_emissao: record.data_emissao,
      data_validade: record.data_validade,
      local_calibracao: record.local_calibracao || null,
      temperatura_texto: record.temperatura_texto || null,
      incerteza_temperatura_texto: record.incerteza_temperatura_texto || null,
      umidade_texto: record.umidade_texto || null,
      incerteza_umidade_texto: record.incerteza_umidade_texto || null,
      pressao_atmosferica_texto: record.pressao_atmosferica_texto || null,
      incerteza_pressao_texto: record.incerteza_pressao_texto || null,
      tecnico_executor: record.tecnico_executor || null,
      responsavel_tecnico: record.responsavel_tecnico || null,
      responsavel_solicitante: record.responsavel_solicitante || null,
      observacoes: record.observacoes || null,
      pdf_original_url: record.pdf_original_url || null,
      pdf_original_hash: record.pdf_original_hash,
      pdf_original_bytes: record.pdf_original_bytes,
      rota_detalhe: record.rota_detalhe || null,
      tipo_formulario: record.tipo_formulario,
      status_extracao: record.status_extracao,
      avisos_validacao: record.avisos_extracao,
      dados_lista_json: record.dados_lista_json,
      dados_formulario_json: record.dados_formulario_json,
      tabelas_brutas_json: record.tabelas_brutas_json,
      coletado_em: new Date().toISOString(),
    };

    const { data: parent, error: parentError } = await supabase
      .from("staging_arkmeds_calibracoes")
      .upsert(parentPayload, { onConflict: "organizacao_id,arkmeds_calibracao_id" })
      .select("id")
      .single();
    if (parentError) throw new Error(`Certificado ${record.arkmeds_calibracao_id}: ${parentError.message}`);

    const { error: deleteError } = await supabase
      .from("staging_arkmeds_calibracao_tabelas")
      .delete()
      .eq("staging_calibracao_id", parent.id);
    if (deleteError) throw new Error(`Limpeza das tabelas ${record.arkmeds_calibracao_id}: ${deleteError.message}`);

    for (const table of record.tabelas) {
      const { data: stagingTable, error: tableError } = await supabase
        .from("staging_arkmeds_calibracao_tabelas")
        .insert({
          organizacao_id: organizacaoId,
          staging_calibracao_id: parent.id,
          arkmeds_calibracao_id: record.arkmeds_calibracao_id,
          ordem: table.ordem,
          arkmeds_tabela_id: Number(table.id) || null,
          nome: table.nome || null,
          tipo: Number(table.tipo) || null,
          grandeza: table.grandeza || table.nome || null,
          unidade: table.unidade || null,
          unidade_nominal: table.unidade_nominal || null,
          arkmeds_padrao_id: Number(table.padrao) || null,
          arkmeds_tabela_certificado_padrao_id: Number(table.tab_certificado_padrao) || null,
          resolucao_padrao_texto: String(table.resolucao_padrao ?? "") || null,
          resolucao_equipamento_texto: String(table.resolucao_equipamento ?? "") || null,
          criterio_aceitacao_texto: String(table.criterio_aceitacao ?? "") || null,
          erro_maximo_texto: String(table.erro_maximo ?? "") || null,
          fator_confiabilidade_texto: String(table.fator_confiabilidade ?? "") || null,
          corrigir_erro_sistematico: Boolean(table.corrigir_erro_sistematico),
          dados_brutos_json: table,
        })
        .select("id")
        .single();
      if (tableError) throw new Error(`Tabela ${record.arkmeds_calibracao_id}/${table.ordem}: ${tableError.message}`);

      for (const point of table.pontos) {
        const { data: stagingPoint, error: pointError } = await supabase
          .from("staging_arkmeds_calibracao_pontos")
          .insert({
            organizacao_id: organizacaoId,
            staging_tabela_id: stagingTable.id,
            arkmeds_calibracao_id: record.arkmeds_calibracao_id,
            ordem: point.ordem,
            valor_nominal_texto: String(point.nominal ?? "") || null,
            fator_k_origem_texto: String(point.k ?? "") || null,
            media_origem_texto: String(point.media ?? point.media_valores_medidos ?? "") || null,
            tendencia_origem_texto: String(point.tendencia ?? "") || null,
            incerteza_expandida_origem_texto: String(point.incerteza_expandida ?? point.ie ?? "") || null,
            veff_origem_texto: String(point.veff ?? "") || null,
            resultado_conformidade_origem: point.resultado_conformidade || null,
            observacoes: point.observacoes || null,
            dados_brutos_json: point,
          })
          .select("id")
          .single();
        if (pointError) throw new Error(`Ponto ${record.arkmeds_calibracao_id}/${table.ordem}/${point.ordem}: ${pointError.message}`);

        if (point.leituras.length) {
          const { error: readingError } = await supabase.from("staging_arkmeds_calibracao_leituras").insert(
            point.leituras.map((reading) => ({
              organizacao_id: organizacaoId,
              staging_ponto_id: stagingPoint.id,
              arkmeds_calibracao_id: record.arkmeds_calibracao_id,
              ordem: reading.ordem,
              valor_medido_texto: String(reading.valor ?? "") || null,
            }))
          );
          if (readingError) throw new Error(`Leituras ${record.arkmeds_calibracao_id}: ${readingError.message}`);
        }
      }
    }
  }
}

await ensureOutputDir();
if (stagingRequested && !stagingConfirmed) {
  console.warn("Staging nao sera gravado: defina CONFIRMAR_STAGING_CALIBRACOES=true.");
}

console.log(`Coletando ${limit} certificado(s), offset ${offset}. ArkMeds sera acessado somente para leitura.`);
const page = await fetchCalibrationList({ start: offset, length: limit });
const records = [];

for (const [index, listItem] of (page.data || []).entries()) {
  const detailPath = inferDetailPath(listItem);
  let parsed = null;
  let pdf = null;
  try {
    if (detailPath) parsed = parseCalibrationHtml(await fetchCalibrationHtml(detailPath));
    if (downloadPdfs && listItem.print_url) {
      pdf = await fetchCalibrationPdf(listItem.print_url);
      const pdfDir = path.join(outputDir, "pdfs");
      await fs.mkdir(pdfDir, { recursive: true });
      await fs.writeFile(path.join(pdfDir, `${listItem.id}.pdf`), pdf.buffer);
    }
    records.push(buildCalibrationRecord(listItem, detailPath, parsed, pdf));
    console.log(`[${index + 1}/${page.data.length}] ${listItem.id} - ${listItem.numero}`);
  } catch (error) {
    records.push({
      ...buildCalibrationRecord(listItem, detailPath, parsed, pdf),
      status_extracao: "erro",
      avisos_extracao: [error.message],
    });
    console.error(`[${index + 1}/${page.data.length}] ${listItem.id}: ${error.message}`);
  }
}

if (writeStaging) {
  const supabase = requireSupabase();
  const organizacaoId = await resolveOrganizacaoId(supabase);
  await saveToStaging(supabase, organizacaoId, records);
  await supabase.from("staging_arkmeds_calibracao_logs").insert({
    organizacao_id: organizacaoId,
    execucao_id: executionId,
    modo: "staging",
    etapa: "coleta",
    status: "concluido",
    mensagem: `${records.length} certificado(s) coletado(s).`,
    payload_json: { offset, limit, downloadPdfs },
  });
}

const jsonPath = path.join(outputDir, "coleta_calibracoes.json");
const csvPath = path.join(outputDir, "coleta_calibracoes.csv");
const summaryPath = path.join(outputDir, "coleta_calibracoes_resumo.md");
await fs.writeFile(jsonPath, JSON.stringify({ executionId, offset, limit, totalArkmeds: page.recordsTotal, records }, null, 2));
await fs.writeFile(
  csvPath,
  toCsv(records.map((record) => ({
    id: record.arkmeds_calibracao_id,
    numero: record.arkmeds_numero_certificado,
    empresa: record.empresa_nome,
    equipamento: record.equipamento_descricao,
    data: record.data_calibracao,
    validade: record.data_validade,
    procedimento: record.procedimento_nome,
    tabelas: record.tabelas.length,
    pontos: record.tabelas.reduce((sum, table) => sum + table.pontos.length, 0),
    leituras: record.tabelas.reduce((sum, table) => sum + table.pontos.reduce((pointSum, point) => pointSum + point.leituras.length, 0), 0),
    status: record.status_extracao,
    avisos: record.avisos_extracao,
  })), [
    { key: "id", label: "ID ArkMeds" },
    { key: "numero", label: "Certificado" },
    { key: "empresa", label: "Empresa" },
    { key: "equipamento", label: "Equipamento" },
    { key: "data", label: "Data" },
    { key: "validade", label: "Validade" },
    { key: "procedimento", label: "Procedimento" },
    { key: "tabelas", label: "Tabelas" },
    { key: "pontos", label: "Pontos" },
    { key: "leituras", label: "Leituras" },
    { key: "status", label: "Status" },
    { key: "avisos", label: "Avisos" },
  ])
);

const totalTables = records.reduce((sum, record) => sum + record.tabelas.length, 0);
const totalPoints = records.reduce((sum, record) => sum + record.tabelas.reduce((tableSum, table) => tableSum + table.pontos.length, 0), 0);
const totalReadings = records.reduce((sum, record) => sum + record.tabelas.reduce((tableSum, table) => tableSum + table.pontos.reduce((pointSum, point) => pointSum + point.leituras.length, 0), 0), 0);
await fs.writeFile(summaryPath, [
  "# Coleta de calibracoes ArkMeds",
  "",
  `- Execucao: ${executionId}`,
  `- Modo: ${writeStaging ? "staging confirmado" : "dry-run local"}`,
  `- Total disponivel no ArkMeds: ${page.recordsTotal ?? "-"}`,
  `- Certificados coletados: ${records.length}`,
  `- Tabelas metrologicas: ${totalTables}`,
  `- Pontos nominais: ${totalPoints}`,
  `- Leituras brutas: ${totalReadings}`,
  `- Erros: ${records.filter((record) => record.status_extracao === "erro").length}`,
  "",
  "Nenhum certificado foi importado para calibracao_execucoes.",
  "Os calculos finais ainda devem ser confrontados com o PDF original antes da importacao definitiva.",
  "",
].join("\n"));

console.log(`Coleta concluida: ${records.length} certificado(s), ${totalTables} tabela(s), ${totalPoints} ponto(s), ${totalReadings} leitura(s).`);
console.log(`Resultado: ${jsonPath}`);

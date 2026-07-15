import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  ensureOutputDir,
  outputDir,
  parseArgs,
  requireSupabase,
  toCsv,
} from "./lib.mjs";

const args = parseArgs();
const confirmed =
  args["confirmar-importacao"] === true &&
  process.env.CONFIRMAR_IMPORTACAO_CALIBRACOES === "true";
const mode = confirmed ? "importacao_real" : "dry_run";
const inputPath = path.join(outputDir, "lote_30_compativeis.json");
const reportDir = path.join(outputDir, "importacao");
const bucket = "calibracao-certificados";
const executionId = `calibracoes-${new Date().toISOString().replace(/[:.]/g, "-")}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function monthsBetween(start, end) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  return Math.max(1, (endYear - startYear) * 12 + endMonth - startMonth);
}

function timestampFor(date) {
  return `${date}T12:00:00-03:00`;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function insertRow(client, table, row) {
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const result = await client.query(
    `insert into public.${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) values (${placeholders.join(",")}) returning id`,
    values
  );
  return result.rows[0].id;
}

async function insertLog(client, organizacaoId, sourceId, status, message, payload = {}) {
  await insertRow(client, "staging_arkmeds_calibracao_logs", {
    organizacao_id: organizacaoId,
    execucao_id: executionId,
    modo: mode,
    arkmeds_calibracao_id: sourceId,
    etapa: "importacao_lote_30",
    status,
    mensagem: message,
    payload_json: payload,
  });
}

function validateCertificate(item) {
  assert(Number.isInteger(item.arkmeds_calibracao_id), "ID ArkMeds invalido.");
  assert(/^\d+$/.test(String(item.arkmeds_numero_certificado)), "Numero do certificado nao numerico.");
  assert(item.empresa_id && item.equipamento_id && item.procedimento_id, "Vinculos principais ausentes.");
  assert(item.data_calibracao && item.data_emissao && item.data_validade, "Datas obrigatorias ausentes.");
  assert(item.tabelas?.length, "Certificado sem tabelas.");
  assert(item.pdf_local_path && item.pdf_original_hash, "PDF original ausente.");

  for (const table of item.tabelas) {
    assert(table.pontos?.length, `Tabela ${table.nome} sem pontos.`);
    for (const point of table.pontos) {
      assert(Number.isFinite(point.valor_nominal), `Ponto nominal invalido em ${table.nome}.`);
      assert(point.leituras?.length, `Ponto sem leituras em ${table.nome}.`);
      assert(point.leituras.every((reading) => Number.isFinite(reading.valor)), `Leitura invalida em ${table.nome}.`);
      for (const field of ["media", "tendencia", "incerteza_expandida", "fator_k"]) {
        assert(Number.isFinite(point.resultado_pdf?.[field]), `Resultado ${field} invalido em ${table.nome}.`);
      }
    }
  }
}

async function validatePdf(item) {
  const buffer = await fs.readFile(item.pdf_local_path);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  assert(hash === item.pdf_original_hash, `Hash do PDF divergente para ${item.arkmeds_calibracao_id}.`);
  assert(buffer.subarray(0, 4).toString("utf-8") === "%PDF", `Arquivo PDF invalido para ${item.arkmeds_calibracao_id}.`);
  return buffer;
}

async function validateDatabaseLinks(client, organizacaoId, items) {
  const companyIds = [...new Set(items.map((item) => item.empresa_id))];
  const equipmentIds = [...new Set(items.map((item) => item.equipamento_id))];
  const procedureIds = [...new Set(items.map((item) => item.procedimento_id))];
  const companies = await client.query(
    "select id from public.empresas where organizacao_id=$1 and id=any($2::uuid[])",
    [organizacaoId, companyIds]
  );
  const equipment = await client.query(
    "select id,empresa_id from public.equipamentos where organizacao_id=$1 and id=any($2::uuid[])",
    [organizacaoId, equipmentIds]
  );
  const procedures = await client.query(
    "select id from public.calibracao_procedimentos where organizacao_id=$1 and id=any($2::uuid[])",
    [organizacaoId, procedureIds]
  );
  assert(companies.rowCount === companyIds.length, "Uma ou mais empresas do lote nao existem no Ipromed.");
  assert(equipment.rowCount === equipmentIds.length, "Um ou mais equipamentos do lote nao existem no Ipromed.");
  assert(procedures.rowCount === procedureIds.length, "Um ou mais procedimentos do lote nao existem no Ipromed.");
  const expectedOwner = new Map(items.map((item) => [item.equipamento_id, item.empresa_id]));
  for (const row of equipment.rows) {
    assert(row.empresa_id === expectedOwner.get(row.id), `Equipamento ${row.id} pertence a outra empresa.`);
  }
}

async function importCertificate(client, supabase, organizacaoId, item, pdfBuffer) {
  const existing = await client.query(
    "select id from public.calibracao_execucoes where organizacao_id=$1 and origem='arkmeds' and arkmeds_calibracao_id=$2",
    [organizacaoId, item.arkmeds_calibracao_id]
  );
  if (existing.rowCount) return { status: "ja_importado", id: existing.rows[0].id };

  const certificateCollision = await client.query(
    "select id from public.calibracao_execucoes where numero_certificado=$1",
    [String(item.arkmeds_numero_certificado)]
  );
  if (certificateCollision.rowCount) {
    throw new Error(`Numero de certificado ${item.arkmeds_numero_certificado} ja utilizado.`);
  }

  const executionUuid = crypto.randomUUID();
  const storagePath = `${organizacaoId}/${executionUuid}/ARK-CAL-${item.arkmeds_calibracao_id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(`Falha no upload do PDF: ${uploadError.message}`);

  const closedAt = timestampFor(item.data_emissao);
  try {
    await client.query("begin");
    const importedId = await insertRow(client, "calibracao_execucoes", {
      id: executionUuid,
      organizacao_id: organizacaoId,
      numero_certificado: String(item.arkmeds_numero_certificado),
      empresa_id: item.empresa_id,
      equipamento_id: item.equipamento_id,
      procedimento_id: item.procedimento_id,
      procedimento_nome_snapshot: item.procedimento_nome,
      procedimento_versao_snapshot: item.procedimento_versao || 1,
      norma_utilizada_snapshot: item.norma_utilizada,
      local_calibracao: item.local_calibracao,
      temperatura_ambiente: item.temperatura,
      incerteza_temperatura: item.incerteza_temperatura,
      umidade_relativa: item.umidade,
      incerteza_umidade: item.incerteza_umidade,
      pressao_atmosferica: item.pressao_atmosferica,
      incerteza_pressao: item.incerteza_pressao,
      observacoes: item.observacoes,
      data_calibracao: item.data_calibracao,
      data_emissao: item.data_emissao,
      data_validade: item.data_validade,
      validade_mes: `${item.data_validade.slice(0, 7)}-01`,
      validade_meses: monthsBetween(item.data_calibracao, item.data_validade),
      tecnico_executor_nome: item.tecnico_executor,
      responsavel_tecnico_nome: item.responsavel_tecnico,
      responsavel_solicitante: item.responsavel_solicitante,
      status: "fechada",
      criterio_conformidade_aplicado: false,
      resultado_geral: "sem_declaracao_conformidade",
      pdf_storage_path: storagePath,
      pdf_hash: item.pdf_original_hash,
      fechado_em: closedAt,
      created_at: closedAt,
      updated_at: closedAt,
      origem: "arkmeds",
      arkmeds_calibracao_id: item.arkmeds_calibracao_id,
      arkmeds_numero_certificado: item.arkmeds_numero_certificado,
      arkmeds_tipo_calibracao: item.arkmeds_tipo_calibracao,
      arkmeds_dados_brutos_json: {
        lista: item.dados_lista_json,
        formulario: item.dados_formulario_json,
        pdf_sha256: item.pdf_original_hash,
      },
      pdf_original_url: item.pdf_original_url,
    });

    for (const table of item.tabelas) {
      const tableId = await insertRow(client, "calibracao_execucao_tabelas", {
        organizacao_id: organizacaoId,
        execucao_id: importedId,
        procedimento_tabela_id: table.procedimento_tabela_id,
        nome_snapshot: table.nome,
        grandeza_snapshot: table.grandeza,
        unidade_snapshot: table.unidade,
        quantidade_leituras_snapshot: table.quantidade_leituras,
        padrao_id: table.padrao_id,
        padrao_tabela_id: table.padrao_tabela_id,
        padrao_nome_snapshot: table.padrao_nome,
        padrao_numero_certificado_snapshot: table.padrao_numero_certificado,
        padrao_validade_snapshot: table.padrao_validade,
        padrao_laboratorio_snapshot: table.padrao_laboratorio,
        resolucao_padrao_snapshot: table.resolucao_padrao,
        resolucao_equipamento_snapshot: table.resolucao_equipamento,
        resolucao_equipamento_texto_snapshot: table.resolucao_equipamento_texto,
        fator_confiabilidade_modo_snapshot: "manual_execucao",
        incluir_criterio_aceitacao_snapshot: false,
        corrigir_erro_sistematico_snapshot: false,
        ordem: table.ordem,
        arkmeds_tabela_id: table.arkmeds_tabela_id,
        arkmeds_padrao_id: table.arkmeds_padrao_id,
        arkmeds_certificado_padrao_id: table.arkmeds_certificado_padrao_id,
        dados_origem_json: {
          tabela: table.dados_origem_json,
          certificado_padrao: table.certificado_padrao_origem,
        },
      });

      for (const point of table.pontos) {
        const result = point.resultado_pdf;
        const reference = point.ponto_padrao_referencia;
        const pointId = await insertRow(client, "calibracao_execucao_pontos", {
          organizacao_id: organizacaoId,
          execucao_tabela_id: tableId,
          ordem: point.ordem,
          valor_nominal: point.valor_nominal,
          valor_nominal_texto_snapshot: point.valor_nominal_texto,
          casas_decimais_valor_medido: point.casas_decimais_valor_medido,
          media_valores_medidos: result.media,
          tendencia_bruta: result.tendencia,
          tendencia_corrigida: result.tendencia,
          incerteza_padrao_certificado: reference?.incerteza_expandida ?? null,
          incerteza_padrao_certificado_texto: reference?.incerteza_expandida == null
            ? null
            : String(reference.incerteza_expandida),
          graus_liberdade_efetivos_veff: reference?.veff ?? null,
          veff_infinito: reference?.veff_infinito ?? false,
          fator_abrangencia_k: result.fator_k,
          incerteza_expandida: result.incerteza_expandida,
          incerteza_expandida_reportada: result.incerteza_expandida,
          resultado_conformidade: "sem_criterio",
          calculado_em: closedAt,
          created_at: closedAt,
          updated_at: closedAt,
          dados_origem_json: {
            ponto: point.dados_origem_json,
            linha_pdf: result.origem_linha_pdf,
            ponto_padrao_referencia: reference,
          },
        });

        for (const reading of point.leituras) {
          await insertRow(client, "calibracao_execucao_leituras", {
            organizacao_id: organizacaoId,
            execucao_ponto_id: pointId,
            ordem: reading.ordem,
            valor_medido: reading.valor,
            valor_medido_texto: reading.valor_texto,
            casas_decimais: reading.casas_decimais,
            created_at: closedAt,
          });
        }
      }
    }

    await insertLog(client, organizacaoId, item.arkmeds_calibracao_id, "importado", null, {
      calibracao_execucao_id: importedId,
      certificado: item.arkmeds_numero_certificado,
      pdf_storage_path: storagePath,
    });
    await client.query("commit");
    return { status: "importado", id: importedId, storagePath };
  } catch (error) {
    await client.query("rollback");
    await supabase.storage.from(bucket).remove([storagePath]);
    throw error;
  }
}

await ensureOutputDir();
await fs.mkdir(reportDir, { recursive: true });
const payload = JSON.parse(await fs.readFile(inputPath, "utf-8"));
const items = payload.selected || [];
assert(items.length === 30, `O lote deve conter exatamente 30 certificados; encontrado: ${items.length}.`);
assert(new Set(items.map((item) => item.arkmeds_calibracao_id)).size === 30, "IDs ArkMeds duplicados no lote.");
assert(new Set(items.map((item) => item.arkmeds_numero_certificado)).size === 30, "Numeros de certificado duplicados no lote.");

const pdfBuffers = new Map();
for (const item of items) {
  validateCertificate(item);
  pdfBuffers.set(item.arkmeds_calibracao_id, await validatePdf(item));
}

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const supabase = requireSupabase();
const results = [];

try {
  await validateDatabaseLinks(client, payload.organizacaoId, items);
  const requiredColumn = await client.query(
    "select 1 from information_schema.columns where table_schema='public' and table_name='calibracao_execucoes' and column_name='arkmeds_calibracao_id'"
  );
  assert(requiredColumn.rowCount === 1, "A migration 099_calibracoes_historicas_arkmeds.sql ainda nao foi aplicada.");

  const sourceIds = items.map((item) => String(item.arkmeds_calibracao_id));
  const certificateNumbers = items.map((item) => String(item.arkmeds_numero_certificado));
  const existingSources = await client.query(
    "select arkmeds_calibracao_id from public.calibracao_execucoes where organizacao_id=$1 and origem='arkmeds' and arkmeds_calibracao_id=any($2::bigint[])",
    [payload.organizacaoId, sourceIds]
  );
  const certificateCollisions = await client.query(
    "select numero_certificado from public.calibracao_execucoes where numero_certificado=any($1::bigint[])",
    [certificateNumbers]
  );

  if (!confirmed) {
    for (const item of items) {
      const alreadyImported = existingSources.rows.some(
        (row) => String(row.arkmeds_calibracao_id) === String(item.arkmeds_calibracao_id)
      );
      const collision = certificateCollisions.rows.some(
        (row) => String(row.numero_certificado) === String(item.arkmeds_numero_certificado)
      );
      results.push({
        arkmeds_id: item.arkmeds_calibracao_id,
        certificado: item.arkmeds_numero_certificado,
        empresa: item.empresa_nome,
        equipamento: item.equipamento_descricao,
        status: alreadyImported ? "ja_importado" : collision ? "colisao_numero" : "simulado",
        id_ipromed: "",
        tabelas: item.tabelas.length,
        pontos: item.tabelas.reduce((sum, table) => sum + table.pontos.length, 0),
        leituras: item.tabelas.reduce(
          (sum, table) => sum + table.pontos.reduce((pointSum, point) => pointSum + point.leituras.length, 0),
          0
        ),
        pdf_storage_path: "",
        erro: "",
      });
    }
  } else {
    for (const [index, item] of items.entries()) {
      try {
        const imported = await importCertificate(
          client,
          supabase,
          payload.organizacaoId,
          item,
          pdfBuffers.get(item.arkmeds_calibracao_id)
        );
        results.push({
          arkmeds_id: item.arkmeds_calibracao_id,
          certificado: item.arkmeds_numero_certificado,
          empresa: item.empresa_nome,
          equipamento: item.equipamento_descricao,
          status: imported.status,
          id_ipromed: imported.id,
          tabelas: item.tabelas.length,
          pontos: item.tabelas.reduce((sum, table) => sum + table.pontos.length, 0),
          leituras: item.tabelas.reduce(
            (sum, table) => sum + table.pontos.reduce((pointSum, point) => pointSum + point.leituras.length, 0),
            0
          ),
          pdf_storage_path: imported.storagePath || "",
          erro: "",
        });
        console.log(`[${index + 1}/30] ${item.arkmeds_numero_certificado}: ${imported.status}`);
      } catch (error) {
        results.push({
          arkmeds_id: item.arkmeds_calibracao_id,
          certificado: item.arkmeds_numero_certificado,
          empresa: item.empresa_nome,
          equipamento: item.equipamento_descricao,
          status: "erro",
          id_ipromed: "",
          tabelas: item.tabelas.length,
          pontos: 0,
          leituras: 0,
          pdf_storage_path: "",
          erro: error.message,
        });
        await insertLog(client, payload.organizacaoId, item.arkmeds_calibracao_id, "erro", error.message);
        console.error(`[${index + 1}/30] ${item.arkmeds_numero_certificado}: ${error.message}`);
      }
    }
  }
} finally {
  await client.end();
}

const columns = [
  { key: "arkmeds_id", label: "ID ArkMeds" },
  { key: "certificado", label: "Certificado" },
  { key: "empresa", label: "Empresa" },
  { key: "equipamento", label: "Equipamento" },
  { key: "status", label: "Status" },
  { key: "id_ipromed", label: "ID Ipromed" },
  { key: "tabelas", label: "Tabelas" },
  { key: "pontos", label: "Pontos" },
  { key: "leituras", label: "Leituras" },
  { key: "pdf_storage_path", label: "PDF Storage" },
  { key: "erro", label: "Erro" },
];
await fs.writeFile(path.join(reportDir, `${mode}_resultado.csv`), toCsv(results, columns));
const importedCount = results.filter((item) => item.status === "importado").length;
const simulatedCount = results.filter((item) => item.status === "simulado").length;
const errorCount = results.filter((item) => item.status === "erro" || item.status === "colisao_numero").length;
await fs.writeFile(
  path.join(reportDir, `${mode}_resumo.md`),
  `# Importacao de calibracoes ArkMeds\n\n` +
    `- Execucao: ${executionId}\n` +
    `- Modo: ${mode}\n` +
    `- Certificados no lote: ${items.length}\n` +
    `- Simulados: ${simulatedCount}\n` +
    `- Importados: ${importedCount}\n` +
    `- Ja importados: ${results.filter((item) => item.status === "ja_importado").length}\n` +
    `- Erros/colisoes: ${errorCount}\n` +
    `- Tabelas: ${results.reduce((sum, item) => sum + item.tabelas, 0)}\n` +
    `- Pontos: ${results.reduce((sum, item) => sum + item.pontos, 0)}\n` +
    `- Leituras: ${results.reduce((sum, item) => sum + item.leituras, 0)}\n`
);

console.log(`${mode}: ${results.length} certificado(s), ${importedCount} importado(s), ${errorCount} erro(s)/colisao(oes).`);
if (!confirmed) {
  console.log("Para importar: defina CONFIRMAR_IMPORTACAO_CALIBRACOES=true e use --confirmar-importacao.");
}

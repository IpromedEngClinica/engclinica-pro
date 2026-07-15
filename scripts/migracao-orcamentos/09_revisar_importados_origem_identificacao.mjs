import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { cleanText, outputDir, writeCsv } from "./lib.mjs";
import {
  buildMigrationIdentifier,
  getSpreadsheetOsNumber,
  identifierNeedsReview,
} from "./regras_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const REVIEW_DIR = path.join(outputDir, "revisao_100");
const REVIEW_FILE = path.join(REVIEW_DIR, "revisao_origem_identificacao.csv");
const PENDING_PREFIX = "Pendente de revisão da migração ArkMeds:";

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  return process.env.SUPABASE_DB_URL;
}

function appendPendingNote(observations, message) {
  const current = cleanText(observations);
  const withoutPrevious = current
    .split(/\n{2,}/)
    .filter((part) => !part.startsWith(PENDING_PREFIX))
    .join("\n\n");
  return [withoutPrevious, message ? `${PENDING_PREFIX} ${message}` : ""].filter(Boolean).join("\n\n") || null;
}

async function loadRows(client) {
  const { rows } = await client.query(`
    select
      o.id,
      o.numero,
      o.empresa_id,
      o.equipamento_id as equipamento_id_atual,
      o.ordem_servico_id as os_id_atual,
      o.origem as origem_atual,
      o.identificador as identificador_atual,
      o.arkmeds_orcamento_id,
      o.arkmeds_ordem_servico_numero as origem_os_atual,
      o.observacoes,
      e.nome as cliente,
      atual.numero as os_numero_atual,
      s.arkmeds_tipo_texto,
      s.equipamento_texto,
      s.descricao_equipamento,
      s.observacoes_gerais,
      s.arkmeds_observacoes_planilha,
      s.dados_planilha_json
    from public.orcamentos o
    join public.empresas e on e.id = o.empresa_id
    join public.staging_arkmeds_orcamentos s
      on s.arkmeds_orcamento_id = o.arkmeds_orcamento_id
    left join public.ordens_servico atual on atual.id = o.ordem_servico_id
    where o.origem_migracao = 'arkmeds'
    order by o.arkmeds_orcamento_id
  `);

  const sourceNumbers = [...new Set(rows.map(getSpreadsheetOsNumber).filter(Boolean))];
  const { rows: orders } = sourceNumbers.length
    ? await client.query(`
        select os.id, os.numero, os.empresa_id, os.equipamento_id,
          coalesce(te.nome, eq.tipo_texto) as os_tipo_equipamento
        from public.ordens_servico os
        left join public.equipamentos eq on eq.id = os.equipamento_id
        left join public.tipos_equipamento te on te.id = eq.tipo_equipamento_id
        where os.numero = any($1::text[])
      `, [sourceNumbers])
    : { rows: [] };

  const byNumber = new Map();
  for (const order of orders) {
    if (!byNumber.has(order.numero)) byNumber.set(order.numero, []);
    byNumber.get(order.numero).push(order);
  }

  return rows.map((row) => {
    const sourceOs = getSpreadsheetOsNumber(row);
    const candidates = (byNumber.get(sourceOs) || []).filter((order) => order.empresa_id === row.empresa_id);
    const exactOrder = candidates.length === 1 ? candidates[0] : null;
    row.os_tipo_equipamento = exactOrder?.os_tipo_equipamento || null;
    return { row, sourceOs, exactOrder, candidates };
  });
}

async function main() {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  const client = new Client({ connectionString: requireDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const entries = await loadRows(client);
    const report = [];

    if (APPLY) await client.query("begin");
    for (const { row, sourceOs, exactOrder, candidates } of entries) {
      let pending = "";
      if (sourceOs && !exactOrder) {
        pending = candidates.length > 1
          ? `OS ${sourceOs} possui mais de um vínculo possível para o cliente; vínculo não aplicado.`
          : `OS ${sourceOs} não foi localizada para o mesmo cliente; vínculo não aplicado.`;
      }

      const identifier = buildMigrationIdentifier(row);
      if (identifierNeedsReview(identifier)) {
        pending = [pending, "A planilha não identifica com segurança o equipamento do orçamento."].filter(Boolean).join(" ");
      }
      const origin = sourceOs ? "os" : "avulso";
      const observations = appendPendingNote(row.observacoes, pending);
      const equipmentId = exactOrder?.equipamento_id || null;
      const orderId = exactOrder?.id || null;

      if (APPLY) {
        await client.query(`
          update public.orcamentos
          set origem = $2,
              arkmeds_ordem_servico_numero = $3,
              ordem_servico_id = $4,
              equipamento_id = $5,
              identificador = $6,
              observacoes = $7,
              updated_at = now()
          where id = $1
        `, [row.id, origin, sourceOs, orderId, equipmentId, identifier, observations]);
      }

      report.push({
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.numero,
        cliente: row.cliente,
        origem_os_planilha: sourceOs,
        os_sistema_anterior: row.os_numero_atual,
        os_sistema_corrigida: exactOrder?.numero || "",
        origem_anterior: row.origem_atual,
        origem_corrigida: origin,
        identificacao_anterior: row.identificador_atual,
        identificacao_corrigida: identifier,
        resultado: pending ? "pendente_revisao" : sourceOs ? "os_vinculada" : "avulso",
        pendencia: pending,
      });
    }
    if (APPLY) await client.query("commit");

    await writeCsv(REVIEW_FILE, report, [
      "arkmeds_orcamento_id", "numero_orcamento", "cliente", "origem_os_planilha",
      "os_sistema_anterior", "os_sistema_corrigida", "origem_anterior", "origem_corrigida",
      "identificacao_anterior", "identificacao_corrigida", "resultado", "pendencia",
    ]);

    const summary = report.reduce((acc, item) => {
      acc[item.resultado] = (acc[item.resultado] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify({ modo: APPLY ? "aplicado" : "simulacao", total: report.length, ...summary, relatorio: REVIEW_FILE }, null, 2));
  } catch (error) {
    if (APPLY) await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

await main();

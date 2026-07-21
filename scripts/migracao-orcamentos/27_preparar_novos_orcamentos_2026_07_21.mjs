import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  normalizeComparableText,
  normalizeExactCompanyName,
  outputDir,
  writeCsv,
} from "./lib.mjs";

const { Client } = pg;
const TARGET_IDS = [4668, 4669, 4670, 4671, 4672];
const LOT_PATH = path.join(outputDir, "lote_novos_2026_07_21.csv");
const MANUAL_STANDALONE_MARKER = "AVULSO_CONFIRMADO_PELO_USUARIO";

function append(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function uniqueCompany(row, byLegalName, byName) {
  const legal = byLegalName.get(normalizeExactCompanyName(row.arkmeds_solicitante)) || [];
  const legalIds = [...new Set(legal.map((company) => company.id))];
  if (legalIds.length === 1) return { id: legalIds[0], method: "razao_social_exata" };

  const normalized = byName.get(normalizeComparableText(row.arkmeds_solicitante)) || [];
  const normalizedIds = [...new Set(normalized.map((company) => company.id))];
  if (normalizedIds.length === 1) return { id: normalizedIds[0], method: "nome_exato_normalizado" };
  return { id: null, method: "nao_resolvida" };
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const [{ rows }, { rows: companies }] = await Promise.all([
      client.query(
        `select * from public.staging_arkmeds_orcamentos
         where arkmeds_orcamento_id = any($1::int[])
         order by arkmeds_orcamento_id`,
        [TARGET_IDS],
      ),
      client.query("select id, nome, nome_fantasia from public.empresas where ativo = true"),
    ]);
    if (rows.length !== TARGET_IDS.length) {
      throw new Error(`Esperados ${TARGET_IDS.length} registros; encontrados ${rows.length}.`);
    }

    const byLegalName = new Map();
    const byName = new Map();
    for (const company of companies) {
      append(byLegalName, normalizeExactCompanyName(company.nome), company);
      append(byName, normalizeComparableText(company.nome), company);
      append(byName, normalizeComparableText(company.nome_fantasia), company);
    }

    const report = rows.map((row) => {
      const company = uniqueCompany(row, byLegalName, byName);
      return {
        arkmeds_orcamento_id: row.arkmeds_orcamento_id,
        numero_orcamento: row.arkmeds_orcamento_numero,
        cliente_arkmeds: row.arkmeds_solicitante,
        empresa_id_resolvida: company.id || "",
        empresa_resolvida_por: company.method,
        status_arkmeds: row.arkmeds_status_grupo,
        valor_total: row.arkmeds_valor_total,
        soma_itens: row.soma_itens,
        valor_deslocamento: row.arkmeds_orcamento_id === 4672 ? 480 : 0,
        resultado: company.id ? "pronto" : "empresa_nao_resolvida",
      };
    });
    const unresolved = report.filter((row) => row.resultado !== "pronto");
    if (unresolved.length) {
      throw new Error(`Clientes nao resolvidos: ${unresolved.map((row) => row.cliente_arkmeds).join(", ")}`);
    }

    await client.query("begin");
    for (const item of report) {
      const deslocamento = Number(item.valor_deslocamento || 0);
      const difference = Number(item.valor_total || 0) - Number(item.soma_itens || 0) - deslocamento;
      if (Math.abs(difference) > 0.01) {
        throw new Error(`Valor incoerente no orcamento ${item.numero_orcamento}: diferenca ${difference.toFixed(2)}.`);
      }
      await client.query(
        `update public.staging_arkmeds_orcamentos
            set empresa_id_resolvida = $2,
                ordem_servico_id_resolvida = null,
                equipamento_id_resolvido = null,
                os_candidata_id = null,
                os_candidata_numero = null,
                classificacao_vinculo_os = 'sem_os_avulso',
                motivos_associacao_os = case
                  when $3 = any(coalesce(motivos_associacao_os, '{}'::text[]))
                    then motivos_associacao_os
                  else array_append(coalesce(motivos_associacao_os, '{}'::text[]), $3)
                end,
                motivos_bloqueantes = '{}'::text[],
                status_validacao = 'ok_para_importar_com_detalhes_parciais',
                arkmeds_valor_deslocamento = $4,
                diferenca_valor = 0,
                atualizado_em = now()
          where arkmeds_orcamento_id = $1`,
        [item.arkmeds_orcamento_id, item.empresa_id_resolvida, MANUAL_STANDALONE_MARKER, deslocamento],
      );
    }
    await client.query("commit");

    await writeCsv(LOT_PATH, report, [
      "arkmeds_orcamento_id", "numero_orcamento", "cliente_arkmeds",
      "empresa_id_resolvida", "empresa_resolvida_por", "status_arkmeds",
      "valor_total", "soma_itens", "valor_deslocamento", "resultado",
    ]);
    await fs.writeFile(
      path.join(outputDir, "novos_orcamentos_2026_07_21_resumo.json"),
      JSON.stringify({ total: report.length, prontos: report.length, registros: report }, null, 2),
      "utf-8",
    );
    console.log(JSON.stringify({ total: report.length, prontos: report.length, registros: report }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

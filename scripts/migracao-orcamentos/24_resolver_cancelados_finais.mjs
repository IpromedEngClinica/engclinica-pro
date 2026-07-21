import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { outputDir, writeCsv } from "./lib.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar") &&
  process.env.CONFIRMAR_IMPORTACAO_ORCAMENTOS === "true";
const TEST_IDS = [3843, 3845];
const LOT_PATH = path.join(outputDir, "lote_cancelados_finais_resolvidos_2026_07_21.csv");
const REPORT_DIR = path.join(outputDir, "resolucao-cancelados-finais-2026-07-21");

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("Configure SUPABASE_DB_URL.");
}

await fs.mkdir(REPORT_DIR, { recursive: true });
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const { rows: candidates } = await client.query(`
    select
      s.arkmeds_orcamento_id,
      s.arkmeds_orcamento_numero_original,
      s.arkmeds_orcamento_numero,
      s.arkmeds_solicitante,
      s.status_validacao,
      s.ordem_servico_id_resolvida,
      os.numero as numero_os,
      os.empresa_id,
      os.equipamento_id,
      empresa.nome as cliente_os,
      coalesce(items.quantidade, 0)::int as quantidade_itens,
      coalesce(items.valor, 0)::numeric(14,2) as soma_itens,
      s.arkmeds_valor_total
    from public.staging_arkmeds_orcamentos s
    join public.ordens_servico os on os.id = s.ordem_servico_id_resolvida
    join public.empresas empresa on empresa.id = os.empresa_id
    left join lateral (
      select count(*) as quantidade, coalesce(sum(item.valor_total_calculado), 0) as valor
      from public.staging_arkmeds_orcamento_itens item
      where item.staging_orcamento_id = s.id
    ) items on true
    where s.arkmeds_status_grupo = 'cancelados'
      and s.arkmeds_orcamento_id <> all($1::bigint[])
      and s.status_validacao in ('pendente_os', 'pendente_itens')
      and not coalesce(s.motivos_associacao_os, '{}'::text[])
        @> array['IGNORAR_SEM_ITENS_PELO_USUARIO']::text[]
      and not exists (
        select 1
        from public.orcamentos o
        where o.origem_migracao = 'arkmeds'
          and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
      )
    order by s.arkmeds_orcamento_id
  `, [TEST_IDS]);

  const invalid = candidates.filter((row) =>
    !row.ordem_servico_id_resolvida ||
    Number(row.quantidade_itens) === 0 ||
    Math.abs(Number(row.soma_itens) - Number(row.arkmeds_valor_total)) > 0.05
  );

  if (invalid.length) {
    console.error(JSON.stringify(invalid.map((row) => ({
      arkmeds_orcamento_id: row.arkmeds_orcamento_id,
      numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
      numero_os: row.numero_os,
      quantidade_itens: row.quantidade_itens,
      soma_itens: row.soma_itens,
      valor_total: row.arkmeds_valor_total,
    })), null, 2));
    throw new Error(`${invalid.length} registro(s) falharam na validacao de OS, itens ou valor.`);
  }

  const { rows: tests } = await client.query(`
    select arkmeds_orcamento_id, arkmeds_orcamento_numero_original, arkmeds_solicitante
    from public.staging_arkmeds_orcamentos
    where arkmeds_orcamento_id = any($1::bigint[])
    order by arkmeds_orcamento_id
  `, [TEST_IDS]);

  if (APPLY) {
    await client.query("begin");
    try {
      await client.query(`
        update public.staging_arkmeds_orcamentos s
        set
          arkmeds_ordem_servico_numero = os.numero,
          os_candidata_id = os.id,
          os_candidata_numero = os.numero,
          cliente_os_candidato = empresa.nome,
          empresa_id_resolvida = os.empresa_id,
          equipamento_id_resolvido = os.equipamento_id,
          classificacao_vinculo_os = 'com_os_confirmada',
          score_os = 100,
          confianca_os = 'alta',
          motivos_associacao_os = array['VINCULO_OS_RESOLVIDO_CONFIRMADO_PELO_USUARIO']::text[],
          motivos_bloqueantes = array_remove(
            array_remove(
              array_remove(coalesce(s.motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
              'POSSIVEL_OS_POR_NUMERO'
            ),
            'TIPO_MISTO_ENDPOINT_INCOMPLETO'
          ),
          status_validacao = 'historico_consulta',
          atualizado_em = now()
        from public.ordens_servico os
        join public.empresas empresa on empresa.id = os.empresa_id
        where s.ordem_servico_id_resolvida = os.id
          and s.arkmeds_orcamento_id = any($1::bigint[])
      `, [candidates.map((row) => row.arkmeds_orcamento_id)]);

      await client.query(`
        delete from public.staging_arkmeds_orcamento_itens item
        using public.staging_arkmeds_orcamentos s
        where item.staging_orcamento_id = s.id
          and s.arkmeds_orcamento_id = any($1::bigint[])
      `, [TEST_IDS]);
      await client.query(`
        delete from public.staging_arkmeds_orcamentos
        where arkmeds_orcamento_id = any($1::bigint[])
      `, [TEST_IDS]);

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  const lot = candidates.map((row) => ({
    arkmeds_orcamento_id: row.arkmeds_orcamento_id,
    numero_orcamento: row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero,
    numero_os: row.numero_os,
    cliente_os: row.cliente_os,
    quantidade_itens: row.quantidade_itens,
    valor_total: row.arkmeds_valor_total,
  }));
  await writeCsv(LOT_PATH, lot, [
    "arkmeds_orcamento_id",
    "numero_orcamento",
    "numero_os",
    "cliente_os",
    "quantidade_itens",
    "valor_total",
  ]);
  await writeCsv(path.join(REPORT_DIR, APPLY ? "aplicacao.csv" : "dry_run.csv"), lot, [
    "arkmeds_orcamento_id",
    "numero_orcamento",
    "numero_os",
    "cliente_os",
    "quantidade_itens",
    "valor_total",
  ]);
  await writeCsv(path.join(REPORT_DIR, "testes_excluidos.csv"), tests, [
    "arkmeds_orcamento_id",
    "arkmeds_orcamento_numero_original",
    "arkmeds_solicitante",
  ]);

  console.log(JSON.stringify({
    modo: APPLY ? "aplicacao" : "dry_run",
    prontos_para_importar: candidates.length,
    testes_para_excluir: tests.length,
    sem_os_itens_ou_valor_invalido: invalid.length,
    lote: LOT_PATH,
  }, null, 2));
} finally {
  await client.end();
}

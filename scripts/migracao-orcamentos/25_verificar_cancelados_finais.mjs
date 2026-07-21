import pg from "pg";

const { Client } = pg;
const TEST_IDS = [3843, 3845];

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("Configure SUPABASE_DB_URL.");
}

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const { rows: imported } = await client.query(`
    select
      count(*)::int as total,
      count(*) filter (where o.status = 'cancelado')::int as cancelados,
      count(*) filter (where o.ordem_servico_id is not null)::int as vinculados,
      count(*) filter (
        where not exists (
          select 1 from public.orcamento_itens item where item.orcamento_id = o.id
        )
      )::int as sem_itens,
      coalesce(sum((
        select count(*) from public.orcamento_itens item where item.orcamento_id = o.id
      )), 0)::int as total_itens
    from public.orcamentos o
    where o.origem_migracao = 'arkmeds'
      and o.arkmeds_orcamento_id in (
        select s.arkmeds_orcamento_id
        from public.staging_arkmeds_orcamentos s
        where s.motivos_associacao_os
          @> array['VINCULO_OS_RESOLVIDO_CONFIRMADO_PELO_USUARIO']::text[]
      )
  `);

  const { rows: exclusions } = await client.query(`
    select
      (select count(*) from public.staging_arkmeds_orcamentos
       where arkmeds_orcamento_id = any($1::bigint[]))::int as testes_no_staging,
      (select count(*) from public.orcamentos
       where origem_migracao = 'arkmeds'
         and arkmeds_orcamento_id = any($1::bigint[]))::int as testes_importados,
      (select count(*) from public.staging_arkmeds_orcamentos s
       where s.motivos_associacao_os
         @> array['IGNORAR_SEM_ITENS_PELO_USUARIO']::text[])::int as vazios_ignorados_staging,
      (select count(*) from public.orcamentos o
       where o.origem_migracao = 'arkmeds'
         and o.arkmeds_orcamento_id in (
           select s.arkmeds_orcamento_id
           from public.staging_arkmeds_orcamentos s
           where s.motivos_associacao_os
             @> array['IGNORAR_SEM_ITENS_PELO_USUARIO']::text[]
         ))::int as vazios_importados
  `, [TEST_IDS]);

  const { rows: mixedBudget } = await client.query(`
    select
      o.numero,
      o.status,
      os.numero as numero_os,
      count(item.id)::int as quantidade_itens,
      coalesce(sum(item.valor_total), 0)::numeric(14,2) as soma_itens,
      o.valor_total
    from public.orcamentos o
    left join public.ordens_servico os on os.id = o.ordem_servico_id
    left join public.orcamento_itens item on item.orcamento_id = o.id
    where o.origem_migracao = 'arkmeds'
      and o.arkmeds_orcamento_id = 1790
    group by o.numero, o.status, os.numero, o.valor_total
  `);

  console.log(JSON.stringify({
    importacao_final: imported[0],
    exclusoes: exclusions[0],
    orcamento_misto_1790: mixedBudget[0],
  }, null, 2));
} finally {
  await client.end();
}

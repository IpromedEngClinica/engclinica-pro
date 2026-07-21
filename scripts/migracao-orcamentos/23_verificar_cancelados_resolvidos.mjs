import pg from "pg";

const { Client } = pg;
const discountIds = [2594, 2432, 996, 940, 880];

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("Configure SUPABASE_DB_URL.");
}

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const { rows: summaryRows } = await client.query(`
    select
      count(*)::int as total,
      count(*) filter (where o.status = 'cancelado')::int as cancelados,
      count(*) filter (where o.ordem_servico_id is not null)::int as vinculados,
      count(*) filter (where o.desconto_valor > 0)::int as com_desconto,
      coalesce(sum(o.desconto_valor), 0)::numeric(12,2) as soma_descontos,
      count(*) filter (
        where not exists (
          select 1 from public.orcamento_itens item where item.orcamento_id = o.id
        )
      )::int as sem_itens
    from public.orcamentos o
    where o.origem_migracao = 'arkmeds'
      and o.arkmeds_orcamento_id in (
        select arkmeds_orcamento_id
        from public.staging_arkmeds_orcamentos
        where arkmeds_status_grupo = 'cancelados'
          and (
            arkmeds_desconto > 0
            or motivos_associacao_os @> array['NUMERO_OS_ORCAMENTO_E_CLIENTE_COINCIDENTES']::text[]
          )
      )
  `);

  const { rows: discounts } = await client.query(`
    select
      arkmeds_orcamento_id,
      numero,
      (valor_total + desconto_aplicado)::numeric(14,2) as valor_antes_desconto,
      desconto_tipo,
      desconto_valor,
      desconto_aplicado,
      valor_total
    from public.orcamentos
    where origem_migracao = 'arkmeds'
      and arkmeds_orcamento_id = any($1::bigint[])
    order by arkmeds_orcamento_id
  `, [discountIds]);

  console.log(JSON.stringify({ resumo: summaryRows[0], descontos: discounts }, null, 2));
} finally {
  await client.end();
}

-- ============================================================
-- EngClinica Pro
-- Migration: 082_reordenar_os_locais_apos_arkmeds.sql
-- Objetivo:
-- - Preservar a numeracao historica das OS importadas da ArkMeds
-- - Reposicionar OS criadas no sistema novo para depois do maior numero historico
-- - Ajustar a sequence para novas OS continuarem apos a faixa migrada
-- ============================================================

do $$
declare
  v_max_historico bigint;
begin
  select coalesce(max(numero_ordem), 0)
  into v_max_historico
  from public.ordens_servico
  where arkmeds_os_id is not null;

  with locais as (
    select
      id,
      (v_max_historico + row_number() over (order by created_at, id))::text as novo_numero
    from public.ordens_servico
    where arkmeds_os_id is null
      and numero_ordem <= v_max_historico
  )
  update public.ordens_servico os
  set
    numero = locais.novo_numero,
    updated_at = now()
  from locais
  where os.id = locais.id;

  perform setval(
    'public.ordens_servico_numero_seq',
    greatest(
      v_max_historico,
      coalesce((select max(numero_ordem) from public.ordens_servico), v_max_historico)
    ),
    true
  );
end;
$$;

notify pgrst, 'reload schema';

-- Fim da migration 082_reordenar_os_locais_apos_arkmeds.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 085_corrigir_validade_preventivas_planos.sql
-- Objetivo:
-- - Corrigir validade de preventivas geradas por ciclos de planos
-- - Usar sempre a data de execucao do ciclo como referencia
-- - Fechar a validade no ultimo dia do mes correspondente
-- ============================================================

with validade_checklists as (
  select
    checklist.id as checklist_id,
    (
      date_trunc(
        'month',
        coalesce(ciclo.data_abertura, os.data_abertura)::date
        + make_interval(months => coalesce(checklist.validade_meses, 12)::int)
      )
      + interval '1 month - 1 day'
    )::date as data_validade
  from public.os_checklists_preventiva checklist
  join public.ordens_servico os on os.id = checklist.ordem_servico_id
  join public.plano_ciclos ciclo on ciclo.id = os.plano_ciclo_id
  where os.plano_ciclo_id is not null
)
update public.os_checklists_preventiva checklist
set data_validade = validade_checklists.data_validade
from validade_checklists
where checklist.id = validade_checklists.checklist_id
  and checklist.data_validade is distinct from validade_checklists.data_validade;

with ultimas_preventivas as (
  select distinct on (os.equipamento_id)
    os.equipamento_id,
    coalesce(ciclo.data_abertura, os.data_abertura)::date as data_ultima_preventiva,
    checklist.data_validade as data_proxima_preventiva
  from public.ordens_servico os
  join public.plano_ciclos ciclo on ciclo.id = os.plano_ciclo_id
  join public.os_checklists_preventiva checklist on checklist.ordem_servico_id = os.id
  where os.equipamento_id is not null
    and os.plano_ciclo_id is not null
    and os.status_sistema = 'fechada'
  order by
    os.equipamento_id,
    coalesce(ciclo.data_abertura, os.data_abertura)::date desc,
    os.data_fechamento desc nulls last,
    os.created_at desc
)
update public.equipamentos equipamento
set
  data_ultima_preventiva = ultimas_preventivas.data_ultima_preventiva,
  data_proxima_preventiva = ultimas_preventivas.data_proxima_preventiva,
  updated_at = now()
from ultimas_preventivas
where equipamento.id = ultimas_preventivas.equipamento_id
  and (
    equipamento.data_ultima_preventiva is distinct from ultimas_preventivas.data_ultima_preventiva
    or equipamento.data_proxima_preventiva is distinct from ultimas_preventivas.data_proxima_preventiva
  );

notify pgrst, 'reload schema';

-- Fim da migration 085_corrigir_validade_preventivas_planos.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 088_plano_ciclos_cronograma_config.sql
-- Objetivo:
-- - Persistir a configuracao visual do cronograma por ciclo
-- - Manter meses realizados e previstos fixos para reemissao do PDF
-- ============================================================

alter table public.plano_ciclos
  add column if not exists cronograma_mes_inicio text,
  add column if not exists cronograma_meses_realizados text[] not null default '{}',
  add column if not exists cronograma_meses_previstos text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plano_ciclos_cronograma_mes_inicio_check'
  ) then
    alter table public.plano_ciclos
      add constraint plano_ciclos_cronograma_mes_inicio_check
      check (
        cronograma_mes_inicio is null
        or cronograma_mes_inicio ~ '^[0-9]{4}-[0-9]{2}$'
      );
  end if;
end;
$$;

comment on column public.plano_ciclos.cronograma_mes_inicio is
  'Mes inicial YYYY-MM usado para montar as 13 colunas do cronograma do ciclo.';

comment on column public.plano_ciclos.cronograma_meses_realizados is
  'Meses YYYY-MM marcados como visita realizada no cronograma do ciclo.';

comment on column public.plano_ciclos.cronograma_meses_previstos is
  'Meses YYYY-MM marcados como visitas previstas no cronograma do ciclo.';

notify pgrst, 'reload schema';

-- Fim da migration 088_plano_ciclos_cronograma_config.sql

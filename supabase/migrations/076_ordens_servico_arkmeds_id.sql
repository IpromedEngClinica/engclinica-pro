-- ============================================================
-- EngClinica Pro
-- Migration: 076_ordens_servico_arkmeds_id.sql
-- Objetivo:
-- - Preservar o ID interno legado da Arkmeds nas OS importadas
-- - Evitar reimportacao acidental do mesmo registro legado
-- ============================================================

alter table public.ordens_servico
  add column if not exists arkmeds_os_id bigint;

create unique index if not exists idx_ordens_servico_arkmeds_os_id
on public.ordens_servico (organizacao_id, arkmeds_os_id)
where arkmeds_os_id is not null;

notify pgrst, 'reload schema';

-- Fim da migration 076_ordens_servico_arkmeds_id.sql

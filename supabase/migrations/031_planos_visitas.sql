-- ============================================================
-- EngClinica Pro
-- Migration: 031_planos_visitas.sql
-- Objetivo:
-- - Identificar visitas do plano visualmente
-- - Preservar a ordem operacional do setor no snapshot dos itens
-- ============================================================

alter table public.plano_execucoes
add column if not exists nome_visita text null;

alter table public.plano_execucao_itens
add column if not exists ordem_setor integer not null default 0;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 031_planos_visitas.sql
-- ============================================================

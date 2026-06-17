-- ============================================================
-- EngClinica Pro
-- Migration: 021_calibracao_veff_infinito.sql
-- Objetivo:
-- - Permitir graus de liberdade efetivos (veff) infinitos
-- - Manter valores finitos na coluna numerica existente
-- ============================================================

alter table public.calibracao_padrao_pontos
add column if not exists veff_infinito boolean not null default false;

alter table public.calibracao_padrao_pontos
drop constraint if exists calibracao_padrao_pontos_veff_consistencia_check;

alter table public.calibracao_padrao_pontos
add constraint calibracao_padrao_pontos_veff_consistencia_check
check (
  not veff_infinito
  or graus_liberdade_efetivos_veff is null
);

-- ============================================================
-- Fim da migration 021_calibracao_veff_infinito.sql
-- ============================================================

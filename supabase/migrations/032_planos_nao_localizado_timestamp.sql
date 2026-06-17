-- ============================================================
-- EngClinica Pro
-- Migration: 032_planos_nao_localizado_timestamp.sql
-- Objetivo:
-- - Registrar quando um item de ciclo foi marcado como nao localizado
-- ============================================================

alter table public.plano_ciclo_itens
add column if not exists nao_localizado_em timestamp with time zone null;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 032_planos_nao_localizado_timestamp.sql
-- ============================================================

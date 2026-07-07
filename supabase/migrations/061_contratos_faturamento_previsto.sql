-- ============================================================
-- EngClinica Pro
-- Migration: 061_contratos_faturamento_previsto.sql
-- Objetivo:
-- - Adicionar campos para previsao de faturamento em contratos
-- ============================================================

alter table public.contratos
add column if not exists valor_previsto numeric(14,2),
add column if not exists mes_ultima_visita date;

create index if not exists idx_contratos_mes_ultima_visita
on public.contratos (mes_ultima_visita);

-- Fim da migration 061_contratos_faturamento_previsto.sql

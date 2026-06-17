-- ============================================================
-- EngClinica Pro
-- Migration: 015_orcamentos_dias_entre_parcelas.sql
-- Objetivo:
-- - Adicionar controle de intervalo entre parcelas nos orcamentos
-- ============================================================

alter table public.orcamentos
add column if not exists dias_entre_parcelas integer null;

comment on column public.orcamentos.dias_entre_parcelas
is 'Intervalo em dias entre parcelas do orcamento.';

-- ============================================================
-- EngClinica Pro
-- Migration: 007_add_problema_relatado_os.sql
-- Objetivo:
-- - Adicionar campo opcional Problema Relatado em ordens_servico
-- ============================================================

alter table public.ordens_servico
add column if not exists problema_relatado text;

create index if not exists idx_os_problema_relatado
on public.ordens_servico using gin (to_tsvector('portuguese', coalesce(problema_relatado, '')));

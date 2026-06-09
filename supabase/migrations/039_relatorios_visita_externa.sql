-- ============================================================
-- EngClinica Pro
-- Migration: 039_relatorios_visita_externa.sql
-- Objetivo:
-- - Permitir relatorio de visita externa na tabela de relatorios
-- ============================================================

alter table public.relatorios
drop constraint if exists relatorios_tipo_check;

alter table public.relatorios
add constraint relatorios_tipo_check
check (tipo in ('controle_patrimonial', 'visita_externa'));

notify pgrst, 'reload schema';

-- Fim da migration 039_relatorios_visita_externa.sql

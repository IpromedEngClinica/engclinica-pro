-- ============================================================
-- EngClinica Pro
-- Migration: 041_empresa_setores_mesmo_endereco.sql
-- Objetivo:
-- - Identificar setores/unidades que usam o mesmo endereco do cliente
-- ============================================================

alter table public.empresa_setores
add column if not exists mesmo_endereco_cliente boolean not null default false;

notify pgrst, 'reload schema';

-- Fim da migration 041_empresa_setores_mesmo_endereco.sql

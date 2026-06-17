-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 052_empresa_representante_comercial_setor.sql
-- Objetivo:
-- - Adicionar representante comercial do setor para filtros internos
-- ============================================================

alter table public.empresas
  add column if not exists representante_comercial_setor text;

notify pgrst, 'reload schema';

-- Fim da migration 052_empresa_representante_comercial_setor.sql

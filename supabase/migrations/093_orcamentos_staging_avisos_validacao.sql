-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 093_orcamentos_staging_avisos_validacao.sql
-- Objetivo:
-- - Separar motivos bloqueantes de avisos nao bloqueantes na migracao de orcamentos
-- ============================================================

alter table public.staging_arkmeds_orcamentos
  add column if not exists motivos_bloqueantes text[],
  add column if not exists avisos_validacao text[];

create index if not exists staging_arkmeds_orcamentos_motivos_bloqueantes_idx
  on public.staging_arkmeds_orcamentos using gin (motivos_bloqueantes);

create index if not exists staging_arkmeds_orcamentos_avisos_validacao_idx
  on public.staging_arkmeds_orcamentos using gin (avisos_validacao);

notify pgrst, 'reload schema';

-- Fim da migration 093_orcamentos_staging_avisos_validacao.sql

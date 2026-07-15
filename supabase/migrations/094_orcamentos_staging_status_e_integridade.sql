-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 094_orcamentos_staging_status_e_integridade.sql
-- Objetivo:
-- - Preservar status original/normalizado dos orcamentos ArkMeds
-- - Registrar politica de importacao e integridade da ultima coleta de itens
-- ============================================================

alter table public.staging_arkmeds_orcamentos
  add column if not exists arkmeds_status_label text,
  add column if not exists arkmeds_status_original text,
  add column if not exists status_normalizado_importacao text,
  add column if not exists politica_importacao_status text,
  add column if not exists parametros_coleta_json jsonb,
  add column if not exists itens_ultima_coleta_quantidade integer,
  add column if not exists itens_ultima_coleta_status text,
  add column if not exists itens_ultima_coleta_em timestamp with time zone,
  add column if not exists possui_duplicidade_itens boolean default false;

create index if not exists staging_arkmeds_orcamentos_status_label_idx
  on public.staging_arkmeds_orcamentos (arkmeds_status_label);

create index if not exists staging_arkmeds_orcamentos_status_normalizado_idx
  on public.staging_arkmeds_orcamentos (status_normalizado_importacao);

create index if not exists staging_arkmeds_orcamentos_politica_status_idx
  on public.staging_arkmeds_orcamentos (politica_importacao_status);

create index if not exists staging_arkmeds_itens_logical_lookup_idx
  on public.staging_arkmeds_orcamento_itens (
    arkmeds_orcamento_id,
    tipo_item,
    arkmeds_item_id,
    descricao
  );

notify pgrst, 'reload schema';

-- Fim da migration 094_orcamentos_staging_status_e_integridade.sql

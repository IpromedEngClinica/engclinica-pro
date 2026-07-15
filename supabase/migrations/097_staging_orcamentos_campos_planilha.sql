-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 097_staging_orcamentos_campos_planilha.sql
-- Objetivo:
-- - Preservar no staging os campos adicionais da planilha ArkMeds
-- - Preparar a importacao definitiva sem alterar orcamentos finais
-- ============================================================

alter table public.staging_arkmeds_orcamentos
  add column if not exists arkmeds_data_aprovacao timestamptz,
  add column if not exists arkmeds_data_reprovacao timestamptz,
  add column if not exists arkmeds_data_faturamento timestamptz,
  add column if not exists arkmeds_data_cancelamento timestamptz,
  add column if not exists arkmeds_desconto numeric(14,2) not null default 0,
  add column if not exists arkmeds_desconto_tipo text not null default 'valor',
  add column if not exists arkmeds_valor_deslocamento numeric(14,2) not null default 0,
  add column if not exists arkmeds_valor_viagem numeric(14,2) not null default 0,
  add column if not exists arkmeds_valor_frete numeric(14,2) not null default 0,
  add column if not exists arkmeds_status_planilha text,
  add column if not exists arkmeds_ordem_servico_planilha text,
  add column if not exists arkmeds_observacoes_planilha text,
  add column if not exists dados_planilha_json jsonb,
  add column if not exists fonte_planilha_atualizada_em timestamptz;

alter table public.staging_arkmeds_orcamentos
  drop constraint if exists staging_arkmeds_orcamentos_desconto_tipo_check;

alter table public.staging_arkmeds_orcamentos
  add constraint staging_arkmeds_orcamentos_desconto_tipo_check
  check (arkmeds_desconto_tipo in ('valor', 'percentual'));

create index if not exists idx_staging_arkmeds_orcamentos_planilha_atualizada
on public.staging_arkmeds_orcamentos (fonte_planilha_atualizada_em desc)
where fonte_planilha_atualizada_em is not null;

-- Fim da migration 097_staging_orcamentos_campos_planilha.sql

-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 091_melhorar_staging_orcamentos_arkmeds.sql
-- Objetivo:
-- - Melhorar staging de orcamentos ArkMeds para score de associacao com OS
-- - Separar numero original, numero base e sufixos de correcao
-- - Registrar status de coleta dos endpoints de itens
-- ============================================================

alter table public.staging_arkmeds_orcamentos
  add column if not exists arkmeds_orcamento_numero_original text,
  add column if not exists arkmeds_orcamento_numero_base text,
  add column if not exists arkmeds_orcamento_sufixo text,
  add column if not exists possui_sufixo_correcao boolean default false,
  add column if not exists os_candidata_id uuid,
  add column if not exists os_candidata_numero text,
  add column if not exists cliente_os_candidato text,
  add column if not exists data_os_candidata timestamp with time zone,
  add column if not exists score_cliente numeric(6,4),
  add column if not exists classificacao_cliente text,
  add column if not exists score_os integer,
  add column if not exists confianca_os text,
  add column if not exists motivos_associacao_os text[],
  add column if not exists recomendacao_migracao text,
  add column if not exists itens_servicos_status text,
  add column if not exists itens_pecas_status text,
  add column if not exists itens_servicos_quantidade integer,
  add column if not exists itens_pecas_quantidade integer,
  add column if not exists erro_itens_endpoint text;

create index if not exists staging_arkmeds_orcamentos_numero_base_idx
  on public.staging_arkmeds_orcamentos (arkmeds_orcamento_numero_base);

create index if not exists staging_arkmeds_orcamentos_sufixo_idx
  on public.staging_arkmeds_orcamentos (possui_sufixo_correcao);

create index if not exists staging_arkmeds_orcamentos_score_os_idx
  on public.staging_arkmeds_orcamentos (score_os);

create index if not exists staging_arkmeds_orcamentos_confianca_os_idx
  on public.staging_arkmeds_orcamentos (confianca_os);

create index if not exists staging_arkmeds_orcamentos_recomendacao_idx
  on public.staging_arkmeds_orcamentos (recomendacao_migracao);

notify pgrst, 'reload schema';

-- Fim da migration 091_melhorar_staging_orcamentos_arkmeds.sql

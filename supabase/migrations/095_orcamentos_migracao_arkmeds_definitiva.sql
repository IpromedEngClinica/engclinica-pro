-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 095_orcamentos_migracao_arkmeds_definitiva.sql
-- Objetivo:
-- - Guardar rastreabilidade da importacao definitiva de orcamentos ArkMeds
-- - Evitar duplicidade por origem ArkMeds + ID original
-- ============================================================

alter table public.orcamentos
  add column if not exists origem_migracao text,
  add column if not exists arkmeds_orcamento_id integer,
  add column if not exists arkmeds_status_original text,
  add column if not exists status_normalizado_importacao text,
  add column if not exists politica_importacao_status text,
  add column if not exists arkmeds_tipo_texto text,
  add column if not exists arkmeds_ordem_servico_numero text,
  add column if not exists pdf_original_url text,
  add column if not exists soma_itens_migracao numeric(14,2),
  add column if not exists classificacao_vinculo_os text,
  add column if not exists dados_migracao_json jsonb,
  add column if not exists migrado_em timestamp with time zone;

create unique index if not exists orcamentos_arkmeds_origem_id_uidx
  on public.orcamentos (origem_migracao, arkmeds_orcamento_id)
  where origem_migracao = 'arkmeds'
    and arkmeds_orcamento_id is not null;

create index if not exists idx_orcamentos_origem_migracao
  on public.orcamentos (origem_migracao);

create index if not exists idx_orcamentos_arkmeds_orcamento_id
  on public.orcamentos (arkmeds_orcamento_id);

alter table public.orcamento_itens
  add column if not exists origem_migracao text,
  add column if not exists arkmeds_item_id integer,
  add column if not exists arkmeds_servico_id integer,
  add column if not exists arkmeds_peca_id integer,
  add column if not exists unidade_medida text,
  add column if not exists peca_tipo_descricao text,
  add column if not exists dados_migracao_json jsonb;

create index if not exists idx_orcamento_itens_origem_migracao
  on public.orcamento_itens (origem_migracao);

create index if not exists idx_orcamento_itens_arkmeds_item_id
  on public.orcamento_itens (arkmeds_item_id);

notify pgrst, 'reload schema';

-- Fim da migration 095_orcamentos_migracao_arkmeds_definitiva.sql

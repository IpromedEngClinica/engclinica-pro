-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 090_staging_migracao_orcamentos_arkmeds.sql
-- Objetivo:
-- - Criar staging para dry-run da migracao de orcamentos do ArkMeds
-- - Preservar JSON bruto, logs e validacoes antes do import definitivo
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.staging_arkmeds_orcamentos (
  id uuid primary key default gen_random_uuid(),
  arkmeds_orcamento_id integer not null,
  arkmeds_orcamento_numero text,
  arkmeds_tipo_codigo integer,
  arkmeds_tipo_texto text,
  arkmeds_status_grupo text,
  arkmeds_valor_total numeric(12,2),
  arkmeds_solicitante text,
  arkmeds_data_criacao date,
  arkmeds_data_validade date,
  arkmeds_email_solicitante text,
  arkmeds_ordem_servico_id text,
  arkmeds_ordem_servico_numero text,
  arkmeds_has_attachment boolean default false,
  arkmeds_already_generate_os boolean default false,
  pdf_original_url text,
  origem_migracao text,
  identificador_migracao text,
  classificacao_vinculo_os text,
  empresa_id_resolvida uuid null,
  ordem_servico_id_resolvida uuid null,
  equipamento_id_resolvido uuid null,
  status_validacao text,
  motivos_validacao text[],
  soma_itens numeric(12,2),
  diferenca_valor numeric(12,2),
  dados_brutos_json jsonb,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

create unique index if not exists staging_arkmeds_orcamentos_arkmeds_id_uidx
  on public.staging_arkmeds_orcamentos (arkmeds_orcamento_id);

create index if not exists staging_arkmeds_orcamentos_numero_idx
  on public.staging_arkmeds_orcamentos (arkmeds_orcamento_numero);

create index if not exists staging_arkmeds_orcamentos_solicitante_idx
  on public.staging_arkmeds_orcamentos (arkmeds_solicitante);

create index if not exists staging_arkmeds_orcamentos_os_numero_idx
  on public.staging_arkmeds_orcamentos (arkmeds_ordem_servico_numero);

create index if not exists staging_arkmeds_orcamentos_status_validacao_idx
  on public.staging_arkmeds_orcamentos (status_validacao);

create index if not exists staging_arkmeds_orcamentos_classificacao_os_idx
  on public.staging_arkmeds_orcamentos (classificacao_vinculo_os);

create table if not exists public.staging_arkmeds_orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  staging_orcamento_id uuid references public.staging_arkmeds_orcamentos(id),
  arkmeds_orcamento_id integer not null,
  arkmeds_item_id integer,
  tipo_item text not null,
  descricao text,
  quantidade numeric(12,2),
  garantia integer,
  valor_unitario numeric(12,2),
  valor_total_calculado numeric(12,2),
  observacoes text,
  arkmeds_servico_id integer,
  arkmeds_peca_id integer,
  peca_tipo_descricao text,
  unidade_medida text,
  dados_brutos_json jsonb,
  criado_em timestamp with time zone default now()
);

create unique index if not exists staging_arkmeds_orcamento_itens_item_uidx
  on public.staging_arkmeds_orcamento_itens (arkmeds_orcamento_id, tipo_item, arkmeds_item_id);

create index if not exists staging_arkmeds_orcamento_itens_staging_idx
  on public.staging_arkmeds_orcamento_itens (staging_orcamento_id);

create index if not exists staging_arkmeds_orcamento_itens_arkmeds_idx
  on public.staging_arkmeds_orcamento_itens (arkmeds_orcamento_id);

create index if not exists staging_arkmeds_orcamento_itens_tipo_idx
  on public.staging_arkmeds_orcamento_itens (tipo_item);

create index if not exists staging_arkmeds_orcamento_itens_descricao_idx
  on public.staging_arkmeds_orcamento_itens (descricao);

create table if not exists public.migracao_arkmeds_logs (
  id uuid primary key default gen_random_uuid(),
  tipo_execucao text,
  entidade text,
  arkmeds_id text,
  identificador_migracao text,
  status text,
  mensagem text,
  payload_json jsonb,
  criado_em timestamp with time zone default now()
);

create or replace function public.set_atualizado_em_staging_orcamentos()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_staging_arkmeds_orcamentos_atualizado_em on public.staging_arkmeds_orcamentos;

create trigger trg_staging_arkmeds_orcamentos_atualizado_em
before update on public.staging_arkmeds_orcamentos
for each row
execute function public.set_atualizado_em_staging_orcamentos();

alter table public.staging_arkmeds_orcamentos enable row level security;
alter table public.staging_arkmeds_orcamento_itens enable row level security;
alter table public.migracao_arkmeds_logs enable row level security;

notify pgrst, 'reload schema';

-- Fim da migration 090_staging_migracao_orcamentos_arkmeds.sql

-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 098_staging_migracao_calibracoes_arkmeds.sql
-- Objetivo:
-- - Preservar certificados, tabelas, pontos e leituras do ArkMeds
-- - Permitir dry-run e conferencia antes da importacao definitiva
-- - Manter o staging inacessivel para usuarios da aplicacao
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.staging_arkmeds_calibracoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  arkmeds_calibracao_id bigint not null,
  arkmeds_numero_certificado text,
  arkmeds_tipo_calibracao integer,
  arkmeds_empresa_id bigint,
  arkmeds_equipamento_id bigint,
  arkmeds_ordem_servico_id bigint,
  arkmeds_procedimento_id bigint,
  arkmeds_padrao_ids bigint[] not null default '{}',
  empresa_nome text,
  equipamento_descricao text,
  procedimento_nome text,
  numero_ordem_servico text,
  data_calibracao date,
  data_emissao date,
  data_validade date,
  local_calibracao text,
  temperatura_texto text,
  incerteza_temperatura_texto text,
  umidade_texto text,
  incerteza_umidade_texto text,
  pressao_atmosferica_texto text,
  incerteza_pressao_texto text,
  tecnico_executor text,
  responsavel_tecnico text,
  responsavel_solicitante text,
  observacoes text,
  pdf_original_url text,
  pdf_original_hash text,
  pdf_original_bytes bigint,
  rota_detalhe text,
  tipo_formulario text,
  empresa_id_resolvida uuid references public.empresas(id) on delete set null,
  equipamento_id_resolvido uuid references public.equipamentos(id) on delete set null,
  ordem_servico_id_resolvida uuid references public.ordens_servico(id) on delete set null,
  procedimento_id_resolvido uuid references public.calibracao_procedimentos(id) on delete set null,
  status_extracao text not null default 'pendente',
  status_compatibilidade text not null default 'pendente',
  motivos_bloqueantes text[] not null default '{}',
  avisos_validacao text[] not null default '{}',
  dados_lista_json jsonb not null default '{}'::jsonb,
  dados_formulario_json jsonb not null default '{}'::jsonb,
  tabelas_brutas_json jsonb not null default '[]'::jsonb,
  coletado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint staging_calibracoes_status_extracao_check check (
    status_extracao in ('pendente', 'coletado', 'parcial', 'erro', 'formato_nao_suportado')
  ),
  constraint staging_calibracoes_status_compatibilidade_check check (
    status_compatibilidade in ('pendente', 'compativel', 'revisao_manual', 'bloqueado')
  ),
  unique (organizacao_id, arkmeds_calibracao_id)
);

create table if not exists public.staging_arkmeds_calibracao_tabelas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  staging_calibracao_id uuid not null references public.staging_arkmeds_calibracoes(id) on delete cascade,
  arkmeds_calibracao_id bigint not null,
  ordem integer not null,
  arkmeds_tabela_id bigint,
  nome text,
  tipo integer,
  grandeza text,
  unidade text,
  unidade_nominal text,
  arkmeds_padrao_id bigint,
  arkmeds_tabela_certificado_padrao_id bigint,
  resolucao_padrao_texto text,
  resolucao_equipamento_texto text,
  criterio_aceitacao_texto text,
  erro_maximo_texto text,
  fator_confiabilidade_texto text,
  corrigir_erro_sistematico boolean not null default false,
  dados_brutos_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  unique (staging_calibracao_id, ordem)
);

create table if not exists public.staging_arkmeds_calibracao_pontos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  staging_tabela_id uuid not null references public.staging_arkmeds_calibracao_tabelas(id) on delete cascade,
  arkmeds_calibracao_id bigint not null,
  ordem integer not null,
  valor_nominal_texto text,
  fator_k_origem_texto text,
  media_origem_texto text,
  tendencia_origem_texto text,
  incerteza_expandida_origem_texto text,
  veff_origem_texto text,
  resultado_conformidade_origem text,
  observacoes text,
  dados_brutos_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  unique (staging_tabela_id, ordem)
);

create table if not exists public.staging_arkmeds_calibracao_leituras (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  staging_ponto_id uuid not null references public.staging_arkmeds_calibracao_pontos(id) on delete cascade,
  arkmeds_calibracao_id bigint not null,
  ordem integer not null,
  valor_medido_texto text,
  criado_em timestamptz not null default now(),
  unique (staging_ponto_id, ordem)
);

create table if not exists public.staging_arkmeds_calibracao_logs (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacoes(id) on delete set null,
  execucao_id text not null,
  modo text not null,
  arkmeds_calibracao_id bigint,
  etapa text not null,
  status text not null,
  mensagem text,
  payload_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_staging_calibracoes_numero
  on public.staging_arkmeds_calibracoes (arkmeds_numero_certificado);
create index if not exists idx_staging_calibracoes_empresa
  on public.staging_arkmeds_calibracoes (arkmeds_empresa_id);
create index if not exists idx_staging_calibracoes_equipamento
  on public.staging_arkmeds_calibracoes (arkmeds_equipamento_id);
create index if not exists idx_staging_calibracoes_os
  on public.staging_arkmeds_calibracoes (arkmeds_ordem_servico_id);
create index if not exists idx_staging_calibracoes_data
  on public.staging_arkmeds_calibracoes (data_calibracao desc);
create index if not exists idx_staging_calibracoes_compatibilidade
  on public.staging_arkmeds_calibracoes (status_compatibilidade);
create index if not exists idx_staging_calibracao_tabelas_calibracao
  on public.staging_arkmeds_calibracao_tabelas (staging_calibracao_id);
create index if not exists idx_staging_calibracao_pontos_tabela
  on public.staging_arkmeds_calibracao_pontos (staging_tabela_id);
create index if not exists idx_staging_calibracao_leituras_ponto
  on public.staging_arkmeds_calibracao_leituras (staging_ponto_id);
create index if not exists idx_staging_calibracao_logs_execucao
  on public.staging_arkmeds_calibracao_logs (execucao_id, criado_em);

create or replace function public.set_atualizado_em_staging_calibracoes()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_staging_arkmeds_calibracoes_updated_at
  on public.staging_arkmeds_calibracoes;
create trigger trg_staging_arkmeds_calibracoes_updated_at
before update on public.staging_arkmeds_calibracoes
for each row execute function public.set_atualizado_em_staging_calibracoes();

alter table public.staging_arkmeds_calibracoes enable row level security;
alter table public.staging_arkmeds_calibracao_tabelas enable row level security;
alter table public.staging_arkmeds_calibracao_pontos enable row level security;
alter table public.staging_arkmeds_calibracao_leituras enable row level security;
alter table public.staging_arkmeds_calibracao_logs enable row level security;

revoke all on table public.staging_arkmeds_calibracoes from anon, authenticated;
revoke all on table public.staging_arkmeds_calibracao_tabelas from anon, authenticated;
revoke all on table public.staging_arkmeds_calibracao_pontos from anon, authenticated;
revoke all on table public.staging_arkmeds_calibracao_leituras from anon, authenticated;
revoke all on table public.staging_arkmeds_calibracao_logs from anon, authenticated;

grant all on table public.staging_arkmeds_calibracoes to service_role;
grant all on table public.staging_arkmeds_calibracao_tabelas to service_role;
grant all on table public.staging_arkmeds_calibracao_pontos to service_role;
grant all on table public.staging_arkmeds_calibracao_leituras to service_role;
grant all on table public.staging_arkmeds_calibracao_logs to service_role;

notify pgrst, 'reload schema';

-- Fim da migration 098_staging_migracao_calibracoes_arkmeds.sql

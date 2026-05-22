-- ============================================================
-- EngClinica Pro
-- Migration: 001_base_inicial.sql
-- Objetivo: criar tabelas base para organização, usuários,
-- empresas/clientes e campos gerenciais iniciais.
-- Banco alvo: PostgreSQL / Supabase
-- ============================================================

-- Extensão necessária para geração de UUIDs.
-- No Supabase normalmente já está disponível, mas manter aqui
-- ajuda a tornar a migration mais reproduzível.
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. ORGANIZAÇÕES
-- Empresa usuária do sistema.
-- Ex.: ACI Equipamentos Hospitalares.
-- ============================================================

create table if not exists public.organizacoes (
  id uuid primary key default gen_random_uuid(),

  nome text not null,
  nome_fantasia text,
  cnpj text,

  email text,
  telefone text,

  cidade text,
  estado text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_organizacoes_nome
on public.organizacoes (nome);

create index if not exists idx_organizacoes_cnpj
on public.organizacoes (cnpj);

-- ============================================================
-- 2. USUÁRIOS
-- Complementa auth.users do Supabase.
-- Cada usuário pertence a uma organização.
-- ============================================================

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  email text not null,
  telefone text,
  cargo text,

  perfil text not null default 'tecnico',

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint usuarios_perfil_check check (
    perfil in ('admin', 'gestor', 'tecnico', 'financeiro', 'cliente')
  )
);

create index if not exists idx_usuarios_organizacao
on public.usuarios (organizacao_id);

create index if not exists idx_usuarios_email
on public.usuarios (email);

create index if not exists idx_usuarios_perfil
on public.usuarios (perfil);

-- ============================================================
-- 3. EMPRESAS / CLIENTES / FORNECEDORES
-- Representa hospitais, clínicas, prefeituras, fornecedores,
-- clientes particulares ou parceiros.
-- ============================================================

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  nome_fantasia text,

  tipo_cliente text,
  tipo_relacao text not null default 'cliente',

  cpf_cnpj text,

  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,

  contato text,
  email text,
  celular text,
  telefone text,

  observacoes text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint empresas_tipo_relacao_check check (
    tipo_relacao in ('cliente', 'fornecedor', 'parceiro', 'ambos')
  )
);

create index if not exists idx_empresas_organizacao
on public.empresas (organizacao_id);

create index if not exists idx_empresas_nome
on public.empresas (nome);

create index if not exists idx_empresas_nome_fantasia
on public.empresas (nome_fantasia);

create index if not exists idx_empresas_cpf_cnpj
on public.empresas (cpf_cnpj);

create index if not exists idx_empresas_tipo_relacao
on public.empresas (tipo_relacao);

-- ============================================================
-- 4. TIPOS DE EQUIPAMENTO
-- Campo gerencial.
-- ============================================================

create table if not exists public.tipos_equipamento (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  descricao text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  unique (organizacao_id, nome)
);

create index if not exists idx_tipos_equipamento_organizacao
on public.tipos_equipamento (organizacao_id);

create index if not exists idx_tipos_equipamento_nome
on public.tipos_equipamento (nome);

-- ============================================================
-- 5. TIPOS DE OS
-- Campo gerencial.
-- ============================================================

create table if not exists public.tipos_os (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  descricao text,

  exige_equipamento boolean not null default false,
  gera_orcamento boolean not null default false,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  unique (organizacao_id, nome)
);

create index if not exists idx_tipos_os_organizacao
on public.tipos_os (organizacao_id);

create index if not exists idx_tipos_os_nome
on public.tipos_os (nome);

-- ============================================================
-- 6. ESTADOS DA OS
-- Campo gerencial.
-- ============================================================

create table if not exists public.estados_os (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  descricao text,

  finaliza_os boolean not null default false,
  cancela_os boolean not null default false,

  ordem integer not null default 0,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  unique (organizacao_id, nome)
);

create index if not exists idx_estados_os_organizacao
on public.estados_os (organizacao_id);

create index if not exists idx_estados_os_nome
on public.estados_os (nome);

create index if not exists idx_estados_os_ordem
on public.estados_os (ordem);

-- ============================================================
-- 7. PEÇAS
-- Campo gerencial e futura base para estoque.
-- ============================================================

create table if not exists public.pecas (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  descricao text,

  fabricante text,
  codigo_interno text,

  unidade text not null default 'un',

  custo_referencia numeric(12,2),
  valor_venda_referencia numeric(12,2),
  estoque_minimo numeric(12,2),

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  unique (organizacao_id, nome)
);

create index if not exists idx_pecas_organizacao
on public.pecas (organizacao_id);

create index if not exists idx_pecas_nome
on public.pecas (nome);

create index if not exists idx_pecas_codigo_interno
on public.pecas (codigo_interno);

-- ============================================================
-- 8. FUNÇÃO GENÉRICA PARA UPDATED_AT
-- Atualiza automaticamente updated_at em updates.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 9. TRIGGERS DE UPDATED_AT
-- ============================================================

drop trigger if exists trg_organizacoes_updated_at on public.organizacoes;
create trigger trg_organizacoes_updated_at
before update on public.organizacoes
for each row execute function public.set_updated_at();

drop trigger if exists trg_usuarios_updated_at on public.usuarios;
create trigger trg_usuarios_updated_at
before update on public.usuarios
for each row execute function public.set_updated_at();

drop trigger if exists trg_empresas_updated_at on public.empresas;
create trigger trg_empresas_updated_at
before update on public.empresas
for each row execute function public.set_updated_at();

drop trigger if exists trg_tipos_equipamento_updated_at on public.tipos_equipamento;
create trigger trg_tipos_equipamento_updated_at
before update on public.tipos_equipamento
for each row execute function public.set_updated_at();

drop trigger if exists trg_tipos_os_updated_at on public.tipos_os;
create trigger trg_tipos_os_updated_at
before update on public.tipos_os
for each row execute function public.set_updated_at();

drop trigger if exists trg_estados_os_updated_at on public.estados_os;
create trigger trg_estados_os_updated_at
before update on public.estados_os
for each row execute function public.set_updated_at();

drop trigger if exists trg_pecas_updated_at on public.pecas;
create trigger trg_pecas_updated_at
before update on public.pecas
for each row execute function public.set_updated_at();

-- ============================================================
-- 10. RLS - ROW LEVEL SECURITY
-- Ativação inicial.
-- As policies específicas serão criadas em migration própria,
-- após definição do fluxo de autenticação e organização inicial.
-- ============================================================

alter table public.organizacoes enable row level security;
alter table public.usuarios enable row level security;
alter table public.empresas enable row level security;
alter table public.tipos_equipamento enable row level security;
alter table public.tipos_os enable row level security;
alter table public.estados_os enable row level security;
alter table public.pecas enable row level security;

-- ============================================================
-- Fim da migration 001_base_inicial.sql
-- ============================================================
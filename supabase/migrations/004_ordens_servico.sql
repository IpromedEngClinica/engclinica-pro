-- ============================================================
-- EngClinica Pro
-- Migration: 003_equipamentos.sql
-- Objetivo:
-- - Criar tabela de equipamentos
-- - Vincular equipamentos às empresas
-- - Preparar base para OS, preventiva, calibração e histórico técnico
-- - Criar policies iniciais de RLS
-- Banco alvo: PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. EQUIPAMENTOS
-- ============================================================

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  empresa_id uuid not null references public.empresas(id) on delete restrict,

  tipo_equipamento_id uuid null references public.tipos_equipamento(id) on delete set null,
  tipo_texto text,

  fabricante text,
  modelo text,
  numero_serie text,
  patrimonio text,
  tag text,
  setor text,

  status text not null default 'Ativo',

  data_aquisicao date,
  data_instalacao date,

  data_ultima_preventiva date,
  data_proxima_preventiva date,

  data_ultima_calibracao date,
  data_proxima_calibracao date,

  observacoes text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

create index if not exists idx_equipamentos_organizacao
on public.equipamentos (organizacao_id);

create index if not exists idx_equipamentos_empresa
on public.equipamentos (empresa_id);

create index if not exists idx_equipamentos_tipo
on public.equipamentos (tipo_equipamento_id);

create index if not exists idx_equipamentos_fabricante
on public.equipamentos (fabricante);

create index if not exists idx_equipamentos_modelo
on public.equipamentos (modelo);

create index if not exists idx_equipamentos_numero_serie
on public.equipamentos (numero_serie);

create index if not exists idx_equipamentos_patrimonio
on public.equipamentos (patrimonio);

create index if not exists idx_equipamentos_tag
on public.equipamentos (tag);

create index if not exists idx_equipamentos_setor
on public.equipamentos (setor);

create index if not exists idx_equipamentos_status
on public.equipamentos (status);

create index if not exists idx_equipamentos_ativo
on public.equipamentos (ativo);

create index if not exists idx_equipamentos_proxima_preventiva
on public.equipamentos (data_proxima_preventiva);

create index if not exists idx_equipamentos_proxima_calibracao
on public.equipamentos (data_proxima_calibracao);

-- ============================================================
-- 3. TRIGGER UPDATED_AT
-- ============================================================

drop trigger if exists trg_equipamentos_updated_at on public.equipamentos;

create trigger trg_equipamentos_updated_at
before update on public.equipamentos
for each row execute function public.set_updated_at();

-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.equipamentos enable row level security;

drop policy if exists "equipamentos_select_mesma_organizacao" on public.equipamentos;
create policy "equipamentos_select_mesma_organizacao"
on public.equipamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "equipamentos_insert_admin_gestor_tecnico" on public.equipamentos;
create policy "equipamentos_insert_admin_gestor_tecnico"
on public.equipamentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "equipamentos_update_admin_gestor_tecnico" on public.equipamentos;
create policy "equipamentos_update_admin_gestor_tecnico"
on public.equipamentos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 003_equipamentos.sql
-- ============================================================
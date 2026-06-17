-- ============================================================
-- EngClinica Pro
-- Migration: 016_laudos_obsolescencia.sql
-- Objetivo:
-- - Criar motivos reutilizaveis de obsolescencia
-- - Criar laudos de obsolescencia
-- - Preparar RLS e indices
-- ============================================================

create sequence if not exists public.laudos_obsolescencia_numero_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create table if not exists public.motivos_obsolescencia (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  nome text not null,
  descricao text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint motivos_obsolescencia_nome_not_empty check (length(trim(nome)) > 0)
);

create table if not exists public.laudos_obsolescencia (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  numero integer not null default nextval('public.laudos_obsolescencia_numero_seq'),

  empresa_id uuid not null references public.empresas(id) on delete restrict,
  equipamento_id uuid not null references public.equipamentos(id) on delete restrict,
  motivo_id uuid null references public.motivos_obsolescencia(id) on delete set null,

  motivo_texto text not null,

  data_criacao timestamp with time zone not null default now(),

  observacoes text,

  responsavel_nome text default 'Icaro Heitor Piris Rezende',
  responsavel_registro text default 'CREA - 142085302-3',

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint laudos_obsolescencia_numero_unique unique (organizacao_id, numero),
  constraint laudos_obsolescencia_motivo_not_empty check (length(trim(motivo_texto)) > 0)
);

create index if not exists idx_laudos_obsolescencia_organizacao
on public.laudos_obsolescencia (organizacao_id);

create index if not exists idx_laudos_obsolescencia_empresa
on public.laudos_obsolescencia (empresa_id);

create index if not exists idx_laudos_obsolescencia_equipamento
on public.laudos_obsolescencia (equipamento_id);

create index if not exists idx_laudos_obsolescencia_data
on public.laudos_obsolescencia (data_criacao desc);

create index if not exists idx_motivos_obsolescencia_organizacao
on public.motivos_obsolescencia (organizacao_id);

drop trigger if exists trg_motivos_obsolescencia_updated_at on public.motivos_obsolescencia;
create trigger trg_motivos_obsolescencia_updated_at
before update on public.motivos_obsolescencia
for each row execute function public.set_updated_at();

drop trigger if exists trg_laudos_obsolescencia_updated_at on public.laudos_obsolescencia;
create trigger trg_laudos_obsolescencia_updated_at
before update on public.laudos_obsolescencia
for each row execute function public.set_updated_at();

alter table public.motivos_obsolescencia enable row level security;
alter table public.laudos_obsolescencia enable row level security;

drop policy if exists "motivos_obsolescencia_select_mesma_organizacao" on public.motivos_obsolescencia;
create policy "motivos_obsolescencia_select_mesma_organizacao"
on public.motivos_obsolescencia
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "motivos_obsolescencia_insert_admin_gestor_tecnico" on public.motivos_obsolescencia;
create policy "motivos_obsolescencia_insert_admin_gestor_tecnico"
on public.motivos_obsolescencia
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "motivos_obsolescencia_update_admin_gestor" on public.motivos_obsolescencia;
create policy "motivos_obsolescencia_update_admin_gestor"
on public.motivos_obsolescencia
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
);

drop policy if exists "laudos_obsolescencia_select_mesma_organizacao" on public.laudos_obsolescencia;
create policy "laudos_obsolescencia_select_mesma_organizacao"
on public.laudos_obsolescencia
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "laudos_obsolescencia_insert_admin_gestor_tecnico" on public.laudos_obsolescencia;
create policy "laudos_obsolescencia_insert_admin_gestor_tecnico"
on public.laudos_obsolescencia
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "laudos_obsolescencia_update_admin_gestor" on public.laudos_obsolescencia;
create policy "laudos_obsolescencia_update_admin_gestor"
on public.laudos_obsolescencia
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
);

-- ============================================================
-- Fim da migration 016_laudos_obsolescencia.sql
-- ============================================================

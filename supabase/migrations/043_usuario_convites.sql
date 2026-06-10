-- ============================================================
-- EngClinica Pro
-- Migration: 043_usuario_convites.sql
-- Objetivo:
-- - Criar estrutura de convites de usuarios para bancos que ja rodaram a 042
-- ============================================================

create table if not exists public.usuario_convites (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  empresa_id uuid null references public.empresas(id) on delete set null,
  email text not null,
  nome text,
  perfil text not null,
  token_hash text not null,
  status text not null default 'pendente',
  expira_em timestamp with time zone not null default (now() + interval '7 days'),
  aceito_por uuid null references public.usuarios(id) on delete set null,
  aceito_em timestamp with time zone,
  criado_por uuid null references public.usuarios(id) on delete set null,
  cancelado_em timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint usuario_convites_perfil_check check (
    perfil in ('admin', 'gestor', 'tecnico', 'comercial', 'solicitante')
  ),
  constraint usuario_convites_status_check check (
    status in ('pendente', 'aceito', 'cancelado', 'expirado')
  ),
  constraint usuario_convites_empresa_check check (
    (perfil = 'solicitante' and empresa_id is not null)
    or (perfil in ('admin', 'gestor', 'tecnico', 'comercial'))
  )
);

create index if not exists idx_usuario_convites_organizacao
on public.usuario_convites (organizacao_id);

create index if not exists idx_usuario_convites_empresa
on public.usuario_convites (empresa_id);

create index if not exists idx_usuario_convites_email
on public.usuario_convites (lower(email));

create index if not exists idx_usuario_convites_status
on public.usuario_convites (status);

create unique index if not exists idx_usuario_convites_token_hash
on public.usuario_convites (token_hash);

drop trigger if exists trg_usuario_convites_updated_at on public.usuario_convites;
create trigger trg_usuario_convites_updated_at
before update on public.usuario_convites
for each row execute function public.set_updated_at();

alter table public.usuario_convites enable row level security;

drop policy if exists "usuario_convites_select_admin" on public.usuario_convites;
create policy "usuario_convites_select_admin"
on public.usuario_convites
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

drop policy if exists "usuario_convites_write_admin" on public.usuario_convites;
create policy "usuario_convites_write_admin"
on public.usuario_convites
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

notify pgrst, 'reload schema';

-- Fim da migration 043_usuario_convites.sql

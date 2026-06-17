-- ============================================================
-- EngClinica Pro
-- Migration: 038_relatorios.sql
-- Objetivo:
-- - Registrar relatorios gerenciais arquivados
-- - Iniciar com relatorio de controle patrimonial
-- ============================================================

create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  tipo text not null,
  titulo text not null,
  filtros jsonb not null default '{}'::jsonb,
  arquivo_url text null,
  emitido_em date not null default current_date,
  revisao integer not null default 1,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint relatorios_tipo_check check (tipo in ('controle_patrimonial')),
  constraint relatorios_revisao_check check (revisao > 0),
  constraint relatorios_filtros_object_check check (jsonb_typeof(filtros) = 'object')
);

create index if not exists idx_relatorios_organizacao
on public.relatorios (organizacao_id);

create index if not exists idx_relatorios_tipo
on public.relatorios (organizacao_id, tipo, created_at desc);

drop trigger if exists trg_relatorios_updated_at on public.relatorios;
create trigger trg_relatorios_updated_at
before update on public.relatorios
for each row execute function public.set_updated_at();

alter table public.relatorios enable row level security;

drop policy if exists "relatorios_select_mesma_organizacao" on public.relatorios;
create policy "relatorios_select_mesma_organizacao"
on public.relatorios
for select to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "relatorios_insert_admin_gestor_tecnico" on public.relatorios;
create policy "relatorios_insert_admin_gestor_tecnico"
on public.relatorios
for insert to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "relatorios_update_admin_gestor_tecnico" on public.relatorios;
create policy "relatorios_update_admin_gestor_tecnico"
on public.relatorios
for update to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

notify pgrst, 'reload schema';

-- Fim da migration 038_relatorios.sql

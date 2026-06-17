-- ============================================================
-- EngClinica Pro
-- Migration: 040_empresa_setores.sql
-- Objetivo:
-- - Criar setores/unidades fixas por empresa com endereco proprio
-- - Evitar duplicidade de nomes de setor no cadastro de equipamentos
-- ============================================================

create table if not exists public.empresa_setores (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  empresa_id uuid not null references public.empresas(id) on delete cascade,

  nome text not null,

  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  observacoes text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint empresa_setores_nome_check check (length(trim(nome)) > 0),
  constraint empresa_setores_estado_check check (estado is null or length(trim(estado)) = 2)
);

create index if not exists idx_empresa_setores_organizacao
on public.empresa_setores (organizacao_id);

create index if not exists idx_empresa_setores_empresa
on public.empresa_setores (empresa_id);

create index if not exists idx_empresa_setores_ativo
on public.empresa_setores (ativo);

create unique index if not exists idx_empresa_setores_empresa_nome_ativo
on public.empresa_setores (empresa_id, lower(trim(nome)))
where ativo;

drop trigger if exists trg_empresa_setores_updated_at on public.empresa_setores;
create trigger trg_empresa_setores_updated_at
before update on public.empresa_setores
for each row execute function public.set_updated_at();

alter table public.empresa_setores enable row level security;

drop policy if exists "empresa_setores_select_mesma_organizacao" on public.empresa_setores;
create policy "empresa_setores_select_mesma_organizacao"
on public.empresa_setores
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "empresa_setores_write_admin_gestor" on public.empresa_setores;
create policy "empresa_setores_write_admin_gestor"
on public.empresa_setores
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
  and exists (
    select 1
    from public.empresas e
    where e.id = empresa_id
      and e.organizacao_id = public.current_organizacao_id()
  )
);

notify pgrst, 'reload schema';

-- Fim da migration 040_empresa_setores.sql

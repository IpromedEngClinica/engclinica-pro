-- ============================================================
-- EngClinica Pro
-- Migration: 018_pecas_fabricantes_modelos_preco.sql
-- Objetivo:
-- - Adicionar preco padrao em pecas
-- - Criar fabricantes e modelos opcionais por peca
-- - Salvar snapshots de fabricante/modelo em itens de orcamento
-- ============================================================

alter table public.pecas
add column if not exists preco_padrao numeric(12,2) null;

alter table public.pecas
add column if not exists ativo boolean not null default true;

comment on column public.pecas.preco_padrao
is 'Preco padrao opcional sugerido ao inserir a peca no orcamento.';

create table if not exists public.peca_fabricantes (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  peca_id uuid not null references public.pecas(id) on delete cascade,

  nome text not null,
  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint peca_fabricantes_nome_not_empty check (length(trim(nome)) > 0),
  constraint peca_fabricantes_unique unique (organizacao_id, peca_id, nome)
);

create table if not exists public.peca_modelos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  peca_id uuid not null references public.pecas(id) on delete cascade,

  nome text not null,
  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint peca_modelos_nome_not_empty check (length(trim(nome)) > 0),
  constraint peca_modelos_unique unique (organizacao_id, peca_id, nome)
);

alter table public.orcamento_itens
add column if not exists peca_fabricante_id uuid null references public.peca_fabricantes(id) on delete set null;

alter table public.orcamento_itens
add column if not exists peca_modelo_id uuid null references public.peca_modelos(id) on delete set null;

alter table public.orcamento_itens
add column if not exists fabricante_texto text null;

alter table public.orcamento_itens
add column if not exists modelo_texto text null;

alter table public.orcamento_itens
add column if not exists mostrar_fabricante boolean not null default false;

alter table public.orcamento_itens
add column if not exists mostrar_modelo boolean not null default false;

create index if not exists idx_peca_fabricantes_peca
on public.peca_fabricantes (peca_id);

create index if not exists idx_peca_modelos_peca
on public.peca_modelos (peca_id);

create index if not exists idx_orcamento_itens_peca_fabricante
on public.orcamento_itens (peca_fabricante_id);

create index if not exists idx_orcamento_itens_peca_modelo
on public.orcamento_itens (peca_modelo_id);

drop trigger if exists trg_peca_fabricantes_updated_at on public.peca_fabricantes;
create trigger trg_peca_fabricantes_updated_at
before update on public.peca_fabricantes
for each row execute function public.set_updated_at();

drop trigger if exists trg_peca_modelos_updated_at on public.peca_modelos;
create trigger trg_peca_modelos_updated_at
before update on public.peca_modelos
for each row execute function public.set_updated_at();

alter table public.peca_fabricantes enable row level security;
alter table public.peca_modelos enable row level security;

drop policy if exists "peca_fabricantes_select_mesma_organizacao" on public.peca_fabricantes;
create policy "peca_fabricantes_select_mesma_organizacao"
on public.peca_fabricantes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "peca_fabricantes_insert_admin_gestor" on public.peca_fabricantes;
create policy "peca_fabricantes_insert_admin_gestor"
on public.peca_fabricantes
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "peca_fabricantes_update_admin_gestor" on public.peca_fabricantes;
create policy "peca_fabricantes_update_admin_gestor"
on public.peca_fabricantes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "peca_modelos_select_mesma_organizacao" on public.peca_modelos;
create policy "peca_modelos_select_mesma_organizacao"
on public.peca_modelos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "peca_modelos_insert_admin_gestor" on public.peca_modelos;
create policy "peca_modelos_insert_admin_gestor"
on public.peca_modelos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "peca_modelos_update_admin_gestor" on public.peca_modelos;
create policy "peca_modelos_update_admin_gestor"
on public.peca_modelos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ============================================================
-- Fim da migration 018_pecas_fabricantes_modelos_preco.sql
-- ============================================================

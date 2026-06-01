-- ============================================================
-- EngClinica Pro
-- Migration: 019_pecas_variacoes_preco.sql
-- Objetivo:
-- - Criar variacoes de pecas com preco por combinacao
-- - Vincular variacao ao item de orcamento
-- ============================================================

create table if not exists public.peca_variacoes (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  peca_id uuid not null references public.pecas(id) on delete cascade,

  peca_fabricante_id uuid null references public.peca_fabricantes(id) on delete set null,
  peca_modelo_id uuid null references public.peca_modelos(id) on delete set null,

  fabricante_texto text null,
  modelo_texto text null,

  preco_padrao numeric(12,2) null,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint peca_variacoes_preco_check check (preco_padrao is null or preco_padrao >= 0)
);

alter table public.orcamento_itens
add column if not exists peca_variacao_id uuid null references public.peca_variacoes(id) on delete set null;

create index if not exists idx_peca_variacoes_organizacao
on public.peca_variacoes (organizacao_id);

create index if not exists idx_peca_variacoes_peca
on public.peca_variacoes (peca_id);

create index if not exists idx_peca_variacoes_fabricante
on public.peca_variacoes (peca_fabricante_id);

create index if not exists idx_peca_variacoes_modelo
on public.peca_variacoes (peca_modelo_id);

create unique index if not exists idx_peca_variacoes_unique_combo
on public.peca_variacoes (
  organizacao_id,
  peca_id,
  coalesce(peca_fabricante_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(peca_modelo_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists idx_orcamento_itens_peca_variacao
on public.orcamento_itens (peca_variacao_id);

drop trigger if exists trg_peca_variacoes_updated_at on public.peca_variacoes;
create trigger trg_peca_variacoes_updated_at
before update on public.peca_variacoes
for each row execute function public.set_updated_at();

alter table public.peca_variacoes enable row level security;

drop policy if exists "peca_variacoes_select_mesma_organizacao" on public.peca_variacoes;
create policy "peca_variacoes_select_mesma_organizacao"
on public.peca_variacoes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "peca_variacoes_insert_admin_gestor" on public.peca_variacoes;
create policy "peca_variacoes_insert_admin_gestor"
on public.peca_variacoes
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "peca_variacoes_update_admin_gestor" on public.peca_variacoes;
create policy "peca_variacoes_update_admin_gestor"
on public.peca_variacoes
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
-- Fim da migration 019_pecas_variacoes_preco.sql
-- ============================================================

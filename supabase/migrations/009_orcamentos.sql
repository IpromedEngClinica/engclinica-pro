-- ============================================================
-- EngClinica Pro
-- Migration: 009_orcamentos.sql
-- Objetivo:
-- - Criar estrutura inicial de orcamentos vinculados a OS
-- - Criar itens de orcamento
-- - Preparar fluxo de aprovacao/reprovacao
-- ============================================================

-- ============================================================
-- 1. SEQUENCIA DE ORCAMENTOS
-- ============================================================

create sequence if not exists public.orcamentos_numero_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.gerar_numero_orcamento()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo_numero bigint;
begin
  proximo_numero := nextval('public.orcamentos_numero_seq');
  return proximo_numero::text;
end;
$$;

alter function public.gerar_numero_orcamento() owner to postgres;

-- ============================================================
-- 2. ORCAMENTOS
-- ============================================================

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  numero text not null default public.gerar_numero_orcamento(),

  empresa_id uuid not null references public.empresas(id) on delete restrict,
  equipamento_id uuid null references public.equipamentos(id) on delete set null,
  ordem_servico_id uuid null references public.ordens_servico(id) on delete set null,

  data_orcamento timestamp with time zone not null default now(),
  data_validade date,

  status text not null default 'rascunho',

  observacoes text,
  condicoes_pagamento text,
  prazo_execucao text,
  garantia text,

  valor_total numeric(14,2) not null default 0,

  aprovado_por text,
  data_aprovacao timestamp with time zone,
  motivo_reprovacao text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  unique (organizacao_id, numero),

  constraint orcamentos_status_check check (
    status in ('rascunho', 'emitido', 'aprovado', 'reprovado', 'cancelado')
  )
);

-- ============================================================
-- 3. ITENS DO ORCAMENTO
-- ============================================================

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),

  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,

  tipo text not null default 'servico',
  descricao text not null,

  quantidade numeric(14,2) not null default 1,
  valor_unitario numeric(14,2) not null default 0,
  valor_total numeric(14,2) not null default 0,

  observacoes text,

  ordem integer not null default 1,

  created_at timestamp with time zone not null default now(),

  constraint orcamento_itens_tipo_check check (
    tipo in ('servico', 'peca', 'deslocamento', 'outro')
  )
);

-- ============================================================
-- 4. FUNCOES PARA RECALCULAR TOTAL
-- ============================================================

create or replace function public.recalcular_total_orcamento(p_orcamento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orcamentos
  set valor_total = coalesce(
    (
      select sum(valor_total)
      from public.orcamento_itens
      where orcamento_id = p_orcamento_id
    ),
    0
  )
  where id = p_orcamento_id;
end;
$$;

alter function public.recalcular_total_orcamento(uuid) owner to postgres;

create or replace function public.trg_orcamento_itens_set_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.valor_total := coalesce(new.quantidade, 0) * coalesce(new.valor_unitario, 0);
  return new;
end;
$$;

alter function public.trg_orcamento_itens_set_total() owner to postgres;

create or replace function public.trg_orcamento_itens_recalcular_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalcular_total_orcamento(new.orcamento_id);
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.recalcular_total_orcamento(new.orcamento_id);

    if old.orcamento_id is distinct from new.orcamento_id then
      perform public.recalcular_total_orcamento(old.orcamento_id);
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    perform public.recalcular_total_orcamento(old.orcamento_id);
    return old;
  end if;

  return null;
end;
$$;

alter function public.trg_orcamento_itens_recalcular_total() owner to postgres;

drop trigger if exists trg_orcamento_itens_set_total_biu on public.orcamento_itens;
create trigger trg_orcamento_itens_set_total_biu
before insert or update on public.orcamento_itens
for each row execute function public.trg_orcamento_itens_set_total();

drop trigger if exists trg_orcamento_itens_recalcular_total_aiud on public.orcamento_itens;
create trigger trg_orcamento_itens_recalcular_total_aiud
after insert or update or delete on public.orcamento_itens
for each row execute function public.trg_orcamento_itens_recalcular_total();

-- ============================================================
-- 5. INDICES
-- ============================================================

create index if not exists idx_orcamentos_organizacao
on public.orcamentos (organizacao_id);

create index if not exists idx_orcamentos_numero
on public.orcamentos (numero);

create index if not exists idx_orcamentos_empresa
on public.orcamentos (empresa_id);

create index if not exists idx_orcamentos_equipamento
on public.orcamentos (equipamento_id);

create index if not exists idx_orcamentos_os
on public.orcamentos (ordem_servico_id);

create index if not exists idx_orcamentos_status
on public.orcamentos (status);

create index if not exists idx_orcamentos_data
on public.orcamentos (data_orcamento);

create index if not exists idx_orcamentos_ativo
on public.orcamentos (ativo);

create index if not exists idx_orcamento_itens_orcamento
on public.orcamento_itens (orcamento_id);

-- ============================================================
-- 6. TRIGGER UPDATED_AT
-- ============================================================

drop trigger if exists trg_orcamentos_updated_at on public.orcamentos;

create trigger trg_orcamentos_updated_at
before update on public.orcamentos
for each row execute function public.set_updated_at();

-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

-- ------------------------------------------------------------
-- ORCAMENTOS
-- ------------------------------------------------------------

drop policy if exists "orcamentos_select_mesma_organizacao" on public.orcamentos;
create policy "orcamentos_select_mesma_organizacao"
on public.orcamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "orcamentos_insert_admin_gestor_tecnico" on public.orcamentos;
create policy "orcamentos_insert_admin_gestor_tecnico"
on public.orcamentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "orcamentos_update_admin_gestor_tecnico" on public.orcamentos;
create policy "orcamentos_update_admin_gestor_tecnico"
on public.orcamentos
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

-- ------------------------------------------------------------
-- ITENS DO ORCAMENTO
-- ------------------------------------------------------------

drop policy if exists "orcamento_itens_select_mesma_organizacao" on public.orcamento_itens;
create policy "orcamento_itens_select_mesma_organizacao"
on public.orcamento_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "orcamento_itens_insert_mesma_organizacao" on public.orcamento_itens;
create policy "orcamento_itens_insert_mesma_organizacao"
on public.orcamento_itens
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "orcamento_itens_update_mesma_organizacao" on public.orcamento_itens;
create policy "orcamento_itens_update_mesma_organizacao"
on public.orcamento_itens
for update
to authenticated
using (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "orcamento_itens_delete_mesma_organizacao" on public.orcamento_itens;
create policy "orcamento_itens_delete_mesma_organizacao"
on public.orcamento_itens
for delete
to authenticated
using (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 009_orcamentos.sql
-- ============================================================

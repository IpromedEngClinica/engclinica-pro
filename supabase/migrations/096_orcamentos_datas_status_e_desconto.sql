-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 096_orcamentos_datas_status_e_desconto.sql
-- Objetivo:
-- - Registrar as datas operacionais do ciclo de vida do orcamento
-- - Suportar desconto por valor ou percentual
-- - Manter totais consistentes quando os itens forem alterados
-- ============================================================

alter table public.orcamentos
  add column if not exists data_reprovacao timestamptz,
  add column if not exists data_faturamento timestamptz,
  add column if not exists data_cancelamento timestamptz,
  add column if not exists desconto_tipo text not null default 'valor',
  add column if not exists desconto_valor numeric(14,2) not null default 0,
  add column if not exists desconto_aplicado numeric(14,2) not null default 0;

alter table public.orcamentos
  drop constraint if exists orcamentos_desconto_tipo_check;

alter table public.orcamentos
  add constraint orcamentos_desconto_tipo_check
  check (desconto_tipo in ('valor', 'percentual'));

alter table public.orcamentos
  drop constraint if exists orcamentos_desconto_valor_check;

alter table public.orcamentos
  add constraint orcamentos_desconto_valor_check
  check (desconto_valor >= 0 and desconto_aplicado >= 0);

alter table public.orcamentos
  drop constraint if exists orcamentos_desconto_percentual_check;

alter table public.orcamentos
  add constraint orcamentos_desconto_percentual_check
  check (desconto_tipo <> 'percentual' or desconto_valor <= 100);

create or replace function public.recalcular_total_orcamento(p_orcamento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor_pecas numeric(14,2) := 0;
  v_valor_servicos numeric(14,2) := 0;
  v_subtotal numeric(14,2) := 0;
  v_desconto_tipo text := 'valor';
  v_desconto_valor numeric(14,2) := 0;
  v_desconto_aplicado numeric(14,2) := 0;
begin
  select
    coalesce(sum(case when tipo = 'peca' then valor_total else 0 end), 0),
    coalesce(sum(case when tipo in ('servico', 'deslocamento', 'outro') then valor_total else 0 end), 0),
    coalesce(sum(valor_total), 0)
  into v_valor_pecas, v_valor_servicos, v_subtotal
  from public.orcamento_itens
  where orcamento_id = p_orcamento_id;

  select desconto_tipo, desconto_valor
  into v_desconto_tipo, v_desconto_valor
  from public.orcamentos
  where id = p_orcamento_id;

  if not found then
    return;
  end if;

  v_desconto_aplicado := case
    when v_desconto_tipo = 'percentual'
      then round(v_subtotal * coalesce(v_desconto_valor, 0) / 100, 2)
    else coalesce(v_desconto_valor, 0)
  end;

  v_desconto_aplicado := least(greatest(v_desconto_aplicado, 0), v_subtotal);

  update public.orcamentos
  set
    valor_pecas = v_valor_pecas,
    valor_servicos = v_valor_servicos,
    desconto_aplicado = v_desconto_aplicado,
    valor_total = greatest(v_subtotal - v_desconto_aplicado, 0)
  where id = p_orcamento_id;
end;
$$;

create or replace function public.trg_orcamentos_recalcular_desconto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(14,2) := 0;
  v_desconto numeric(14,2) := 0;
begin
  select coalesce(sum(valor_total), 0)
  into v_subtotal
  from public.orcamento_itens
  where orcamento_id = new.id;

  v_desconto := case
    when new.desconto_tipo = 'percentual'
      then round(v_subtotal * coalesce(new.desconto_valor, 0) / 100, 2)
    else coalesce(new.desconto_valor, 0)
  end;

  new.desconto_aplicado := least(greatest(v_desconto, 0), v_subtotal);
  new.valor_total := greatest(v_subtotal - new.desconto_aplicado, 0);
  return new;
end;
$$;

drop trigger if exists trg_orcamentos_recalcular_desconto_biu on public.orcamentos;
create trigger trg_orcamentos_recalcular_desconto_biu
before insert or update of desconto_tipo, desconto_valor on public.orcamentos
for each row execute function public.trg_orcamentos_recalcular_desconto();

create index if not exists idx_orcamentos_data_reprovacao
on public.orcamentos (data_reprovacao)
where data_reprovacao is not null;

create index if not exists idx_orcamentos_data_faturamento
on public.orcamentos (data_faturamento)
where data_faturamento is not null;

create index if not exists idx_orcamentos_data_cancelamento
on public.orcamentos (data_cancelamento)
where data_cancelamento is not null;

comment on column public.orcamentos.desconto_tipo is
  'Tipo do desconto informado no orcamento: valor ou percentual.';
comment on column public.orcamentos.desconto_valor is
  'Valor digitado do desconto; percentual quando desconto_tipo for percentual.';
comment on column public.orcamentos.desconto_aplicado is
  'Valor monetario efetivamente descontado do subtotal dos itens.';

-- Fim da migration 096_orcamentos_datas_status_e_desconto.sql

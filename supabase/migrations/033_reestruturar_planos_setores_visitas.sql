-- ============================================================
-- EngClinica Pro
-- Migration: 033_reestruturar_planos_setores_visitas.sql
-- Objetivo:
-- - Organizar planos por setor ou pela unidade inteira
-- - Separar a origem operacional da origem do problema da OS
-- - Corrigir a validacao compartilhada dos vinculos do plano
-- ============================================================

alter table public.planos
add column if not exists modo_organizacao text not null default 'por_setor';

alter table public.planos
drop constraint if exists planos_modo_organizacao_check;

alter table public.planos
add constraint planos_modo_organizacao_check check (
  modo_organizacao in ('por_setor', 'unidade_inteira')
);

alter table public.ordens_servico
add column if not exists origem_fluxo text not null default 'manual';

update public.ordens_servico
set origem_fluxo = 'plano'
where plano_id is not null
  and plano_execucao_id is not null
  and plano_execucao_item_id is not null;

alter table public.ordens_servico
drop constraint if exists ordens_servico_origem_fluxo_check;

alter table public.ordens_servico
add constraint ordens_servico_origem_fluxo_check check (
  origem_fluxo in ('manual', 'protocolo', 'plano')
);

alter table public.ordens_servico
drop constraint if exists ordens_servico_origem_plano_vinculos_check;

alter table public.ordens_servico
add constraint ordens_servico_origem_plano_vinculos_check check (
  origem_fluxo <> 'plano'
  or (
    plano_id is not null
    and plano_execucao_id is not null
    and plano_execucao_item_id is not null
  )
);

alter table public.calibracao_execucoes
add column if not exists origem_fluxo text not null default 'manual';

update public.calibracao_execucoes
set origem_fluxo = 'plano'
where origem = 'plano'
   or (
     plano_id is not null
     and plano_execucao_id is not null
     and plano_execucao_item_id is not null
   );

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_origem_fluxo_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_origem_fluxo_check check (
  origem_fluxo in ('manual', 'plano')
);

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_origem_plano_vinculos_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_origem_plano_vinculos_check check (
  origem_fluxo <> 'plano'
  or (
    plano_id is not null
    and plano_execucao_id is not null
    and plano_execucao_item_id is not null
  )
);

-- Mantem a coluna legada enquanto a RPC criada na migration 032 ainda a utiliza.
create or replace function public.sincronizar_calibracao_origem_fluxo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origem_fluxo = 'plano' or new.origem = 'plano' then
    new.origem_fluxo := 'plano';
    new.origem := 'plano';
  else
    new.origem_fluxo := 'manual';
    new.origem := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_calibracao_sincronizar_origem_fluxo
on public.calibracao_execucoes;

create trigger trg_calibracao_sincronizar_origem_fluxo
before insert or update of origem_fluxo, origem
on public.calibracao_execucoes
for each row execute function public.sincronizar_calibracao_origem_fluxo();

create or replace function public.validar_vinculos_origem_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.plano_id is not null
    or new.plano_execucao_id is not null
    or new.plano_execucao_item_id is not null
  ) and (
    new.plano_id is null
    or new.plano_execucao_id is null
    or new.plano_execucao_item_id is null
  ) then
    raise exception 'Informe os vinculos completos com o plano.';
  end if;

  if (
    new.plano_id is not null
    or new.plano_execucao_id is not null
    or new.plano_execucao_item_id is not null
  ) and not exists (
    select 1
    from public.plano_execucao_itens i
    join public.plano_execucoes e on e.id = i.execucao_id
    join public.planos p on p.id = e.plano_id
    where i.id = new.plano_execucao_item_id
      and e.id = new.plano_execucao_id
      and p.id = new.plano_id
      and i.organizacao_id = new.organizacao_id
      and e.organizacao_id = new.organizacao_id
      and p.organizacao_id = new.organizacao_id
  ) then
    raise exception 'Os vinculos informados nao pertencem ao mesmo plano e organizacao.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_os_validar_vinculos_origem_plano
on public.ordens_servico;

create trigger trg_os_validar_vinculos_origem_plano
before insert or update of origem_fluxo, plano_id, plano_execucao_id, plano_execucao_item_id
on public.ordens_servico
for each row execute function public.validar_vinculos_origem_plano();

drop trigger if exists trg_calibracao_validar_vinculos_origem_plano
on public.calibracao_execucoes;

create trigger trg_calibracao_validar_vinculos_origem_plano
before insert or update of origem_fluxo, plano_id, plano_execucao_id, plano_execucao_item_id
on public.calibracao_execucoes
for each row execute function public.validar_vinculos_origem_plano();

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 033_reestruturar_planos_setores_visitas.sql
-- ============================================================

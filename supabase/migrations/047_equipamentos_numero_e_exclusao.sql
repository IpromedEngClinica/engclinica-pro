-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 047_equipamentos_numero_e_exclusao.sql
-- Objetivo:
-- - Vincular um numero sequencial permanente a cada equipamento
-- - Permitir exclusao de equipamentos sem registros dependentes
-- ============================================================

alter table public.equipamentos
add column if not exists numero_cadastro bigint;

with numerados as (
  select
    id,
    row_number() over (
      partition by organizacao_id
      order by created_at asc, id asc
    ) as numero
  from public.equipamentos
)
update public.equipamentos e
set numero_cadastro = numerados.numero
from numerados
where numerados.id = e.id
  and e.numero_cadastro is null;

alter table public.equipamentos
alter column numero_cadastro set not null;

create unique index if not exists uq_equipamentos_organizacao_numero
on public.equipamentos (organizacao_id, numero_cadastro);

create or replace function public.definir_numero_cadastro_equipamento()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero_cadastro is null then
    perform pg_advisory_xact_lock(
      hashtextextended(new.organizacao_id::text, 0)
    );

    select coalesce(max(e.numero_cadastro), 0) + 1
    into new.numero_cadastro
    from public.equipamentos e
    where e.organizacao_id = new.organizacao_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipamentos_numero_cadastro
on public.equipamentos;

create trigger trg_equipamentos_numero_cadastro
before insert on public.equipamentos
for each row
execute function public.definir_numero_cadastro_equipamento();

drop policy if exists "equipamentos_delete_por_permissao"
on public.equipamentos;

create policy "equipamentos_delete_por_permissao"
on public.equipamentos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('equipamentos.gerenciar')
);

notify pgrst, 'reload schema';

-- Fim da migration 047_equipamentos_numero_e_exclusao.sql

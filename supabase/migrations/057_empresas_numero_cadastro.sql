-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 057_empresas_numero_cadastro.sql
-- Objetivo:
-- - Criar numeracao visual persistente para empresas
-- - Evitar que a tabela use o indice da linha filtrada/ordenada
-- ============================================================

alter table public.empresas
add column if not exists numero_cadastro bigint;

with numeradas as (
  select
    id,
    row_number() over (
      partition by organizacao_id
      order by created_at asc, id asc
    ) as numero
  from public.empresas
  where numero_cadastro is null
)
update public.empresas e
set numero_cadastro = numeradas.numero
from numeradas
where e.id = numeradas.id
  and e.numero_cadastro is null;

alter table public.empresas
alter column numero_cadastro set not null;

create unique index if not exists idx_empresas_numero_cadastro
on public.empresas (organizacao_id, numero_cadastro);

create or replace function public.definir_numero_cadastro_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero_cadastro is null then
    select coalesce(max(e.numero_cadastro), 0) + 1
    into new.numero_cadastro
    from public.empresas e
    where e.organizacao_id = new.organizacao_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_empresas_numero_cadastro on public.empresas;

create trigger trg_empresas_numero_cadastro
before insert on public.empresas
for each row
execute function public.definir_numero_cadastro_empresa();

notify pgrst, 'reload schema';

-- Fim da migration 057_empresas_numero_cadastro.sql

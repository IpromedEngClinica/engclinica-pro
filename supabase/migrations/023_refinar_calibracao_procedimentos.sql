-- ============================================================
-- EngClinica Pro
-- Migration: 023_refinar_calibracao_procedimentos.sql
-- Objetivo:
-- - Gerar codigo interno automatico para procedimentos
-- - Vincular diretamente a tabela do procedimento ao padrao utilizado
-- - Validar os novos vinculos conforme a organizacao autenticada
-- ============================================================

create sequence if not exists public.calibracao_procedimentos_codigo_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

do $$
declare
  maior_codigo bigint;
begin
  select coalesce(
    max(substring(codigo from '^PROC-CAL-([0-9]+)$')::bigint),
    0
  )
  into maior_codigo
  from public.calibracao_procedimentos
  where codigo ~ '^PROC-CAL-[0-9]+$';

  if maior_codigo > 0 then
    perform setval('public.calibracao_procedimentos_codigo_seq', maior_codigo, true);
  else
    perform setval('public.calibracao_procedimentos_codigo_seq', 1, false);
  end if;
end;
$$;

create or replace function public.gerar_codigo_calibracao_procedimento()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo_numero bigint;
begin
  proximo_numero := nextval('public.calibracao_procedimentos_codigo_seq');
  return 'PROC-CAL-' || lpad(proximo_numero::text, 6, '0');
end;
$$;

alter function public.gerar_codigo_calibracao_procedimento() owner to postgres;

alter table public.calibracao_procedimentos
alter column codigo set default public.gerar_codigo_calibracao_procedimento();

alter table public.calibracao_procedimento_tabelas
add column if not exists padrao_id uuid null references public.calibracao_padroes(id) on delete set null;

alter table public.calibracao_procedimento_tabelas
add column if not exists padrao_tabela_id uuid null references public.calibracao_padrao_tabelas(id) on delete set null;

create index if not exists idx_calibracao_procedimento_tabelas_padrao
on public.calibracao_procedimento_tabelas (padrao_id);

create index if not exists idx_calibracao_procedimento_tabelas_padrao_tabela
on public.calibracao_procedimento_tabelas (padrao_tabela_id);

drop policy if exists "calibracao_procedimento_tabelas_insert_admin_gestor_tecnico"
on public.calibracao_procedimento_tabelas;

create policy "calibracao_procedimento_tabelas_insert_admin_gestor_tecnico"
on public.calibracao_procedimento_tabelas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.calibracao_procedimentos p
    where p.id = procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and (
    calibracao_procedimento_tabelas.padrao_id is null
    or exists (
      select 1
      from public.calibracao_padroes p
      where p.id = calibracao_procedimento_tabelas.padrao_id
        and p.organizacao_id = public.current_organizacao_id()
        and p.ativo
        and p.data_validade >= current_date
    )
  )
  and (
    calibracao_procedimento_tabelas.padrao_tabela_id is null
    or exists (
      select 1
      from public.calibracao_padrao_tabelas t
      where t.id = calibracao_procedimento_tabelas.padrao_tabela_id
        and t.padrao_id = calibracao_procedimento_tabelas.padrao_id
        and t.organizacao_id = public.current_organizacao_id()
        and t.ativo
    )
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_procedimento_tabelas_update_admin_gestor_tecnico"
on public.calibracao_procedimento_tabelas;

create policy "calibracao_procedimento_tabelas_update_admin_gestor_tecnico"
on public.calibracao_procedimento_tabelas
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.calibracao_procedimentos p
    where p.id = procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and (
    calibracao_procedimento_tabelas.padrao_id is null
    or exists (
      select 1
      from public.calibracao_padroes p
      where p.id = calibracao_procedimento_tabelas.padrao_id
        and p.organizacao_id = public.current_organizacao_id()
        and p.ativo
        and p.data_validade >= current_date
    )
  )
  and (
    calibracao_procedimento_tabelas.padrao_tabela_id is null
    or exists (
      select 1
      from public.calibracao_padrao_tabelas t
      where t.id = calibracao_procedimento_tabelas.padrao_tabela_id
        and t.padrao_id = calibracao_procedimento_tabelas.padrao_id
        and t.organizacao_id = public.current_organizacao_id()
        and t.ativo
    )
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 023_refinar_calibracao_procedimentos.sql
-- ============================================================

-- ============================================================
-- EngClinica Pro
-- Migration: 006_fix_numero_os_default.sql
-- Objetivo:
-- - Corrigir default da coluna ordens_servico.numero
-- - Garantir sequência simples de OS iniciando após 55762
-- - Evitar erro de numero nulo ao criar OS
-- ============================================================

create sequence if not exists public.ordens_servico_numero_seq
  start with 55763
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

-- Ajusta a sequência para nunca ficar abaixo da maior OS numérica existente.
select setval(
  'public.ordens_servico_numero_seq',
  greatest(
    55762,
    coalesce(
      (
        select max(numero::bigint)
        from public.ordens_servico
        where numero ~ '^[0-9]+$'
      ),
      55762
    )
  ),
  true
);

create or replace function public.gerar_numero_os()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo_numero bigint;
begin
  proximo_numero := nextval('public.ordens_servico_numero_seq');
  return proximo_numero::text;
end;
$$;

alter function public.gerar_numero_os() owner to postgres;

alter table public.ordens_servico
alter column numero set default public.gerar_numero_os();

-- Segurança adicional: se em algum ambiente existir alguma linha antiga com numero nulo,
-- preenche com a sequência antes de reafirmar NOT NULL.
update public.ordens_servico
set numero = public.gerar_numero_os()
where numero is null;

alter table public.ordens_servico
alter column numero set not null;

-- Verificação útil para execução manual no Supabase:
-- select column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'ordens_servico'
--   and column_name = 'numero';

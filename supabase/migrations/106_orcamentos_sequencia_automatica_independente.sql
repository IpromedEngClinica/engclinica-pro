-- ============================================================
-- EngClinica Pro
-- Migration: 106_orcamentos_sequencia_automatica_independente.sql
-- Objetivo:
-- - Separar a numeracao automatica dos orcamentos dos numeros
--   historicos importados e dos numeros vinculados a OS
-- - Continuar a sequencia operacional apos o orcamento 1402
-- ============================================================

create sequence if not exists public.orcamentos_numero_automatico_seq
  start with 1403
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

-- O ultimo numero automatico valido antes desta migration e 1402.
-- Numeros maiores existentes pertencem a OS ou a registros historicos.
select setval('public.orcamentos_numero_automatico_seq', 1402, true);

create or replace function public.gerar_numero_orcamento()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero bigint;
begin
  loop
    v_numero := nextval('public.orcamentos_numero_automatico_seq');

    exit when not exists (
      select 1
      from public.orcamentos
      where numero = v_numero::text
    );
  end loop;

  return v_numero::text;
end;
$$;

alter function public.gerar_numero_orcamento() owner to postgres;

alter table public.orcamentos
  alter column numero set default public.gerar_numero_orcamento();

comment on sequence public.orcamentos_numero_automatico_seq is
  'Sequencia exclusiva dos orcamentos criados automaticamente no Ipromed.';

comment on function public.gerar_numero_orcamento() is
  'Gera numeros sequenciais de orcamento sem considerar numeros historicos importados ou vinculados a OS.';

notify pgrst, 'reload schema';

-- Fim da migration 106_orcamentos_sequencia_automatica_independente.sql

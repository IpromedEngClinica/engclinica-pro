-- ============================================================
-- EngClinica Pro
-- Migration: 109_prever_numero_orcamento.sql
-- Objetivo:
-- - Exibir no formulario o proximo numero de orcamento avulso
-- - Nao consumir a sequencia antes de o usuario salvar
-- ============================================================

create or replace function public.prever_proximo_numero_orcamento()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero bigint;
begin
  select case
    when is_called then last_value + 1
    else last_value
  end
  into v_numero
  from public.orcamentos_numero_automatico_seq;

  while exists (
    select 1
    from public.orcamentos
    where numero = v_numero::text
  ) loop
    v_numero := v_numero + 1;
  end loop;

  return v_numero::text;
end;
$$;

alter function public.prever_proximo_numero_orcamento() owner to postgres;
revoke all on function public.prever_proximo_numero_orcamento() from public;
grant execute on function public.prever_proximo_numero_orcamento() to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 109_prever_numero_orcamento.sql

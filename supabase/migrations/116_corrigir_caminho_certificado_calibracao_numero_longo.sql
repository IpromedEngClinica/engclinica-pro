-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 116_corrigir_caminho_certificado_calibracao_numero_longo.sql
-- Objetivo:
-- - Preservar numeros de certificado com mais de seis digitos
-- - Corrigir a validacao do caminho do PDF em revisoes
-- ============================================================

do $$
declare
  v_definition text;
  v_old_expression text :=
    'lpad(v_execucao.numero_certificado::text, 6, ''0'')';
  v_new_expression text :=
    'lpad(v_execucao.numero_certificado::text, greatest(6, length(v_execucao.numero_certificado::text)), ''0'')';
begin
  select pg_get_functiondef(
    'public.finalizar_calibracao_execucao(uuid, text, text)'::regprocedure
  )
  into v_definition;

  if v_definition is null then
    raise exception 'Funcao finalizar_calibracao_execucao nao encontrada.';
  end if;

  if position(v_old_expression in v_definition) = 0 then
    raise exception 'Expressao antiga do numero do certificado nao encontrada.';
  end if;

  v_definition := replace(v_definition, v_old_expression, v_new_expression);
  execute v_definition;
end;
$$;

alter function public.finalizar_calibracao_execucao(uuid, text, text)
  owner to postgres;
revoke all on function public.finalizar_calibracao_execucao(uuid, text, text)
  from public;
grant execute on function public.finalizar_calibracao_execucao(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 116_corrigir_caminho_certificado_calibracao_numero_longo.sql

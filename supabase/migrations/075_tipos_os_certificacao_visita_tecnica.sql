-- ============================================================
-- EngClinica Pro
-- Migration: 075_tipos_os_certificacao_visita_tecnica.sql
-- Objetivo:
-- - Ativar/criar tipos de OS usados na migracao do historico legado
-- ============================================================

do $$
declare
  v_org record;
  v_nome text;
begin
  for v_org in select id from public.organizacoes loop
    foreach v_nome in array array['Certificação', 'Visita Técnica'] loop
      insert into public.tipos_os (
        organizacao_id,
        nome,
        descricao,
        ativo
      )
      values (
        v_org.id,
        v_nome,
        'Tipo de OS importado do histórico legado.',
        true
      )
      on conflict (organizacao_id, nome) do update
      set
        ativo = true,
        updated_at = now();
    end loop;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

-- Fim da migration 075_tipos_os_certificacao_visita_tecnica.sql

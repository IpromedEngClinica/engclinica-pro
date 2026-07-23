-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 113_atualizar_nome_igor_lelis_rezende.sql
-- Objetivo:
-- - Atualizar o nome completo de Igor no cadastro de usuarios
-- - Sincronizar snapshots textuais usados em documentos
-- ============================================================

update public.usuarios
set
  nome = 'Igor Lelis Rezende',
  updated_at = now()
where email = 'iglelis@yahoo.com.br'
  and nome is distinct from 'Igor Lelis Rezende';

update auth.users
set
  raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{nome}',
    to_jsonb('Igor Lelis Rezende'::text),
    true
  ),
  updated_at = now()
where id in (
  select id
  from public.usuarios
  where email = 'iglelis@yahoo.com.br'
);

update public.auditoria_logs
set usuario_nome_snapshot = 'Igor Lelis Rezende'
where usuario_id in (
  select id
  from public.usuarios
  where email = 'iglelis@yahoo.com.br'
)
   or usuario_nome_snapshot = 'Igor Lelis';

update public.orcamentos
set responsavel_orcamentista = 'Igor Lelis Rezende'
where responsavel_orcamentista = 'Igor Lelis';

update public.ordens_servico
set responsavel_texto = 'Igor Lelis Rezende'
where responsavel_texto = 'Igor Lelis';

update public.calibracao_execucoes
set tecnico_executor_nome = 'Igor Lelis Rezende'
where tecnico_executor_nome = 'Igor Lelis';

update public.calibracao_execucoes
set responsavel_tecnico_nome = 'Igor Lelis Rezende'
where responsavel_tecnico_nome = 'Igor Lelis';

update public.seguranca_eletrica_execucoes
set tecnico_executor_nome = 'Igor Lelis Rezende'
where tecnico_executor_nome = 'Igor Lelis';

update public.seguranca_eletrica_execucoes
set responsavel_tecnico_nome = 'Igor Lelis Rezende'
where responsavel_tecnico_nome = 'Igor Lelis';

notify pgrst, 'reload schema';

-- Fim da migration 113_atualizar_nome_igor_lelis_rezende.sql

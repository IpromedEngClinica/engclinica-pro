-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 118_calibracao_tecnico_executor_usuario.sql
-- Objetivo:
-- - Vincular o tecnico executor da calibracao ao usuario cadastrado
-- - Permitir localizar a assinatura pelo ID, sem depender do nome
-- ============================================================

alter table public.calibracao_execucoes
  add column if not exists tecnico_executor_usuario_id uuid
  references public.usuarios(id)
  on delete set null;

create index if not exists idx_calibracao_execucoes_tecnico_usuario
  on public.calibracao_execucoes (tecnico_executor_usuario_id)
  where tecnico_executor_usuario_id is not null;

with correspondencias as (
  select
    execucao.id as execucao_id,
    (array_agg(usuario.id order by usuario.updated_at desc))[1] as usuario_id,
    count(*) as quantidade
  from public.calibracao_execucoes execucao
  join public.usuarios usuario
    on usuario.organizacao_id = execucao.organizacao_id
   and usuario.ativo = true
   and usuario.perfil in ('admin', 'gestor', 'tecnico')
   and lower(btrim(usuario.nome)) = lower(btrim(execucao.tecnico_executor_nome))
  where execucao.tecnico_executor_usuario_id is null
  group by execucao.id
)
update public.calibracao_execucoes execucao
set tecnico_executor_usuario_id = correspondencias.usuario_id
from correspondencias
where execucao.id = correspondencias.execucao_id
  and correspondencias.quantidade = 1;

notify pgrst, 'reload schema';

-- Fim da migration 118_calibracao_tecnico_executor_usuario.sql

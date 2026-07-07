-- ============================================================
-- EngClinica Pro
-- Migration: 074_estado_em_processo_analise_tecnica.sql
-- Objetivo:
-- - Cadastrar estado de OS usado na migracao do historico legado
-- ============================================================

insert into public.estados_os (
  organizacao_id,
  nome,
  descricao,
  finaliza_os,
  cancela_os,
  ordem,
  ativo
)
select
  org.id,
  'Em processo de análise Técnica',
  'Estado importado do histórico legado para OS em análise técnica.',
  false,
  false,
  coalesce((
    select max(e.ordem)
    from public.estados_os e
    where e.organizacao_id = org.id
  ), 0) + 1,
  true
from public.organizacoes org
where not exists (
  select 1
  from public.estados_os e
  where e.organizacao_id = org.id
    and lower(e.nome) = lower('Em processo de análise Técnica')
);

notify pgrst, 'reload schema';

-- Fim da migration 074_estado_em_processo_analise_tecnica.sql

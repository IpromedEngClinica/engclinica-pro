-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 071_limpar_solicitante_calibracao_planos.sql
-- Objetivo:
-- - Limpar responsavel solicitante preenchido automaticamente com titulo do ciclo
--   em calibracoes geradas pelos planos
-- ============================================================

update public.calibracao_execucoes e
set
  responsavel_solicitante = null,
  updated_at = now()
from public.plano_ciclo_itens item
join public.plano_ciclos ciclo on ciclo.id = item.ciclo_id
where item.calibracao_execucao_id = e.id
  and item.tipo_servico = 'calibracao'
  and e.responsavel_solicitante = ciclo.titulo;

notify pgrst, 'reload schema';

-- Fim da migration 071_limpar_solicitante_calibracao_planos.sql

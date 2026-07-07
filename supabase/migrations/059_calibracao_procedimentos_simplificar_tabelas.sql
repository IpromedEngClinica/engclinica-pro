-- ============================================================
-- EngClinica Pro
-- Migration: 059_calibracao_procedimentos_simplificar_tabelas.sql
-- Objetivo:
-- - Simplificar tabelas de procedimentos de calibracao
-- - Remover uso funcional de tipo_medida
-- - Padronizar procedimentos para 1 leitura inicial por ponto nominal
-- ============================================================

update public.calibracao_procedimento_tabelas
set
  quantidade_leituras = 1,
  tipo_medida = null,
  updated_at = now()
where quantidade_leituras is distinct from 1
   or tipo_medida is not null;

notify pgrst, 'reload schema';

-- Fim da migration 059_calibracao_procedimentos_simplificar_tabelas.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 027_calibracao_procedimento_pontos_valor_nominal_texto.sql
-- Objetivo:
-- - Preservar o valor nominal textual dos pontos de procedimentos
-- - Recarregar o schema exposto pelo PostgREST
-- ============================================================

alter table public.calibracao_procedimento_pontos
add column if not exists valor_nominal_texto text null;

update public.calibracao_procedimento_pontos
set valor_nominal_texto = replace(valor_nominal::text, '.', ',')
where valor_nominal_texto is null;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 027_calibracao_procedimento_pontos_valor_nominal_texto.sql
-- ============================================================

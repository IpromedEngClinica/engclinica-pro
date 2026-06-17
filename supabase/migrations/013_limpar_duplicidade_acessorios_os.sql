-- ============================================================
-- EngClinica Pro
-- Migration: 014_limpar_duplicidade_acessorios_os.sql
-- Objetivo:
-- - Limpar acessorios duplicados ja existentes por OS
-- - Manter o primeiro registro de cada descricao normalizada
-- ============================================================

with ranked as (
  select
    id,
    ordem_servico_id,
    lower(regexp_replace(trim(descricao), '\s+', ' ', 'g')) as descricao_norm,
    row_number() over (
      partition by ordem_servico_id, lower(regexp_replace(trim(descricao), '\s+', ' ', 'g'))
      order by created_at asc, id asc
    ) as rn
  from public.ordem_servico_acessorios
)
delete from public.ordem_servico_acessorios a
using ranked r
where a.id = r.id
  and r.rn > 1;

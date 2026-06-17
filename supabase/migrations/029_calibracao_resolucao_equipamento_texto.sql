-- ============================================================
-- EngClinica Pro
-- Migration: 029_calibracao_resolucao_equipamento_texto.sql
-- Objetivo:
-- - Preservar a representacao textual da resolucao do equipamento
-- - Permitir formatacao metrologica consistente nos certificados
-- ============================================================

alter table public.calibracao_execucao_tabelas
add column if not exists resolucao_equipamento_texto_snapshot text null;

update public.calibracao_execucao_tabelas
set resolucao_equipamento_texto_snapshot = coalesce(
  nullif(
    case
      when position('.' in resolucao_equipamento_snapshot::text) = 0
        then resolucao_equipamento_snapshot::text
      else trim(
        trailing '.'
        from trim(trailing '0' from resolucao_equipamento_snapshot::text)
      )
    end,
    ''
  ),
  '0'
)
where trim(coalesce(resolucao_equipamento_texto_snapshot, '')) = ''
  and resolucao_equipamento_snapshot is not null;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 029_calibracao_resolucao_equipamento_texto.sql
-- ============================================================

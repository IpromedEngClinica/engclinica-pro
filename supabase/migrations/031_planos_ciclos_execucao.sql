-- ============================================================
-- EngClinica Pro
-- Migration: 031_planos_ciclos_execucao.sql
-- Objetivo:
-- - Complementar itens de ciclo para execucao operacional
-- - Registrar equipamentos nao localizados sem gerar OS
-- - Preparar indices para historico e relatorios futuros
-- ============================================================

alter table public.plano_ciclo_itens
add column if not exists motivo_nao_localizado text null;

alter table public.plano_ciclo_itens
add column if not exists observacoes text null;

alter table public.plano_ciclo_itens
drop constraint if exists plano_ciclo_itens_status_check;

alter table public.plano_ciclo_itens
add constraint plano_ciclo_itens_status_check check (
  status in ('pendente', 'aberto', 'concluido', 'cancelado', 'nao_localizado')
);

create index if not exists idx_plano_ciclo_itens_equipamento
on public.plano_ciclo_itens (equipamento_id);

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 031_planos_ciclos_execucao.sql
-- ============================================================

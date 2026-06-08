-- ============================================================
-- EngClinica Pro
-- Migration: 033_planos_relatorios_validade.sql
-- Objetivo:
-- - Registrar validade do relatorio do ciclo
-- - Permitir vinculo explicito de OS corretivas ao ciclo do plano
-- ============================================================

alter table public.plano_ciclos
add column if not exists relatorio_emitido_em date null;

alter table public.plano_ciclos
add column if not exists relatorio_validade_ate date null;

alter table public.plano_ciclos
add column if not exists relatorio_validade_meses integer not null default 12;

alter table public.plano_ciclos
drop constraint if exists plano_ciclos_relatorio_validade_meses_check;

alter table public.plano_ciclos
add constraint plano_ciclos_relatorio_validade_meses_check
check (relatorio_validade_meses > 0);

alter table public.ordens_servico
add column if not exists plano_ciclo_id uuid null references public.plano_ciclos(id) on delete set null;

create index if not exists idx_ordens_servico_plano_ciclo
on public.ordens_servico (plano_ciclo_id);

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 033_planos_relatorios_validade.sql
-- ============================================================

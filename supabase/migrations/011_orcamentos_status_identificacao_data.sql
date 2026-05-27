-- ============================================================
-- EngClinica Pro
-- Migration: 011_orcamentos_status_identificacao_data.sql
-- Objetivo:
-- - Ajustar status operacionais de orcamento
-- - Adicionar identificacao do orcamento
-- - Permitir fluxo pendente/aprovado/reprovado/faturado/cancelado
-- ============================================================

alter table public.orcamentos
add column if not exists identificador text;

alter table public.orcamentos
drop constraint if exists orcamentos_status_check;

update public.orcamentos
set status = case
  when status in ('rascunho', 'emitido') then 'pendente'
  when status = 'aprovado' then 'aprovado'
  when status = 'reprovado' then 'reprovado'
  when status = 'cancelado' then 'cancelado'
  when status = 'faturado' then 'faturado'
  else 'pendente'
end;

alter table public.orcamentos
alter column status set default 'pendente';

alter table public.orcamentos
add constraint orcamentos_status_check check (
  status in ('pendente', 'aprovado', 'reprovado', 'faturado', 'cancelado')
);

create index if not exists idx_orcamentos_identificador
on public.orcamentos (identificador);

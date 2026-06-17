-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 053_historico_renovacao_padroes_calibracao.sql
-- Objetivo:
-- - Criar vinculo historico entre certificados renovados de padroes
-- - Permitir manter certificados anteriores acessiveis
-- ============================================================

alter table public.calibracao_padroes
  add column if not exists padrao_base_id uuid null
    references public.calibracao_padroes(id) on delete set null,
  add column if not exists certificado_anterior_id uuid null
    references public.calibracao_padroes(id) on delete set null,
  add column if not exists renovado_por_id uuid null
    references public.calibracao_padroes(id) on delete set null,
  add column if not exists renovado_em timestamp with time zone null;

create index if not exists idx_calibracao_padroes_padrao_base
on public.calibracao_padroes (padrao_base_id);

create index if not exists idx_calibracao_padroes_certificado_anterior
on public.calibracao_padroes (certificado_anterior_id);

create index if not exists idx_calibracao_padroes_renovado_por
on public.calibracao_padroes (renovado_por_id);

notify pgrst, 'reload schema';

-- Fim da migration 053_historico_renovacao_padroes_calibracao.sql

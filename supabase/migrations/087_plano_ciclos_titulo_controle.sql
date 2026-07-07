-- ============================================================
-- EngClinica Pro
-- Migration: 087_plano_ciclos_titulo_controle.sql
-- Objetivo:
-- - Permitir nome interno do ciclo para controle no historico
-- - Manter o titulo original preservado para relatorios/documentos
-- ============================================================

alter table public.plano_ciclos
  add column if not exists titulo_controle text;

comment on column public.plano_ciclos.titulo_controle is
  'Nome interno opcional do ciclo para controle operacional. Nao substitui o titulo usado nos relatorios.';

notify pgrst, 'reload schema';

-- Fim da migration 087_plano_ciclos_titulo_controle.sql

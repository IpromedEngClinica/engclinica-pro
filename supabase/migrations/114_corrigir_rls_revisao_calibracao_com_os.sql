-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 114_corrigir_rls_revisao_calibracao_com_os.sql
-- Objetivo:
-- - Permitir revisar calibracoes que possuem OS vinculada
-- - Manter as demais travas de permissao e integridade da revisao
-- ============================================================

drop policy if exists "calibracao_execucoes_update_por_permissao"
on public.calibracao_execucoes;

create policy "calibracao_execucoes_update_por_permissao"
on public.calibracao_execucoes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and status not in ('fechada', 'cancelada')
  and public.user_has_permission('calibracao.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and status in ('rascunho', 'em_execucao', 'cancelada')
  and pdf_storage_path is null
  and pdf_hash is null
  and fechado_em is null
  and public.user_has_permission('calibracao.gerenciar')
);

notify pgrst, 'reload schema';

-- Fim da migration 114_corrigir_rls_revisao_calibracao_com_os.sql

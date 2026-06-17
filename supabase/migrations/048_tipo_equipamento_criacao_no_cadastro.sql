-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 048_tipo_equipamento_criacao_no_cadastro.sql
-- Objetivo:
-- - Permitir criar tipos durante o cadastro de equipamentos
-- - Manter alteracao e exclusao restritas aos Campos Gerenciais
-- ============================================================

drop policy if exists "tipos_equipamento_write_por_permissao"
on public.tipos_equipamento;

drop policy if exists "tipos_equipamento_insert_por_permissao"
on public.tipos_equipamento;

drop policy if exists "tipos_equipamento_update_por_permissao"
on public.tipos_equipamento;

drop policy if exists "tipos_equipamento_delete_por_permissao"
on public.tipos_equipamento;

create policy "tipos_equipamento_insert_por_permissao"
on public.tipos_equipamento
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and (
    public.user_has_permission('equipamentos.gerenciar')
    or public.user_has_permission('campos_gerenciais.gerenciar')
  )
);

create policy "tipos_equipamento_update_por_permissao"
on public.tipos_equipamento
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('campos_gerenciais.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('campos_gerenciais.gerenciar')
);

create policy "tipos_equipamento_delete_por_permissao"
on public.tipos_equipamento
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('campos_gerenciais.gerenciar')
);

notify pgrst, 'reload schema';

-- Fim da migration 048_tipo_equipamento_criacao_no_cadastro.sql

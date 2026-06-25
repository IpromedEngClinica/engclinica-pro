-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 062_exclusao_empresas_controlada.sql
-- Objetivo:
-- - Permitir exclusao controlada de empresas para admin/gestor
-- - Opcionalmente excluir equipamentos vinculados na mesma transacao
-- ============================================================

create or replace function public.excluir_empresa_controlada(
  p_empresa_id uuid,
  p_excluir_equipamentos boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizacao_id uuid;
  v_total_equipamentos integer;
begin
  if coalesce(public.current_user_perfil(), '') not in ('admin', 'gestor') then
    raise exception 'Somente Admin e Gestor podem excluir clientes.';
  end if;

  select e.organizacao_id
  into v_organizacao_id
  from public.empresas e
  where e.id = p_empresa_id
    and e.organizacao_id = public.current_organizacao_id();

  if v_organizacao_id is null then
    raise exception 'Cliente nao encontrado ou usuario sem permissao.';
  end if;

  select count(*)
  into v_total_equipamentos
  from public.equipamentos eq
  where eq.empresa_id = p_empresa_id
    and eq.organizacao_id = v_organizacao_id;

  if v_total_equipamentos > 0 and not p_excluir_equipamentos then
    raise exception 'Este cliente possui % equipamento(s). Confirme a exclusao dos equipamentos vinculados para continuar.', v_total_equipamentos;
  end if;

  if p_excluir_equipamentos then
    delete from public.equipamentos eq
    where eq.empresa_id = p_empresa_id
      and eq.organizacao_id = v_organizacao_id;
  end if;

  delete from public.empresas e
  where e.id = p_empresa_id
    and e.organizacao_id = v_organizacao_id;
end;
$$;

alter function public.excluir_empresa_controlada(uuid, boolean) owner to postgres;
revoke all on function public.excluir_empresa_controlada(uuid, boolean) from public;
grant execute on function public.excluir_empresa_controlada(uuid, boolean) to authenticated;

drop policy if exists "empresas_delete_admin_gestor"
on public.empresas;

create policy "empresas_delete_admin_gestor"
on public.empresas
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor')
);

notify pgrst, 'reload schema';

-- Fim da migration 062_exclusao_empresas_controlada.sql

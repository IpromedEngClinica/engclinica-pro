-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 112_tecnicos_executores_os.sql
-- Objetivo:
-- - Permitir que tecnicos selecionem qualquer executor ativo
-- - Expor somente os dados necessarios para o seletor de OS
-- ============================================================

create or replace function public.listar_tecnicos_executores()
returns table (
  id uuid,
  nome text,
  perfil text,
  ativo boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organizacao_id uuid := public.current_organizacao_id();
begin
  if v_organizacao_id is null then
    raise exception 'Organizacao do usuario nao identificada.';
  end if;

  if coalesce(public.current_user_perfil(), '') not in ('admin', 'gestor', 'tecnico') then
    raise exception 'Usuario sem permissao para listar tecnicos executores.';
  end if;

  return query
  select
    usuario.id,
    usuario.nome,
    usuario.perfil,
    usuario.ativo
  from public.usuarios usuario
  where usuario.organizacao_id = v_organizacao_id
    and usuario.ativo = true
    and usuario.perfil in ('admin', 'gestor', 'tecnico')
  order by lower(usuario.nome), usuario.id;
end;
$$;

alter function public.listar_tecnicos_executores() owner to postgres;
revoke all on function public.listar_tecnicos_executores() from public;
grant execute on function public.listar_tecnicos_executores() to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 112_tecnicos_executores_os.sql

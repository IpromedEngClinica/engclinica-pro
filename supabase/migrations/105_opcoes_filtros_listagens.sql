-- ============================================================
-- EngClinica Pro
-- Migration: 105_opcoes_filtros_listagens.sql
-- Objetivo:
-- - Retornar opcoes completas dos filtros de OS e equipamentos
-- - Evitar montar filtros apenas com os registros da pagina atual
-- - Manter a carga leve, transferindo somente valores distintos
-- ============================================================

create or replace function public.listar_opcoes_filtros_ordens_servico()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid;
  v_empresa_id uuid;
  v_is_solicitante boolean;
  v_result jsonb;
begin
  v_org_id := public.current_organizacao_id();

  if v_org_id is null then
    raise exception 'Organizacao nao identificada.';
  end if;

  if not public.user_has_permission('os.visualizar') then
    raise exception 'Usuario sem permissao para visualizar ordens de servico.';
  end if;

  v_is_solicitante := public.is_solicitante();
  v_empresa_id := public.current_empresa_id();

  with base as materialized (
    select
      nullif(trim(eos.nome), '') as estado,
      nullif(trim(emp.nome), '') as solicitante,
      nullif(trim(tos.nome), '') as tipo_servico
    from public.ordens_servico os
    left join public.empresas emp on emp.id = os.empresa_id
    left join public.tipos_os tos on tos.id = os.tipo_os_id
    left join public.estados_os eos on eos.id = os.estado_os_id
    where os.organizacao_id = v_org_id
      and os.ativo = true
      and coalesce(os.oculta_operacao, false) = false
      and (not v_is_solicitante or os.empresa_id = v_empresa_id)
  )
  select jsonb_build_object(
    'estados', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct estado as valor from base where estado is not null) q
    ), '[]'::jsonb),
    'solicitantes', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct solicitante as valor from base where solicitante is not null) q
    ), '[]'::jsonb),
    'tipos_servico', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct tipo_servico as valor from base where tipo_servico is not null) q
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

alter function public.listar_opcoes_filtros_ordens_servico() owner to postgres;
revoke all on function public.listar_opcoes_filtros_ordens_servico() from public;
grant execute on function public.listar_opcoes_filtros_ordens_servico() to authenticated;

create or replace function public.listar_opcoes_filtros_equipamentos(
  p_status_filtro text default 'ativos'
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid;
  v_empresa_id uuid;
  v_is_solicitante boolean;
  v_result jsonb;
begin
  v_org_id := public.current_organizacao_id();

  if v_org_id is null then
    raise exception 'Organizacao nao identificada.';
  end if;

  if not public.user_has_permission('equipamentos.visualizar') then
    raise exception 'Usuario sem permissao para visualizar equipamentos.';
  end if;

  v_is_solicitante := public.is_solicitante();
  v_empresa_id := public.current_empresa_id();

  with base as materialized (
    select
      nullif(trim(eq.status), '') as estado,
      nullif(trim(emp.nome), '') as proprietario,
      nullif(trim(coalesce(teq.nome, eq.tipo_texto)), '') as tipo,
      nullif(trim(eq.fabricante), '') as fabricante,
      nullif(trim(eq.setor), '') as setor
    from public.equipamentos eq
    left join public.empresas emp on emp.id = eq.empresa_id
    left join public.tipos_equipamento teq on teq.id = eq.tipo_equipamento_id
    where eq.organizacao_id = v_org_id
      and (not v_is_solicitante or eq.empresa_id = v_empresa_id)
      and (
        coalesce(p_status_filtro, 'ativos') = 'todos'
        or (coalesce(p_status_filtro, 'ativos') = 'ativos' and eq.ativo = true)
        or (coalesce(p_status_filtro, 'ativos') = 'desativados' and eq.ativo = false)
      )
  )
  select jsonb_build_object(
    'estados', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct estado as valor from base where estado is not null) q
    ), '[]'::jsonb),
    'proprietarios', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct proprietario as valor from base where proprietario is not null) q
    ), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct tipo as valor from base where tipo is not null) q
    ), '[]'::jsonb),
    'fabricantes', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct fabricante as valor from base where fabricante is not null) q
    ), '[]'::jsonb),
    'setores', coalesce((
      select jsonb_agg(valor order by valor)
      from (select distinct setor as valor from base where setor is not null) q
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

alter function public.listar_opcoes_filtros_equipamentos(text) owner to postgres;
revoke all on function public.listar_opcoes_filtros_equipamentos(text) from public;
grant execute on function public.listar_opcoes_filtros_equipamentos(text) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 105_opcoes_filtros_listagens.sql

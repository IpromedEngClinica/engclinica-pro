-- ============================================================
-- EngClinica Pro
-- Migration: 081_dashboard_preventivas_rapidas.sql
-- Objetivo:
-- - Evitar timeout no painel ao calcular ultimas preventivas
-- - Substituir consulta pesada de OS fechadas + checklist por RPC resumida
-- ============================================================

create index if not exists idx_os_checklists_preventiva_validade_os
on public.os_checklists_preventiva (data_validade desc, ordem_servico_id)
where data_validade is not null;

create index if not exists idx_os_dashboard_preventiva_fechada
on public.ordens_servico (organizacao_id, equipamento_id, data_fechamento desc)
where ativo = true
  and status_sistema = 'fechada'
  and equipamento_id is not null;

drop function if exists public.listar_ultimas_preventivas_equipamentos(integer);

create function public.listar_ultimas_preventivas_equipamentos(
  p_limit integer default 5000
)
returns table (
  equipamento_id uuid,
  data_validade date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizacao_id uuid;
  v_empresa_id uuid;
  v_is_solicitante boolean;
begin
  if not public.user_has_permission('dashboard.visualizar') then
    raise exception 'Usuario sem permissao para visualizar o painel.';
  end if;

  v_organizacao_id := public.current_organizacao_id();
  v_empresa_id := public.current_empresa_id();
  v_is_solicitante := public.is_solicitante();

  return query
  select
    os.equipamento_id,
    max(checklist.data_validade)::date as data_validade
  from public.os_checklists_preventiva checklist
  join public.ordens_servico os on os.id = checklist.ordem_servico_id
  where os.organizacao_id = v_organizacao_id
    and os.ativo = true
    and os.status_sistema = 'fechada'
    and os.equipamento_id is not null
    and checklist.data_validade is not null
    and (not v_is_solicitante or os.empresa_id = v_empresa_id)
  group by os.equipamento_id
  order by max(checklist.data_validade) desc
  limit greatest(1, least(coalesce(p_limit, 5000), 10000));
end;
$$;

alter function public.listar_ultimas_preventivas_equipamentos(integer) owner to postgres;
revoke all on function public.listar_ultimas_preventivas_equipamentos(integer) from public;
grant execute on function public.listar_ultimas_preventivas_equipamentos(integer) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 081_dashboard_preventivas_rapidas.sql

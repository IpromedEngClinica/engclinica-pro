-- ============================================================
-- EngClinica Pro
-- Migration: 079_rpc_ordens_servico_listagem.sql
-- Objetivo:
-- - Listar ordens de servico com consulta resumida e rapida
-- - Evitar timeout da listagem com RLS + embeds do PostgREST
-- ============================================================

create or replace function public.listar_ordens_servico_resumo(
  p_termo text default null,
  p_ocultar_fechadas boolean default false,
  p_estado_nome text default null,
  p_solicitante_nome text default null,
  p_tipo_servico_nome text default null,
  p_responsavel_tecnico text default null,
  p_numero text default null,
  p_offset integer default 0,
  p_limit integer default 26,
  p_sort_by text default 'numero_ordem',
  p_ascending boolean default false
)
returns table (
  id uuid,
  organizacao_id uuid,
  numero text,
  empresa_id uuid,
  equipamento_id uuid,
  tipo_os_id uuid,
  estado_os_id uuid,
  tecnico_responsavel_id uuid,
  solicitante_texto text,
  responsavel_texto text,
  data_abertura timestamptz,
  data_fechamento timestamptz,
  problema_relatado text,
  origem_problema text,
  prioridade text,
  status_sistema text,
  plano_ciclo_id uuid,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz,
  empresa_nome text,
  empresa_nome_fantasia text,
  empresa_cpf_cnpj text,
  empresa_cep text,
  empresa_rua text,
  empresa_numero text,
  empresa_complemento text,
  empresa_bairro text,
  empresa_cidade text,
  empresa_estado text,
  empresa_contato text,
  empresa_email text,
  empresa_celular text,
  empresa_telefone text,
  empresa_ativo boolean,
  equipamento_organizacao_id uuid,
  equipamento_empresa_id uuid,
  equipamento_tipo_equipamento_id uuid,
  equipamento_tipo_texto text,
  equipamento_fabricante text,
  equipamento_modelo text,
  equipamento_numero_serie text,
  equipamento_patrimonio text,
  equipamento_tag text,
  equipamento_setor text,
  equipamento_status text,
  equipamento_ativo boolean,
  tipo_equipamento_nome text,
  tipo_os_nome text,
  estado_os_nome text,
  estado_os_finaliza_os boolean,
  estado_os_cancela_os boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_empresa_id uuid;
  v_is_solicitante boolean;
  v_termo text;
  v_termo_like text;
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
  v_termo := nullif(trim(coalesce(p_termo, '')), '');
  v_termo_like := case when v_termo is null then null else '%' || v_termo || '%' end;

  return query
  select
    os.id,
    os.organizacao_id,
    os.numero,
    os.empresa_id,
    os.equipamento_id,
    os.tipo_os_id,
    os.estado_os_id,
    os.tecnico_responsavel_id,
    os.solicitante_texto,
    os.responsavel_texto,
    os.data_abertura,
    os.data_fechamento,
    os.problema_relatado,
    os.origem_problema,
    os.prioridade,
    os.status_sistema,
    os.plano_ciclo_id,
    os.ativo,
    os.created_at,
    os.updated_at,
    emp.nome as empresa_nome,
    emp.nome_fantasia as empresa_nome_fantasia,
    emp.cpf_cnpj as empresa_cpf_cnpj,
    emp.cep as empresa_cep,
    emp.rua as empresa_rua,
    emp.numero as empresa_numero,
    emp.complemento as empresa_complemento,
    emp.bairro as empresa_bairro,
    emp.cidade as empresa_cidade,
    emp.estado as empresa_estado,
    emp.contato as empresa_contato,
    emp.email as empresa_email,
    emp.celular as empresa_celular,
    emp.telefone as empresa_telefone,
    emp.ativo as empresa_ativo,
    eq.organizacao_id as equipamento_organizacao_id,
    eq.empresa_id as equipamento_empresa_id,
    eq.tipo_equipamento_id as equipamento_tipo_equipamento_id,
    eq.tipo_texto as equipamento_tipo_texto,
    eq.fabricante as equipamento_fabricante,
    eq.modelo as equipamento_modelo,
    eq.numero_serie as equipamento_numero_serie,
    eq.patrimonio as equipamento_patrimonio,
    eq.tag as equipamento_tag,
    eq.setor as equipamento_setor,
    eq.status as equipamento_status,
    eq.ativo as equipamento_ativo,
    teq.nome as tipo_equipamento_nome,
    tos.nome as tipo_os_nome,
    eos.nome as estado_os_nome,
    eos.finaliza_os as estado_os_finaliza_os,
    eos.cancela_os as estado_os_cancela_os
  from public.ordens_servico os
  left join public.empresas emp on emp.id = os.empresa_id
  left join public.equipamentos eq on eq.id = os.equipamento_id
  left join public.tipos_equipamento teq on teq.id = eq.tipo_equipamento_id
  left join public.tipos_os tos on tos.id = os.tipo_os_id
  left join public.estados_os eos on eos.id = os.estado_os_id
  where os.organizacao_id = v_org_id
    and os.ativo = true
    and (not v_is_solicitante or os.empresa_id = v_empresa_id)
    and (not p_ocultar_fechadas or os.status_sistema not in ('fechada', 'cancelada'))
    and (nullif(trim(coalesce(p_estado_nome, '')), '') is null or eos.nome = p_estado_nome)
    and (
      nullif(trim(coalesce(p_solicitante_nome, '')), '') is null
      or emp.nome = p_solicitante_nome
      or emp.nome_fantasia = p_solicitante_nome
    )
    and (nullif(trim(coalesce(p_tipo_servico_nome, '')), '') is null or tos.nome = p_tipo_servico_nome)
    and (
      nullif(trim(coalesce(p_responsavel_tecnico, '')), '') is null
      or os.responsavel_texto ilike '%' || trim(p_responsavel_tecnico) || '%'
    )
    and (
      nullif(trim(coalesce(p_numero, '')), '') is null
      or os.numero ilike '%' || trim(p_numero) || '%'
    )
    and (
      v_termo is null
      or os.numero ilike v_termo_like
      or os.solicitante_texto ilike v_termo_like
      or os.responsavel_texto ilike v_termo_like
      or os.problema_relatado ilike v_termo_like
      or os.origem_problema ilike v_termo_like
      or emp.nome ilike v_termo_like
      or emp.nome_fantasia ilike v_termo_like
      or emp.cpf_cnpj ilike v_termo_like
      or eq.tipo_texto ilike v_termo_like
      or eq.fabricante ilike v_termo_like
      or eq.modelo ilike v_termo_like
      or eq.numero_serie ilike v_termo_like
      or eq.patrimonio ilike v_termo_like
      or eq.tag ilike v_termo_like
      or eq.setor ilike v_termo_like
      or teq.nome ilike v_termo_like
    )
  order by
    case when p_sort_by = 'numero_ordem' and p_ascending then os.numero_ordem end asc nulls last,
    case when p_sort_by = 'numero_ordem' and not p_ascending then os.numero_ordem end desc nulls last,
    case when p_sort_by = 'data_abertura' and p_ascending then os.data_abertura end asc nulls last,
    case when p_sort_by = 'data_abertura' and not p_ascending then os.data_abertura end desc nulls last,
    case when p_sort_by = 'created_at' and p_ascending then os.created_at end asc nulls last,
    case when p_sort_by = 'created_at' and not p_ascending then os.created_at end desc nulls last,
    case when p_sort_by = 'responsavel_texto' and p_ascending then os.responsavel_texto end asc nulls last,
    case when p_sort_by = 'responsavel_texto' and not p_ascending then os.responsavel_texto end desc nulls last,
    os.numero_ordem desc nulls last,
    os.created_at desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 26), 1), 151);
end;
$$;

alter function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean
) owner to postgres;

revoke all on function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean
) from public;

grant execute on function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean
) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 079_rpc_ordens_servico_listagem.sql

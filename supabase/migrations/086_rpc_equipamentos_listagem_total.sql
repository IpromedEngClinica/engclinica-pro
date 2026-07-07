-- ============================================================
-- EngClinica Pro
-- Migration: 086_rpc_equipamentos_listagem_total.sql
-- Objetivo:
-- - Listar equipamentos com consulta resumida e rapida
-- - Evitar embeds do PostgREST na tabela principal
-- - Devolver total real na mesma chamada para paginacao
-- ============================================================

create index if not exists idx_equipamentos_org_ativo_numero
  on public.equipamentos (organizacao_id, ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_org_numero
  on public.equipamentos (organizacao_id, numero_cadastro desc);

create index if not exists idx_equipamentos_org_empresa_numero
  on public.equipamentos (organizacao_id, empresa_id, numero_cadastro desc);

create index if not exists idx_equipamentos_org_tipo_numero
  on public.equipamentos (organizacao_id, tipo_equipamento_id, numero_cadastro desc);

drop function if exists public.listar_equipamentos_resumo(
  text, text, uuid, text, text, text, text, text, text, text, text, text, integer, integer, text, boolean
);

create function public.listar_equipamentos_resumo(
  p_termo text default null,
  p_status_filtro text default 'ativos',
  p_empresa_id uuid default null,
  p_estado text default null,
  p_empresa_nome text default null,
  p_tipo_equipamento_nome text default null,
  p_fabricante text default null,
  p_modelo text default null,
  p_tag text default null,
  p_serie text default null,
  p_patrimonio text default null,
  p_setor text default null,
  p_offset integer default 0,
  p_limit integer default 25,
  p_sort_by text default 'numero_cadastro',
  p_ascending boolean default false
)
returns table (
  total_count bigint,
  id uuid,
  numero_cadastro integer,
  organizacao_id uuid,
  empresa_id uuid,
  tipo_equipamento_id uuid,
  tipo_texto text,
  fabricante text,
  modelo text,
  numero_serie text,
  patrimonio text,
  tag text,
  setor text,
  empresa_setor_id uuid,
  local_instalacao text,
  status text,
  data_aquisicao date,
  data_instalacao date,
  data_ultima_preventiva date,
  data_proxima_preventiva date,
  data_ultima_calibracao date,
  data_proxima_calibracao date,
  observacoes text,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz,
  empresa_numero_cadastro integer,
  empresa_nome text,
  empresa_nome_fantasia text,
  empresa_tipo_cliente text,
  empresa_tipo_relacao text,
  empresa_representante_comercial_setor text,
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
  empresa_observacoes text,
  empresa_incluir_criterio_aceitacao_calibracao boolean,
  empresa_ativo boolean,
  empresa_created_at timestamptz,
  empresa_updated_at timestamptz,
  tipo_equipamento_nome text
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

  if not public.user_has_permission('equipamentos.visualizar') then
    raise exception 'Usuario sem permissao para visualizar equipamentos.';
  end if;

  v_is_solicitante := public.is_solicitante();
  v_empresa_id := public.current_empresa_id();
  v_termo := nullif(trim(coalesce(p_termo, '')), '');
  v_termo_like := case when v_termo is null then null else '%' || v_termo || '%' end;

  return query
  select
    count(*) over()::bigint as total_count,
    eq.id,
    eq.numero_cadastro::integer as numero_cadastro,
    eq.organizacao_id,
    eq.empresa_id,
    eq.tipo_equipamento_id,
    eq.tipo_texto,
    eq.fabricante,
    eq.modelo,
    eq.numero_serie,
    eq.patrimonio,
    eq.tag,
    eq.setor,
    eq.empresa_setor_id,
    eq.local_instalacao,
    eq.status,
    eq.data_aquisicao,
    eq.data_instalacao,
    eq.data_ultima_preventiva,
    eq.data_proxima_preventiva,
    eq.data_ultima_calibracao,
    eq.data_proxima_calibracao,
    eq.observacoes,
    eq.ativo,
    eq.created_at,
    eq.updated_at,
    emp.numero_cadastro::integer as empresa_numero_cadastro,
    emp.nome as empresa_nome,
    emp.nome_fantasia as empresa_nome_fantasia,
    emp.tipo_cliente as empresa_tipo_cliente,
    emp.tipo_relacao as empresa_tipo_relacao,
    emp.representante_comercial_setor as empresa_representante_comercial_setor,
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
    emp.observacoes as empresa_observacoes,
    emp.incluir_criterio_aceitacao_calibracao as empresa_incluir_criterio_aceitacao_calibracao,
    emp.ativo as empresa_ativo,
    emp.created_at as empresa_created_at,
    emp.updated_at as empresa_updated_at,
    teq.nome as tipo_equipamento_nome
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
    and (p_empresa_id is null or eq.empresa_id = p_empresa_id)
    and (nullif(trim(coalesce(p_estado, '')), '') is null or eq.status = p_estado)
    and (
      nullif(trim(coalesce(p_empresa_nome, '')), '') is null
      or emp.nome = p_empresa_nome
      or emp.nome_fantasia = p_empresa_nome
    )
    and (
      nullif(trim(coalesce(p_tipo_equipamento_nome, '')), '') is null
      or teq.nome = p_tipo_equipamento_nome
      or eq.tipo_texto = p_tipo_equipamento_nome
    )
    and (nullif(trim(coalesce(p_fabricante, '')), '') is null or eq.fabricante = p_fabricante)
    and (nullif(trim(coalesce(p_setor, '')), '') is null or eq.setor = p_setor)
    and (nullif(trim(coalesce(p_modelo, '')), '') is null or eq.modelo ilike '%' || trim(p_modelo) || '%')
    and (nullif(trim(coalesce(p_tag, '')), '') is null or eq.tag ilike '%' || trim(p_tag) || '%')
    and (nullif(trim(coalesce(p_serie, '')), '') is null or eq.numero_serie ilike '%' || trim(p_serie) || '%')
    and (nullif(trim(coalesce(p_patrimonio, '')), '') is null or eq.patrimonio ilike '%' || trim(p_patrimonio) || '%')
    and (
      v_termo is null
      or eq.tipo_texto ilike v_termo_like
      or eq.fabricante ilike v_termo_like
      or eq.modelo ilike v_termo_like
      or eq.numero_serie ilike v_termo_like
      or eq.patrimonio ilike v_termo_like
      or eq.tag ilike v_termo_like
      or eq.setor ilike v_termo_like
      or teq.nome ilike v_termo_like
      or emp.nome ilike v_termo_like
      or emp.nome_fantasia ilike v_termo_like
      or emp.cpf_cnpj ilike v_termo_like
    )
  order by
    case when p_sort_by = 'numero_cadastro' and p_ascending then eq.numero_cadastro end asc nulls last,
    case when p_sort_by = 'numero_cadastro' and not p_ascending then eq.numero_cadastro end desc nulls last,
    case when p_sort_by = 'status' and p_ascending then eq.status end asc nulls last,
    case when p_sort_by = 'status' and not p_ascending then eq.status end desc nulls last,
    case when p_sort_by = 'modelo' and p_ascending then eq.modelo end asc nulls last,
    case when p_sort_by = 'modelo' and not p_ascending then eq.modelo end desc nulls last,
    case when p_sort_by = 'fabricante' and p_ascending then eq.fabricante end asc nulls last,
    case when p_sort_by = 'fabricante' and not p_ascending then eq.fabricante end desc nulls last,
    case when p_sort_by = 'tag' and p_ascending then eq.tag end asc nulls last,
    case when p_sort_by = 'tag' and not p_ascending then eq.tag end desc nulls last,
    case when p_sort_by = 'numero_serie' and p_ascending then eq.numero_serie end asc nulls last,
    case when p_sort_by = 'numero_serie' and not p_ascending then eq.numero_serie end desc nulls last,
    case when p_sort_by = 'patrimonio' and p_ascending then eq.patrimonio end asc nulls last,
    case when p_sort_by = 'patrimonio' and not p_ascending then eq.patrimonio end desc nulls last,
    case when p_sort_by = 'setor' and p_ascending then eq.setor end asc nulls last,
    case when p_sort_by = 'setor' and not p_ascending then eq.setor end desc nulls last,
    case when p_sort_by = 'created_at' and p_ascending then eq.created_at end asc nulls last,
    case when p_sort_by = 'created_at' and not p_ascending then eq.created_at end desc nulls last,
    eq.numero_cadastro desc nulls last,
    eq.created_at desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 25), 1), 150);
end;
$$;

alter function public.listar_equipamentos_resumo(
  text, text, uuid, text, text, text, text, text, text, text, text, text, integer, integer, text, boolean
) owner to postgres;

revoke all on function public.listar_equipamentos_resumo(
  text, text, uuid, text, text, text, text, text, text, text, text, text, integer, integer, text, boolean
) from public;

grant execute on function public.listar_equipamentos_resumo(
  text, text, uuid, text, text, text, text, text, text, text, text, text, integer, integer, text, boolean
) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 086_rpc_equipamentos_listagem_total.sql

-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 104_rpc_orcamentos_listagem_rapida.sql
-- Objetivo:
-- - Paginar e filtrar orcamentos no banco
-- - Retornar contagens por status sem carregar todos os registros
-- - Preservar as opcoes dos filtros da listagem
-- ============================================================

create or replace function public.listar_orcamentos_resumo(
  p_termo text default null,
  p_status text default null,
  p_tipo text default null,
  p_cliente_nome text default null,
  p_forma_pagamento text default null,
  p_modo_pagamento text default null,
  p_frete text default null,
  p_orcamentista text default null,
  p_data_inicio date default null,
  p_data_fim date default null,
  p_valor_minimo numeric default null,
  p_valor_maximo numeric default null,
  p_origem text default null,
  p_offset integer default 0,
  p_limit integer default 25,
  p_sort_by text default 'data',
  p_ascending boolean default false
)
returns jsonb
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
  v_result jsonb;
begin
  v_org_id := public.current_organizacao_id();

  if v_org_id is null then
    raise exception 'Organizacao nao identificada.';
  end if;

  if not public.user_has_permission('orcamentos.visualizar') then
    raise exception 'Usuario sem permissao para visualizar orcamentos.';
  end if;

  v_is_solicitante := public.is_solicitante();
  v_empresa_id := public.current_empresa_id();
  v_termo := nullif(trim(coalesce(p_termo, '')), '');
  v_termo_like := case
    when v_termo is null then null
    else '%' || v_termo || '%'
  end;

  with base as materialized (
    select
      o.id,
      o.numero,
      o.identificador,
      o.empresa_id,
      o.equipamento_id,
      o.ordem_servico_id,
      o.data_orcamento,
      o.data_validade,
      o.status,
      o.tipo_orcamento,
      o.origem,
      o.forma_pagamento,
      o.modo_pagamento,
      o.valor_pecas,
      o.valor_servicos,
      o.valor_total,
      o.frete,
      o.responsavel_orcamentista,
      o.created_at,
      coalesce(emp.nome, emp.nome_fantasia, '') as empresa_nome_filtro,
      coalesce(o.identificador, teq.nome, eq.tipo_texto, '') as equipamento_nome_filtro,
      coalesce(os.numero, '') as os_numero_filtro
    from public.orcamentos o
    left join public.empresas emp on emp.id = o.empresa_id
    left join public.equipamentos eq on eq.id = o.equipamento_id
    left join public.tipos_equipamento teq on teq.id = eq.tipo_equipamento_id
    left join public.ordens_servico os on os.id = o.ordem_servico_id
    where o.organizacao_id = v_org_id
      and o.ativo = true
      and (not v_is_solicitante or o.empresa_id = v_empresa_id)
  ),
  filtered_without_status as materialized (
    select *
    from base b
    where (
      v_termo is null
      or b.numero ilike v_termo_like
      or b.identificador ilike v_termo_like
      or b.empresa_nome_filtro ilike v_termo_like
      or b.os_numero_filtro ilike v_termo_like
      or b.tipo_orcamento ilike v_termo_like
      or b.status ilike v_termo_like
      or b.equipamento_nome_filtro ilike v_termo_like
    )
      and (nullif(trim(coalesce(p_tipo, '')), '') is null or b.tipo_orcamento = p_tipo)
      and (nullif(trim(coalesce(p_cliente_nome, '')), '') is null or b.empresa_nome_filtro = p_cliente_nome)
      and (nullif(trim(coalesce(p_forma_pagamento, '')), '') is null or b.forma_pagamento = p_forma_pagamento)
      and (nullif(trim(coalesce(p_modo_pagamento, '')), '') is null or b.modo_pagamento = p_modo_pagamento)
      and (nullif(trim(coalesce(p_frete, '')), '') is null or b.frete = p_frete)
      and (nullif(trim(coalesce(p_orcamentista, '')), '') is null or b.responsavel_orcamentista = p_orcamentista)
      and (p_data_inicio is null or b.data_orcamento::date >= p_data_inicio)
      and (p_data_fim is null or b.data_orcamento::date <= p_data_fim)
      and (p_valor_minimo is null or b.valor_total >= p_valor_minimo)
      and (p_valor_maximo is null or b.valor_total <= p_valor_maximo)
      and (
        nullif(trim(coalesce(p_origem, '')), '') is null
        or (p_origem = 'com_os' and b.ordem_servico_id is not null)
        or (p_origem = 'avulso' and (b.ordem_servico_id is null or b.origem = 'avulso'))
      )
  ),
  filtered as materialized (
    select *
    from filtered_without_status f
    where nullif(trim(coalesce(p_status, '')), '') is null
       or f.status = p_status
  ),
  paged as (
    select *
    from filtered f
    order by
      case when p_sort_by = 'numero' and p_ascending then nullif(regexp_replace(f.numero, '\D', '', 'g'), '')::numeric end asc nulls last,
      case when p_sort_by = 'numero' and not p_ascending then nullif(regexp_replace(f.numero, '\D', '', 'g'), '')::numeric end desc nulls last,
      case when p_sort_by = 'data' and p_ascending then f.data_orcamento end asc nulls last,
      case when p_sort_by = 'data' and not p_ascending then f.data_orcamento end desc nulls last,
      case when p_sort_by = 'cliente' and p_ascending then f.empresa_nome_filtro end asc nulls last,
      case when p_sort_by = 'cliente' and not p_ascending then f.empresa_nome_filtro end desc nulls last,
      case when p_sort_by = 'equipamento' and p_ascending then f.equipamento_nome_filtro end asc nulls last,
      case when p_sort_by = 'equipamento' and not p_ascending then f.equipamento_nome_filtro end desc nulls last,
      case when p_sort_by = 'status' and p_ascending then f.status end asc nulls last,
      case when p_sort_by = 'status' and not p_ascending then f.status end desc nulls last,
      case when p_sort_by = 'tipo' and p_ascending then f.tipo_orcamento end asc nulls last,
      case when p_sort_by = 'tipo' and not p_ascending then f.tipo_orcamento end desc nulls last,
      case when p_sort_by = 'origem' and p_ascending then f.origem end asc nulls last,
      case when p_sort_by = 'origem' and not p_ascending then f.origem end desc nulls last,
      case when p_sort_by = 'os' and p_ascending then nullif(regexp_replace(f.os_numero_filtro, '\D', '', 'g'), '')::numeric end asc nulls last,
      case when p_sort_by = 'os' and not p_ascending then nullif(regexp_replace(f.os_numero_filtro, '\D', '', 'g'), '')::numeric end desc nulls last,
      case when p_sort_by = 'valor_pecas' and p_ascending then f.valor_pecas end asc nulls last,
      case when p_sort_by = 'valor_pecas' and not p_ascending then f.valor_pecas end desc nulls last,
      case when p_sort_by = 'valor_servicos' and p_ascending then f.valor_servicos end asc nulls last,
      case when p_sort_by = 'valor_servicos' and not p_ascending then f.valor_servicos end desc nulls last,
      case when p_sort_by = 'valor_total' and p_ascending then f.valor_total end asc nulls last,
      case when p_sort_by = 'valor_total' and not p_ascending then f.valor_total end desc nulls last,
      case when p_sort_by = 'forma_pagamento' and p_ascending then f.forma_pagamento end asc nulls last,
      case when p_sort_by = 'forma_pagamento' and not p_ascending then f.forma_pagamento end desc nulls last,
      case when p_sort_by = 'orcamentista' and p_ascending then f.responsavel_orcamentista end asc nulls last,
      case when p_sort_by = 'orcamentista' and not p_ascending then f.responsavel_orcamentista end desc nulls last,
      case when p_sort_by = 'validade' and p_ascending then f.data_validade end asc nulls last,
      case when p_sort_by = 'validade' and not p_ascending then f.data_validade end desc nulls last,
      f.data_orcamento desc nulls last,
      f.created_at desc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 25), 1), 150)
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'empresa', case when emp.id is null then null else jsonb_build_object(
            'id', emp.id,
            'nome', emp.nome,
            'nome_fantasia', emp.nome_fantasia,
            'cpf_cnpj', emp.cpf_cnpj,
            'cep', emp.cep,
            'rua', emp.rua,
            'numero', emp.numero,
            'complemento', emp.complemento,
            'bairro', emp.bairro,
            'cidade', emp.cidade,
            'estado', emp.estado,
            'contato', emp.contato,
            'email', emp.email,
            'celular', emp.celular,
            'telefone', emp.telefone,
            'ativo', emp.ativo
          ) end,
          'equipamento', case when eq.id is null then null else jsonb_build_object(
            'id', eq.id,
            'tipo_texto', eq.tipo_texto,
            'fabricante', eq.fabricante,
            'modelo', eq.modelo,
            'numero_serie', eq.numero_serie,
            'patrimonio', eq.patrimonio,
            'tag', eq.tag,
            'setor', eq.setor,
            'ativo', eq.ativo,
            'tipo_equipamento', case when teq.id is null then null else jsonb_build_object(
              'id', teq.id,
              'nome', teq.nome
            ) end
          ) end,
          'ordem_servico', case when os.id is null then null else jsonb_build_object(
            'id', os.id,
            'numero', os.numero,
            'status_sistema', os.status_sistema,
            'ativo', os.ativo
          ) end
        )
      )
      from paged p
      join public.orcamentos o on o.id = p.id
      left join public.empresas emp on emp.id = o.empresa_id
      left join public.equipamentos eq on eq.id = o.equipamento_id
      left join public.tipos_equipamento teq on teq.id = eq.tipo_equipamento_id
      left join public.ordens_servico os on os.id = o.ordem_servico_id
    ), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'status_counts', coalesce((
      select jsonb_object_agg(c.status, c.quantidade)
      from (
        select status, count(*) as quantidade
        from filtered_without_status
        group by status
      ) c
    ), '{}'::jsonb),
    'filter_options', jsonb_build_object(
      'clientes', coalesce((
        select jsonb_agg(q.valor order by q.valor)
        from (select distinct empresa_nome_filtro as valor from base where empresa_nome_filtro <> '') q
      ), '[]'::jsonb),
      'formas_pagamento', coalesce((
        select jsonb_agg(q.valor order by q.valor)
        from (select distinct forma_pagamento as valor from base where nullif(forma_pagamento, '') is not null) q
      ), '[]'::jsonb),
      'modos_pagamento', coalesce((
        select jsonb_agg(q.valor order by q.valor)
        from (select distinct modo_pagamento as valor from base where nullif(modo_pagamento, '') is not null) q
      ), '[]'::jsonb),
      'fretes', coalesce((
        select jsonb_agg(q.valor order by q.valor)
        from (select distinct frete as valor from base where nullif(frete, '') is not null) q
      ), '[]'::jsonb),
      'orcamentistas', coalesce((
        select jsonb_agg(q.valor order by q.valor)
        from (select distinct responsavel_orcamentista as valor from base where nullif(responsavel_orcamentista, '') is not null) q
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

alter function public.listar_orcamentos_resumo(
  text, text, text, text, text, text, text, text,
  date, date, numeric, numeric, text, integer, integer, text, boolean
) owner to postgres;

revoke all on function public.listar_orcamentos_resumo(
  text, text, text, text, text, text, text, text,
  date, date, numeric, numeric, text, integer, integer, text, boolean
) from public;

grant execute on function public.listar_orcamentos_resumo(
  text, text, text, text, text, text, text, text,
  date, date, numeric, numeric, text, integer, integer, text, boolean
) to authenticated;

create index if not exists idx_orcamentos_listagem_status_data
  on public.orcamentos (organizacao_id, status, data_orcamento desc, created_at desc)
  where ativo = true;

create index if not exists idx_orcamentos_listagem_empresa
  on public.orcamentos (organizacao_id, empresa_id, status)
  where ativo = true;

notify pgrst, 'reload schema';

-- Fim da migration 104_rpc_orcamentos_listagem_rapida.sql

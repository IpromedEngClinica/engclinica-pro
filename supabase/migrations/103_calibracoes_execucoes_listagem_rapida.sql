-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 103_calibracoes_execucoes_listagem_rapida.sql
-- Objetivo:
-- - Listar certificados de calibracao sem carregar tabelas e leituras
-- - Aplicar busca, filtros, ordenacao e paginacao no banco
-- ============================================================

create index if not exists idx_calibracao_execucoes_listagem_ativa
on public.calibracao_execucoes (
  organizacao_id,
  numero_certificado desc
)
where ativo = true;

create index if not exists idx_calibracao_execucoes_listagem_data
on public.calibracao_execucoes (
  organizacao_id,
  data_calibracao desc
)
where ativo = true;

create or replace function public.listar_calibracoes_execucoes_resumo(
  p_termo text default null,
  p_empresa_id uuid default null,
  p_tipo_equipamento_id uuid default null,
  p_resultado text default null,
  p_data_de date default null,
  p_data_ate date default null,
  p_validade_de date default null,
  p_validade_ate date default null,
  p_offset integer default 0,
  p_limit integer default 25,
  p_sort_by text default 'numero_certificado',
  p_ascending boolean default false
)
returns table (
  item jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtradas as (
    select
      ce.*,
      emp.nome as empresa_nome,
      emp.nome_fantasia as empresa_nome_fantasia,
      eq.numero_cadastro as equipamento_numero_cadastro,
      eq.tipo_equipamento_id,
      eq.tipo_texto,
      eq.fabricante,
      eq.modelo,
      eq.numero_serie,
      eq.patrimonio,
      eq.tag,
      eq.setor,
      eq.status as equipamento_status,
      te.nome as tipo_equipamento_nome,
      count(*) over() as quantidade_total
    from public.calibracao_execucoes ce
    join public.empresas emp on emp.id = ce.empresa_id
    join public.equipamentos eq on eq.id = ce.equipamento_id
    left join public.tipos_equipamento te on te.id = eq.tipo_equipamento_id
    where ce.organizacao_id = public.current_organizacao_id()
      and ce.ativo = true
      and (p_empresa_id is null or ce.empresa_id = p_empresa_id)
      and (p_tipo_equipamento_id is null or eq.tipo_equipamento_id = p_tipo_equipamento_id)
      and (p_resultado is null or ce.resultado_geral = p_resultado)
      and (p_data_de is null or ce.data_calibracao >= p_data_de)
      and (p_data_ate is null or ce.data_calibracao <= p_data_ate)
      and (
        p_validade_de is null
        or date_trunc('month', coalesce(ce.data_validade, ce.validade_mes))::date >= p_validade_de
      )
      and (
        p_validade_ate is null
        or date_trunc('month', coalesce(ce.data_validade, ce.validade_mes))::date <= p_validade_ate
      )
      and (
        nullif(trim(p_termo), '') is null
        or ce.numero_certificado::text ilike '%' || trim(p_termo) || '%'
        or coalesce(emp.nome, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(emp.nome_fantasia, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(te.nome, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(eq.tipo_texto, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(eq.fabricante, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(eq.modelo, '') ilike '%' || trim(p_termo) || '%'
        or coalesce(eq.numero_serie, '') ilike '%' || trim(p_termo) || '%'
      )
  ), ordenadas as (
    select *
    from filtradas f
    order by
      case when p_sort_by = 'numero_certificado' and p_ascending then f.numero_certificado end asc,
      case when p_sort_by = 'numero_certificado' and not p_ascending then f.numero_certificado end desc,
      case when p_sort_by = 'cliente' and p_ascending then lower(f.empresa_nome) end asc,
      case when p_sort_by = 'cliente' and not p_ascending then lower(f.empresa_nome) end desc,
      case when p_sort_by = 'equipamento' and p_ascending then lower(coalesce(f.tipo_equipamento_nome, f.tipo_texto, '')) end asc,
      case when p_sort_by = 'equipamento' and not p_ascending then lower(coalesce(f.tipo_equipamento_nome, f.tipo_texto, '')) end desc,
      case when p_sort_by = 'data_calibracao' and p_ascending then f.data_calibracao end asc,
      case when p_sort_by = 'data_calibracao' and not p_ascending then f.data_calibracao end desc,
      case when p_sort_by = 'vencimento' and p_ascending then coalesce(f.data_validade, f.validade_mes) end asc nulls last,
      case when p_sort_by = 'vencimento' and not p_ascending then coalesce(f.data_validade, f.validade_mes) end desc nulls last,
      f.numero_certificado desc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 25), 1), 150)
  )
  select
    jsonb_build_object(
      'id', o.id,
      'organizacao_id', o.organizacao_id,
      'numero_certificado', o.numero_certificado,
      'empresa_id', o.empresa_id,
      'equipamento_id', o.equipamento_id,
      'procedimento_id', o.procedimento_id,
      'procedimento_nome_snapshot', o.procedimento_nome_snapshot,
      'procedimento_versao_snapshot', o.procedimento_versao_snapshot,
      'data_calibracao', o.data_calibracao,
      'data_emissao', o.data_emissao,
      'data_validade', o.data_validade,
      'validade_mes', o.validade_mes,
      'validade_meses', o.validade_meses,
      'status', o.status,
      'numero_revisao', o.numero_revisao,
      'resultado_geral', o.resultado_geral,
      'pdf_storage_path', o.pdf_storage_path,
      'pdf_hash', o.pdf_hash,
      'fechado_em', o.fechado_em,
      'ativo', o.ativo,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'empresa', jsonb_build_object(
        'id', o.empresa_id,
        'nome', o.empresa_nome,
        'nome_fantasia', o.empresa_nome_fantasia
      ),
      'equipamento', jsonb_build_object(
        'id', o.equipamento_id,
        'numero_cadastro', o.equipamento_numero_cadastro,
        'empresa_id', o.empresa_id,
        'tipo_equipamento_id', o.tipo_equipamento_id,
        'tipo_texto', o.tipo_texto,
        'fabricante', o.fabricante,
        'modelo', o.modelo,
        'numero_serie', o.numero_serie,
        'patrimonio', o.patrimonio,
        'tag', o.tag,
        'setor', o.setor,
        'status', o.equipamento_status,
        'tipo_equipamento', case
          when o.tipo_equipamento_id is null then null
          else jsonb_build_object(
            'id', o.tipo_equipamento_id,
            'nome', o.tipo_equipamento_nome
          )
        end
      )
    ) as item,
    o.quantidade_total as total_count
  from ordenadas o;
$$;

create or replace function public.listar_calibracoes_execucoes_filtros()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome)
      from (
        select distinct emp.id, emp.nome
        from public.calibracao_execucoes ce
        join public.empresas emp on emp.id = ce.empresa_id
        where ce.organizacao_id = public.current_organizacao_id()
          and ce.ativo = true
      ) x
    ), '[]'::jsonb),
    'tipos_equipamento', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome)
      from (
        select distinct te.id, te.nome
        from public.calibracao_execucoes ce
        join public.equipamentos eq on eq.id = ce.equipamento_id
        join public.tipos_equipamento te on te.id = eq.tipo_equipamento_id
        where ce.organizacao_id = public.current_organizacao_id()
          and ce.ativo = true
      ) x
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.listar_calibracoes_execucoes_resumo(
  text, uuid, uuid, text, date, date, date, date, integer, integer, text, boolean
) to authenticated;

grant execute on function public.listar_calibracoes_execucoes_filtros()
to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 103_calibracoes_execucoes_listagem_rapida.sql

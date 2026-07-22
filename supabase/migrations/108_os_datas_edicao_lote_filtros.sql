-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 108_os_datas_edicao_lote_filtros.sql
-- Objetivo:
-- - Permitir editar abertura e fechamento de varias OS
-- - Filtrar a listagem por intervalos de abertura e fechamento
-- ============================================================

create or replace function public.atualizar_ordens_servico_em_lote(
  p_ordens_ids uuid[],
  p_campos jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizacao_id uuid := public.current_organizacao_id();
  v_usuario_id uuid := auth.uid();
  v_ids uuid[];
  v_quantidade integer;
  v_estado public.estados_os%rowtype;
  v_tipo public.tipos_os%rowtype;
  v_tecnico public.usuarios%rowtype;
  v_data_abertura timestamptz;
  v_data_fechamento timestamptz;
  v_campos_descricao text;
begin
  if coalesce(public.current_user_perfil(), '') not in ('admin', 'gestor', 'tecnico') then
    raise exception 'Usuario sem permissao para editar Ordens de Servico em lote.';
  end if;

  if v_organizacao_id is null then
    raise exception 'Organizacao do usuario nao identificada.';
  end if;

  select array_agg(distinct id)
  into v_ids
  from unnest(coalesce(p_ordens_ids, array[]::uuid[])) as selecionadas(id);

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'Selecione ao menos uma Ordem de Servico.';
  end if;

  if cardinality(v_ids) > 500 then
    raise exception 'A edicao em lote permite no maximo 500 Ordens de Servico por vez.';
  end if;

  if p_campos is null or jsonb_typeof(p_campos) <> 'object' or p_campos = '{}'::jsonb then
    raise exception 'Selecione ao menos um campo para alterar.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_campos) as campo(nome)
    where campo.nome not in (
      'estado_os_id',
      'tipo_os_id',
      'tecnico_responsavel_id',
      'responsavel_texto',
      'problema_relatado',
      'origem_problema',
      'descricao_servico',
      'observacoes',
      'prioridade',
      'data_abertura',
      'data_fechamento'
    )
  ) then
    raise exception 'A edicao em lote recebeu um campo nao permitido.';
  end if;

  select count(*)
  into v_quantidade
  from public.ordens_servico os
  where os.id = any(v_ids)
    and os.organizacao_id = v_organizacao_id
    and os.ativo = true
    and os.oculta_operacao = false;

  if v_quantidade <> cardinality(v_ids) then
    raise exception 'Uma ou mais Ordens de Servico nao existem, estao ocultas ou nao pertencem a organizacao atual.';
  end if;

  if p_campos ? 'estado_os_id' then
    select *
    into v_estado
    from public.estados_os
    where id = nullif(p_campos ->> 'estado_os_id', '')::uuid
      and organizacao_id = v_organizacao_id
      and ativo = true;

    if not found then
      raise exception 'Estado de OS invalido ou inativo.';
    end if;
  end if;

  if p_campos ? 'tipo_os_id' then
    select *
    into v_tipo
    from public.tipos_os
    where id = nullif(p_campos ->> 'tipo_os_id', '')::uuid
      and organizacao_id = v_organizacao_id
      and ativo = true;

    if not found then
      raise exception 'Tipo de servico invalido ou inativo.';
    end if;
  end if;

  if p_campos ? 'tecnico_responsavel_id' then
    select *
    into v_tecnico
    from public.usuarios
    where id = nullif(p_campos ->> 'tecnico_responsavel_id', '')::uuid
      and organizacao_id = v_organizacao_id
      and ativo = true
      and perfil in ('admin', 'gestor', 'tecnico');

    if not found then
      raise exception 'Tecnico executor invalido ou inativo.';
    end if;
  end if;

  if p_campos ? 'prioridade'
    and (p_campos ->> 'prioridade') not in ('baixa', 'normal', 'alta', 'urgente') then
    raise exception 'Prioridade invalida.';
  end if;

  if p_campos ? 'data_abertura' then
    if nullif(p_campos ->> 'data_abertura', '') is null then
      raise exception 'Data e hora de abertura invalidas.';
    end if;
    v_data_abertura := (p_campos ->> 'data_abertura')::timestamptz;
  end if;

  if p_campos ? 'data_fechamento' then
    if nullif(p_campos ->> 'data_fechamento', '') is null then
      raise exception 'Data e hora de fechamento invalidas.';
    end if;
    v_data_fechamento := (p_campos ->> 'data_fechamento')::timestamptz;
  end if;

  if exists (
    select 1
    from public.ordens_servico os
    where os.id = any(v_ids)
      and (
        case
          when p_campos ? 'data_fechamento' then v_data_fechamento
          when p_campos ? 'estado_os_id' and (v_estado.finaliza_os or v_estado.cancela_os)
            then coalesce(os.data_fechamento, now())
          when p_campos ? 'estado_os_id' then null
          else os.data_fechamento
        end
      ) < (
        case
          when p_campos ? 'data_abertura' then v_data_abertura
          else os.data_abertura
        end
      )
  ) then
    raise exception 'A data de fechamento nao pode ser anterior a data de abertura.';
  end if;

  v_campos_descricao := array_to_string(
    array_remove(
      array[
        case when p_campos ? 'estado_os_id' then 'estado' end,
        case when p_campos ? 'tipo_os_id' then 'tipo de servico' end,
        case when p_campos ? 'tecnico_responsavel_id' then 'tecnico executor' end,
        case when p_campos ? 'prioridade' then 'prioridade' end,
        case when p_campos ? 'data_abertura' then 'data de abertura' end,
        case when p_campos ? 'data_fechamento' then 'data de fechamento' end,
        case when p_campos ? 'problema_relatado' then 'problema relatado' end,
        case when p_campos ? 'origem_problema' then 'origem do problema' end,
        case when p_campos ? 'descricao_servico' then 'descricao do servico' end,
        case when p_campos ? 'observacoes' then 'observacoes' end
      ],
      null
    ),
    ', '
  );

  with alvos as materialized (
    select os.id, os.estado_os_id as estado_anterior_id
    from public.ordens_servico os
    where os.id = any(v_ids)
      and os.organizacao_id = v_organizacao_id
      and os.ativo = true
      and os.oculta_operacao = false
    for update
  ),
  atualizadas as (
    update public.ordens_servico os
    set
      estado_os_id = case when p_campos ? 'estado_os_id' then v_estado.id else os.estado_os_id end,
      tipo_os_id = case when p_campos ? 'tipo_os_id' then v_tipo.id else os.tipo_os_id end,
      tecnico_responsavel_id = case
        when p_campos ? 'tecnico_responsavel_id' then v_tecnico.id
        else os.tecnico_responsavel_id
      end,
      responsavel_texto = case
        when p_campos ? 'responsavel_texto' then nullif(p_campos ->> 'responsavel_texto', '')
        else os.responsavel_texto
      end,
      problema_relatado = case
        when p_campos ? 'problema_relatado' then nullif(p_campos ->> 'problema_relatado', '')
        else os.problema_relatado
      end,
      origem_problema = case
        when p_campos ? 'origem_problema' then nullif(p_campos ->> 'origem_problema', '')
        else os.origem_problema
      end,
      descricao_servico = case
        when p_campos ? 'descricao_servico' then nullif(p_campos ->> 'descricao_servico', '')
        else os.descricao_servico
      end,
      observacoes = case
        when p_campos ? 'observacoes' then nullif(p_campos ->> 'observacoes', '')
        else os.observacoes
      end,
      prioridade = case when p_campos ? 'prioridade' then p_campos ->> 'prioridade' else os.prioridade end,
      data_abertura = case when p_campos ? 'data_abertura' then v_data_abertura else os.data_abertura end,
      status_sistema = case
        when not (p_campos ? 'estado_os_id') then os.status_sistema
        when v_estado.finaliza_os then 'fechada'
        when v_estado.cancela_os then 'cancelada'
        else 'aberta'
      end,
      data_fechamento = case
        when p_campos ? 'data_fechamento' then v_data_fechamento
        when not (p_campos ? 'estado_os_id') then os.data_fechamento
        when v_estado.finaliza_os or v_estado.cancela_os then coalesce(os.data_fechamento, now())
        else null
      end,
      updated_by = v_usuario_id,
      updated_at = now()
    from alvos
    where os.id = alvos.id
    returning os.id, alvos.estado_anterior_id, os.estado_os_id as estado_novo_id
  )
  insert into public.ordem_servico_historico (
    ordem_servico_id, usuario_id, estado_anterior_id, estado_novo_id, acao, observacao
  )
  select
    atualizadas.id,
    v_usuario_id,
    atualizadas.estado_anterior_id,
    atualizadas.estado_novo_id,
    'edicao_lote',
    'Edicao rapida em lote. Campos alterados: ' || v_campos_descricao || '.'
  from atualizadas;

  get diagnostics v_quantidade = row_count;
  return v_quantidade;
end;
$$;

alter function public.atualizar_ordens_servico_em_lote(uuid[], jsonb) owner to postgres;
revoke all on function public.atualizar_ordens_servico_em_lote(uuid[], jsonb) from public;
grant execute on function public.atualizar_ordens_servico_em_lote(uuid[], jsonb) to authenticated;

drop function if exists public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean
);

create function public.listar_ordens_servico_resumo(
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
  p_ascending boolean default false,
  p_data_abertura_de timestamptz default null,
  p_data_abertura_ate timestamptz default null,
  p_data_fechamento_de timestamptz default null,
  p_data_fechamento_ate timestamptz default null
)
returns table (
  total_count bigint,
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
    count(*) over()::bigint,
    os.id, os.organizacao_id, os.numero, os.empresa_id, os.equipamento_id,
    os.tipo_os_id, os.estado_os_id, os.tecnico_responsavel_id,
    os.solicitante_texto, os.responsavel_texto, os.data_abertura,
    os.data_fechamento, os.problema_relatado, os.origem_problema,
    os.prioridade, os.status_sistema, os.plano_ciclo_id, os.ativo,
    os.created_at, os.updated_at,
    emp.nome, emp.nome_fantasia, emp.cpf_cnpj, emp.cep, emp.rua, emp.numero,
    emp.complemento, emp.bairro, emp.cidade, emp.estado, emp.contato,
    emp.email, emp.celular, emp.telefone, emp.ativo,
    eq.organizacao_id, eq.empresa_id, eq.tipo_equipamento_id, eq.tipo_texto,
    eq.fabricante, eq.modelo, eq.numero_serie, eq.patrimonio, eq.tag, eq.setor,
    eq.status, eq.ativo, teq.nome, tos.nome, eos.nome, eos.finaliza_os,
    eos.cancela_os
  from public.ordens_servico os
  left join public.empresas emp on emp.id = os.empresa_id
  left join public.equipamentos eq on eq.id = os.equipamento_id
  left join public.tipos_equipamento teq on teq.id = eq.tipo_equipamento_id
  left join public.tipos_os tos on tos.id = os.tipo_os_id
  left join public.estados_os eos on eos.id = os.estado_os_id
  where os.organizacao_id = v_org_id
    and os.ativo = true
    and os.oculta_operacao = false
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
    and (p_data_abertura_de is null or os.data_abertura >= p_data_abertura_de)
    and (p_data_abertura_ate is null or os.data_abertura < p_data_abertura_ate)
    and (p_data_fechamento_de is null or os.data_fechamento >= p_data_fechamento_de)
    and (p_data_fechamento_ate is null or os.data_fechamento < p_data_fechamento_ate)
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
  limit least(greatest(coalesce(p_limit, 25), 1), 150);
end;
$$;

alter function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean,
  timestamptz, timestamptz, timestamptz, timestamptz
) owner to postgres;

revoke all on function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean,
  timestamptz, timestamptz, timestamptz, timestamptz
) from public;

grant execute on function public.listar_ordens_servico_resumo(
  text, boolean, text, text, text, text, text, integer, integer, text, boolean,
  timestamptz, timestamptz, timestamptz, timestamptz
) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 108_os_datas_edicao_lote_filtros.sql

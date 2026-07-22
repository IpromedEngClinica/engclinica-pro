-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 107_edicao_rapida_ordens_servico_lote.sql
-- Objetivo:
-- - Atualizar campos selecionados de varias OS em uma transacao
-- - Preservar campos nao selecionados
-- - Registrar historico individual e manter status operacional coerente
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
      'prioridade'
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

  v_campos_descricao := array_to_string(
    array_remove(
      array[
        case when p_campos ? 'estado_os_id' then 'estado' end,
        case when p_campos ? 'tipo_os_id' then 'tipo de servico' end,
        case when p_campos ? 'tecnico_responsavel_id' then 'tecnico executor' end,
        case when p_campos ? 'prioridade' then 'prioridade' end,
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
    select
      os.id,
      os.estado_os_id as estado_anterior_id
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
      estado_os_id = case
        when p_campos ? 'estado_os_id' then v_estado.id
        else os.estado_os_id
      end,
      tipo_os_id = case
        when p_campos ? 'tipo_os_id' then v_tipo.id
        else os.tipo_os_id
      end,
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
      prioridade = case
        when p_campos ? 'prioridade' then p_campos ->> 'prioridade'
        else os.prioridade
      end,
      status_sistema = case
        when not (p_campos ? 'estado_os_id') then os.status_sistema
        when v_estado.finaliza_os then 'fechada'
        when v_estado.cancela_os then 'cancelada'
        else 'aberta'
      end,
      data_fechamento = case
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
    ordem_servico_id,
    usuario_id,
    estado_anterior_id,
    estado_novo_id,
    acao,
    observacao
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

notify pgrst, 'reload schema';

-- Fim da migration 107_edicao_rapida_ordens_servico_lote.sql

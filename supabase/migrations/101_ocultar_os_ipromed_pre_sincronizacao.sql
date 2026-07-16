-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 101_ocultar_os_ipromed_pre_sincronizacao.sql
-- Objetivo:
-- - Identificar e ocultar da operacao as OS locais anteriores ao corte ArkMeds
-- - Preservar checklists, ciclos, documentos e demais vinculos historicos
-- - Liberar a numeracao oficial para permanecer fiel ao ArkMeds
-- ============================================================

alter table public.ordens_servico
  add column if not exists oculta_operacao boolean not null default false,
  add column if not exists numero_original text,
  add column if not exists motivo_ocultacao text,
  add column if not exists ocultada_em timestamptz;

comment on column public.ordens_servico.oculta_operacao is
  'Oculta a OS das consultas operacionais sem remover seus vinculos historicos.';
comment on column public.ordens_servico.numero_original is
  'Numero exibido antes de uma renomeacao administrativa.';

update public.ordens_servico
set
  numero_original = coalesce(numero_original, numero),
  numero = case
    when numero like 'IPR - %' then numero
    else 'IPR - ' || numero
  end,
  oculta_operacao = true,
  motivo_ocultacao = coalesce(
    motivo_ocultacao,
    'OS criada no Ipromed antes da sincronizacao definitiva com o ArkMeds.'
  ),
  ocultada_em = coalesce(ocultada_em, now()),
  updated_at = now()
where arkmeds_os_id is null;

create index if not exists idx_ordens_servico_operacao_visivel_numero
on public.ordens_servico (organizacao_id, numero_ordem desc)
where ativo = true and oculta_operacao = false;

create index if not exists idx_ordens_servico_operacao_visivel_equipamento
on public.ordens_servico (organizacao_id, equipamento_id, status_sistema)
where ativo = true and oculta_operacao = false;

create index if not exists idx_os_dashboard_preventiva_visivel
on public.ordens_servico (organizacao_id, equipamento_id, data_fechamento desc)
where ativo = true
  and oculta_operacao = false
  and status_sistema = 'fechada'
  and equipamento_id is not null;

-- Mantem as funcoes ja consolidadas no projeto e acrescenta somente o filtro
-- operacional. A validacao impede que uma mudanca futura passe silenciosamente.
do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.listar_ordens_servico_resumo(text,boolean,text,text,text,text,text,integer,integer,text,boolean)'::regprocedure
  ) into v_definition;

  if v_definition like '%os.oculta_operacao = false%' then
    return;
  end if;

  v_updated := replace(
    v_definition,
    'and os.ativo = true',
    E'and os.ativo = true\n    and os.oculta_operacao = false'
  );

  if v_updated = v_definition then
    raise exception 'Nao foi possivel aplicar o filtro de OS ocultas na listagem resumida.';
  end if;

  execute v_updated;
end;
$$;

do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.listar_ultimas_preventivas_equipamentos(integer)'::regprocedure
  ) into v_definition;

  if v_definition like '%os.oculta_operacao = false%' then
    return;
  end if;

  v_updated := replace(
    v_definition,
    'and os.ativo = true',
    E'and os.ativo = true\n    and os.oculta_operacao = false'
  );

  if v_updated = v_definition then
    raise exception 'Nao foi possivel aplicar o filtro de OS ocultas nas preventivas do painel.';
  end if;

  execute v_updated;
end;
$$;

do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.recalcular_status_equipamento_por_os(uuid)'::regprocedure
  ) into v_definition;

  if v_definition like '%os.oculta_operacao = false%' then
    return;
  end if;

  v_updated := replace(
    v_definition,
    'and os.ativo = true',
    E'and os.ativo = true\n          and os.oculta_operacao = false'
  );

  if v_updated = v_definition then
    raise exception 'Nao foi possivel aplicar o filtro de OS ocultas ao status dos equipamentos.';
  end if;

  execute v_updated;
end;
$$;

drop trigger if exists trg_ordens_servico_recalcular_status_equipamento_update
on public.ordens_servico;

create trigger trg_ordens_servico_recalcular_status_equipamento_update
after update of equipamento_id, tipo_os_id, status_sistema, ativo, oculta_operacao
on public.ordens_servico
for each row
execute function public.recalcular_status_equipamento_por_os_trigger();

do $$
declare
  v_equipamento_id uuid;
  v_max_arkmeds bigint;
begin
  for v_equipamento_id in
    select id from public.equipamentos where ativo = true
  loop
    perform public.recalcular_status_equipamento_por_os(v_equipamento_id);
  end loop;

  select coalesce(max(numero_ordem), 1)
  into v_max_arkmeds
  from public.ordens_servico
  where arkmeds_os_id is not null;

  perform setval('public.ordens_servico_numero_seq', v_max_arkmeds, true);
end;
$$;

notify pgrst, 'reload schema';

-- Fim da migration 101_ocultar_os_ipromed_pre_sincronizacao.sql

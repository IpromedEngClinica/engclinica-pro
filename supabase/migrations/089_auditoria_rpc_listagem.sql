-- ============================================================
-- EngClinica Pro
-- Migration: 089_auditoria_rpc_listagem.sql
-- Objetivo:
-- - Otimizar listagem da auditoria em bancos com muitos registros
-- - Evitar timeout do PostgREST com count exact + RLS na tabela auditoria_logs
-- ============================================================

create index if not exists idx_auditoria_logs_org_modulo_criado
  on public.auditoria_logs (organizacao_id, modulo, criado_em desc);

create index if not exists idx_auditoria_logs_org_acao_criado
  on public.auditoria_logs (organizacao_id, acao, criado_em desc);

create extension if not exists pg_trgm;

create index if not exists idx_auditoria_logs_search_trgm
  on public.auditoria_logs
  using gin ((
    coalesce(modulo, '') || ' ' ||
    coalesce(tabela, '') || ' ' ||
    coalesce(registro_descricao, '') || ' ' ||
    coalesce(usuario_nome_snapshot, '') || ' ' ||
    coalesce(usuario_email_snapshot, '') || ' ' ||
    coalesce(acao, '')
  ) gin_trgm_ops);

create or replace function public.listar_auditoria_logs_resumo(
  p_termo text default null,
  p_modulo text default null,
  p_acao text default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns table (
  total_count bigint,
  id uuid,
  organizacao_id uuid,
  usuario_id uuid,
  usuario_nome_snapshot text,
  usuario_email_snapshot text,
  usuario_perfil_snapshot text,
  acao text,
  modulo text,
  tabela text,
  registro_id uuid,
  registro_descricao text,
  campos_alterados text[],
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_termo text;
  v_termo_like text;
  v_total bigint;
begin
  v_org_id := public.current_organizacao_id();

  if v_org_id is null then
    raise exception 'Organizacao nao identificada.';
  end if;

  if not public.user_has_permission('auditoria.visualizar') then
    raise exception 'Usuario sem permissao para visualizar auditoria.';
  end if;

  v_termo := nullif(trim(coalesce(p_termo, '')), '');
  v_termo_like := case when v_termo is null then null else '%' || v_termo || '%' end;

  select count(*)::bigint
  into v_total
  from public.auditoria_logs log
  where log.organizacao_id = v_org_id
    and (
      nullif(trim(coalesce(p_modulo, '')), '') is null
      or p_modulo = 'todos'
      or log.modulo = p_modulo
    )
    and (
      nullif(trim(coalesce(p_acao, '')), '') is null
      or p_acao = 'todas'
      or log.acao = p_acao
    )
    and (
      v_termo is null
      or (
        coalesce(log.modulo, '') || ' ' ||
        coalesce(log.tabela, '') || ' ' ||
        coalesce(log.registro_descricao, '') || ' ' ||
        coalesce(log.usuario_nome_snapshot, '') || ' ' ||
        coalesce(log.usuario_email_snapshot, '') || ' ' ||
        coalesce(log.acao, '')
      ) ilike v_termo_like
    );

  return query
  select
    v_total as total_count,
    log.id,
    log.organizacao_id,
    log.usuario_id,
    log.usuario_nome_snapshot,
    log.usuario_email_snapshot,
    log.usuario_perfil_snapshot,
    log.acao,
    log.modulo,
    log.tabela,
    log.registro_id,
    log.registro_descricao,
    log.campos_alterados,
    log.criado_em
  from public.auditoria_logs log
  where log.organizacao_id = v_org_id
    and (
      nullif(trim(coalesce(p_modulo, '')), '') is null
      or p_modulo = 'todos'
      or log.modulo = p_modulo
    )
    and (
      nullif(trim(coalesce(p_acao, '')), '') is null
      or p_acao = 'todas'
      or log.acao = p_acao
    )
    and (
      v_termo is null
      or (
        coalesce(log.modulo, '') || ' ' ||
        coalesce(log.tabela, '') || ' ' ||
        coalesce(log.registro_descricao, '') || ' ' ||
        coalesce(log.usuario_nome_snapshot, '') || ' ' ||
        coalesce(log.usuario_email_snapshot, '') || ' ' ||
        coalesce(log.acao, '')
      ) ilike v_termo_like
    )
  order by log.criado_em desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 25), 1), 150);
end;
$$;

alter function public.listar_auditoria_logs_resumo(text, text, text, integer, integer) owner to postgres;
revoke all on function public.listar_auditoria_logs_resumo(text, text, text, integer, integer) from public;
grant execute on function public.listar_auditoria_logs_resumo(text, text, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 089_auditoria_rpc_listagem.sql

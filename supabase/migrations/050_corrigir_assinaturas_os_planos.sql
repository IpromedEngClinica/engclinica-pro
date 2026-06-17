-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 050_corrigir_assinaturas_os_planos.sql
-- Objetivo:
-- - Vincular o responsavel do plano as OS antigas e novas
-- - Substituir UUID do plano pelo titulo nas observacoes antigas
-- - Permitir localizar assinaturas por nomes abreviados
-- ============================================================

create or replace function public.normalizar_nome_assinatura(p_valor text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(coalesce(p_valor, '')),
        U&'\00e1\00e0\00e2\00e3\00e4\00e9\00e8\00ea\00eb\00ed\00ec\00ee\00ef\00f3\00f2\00f4\00f5\00f6\00fa\00f9\00fb\00fc\00e7',
        'aaaaaeeeeiiiiooooouuuuc'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

update public.ordens_servico os
set
  tecnico_responsavel_id = coalesce(os.tecnico_responsavel_id, p.responsavel_id),
  responsavel_texto = coalesce(nullif(btrim(os.responsavel_texto), ''), u.nome),
  observacoes = case
    when os.observacoes is null then null
    else regexp_replace(
      os.observacoes,
      'Plano:\s*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
      'Plano: ' || p.titulo,
      'gi'
    )
  end,
  updated_at = now()
from public.plano_ciclos pc
join public.planos p on p.id = pc.plano_id
left join public.usuarios u on u.id = p.responsavel_id
where os.plano_ciclo_id = pc.id
  and (
    os.tecnico_responsavel_id is null
    or nullif(btrim(os.responsavel_texto), '') is null
    or os.observacoes ~* 'Plano:\s*[0-9a-fA-F-]{36}'
  );

create or replace function public.resolver_assinaturas_documento(
  p_tecnico_usuario_id uuid default null,
  p_tecnico_nome text default null,
  p_responsavel_nome text default null,
  p_solicitante_nome text default null,
  p_empresa_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizacao_id uuid;
  v_tecnico public.usuarios%rowtype;
  v_responsavel public.usuarios%rowtype;
  v_solicitante public.usuarios%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  v_organizacao_id := public.current_organizacao_id();

  if p_tecnico_usuario_id is not null then
    select * into v_tecnico
    from public.usuarios
    where id = p_tecnico_usuario_id
      and organizacao_id = v_organizacao_id
      and ativo
      and assinatura_storage_path is not null;
  end if;

  if v_tecnico.id is null and nullif(btrim(p_tecnico_nome), '') is not null then
    select * into v_tecnico
    from public.usuarios u
    where u.organizacao_id = v_organizacao_id
      and u.ativo
      and u.perfil in ('admin', 'gestor', 'tecnico')
      and u.assinatura_storage_path is not null
      and not exists (
        select 1
        from unnest(regexp_split_to_array(public.normalizar_nome_assinatura(p_tecnico_nome), '\s+')) as token
        where char_length(token) > 1
          and (' ' || public.normalizar_nome_assinatura(u.nome) || ' ') not like ('% ' || token || ' %')
      )
    order by u.updated_at desc
    limit 1;
  end if;

  if nullif(btrim(p_responsavel_nome), '') is not null then
    select * into v_responsavel
    from public.usuarios u
    where u.organizacao_id = v_organizacao_id
      and u.ativo
      and u.perfil in ('admin', 'gestor', 'tecnico')
      and u.assinatura_storage_path is not null
      and not exists (
        select 1
        from unnest(regexp_split_to_array(public.normalizar_nome_assinatura(p_responsavel_nome), '\s+')) as token
        where char_length(token) > 1
          and (' ' || public.normalizar_nome_assinatura(u.nome) || ' ') not like ('% ' || token || ' %')
      )
    order by u.updated_at desc
    limit 1;
  end if;

  if p_empresa_id is not null and nullif(btrim(p_solicitante_nome), '') is not null then
    select * into v_solicitante
    from public.usuarios u
    where u.organizacao_id = v_organizacao_id
      and u.empresa_id = p_empresa_id
      and u.perfil = 'solicitante'
      and u.ativo
      and u.assinatura_storage_path is not null
      and not exists (
        select 1
        from unnest(regexp_split_to_array(public.normalizar_nome_assinatura(p_solicitante_nome), '\s+')) as token
        where char_length(token) > 1
          and (' ' || public.normalizar_nome_assinatura(u.nome) || ' ') not like ('% ' || token || ' %')
      )
    order by u.updated_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'tecnico', case when v_tecnico.id is null then null else jsonb_build_object(
      'usuarioId', v_tecnico.id,
      'nome', v_tecnico.nome,
      'storagePath', v_tecnico.assinatura_storage_path
    ) end,
    'responsavel', case when v_responsavel.id is null then null else jsonb_build_object(
      'usuarioId', v_responsavel.id,
      'nome', v_responsavel.nome,
      'storagePath', v_responsavel.assinatura_storage_path
    ) end,
    'solicitante', case when v_solicitante.id is null then null else jsonb_build_object(
      'usuarioId', v_solicitante.id,
      'nome', v_solicitante.nome,
      'storagePath', v_solicitante.assinatura_storage_path
    ) end
  );
end;
$$;

revoke all on function public.normalizar_nome_assinatura(text) from public;
revoke all on function public.resolver_assinaturas_documento(uuid, text, text, text, uuid) from public;

grant execute on function public.resolver_assinaturas_documento(uuid, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 050_corrigir_assinaturas_os_planos.sql

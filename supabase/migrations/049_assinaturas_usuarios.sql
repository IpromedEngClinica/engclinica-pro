-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 049_assinaturas_usuarios.sql
-- Objetivo:
-- - Armazenar a assinatura digitalizada de cada usuario
-- - Permitir que apenas o titular altere a propria assinatura
-- - Resolver assinaturas automaticamente para OS e certificados
-- ============================================================

alter table public.usuarios
add column if not exists assinatura_storage_path text null,
add column if not exists assinatura_atualizada_em timestamp with time zone null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assinaturas-usuarios',
  'assinaturas-usuarios',
  false,
  1048576,
  array['image/png']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "assinaturas_storage_select_mesma_organizacao" on storage.objects;
create policy "assinaturas_storage_select_mesma_organizacao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assinaturas-usuarios'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
);

drop policy if exists "assinaturas_storage_insert_propria" on storage.objects;
create policy "assinaturas_storage_insert_propria"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assinaturas-usuarios'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
  and name = public.current_organizacao_id()::text || '/' || auth.uid()::text || '/assinatura.png'
);

drop policy if exists "assinaturas_storage_update_propria" on storage.objects;
create policy "assinaturas_storage_update_propria"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'assinaturas-usuarios'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'assinaturas-usuarios'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
  and name = public.current_organizacao_id()::text || '/' || auth.uid()::text || '/assinatura.png'
);

drop policy if exists "assinaturas_storage_delete_propria" on storage.objects;
create policy "assinaturas_storage_delete_propria"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'assinaturas-usuarios'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create or replace function public.salvar_assinatura_propria(p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_organizacao_id uuid;
  v_caminho_esperado text;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  v_organizacao_id := public.current_organizacao_id();
  v_caminho_esperado := v_organizacao_id::text || '/' || auth.uid()::text || '/assinatura.png';

  if p_storage_path is distinct from v_caminho_esperado then
    raise exception 'Caminho da assinatura invalido.';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'assinaturas-usuarios'
      and name = p_storage_path
  ) then
    raise exception 'Arquivo da assinatura nao encontrado.';
  end if;

  update public.usuarios
  set
    assinatura_storage_path = p_storage_path,
    assinatura_atualizada_em = now()
  where id = auth.uid()
    and organizacao_id = v_organizacao_id;

  if not found then
    raise exception 'Usuario nao encontrado.';
  end if;
end;
$$;

create or replace function public.remover_assinatura_propria()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select assinatura_storage_path
  into v_storage_path
  from public.usuarios
  where id = auth.uid()
    and organizacao_id = public.current_organizacao_id();

  update public.usuarios
  set
    assinatura_storage_path = null,
    assinatura_atualizada_em = null
  where id = auth.uid()
    and organizacao_id = public.current_organizacao_id();

  return v_storage_path;
end;
$$;

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
    from public.usuarios
    where organizacao_id = v_organizacao_id
      and ativo
      and perfil in ('admin', 'gestor', 'tecnico')
      and assinatura_storage_path is not null
      and lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')) =
          lower(regexp_replace(btrim(p_tecnico_nome), '\s+', ' ', 'g'))
    order by updated_at desc
    limit 1;
  end if;

  if nullif(btrim(p_responsavel_nome), '') is not null then
    select * into v_responsavel
    from public.usuarios
    where organizacao_id = v_organizacao_id
      and ativo
      and perfil in ('admin', 'gestor', 'tecnico')
      and assinatura_storage_path is not null
      and lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')) =
          lower(regexp_replace(btrim(p_responsavel_nome), '\s+', ' ', 'g'))
    order by updated_at desc
    limit 1;
  end if;

  if p_empresa_id is not null and nullif(btrim(p_solicitante_nome), '') is not null then
    select * into v_solicitante
    from public.usuarios
    where organizacao_id = v_organizacao_id
      and empresa_id = p_empresa_id
      and perfil = 'solicitante'
      and ativo
      and assinatura_storage_path is not null
      and lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')) =
          lower(regexp_replace(btrim(p_solicitante_nome), '\s+', ' ', 'g'))
    order by updated_at desc
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

revoke all on function public.salvar_assinatura_propria(text) from public;
revoke all on function public.remover_assinatura_propria() from public;
revoke all on function public.resolver_assinaturas_documento(uuid, text, text, text, uuid) from public;

grant execute on function public.salvar_assinatura_propria(text) to authenticated;
grant execute on function public.remover_assinatura_propria() to authenticated;
grant execute on function public.resolver_assinaturas_documento(uuid, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 049_assinaturas_usuarios.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 045_corrigir_digest_convites.sql
-- Objetivo:
-- - Corrigir uso de pgcrypto.digest no Supabase qualificando schema extensions
-- ============================================================

create or replace function public.validar_usuario_convite(p_token text)
returns table (
  email text,
  nome text,
  perfil text,
  empresa_id uuid,
  empresa_nome text,
  expira_em timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
begin
  if p_token is null or length(trim(p_token)) < 32 then
    return;
  end if;

  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  update public.usuario_convites c
  set
    status = 'expirado',
    updated_at = now()
  where c.token_hash = v_token_hash
    and c.status = 'pendente'
    and c.expira_em < now();

  return query
  select
    c.email,
    c.nome,
    c.perfil,
    c.empresa_id,
    coalesce(e.nome_fantasia, e.nome) as empresa_nome,
    c.expira_em
  from public.usuario_convites c
  left join public.empresas e on e.id = c.empresa_id
  where c.token_hash = v_token_hash
    and c.status = 'pendente'
    and c.expira_em >= now()
  limit 1;
end;
$$;

create or replace function public.aceitar_usuario_convite(
  p_token text,
  p_nome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_convite public.usuario_convites%rowtype;
  v_auth_email text;
  v_nome text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado nao encontrado.';
  end if;

  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'Convite invalido.';
  end if;

  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  v_auth_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into v_convite
  from public.usuario_convites
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Convite nao encontrado.';
  end if;

  if v_convite.status <> 'pendente' then
    raise exception 'Convite ja utilizado ou cancelado.';
  end if;

  if v_convite.expira_em < now() then
    update public.usuario_convites
    set status = 'expirado', updated_at = now()
    where id = v_convite.id;

    raise exception 'Convite expirado.';
  end if;

  if lower(v_convite.email) <> v_auth_email then
    raise exception 'O e-mail autenticado nao corresponde ao convite.';
  end if;

  v_nome := coalesce(nullif(trim(p_nome), ''), v_convite.nome, v_convite.email);

  insert into public.usuarios (
    id,
    organizacao_id,
    empresa_id,
    nome,
    email,
    perfil,
    ativo
  )
  values (
    auth.uid(),
    v_convite.organizacao_id,
    v_convite.empresa_id,
    v_nome,
    v_convite.email,
    v_convite.perfil,
    true
  )
  on conflict (id) do update set
    organizacao_id = excluded.organizacao_id,
    empresa_id = excluded.empresa_id,
    nome = excluded.nome,
    email = excluded.email,
    perfil = excluded.perfil,
    ativo = true,
    updated_at = now();

  update public.usuario_convites
  set
    status = 'aceito',
    aceito_por = auth.uid(),
    aceito_em = now(),
    updated_at = now()
  where id = v_convite.id;
end;
$$;

grant execute on function public.validar_usuario_convite(text) to anon, authenticated;
grant execute on function public.aceitar_usuario_convite(text, text) to authenticated;

notify pgrst, 'reload schema';

-- Fim da migration 045_corrigir_digest_convites.sql

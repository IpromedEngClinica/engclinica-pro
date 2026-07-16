-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 102_usuario_convites_persistencia_gestao.sql
-- Objetivo:
-- - Permitir que administradores copiem novamente convites pendentes
-- - Manter exclusao logica para preservar o historico dos convites
-- ============================================================

alter table public.usuario_convites
  add column if not exists token_reenvio text,
  add column if not exists excluido_em timestamp with time zone,
  add column if not exists excluido_por uuid references public.usuarios(id) on delete set null;

create index if not exists idx_usuario_convites_visiveis
on public.usuario_convites (organizacao_id, created_at desc)
where excluido_em is null;

comment on column public.usuario_convites.token_reenvio is
  'Token bruto disponivel somente aos administradores pela RLS, usado para recopia do link.';

comment on column public.usuario_convites.excluido_em is
  'Exclusao logica da listagem administrativa; o registro permanece para auditoria.';

create or replace function public.limpar_token_reenvio_convite_finalizado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'pendente' then
    new.token_reenvio := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limpar_token_reenvio_convite_finalizado
on public.usuario_convites;

create trigger trg_limpar_token_reenvio_convite_finalizado
before insert or update of status on public.usuario_convites
for each row execute function public.limpar_token_reenvio_convite_finalizado();

update public.usuario_convites
set token_reenvio = null
where status <> 'pendente'
  and token_reenvio is not null;

notify pgrst, 'reload schema';

-- Fim da migration 102_usuario_convites_persistencia_gestao.sql

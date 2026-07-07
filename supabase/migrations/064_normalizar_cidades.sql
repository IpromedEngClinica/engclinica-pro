-- ============================================================
-- EngClinica Pro
-- Migration: 064_normalizar_cidades.sql
-- Objetivo:
-- - Padronizar escrita de cidades em empresas e setores
-- - Garantir normalizacao automatica em novos cadastros/edicoes
-- ============================================================

create or replace function public.normalizar_nome_cidade(p_cidade text)
returns text
language plpgsql
immutable
as $$
declare
  v_texto text;
begin
  v_texto := nullif(btrim(regexp_replace(coalesce(p_cidade, ''), '\s+', ' ', 'g')), '');

  if v_texto is null then
    return null;
  end if;

  v_texto := initcap(lower(v_texto));

  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(De)([[:space:]-]|$)', '\1de\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(Da)([[:space:]-]|$)', '\1da\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(Das)([[:space:]-]|$)', '\1das\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(Di)([[:space:]-]|$)', '\1di\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(Do)([[:space:]-]|$)', '\1do\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(Dos)([[:space:]-]|$)', '\1dos\3', 'g');
  v_texto := regexp_replace(v_texto, '(^|[[:space:]-])(E)([[:space:]-]|$)', '\1e\3', 'g');

  return btrim(v_texto);
end;
$$;

create or replace function public.trg_normalizar_cidade_empresa()
returns trigger
language plpgsql
as $$
begin
  new.cidade := public.normalizar_nome_cidade(new.cidade);
  return new;
end;
$$;

create or replace function public.trg_normalizar_cidade_empresa_setor()
returns trigger
language plpgsql
as $$
begin
  new.cidade := public.normalizar_nome_cidade(new.cidade);
  return new;
end;
$$;

drop trigger if exists trg_empresas_normalizar_cidade on public.empresas;
create trigger trg_empresas_normalizar_cidade
before insert or update of cidade on public.empresas
for each row
execute function public.trg_normalizar_cidade_empresa();

drop trigger if exists trg_empresa_setores_normalizar_cidade on public.empresa_setores;
create trigger trg_empresa_setores_normalizar_cidade
before insert or update of cidade on public.empresa_setores
for each row
execute function public.trg_normalizar_cidade_empresa_setor();

update public.empresas
set cidade = public.normalizar_nome_cidade(cidade)
where cidade is not null
  and cidade is distinct from public.normalizar_nome_cidade(cidade);

update public.empresa_setores
set cidade = public.normalizar_nome_cidade(cidade)
where cidade is not null
  and cidade is distinct from public.normalizar_nome_cidade(cidade);

notify pgrst, 'reload schema';

-- Fim da migration 064_normalizar_cidades.sql

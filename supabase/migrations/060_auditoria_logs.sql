-- ============================================================
-- EngClinica Pro
-- Migration: 060_auditoria_logs.sql
-- Objetivo:
-- - Criar ambiente de historico e rastreabilidade
-- - Registrar criacoes, alteracoes e exclusoes dos principais modulos
-- - Liberar visualizacao apenas para admin/gestor via permissao
-- ============================================================

insert into public.permissoes (chave, nome, grupo, descricao, ordem, ativo)
values (
  'auditoria.visualizar',
  'Visualizar auditoria',
  'Administracao',
  'Consultar historico de modificacoes do sistema.',
  280,
  true
)
on conflict (chave) do update set
  nome = excluded.nome,
  grupo = excluded.grupo,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  ativo = excluded.ativo,
  updated_at = now();

insert into public.perfil_permissoes (
  organizacao_id,
  perfil,
  permissao_chave,
  permitido
)
select
  o.id,
  p.perfil,
  'auditoria.visualizar',
  p.permitido
from public.organizacoes o
cross join (
  values
    ('gestor', true),
    ('tecnico', false),
    ('comercial', false),
    ('solicitante', false)
) as p(perfil, permitido)
on conflict (organizacao_id, perfil, permissao_chave) do update set
  permitido = excluded.permitido,
  updated_at = now();

create table if not exists public.auditoria_logs (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  usuario_nome_snapshot text null,
  usuario_email_snapshot text null,
  usuario_perfil_snapshot text null,
  acao text not null,
  modulo text not null,
  tabela text not null,
  registro_id uuid null,
  registro_descricao text null,
  campos_alterados text[] not null default '{}',
  dados_anteriores jsonb null,
  dados_novos jsonb null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamp with time zone not null default now(),
  constraint auditoria_logs_acao_check check (acao in ('criou', 'alterou', 'excluiu'))
);

create index if not exists idx_auditoria_logs_organizacao_criado
on public.auditoria_logs (organizacao_id, criado_em desc);

create index if not exists idx_auditoria_logs_usuario
on public.auditoria_logs (usuario_id);

create index if not exists idx_auditoria_logs_modulo
on public.auditoria_logs (modulo);

create index if not exists idx_auditoria_logs_registro
on public.auditoria_logs (tabela, registro_id);

alter table public.auditoria_logs enable row level security;

drop policy if exists "auditoria_logs_select_por_permissao" on public.auditoria_logs;
create policy "auditoria_logs_select_por_permissao"
on public.auditoria_logs
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('auditoria.visualizar')
);

create or replace function public.auditoria_registro_descricao(p_row jsonb)
returns text
language plpgsql
immutable
as $$
declare
  v_numero text;
  v_nome text;
  v_tipo text;
  v_modelo text;
begin
  v_numero := coalesce(
    nullif(p_row ->> 'numero', ''),
    nullif(p_row ->> 'codigo', ''),
    nullif(p_row ->> 'numero_certificado', ''),
    nullif(p_row ->> 'numero_os', '')
  );

  v_nome := coalesce(
    nullif(p_row ->> 'nome', ''),
    nullif(p_row ->> 'nome_fantasia', ''),
    nullif(p_row ->> 'titulo', ''),
    nullif(p_row ->> 'razao_social', '')
  );

  v_tipo := nullif(p_row ->> 'tipo_texto', '');
  v_modelo := nullif(p_row ->> 'modelo', '');

  if v_numero is not null and v_nome is not null then
    return v_numero || ' - ' || v_nome;
  end if;

  if v_nome is not null then
    return v_nome;
  end if;

  if v_numero is not null then
    return v_numero;
  end if;

  if v_tipo is not null and v_modelo is not null then
    return v_tipo || ' - ' || v_modelo;
  end if;

  if v_tipo is not null then
    return v_tipo;
  end if;

  return null;
end;
$$;

create or replace function public.auditoria_jsonb_diff_keys(
  p_old jsonb,
  p_new jsonb
)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key order by key), '{}'::text[])
  from (
    select key
    from (
      select key from jsonb_object_keys(coalesce(p_old, '{}'::jsonb)) as old_keys(key)
      union
      select key from jsonb_object_keys(coalesce(p_new, '{}'::jsonb)) as new_keys(key)
    ) keys
    where key not in ('updated_at', 'created_at')
      and coalesce(p_old -> key, 'null'::jsonb) is distinct from coalesce(p_new -> key, 'null'::jsonb)
  ) diff;
$$;

create or replace function public.auditoria_registrar_alteracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_acao text;
  v_organizacao_id uuid;
  v_registro_id uuid;
  v_campos text[];
  v_usuario public.usuarios%rowtype;
begin
  if TG_OP = 'INSERT' then
    v_acao := 'criou';
    v_new := to_jsonb(NEW);
    v_row := v_new;
  elsif TG_OP = 'UPDATE' then
    v_acao := 'alterou';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row := v_new;
  elsif TG_OP = 'DELETE' then
    v_acao := 'excluiu';
    v_old := to_jsonb(OLD);
    v_row := v_old;
  end if;

  v_organizacao_id := nullif(v_row ->> 'organizacao_id', '')::uuid;
  v_registro_id := nullif(v_row ->> 'id', '')::uuid;

  if v_organizacao_id is null then
    if TG_OP = 'DELETE' then
      return OLD;
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    v_campos := public.auditoria_jsonb_diff_keys(v_old, v_new);
    if coalesce(array_length(v_campos, 1), 0) = 0 then
      return NEW;
    end if;
  elsif TG_OP = 'INSERT' then
    select coalesce(array_agg(key order by key), '{}'::text[])
    into v_campos
    from jsonb_object_keys(coalesce(v_new, '{}'::jsonb)) as keys(key)
    where key not in ('updated_at', 'created_at');
  else
    select coalesce(array_agg(key order by key), '{}'::text[])
    into v_campos
    from jsonb_object_keys(coalesce(v_old, '{}'::jsonb)) as keys(key)
    where key not in ('updated_at', 'created_at');
  end if;

  select *
  into v_usuario
  from public.usuarios
  where id = auth.uid()
  limit 1;

  insert into public.auditoria_logs (
    organizacao_id,
    usuario_id,
    usuario_nome_snapshot,
    usuario_email_snapshot,
    usuario_perfil_snapshot,
    acao,
    modulo,
    tabela,
    registro_id,
    registro_descricao,
    campos_alterados,
    dados_anteriores,
    dados_novos,
    detalhes
  )
  values (
    v_organizacao_id,
    auth.uid(),
    v_usuario.nome,
    v_usuario.email,
    v_usuario.perfil,
    v_acao,
    TG_ARGV[0],
    TG_TABLE_NAME,
    v_registro_id,
    public.auditoria_registro_descricao(v_row),
    v_campos,
    case when TG_OP in ('UPDATE', 'DELETE') then v_old else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then v_new else null end,
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'operacao', TG_OP,
      'horario', now()
    )
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

grant execute on function public.auditoria_registro_descricao(jsonb) to authenticated;
grant execute on function public.auditoria_jsonb_diff_keys(jsonb, jsonb) to authenticated;

do $$
declare
  v_item record;
begin
  for v_item in
    select *
    from (
      values
        ('empresas', 'Empresas'),
        ('empresa_setores', 'Empresas'),
        ('equipamentos', 'Equipamentos'),
        ('ordens_servico', 'Ordem de Servico'),
        ('orcamentos', 'Orcamentos'),
        ('protocolos_os', 'Protocolos'),
        ('contratos', 'Contratos'),
        ('laudos_obsolescencia', 'Laudos de Obsolescencia'),
        ('calibracao_padroes', 'Calibracao'),
        ('calibracao_procedimentos', 'Calibracao'),
        ('calibracao_execucoes', 'Calibracao'),
        ('seguranca_eletrica_execucoes', 'Seguranca Eletrica'),
        ('planos', 'Planos'),
        ('plano_ciclos', 'Planos'),
        ('procedimentos_preventiva', 'Procedimentos Preventivos'),
        ('utilitario_termos_locacao', 'Utilitarios'),
        ('utilitario_termo_mensalidades', 'Utilitarios')
    ) as t(tabela, modulo)
  loop
    if to_regclass('public.' || v_item.tabela) is not null then
      execute format(
        'drop trigger if exists trg_auditoria_%I on public.%I',
        v_item.tabela,
        v_item.tabela
      );
      execute format(
        'create trigger trg_auditoria_%I after insert or update or delete on public.%I for each row execute function public.auditoria_registrar_alteracao(%L)',
        v_item.tabela,
        v_item.tabela,
        v_item.modulo
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Fim da migration 060_auditoria_logs.sql

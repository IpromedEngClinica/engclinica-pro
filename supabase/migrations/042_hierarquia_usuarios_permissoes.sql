-- ============================================================
-- EngClinica Pro
-- Migration: 042_hierarquia_usuarios_permissoes.sql
-- Objetivo:
-- - Padronizar perfis: admin, gestor, tecnico, comercial, solicitante
-- - Vincular solicitantes/tecnicos externos a clientes quando aplicavel
-- - Criar catalogo e matriz de permissoes por perfil
-- - Criar estrutura de convites por link unico
-- ============================================================

alter table public.usuarios
add column if not exists empresa_id uuid null references public.empresas(id) on delete set null;

update public.usuarios
set perfil = 'comercial'
where perfil = 'financeiro';

update public.usuarios
set perfil = 'solicitante'
where perfil = 'cliente';

alter table public.usuarios
drop constraint if exists usuarios_perfil_check;

alter table public.usuarios
add constraint usuarios_perfil_check check (
  perfil in ('admin', 'gestor', 'tecnico', 'comercial', 'solicitante')
);

create index if not exists idx_usuarios_empresa
on public.usuarios (empresa_id);

create table if not exists public.usuario_convites (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  empresa_id uuid null references public.empresas(id) on delete set null,
  email text not null,
  nome text,
  perfil text not null,
  token_hash text not null,
  status text not null default 'pendente',
  expira_em timestamp with time zone not null default (now() + interval '7 days'),
  aceito_por uuid null references public.usuarios(id) on delete set null,
  aceito_em timestamp with time zone,
  criado_por uuid null references public.usuarios(id) on delete set null,
  cancelado_em timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint usuario_convites_perfil_check check (
    perfil in ('admin', 'gestor', 'tecnico', 'comercial', 'solicitante')
  ),
  constraint usuario_convites_status_check check (
    status in ('pendente', 'aceito', 'cancelado', 'expirado')
  ),
  constraint usuario_convites_empresa_check check (
    (perfil = 'solicitante' and empresa_id is not null)
    or (perfil in ('admin', 'gestor', 'tecnico', 'comercial'))
  )
);

create index if not exists idx_usuario_convites_organizacao
on public.usuario_convites (organizacao_id);

create index if not exists idx_usuario_convites_empresa
on public.usuario_convites (empresa_id);

create index if not exists idx_usuario_convites_email
on public.usuario_convites (lower(email));

create index if not exists idx_usuario_convites_status
on public.usuario_convites (status);

create unique index if not exists idx_usuario_convites_token_hash
on public.usuario_convites (token_hash);

create table if not exists public.permissoes (
  chave text primary key,
  nome text not null,
  grupo text not null,
  descricao text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.perfil_permissoes (
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  perfil text not null,
  permissao_chave text not null references public.permissoes(chave) on delete cascade,
  permitido boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (organizacao_id, perfil, permissao_chave),
  constraint perfil_permissoes_perfil_check check (
    perfil in ('gestor', 'tecnico', 'comercial', 'solicitante')
  )
);

create index if not exists idx_perfil_permissoes_organizacao
on public.perfil_permissoes (organizacao_id);

create index if not exists idx_perfil_permissoes_perfil
on public.perfil_permissoes (perfil);

drop trigger if exists trg_permissoes_updated_at on public.permissoes;
create trigger trg_permissoes_updated_at
before update on public.permissoes
for each row execute function public.set_updated_at();

drop trigger if exists trg_perfil_permissoes_updated_at on public.perfil_permissoes;
create trigger trg_perfil_permissoes_updated_at
before update on public.perfil_permissoes
for each row execute function public.set_updated_at();

drop trigger if exists trg_usuario_convites_updated_at on public.usuario_convites;
create trigger trg_usuario_convites_updated_at
before update on public.usuario_convites
for each row execute function public.set_updated_at();

insert into public.permissoes (chave, nome, grupo, descricao, ordem, ativo)
values
  ('dashboard.visualizar', 'Visualizar painel', 'Painel', 'Acessar indicadores gerais.', 10, true),
  ('empresas.visualizar', 'Visualizar empresas', 'Empresas', 'Consultar clientes, fornecedores e parceiros.', 20, true),
  ('empresas.gerenciar', 'Gerenciar empresas', 'Empresas', 'Criar e editar empresas, setores e dados comerciais.', 30, true),
  ('equipamentos.visualizar', 'Visualizar equipamentos', 'Equipamentos', 'Consultar equipamentos e historico.', 40, true),
  ('equipamentos.gerenciar', 'Gerenciar equipamentos', 'Equipamentos', 'Criar e editar equipamentos.', 50, true),
  ('os.visualizar', 'Visualizar ordens de servico', 'Ordens de Servico', 'Consultar OS e historico tecnico.', 60, true),
  ('os.gerenciar', 'Gerenciar ordens de servico', 'Ordens de Servico', 'Criar, editar e mudar estados de OS.', 70, true),
  ('orcamentos.visualizar', 'Visualizar orcamentos', 'Orcamentos', 'Consultar orcamentos.', 80, true),
  ('orcamentos.gerenciar', 'Gerenciar orcamentos', 'Orcamentos', 'Criar, editar e aprovar fluxos internos de orcamento.', 90, true),
  ('calibracao.visualizar', 'Visualizar calibracoes', 'Calibracao', 'Consultar certificados e execucoes de calibracao.', 100, true),
  ('calibracao.gerenciar', 'Gerenciar calibracoes', 'Calibracao', 'Executar e finalizar calibracoes.', 110, true),
  ('seguranca_eletrica.visualizar', 'Visualizar seguranca eletrica', 'Seguranca Eletrica', 'Consultar certificados de seguranca eletrica.', 120, true),
  ('seguranca_eletrica.gerenciar', 'Gerenciar seguranca eletrica', 'Seguranca Eletrica', 'Executar e finalizar testes de seguranca eletrica.', 130, true),
  ('relatorios.visualizar', 'Visualizar relatorios', 'Relatorios', 'Consultar e gerar PDFs de relatorios.', 140, true),
  ('relatorios.gerenciar', 'Gerenciar relatorios', 'Relatorios', 'Criar e editar filtros de relatorios arquivados.', 150, true),
  ('planos.visualizar', 'Visualizar planos', 'Planos', 'Consultar planos e cronogramas.', 160, true),
  ('planos.gerenciar', 'Gerenciar planos', 'Planos', 'Criar ciclos, executar itens e editar planos.', 170, true),
  ('contratos.visualizar', 'Visualizar contratos', 'Contratos', 'Consultar contratos e anexos.', 180, true),
  ('contratos.gerenciar', 'Gerenciar contratos', 'Contratos', 'Criar e editar contratos.', 190, true),
  ('protocolos.visualizar', 'Visualizar protocolos', 'Protocolos', 'Consultar protocolos de entrega.', 200, true),
  ('protocolos.gerenciar', 'Gerenciar protocolos', 'Protocolos', 'Criar e editar protocolos.', 210, true),
  ('laudos.visualizar', 'Visualizar laudos', 'Laudos', 'Consultar laudos de obsolescencia.', 220, true),
  ('laudos.gerenciar', 'Gerenciar laudos', 'Laudos', 'Criar e editar laudos de obsolescencia.', 230, true),
  ('procedimentos.visualizar', 'Visualizar procedimentos', 'Procedimentos', 'Consultar procedimentos preventivos.', 240, true),
  ('procedimentos.gerenciar', 'Gerenciar procedimentos', 'Procedimentos', 'Criar e editar procedimentos preventivos.', 250, true),
  ('campos_gerenciais.gerenciar', 'Gerenciar campos gerenciais', 'Administracao', 'Editar tipos, estados, pecas e configuracoes operacionais.', 260, true),
  ('usuarios.gerenciar', 'Gerenciar usuarios e permissoes', 'Administracao', 'Editar matriz de permissoes e convites de acesso.', 270, true)
on conflict (chave) do update set
  nome = excluded.nome,
  grupo = excluded.grupo,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  ativo = excluded.ativo,
  updated_at = now();

do $$
declare
  v_org record;
  v_perm record;
  v_perfil text;
  v_permitido boolean;
begin
  for v_org in select id from public.organizacoes loop
    foreach v_perfil in array array['gestor', 'tecnico', 'comercial', 'solicitante'] loop
      for v_perm in select chave from public.permissoes where ativo loop
        v_permitido := case
          when v_perfil = 'gestor' then
            v_perm.chave not in ('usuarios.gerenciar')
          when v_perfil = 'tecnico' then
            v_perm.chave in (
              'dashboard.visualizar',
              'empresas.visualizar',
              'equipamentos.visualizar',
              'equipamentos.gerenciar',
              'os.visualizar',
              'os.gerenciar',
              'calibracao.visualizar',
              'calibracao.gerenciar',
              'seguranca_eletrica.visualizar',
              'seguranca_eletrica.gerenciar',
              'relatorios.visualizar',
              'planos.visualizar',
              'planos.gerenciar',
              'protocolos.visualizar',
              'protocolos.gerenciar',
              'laudos.visualizar',
              'laudos.gerenciar',
              'procedimentos.visualizar',
              'procedimentos.gerenciar'
            )
          when v_perfil = 'comercial' then
            v_perm.chave in (
              'dashboard.visualizar',
              'empresas.visualizar',
              'empresas.gerenciar',
              'equipamentos.visualizar',
              'os.visualizar',
              'orcamentos.visualizar',
              'orcamentos.gerenciar',
              'relatorios.visualizar',
              'contratos.visualizar',
              'contratos.gerenciar',
              'protocolos.visualizar'
            )
          when v_perfil = 'solicitante' then
            v_perm.chave in (
              'dashboard.visualizar',
              'equipamentos.visualizar',
              'os.visualizar',
              'calibracao.visualizar',
              'seguranca_eletrica.visualizar',
              'protocolos.visualizar'
            )
          else false
        end;

        insert into public.perfil_permissoes (
          organizacao_id,
          perfil,
          permissao_chave,
          permitido
        )
        values (
          v_org.id,
          v_perfil,
          v_perm.chave,
          v_permitido
        )
        on conflict (organizacao_id, perfil, permissao_chave) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

create or replace function public.user_has_permission(p_permissao text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when u.perfil = 'admin' then true
        else exists (
          select 1
          from public.perfil_permissoes pp
          where pp.organizacao_id = u.organizacao_id
            and pp.perfil = u.perfil
            and pp.permissao_chave = p_permissao
            and pp.permitido
        )
      end
      from public.usuarios u
      where u.id = auth.uid()
        and u.ativo
      limit 1
    ),
    false
  );
$$;

create or replace function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select empresa_id
  from public.usuarios
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_solicitante()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_perfil() = 'solicitante', false);
$$;

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

grant execute on function public.user_has_permission(text) to authenticated;
grant execute on function public.current_empresa_id() to authenticated;
grant execute on function public.is_solicitante() to authenticated;
grant execute on function public.validar_usuario_convite(text) to anon, authenticated;
grant execute on function public.aceitar_usuario_convite(text, text) to authenticated;

alter table public.permissoes enable row level security;
alter table public.perfil_permissoes enable row level security;
alter table public.usuario_convites enable row level security;

drop policy if exists "permissoes_select_authenticated" on public.permissoes;
create policy "permissoes_select_authenticated"
on public.permissoes
for select
to authenticated
using (ativo);

drop policy if exists "perfil_permissoes_select_mesma_organizacao" on public.perfil_permissoes;
create policy "perfil_permissoes_select_mesma_organizacao"
on public.perfil_permissoes
for select
to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "perfil_permissoes_write_admin" on public.perfil_permissoes;
create policy "perfil_permissoes_write_admin"
on public.perfil_permissoes
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

drop policy if exists "usuario_convites_select_admin" on public.usuario_convites;
create policy "usuario_convites_select_admin"
on public.usuario_convites
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

drop policy if exists "usuario_convites_write_admin" on public.usuario_convites;
create policy "usuario_convites_write_admin"
on public.usuario_convites
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

drop policy if exists "usuarios_select_mesma_organizacao" on public.usuarios;
drop policy if exists "usuarios_select_hierarquia" on public.usuarios;
create policy "usuarios_select_hierarquia"
on public.usuarios
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    public.current_user_perfil() in ('admin', 'gestor')
    or id = auth.uid()
  )
);

drop policy if exists "empresas_select_mesma_organizacao" on public.empresas;
drop policy if exists "empresas_select_hierarquia" on public.empresas;
create policy "empresas_select_hierarquia"
on public.empresas
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or id = public.current_empresa_id()
  )
);

drop policy if exists "empresa_setores_select_mesma_organizacao" on public.empresa_setores;
drop policy if exists "empresa_setores_select_hierarquia" on public.empresa_setores;
create policy "empresa_setores_select_hierarquia"
on public.empresa_setores
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "equipamentos_select_mesma_organizacao" on public.equipamentos;
drop policy if exists "equipamentos_select_hierarquia" on public.equipamentos;
create policy "equipamentos_select_hierarquia"
on public.equipamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "os_select_mesma_organizacao" on public.ordens_servico;
drop policy if exists "os_select_hierarquia" on public.ordens_servico;
create policy "os_select_hierarquia"
on public.ordens_servico
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "orcamentos_select_mesma_organizacao" on public.orcamentos;
drop policy if exists "orcamentos_select_hierarquia" on public.orcamentos;
create policy "orcamentos_select_hierarquia"
on public.orcamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "protocolos_os_select_mesma_organizacao" on public.protocolos_os;
drop policy if exists "protocolos_os_select_hierarquia" on public.protocolos_os;
create policy "protocolos_os_select_hierarquia"
on public.protocolos_os
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "contratos_select_mesma_organizacao" on public.contratos;
drop policy if exists "contratos_select_hierarquia" on public.contratos;
create policy "contratos_select_hierarquia"
on public.contratos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "laudos_obsolescencia_select_mesma_organizacao" on public.laudos_obsolescencia;
drop policy if exists "laudos_obsolescencia_select_hierarquia" on public.laudos_obsolescencia;
create policy "laudos_obsolescencia_select_hierarquia"
on public.laudos_obsolescencia
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "calibracao_execucoes_select_mesma_organizacao" on public.calibracao_execucoes;
drop policy if exists "calibracao_execucoes_select_hierarquia" on public.calibracao_execucoes;
create policy "calibracao_execucoes_select_hierarquia"
on public.calibracao_execucoes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "seguranca_eletrica_execucoes_select_mesma_organizacao" on public.seguranca_eletrica_execucoes;
drop policy if exists "seguranca_eletrica_execucoes_select_hierarquia" on public.seguranca_eletrica_execucoes;
create policy "seguranca_eletrica_execucoes_select_hierarquia"
on public.seguranca_eletrica_execucoes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "planos_select_mesma_organizacao" on public.planos;
drop policy if exists "planos_select_hierarquia" on public.planos;
create policy "planos_select_hierarquia"
on public.planos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

drop policy if exists "contratos_insert_admin_gestor_financeiro" on public.contratos;
drop policy if exists "contratos_update_admin_gestor_financeiro" on public.contratos;
drop policy if exists "contrato_documentos_insert_admin_gestor_financeiro" on public.contrato_documentos;
drop policy if exists "contrato_documentos_delete_admin_gestor_financeiro" on public.contrato_documentos;
drop policy if exists "contratos_storage_insert_admin_gestor_financeiro" on storage.objects;
drop policy if exists "contratos_storage_delete_admin_gestor_financeiro" on storage.objects;
drop policy if exists "contratos_insert_admin_gestor_comercial" on public.contratos;
drop policy if exists "contratos_update_admin_gestor_comercial" on public.contratos;
drop policy if exists "contrato_documentos_insert_admin_gestor_comercial" on public.contrato_documentos;
drop policy if exists "contrato_documentos_delete_admin_gestor_comercial" on public.contrato_documentos;
drop policy if exists "contratos_storage_insert_admin_gestor_comercial" on storage.objects;
drop policy if exists "contratos_storage_delete_admin_gestor_comercial" on storage.objects;

create policy "contratos_insert_admin_gestor_comercial"
on public.contratos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

create policy "contratos_update_admin_gestor_comercial"
on public.contratos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

create policy "contrato_documentos_insert_admin_gestor_comercial"
on public.contrato_documentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

create policy "contrato_documentos_delete_admin_gestor_comercial"
on public.contrato_documentos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

create policy "contratos_storage_insert_admin_gestor_comercial"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'contrato-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

create policy "contratos_storage_delete_admin_gestor_comercial"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'contrato-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'comercial')
);

notify pgrst, 'reload schema';

-- Fim da migration 042_hierarquia_usuarios_permissoes.sql

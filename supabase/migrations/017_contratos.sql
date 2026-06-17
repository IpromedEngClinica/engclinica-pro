-- ============================================================
-- EngClinica Pro
-- Migration: 017_contratos.sql
-- Objetivo:
-- - Criar modulo de contratos
-- - Criar documentos/anexos de contratos
-- - Preparar storage, RLS, indices e updated_at
-- ============================================================

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  empresa_id uuid null references public.empresas(id) on delete set null,

  tipo text not null default 'Privado',
  empresa_nome_snapshot text,
  numero_identificacao text,

  data_ultima_renovacao date,
  data_proxima_renovacao date not null,

  contrato_ou_ta_na_pasta boolean not null default false,

  termos_aditivos_realizados integer not null default 0,
  termos_aditivos_limite integer null,

  periodicidade_visita text,
  vendedor text,

  objeto text,
  observacoes text,

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint contratos_tipo_check check (tipo in ('Publico', 'Privado')),
  constraint contratos_termos_realizados_check check (termos_aditivos_realizados >= 0),
  constraint contratos_termos_limite_check check (termos_aditivos_limite is null or termos_aditivos_limite >= 0)
);

create table if not exists public.contrato_documentos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  contrato_id uuid not null references public.contratos(id) on delete cascade,

  tipo_documento text not null default 'Contrato',
  nome_arquivo text not null,
  caminho_storage text not null,
  mime_type text,
  tamanho_bytes bigint,

  observacoes text,

  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null
);

create index if not exists idx_contratos_organizacao
on public.contratos (organizacao_id);

create index if not exists idx_contratos_empresa
on public.contratos (empresa_id);

create index if not exists idx_contratos_proxima_renovacao
on public.contratos (data_proxima_renovacao);

create index if not exists idx_contratos_tipo
on public.contratos (tipo);

create index if not exists idx_contratos_vendedor
on public.contratos (vendedor);

create index if not exists idx_contrato_documentos_contrato
on public.contrato_documentos (contrato_id);

drop trigger if exists trg_contratos_updated_at on public.contratos;
create trigger trg_contratos_updated_at
before update on public.contratos
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('contratos-documentos', 'contratos-documentos', false)
on conflict (id) do nothing;

alter table public.contratos enable row level security;
alter table public.contrato_documentos enable row level security;

drop policy if exists "contratos_select_mesma_organizacao" on public.contratos;
create policy "contratos_select_mesma_organizacao"
on public.contratos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "contratos_insert_admin_gestor_financeiro" on public.contratos;
create policy "contratos_insert_admin_gestor_financeiro"
on public.contratos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

drop policy if exists "contratos_update_admin_gestor_financeiro" on public.contratos;
create policy "contratos_update_admin_gestor_financeiro"
on public.contratos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

drop policy if exists "contrato_documentos_select_mesma_organizacao" on public.contrato_documentos;
create policy "contrato_documentos_select_mesma_organizacao"
on public.contrato_documentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "contrato_documentos_insert_admin_gestor_financeiro" on public.contrato_documentos;
create policy "contrato_documentos_insert_admin_gestor_financeiro"
on public.contrato_documentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

drop policy if exists "contrato_documentos_delete_admin_gestor_financeiro" on public.contrato_documentos;
create policy "contrato_documentos_delete_admin_gestor_financeiro"
on public.contrato_documentos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

drop policy if exists "contratos_storage_select_mesma_organizacao" on storage.objects;
create policy "contratos_storage_select_mesma_organizacao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
);

drop policy if exists "contratos_storage_insert_admin_gestor_financeiro" on storage.objects;
create policy "contratos_storage_insert_admin_gestor_financeiro"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

drop policy if exists "contratos_storage_delete_admin_gestor_financeiro" on storage.objects;
create policy "contratos_storage_delete_admin_gestor_financeiro"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'financeiro')
);

-- ============================================================
-- Fim da migration 017_contratos.sql
-- ============================================================

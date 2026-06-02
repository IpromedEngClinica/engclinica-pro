-- ============================================================
-- EngClinica Pro
-- Migration: 020_calibracao_padroes.sql
-- Objetivo:
-- - Criar cadastro de padroes internos de calibracao
-- - Registrar certificados, rastreabilidade e tabelas metrologicas
-- - Preparar storage privado, RLS, indices e updated_at
-- ============================================================

create table if not exists public.calibracao_padroes (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  numero_certificado text not null,
  nome_padrao text not null,
  descricao text null,

  fabricante text null,
  modelo text null,
  numero_serie text null,
  patrimonio text null,
  tag text null,

  laboratorio_calibrador text not null,

  data_calibracao date not null,
  data_validade date not null,

  observacoes text null,

  temperatura_ambiente numeric(12,4) null,
  incerteza_temperatura numeric(12,4) null,
  unidade_temperatura text null default '°C',

  umidade_relativa numeric(12,4) null,
  incerteza_umidade numeric(12,4) null,
  unidade_umidade text null default '%',

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint calibracao_padroes_numero_not_empty
    check (length(trim(numero_certificado)) > 0),

  constraint calibracao_padroes_nome_not_empty
    check (length(trim(nome_padrao)) > 0),

  constraint calibracao_padroes_laboratorio_not_empty
    check (length(trim(laboratorio_calibrador)) > 0),

  constraint calibracao_padroes_datas_check
    check (data_validade >= data_calibracao)
);

create table if not exists public.calibracao_padrao_documentos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  padrao_id uuid not null references public.calibracao_padroes(id) on delete cascade,

  tipo_documento text not null,
  nome_arquivo text not null,
  caminho_storage text not null,
  mime_type text null,
  tamanho_bytes bigint null,

  observacoes text null,

  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,

  constraint calibracao_padrao_documentos_tipo_check
    check (tipo_documento in ('Certificado', 'Rastreabilidade', 'Outro'))
);

create table if not exists public.calibracao_padrao_tabelas (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  padrao_id uuid not null references public.calibracao_padroes(id) on delete cascade,

  nome text not null,
  grandeza text not null,
  unidade text not null,

  ordem integer not null default 0,
  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  constraint calibracao_padrao_tabelas_nome_not_empty
    check (length(trim(nome)) > 0),

  constraint calibracao_padrao_tabelas_grandeza_not_empty
    check (length(trim(grandeza)) > 0),

  constraint calibracao_padrao_tabelas_unidade_not_empty
    check (length(trim(unidade)) > 0)
);

create table if not exists public.calibracao_padrao_pontos (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  tabela_id uuid not null references public.calibracao_padrao_tabelas(id) on delete cascade,

  ordem integer not null default 0,

  valor_nominal numeric(18,8) not null,
  media_valores_medidos numeric(18,8) null,
  tendencia numeric(18,8) null,
  incerteza_expandida numeric(18,8) null,
  fator_abrangencia_k numeric(18,8) null,
  graus_liberdade_efetivos_veff numeric(18,8) null,

  observacoes text null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null
);

create index if not exists idx_calibracao_padroes_organizacao
on public.calibracao_padroes (organizacao_id);

create index if not exists idx_calibracao_padroes_validade
on public.calibracao_padroes (data_validade);

create index if not exists idx_calibracao_padrao_documentos_padrao
on public.calibracao_padrao_documentos (padrao_id);

create index if not exists idx_calibracao_padrao_tabelas_padrao
on public.calibracao_padrao_tabelas (padrao_id);

create index if not exists idx_calibracao_padrao_pontos_tabela
on public.calibracao_padrao_pontos (tabela_id);

drop trigger if exists trg_calibracao_padroes_updated_at on public.calibracao_padroes;
create trigger trg_calibracao_padroes_updated_at
before update on public.calibracao_padroes
for each row execute function public.set_updated_at();

drop trigger if exists trg_calibracao_padrao_tabelas_updated_at on public.calibracao_padrao_tabelas;
create trigger trg_calibracao_padrao_tabelas_updated_at
before update on public.calibracao_padrao_tabelas
for each row execute function public.set_updated_at();

drop trigger if exists trg_calibracao_padrao_pontos_updated_at on public.calibracao_padrao_pontos;
create trigger trg_calibracao_padrao_pontos_updated_at
before update on public.calibracao_padrao_pontos
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('calibracao-padroes-documentos', 'calibracao-padroes-documentos', false)
on conflict (id) do nothing;

alter table public.calibracao_padroes enable row level security;
alter table public.calibracao_padrao_documentos enable row level security;
alter table public.calibracao_padrao_tabelas enable row level security;
alter table public.calibracao_padrao_pontos enable row level security;

drop policy if exists "calibracao_padroes_select_mesma_organizacao" on public.calibracao_padroes;
create policy "calibracao_padroes_select_mesma_organizacao"
on public.calibracao_padroes
for select
to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "calibracao_padroes_insert_admin_gestor_tecnico" on public.calibracao_padroes;
create policy "calibracao_padroes_insert_admin_gestor_tecnico"
on public.calibracao_padroes
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padroes_update_admin_gestor_tecnico" on public.calibracao_padroes;
create policy "calibracao_padroes_update_admin_gestor_tecnico"
on public.calibracao_padroes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_documentos_select_mesma_organizacao" on public.calibracao_padrao_documentos;
create policy "calibracao_padrao_documentos_select_mesma_organizacao"
on public.calibracao_padrao_documentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_padroes p
    where p.id = calibracao_padrao_documentos.padrao_id
      and p.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "calibracao_padrao_documentos_insert_admin_gestor_tecnico" on public.calibracao_padrao_documentos;
create policy "calibracao_padrao_documentos_insert_admin_gestor_tecnico"
on public.calibracao_padrao_documentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_padroes p
    where p.id = calibracao_padrao_documentos.padrao_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_documentos_delete_admin_gestor_tecnico" on public.calibracao_padrao_documentos;
create policy "calibracao_padrao_documentos_delete_admin_gestor_tecnico"
on public.calibracao_padrao_documentos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_tabelas_select_mesma_organizacao" on public.calibracao_padrao_tabelas;
create policy "calibracao_padrao_tabelas_select_mesma_organizacao"
on public.calibracao_padrao_tabelas
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_padroes p
    where p.id = calibracao_padrao_tabelas.padrao_id
      and p.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "calibracao_padrao_tabelas_insert_admin_gestor_tecnico" on public.calibracao_padrao_tabelas;
create policy "calibracao_padrao_tabelas_insert_admin_gestor_tecnico"
on public.calibracao_padrao_tabelas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_padroes p
    where p.id = calibracao_padrao_tabelas.padrao_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_tabelas_update_admin_gestor_tecnico" on public.calibracao_padrao_tabelas;
create policy "calibracao_padrao_tabelas_update_admin_gestor_tecnico"
on public.calibracao_padrao_tabelas
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_padroes p
    where p.id = calibracao_padrao_tabelas.padrao_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_tabelas_delete_admin_gestor_tecnico" on public.calibracao_padrao_tabelas;
create policy "calibracao_padrao_tabelas_delete_admin_gestor_tecnico"
on public.calibracao_padrao_tabelas
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_pontos_select_mesma_organizacao" on public.calibracao_padrao_pontos;
create policy "calibracao_padrao_pontos_select_mesma_organizacao"
on public.calibracao_padrao_pontos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.calibracao_padrao_tabelas t
    join public.calibracao_padroes p on p.id = t.padrao_id
    where t.id = calibracao_padrao_pontos.tabela_id
      and p.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "calibracao_padrao_pontos_insert_admin_gestor_tecnico" on public.calibracao_padrao_pontos;
create policy "calibracao_padrao_pontos_insert_admin_gestor_tecnico"
on public.calibracao_padrao_pontos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.calibracao_padrao_tabelas t
    join public.calibracao_padroes p on p.id = t.padrao_id
    where t.id = calibracao_padrao_pontos.tabela_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_pontos_update_admin_gestor_tecnico" on public.calibracao_padrao_pontos;
create policy "calibracao_padrao_pontos_update_admin_gestor_tecnico"
on public.calibracao_padrao_pontos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.calibracao_padrao_tabelas t
    join public.calibracao_padroes p on p.id = t.padrao_id
    where t.id = calibracao_padrao_pontos.tabela_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padrao_pontos_delete_admin_gestor_tecnico" on public.calibracao_padrao_pontos;
create policy "calibracao_padrao_pontos_delete_admin_gestor_tecnico"
on public.calibracao_padrao_pontos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padroes_storage_select_mesma_organizacao" on storage.objects;
create policy "calibracao_padroes_storage_select_mesma_organizacao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'calibracao-padroes-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
);

drop policy if exists "calibracao_padroes_storage_insert_admin_gestor_tecnico" on storage.objects;
create policy "calibracao_padroes_storage_insert_admin_gestor_tecnico"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'calibracao-padroes-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_padroes_storage_delete_admin_gestor_tecnico" on storage.objects;
create policy "calibracao_padroes_storage_delete_admin_gestor_tecnico"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'calibracao-padroes-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 020_calibracao_padroes.sql
-- ============================================================

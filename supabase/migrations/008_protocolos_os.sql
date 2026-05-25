-- ============================================================
-- EngClinica Pro
-- Migration: 008_protocolos_os.sql
-- Objetivo:
-- - Criar base de protocolos de recolhimento e entrega
-- - Permitir protocolo a partir de equipamento ou OS
-- - Preparar fechamento automatico de OS na entrega
-- - Preparar criacao automatica de OS no recolhimento
-- ============================================================

-- ============================================================
-- 1. SEQUENCIA DE PROTOCOLOS
-- ============================================================

create sequence if not exists public.protocolos_os_numero_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.gerar_numero_protocolo_os()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo_numero bigint;
begin
  proximo_numero := nextval('public.protocolos_os_numero_seq');
  return proximo_numero::text;
end;
$$;

alter function public.gerar_numero_protocolo_os() owner to postgres;

-- ============================================================
-- 2. TABELA PRINCIPAL DE PROTOCOLOS
-- ============================================================

create table if not exists public.protocolos_os (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  numero text not null default public.gerar_numero_protocolo_os(),

  tipo text not null,

  empresa_id uuid not null references public.empresas(id) on delete restrict,
  equipamento_id uuid not null references public.equipamentos(id) on delete restrict,
  ordem_servico_id uuid null references public.ordens_servico(id) on delete set null,

  data_protocolo timestamp with time zone not null default now(),

  -- Usado principalmente no recolhimento.
  data_recolhimento timestamp with time zone,

  -- Usado principalmente na entrega. Pode representar data prevista ou efetiva
  -- de entrega conforme operacao do usuario.
  data_entrega timestamp with time zone,

  -- Quem coletou ou quem recebeu, dependendo do tipo do protocolo.
  responsavel_nome text,
  responsavel_documento text,
  responsavel_contato text,

  problema_relatado text,
  observacoes text,

  status text not null default 'emitido',

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  unique (organizacao_id, numero),

  constraint protocolos_os_tipo_check check (
    tipo in ('recolhimento', 'entrega')
  ),

  constraint protocolos_os_status_check check (
    status in ('emitido', 'cancelado')
  )
);

-- ============================================================
-- 3. ACESSORIOS DO PROTOCOLO
-- ============================================================

create table if not exists public.protocolo_os_acessorios (
  id uuid primary key default gen_random_uuid(),

  protocolo_id uuid not null references public.protocolos_os(id) on delete cascade,

  descricao text not null,
  quantidade integer not null default 1,

  -- Para entrega: indica se acessorio foi entregue/conferido.
  -- Para recolhimento: pode ser usado futuramente como conferido na coleta.
  conferido boolean not null default true,

  observacoes text,

  created_at timestamp with time zone not null default now()
);

-- ============================================================
-- 4. INDICES
-- ============================================================

create index if not exists idx_protocolos_os_organizacao
on public.protocolos_os (organizacao_id);

create index if not exists idx_protocolos_os_numero
on public.protocolos_os (numero);

create index if not exists idx_protocolos_os_tipo
on public.protocolos_os (tipo);

create index if not exists idx_protocolos_os_empresa
on public.protocolos_os (empresa_id);

create index if not exists idx_protocolos_os_equipamento
on public.protocolos_os (equipamento_id);

create index if not exists idx_protocolos_os_ordem_servico
on public.protocolos_os (ordem_servico_id);

create index if not exists idx_protocolos_os_data_protocolo
on public.protocolos_os (data_protocolo);

create index if not exists idx_protocolos_os_data_recolhimento
on public.protocolos_os (data_recolhimento);

create index if not exists idx_protocolos_os_data_entrega
on public.protocolos_os (data_entrega);

create index if not exists idx_protocolos_os_status
on public.protocolos_os (status);

create index if not exists idx_protocolos_os_ativo
on public.protocolos_os (ativo);

create index if not exists idx_protocolo_os_acessorios_protocolo
on public.protocolo_os_acessorios (protocolo_id);

-- ============================================================
-- 5. TRIGGER UPDATED_AT
-- ============================================================

drop trigger if exists trg_protocolos_os_updated_at on public.protocolos_os;

create trigger trg_protocolos_os_updated_at
before update on public.protocolos_os
for each row execute function public.set_updated_at();

-- ============================================================
-- 6. RLS
-- ============================================================

alter table public.protocolos_os enable row level security;
alter table public.protocolo_os_acessorios enable row level security;

-- ------------------------------------------------------------
-- PROTOCOLOS
-- ------------------------------------------------------------

drop policy if exists "protocolos_os_select_mesma_organizacao" on public.protocolos_os;
create policy "protocolos_os_select_mesma_organizacao"
on public.protocolos_os
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "protocolos_os_insert_admin_gestor_tecnico" on public.protocolos_os;
create policy "protocolos_os_insert_admin_gestor_tecnico"
on public.protocolos_os
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "protocolos_os_update_admin_gestor_tecnico" on public.protocolos_os;
create policy "protocolos_os_update_admin_gestor_tecnico"
on public.protocolos_os
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

-- ------------------------------------------------------------
-- ACESSORIOS DO PROTOCOLO
-- ------------------------------------------------------------

drop policy if exists "protocolo_os_acessorios_select_mesma_organizacao" on public.protocolo_os_acessorios;
create policy "protocolo_os_acessorios_select_mesma_organizacao"
on public.protocolo_os_acessorios
for select
to authenticated
using (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "protocolo_os_acessorios_insert_mesma_organizacao" on public.protocolo_os_acessorios;
create policy "protocolo_os_acessorios_insert_mesma_organizacao"
on public.protocolo_os_acessorios
for insert
to authenticated
with check (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "protocolo_os_acessorios_update_mesma_organizacao" on public.protocolo_os_acessorios;
create policy "protocolo_os_acessorios_update_mesma_organizacao"
on public.protocolo_os_acessorios
for update
to authenticated
using (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "protocolo_os_acessorios_delete_mesma_organizacao" on public.protocolo_os_acessorios;
create policy "protocolo_os_acessorios_delete_mesma_organizacao"
on public.protocolo_os_acessorios
for delete
to authenticated
using (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 008_protocolos_os.sql
-- ============================================================

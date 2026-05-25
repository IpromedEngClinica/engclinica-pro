-- ============================================================
-- EngClinica Pro
-- Migration: 004_ordens_servico.sql
-- Objetivo:
-- - Criar tabela de ordens de serviço
-- - Criar acessórios vinculados à OS
-- - Criar histórico de OS
-- - Preparar base para operação técnica
-- - Criar policies iniciais de RLS
-- Banco alvo: PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. ORDENS DE SERVIÇO
-- ============================================================

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),

  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,

  numero text not null,

  empresa_id uuid not null references public.empresas(id) on delete restrict,
  equipamento_id uuid null references public.equipamentos(id) on delete set null,

  tipo_os_id uuid null references public.tipos_os(id) on delete set null,
  estado_os_id uuid null references public.estados_os(id) on delete set null,

  tecnico_responsavel_id uuid null references public.usuarios(id) on delete set null,

  solicitante_texto text,
  responsavel_texto text,

  data_abertura timestamp with time zone not null default now(),
  data_fechamento timestamp with time zone,

  origem_problema text,
  descricao_servico text,
  observacoes text,

  prioridade text not null default 'normal',
  status_sistema text not null default 'aberta',

  ativo boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,

  unique (organizacao_id, numero),

  constraint ordens_servico_prioridade_check check (
    prioridade in ('baixa', 'normal', 'alta', 'urgente')
  ),

  constraint ordens_servico_status_sistema_check check (
    status_sistema in ('aberta', 'fechada', 'cancelada')
  )
);

-- ============================================================
-- 2. ACESSÓRIOS DA OS
-- ============================================================

create table if not exists public.ordem_servico_acessorios (
  id uuid primary key default gen_random_uuid(),

  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,

  descricao text not null,
  quantidade integer not null default 1,
  observacoes text,

  created_at timestamp with time zone not null default now()
);

-- ============================================================
-- 3. HISTÓRICO DA OS
-- ============================================================

create table if not exists public.ordem_servico_historico (
  id uuid primary key default gen_random_uuid(),

  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,

  usuario_id uuid null references public.usuarios(id) on delete set null,

  estado_anterior_id uuid null references public.estados_os(id) on delete set null,
  estado_novo_id uuid null references public.estados_os(id) on delete set null,

  acao text not null,
  observacao text,

  created_at timestamp with time zone not null default now()
);

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

create index if not exists idx_os_organizacao
on public.ordens_servico (organizacao_id);

create index if not exists idx_os_numero
on public.ordens_servico (numero);

create index if not exists idx_os_empresa
on public.ordens_servico (empresa_id);

create index if not exists idx_os_equipamento
on public.ordens_servico (equipamento_id);

create index if not exists idx_os_tipo
on public.ordens_servico (tipo_os_id);

create index if not exists idx_os_estado
on public.ordens_servico (estado_os_id);

create index if not exists idx_os_tecnico
on public.ordens_servico (tecnico_responsavel_id);

create index if not exists idx_os_data_abertura
on public.ordens_servico (data_abertura);

create index if not exists idx_os_status_sistema
on public.ordens_servico (status_sistema);

create index if not exists idx_os_ativo
on public.ordens_servico (ativo);

create index if not exists idx_os_acessorios_os
on public.ordem_servico_acessorios (ordem_servico_id);

create index if not exists idx_os_historico_os
on public.ordem_servico_historico (ordem_servico_id);

create index if not exists idx_os_historico_usuario
on public.ordem_servico_historico (usuario_id);

-- ============================================================
-- 5. TRIGGER UPDATED_AT
-- ============================================================

drop trigger if exists trg_ordens_servico_updated_at on public.ordens_servico;

create trigger trg_ordens_servico_updated_at
before update on public.ordens_servico
for each row execute function public.set_updated_at();

-- ============================================================
-- 6. RLS
-- ============================================================

alter table public.ordens_servico enable row level security;
alter table public.ordem_servico_acessorios enable row level security;
alter table public.ordem_servico_historico enable row level security;

-- ------------------------------------------------------------
-- ORDENS DE SERVIÇO
-- ------------------------------------------------------------

drop policy if exists "os_select_mesma_organizacao" on public.ordens_servico;
create policy "os_select_mesma_organizacao"
on public.ordens_servico
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "os_insert_admin_gestor_tecnico" on public.ordens_servico;
create policy "os_insert_admin_gestor_tecnico"
on public.ordens_servico
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_update_admin_gestor_tecnico" on public.ordens_servico;
create policy "os_update_admin_gestor_tecnico"
on public.ordens_servico
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
-- ACESSÓRIOS DA OS
-- ------------------------------------------------------------

drop policy if exists "os_acessorios_select_mesma_organizacao" on public.ordem_servico_acessorios;
create policy "os_acessorios_select_mesma_organizacao"
on public.ordem_servico_acessorios
for select
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "os_acessorios_insert_mesma_organizacao" on public.ordem_servico_acessorios;
create policy "os_acessorios_insert_mesma_organizacao"
on public.ordem_servico_acessorios
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_acessorios_update_mesma_organizacao" on public.ordem_servico_acessorios;
create policy "os_acessorios_update_mesma_organizacao"
on public.ordem_servico_acessorios
for update
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ------------------------------------------------------------
-- HISTÓRICO DA OS
-- ------------------------------------------------------------

drop policy if exists "os_historico_select_mesma_organizacao" on public.ordem_servico_historico;
create policy "os_historico_select_mesma_organizacao"
on public.ordem_servico_historico
for select
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_historico.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "os_historico_insert_mesma_organizacao" on public.ordem_servico_historico;
create policy "os_historico_insert_mesma_organizacao"
on public.ordem_servico_historico
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_historico.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- ============================================================
-- Fim da migration 004_ordens_servico.sql
-- ============================================================
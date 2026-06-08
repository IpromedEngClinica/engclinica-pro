-- ============================================================
-- EngClinica Pro
-- Migration: 030_planos_redesign.sql
-- Objetivo:
-- - Criar base limpa do modulo de planos
-- - Separar plano, estrutura, ciclos e itens operacionais
-- - Preparar RLS, indices e updated_at
-- ============================================================

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  titulo text not null,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  responsavel_id uuid null references public.usuarios(id) on delete set null,
  data_inicial date not null,
  frequencia text not null,
  prazo_execucao_dias integer not null default 30,
  descricao text null,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint planos_titulo_check check (length(trim(titulo)) > 0),
  constraint planos_frequencia_check check (
    frequencia in (
      'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral',
      'quadrimestral', 'semestral', 'anual', 'bianual'
    )
  ),
  constraint planos_prazo_execucao_check check (prazo_execucao_dias > 0)
);

create table if not exists public.plano_setores (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  plano_id uuid not null references public.planos(id) on delete cascade,
  nome text not null,
  unidade text null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint plano_setores_nome_check check (length(trim(nome)) > 0)
);

create table if not exists public.plano_equipamentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  plano_id uuid not null references public.planos(id) on delete cascade,
  setor_id uuid null references public.plano_setores(id) on delete set null,
  equipamento_id uuid not null references public.equipamentos(id) on delete restrict,
  executar_preventiva boolean not null default false,
  executar_calibracao boolean not null default false,
  executar_seguranca_eletrica boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint plano_equipamentos_servico_check check (
    executar_preventiva
    or executar_calibracao
    or executar_seguranca_eletrica
  )
);

create table if not exists public.plano_ciclos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  plano_id uuid not null references public.planos(id) on delete restrict,
  titulo text not null,
  data_prevista date not null,
  data_abertura date not null,
  data_fechamento_prevista date not null,
  data_fechamento_real date null,
  data_realizacao_calibracao date null,
  data_emissao_calibracao date null,
  observacoes text null,
  status text not null default 'aberto',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint plano_ciclos_titulo_check check (length(trim(titulo)) > 0),
  constraint plano_ciclos_status_check check (status in ('aberto', 'concluido', 'cancelado'))
);

create table if not exists public.plano_ciclo_setores (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  ciclo_id uuid not null references public.plano_ciclos(id) on delete cascade,
  setor_origem_id uuid null references public.plano_setores(id) on delete set null,
  nome_snapshot text not null,
  unidade_snapshot text null,
  ordem integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.plano_ciclo_itens (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  ciclo_id uuid not null references public.plano_ciclos(id) on delete cascade,
  ciclo_setor_id uuid null references public.plano_ciclo_setores(id) on delete set null,
  plano_equipamento_id uuid null references public.plano_equipamentos(id) on delete set null,
  equipamento_id uuid not null references public.equipamentos(id) on delete restrict,
  tipo_servico text not null,
  status text not null default 'pendente',
  os_id uuid null references public.ordens_servico(id) on delete set null,
  calibracao_execucao_id uuid null references public.calibracao_execucoes(id) on delete set null,
  motivo_cancelamento text null,
  aberto_em timestamp with time zone null,
  concluido_em timestamp with time zone null,
  cancelado_em timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint plano_ciclo_itens_tipo_servico_check check (
    tipo_servico in ('preventiva', 'calibracao', 'seguranca_eletrica')
  ),
  constraint plano_ciclo_itens_status_check check (
    status in ('pendente', 'aberto', 'concluido', 'cancelado')
  )
);

create index if not exists idx_planos_organizacao on public.planos (organizacao_id);
create index if not exists idx_planos_empresa on public.planos (empresa_id);
create index if not exists idx_planos_responsavel on public.planos (responsavel_id);
create index if not exists idx_plano_setores_plano on public.plano_setores (plano_id);
create index if not exists idx_plano_equipamentos_plano on public.plano_equipamentos (plano_id);
create index if not exists idx_plano_equipamentos_setor on public.plano_equipamentos (setor_id);
create unique index if not exists idx_plano_equipamento_unico
on public.plano_equipamentos (organizacao_id, plano_id, equipamento_id)
where ativo;
create index if not exists idx_plano_ciclos_plano on public.plano_ciclos (plano_id);
create index if not exists idx_plano_ciclo_setores_ciclo on public.plano_ciclo_setores (ciclo_id);
create index if not exists idx_plano_ciclo_itens_ciclo on public.plano_ciclo_itens (ciclo_id);
create index if not exists idx_plano_ciclo_itens_setor on public.plano_ciclo_itens (ciclo_setor_id);
create index if not exists idx_plano_ciclo_itens_status on public.plano_ciclo_itens (status);

drop trigger if exists trg_planos_updated_at on public.planos;
create trigger trg_planos_updated_at before update on public.planos
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_setores_updated_at on public.plano_setores;
create trigger trg_plano_setores_updated_at before update on public.plano_setores
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_equipamentos_updated_at on public.plano_equipamentos;
create trigger trg_plano_equipamentos_updated_at before update on public.plano_equipamentos
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_ciclos_updated_at on public.plano_ciclos;
create trigger trg_plano_ciclos_updated_at before update on public.plano_ciclos
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_ciclo_itens_updated_at on public.plano_ciclo_itens;
create trigger trg_plano_ciclo_itens_updated_at before update on public.plano_ciclo_itens
for each row execute function public.set_updated_at();

alter table public.planos enable row level security;
alter table public.plano_setores enable row level security;
alter table public.plano_equipamentos enable row level security;
alter table public.plano_ciclos enable row level security;
alter table public.plano_ciclo_setores enable row level security;
alter table public.plano_ciclo_itens enable row level security;

drop policy if exists "planos_select_mesma_organizacao" on public.planos;
create policy "planos_select_mesma_organizacao" on public.planos
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "planos_insert_admin_gestor_tecnico" on public.planos;
create policy "planos_insert_admin_gestor_tecnico" on public.planos
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "planos_update_admin_gestor_tecnico" on public.planos;
create policy "planos_update_admin_gestor_tecnico" on public.planos
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_setores_select_mesma_organizacao" on public.plano_setores;
create policy "plano_setores_select_mesma_organizacao" on public.plano_setores
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_setores_write_admin_gestor_tecnico" on public.plano_setores;
create policy "plano_setores_write_admin_gestor_tecnico" on public.plano_setores
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.planos p
    where p.id = plano_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_equipamentos_select_mesma_organizacao" on public.plano_equipamentos;
create policy "plano_equipamentos_select_mesma_organizacao" on public.plano_equipamentos
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_equipamentos_write_admin_gestor_tecnico" on public.plano_equipamentos;
create policy "plano_equipamentos_write_admin_gestor_tecnico" on public.plano_equipamentos
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1
    from public.planos p
    join public.equipamentos e on e.id = equipamento_id and e.empresa_id = p.empresa_id
    where p.id = plano_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and (
    setor_id is null
    or exists (
      select 1 from public.plano_setores s
      where s.id = setor_id
        and s.plano_id = plano_id
        and s.organizacao_id = public.current_organizacao_id()
    )
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_ciclos_select_mesma_organizacao" on public.plano_ciclos;
create policy "plano_ciclos_select_mesma_organizacao" on public.plano_ciclos
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_ciclos_write_admin_gestor_tecnico" on public.plano_ciclos;
create policy "plano_ciclos_write_admin_gestor_tecnico" on public.plano_ciclos
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.planos p where p.id = plano_id and p.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_ciclo_setores_select_mesma_organizacao" on public.plano_ciclo_setores;
create policy "plano_ciclo_setores_select_mesma_organizacao" on public.plano_ciclo_setores
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_ciclo_setores_write_admin_gestor_tecnico" on public.plano_ciclo_setores;
create policy "plano_ciclo_setores_write_admin_gestor_tecnico" on public.plano_ciclo_setores
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.plano_ciclos c where c.id = ciclo_id and c.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_ciclo_itens_select_mesma_organizacao" on public.plano_ciclo_itens;
create policy "plano_ciclo_itens_select_mesma_organizacao" on public.plano_ciclo_itens
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_ciclo_itens_write_admin_gestor_tecnico" on public.plano_ciclo_itens;
create policy "plano_ciclo_itens_write_admin_gestor_tecnico" on public.plano_ciclo_itens
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.plano_ciclos c where c.id = ciclo_id and c.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 030_planos_redesign.sql
-- ============================================================

-- ============================================================
-- EngClinica Pro
-- Migration: 030_planos.sql
-- Objetivo:
-- - Criar planos periodicos de execucao tecnica por cliente
-- - Organizar equipamentos por setores e servicos P/C/S
-- - Gerar execucoes com itens operacionais auditaveis
-- ============================================================

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  titulo text not null,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  data_inicio date not null,
  frequencia text not null,
  proxima_execucao date null,
  ativo boolean not null default true,
  observacoes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint planos_titulo_not_empty check (length(trim(titulo)) > 0),
  constraint planos_frequencia_check check (
    frequencia in (
      'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral',
      'quadrimestral', 'semestral', 'anual', 'bianual'
    )
  )
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
  constraint plano_setores_nome_not_empty check (length(trim(nome)) > 0)
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
    executar_preventiva or executar_calibracao or executar_seguranca_eletrica
  )
);

create table if not exists public.plano_execucoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  plano_id uuid not null references public.planos(id) on delete restrict,
  nome_visita text null,
  data_prevista date not null,
  data_abertura_preventiva date null,
  data_fechamento_preventiva date null,
  data_realizacao_calibracao date null,
  data_emissao_calibracao date null,
  observacoes text null,
  status text not null default 'aberta',
  iniciado_em timestamp with time zone null,
  encerrado_em timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint plano_execucoes_status_check check (
    status in ('aberta', 'em_execucao', 'concluida', 'cancelada')
  )
);

create table if not exists public.plano_execucao_itens (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  execucao_id uuid not null references public.plano_execucoes(id) on delete cascade,
  plano_equipamento_id uuid not null references public.plano_equipamentos(id) on delete restrict,
  equipamento_id uuid not null references public.equipamentos(id) on delete restrict,
  setor_id uuid null references public.plano_setores(id) on delete set null,
  tipo_servico text not null,
  status text not null default 'pendente',
  os_id uuid null references public.ordens_servico(id) on delete set null,
  calibracao_execucao_id uuid null references public.calibracao_execucoes(id) on delete set null,
  ordem_setor integer not null default 0,
  iniciado_em timestamp with time zone null,
  concluido_em timestamp with time zone null,
  observacoes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint plano_execucao_itens_tipo_check check (
    tipo_servico in ('preventiva', 'calibracao', 'seguranca_eletrica')
  ),
  constraint plano_execucao_itens_status_check check (
    status in ('pendente', 'em_execucao', 'concluido', 'cancelado')
  ),
  constraint plano_execucao_itens_unique unique (
    execucao_id, plano_equipamento_id, tipo_servico
  )
);

create index if not exists idx_planos_organizacao on public.planos (organizacao_id);
create index if not exists idx_planos_empresa on public.planos (empresa_id);
create index if not exists idx_plano_setores_plano on public.plano_setores (plano_id);
create unique index if not exists idx_plano_equipamentos_unique
on public.plano_equipamentos (organizacao_id, plano_id, equipamento_id);
create index if not exists idx_plano_equipamentos_plano on public.plano_equipamentos (plano_id);
create index if not exists idx_plano_equipamentos_equipamento on public.plano_equipamentos (equipamento_id);
create index if not exists idx_plano_execucoes_plano on public.plano_execucoes (plano_id);
create index if not exists idx_plano_execucoes_data_prevista on public.plano_execucoes (data_prevista);
create index if not exists idx_plano_execucao_itens_execucao on public.plano_execucao_itens (execucao_id);
create index if not exists idx_plano_execucao_itens_equipamento on public.plano_execucao_itens (equipamento_id);
create index if not exists idx_plano_execucao_itens_status on public.plano_execucao_itens (status);

drop trigger if exists trg_planos_updated_at on public.planos;
create trigger trg_planos_updated_at before update on public.planos
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_setores_updated_at on public.plano_setores;
create trigger trg_plano_setores_updated_at before update on public.plano_setores
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_equipamentos_updated_at on public.plano_equipamentos;
create trigger trg_plano_equipamentos_updated_at before update on public.plano_equipamentos
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_execucoes_updated_at on public.plano_execucoes;
create trigger trg_plano_execucoes_updated_at before update on public.plano_execucoes
for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_execucao_itens_updated_at on public.plano_execucao_itens;
create trigger trg_plano_execucao_itens_updated_at before update on public.plano_execucao_itens
for each row execute function public.set_updated_at();

create or replace function public.validar_empresa_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.empresa_id is distinct from old.empresa_id and exists (
    select 1
    from public.plano_equipamentos pe
    join public.equipamentos e on e.id = pe.equipamento_id
    where pe.plano_id = new.id
      and pe.ativo
      and e.empresa_id <> new.empresa_id
  ) then
    raise exception 'Remova os equipamentos do plano antes de alterar o cliente.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planos_validar_empresa on public.planos;
create trigger trg_planos_validar_empresa before update of empresa_id on public.planos
for each row execute function public.validar_empresa_plano();

alter table public.planos enable row level security;
alter table public.plano_setores enable row level security;
alter table public.plano_equipamentos enable row level security;
alter table public.plano_execucoes enable row level security;
alter table public.plano_execucao_itens enable row level security;

drop policy if exists "planos_select_mesma_organizacao" on public.planos;
create policy "planos_select_mesma_organizacao" on public.planos
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "planos_insert_admin_gestor_tecnico" on public.planos;
create policy "planos_insert_admin_gestor_tecnico" on public.planos
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.empresas e where e.id = empresa_id and e.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "planos_update_admin_gestor_tecnico" on public.planos;
create policy "planos_update_admin_gestor_tecnico" on public.planos
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.empresas e where e.id = empresa_id and e.organizacao_id = public.current_organizacao_id())
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
  and exists (select 1 from public.planos p where p.id = plano_id and p.organizacao_id = public.current_organizacao_id())
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
    select 1 from public.planos p
    join public.equipamentos e on e.id = equipamento_id and e.empresa_id = p.empresa_id
    where p.id = plano_id and p.organizacao_id = public.current_organizacao_id()
  )
  and (setor_id is null or exists (select 1 from public.plano_setores s where s.id = setor_id and s.plano_id = plano_id))
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_execucoes_select_mesma_organizacao" on public.plano_execucoes;
create policy "plano_execucoes_select_mesma_organizacao" on public.plano_execucoes
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_execucoes_write_admin_gestor_tecnico" on public.plano_execucoes;
create policy "plano_execucoes_write_admin_gestor_tecnico" on public.plano_execucoes
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.planos p where p.id = plano_id and p.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "plano_execucao_itens_select_mesma_organizacao" on public.plano_execucao_itens;
create policy "plano_execucao_itens_select_mesma_organizacao" on public.plano_execucao_itens
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "plano_execucao_itens_write_admin_gestor_tecnico" on public.plano_execucao_itens;
create policy "plano_execucao_itens_write_admin_gestor_tecnico" on public.plano_execucao_itens
for all to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.plano_execucoes x
    join public.plano_equipamentos pe on pe.id = plano_equipamento_id and pe.plano_id = x.plano_id
    where x.id = execucao_id
      and pe.equipamento_id = equipamento_id
      and x.organizacao_id = public.current_organizacao_id()
  )
  and (
    setor_id is null
    or exists (
      select 1
      from public.plano_setores s
      join public.plano_execucoes x on x.id = execucao_id
      where s.id = setor_id
        and s.plano_id = x.plano_id
    )
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 030_planos.sql
-- ============================================================

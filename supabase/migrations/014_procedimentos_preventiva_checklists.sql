-- ============================================================
-- EngClinica Pro
-- Migration: 015_procedimentos_preventiva_checklists.sql
-- Objetivo:
-- - Criar procedimentos preventivos por tipo de equipamento
-- - Registrar checklists preenchidos vinculados a OS
-- ============================================================

create table if not exists public.procedimentos_preventiva (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  tipo_equipamento_id uuid not null references public.tipos_equipamento(id) on delete restrict,
  titulo text not null,
  descricao text,
  validade_meses integer not null default 12,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null
);

create table if not exists public.procedimento_preventiva_itens (
  id uuid primary key default gen_random_uuid(),
  procedimento_id uuid not null references public.procedimentos_preventiva(id) on delete cascade,
  descricao text not null,
  tipo_resposta text not null default 'conformidade',
  ordem integer not null default 1,
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint procedimento_preventiva_itens_tipo_resposta_check check (
    tipo_resposta in ('conformidade', 'aprovacao_uso')
  )
);

create table if not exists public.os_checklists_preventiva (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  procedimento_id uuid not null references public.procedimentos_preventiva(id) on delete restrict,
  titulo_procedimento text not null,
  tipo_equipamento_nome text,
  validade_meses integer not null default 12,
  data_validade date,
  resultado_geral text not null default 'aprovado',
  observacoes text,
  created_at timestamp with time zone not null default now(),
  constraint os_checklists_preventiva_resultado_check check (
    resultado_geral in ('aprovado', 'nao_aprovado', 'aprovado_com_restricao')
  )
);

create table if not exists public.os_checklist_preventiva_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.os_checklists_preventiva(id) on delete cascade,
  procedimento_item_id uuid null references public.procedimento_preventiva_itens(id) on delete set null,
  descricao text not null,
  tipo_resposta text not null default 'conformidade',
  resposta text not null,
  observacao text,
  ordem integer not null default 1,
  created_at timestamp with time zone not null default now(),
  constraint os_checklist_preventiva_itens_tipo_resposta_check check (
    tipo_resposta in ('conformidade', 'aprovacao_uso')
  ),
  constraint os_checklist_preventiva_itens_resposta_check check (
    resposta in ('conforme', 'nao_conforme', 'nao_aplica', 'aprovado', 'nao_aprovado', 'aprovado_com_restricao')
  )
);

create index if not exists idx_procedimentos_preventiva_organizacao
on public.procedimentos_preventiva (organizacao_id);

create index if not exists idx_procedimentos_preventiva_tipo_equipamento
on public.procedimentos_preventiva (tipo_equipamento_id);

create index if not exists idx_procedimento_preventiva_itens_procedimento
on public.procedimento_preventiva_itens (procedimento_id);

create index if not exists idx_os_checklists_preventiva_os
on public.os_checklists_preventiva (ordem_servico_id);

create index if not exists idx_os_checklist_preventiva_itens_checklist
on public.os_checklist_preventiva_itens (checklist_id);

drop trigger if exists trg_procedimentos_preventiva_updated_at on public.procedimentos_preventiva;
create trigger trg_procedimentos_preventiva_updated_at
before update on public.procedimentos_preventiva
for each row execute function public.set_updated_at();

alter table public.procedimentos_preventiva enable row level security;
alter table public.procedimento_preventiva_itens enable row level security;
alter table public.os_checklists_preventiva enable row level security;
alter table public.os_checklist_preventiva_itens enable row level security;

drop policy if exists "procedimentos_preventiva_select_mesma_organizacao" on public.procedimentos_preventiva;
create policy "procedimentos_preventiva_select_mesma_organizacao"
on public.procedimentos_preventiva
for select
to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "procedimentos_preventiva_insert_admin_gestor_tecnico" on public.procedimentos_preventiva;
create policy "procedimentos_preventiva_insert_admin_gestor_tecnico"
on public.procedimentos_preventiva
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "procedimentos_preventiva_update_admin_gestor_tecnico" on public.procedimentos_preventiva;
create policy "procedimentos_preventiva_update_admin_gestor_tecnico"
on public.procedimentos_preventiva
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

drop policy if exists "procedimento_preventiva_itens_select_mesma_organizacao" on public.procedimento_preventiva_itens;
create policy "procedimento_preventiva_itens_select_mesma_organizacao"
on public.procedimento_preventiva_itens
for select
to authenticated
using (
  exists (
    select 1 from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "procedimento_preventiva_itens_insert_mesma_organizacao" on public.procedimento_preventiva_itens;
create policy "procedimento_preventiva_itens_insert_mesma_organizacao"
on public.procedimento_preventiva_itens
for insert
to authenticated
with check (
  exists (
    select 1 from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "procedimento_preventiva_itens_update_mesma_organizacao" on public.procedimento_preventiva_itens;
create policy "procedimento_preventiva_itens_update_mesma_organizacao"
on public.procedimento_preventiva_itens
for update
to authenticated
using (
  exists (
    select 1 from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1 from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "procedimento_preventiva_itens_delete_mesma_organizacao" on public.procedimento_preventiva_itens;
create policy "procedimento_preventiva_itens_delete_mesma_organizacao"
on public.procedimento_preventiva_itens
for delete
to authenticated
using (
  exists (
    select 1 from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_checklists_preventiva_select_mesma_organizacao" on public.os_checklists_preventiva;
create policy "os_checklists_preventiva_select_mesma_organizacao"
on public.os_checklists_preventiva
for select
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = os_checklists_preventiva.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "os_checklists_preventiva_insert_mesma_organizacao" on public.os_checklists_preventiva;
create policy "os_checklists_preventiva_insert_mesma_organizacao"
on public.os_checklists_preventiva
for insert
to authenticated
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = os_checklists_preventiva.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_checklists_preventiva_update_mesma_organizacao" on public.os_checklists_preventiva;
create policy "os_checklists_preventiva_update_mesma_organizacao"
on public.os_checklists_preventiva
for update
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = os_checklists_preventiva.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = os_checklists_preventiva.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_checklist_preventiva_itens_select_mesma_organizacao" on public.os_checklist_preventiva_itens;
create policy "os_checklist_preventiva_itens_select_mesma_organizacao"
on public.os_checklist_preventiva_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.os_checklists_preventiva c
    join public.ordens_servico os on os.id = c.ordem_servico_id
    where c.id = os_checklist_preventiva_itens.checklist_id
      and os.organizacao_id = public.current_organizacao_id()
  )
);

drop policy if exists "os_checklist_preventiva_itens_insert_mesma_organizacao" on public.os_checklist_preventiva_itens;
create policy "os_checklist_preventiva_itens_insert_mesma_organizacao"
on public.os_checklist_preventiva_itens
for insert
to authenticated
with check (
  exists (
    select 1
    from public.os_checklists_preventiva c
    join public.ordens_servico os on os.id = c.ordem_servico_id
    where c.id = os_checklist_preventiva_itens.checklist_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_checklist_preventiva_itens_update_mesma_organizacao" on public.os_checklist_preventiva_itens;
create policy "os_checklist_preventiva_itens_update_mesma_organizacao"
on public.os_checklist_preventiva_itens
for update
to authenticated
using (
  exists (
    select 1
    from public.os_checklists_preventiva c
    join public.ordens_servico os on os.id = c.ordem_servico_id
    where c.id = os_checklist_preventiva_itens.checklist_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  exists (
    select 1
    from public.os_checklists_preventiva c
    join public.ordens_servico os on os.id = c.ordem_servico_id
    where c.id = os_checklist_preventiva_itens.checklist_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "os_checklist_preventiva_itens_delete_mesma_organizacao" on public.os_checklist_preventiva_itens;
create policy "os_checklist_preventiva_itens_delete_mesma_organizacao"
on public.os_checklist_preventiva_itens
for delete
to authenticated
using (
  exists (
    select 1
    from public.os_checklists_preventiva c
    join public.ordens_servico os on os.id = c.ordem_servico_id
    where c.id = os_checklist_preventiva_itens.checklist_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

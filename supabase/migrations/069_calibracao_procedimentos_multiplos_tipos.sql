-- ============================================================
-- EngClinica Pro
-- Migration: 069_calibracao_procedimentos_multiplos_tipos.sql
-- Objetivo:
-- - Permitir que um procedimento de calibracao seja aplicavel
--   a mais de um tipo de equipamento
-- ============================================================

create table if not exists public.calibracao_procedimento_tipos_equipamento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  procedimento_id uuid not null references public.calibracao_procedimentos(id) on delete cascade,
  tipo_equipamento_id uuid not null references public.tipos_equipamento(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  constraint calibracao_procedimento_tipos_unique unique (procedimento_id, tipo_equipamento_id)
);

create index if not exists idx_calibracao_procedimento_tipos_procedimento
on public.calibracao_procedimento_tipos_equipamento (procedimento_id);

create index if not exists idx_calibracao_procedimento_tipos_tipo
on public.calibracao_procedimento_tipos_equipamento (tipo_equipamento_id);

insert into public.calibracao_procedimento_tipos_equipamento (
  organizacao_id,
  procedimento_id,
  tipo_equipamento_id
)
select
  p.organizacao_id,
  p.id,
  p.tipo_equipamento_id
from public.calibracao_procedimentos p
where p.tipo_equipamento_id is not null
  and not exists (
    select 1
    from public.calibracao_procedimento_tipos_equipamento vinculo
    where vinculo.procedimento_id = p.id
      and vinculo.tipo_equipamento_id = p.tipo_equipamento_id
  );

alter table public.calibracao_procedimento_tipos_equipamento enable row level security;

drop policy if exists "calibracao_procedimento_tipos_select_mesma_organizacao"
on public.calibracao_procedimento_tipos_equipamento;
create policy "calibracao_procedimento_tipos_select_mesma_organizacao"
on public.calibracao_procedimento_tipos_equipamento
for select to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "calibracao_procedimento_tipos_insert_admin_gestor_tecnico"
on public.calibracao_procedimento_tipos_equipamento;
create policy "calibracao_procedimento_tipos_insert_admin_gestor_tecnico"
on public.calibracao_procedimento_tipos_equipamento
for insert to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and coalesce(public.current_user_perfil(), '') in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_procedimento_tipos_delete_admin_gestor_tecnico"
on public.calibracao_procedimento_tipos_equipamento;
create policy "calibracao_procedimento_tipos_delete_admin_gestor_tecnico"
on public.calibracao_procedimento_tipos_equipamento
for delete to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and coalesce(public.current_user_perfil(), '') in ('admin', 'gestor', 'tecnico')
);

notify pgrst, 'reload schema';

-- Fim da migration 069_calibracao_procedimentos_multiplos_tipos.sql

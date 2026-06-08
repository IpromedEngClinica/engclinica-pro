-- ============================================================
-- EngClinica Pro
-- Migration: 034_planos_relatorios_anuais.sql
-- Objetivo:
-- - Registrar historico de relatorios anuais dos planos
-- - Controlar periodo, revisao, validade e tipo de saida
-- ============================================================

create table if not exists public.plano_relatorios_anuais (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  plano_id uuid not null references public.planos(id) on delete cascade,
  modo_periodo text not null,
  data_inicio date not null,
  data_fim date not null,
  ano_referencia integer null,
  mes_inicial integer not null,
  revisao integer not null default 1,
  validade_meses integer not null default 12,
  emitido_em date not null default current_date,
  validade_ate date not null,
  incluir_preventiva boolean not null default true,
  incluir_calibracao boolean not null default true,
  incluir_seguranca_eletrica boolean not null default true,
  incluir_inativos boolean not null default false,
  agrupar_por_setor boolean not null default true,
  tipo_saida text not null default 'cronograma',
  arquivo_url text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  constraint plano_relatorios_anuais_modo_check check (modo_periodo in ('ano_civil', 'periodo_movel')),
  constraint plano_relatorios_anuais_tipo_saida_check check (tipo_saida in ('cronograma', 'cronograma_completo')),
  constraint plano_relatorios_anuais_validade_check check (validade_meses > 0),
  constraint plano_relatorios_anuais_mes_check check (mes_inicial between 1 and 12)
);

create index if not exists idx_plano_relatorios_anuais_plano
on public.plano_relatorios_anuais (plano_id);

create index if not exists idx_plano_relatorios_anuais_periodo
on public.plano_relatorios_anuais (plano_id, data_inicio, data_fim);

alter table public.plano_relatorios_anuais enable row level security;

drop policy if exists "plano_relatorios_anuais_select_mesma_organizacao" on public.plano_relatorios_anuais;
create policy "plano_relatorios_anuais_select_mesma_organizacao"
on public.plano_relatorios_anuais
for select to authenticated
using (organizacao_id = public.current_organizacao_id());

drop policy if exists "plano_relatorios_anuais_write_admin_gestor_tecnico" on public.plano_relatorios_anuais;
create policy "plano_relatorios_anuais_write_admin_gestor_tecnico"
on public.plano_relatorios_anuais
for all to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.planos p
    where p.id = plano_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 034_planos_relatorios_anuais.sql
-- ============================================================

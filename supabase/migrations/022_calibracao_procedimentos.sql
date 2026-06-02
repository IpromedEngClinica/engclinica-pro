-- ============================================================
-- EngClinica Pro
-- Migration: 022_calibracao_procedimentos.sql
-- Objetivo:
-- - Criar templates reutilizaveis de procedimentos de calibracao
-- - Preparar tabelas, pontos nominais e compatibilidades opcionais
-- ============================================================

create table if not exists public.calibracao_procedimentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  codigo text not null,
  nome text not null,
  tipo_equipamento_id uuid null references public.tipos_equipamento(id) on delete set null,
  descricao text null,
  metodo_referencia text null,
  observacoes text null,
  versao integer not null default 1,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint calibracao_procedimentos_codigo_not_empty check (length(trim(codigo)) > 0),
  constraint calibracao_procedimentos_nome_not_empty check (length(trim(nome)) > 0),
  constraint calibracao_procedimentos_versao_check check (versao >= 1)
);

create table if not exists public.calibracao_procedimento_tabelas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  procedimento_id uuid not null references public.calibracao_procedimentos(id) on delete cascade,
  nome text not null,
  grandeza text not null,
  unidade text not null,
  ordem integer not null default 0,
  modo_preenchimento text not null default 'manual',
  quantidade_leituras integer not null default 1,
  tipo_medida text null,
  resolucao_padrao_default numeric(18,8) null,
  resolucao_equipamento_default numeric(18,8) null,
  faixa_uso_min numeric(18,8) null,
  faixa_uso_max numeric(18,8) null,
  capacidade_min numeric(18,8) null,
  capacidade_max numeric(18,8) null,
  fator_confiabilidade_modo text not null default 'calcular_95',
  fator_k_fixo numeric(18,8) null,
  incluir_criterio_aceitacao boolean not null default false,
  criterio_aceitacao_tipo text null,
  criterio_aceitacao_valor_maximo numeric(18,8) null,
  criterio_aceitacao_valor_minimo numeric(18,8) null,
  corrigir_erro_sistematico boolean not null default false,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  constraint calibracao_procedimento_tabelas_nome_not_empty check (length(trim(nome)) > 0),
  constraint calibracao_procedimento_tabelas_grandeza_not_empty check (length(trim(grandeza)) > 0),
  constraint calibracao_procedimento_tabelas_unidade_not_empty check (length(trim(unidade)) > 0),
  constraint calibracao_procedimento_tabelas_modo_check check (modo_preenchimento in ('manual', 'automatico')),
  constraint calibracao_procedimento_tabelas_qtd_leituras_check check (quantidade_leituras >= 1),
  constraint calibracao_procedimento_tabelas_fator_confiabilidade_check check (
    fator_confiabilidade_modo in ('calcular_95', 'k_fixo', 'manual_execucao')
  ),
  constraint calibracao_procedimento_tabelas_fator_k_check check (
    fator_confiabilidade_modo <> 'k_fixo' or fator_k_fixo is not null
  ),
  constraint calibracao_procedimento_tabelas_criterio_tipo_check check (
    criterio_aceitacao_tipo is null or criterio_aceitacao_tipo in ('absoluto', 'percentual', 'faixa')
  ),
  constraint calibracao_procedimento_tabelas_criterio_check check (
    not incluir_criterio_aceitacao
    or (
      criterio_aceitacao_tipo is not null
      and criterio_aceitacao_valor_maximo is not null
      and (criterio_aceitacao_tipo <> 'faixa' or criterio_aceitacao_valor_minimo is not null)
    )
  ),
  constraint calibracao_procedimento_tabelas_faixa_uso_check check (
    faixa_uso_min is null or faixa_uso_max is null or faixa_uso_max >= faixa_uso_min
  ),
  constraint calibracao_procedimento_tabelas_capacidade_check check (
    capacidade_min is null or capacidade_max is null or capacidade_max >= capacidade_min
  )
);

create table if not exists public.calibracao_procedimento_pontos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  tabela_id uuid not null references public.calibracao_procedimento_tabelas(id) on delete cascade,
  ordem integer not null default 0,
  valor_nominal numeric(18,8) not null,
  descricao text null,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null
);

create table if not exists public.calibracao_procedimento_padrao_compativel (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  procedimento_tabela_id uuid not null references public.calibracao_procedimento_tabelas(id) on delete cascade,
  padrao_id uuid null references public.calibracao_padroes(id) on delete cascade,
  padrao_tabela_id uuid null references public.calibracao_padrao_tabelas(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  constraint calibracao_procedimento_padrao_compativel_referencia_check check (
    padrao_id is not null or padrao_tabela_id is not null
  )
);

create unique index if not exists idx_calibracao_procedimentos_codigo_versao
on public.calibracao_procedimentos (organizacao_id, codigo, versao);

create index if not exists idx_calibracao_procedimentos_organizacao
on public.calibracao_procedimentos (organizacao_id);
create index if not exists idx_calibracao_procedimentos_tipo_equipamento
on public.calibracao_procedimentos (tipo_equipamento_id);
create index if not exists idx_calibracao_procedimento_tabelas_procedimento
on public.calibracao_procedimento_tabelas (procedimento_id);
create index if not exists idx_calibracao_procedimento_pontos_tabela
on public.calibracao_procedimento_pontos (tabela_id);
create index if not exists idx_calibracao_procedimento_padrao_compativel_tabela
on public.calibracao_procedimento_padrao_compativel (procedimento_tabela_id);

drop trigger if exists trg_calibracao_procedimentos_updated_at on public.calibracao_procedimentos;
create trigger trg_calibracao_procedimentos_updated_at before update on public.calibracao_procedimentos
for each row execute function public.set_updated_at();
drop trigger if exists trg_calibracao_procedimento_tabelas_updated_at on public.calibracao_procedimento_tabelas;
create trigger trg_calibracao_procedimento_tabelas_updated_at before update on public.calibracao_procedimento_tabelas
for each row execute function public.set_updated_at();
drop trigger if exists trg_calibracao_procedimento_pontos_updated_at on public.calibracao_procedimento_pontos;
create trigger trg_calibracao_procedimento_pontos_updated_at before update on public.calibracao_procedimento_pontos
for each row execute function public.set_updated_at();

alter table public.calibracao_procedimentos enable row level security;
alter table public.calibracao_procedimento_tabelas enable row level security;
alter table public.calibracao_procedimento_pontos enable row level security;
alter table public.calibracao_procedimento_padrao_compativel enable row level security;

drop policy if exists "calibracao_procedimentos_select_mesma_organizacao" on public.calibracao_procedimentos;
create policy "calibracao_procedimentos_select_mesma_organizacao" on public.calibracao_procedimentos
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "calibracao_procedimentos_insert_admin_gestor_tecnico" on public.calibracao_procedimentos;
create policy "calibracao_procedimentos_insert_admin_gestor_tecnico" on public.calibracao_procedimentos
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimentos_update_admin_gestor_tecnico" on public.calibracao_procedimentos;
create policy "calibracao_procedimentos_update_admin_gestor_tecnico" on public.calibracao_procedimentos
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_procedimento_tabelas_select_mesma_organizacao" on public.calibracao_procedimento_tabelas;
create policy "calibracao_procedimento_tabelas_select_mesma_organizacao" on public.calibracao_procedimento_tabelas
for select to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.calibracao_procedimentos p where p.id = procedimento_id and p.organizacao_id = public.current_organizacao_id())
);
drop policy if exists "calibracao_procedimento_tabelas_insert_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas;
create policy "calibracao_procedimento_tabelas_insert_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.calibracao_procedimentos p where p.id = procedimento_id and p.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_tabelas_update_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas;
create policy "calibracao_procedimento_tabelas_update_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.calibracao_procedimentos p where p.id = procedimento_id and p.organizacao_id = public.current_organizacao_id())
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_tabelas_delete_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas;
create policy "calibracao_procedimento_tabelas_delete_admin_gestor_tecnico" on public.calibracao_procedimento_tabelas
for delete to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_procedimento_pontos_select_mesma_organizacao" on public.calibracao_procedimento_pontos;
create policy "calibracao_procedimento_pontos_select_mesma_organizacao" on public.calibracao_procedimento_pontos
for select to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_procedimento_tabelas t
    join public.calibracao_procedimentos p on p.id = t.procedimento_id
    where t.id = tabela_id and p.organizacao_id = public.current_organizacao_id()
  )
);
drop policy if exists "calibracao_procedimento_pontos_insert_admin_gestor_tecnico" on public.calibracao_procedimento_pontos;
create policy "calibracao_procedimento_pontos_insert_admin_gestor_tecnico" on public.calibracao_procedimento_pontos
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_procedimento_tabelas t
    join public.calibracao_procedimentos p on p.id = t.procedimento_id
    where t.id = tabela_id and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_pontos_update_admin_gestor_tecnico" on public.calibracao_procedimento_pontos;
create policy "calibracao_procedimento_pontos_update_admin_gestor_tecnico" on public.calibracao_procedimento_pontos
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (
    select 1 from public.calibracao_procedimento_tabelas t
    join public.calibracao_procedimentos p on p.id = t.procedimento_id
    where t.id = tabela_id and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_pontos_delete_admin_gestor_tecnico" on public.calibracao_procedimento_pontos;
create policy "calibracao_procedimento_pontos_delete_admin_gestor_tecnico" on public.calibracao_procedimento_pontos
for delete to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_procedimento_compativel_select_mesma_organizacao" on public.calibracao_procedimento_padrao_compativel;
create policy "calibracao_procedimento_compativel_select_mesma_organizacao" on public.calibracao_procedimento_padrao_compativel
for select to authenticated using (organizacao_id = public.current_organizacao_id());
drop policy if exists "calibracao_procedimento_compativel_insert_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel;
create policy "calibracao_procedimento_compativel_insert_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel
for insert to authenticated with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.calibracao_procedimento_tabelas t where t.id = procedimento_tabela_id and t.organizacao_id = public.current_organizacao_id())
  and (padrao_id is null or exists (select 1 from public.calibracao_padroes p where p.id = padrao_id and p.organizacao_id = public.current_organizacao_id()))
  and (padrao_tabela_id is null or exists (select 1 from public.calibracao_padrao_tabelas t where t.id = padrao_tabela_id and t.organizacao_id = public.current_organizacao_id()))
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_compativel_update_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel;
create policy "calibracao_procedimento_compativel_update_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel
for update to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
) with check (
  organizacao_id = public.current_organizacao_id()
  and exists (select 1 from public.calibracao_procedimento_tabelas t where t.id = procedimento_tabela_id and t.organizacao_id = public.current_organizacao_id())
  and (padrao_id is null or exists (select 1 from public.calibracao_padroes p where p.id = padrao_id and p.organizacao_id = public.current_organizacao_id()))
  and (padrao_tabela_id is null or exists (select 1 from public.calibracao_padrao_tabelas t where t.id = padrao_tabela_id and t.organizacao_id = public.current_organizacao_id()))
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);
drop policy if exists "calibracao_procedimento_compativel_delete_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel;
create policy "calibracao_procedimento_compativel_delete_admin_gestor_tecnico" on public.calibracao_procedimento_padrao_compativel
for delete to authenticated using (
  organizacao_id = public.current_organizacao_id()
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

-- As execucoes futuras devem copiar tabelas, pontos e configuracoes como snapshot.

-- ============================================================
-- Fim da migration 022_calibracao_procedimentos.sql
-- ============================================================

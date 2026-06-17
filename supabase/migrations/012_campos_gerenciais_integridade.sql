-- ============================================================
-- EngClinica Pro
-- Migration: 012_campos_gerenciais_integridade.sql
-- Objetivo:
-- - Garantir colunas/FKs dos campos gerenciais em bancos existentes
-- - Migrar dados legados de texto para cadastros gerenciais quando possível
-- - Criar cadastros mínimos usados por OS, protocolos e orçamentos
-- ============================================================

-- ============================================================
-- 1. Garantia de colunas
-- ============================================================

alter table public.equipamentos
add column if not exists tipo_equipamento_id uuid;

alter table public.equipamentos
add column if not exists tipo_texto text;

alter table public.ordens_servico
add column if not exists tipo_os_id uuid;

alter table public.ordens_servico
add column if not exists estado_os_id uuid;

alter table public.ordens_servico
add column if not exists status_sistema text not null default 'aberta';

alter table public.ordens_servico
add column if not exists data_fechamento timestamp with time zone;

alter table public.orcamento_itens
add column if not exists tipo_servico_id uuid;

alter table public.orcamento_itens
add column if not exists tipo_equipamento_id uuid;

alter table public.orcamento_itens
add column if not exists peca_id uuid;

alter table public.orcamento_itens
add column if not exists peca_nome text;

alter table public.orcamento_itens
add column if not exists garantia text;

-- ============================================================
-- 2. Limpeza de IDs órfãos antes de reforçar foreign keys
-- ============================================================

update public.equipamentos e
set tipo_equipamento_id = null
where e.tipo_equipamento_id is not null
  and not exists (
    select 1
    from public.tipos_equipamento te
    where te.id = e.tipo_equipamento_id
  );

update public.ordens_servico os
set tipo_os_id = null
where os.tipo_os_id is not null
  and not exists (
    select 1
    from public.tipos_os tos
    where tos.id = os.tipo_os_id
  );

update public.ordens_servico os
set estado_os_id = null
where os.estado_os_id is not null
  and not exists (
    select 1
    from public.estados_os estado
    where estado.id = os.estado_os_id
  );

update public.orcamento_itens oi
set tipo_servico_id = null
where oi.tipo_servico_id is not null
  and not exists (
    select 1
    from public.tipos_os tos
    where tos.id = oi.tipo_servico_id
  );

update public.orcamento_itens oi
set tipo_equipamento_id = null
where oi.tipo_equipamento_id is not null
  and not exists (
    select 1
    from public.tipos_equipamento te
    where te.id = oi.tipo_equipamento_id
  );

update public.orcamento_itens oi
set peca_id = null
where oi.peca_id is not null
  and not exists (
    select 1
    from public.pecas p
    where p.id = oi.peca_id
  );

-- ============================================================
-- 3. Garantia de foreign keys quando a coluna já existia sem vínculo
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.equipamentos'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.equipamentos'::regclass
            and attname = 'tipo_equipamento_id'
        )
      ]::smallint[]
      and confrelid = 'public.tipos_equipamento'::regclass
  ) then
    alter table public.equipamentos
    add constraint fk_equipamentos_tipo_equipamento
    foreign key (tipo_equipamento_id)
    references public.tipos_equipamento(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ordens_servico'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.ordens_servico'::regclass
            and attname = 'tipo_os_id'
        )
      ]::smallint[]
      and confrelid = 'public.tipos_os'::regclass
  ) then
    alter table public.ordens_servico
    add constraint fk_ordens_servico_tipo_os
    foreign key (tipo_os_id)
    references public.tipos_os(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ordens_servico'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.ordens_servico'::regclass
            and attname = 'estado_os_id'
        )
      ]::smallint[]
      and confrelid = 'public.estados_os'::regclass
  ) then
    alter table public.ordens_servico
    add constraint fk_ordens_servico_estado_os
    foreign key (estado_os_id)
    references public.estados_os(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orcamento_itens'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.orcamento_itens'::regclass
            and attname = 'tipo_servico_id'
        )
      ]::smallint[]
      and confrelid = 'public.tipos_os'::regclass
  ) then
    alter table public.orcamento_itens
    add constraint fk_orcamento_itens_tipo_servico
    foreign key (tipo_servico_id)
    references public.tipos_os(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orcamento_itens'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.orcamento_itens'::regclass
            and attname = 'tipo_equipamento_id'
        )
      ]::smallint[]
      and confrelid = 'public.tipos_equipamento'::regclass
  ) then
    alter table public.orcamento_itens
    add constraint fk_orcamento_itens_tipo_equipamento
    foreign key (tipo_equipamento_id)
    references public.tipos_equipamento(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orcamento_itens'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.orcamento_itens'::regclass
            and attname = 'peca_id'
        )
      ]::smallint[]
      and confrelid = 'public.pecas'::regclass
  ) then
    alter table public.orcamento_itens
    add constraint fk_orcamento_itens_peca
    foreign key (peca_id)
    references public.pecas(id)
    on delete set null;
  end if;
end $$;

-- ============================================================
-- 4. Garantia de constraints operacionais
-- ============================================================

update public.ordens_servico
set status_sistema = 'aberta'
where status_sistema is null
  or status_sistema not in ('aberta', 'fechada', 'cancelada');

alter table public.ordens_servico
alter column status_sistema set default 'aberta';

alter table public.ordens_servico
alter column status_sistema set not null;

alter table public.ordens_servico
drop constraint if exists ordens_servico_status_sistema_check;

alter table public.ordens_servico
add constraint ordens_servico_status_sistema_check check (
  status_sistema in ('aberta', 'fechada', 'cancelada')
);

-- ============================================================
-- 5. Cadastros mínimos para fluxos automáticos
-- ============================================================

insert into public.tipos_os (
  organizacao_id,
  nome,
  descricao,
  exige_equipamento,
  gera_orcamento,
  ativo
)
select
  o.id,
  v.nome,
  v.descricao,
  v.exige_equipamento,
  v.gera_orcamento,
  true
from public.organizacoes o
cross join (
  values
    ('Entrada de Equipamentos', 'Entrada de equipamento para avaliação/orçamento.', true, true),
    ('Orçamentar', 'OS para elaboração de orçamento.', true, true),
    ('Manutenção Corretiva', 'Correção de falha ou defeito.', true, true)
) as v(nome, descricao, exige_equipamento, gera_orcamento)
on conflict (organizacao_id, nome) do update
set ativo = true,
    descricao = coalesce(tipos_os.descricao, excluded.descricao),
    exige_equipamento = excluded.exige_equipamento,
    gera_orcamento = excluded.gera_orcamento;

insert into public.estados_os (
  organizacao_id,
  nome,
  descricao,
  finaliza_os,
  cancela_os,
  ordem,
  ativo
)
select
  o.id,
  v.nome,
  v.descricao,
  v.finaliza_os,
  v.cancela_os,
  v.ordem,
  true
from public.organizacoes o
cross join (
  values
    ('Aberta', 'OS aberta e aguardando andamento.', false, false, 10),
    ('Entrada de Equipamento para Orçamento', 'Equipamento recebido para avaliação/orçamento.', false, false, 80),
    ('Equipamento Entregue', 'Equipamento entregue ao cliente e OS encerrada.', true, false, 890),
    ('Fechada', 'OS finalizada e encerrada.', true, false, 900),
    ('Cancelada', 'OS cancelada.', false, true, 999)
) as v(nome, descricao, finaliza_os, cancela_os, ordem)
on conflict (organizacao_id, nome) do update
set ativo = true,
    descricao = coalesce(estados_os.descricao, excluded.descricao),
    finaliza_os = excluded.finaliza_os,
    cancela_os = excluded.cancela_os,
    ordem = excluded.ordem;

-- ============================================================
-- 6. Backfill: equipamentos.tipo_texto -> tipos_equipamento
-- ============================================================

insert into public.tipos_equipamento (
  organizacao_id,
  nome,
  ativo
)
select distinct
  e.organizacao_id,
  trim(e.tipo_texto),
  true
from public.equipamentos e
where e.tipo_equipamento_id is null
  and nullif(trim(e.tipo_texto), '') is not null
on conflict (organizacao_id, nome) do update
set ativo = true;

update public.equipamentos e
set tipo_equipamento_id = te.id
from public.tipos_equipamento te
where e.tipo_equipamento_id is null
  and nullif(trim(e.tipo_texto), '') is not null
  and te.organizacao_id = e.organizacao_id
  and lower(trim(te.nome)) = lower(trim(e.tipo_texto));

-- ============================================================
-- 7. Backfill: itens de orçamento -> peças cadastradas
-- ============================================================

insert into public.pecas (
  organizacao_id,
  nome,
  unidade,
  ativo
)
select distinct
  o.organizacao_id,
  trim(coalesce(nullif(oi.peca_nome, ''), oi.descricao)),
  'un',
  true
from public.orcamento_itens oi
join public.orcamentos o on o.id = oi.orcamento_id
where oi.tipo = 'peca'
  and oi.peca_id is null
  and nullif(trim(coalesce(nullif(oi.peca_nome, ''), oi.descricao)), '') is not null
on conflict (organizacao_id, nome) do update
set ativo = true;

update public.orcamento_itens oi
set
  peca_id = p.id,
  peca_nome = p.nome
from public.orcamentos o
join public.pecas p on p.organizacao_id = o.organizacao_id
where oi.orcamento_id = o.id
  and oi.tipo = 'peca'
  and oi.peca_id is null
  and lower(trim(p.nome)) = lower(trim(coalesce(nullif(oi.peca_nome, ''), oi.descricao)));

update public.orcamento_itens oi
set peca_nome = coalesce(p.nome, oi.descricao)
from public.pecas p
where oi.peca_id = p.id
  and oi.tipo = 'peca'
  and nullif(trim(coalesce(oi.peca_nome, '')), '') is null;

-- ============================================================
-- 8. Backfill conservador: itens de serviço por nome exato
-- ============================================================

update public.orcamento_itens oi
set tipo_servico_id = tos.id
from public.orcamentos o
join public.tipos_os tos on tos.organizacao_id = o.organizacao_id
where oi.orcamento_id = o.id
  and oi.tipo = 'servico'
  and oi.tipo_servico_id is null
  and lower(trim(oi.descricao)) = lower(trim(tos.nome));

update public.orcamento_itens oi
set tipo_equipamento_id = te.id
from public.orcamentos o
join public.tipos_equipamento te on te.organizacao_id = o.organizacao_id
where oi.orcamento_id = o.id
  and oi.tipo = 'servico'
  and oi.tipo_equipamento_id is null
  and lower(trim(oi.descricao)) = lower(trim(te.nome));

-- ============================================================
-- 9. Backfill: OS sem estado/tipo/status operacional
-- ============================================================

update public.ordens_servico os
set estado_os_id = estado.id
from public.estados_os estado
where os.estado_os_id is null
  and estado.organizacao_id = os.organizacao_id
  and lower(estado.nome) = 'aberta';

update public.ordens_servico os
set status_sistema = case
  when estado.finaliza_os then 'fechada'
  when estado.cancela_os then 'cancelada'
  else 'aberta'
end
from public.estados_os estado
where os.estado_os_id = estado.id;

update public.ordens_servico os
set data_fechamento = coalesce(os.data_fechamento, os.updated_at, now())
from public.estados_os estado
where os.estado_os_id = estado.id
  and estado.finaliza_os = true
  and os.data_fechamento is null;

update public.ordens_servico os
set data_fechamento = null
from public.estados_os estado
where os.estado_os_id = estado.id
  and estado.finaliza_os = false
  and os.status_sistema = 'aberta';

-- ============================================================
-- 10. Índices de apoio
-- ============================================================

create index if not exists idx_equipamentos_tipo
on public.equipamentos (tipo_equipamento_id);

create index if not exists idx_os_tipo
on public.ordens_servico (tipo_os_id);

create index if not exists idx_os_estado
on public.ordens_servico (estado_os_id);

create index if not exists idx_os_status_sistema
on public.ordens_servico (status_sistema);

create index if not exists idx_orcamento_itens_tipo_servico
on public.orcamento_itens (tipo_servico_id);

create index if not exists idx_orcamento_itens_tipo_equipamento
on public.orcamento_itens (tipo_equipamento_id);

create index if not exists idx_orcamento_itens_peca
on public.orcamento_itens (peca_id);

-- ============================================================
-- Fim da migration 012_campos_gerenciais_integridade.sql
-- ============================================================

-- ============================================================
-- EngClinica Pro
-- Migration: 077_ordens_servico_numero_ordem.sql
-- Objetivo:
-- - Ordenar ordens de servico por numero numerico, nao textual
-- - Manter compatibilidade com o campo numero em texto
-- ============================================================

alter table public.ordens_servico
  add column if not exists numero_ordem bigint;

create or replace function public.set_ordem_servico_numero_ordem()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_digits text;
begin
  v_digits := regexp_replace(coalesce(new.numero, ''), '\D', '', 'g');
  new.numero_ordem := nullif(v_digits, '')::bigint;
  return new;
end;
$$;

update public.ordens_servico
set numero_ordem = nullif(regexp_replace(coalesce(numero, ''), '\D', '', 'g'), '')::bigint
where numero_ordem is distinct from nullif(regexp_replace(coalesce(numero, ''), '\D', '', 'g'), '')::bigint;

drop trigger if exists trg_set_ordem_servico_numero_ordem on public.ordens_servico;

create trigger trg_set_ordem_servico_numero_ordem
before insert or update of numero on public.ordens_servico
for each row
execute function public.set_ordem_servico_numero_ordem();

create index if not exists idx_os_listagem_ativos_numero_ordem
  on public.ordens_servico (ativo, numero_ordem desc);

create index if not exists idx_os_listagem_status_numero_ordem
  on public.ordens_servico (ativo, status_sistema, numero_ordem desc);

create index if not exists idx_os_listagem_estado_numero_ordem
  on public.ordens_servico (estado_os_id, ativo, numero_ordem desc);

create index if not exists idx_os_listagem_tipo_numero_ordem
  on public.ordens_servico (tipo_os_id, ativo, numero_ordem desc);

create index if not exists idx_os_listagem_empresa_numero_ordem
  on public.ordens_servico (empresa_id, ativo, numero_ordem desc);

create index if not exists idx_os_listagem_equipamento_numero_ordem
  on public.ordens_servico (equipamento_id, ativo, numero_ordem desc);

create index if not exists idx_os_listagem_responsavel_numero_ordem
  on public.ordens_servico (responsavel_texto, ativo, numero_ordem desc);

notify pgrst, 'reload schema';

-- Fim da migration 077_ordens_servico_numero_ordem.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 073_recalcular_status_equipamentos_por_os_trigger.sql
-- Objetivo:
-- - Reforcar status de equipamentos conforme OS abertas
-- - Ignorar OS de manutencao preventiva na regra de manutencao
-- - Preservar status Locado para equipamentos ACI com termo ativo
-- ============================================================

create or replace function public.recalcular_status_equipamento_por_os(
  p_equipamento_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_equipamento_id is null then
    return;
  end if;

  update public.equipamentos eq
  set
    status = case
      when public.is_equipamento_aci(eq.id)
        and public.equipamento_tem_termo_ativo(eq.id)
        then 'Locado'
      when exists (
        select 1
        from public.ordens_servico os
        left join public.tipos_os tos on tos.id = os.tipo_os_id
        where os.equipamento_id = eq.id
          and os.ativo = true
          and os.status_sistema = 'aberta'
          and lower(coalesce(tos.nome, '')) not like '%preventiva%'
      )
        then 'Em manutenção'
      else 'Ativo'
    end,
    updated_at = now()
  where eq.id = p_equipamento_id
    and eq.ativo = true
    and eq.status is distinct from case
      when public.is_equipamento_aci(eq.id)
        and public.equipamento_tem_termo_ativo(eq.id)
        then 'Locado'
      when exists (
        select 1
        from public.ordens_servico os
        left join public.tipos_os tos on tos.id = os.tipo_os_id
        where os.equipamento_id = eq.id
          and os.ativo = true
          and os.status_sistema = 'aberta'
          and lower(coalesce(tos.nome, '')) not like '%preventiva%'
      )
        then 'Em manutenção'
      else 'Ativo'
    end;
end;
$$;

create or replace function public.recalcular_status_equipamento_por_os_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_status_equipamento_por_os(old.equipamento_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalcular_status_equipamento_por_os(new.equipamento_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_recalcular_status_equipamento_write
on public.ordens_servico;

drop trigger if exists trg_ordens_servico_recalcular_status_equipamento_update
on public.ordens_servico;

create trigger trg_ordens_servico_recalcular_status_equipamento_write
after insert or delete on public.ordens_servico
for each row
execute function public.recalcular_status_equipamento_por_os_trigger();

create trigger trg_ordens_servico_recalcular_status_equipamento_update
after update of equipamento_id, tipo_os_id, status_sistema, ativo
on public.ordens_servico
for each row
execute function public.recalcular_status_equipamento_por_os_trigger();

update public.equipamentos eq
set
  status = case
    when public.is_equipamento_aci(eq.id)
      and public.equipamento_tem_termo_ativo(eq.id)
      then 'Locado'
    when exists (
      select 1
      from public.ordens_servico os
      left join public.tipos_os tos on tos.id = os.tipo_os_id
      where os.equipamento_id = eq.id
        and os.ativo = true
        and os.status_sistema = 'aberta'
        and lower(coalesce(tos.nome, '')) not like '%preventiva%'
    )
      then 'Em manutenção'
    else 'Ativo'
  end,
  updated_at = now()
where eq.ativo = true
  and eq.status is distinct from case
    when public.is_equipamento_aci(eq.id)
      and public.equipamento_tem_termo_ativo(eq.id)
      then 'Locado'
    when exists (
      select 1
      from public.ordens_servico os
      left join public.tipos_os tos on tos.id = os.tipo_os_id
      where os.equipamento_id = eq.id
        and os.ativo = true
        and os.status_sistema = 'aberta'
        and lower(coalesce(tos.nome, '')) not like '%preventiva%'
    )
      then 'Em manutenção'
    else 'Ativo'
  end;

notify pgrst, 'reload schema';

-- Fim da migration 073_recalcular_status_equipamentos_por_os_trigger.sql

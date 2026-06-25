-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 058_equipamentos_locados_utilitarios.sql
-- Objetivo:
-- - Marcar automaticamente equipamentos da ACI como Locado
-- - Retornar para Ativo quando o termo de locacao/emprestimo encerrar
-- - Impedir alteracao manual do status Locado enquanto houver termo ativo
-- ============================================================

create or replace function public.is_empresa_principal_aci(p_empresa_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.empresas e
    where e.id = p_empresa_id
      and e.ativo = true
      and (
        e.tipo_cliente = 'Principal'
        or regexp_replace(coalesce(e.cpf_cnpj, ''), '\D', '', 'g') = '71208094000137'
      )
  );
$$;

create or replace function public.is_equipamento_aci(p_equipamento_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.equipamentos eq
    where eq.id = p_equipamento_id
      and public.is_empresa_principal_aci(eq.empresa_id)
  );
$$;

create or replace function public.equipamento_tem_termo_ativo(p_equipamento_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.utilitario_termos_locacao t
    where t.equipamento_id = p_equipamento_id
      and t.ativo = true
      and t.status = 'ativo'
  );
$$;

create or replace function public.sincronizar_status_equipamento_locacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipamento_anterior uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_equipamento_anterior := old.equipamento_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if new.ativo = true
      and new.status = 'ativo'
      and public.is_equipamento_aci(new.equipamento_id)
    then
      update public.equipamentos
      set status = 'Locado', updated_at = now()
      where id = new.equipamento_id
        and ativo = true
        and status is distinct from 'Locado';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and v_equipamento_anterior is not null then
    if public.is_equipamento_aci(v_equipamento_anterior)
      and not public.equipamento_tem_termo_ativo(v_equipamento_anterior)
    then
      update public.equipamentos
      set status = 'Ativo', updated_at = now()
      where id = v_equipamento_anterior
        and ativo = true
        and status = 'Locado';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_utilitario_termos_locacao_status_equipamento
on public.utilitario_termos_locacao;

create trigger trg_utilitario_termos_locacao_status_equipamento
after insert or update or delete on public.utilitario_termos_locacao
for each row
execute function public.sincronizar_status_equipamento_locacao();

create or replace function public.proteger_status_equipamento_locado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ativo = true
    and public.is_empresa_principal_aci(new.empresa_id)
    and public.equipamento_tem_termo_ativo(new.id)
  then
    new.status := 'Locado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipamentos_proteger_status_locado
on public.equipamentos;

create trigger trg_equipamentos_proteger_status_locado
before insert or update on public.equipamentos
for each row
execute function public.proteger_status_equipamento_locado();

update public.equipamentos eq
set status = 'Locado', updated_at = now()
where eq.ativo = true
  and public.is_equipamento_aci(eq.id)
  and public.equipamento_tem_termo_ativo(eq.id);

update public.equipamentos eq
set status = 'Ativo', updated_at = now()
where eq.ativo = true
  and eq.status = 'Locado'
  and public.is_equipamento_aci(eq.id)
  and not public.equipamento_tem_termo_ativo(eq.id);

notify pgrst, 'reload schema';

-- Fim da migration 058_equipamentos_locados_utilitarios.sql

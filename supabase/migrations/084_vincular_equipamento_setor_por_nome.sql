-- ============================================================
-- EngClinica Pro
-- Migration: 084_vincular_equipamento_setor_por_nome.sql
-- Objetivo:
-- - Vincular automaticamente equipamentos ao setor oficial da empresa
--   quando o texto do setor corresponder a empresa_setores.nome
-- - Corrigir equipamentos ja cadastrados com setor textual sem vinculo
-- ============================================================

create or replace function public.preencher_equipamento_empresa_setor()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_setor public.empresa_setores%rowtype;
begin
  if new.empresa_id is null then
    return new;
  end if;

  if new.empresa_setor_id is not null then
    select *
    into v_setor
    from public.empresa_setores
    where id = new.empresa_setor_id
      and empresa_id = new.empresa_id
      and ativo = true
    limit 1;

    if found then
      new.setor := v_setor.nome;
    end if;

    return new;
  end if;

  if nullif(trim(coalesce(new.setor, '')), '') is null then
    new.empresa_setor_id := null;
    new.setor := null;
    return new;
  end if;

  select *
  into v_setor
  from public.empresa_setores
  where empresa_id = new.empresa_id
    and ativo = true
    and lower(trim(nome)) = lower(trim(new.setor))
  limit 1;

  if found then
    new.empresa_setor_id := v_setor.id;
    new.setor := v_setor.nome;
  else
    new.empresa_setor_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipamentos_preencher_empresa_setor
on public.equipamentos;

create trigger trg_equipamentos_preencher_empresa_setor
before insert or update of empresa_id, setor, empresa_setor_id on public.equipamentos
for each row
execute function public.preencher_equipamento_empresa_setor();

update public.equipamentos e
set
  empresa_setor_id = s.id,
  setor = s.nome,
  updated_at = now()
from public.empresa_setores s
where e.empresa_id = s.empresa_id
  and s.ativo = true
  and e.setor is not null
  and lower(trim(e.setor)) = lower(trim(s.nome))
  and (
    e.empresa_setor_id is distinct from s.id
    or e.setor is distinct from s.nome
  );

notify pgrst, 'reload schema';

-- Fim da migration 084_vincular_equipamento_setor_por_nome.sql

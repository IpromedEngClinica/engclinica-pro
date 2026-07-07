-- ============================================================
-- EngClinica Pro
-- Migration: 068_sincronizar_setores_empresa_equipamentos.sql
-- Objetivo:
-- - Sincronizar texto do setor em equipamentos quando o setor oficial muda
-- - Limpar vinculo dos equipamentos quando o setor oficial e inativado
-- ============================================================

create or replace function public.sincronizar_equipamentos_empresa_setor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.ativo = true and new.ativo = false then
      update public.equipamentos
      set
        empresa_setor_id = null,
        setor = null,
        local_instalacao = null,
        updated_at = now()
      where empresa_setor_id = old.id;

      return new;
    end if;

    if new.ativo = true and old.nome is distinct from new.nome then
      update public.equipamentos
      set
        setor = new.nome,
        updated_at = now()
      where empresa_setor_id = new.id
        and empresa_id = new.empresa_id
        and organizacao_id = new.organizacao_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_empresa_setores_sincronizar_equipamentos
on public.empresa_setores;

create trigger trg_empresa_setores_sincronizar_equipamentos
after update of nome, ativo on public.empresa_setores
for each row
execute function public.sincronizar_equipamentos_empresa_setor();

-- Corrige divergencias ja existentes entre setor oficial e texto salvo.
update public.equipamentos e
set
  setor = s.nome,
  updated_at = now()
from public.empresa_setores s
where e.empresa_setor_id = s.id
  and s.ativo = true
  and e.setor is distinct from s.nome;

notify pgrst, 'reload schema';

-- Fim da migration 068_sincronizar_setores_empresa_equipamentos.sql

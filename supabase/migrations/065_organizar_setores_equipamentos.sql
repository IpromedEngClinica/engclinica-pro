-- ============================================================
-- EngClinica Pro
-- Migration: 065_organizar_setores_equipamentos.sql
-- Objetivo:
-- - Vincular equipamentos aos setores oficiais da empresa
-- - Preservar o texto legado de setor e separar local/sala interno
-- ============================================================

alter table public.equipamentos
  add column if not exists empresa_setor_id uuid null references public.empresa_setores(id) on delete set null,
  add column if not exists local_instalacao text;

create index if not exists idx_equipamentos_empresa_setor
on public.equipamentos (empresa_setor_id);

create index if not exists idx_equipamentos_empresa_setor_texto
on public.equipamentos (empresa_id, setor);

create or replace function public.validar_equipamento_empresa_setor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_setor_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.empresa_setores s
    where s.id = new.empresa_setor_id
      and s.empresa_id = new.empresa_id
      and s.organizacao_id = new.organizacao_id
      and s.ativo = true
  ) then
    raise exception 'Setor oficial nao pertence ao cliente do equipamento.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipamentos_validar_empresa_setor on public.equipamentos;
create trigger trg_equipamentos_validar_empresa_setor
before insert or update of organizacao_id, empresa_id, empresa_setor_id on public.equipamentos
for each row
execute function public.validar_equipamento_empresa_setor();

notify pgrst, 'reload schema';

-- Fim da migration 065_organizar_setores_equipamentos.sql

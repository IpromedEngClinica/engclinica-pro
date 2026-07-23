-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 111_sincronizar_proprietario_certificados.sql
-- Objetivo:
-- - Sincronizar o proprietario atual do equipamento nos certificados
-- - Corrigir execucoes existentes cujo equipamento mudou de empresa
-- ============================================================

create or replace function public.sincronizar_proprietario_certificados_equipamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is not distinct from old.empresa_id then
    return new;
  end if;

  update public.calibracao_execucoes
  set
    empresa_id = new.empresa_id,
    updated_at = now()
  where equipamento_id = new.id
    and organizacao_id = new.organizacao_id
    and empresa_id is distinct from new.empresa_id;

  update public.seguranca_eletrica_execucoes
  set
    empresa_id = new.empresa_id,
    updated_at = now()
  where equipamento_id = new.id
    and organizacao_id = new.organizacao_id
    and empresa_id is distinct from new.empresa_id;

  return new;
end;
$$;

alter function public.sincronizar_proprietario_certificados_equipamento() owner to postgres;
revoke all on function public.sincronizar_proprietario_certificados_equipamento() from public;

drop trigger if exists trg_equipamentos_sincronizar_proprietario_certificados
on public.equipamentos;

create trigger trg_equipamentos_sincronizar_proprietario_certificados
after update of empresa_id on public.equipamentos
for each row
execute function public.sincronizar_proprietario_certificados_equipamento();

-- Corrige certificados existentes sem alterar leituras, resultados ou snapshots.
update public.calibracao_execucoes ce
set
  empresa_id = e.empresa_id,
  updated_at = now()
from public.equipamentos e
where e.id = ce.equipamento_id
  and e.organizacao_id = ce.organizacao_id
  and ce.empresa_id is distinct from e.empresa_id;

update public.seguranca_eletrica_execucoes se
set
  empresa_id = e.empresa_id,
  updated_at = now()
from public.equipamentos e
where e.id = se.equipamento_id
  and e.organizacao_id = se.organizacao_id
  and se.empresa_id is distinct from e.empresa_id;

notify pgrst, 'reload schema';

-- Fim da migration 111_sincronizar_proprietario_certificados.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 005_os_sequencial_acessorios.sql
-- Objetivo:
-- - Criar sequencia numerica simples para OS
-- - Iniciar numeracao em 55763, considerando base antiga em 55762
-- - Definir numero automatico na tabela ordens_servico
-- - Permitir exclusao/regravacao de acessorios da OS
-- ============================================================

create sequence if not exists public.ordens_servico_numero_seq
  start with 55763
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

select setval(
  'public.ordens_servico_numero_seq',
  greatest(
    55762,
    coalesce(
      (
        select max(numero::bigint)
        from public.ordens_servico
        where numero ~ '^[0-9]+$'
      ),
      55762
    )
  ),
  true
);

create or replace function public.gerar_numero_os()
returns text
language plpgsql
security definer
as $$
declare
  proximo_numero bigint;
begin
  proximo_numero := nextval('public.ordens_servico_numero_seq');
  return proximo_numero::text;
end;
$$;

alter table public.ordens_servico
alter column numero set default public.gerar_numero_os();

drop policy if exists "os_acessorios_delete_mesma_organizacao" on public.ordem_servico_acessorios;

create policy "os_acessorios_delete_mesma_organizacao"
on public.ordem_servico_acessorios
for delete
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

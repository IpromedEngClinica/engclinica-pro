-- ============================================================
-- EngClinica Pro
-- Reset manual do modulo de planos
--
-- Use apenas em ambiente de teste/desenvolvimento.
-- Rode pelo SQL Editor do Supabase ou por uma conexao admin.
-- ============================================================

begin;

-- Evita bloqueio por FK e preserva as ordens de servico existentes.
update public.ordens_servico
set plano_ciclo_id = null
where plano_ciclo_id is not null;

delete from public.plano_relatorios_anuais;
delete from public.plano_ciclo_itens;
delete from public.plano_ciclo_setores;
delete from public.plano_ciclos;
delete from public.plano_equipamentos;
delete from public.plano_setores;
delete from public.planos;

commit;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim do reset manual
-- ============================================================

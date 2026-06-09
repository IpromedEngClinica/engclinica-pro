-- ============================================================
-- EngClinica Pro
-- Migration: 035_recalcular_status_equipamentos_os.sql
-- Objetivo:
-- - Corrigir status de equipamentos conforme OS abertas
-- - Ignorar OS de manutencao preventiva na regra de manutencao
-- ============================================================

update public.equipamentos e
set
  status = case
    when exists (
      select 1
      from public.ordens_servico os
      left join public.tipos_os tos on tos.id = os.tipo_os_id
      where os.equipamento_id = e.id
        and os.ativo = true
        and os.status_sistema = 'aberta'
        and lower(coalesce(tos.nome, '')) not like '%preventiva%'
    )
      then 'Em manutenção'
    else 'Ativo'
  end,
  updated_at = now()
where e.ativo = true;

-- Fim da migration 035_recalcular_status_equipamentos_os.sql

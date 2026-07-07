-- ============================================================
-- EngClinica Pro
-- Migration: 072_corrigir_status_fechamento_os_estado_final.sql
-- Objetivo:
-- - Sincronizar OS com estado final/cancelado e status interno
-- - Preencher fechamento de OS ja criadas como fechadas usando a abertura
-- ============================================================

update public.ordens_servico os
set
  status_sistema = case
    when estado.finaliza_os then 'fechada'
    when estado.cancela_os then 'cancelada'
    else os.status_sistema
  end,
  data_fechamento = coalesce(
    os.data_fechamento,
    os.data_abertura,
    os.created_at,
    os.updated_at,
    now()
  ),
  updated_at = now()
from public.estados_os estado
where os.estado_os_id = estado.id
  and (estado.finaliza_os or estado.cancela_os)
  and (
    os.data_fechamento is null
    or os.status_sistema is distinct from case
      when estado.finaliza_os then 'fechada'
      when estado.cancela_os then 'cancelada'
      else os.status_sistema
    end
  );

-- Fim da migration 072_corrigir_status_fechamento_os_estado_final.sql

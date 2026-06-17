-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 051_planos_datas_horarios.sql
-- Objetivo:
-- - Permitir horario na abertura e no fechamento previsto dos ciclos
-- - Corrigir o deslocamento de fuso nas OS preventivas antigas de planos
-- ============================================================

alter table public.plano_ciclos
  alter column data_abertura type timestamp with time zone
    using (data_abertura::timestamp at time zone 'America/Sao_Paulo'),
  alter column data_fechamento_prevista type timestamp with time zone
    using (data_fechamento_prevista::timestamp at time zone 'America/Sao_Paulo');

update public.ordens_servico os
set
  data_abertura = pc.data_abertura,
  updated_at = now()
from public.plano_ciclos pc
where os.plano_ciclo_id = pc.id;

update public.ordens_servico os
set
  data_fechamento = pc.data_fechamento_prevista,
  updated_at = now()
from public.plano_ciclos pc
where os.plano_ciclo_id = pc.id
  and os.data_fechamento is not null;

notify pgrst, 'reload schema';

-- Fim da migration 051_planos_datas_horarios.sql

-- ============================================================
-- EngClinica Pro
-- Migration: 067_otimizar_listagem_ordens_servico.sql
-- Objetivo:
-- - Otimizar listagem paginada de ordens de servico
-- - Acelerar filtros comuns combinados com ordenacao por numero/data
-- ============================================================

create index if not exists idx_os_listagem_ativos_numero
  on public.ordens_servico (ativo, numero desc);

create index if not exists idx_os_listagem_ativos_data_abertura
  on public.ordens_servico (ativo, data_abertura desc);

create index if not exists idx_os_listagem_status_numero
  on public.ordens_servico (ativo, status_sistema, numero desc);

create index if not exists idx_os_listagem_estado_numero
  on public.ordens_servico (estado_os_id, ativo, numero desc);

create index if not exists idx_os_listagem_tipo_numero
  on public.ordens_servico (tipo_os_id, ativo, numero desc);

create index if not exists idx_os_listagem_empresa_numero
  on public.ordens_servico (empresa_id, ativo, numero desc);

create index if not exists idx_os_listagem_equipamento_numero
  on public.ordens_servico (equipamento_id, ativo, numero desc);

create index if not exists idx_os_listagem_responsavel_numero
  on public.ordens_servico (responsavel_texto, ativo, numero desc);

-- Fim da migration 067_otimizar_listagem_ordens_servico.sql

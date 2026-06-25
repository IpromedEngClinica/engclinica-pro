-- ============================================================
-- EngClinica Pro
-- Migration: 066_otimizar_listagem_equipamentos.sql
-- Objetivo:
-- - Otimizar a listagem paginada de equipamentos apos importacoes grandes
-- - Acelerar filtros comuns combinados com ordenacao por numero de cadastro
-- ============================================================

create index if not exists idx_equipamentos_listagem_ativos_numero
  on public.equipamentos (ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_ativos_status_numero
  on public.equipamentos (ativo, status, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_empresa_numero
  on public.equipamentos (empresa_id, ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_tipo_numero
  on public.equipamentos (tipo_equipamento_id, ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_fabricante_numero
  on public.equipamentos (fabricante, ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_setor_numero
  on public.equipamentos (setor, ativo, numero_cadastro desc);

create index if not exists idx_equipamentos_listagem_created_at
  on public.equipamentos (ativo, created_at desc);

-- Fim da migration 066_otimizar_listagem_equipamentos.sql

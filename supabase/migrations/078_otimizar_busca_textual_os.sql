-- ============================================================
-- EngClinica Pro
-- Migration: 078_otimizar_busca_textual_os.sql
-- Objetivo:
-- - Acelerar buscas textuais usadas na listagem de ordens de servico
-- - Otimizar filtros por OS, cliente e equipamento com ilike
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists idx_os_numero_trgm
  on public.ordens_servico using gin (numero gin_trgm_ops);

create index if not exists idx_os_solicitante_texto_trgm
  on public.ordens_servico using gin (solicitante_texto gin_trgm_ops);

create index if not exists idx_os_responsavel_texto_trgm
  on public.ordens_servico using gin (responsavel_texto gin_trgm_ops);

create index if not exists idx_os_problema_relatado_trgm
  on public.ordens_servico using gin (problema_relatado gin_trgm_ops);

create index if not exists idx_os_origem_problema_trgm
  on public.ordens_servico using gin (origem_problema gin_trgm_ops);

create index if not exists idx_empresas_nome_trgm
  on public.empresas using gin (nome gin_trgm_ops);

create index if not exists idx_empresas_nome_fantasia_trgm
  on public.empresas using gin (nome_fantasia gin_trgm_ops);

create index if not exists idx_empresas_cpf_cnpj_trgm
  on public.empresas using gin (cpf_cnpj gin_trgm_ops);

create index if not exists idx_equipamentos_tipo_texto_trgm
  on public.equipamentos using gin (tipo_texto gin_trgm_ops);

create index if not exists idx_equipamentos_fabricante_trgm
  on public.equipamentos using gin (fabricante gin_trgm_ops);

create index if not exists idx_equipamentos_modelo_trgm
  on public.equipamentos using gin (modelo gin_trgm_ops);

create index if not exists idx_equipamentos_numero_serie_trgm
  on public.equipamentos using gin (numero_serie gin_trgm_ops);

create index if not exists idx_equipamentos_patrimonio_trgm
  on public.equipamentos using gin (patrimonio gin_trgm_ops);

create index if not exists idx_equipamentos_tag_trgm
  on public.equipamentos using gin (tag gin_trgm_ops);

create index if not exists idx_equipamentos_setor_trgm
  on public.equipamentos using gin (setor gin_trgm_ops);

-- Fim da migration 078_otimizar_busca_textual_os.sql

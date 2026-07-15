-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 092_enriquecer_staging_orcamentos_arkmeds.sql
-- Objetivo:
-- - Enriquecer staging de orcamentos ArkMeds com detalhes tecnicos/PDF
-- - Preservar campos comerciais e modelo/fabricante dos itens
-- - Preparar validacoes de preservacao de itens e comparacao PDF x endpoint
-- ============================================================

alter table public.staging_arkmeds_orcamentos
  add column if not exists informacoes_tecnicas text,
  add column if not exists descricao_equipamento text,
  add column if not exists equipamento_texto text,
  add column if not exists fabricante text,
  add column if not exists modelo text,
  add column if not exists numero_serie text,
  add column if not exists patrimonio text,
  add column if not exists observacoes_gerais text,
  add column if not exists prazo_entrega text,
  add column if not exists validade_dias integer,
  add column if not exists frete text,
  add column if not exists forma_pagamento text,
  add column if not exists modo_pagamento text,
  add column if not exists responsavel_orcamentista text,
  add column if not exists estado_orcamento_pdf text,
  add column if not exists valor_total_pdf numeric(12,2),
  add column if not exists qtd_servicos_pdf integer,
  add column if not exists qtd_pecas_pdf integer,
  add column if not exists pdf_texto_extraido text,
  add column if not exists detalhes_extraidos_json jsonb,
  add column if not exists status_extracao_detalhes text,
  add column if not exists status_comparacao_pdf_endpoint text,
  add column if not exists motivos_comparacao_pdf_endpoint text[],
  add column if not exists status_preservacao_itens text,
  add column if not exists qtd_servicos_endpoint integer,
  add column if not exists qtd_pecas_endpoint integer,
  add column if not exists tipo_misto_completo boolean,
  add column if not exists tem_itens_preservados boolean default false,
  add column if not exists tem_detalhes_tecnicos boolean default false,
  add column if not exists detalhes_atualizado_em timestamp with time zone;

alter table public.staging_arkmeds_orcamento_itens
  add column if not exists modelo_fabricante text;

create index if not exists staging_arkmeds_orcamentos_preservacao_itens_idx
  on public.staging_arkmeds_orcamentos (status_preservacao_itens);

create index if not exists staging_arkmeds_orcamentos_extracao_detalhes_idx
  on public.staging_arkmeds_orcamentos (status_extracao_detalhes);

create index if not exists staging_arkmeds_orcamentos_comparacao_pdf_idx
  on public.staging_arkmeds_orcamentos (status_comparacao_pdf_endpoint);

notify pgrst, 'reload schema';

-- Fim da migration 092_enriquecer_staging_orcamentos_arkmeds.sql

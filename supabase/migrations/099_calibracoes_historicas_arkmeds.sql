-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 099_calibracoes_historicas_arkmeds.sql
-- Objetivo:
-- - Identificar certificados historicos importados do ArkMeds
-- - Impedir duplicidade por ID de origem
-- - Preservar IDs e payloads metrologicos sem alterar o legado
-- ============================================================

alter table public.calibracao_execucoes
add column if not exists arkmeds_calibracao_id bigint null;

alter table public.calibracao_execucoes
add column if not exists arkmeds_numero_certificado text null;

alter table public.calibracao_execucoes
add column if not exists arkmeds_tipo_calibracao integer null;

alter table public.calibracao_execucoes
add column if not exists arkmeds_dados_brutos_json jsonb not null default '{}'::jsonb;

alter table public.calibracao_execucoes
add column if not exists pdf_original_url text null;

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_origem_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_origem_check
check (origem is null or origem in ('plano', 'arkmeds'));

create unique index if not exists ux_calibracao_execucoes_arkmeds_origem
on public.calibracao_execucoes (organizacao_id, arkmeds_calibracao_id)
where origem = 'arkmeds' and arkmeds_calibracao_id is not null;

create index if not exists idx_calibracao_execucoes_origem
on public.calibracao_execucoes (organizacao_id, origem, data_calibracao desc);

alter table public.calibracao_execucao_tabelas
add column if not exists arkmeds_tabela_id bigint null;

alter table public.calibracao_execucao_tabelas
add column if not exists arkmeds_padrao_id bigint null;

alter table public.calibracao_execucao_tabelas
add column if not exists arkmeds_certificado_padrao_id bigint null;

alter table public.calibracao_execucao_tabelas
add column if not exists dados_origem_json jsonb not null default '{}'::jsonb;

alter table public.calibracao_execucao_pontos
add column if not exists dados_origem_json jsonb not null default '{}'::jsonb;

comment on column public.calibracao_execucoes.arkmeds_calibracao_id is
'ID imutavel do certificado no ArkMeds, usado para idempotencia da migracao.';

comment on column public.calibracao_execucoes.pdf_original_url is
'URL historica somente para rastreabilidade. O PDF preservado fica no Storage do Ipromed.';

notify pgrst, 'reload schema';

-- Fim da migration 099_calibracoes_historicas_arkmeds.sql

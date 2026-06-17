-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 054_resolucao_tabelas_padroes_calibracao.sql
-- Objetivo:
-- - Registrar a resolucao do padrao uma vez por tabela metrologica
-- - Permitir reaproveitar essa resolucao em procedimentos de calibracao
-- ============================================================

alter table public.calibracao_padrao_tabelas
  add column if not exists resolucao_padrao numeric(18,8) null;

comment on column public.calibracao_padrao_tabelas.resolucao_padrao
is 'Resolucao do padrao associada a esta tabela metrologica.';

with resolucoes_por_tabela as (
  select
    t.id as tabela_id,
    (array_agg(distinct pp.observacoes)
      filter (where pp.observacoes is not null and btrim(pp.observacoes) <> ''))[1] as observacao
  from public.calibracao_padrao_tabelas t
  join public.calibracao_padrao_pontos pp on pp.tabela_id = t.id
  where t.resolucao_padrao is null
    and lower(coalesce(pp.observacoes, '')) like '%resolucao%'
  group by t.id
  having count(distinct pp.observacoes)
    filter (where pp.observacoes is not null and btrim(pp.observacoes) <> '') = 1
),
resolucoes_extraidas as (
  select
    tabela_id,
    observacao,
    replace((regexp_match(observacao, 'Resolucao\s+([0-9]+(?:[,.][0-9]+)?)', 'i'))[1], ',', '.')::numeric as resolucao_padrao,
    nullif(
      btrim(
        regexp_replace(
          observacao,
          '\s*Resolucao\s+[0-9]+(?:[,.][0-9]+)?\s*[^.]*\.',
          '',
          'i'
        )
      ),
      ''
    ) as observacao_sem_resolucao
  from resolucoes_por_tabela
  where observacao ~* 'Resolucao\s+[0-9]+(?:[,.][0-9]+)?'
),
tabelas_atualizadas as (
  update public.calibracao_padrao_tabelas t
  set
    resolucao_padrao = r.resolucao_padrao,
    updated_at = now()
  from resolucoes_extraidas r
  where t.id = r.tabela_id
    and t.resolucao_padrao is null
  returning t.id
)
update public.calibracao_padrao_pontos p
set
  observacoes = r.observacao_sem_resolucao,
  updated_at = now()
from resolucoes_extraidas r
where p.tabela_id = r.tabela_id
  and p.observacoes = r.observacao;

notify pgrst, 'reload schema';

-- Fim da migration 054_resolucao_tabelas_padroes_calibracao.sql

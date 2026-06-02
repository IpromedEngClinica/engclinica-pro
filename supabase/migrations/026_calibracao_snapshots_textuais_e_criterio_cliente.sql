-- ============================================================
-- EngClinica Pro
-- Migration: 026_calibracao_snapshots_textuais_e_criterio_cliente.sql
-- Objetivo:
-- - Preservar a representacao textual de valores metrologicos
-- - Registrar casas decimais das leituras executadas
-- - Configurar criterio de aceitacao por cliente
-- ============================================================

alter table public.calibracao_padrao_pontos
add column if not exists valor_nominal_texto text null;

alter table public.calibracao_padrao_pontos
add column if not exists incerteza_expandida_texto text null;

update public.calibracao_padrao_pontos
set incerteza_expandida_texto = coalesce(
  nullif(
    case
      when position('.' in incerteza_expandida::text) = 0 then incerteza_expandida::text
      else trim(trailing '.' from trim(trailing '0' from incerteza_expandida::text))
    end,
    ''
  ),
  '0'
)
where trim(coalesce(incerteza_expandida_texto, '')) = ''
  and incerteza_expandida is not null;

update public.calibracao_padrao_pontos
set valor_nominal_texto = coalesce(
  nullif(
    case
      when position('.' in valor_nominal::text) = 0 then valor_nominal::text
      else trim(trailing '.' from trim(trailing '0' from valor_nominal::text))
    end,
    ''
  ),
  '0'
)
where valor_nominal_texto is null;

alter table public.calibracao_execucao_leituras
add column if not exists valor_medido_texto text null;

alter table public.calibracao_execucao_leituras
add column if not exists casas_decimais integer null;

update public.calibracao_execucao_leituras
set valor_medido_texto = coalesce(
  nullif(
    case
      when position('.' in valor_medido::text) = 0 then valor_medido::text
      else trim(trailing '.' from trim(trailing '0' from valor_medido::text))
    end,
    ''
  ),
  '0'
)
where valor_medido_texto is null;

update public.calibracao_execucao_leituras
set casas_decimais = case
  when position('.' in valor_medido_texto) = 0 then 0
  else length(split_part(valor_medido_texto, '.', 2))
end
where casas_decimais is null
  and valor_medido_texto is not null;

alter table public.calibracao_execucao_leituras
drop constraint if exists calibracao_execucao_leituras_casas_decimais_check;

alter table public.calibracao_execucao_leituras
add constraint calibracao_execucao_leituras_casas_decimais_check
check (casas_decimais is null or casas_decimais >= 0);

alter table public.calibracao_execucao_pontos
add column if not exists valor_nominal_texto_snapshot text null;

alter table public.calibracao_execucao_pontos
add column if not exists casas_decimais_valor_medido integer null;

alter table public.calibracao_execucao_pontos
add column if not exists casas_decimais_incerteza integer null;

update public.calibracao_execucao_pontos
set valor_nominal_texto_snapshot = coalesce(
  nullif(
    case
      when position('.' in valor_nominal::text) = 0 then valor_nominal::text
      else trim(trailing '.' from trim(trailing '0' from valor_nominal::text))
    end,
    ''
  ),
  '0'
)
where valor_nominal_texto_snapshot is null;

update public.calibracao_execucao_pontos p
set casas_decimais_valor_medido = leituras.maior_casas
from (
  select execucao_ponto_id, max(coalesce(casas_decimais, 0)) as maior_casas
  from public.calibracao_execucao_leituras
  group by execucao_ponto_id
) leituras
where p.id = leituras.execucao_ponto_id
  and p.casas_decimais_valor_medido is null;

alter table public.calibracao_execucao_pontos
drop constraint if exists calibracao_execucao_pontos_casas_valor_medido_check;

alter table public.calibracao_execucao_pontos
add constraint calibracao_execucao_pontos_casas_valor_medido_check
check (casas_decimais_valor_medido is null or casas_decimais_valor_medido >= 0);

alter table public.empresas
add column if not exists incluir_criterio_aceitacao_calibracao boolean not null default false;

-- ============================================================
-- Fim da migration 026_calibracao_snapshots_textuais_e_criterio_cliente.sql
-- ============================================================

-- ============================================================
-- EngClinica Pro
-- Migration: 025_refinar_calibracao_execucoes_ux.sql
-- Objetivo:
-- - Persistir validade mensal das calibracoes executadas
-- - Separar incerteza calculada e reportada para auditoria
-- - Preservar casas decimais informadas no certificado do padrao
-- ============================================================

alter table public.calibracao_execucoes
add column if not exists validade_mes date null;

alter table public.calibracao_execucoes
add column if not exists validade_meses integer not null default 12;

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_validade_meses_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_validade_meses_check
check (validade_meses >= 1);

update public.calibracao_execucoes
set validade_mes = date_trunc('month', data_validade)::date
where validade_mes is null
  and data_validade is not null;

create index if not exists idx_calibracao_execucoes_validade_mes
on public.calibracao_execucoes (validade_mes);

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
where incerteza_expandida_texto is null
  and incerteza_expandida is not null;

alter table public.calibracao_execucao_pontos
add column if not exists incerteza_padrao_certificado_texto text null;

alter table public.calibracao_execucao_pontos
add column if not exists incerteza_expandida_calculada numeric(18,12) null;

alter table public.calibracao_execucao_pontos
add column if not exists incerteza_expandida_reportada numeric(18,8) null;

alter table public.calibracao_execucao_pontos
add column if not exists casas_decimais_incerteza integer null;

alter table public.calibracao_execucao_pontos
drop constraint if exists calibracao_execucao_pontos_casas_decimais_check;

alter table public.calibracao_execucao_pontos
add constraint calibracao_execucao_pontos_casas_decimais_check
check (casas_decimais_incerteza is null or casas_decimais_incerteza >= 0);

update public.calibracao_execucao_pontos
set
  incerteza_padrao_certificado_texto = coalesce(
    incerteza_padrao_certificado_texto,
    coalesce(
      nullif(
        case
          when position('.' in incerteza_padrao_certificado::text) = 0
            then incerteza_padrao_certificado::text
          else trim(trailing '.' from trim(trailing '0' from incerteza_padrao_certificado::text))
        end,
        ''
      ),
      '0'
    )
  ),
  incerteza_expandida_calculada = coalesce(
    incerteza_expandida_calculada,
    incerteza_expandida
  ),
  incerteza_expandida_reportada = coalesce(
    incerteza_expandida_reportada,
    incerteza_expandida
  )
where incerteza_expandida is not null
   or incerteza_padrao_certificado is not null;

update public.calibracao_execucao_pontos
set casas_decimais_incerteza = case
  when position('.' in incerteza_padrao_certificado_texto) = 0 then 0
  else length(split_part(incerteza_padrao_certificado_texto, '.', 2))
end
where casas_decimais_incerteza is null
  and incerteza_padrao_certificado_texto is not null;

-- ============================================================
-- Fim da migration 025_refinar_calibracao_execucoes_ux.sql
-- ============================================================

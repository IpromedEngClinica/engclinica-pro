-- ============================================================
-- EngClinica Pro
-- Migration: 083_corrigir_numeracao_os_arkmeds_api_atual.sql
-- Objetivo:
-- - Ajustar a numeracao local conforme consulta atual da API ArkMeds
-- - Liberar a faixa 56355-56360 para OS novas existentes na ArkMeds
-- - Reposicionar OS criadas no sistema novo depois do maior numero ArkMeds atual
-- ============================================================

-- A API ArkMeds atual retorna as OS 122192-122198 como 55819-55825.
-- Elas estavam ocupando indevidamente a faixa 56355-56361 por causa do
-- conflito com OS locais criadas antes da migracao.
update public.ordens_servico
set
  numero = case arkmeds_os_id
    when 122192 then '55819'
    when 122193 then '55820'
    when 122194 then '55821'
    when 122195 then '55822'
    when 122196 then '55823'
    when 122197 then '55824'
    when 122198 then '55825'
    else numero
  end,
  updated_at = now()
where arkmeds_os_id in (122192, 122193, 122194, 122195, 122196, 122197, 122198);

-- Estes registros antigos aparecem na tela da ArkMeds como "Ordem de Servico nº Gerando",
-- portanto nao devem reservar numeros acima da faixa atual da ArkMeds.
update public.ordens_servico
set
  numero = 'ArkMeds-' || arkmeds_os_id::text,
  updated_at = now()
where arkmeds_os_id in (48899, 48915, 51679, 52583, 53048, 53060);

-- Maior numero confirmado na API ArkMeds em 01/07/2026: 56360.
-- As OS sem arkmeds_os_id foram criadas no sistema novo e devem continuar
-- imediatamente apos a numeracao da ArkMeds.
with locais as (
  select
    id,
    (56360 + row_number() over (order by created_at, id))::text as novo_numero
  from public.ordens_servico
  where arkmeds_os_id is null
)
update public.ordens_servico os
set
  numero = locais.novo_numero,
  updated_at = now()
from locais
where os.id = locais.id;

select setval(
  'public.ordens_servico_numero_seq',
  greatest(
    56360,
    coalesce((select max(numero_ordem) from public.ordens_servico), 56360)
  ),
  true
);

notify pgrst, 'reload schema';

-- Fim da migration 083_corrigir_numeracao_os_arkmeds_api_atual.sql

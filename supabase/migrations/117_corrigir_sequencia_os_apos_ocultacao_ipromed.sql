-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 117_corrigir_sequencia_os_apos_ocultacao_ipromed.sql
-- Objetivo:
-- - Liberar a numeracao oficial ocupada por OS locais ocultas
-- - Corrigir o salto de 56701 para 57001
-- - Manter todos os vinculos existentes pelos IDs das OS
-- ============================================================

do $$
declare
  v_conflitos integer;
begin
  select count(*)
  into v_conflitos
  from (
    select
      'IPR - ' || coalesce(nullif(trim(numero_original), ''), numero) as novo_numero
    from public.ordens_servico
    where oculta_operacao = true
      and arkmeds_os_id is null
      and numero ~ '^[0-9]+$'
    group by 1
    having count(*) > 1
  ) conflitos;

  if v_conflitos > 0 then
    raise exception
      'Existem numeros duplicados entre as OS locais ocultas. A sequencia nao foi alterada.';
  end if;

  if exists (
    select 1
    from public.ordens_servico ocultas
    join public.ordens_servico existentes
      on existentes.id <> ocultas.id
     and existentes.organizacao_id = ocultas.organizacao_id
     and existentes.numero =
       'IPR - ' || coalesce(nullif(trim(ocultas.numero_original), ''), ocultas.numero)
    where ocultas.oculta_operacao = true
      and ocultas.arkmeds_os_id is null
      and ocultas.numero ~ '^[0-9]+$'
  ) then
    raise exception
      'A numeracao IPR de destino ja esta ocupada. A sequencia nao foi alterada.';
  end if;
end;
$$;

update public.ordens_servico
set
  numero_original = coalesce(nullif(trim(numero_original), ''), numero),
  numero = 'IPR - ' || coalesce(nullif(trim(numero_original), ''), numero),
  motivo_ocultacao = coalesce(
    motivo_ocultacao,
    'OS criada no Ipromed antes da sincronizacao definitiva com o ArkMeds.'
  ),
  ocultada_em = coalesce(ocultada_em, now()),
  updated_at = now()
where oculta_operacao = true
  and arkmeds_os_id is null
  and numero ~ '^[0-9]+$';

do $$
declare
  v_quantidade integer;
begin
  select count(*)
  into v_quantidade
  from public.ordens_servico
  where id in (
    '9897e4d0-c3a5-4372-9aed-ea08df9ff9ed'::uuid,
    '7a602b98-9b2c-434c-bff5-f702812efa5e'::uuid,
    '656bef75-dc97-4bec-aa29-d033b9a7d3c4'::uuid,
    '6a526978-3590-4063-afc2-8919e625ba0e'::uuid
  )
    and oculta_operacao = false;

  if v_quantidade <> 4 then
    raise exception
      'As quatro OS operacionais esperadas nao foram encontradas. A sequencia nao foi alterada.';
  end if;

  if exists (
    select 1
    from public.ordens_servico
    where numero in ('56702', '56703', '56704', '56705')
      and id not in (
        '9897e4d0-c3a5-4372-9aed-ea08df9ff9ed'::uuid,
        '7a602b98-9b2c-434c-bff5-f702812efa5e'::uuid,
        '656bef75-dc97-4bec-aa29-d033b9a7d3c4'::uuid,
        '6a526978-3590-4063-afc2-8919e625ba0e'::uuid
      )
  ) then
    raise exception
      'Um dos numeros 56702 a 56705 continua ocupado. A sequencia nao foi alterada.';
  end if;
end;
$$;

update public.ordens_servico
set numero = case id
  when '9897e4d0-c3a5-4372-9aed-ea08df9ff9ed'::uuid then '56702'
  when '7a602b98-9b2c-434c-bff5-f702812efa5e'::uuid then '56703'
  when '656bef75-dc97-4bec-aa29-d033b9a7d3c4'::uuid then '56704'
  when '6a526978-3590-4063-afc2-8919e625ba0e'::uuid then '56705'
end,
updated_at = now()
where id in (
  '9897e4d0-c3a5-4372-9aed-ea08df9ff9ed'::uuid,
  '7a602b98-9b2c-434c-bff5-f702812efa5e'::uuid,
  '656bef75-dc97-4bec-aa29-d033b9a7d3c4'::uuid,
  '6a526978-3590-4063-afc2-8919e625ba0e'::uuid
);

select setval(
  'public.ordens_servico_numero_seq',
  (
    select coalesce(max(numero_ordem), 1)
    from public.ordens_servico
    where oculta_operacao = false
      and numero ~ '^[0-9]+$'
  ),
  true
);

notify pgrst, 'reload schema';

-- Fim da migration 117_corrigir_sequencia_os_apos_ocultacao_ipromed.sql

-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 115_unificar_estado_entrada_equipamento_orcamento.sql
-- Objetivo:
-- - Unificar variacoes duplicadas do estado de entrada para orcamento
-- - Preservar OS e historicos vinculados aos estados antigos
-- ============================================================

do $$
declare
  v_canonical_id uuid;
  v_organizacao_id uuid;
begin
  for v_canonical_id, v_organizacao_id in
    select id, organizacao_id
    from public.estados_os
    where lower(nome) = lower('Entrada de Equipamento para Orçamento')
  loop
    update public.ordens_servico os
    set estado_os_id = v_canonical_id
    where os.organizacao_id = v_organizacao_id
      and os.estado_os_id in (
        select estado.id
        from public.estados_os estado
        where estado.organizacao_id = v_organizacao_id
          and estado.id <> v_canonical_id
          and lower(estado.nome) in (
            lower('Entrada de equipamentos para Orçamento'),
            lower('Entrada de Equipamentos para Orçamento')
          )
      );

    update public.ordem_servico_historico historico
    set estado_anterior_id = v_canonical_id
    where historico.estado_anterior_id in (
      select estado.id
      from public.estados_os estado
      where estado.organizacao_id = v_organizacao_id
        and estado.id <> v_canonical_id
        and lower(estado.nome) in (
          lower('Entrada de equipamentos para Orçamento'),
          lower('Entrada de Equipamentos para Orçamento')
        )
    );

    update public.ordem_servico_historico historico
    set estado_novo_id = v_canonical_id
    where historico.estado_novo_id in (
      select estado.id
      from public.estados_os estado
      where estado.organizacao_id = v_organizacao_id
        and estado.id <> v_canonical_id
        and lower(estado.nome) in (
          lower('Entrada de equipamentos para Orçamento'),
          lower('Entrada de Equipamentos para Orçamento')
        )
    );

    delete from public.estados_os estado
    where estado.organizacao_id = v_organizacao_id
      and estado.id <> v_canonical_id
      and lower(estado.nome) in (
        lower('Entrada de equipamentos para Orçamento'),
        lower('Entrada de Equipamentos para Orçamento')
      );

    update public.estados_os
    set
      nome = 'Entrada de Equipamento para Orçamento',
      ativo = true,
      updated_at = now()
    where id = v_canonical_id;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

-- Fim da migration 115_unificar_estado_entrada_equipamento_orcamento.sql

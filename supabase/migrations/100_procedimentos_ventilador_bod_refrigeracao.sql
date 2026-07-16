-- ============================================================
-- EngClinica Pro
-- Migration: 100_procedimentos_ventilador_bod_refrigeracao.sql
-- Objetivo:
-- - Cadastrar os procedimentos de Ventilador Pulmonar e Incubadora B.O.D
-- - Separar os procedimentos de Camara de Conservacao, Freezer e Geladeira
-- - Vincular tabelas aos padroes rastreaveis ja cadastrados
-- ============================================================

do $$
declare
  v_organizacao_id uuid;
  v_tipo_ventilador_id uuid;
  v_tipo_bod_id uuid;
  v_tipo_camara_id uuid;
  v_tipo_combinado_id uuid;
  v_tipo_freezer_id uuid;
  v_tipo_geladeira_id uuid;
  v_tipo_geladeira_industrial_id uuid;
  v_tipo_refrigerador_id uuid;
  v_procedimento_ventilador_id uuid;
  v_procedimento_bod_id uuid;
  v_procedimento_camara_id uuid;
  v_procedimento_freezer_id uuid;
  v_procedimento_geladeira_id uuid;
  v_procedimento_destino_id uuid;
  v_padrao_ventilacao_id uuid;
  v_padrao_temperatura_id uuid;
  v_padrao_tabela_id uuid;
  v_tabela_id uuid;
  v_ponto_id uuid;
  v_resolucao_padrao numeric(18,8);
  v_indice integer;
  v_sensor integer;
  v_config record;
begin
  for v_organizacao_id in
    select distinct tipo.organizacao_id
    from public.tipos_equipamento tipo
    where tipo.ativo
      and tipo.nome = 'Ventilador Pulmonar'
  loop
    select id into v_tipo_ventilador_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Ventilador Pulmonar'
    limit 1;

    select id into v_tipo_bod_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Incubadora B.O.D'
    limit 1;

    select id into v_tipo_camara_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Câmara de Conservação'
    limit 1;

    select id into v_tipo_combinado_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and nome = 'Câmara de Conservação / Freezer / Geladeira / Refrigerador'
    limit 1;

    select id into v_tipo_freezer_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Freezer'
    limit 1;

    select id into v_tipo_geladeira_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Geladeira'
    limit 1;

    select id into v_tipo_geladeira_industrial_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Geladeira Industrial'
    limit 1;

    select id into v_tipo_refrigerador_id
    from public.tipos_equipamento
    where organizacao_id = v_organizacao_id
      and ativo
      and nome = 'Refrigerador'
    limit 1;

    if v_tipo_ventilador_id is null
      or v_tipo_bod_id is null
      or v_tipo_camara_id is null
      or v_tipo_freezer_id is null
      or v_tipo_geladeira_id is null
      or v_tipo_refrigerador_id is null then
      raise exception 'Tipos de equipamento obrigatorios nao encontrados para a organizacao %.', v_organizacao_id;
    end if;

    select id into v_padrao_ventilacao_id
    from public.calibracao_padroes
    where organizacao_id = v_organizacao_id
      and ativo
      and nome_padrao = 'Analisador de Ventilação Mecânica'
    order by data_validade desc, created_at desc
    limit 1;

    select id into v_padrao_temperatura_id
    from public.calibracao_padroes
    where organizacao_id = v_organizacao_id
      and ativo
      and nome_padrao = 'Termômetro Digital 5 Canais'
    order by data_validade desc, created_at desc
    limit 1;

    if v_padrao_ventilacao_id is null or v_padrao_temperatura_id is null then
      raise exception 'Padroes de ventilacao ou temperatura nao encontrados para a organizacao %.', v_organizacao_id;
    end if;

    -- Ventilador Pulmonar
    select id into v_procedimento_ventilador_id
    from public.calibracao_procedimentos
    where organizacao_id = v_organizacao_id
      and nome = 'Ventilador Pulmonar'
    order by ativo desc, created_at
    limit 1;

    if v_procedimento_ventilador_id is null then
      insert into public.calibracao_procedimentos (
        organizacao_id,
        nome,
        tipo_equipamento_id,
        observacoes,
        versao,
        ativo
      )
      values (
        v_organizacao_id,
        'Ventilador Pulmonar',
        v_tipo_ventilador_id,
        'Procedimento cadastrado a partir do modelo de calibração da ACI.',
        1,
        true
      )
      returning id into v_procedimento_ventilador_id;
    else
      update public.calibracao_procedimentos
      set
        tipo_equipamento_id = v_tipo_ventilador_id,
        ativo = true,
        updated_at = now()
      where id = v_procedimento_ventilador_id;
    end if;

    insert into public.calibracao_procedimento_tipos_equipamento (
      organizacao_id,
      procedimento_id,
      tipo_equipamento_id
    )
    values (
      v_organizacao_id,
      v_procedimento_ventilador_id,
      v_tipo_ventilador_id
    )
    on conflict (procedimento_id, tipo_equipamento_id) do nothing;

    for v_config in
      select *
      from (
        values
          ('Fluxo de Pico', 'Fluxo', 'L/min', 1, 0.1::numeric, 'Fluxo', array[30, 45, 60, 90, 120]::numeric[]),
          ('Volume Tidal', 'Volume', 'mL', 2, 1::numeric, 'Volume', array[200, 400, 600, 800, 1000]::numeric[]),
          ('Frequência', 'Frequência', 'rpm', 3, 0.1::numeric, 'Frequência', array[10, 12, 14, 16]::numeric[]),
          ('Pressão de Pico', 'Pressão', 'cmH2O', 4, 0.1::numeric, 'Pressão Baixa', array[20, 30, 60]::numeric[]),
          ('PEEP', 'Pressão', 'cmH2O', 5, 1::numeric, 'Pressão Baixa', array[2, 4, 6, 8]::numeric[])
      ) as configuracao(
        nome,
        grandeza,
        unidade,
        ordem,
        resolucao_equipamento,
        padrao_tabela_nome,
        pontos
      )
    loop
      select id, resolucao_padrao
      into v_padrao_tabela_id, v_resolucao_padrao
      from public.calibracao_padrao_tabelas
      where organizacao_id = v_organizacao_id
        and padrao_id = v_padrao_ventilacao_id
        and ativo
        and nome = v_config.padrao_tabela_nome
      order by ordem
      limit 1;

      if v_padrao_tabela_id is null then
        raise exception 'Tabela % nao encontrada no padrao de ventilacao.', v_config.padrao_tabela_nome;
      end if;

      select id into v_tabela_id
      from public.calibracao_procedimento_tabelas
      where procedimento_id = v_procedimento_ventilador_id
        and nome = v_config.nome
      order by ativo desc, created_at
      limit 1;

      if v_tabela_id is null then
        insert into public.calibracao_procedimento_tabelas (
          organizacao_id,
          procedimento_id,
          nome,
          grandeza,
          unidade,
          ordem,
          quantidade_leituras,
          resolucao_padrao_default,
          resolucao_equipamento_default,
          fator_confiabilidade_modo,
          incluir_criterio_aceitacao,
          corrigir_erro_sistematico,
          ativo,
          padrao_id,
          padrao_tabela_id
        )
        values (
          v_organizacao_id,
          v_procedimento_ventilador_id,
          v_config.nome,
          v_config.grandeza,
          v_config.unidade,
          v_config.ordem,
          1,
          v_resolucao_padrao,
          v_config.resolucao_equipamento,
          'calcular_95',
          false,
          false,
          true,
          v_padrao_ventilacao_id,
          v_padrao_tabela_id
        )
        returning id into v_tabela_id;
      else
        update public.calibracao_procedimento_tabelas
        set
          grandeza = v_config.grandeza,
          unidade = v_config.unidade,
          ordem = v_config.ordem,
          quantidade_leituras = 1,
          tipo_medida = null,
          resolucao_padrao_default = v_resolucao_padrao,
          resolucao_equipamento_default = v_config.resolucao_equipamento,
          fator_confiabilidade_modo = 'calcular_95',
          incluir_criterio_aceitacao = false,
          corrigir_erro_sistematico = false,
          ativo = true,
          padrao_id = v_padrao_ventilacao_id,
          padrao_tabela_id = v_padrao_tabela_id,
          updated_at = now()
        where id = v_tabela_id;
      end if;

      for v_indice in 1..cardinality(v_config.pontos)
      loop
        select id into v_ponto_id
        from public.calibracao_procedimento_pontos
        where tabela_id = v_tabela_id
          and ordem = v_indice - 1
        order by created_at
        limit 1;

        if v_ponto_id is null then
          insert into public.calibracao_procedimento_pontos (
            organizacao_id,
            tabela_id,
            ordem,
            valor_nominal,
            ativo
          )
          values (
            v_organizacao_id,
            v_tabela_id,
            v_indice - 1,
            v_config.pontos[v_indice],
            true
          );
        else
          update public.calibracao_procedimento_pontos
          set
            valor_nominal = v_config.pontos[v_indice],
            ativo = true,
            updated_at = now()
          where id = v_ponto_id;
        end if;
      end loop;
    end loop;

    -- Incubadora B.O.D
    select id into v_procedimento_bod_id
    from public.calibracao_procedimentos
    where organizacao_id = v_organizacao_id
      and nome = 'Incubadora B.O.D'
    order by ativo desc, created_at
    limit 1;

    if v_procedimento_bod_id is null then
      insert into public.calibracao_procedimentos (
        organizacao_id,
        nome,
        tipo_equipamento_id,
        observacoes,
        versao,
        ativo
      )
      values (
        v_organizacao_id,
        'Incubadora B.O.D',
        v_tipo_bod_id,
        'Procedimento cadastrado a partir do modelo de calibração da ACI.',
        1,
        true
      )
      returning id into v_procedimento_bod_id;
    else
      update public.calibracao_procedimentos
      set
        tipo_equipamento_id = v_tipo_bod_id,
        ativo = true,
        updated_at = now()
      where id = v_procedimento_bod_id;
    end if;

    insert into public.calibracao_procedimento_tipos_equipamento (
      organizacao_id,
      procedimento_id,
      tipo_equipamento_id
    )
    values (
      v_organizacao_id,
      v_procedimento_bod_id,
      v_tipo_bod_id
    )
    on conflict (procedimento_id, tipo_equipamento_id) do nothing;

    select id, resolucao_padrao
    into v_padrao_tabela_id, v_resolucao_padrao
    from public.calibracao_padrao_tabelas
    where organizacao_id = v_organizacao_id
      and padrao_id = v_padrao_temperatura_id
      and ativo
      and nome = 'Temperatura Sensor 1'
    order by ordem
    limit 1;

    select id into v_tabela_id
    from public.calibracao_procedimento_tabelas
    where procedimento_id = v_procedimento_bod_id
      and nome = 'Sensor 1'
    order by ativo desc, created_at
    limit 1;

    if v_tabela_id is null then
      insert into public.calibracao_procedimento_tabelas (
        organizacao_id,
        procedimento_id,
        nome,
        grandeza,
        unidade,
        ordem,
        quantidade_leituras,
        resolucao_padrao_default,
        resolucao_equipamento_default,
        fator_confiabilidade_modo,
        incluir_criterio_aceitacao,
        corrigir_erro_sistematico,
        ativo,
        padrao_id,
        padrao_tabela_id
      )
      values (
        v_organizacao_id,
        v_procedimento_bod_id,
        'Sensor 1',
        'Temperatura',
        '°C',
        1,
        1,
        v_resolucao_padrao,
        0.1,
        'calcular_95',
        false,
        false,
        true,
        v_padrao_temperatura_id,
        v_padrao_tabela_id
      )
      returning id into v_tabela_id;
    else
      update public.calibracao_procedimento_tabelas
      set
        grandeza = 'Temperatura',
        unidade = '°C',
        ordem = 1,
        quantidade_leituras = 1,
        tipo_medida = null,
        resolucao_padrao_default = v_resolucao_padrao,
        resolucao_equipamento_default = 0.1,
        fator_confiabilidade_modo = 'calcular_95',
        incluir_criterio_aceitacao = false,
        corrigir_erro_sistematico = false,
        ativo = true,
        padrao_id = v_padrao_temperatura_id,
        padrao_tabela_id = v_padrao_tabela_id,
        updated_at = now()
      where id = v_tabela_id;
    end if;

    for v_config in
      select *
      from (
        values
          (0, 30::numeric),
          (1, 32::numeric),
          (2, 34::numeric),
          (3, 36::numeric)
      ) as pontos(ordem, valor_nominal)
    loop
      select id into v_ponto_id
      from public.calibracao_procedimento_pontos
      where tabela_id = v_tabela_id
        and ordem = v_config.ordem
      order by created_at
      limit 1;

      if v_ponto_id is null then
        insert into public.calibracao_procedimento_pontos (
          organizacao_id,
          tabela_id,
          ordem,
          valor_nominal,
          ativo
        )
        values (
          v_organizacao_id,
          v_tabela_id,
          v_config.ordem,
          v_config.valor_nominal,
          true
        );
      else
        update public.calibracao_procedimento_pontos
        set
          valor_nominal = v_config.valor_nominal,
          ativo = true,
          updated_at = now()
        where id = v_ponto_id;
      end if;
    end loop;

    -- Separa o procedimento existente de Camara de Conservacao do tipo combinado.
    select id into v_procedimento_camara_id
    from public.calibracao_procedimentos
    where organizacao_id = v_organizacao_id
      and nome = 'Câmara de Conservação'
    order by ativo desc, created_at
    limit 1;

    if v_procedimento_camara_id is null then
      raise exception 'Procedimento Camara de Conservacao nao encontrado para a organizacao %.', v_organizacao_id;
    end if;

    update public.calibracao_procedimentos
    set
      tipo_equipamento_id = v_tipo_camara_id,
      ativo = true,
      updated_at = now()
    where id = v_procedimento_camara_id;

    if v_tipo_combinado_id is not null then
      delete from public.calibracao_procedimento_tipos_equipamento
      where procedimento_id = v_procedimento_camara_id
        and tipo_equipamento_id = v_tipo_combinado_id;
    end if;

    insert into public.calibracao_procedimento_tipos_equipamento (
      organizacao_id,
      procedimento_id,
      tipo_equipamento_id
    )
    values (
      v_organizacao_id,
      v_procedimento_camara_id,
      v_tipo_camara_id
    )
    on conflict (procedimento_id, tipo_equipamento_id) do nothing;

    -- Freezer e Geladeira usam o mesmo molde de cinco sensores, mas permanecem
    -- procedimentos distintos para a correta identificacao do equipamento.
    select id into v_procedimento_freezer_id
    from public.calibracao_procedimentos
    where organizacao_id = v_organizacao_id
      and nome = 'Freezer'
    order by ativo desc, created_at
    limit 1;

    if v_procedimento_freezer_id is null then
      insert into public.calibracao_procedimentos (
        organizacao_id,
        nome,
        tipo_equipamento_id,
        observacoes,
        versao,
        ativo
      )
      values (
        v_organizacao_id,
        'Freezer',
        v_tipo_freezer_id,
        'Procedimento cadastrado a partir do modelo de calibração da ACI.',
        1,
        true
      )
      returning id into v_procedimento_freezer_id;
    end if;

    update public.calibracao_procedimentos
    set tipo_equipamento_id = v_tipo_freezer_id, ativo = true, updated_at = now()
    where id = v_procedimento_freezer_id;

    select id into v_procedimento_geladeira_id
    from public.calibracao_procedimentos
    where organizacao_id = v_organizacao_id
      and nome = 'Geladeira'
    order by ativo desc, created_at
    limit 1;

    if v_procedimento_geladeira_id is null then
      insert into public.calibracao_procedimentos (
        organizacao_id,
        nome,
        tipo_equipamento_id,
        observacoes,
        versao,
        ativo
      )
      values (
        v_organizacao_id,
        'Geladeira',
        v_tipo_geladeira_id,
        'Procedimento cadastrado a partir do modelo de calibração da ACI.',
        1,
        true
      )
      returning id into v_procedimento_geladeira_id;
    end if;

    update public.calibracao_procedimentos
    set tipo_equipamento_id = v_tipo_geladeira_id, ativo = true, updated_at = now()
    where id = v_procedimento_geladeira_id;

    insert into public.calibracao_procedimento_tipos_equipamento (
      organizacao_id,
      procedimento_id,
      tipo_equipamento_id
    )
    values
      (v_organizacao_id, v_procedimento_freezer_id, v_tipo_freezer_id),
      (v_organizacao_id, v_procedimento_geladeira_id, v_tipo_geladeira_id),
      (v_organizacao_id, v_procedimento_geladeira_id, v_tipo_refrigerador_id)
    on conflict (procedimento_id, tipo_equipamento_id) do nothing;

    if v_tipo_geladeira_industrial_id is not null then
      insert into public.calibracao_procedimento_tipos_equipamento (
        organizacao_id,
        procedimento_id,
        tipo_equipamento_id
      )
      values (
        v_organizacao_id,
        v_procedimento_geladeira_id,
        v_tipo_geladeira_industrial_id
      )
      on conflict (procedimento_id, tipo_equipamento_id) do nothing;
    end if;

    for v_config in
      select *
      from (
        values
          (v_procedimento_freezer_id),
          (v_procedimento_geladeira_id)
      ) as procedimentos(procedimento_id)
    loop
      v_procedimento_destino_id := v_config.procedimento_id;

      for v_sensor in 1..5
      loop
        select id, resolucao_padrao
        into v_padrao_tabela_id, v_resolucao_padrao
        from public.calibracao_padrao_tabelas
        where organizacao_id = v_organizacao_id
          and padrao_id = v_padrao_temperatura_id
          and ativo
          and nome = 'Temperatura Sensor ' || v_sensor
        order by ordem
        limit 1;

        select id into v_tabela_id
        from public.calibracao_procedimento_tabelas
        where procedimento_id = v_procedimento_destino_id
          and nome = 'Sensor ' || v_sensor
        order by ativo desc, created_at
        limit 1;

        if v_tabela_id is null then
          insert into public.calibracao_procedimento_tabelas (
            organizacao_id,
            procedimento_id,
            nome,
            grandeza,
            unidade,
            ordem,
            quantidade_leituras,
            resolucao_padrao_default,
            resolucao_equipamento_default,
            faixa_uso_min,
            faixa_uso_max,
            fator_confiabilidade_modo,
            incluir_criterio_aceitacao,
            corrigir_erro_sistematico,
            ativo,
            padrao_id,
            padrao_tabela_id
          )
          values (
            v_organizacao_id,
            v_procedimento_destino_id,
            'Sensor ' || v_sensor,
            'Temperatura',
            '°C',
            v_sensor,
            1,
            v_resolucao_padrao,
            0.1,
            2,
            8,
            'calcular_95',
            false,
            false,
            true,
            v_padrao_temperatura_id,
            v_padrao_tabela_id
          )
          returning id into v_tabela_id;
        else
          update public.calibracao_procedimento_tabelas
          set
            grandeza = 'Temperatura',
            unidade = '°C',
            ordem = v_sensor,
            quantidade_leituras = 1,
            tipo_medida = null,
            resolucao_padrao_default = v_resolucao_padrao,
            resolucao_equipamento_default = 0.1,
            faixa_uso_min = 2,
            faixa_uso_max = 8,
            fator_confiabilidade_modo = 'calcular_95',
            incluir_criterio_aceitacao = false,
            corrigir_erro_sistematico = false,
            ativo = true,
            padrao_id = v_padrao_temperatura_id,
            padrao_tabela_id = v_padrao_tabela_id,
            updated_at = now()
          where id = v_tabela_id;
        end if;

        select id into v_ponto_id
        from public.calibracao_procedimento_pontos
        where tabela_id = v_tabela_id
          and ordem = 0
        order by created_at
        limit 1;

        if v_ponto_id is null then
          insert into public.calibracao_procedimento_pontos (
            organizacao_id,
            tabela_id,
            ordem,
            valor_nominal,
            ativo
          )
          values (
            v_organizacao_id,
            v_tabela_id,
            0,
            5,
            true
          );
        else
          update public.calibracao_procedimento_pontos
          set valor_nominal = 5, ativo = true, updated_at = now()
          where id = v_ponto_id;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

-- Fim da migration 100_procedimentos_ventilador_bod_refrigeracao.sql

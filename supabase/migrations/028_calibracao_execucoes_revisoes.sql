-- ============================================================
-- EngClinica Pro
-- Migration: 028_calibracao_execucoes_revisoes.sql
-- Objetivo:
-- - Permitir revisoes auditaveis de calibracoes finalizadas
-- - Preservar snapshots completos e certificados anteriores
-- - Registrar regra de decisao por tabela da execucao
-- ============================================================

alter table public.calibracao_execucoes
add column if not exists numero_revisao integer not null default 0;

alter table public.calibracao_execucoes
add column if not exists atualizado_apos_finalizacao boolean not null default false;

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_numero_revisao_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_numero_revisao_check
check (numero_revisao >= 0);

alter table public.calibracao_execucao_tabelas
add column if not exists regra_decisao_snapshot text null;

update public.calibracao_execucao_tabelas t
set regra_decisao_snapshot = e.regra_decisao
from public.calibracao_execucoes e
where e.id = t.execucao_id
  and t.regra_decisao_snapshot is null;

alter table public.calibracao_execucao_tabelas
drop constraint if exists calibracao_execucao_tabelas_regra_decisao_check;

alter table public.calibracao_execucao_tabelas
add constraint calibracao_execucao_tabelas_regra_decisao_check
check (
  regra_decisao_snapshot is null
  or regra_decisao_snapshot in (
    'aceitacao_simples',
    'considerando_incerteza',
    'personalizada'
  )
);

create table if not exists public.calibracao_execucao_revisoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  execucao_id uuid not null references public.calibracao_execucoes(id) on delete cascade,
  numero_revisao integer not null default 1,
  motivo text null,
  snapshot_json jsonb not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id) on delete set null,
  constraint calibracao_execucao_revisoes_numero_check check (numero_revisao >= 1),
  constraint calibracao_execucao_revisoes_unique unique (execucao_id, numero_revisao)
);

create index if not exists idx_calibracao_execucao_revisoes_execucao
on public.calibracao_execucao_revisoes (execucao_id, numero_revisao desc);

alter table public.calibracao_execucao_revisoes enable row level security;

drop policy if exists "calibracao_execucao_revisoes_select_mesma_organizacao"
on public.calibracao_execucao_revisoes;

create policy "calibracao_execucao_revisoes_select_mesma_organizacao"
on public.calibracao_execucao_revisoes
for select
to authenticated
using (organizacao_id = public.current_organizacao_id());

create or replace function public.iniciar_revisao_calibracao_execucao(
  p_execucao_id uuid,
  p_motivo text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execucao public.calibracao_execucoes%rowtype;
  v_numero_revisao integer;
  v_snapshot jsonb;
begin
  if coalesce(public.current_user_perfil(), '') not in ('admin', 'gestor', 'tecnico') then
    raise exception 'Usuario sem permissao para revisar calibracao.';
  end if;

  select *
  into v_execucao
  from public.calibracao_execucoes
  where id = p_execucao_id
    and organizacao_id = public.current_organizacao_id()
  for update;

  if not found then
    raise exception 'Execucao de calibracao nao encontrada.';
  end if;

  if v_execucao.status <> 'fechada' then
    raise exception 'Somente calibracoes finalizadas podem iniciar uma revisao.';
  end if;

  v_numero_revisao := v_execucao.numero_revisao + 1;

  select jsonb_build_object(
    'execucao', to_jsonb(e),
    'tabelas', coalesce((
      select jsonb_agg(
        to_jsonb(t)
        || jsonb_build_object(
          'pontos', coalesce((
            select jsonb_agg(
              to_jsonb(p)
              || jsonb_build_object(
                'leituras', coalesce((
                  select jsonb_agg(to_jsonb(l) order by l.ordem)
                  from public.calibracao_execucao_leituras l
                  where l.execucao_ponto_id = p.id
                ), '[]'::jsonb),
                'componentes', coalesce((
                  select jsonb_agg(to_jsonb(c) order by c.ordem)
                  from public.calibracao_execucao_componentes_incerteza c
                  where c.execucao_ponto_id = p.id
                ), '[]'::jsonb)
              )
              order by p.ordem
            )
            from public.calibracao_execucao_pontos p
            where p.execucao_tabela_id = t.id
          ), '[]'::jsonb)
        )
        order by t.ordem
      )
      from public.calibracao_execucao_tabelas t
      where t.execucao_id = e.id
    ), '[]'::jsonb)
  )
  into v_snapshot
  from public.calibracao_execucoes e
  where e.id = v_execucao.id;

  insert into public.calibracao_execucao_revisoes (
    organizacao_id,
    execucao_id,
    numero_revisao,
    motivo,
    snapshot_json,
    created_by
  )
  values (
    v_execucao.organizacao_id,
    v_execucao.id,
    v_numero_revisao,
    nullif(trim(coalesce(p_motivo, '')), ''),
    v_snapshot,
    auth.uid()
  );

  update public.calibracao_execucoes
  set
    status = 'em_execucao',
    numero_revisao = v_numero_revisao,
    atualizado_apos_finalizacao = true,
    fechado_em = null
  where id = v_execucao.id;

  return v_numero_revisao;
end;
$$;

alter function public.iniciar_revisao_calibracao_execucao(uuid, text) owner to postgres;
revoke all on function public.iniciar_revisao_calibracao_execucao(uuid, text) from public;
grant execute on function public.iniciar_revisao_calibracao_execucao(uuid, text) to authenticated;

drop policy if exists "calibracao_execucoes_update_admin_gestor_tecnico"
on public.calibracao_execucoes;

create policy "calibracao_execucoes_update_admin_gestor_tecnico"
on public.calibracao_execucoes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and status not in ('fechada', 'cancelada')
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and status in ('rascunho', 'em_execucao', 'cancelada')
  and exists (
    select 1 from public.empresas e
    where e.id = calibracao_execucoes.empresa_id
      and e.organizacao_id = public.current_organizacao_id()
  )
  and exists (
    select 1 from public.equipamentos e
    where e.id = calibracao_execucoes.equipamento_id
      and e.empresa_id = calibracao_execucoes.empresa_id
      and e.organizacao_id = public.current_organizacao_id()
  )
  and exists (
    select 1 from public.calibracao_procedimentos p
    where p.id = calibracao_execucoes.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_certificados_storage_insert_admin_gestor_tecnico"
on storage.objects;

create policy "calibracao_certificados_storage_insert_admin_gestor_tecnico"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'calibracao-certificados'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.id::text = (storage.foldername(name))[2]
      and e.organizacao_id = public.current_organizacao_id()
      and e.status not in ('fechada', 'cancelada')
      and name = e.organizacao_id::text
        || '/'
        || e.id::text
        || '/CAL-'
        || lpad(e.numero_certificado::text, 6, '0')
        || case
          when e.numero_revisao > 0
            then '-R' || lpad(e.numero_revisao::text, 3, '0')
          else ''
        end
        || '.pdf'
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_certificados_storage_update_admin_gestor_tecnico"
on storage.objects;

create policy "calibracao_certificados_storage_update_admin_gestor_tecnico"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'calibracao-certificados'
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.organizacao_id = public.current_organizacao_id()
      and e.status not in ('fechada', 'cancelada')
      and name =
        e.organizacao_id::text
        || '/'
        || e.id::text
        || '/CAL-'
        || lpad(e.numero_certificado::text, 6, '0')
        || case
          when e.numero_revisao > 0
            then '-R' || lpad(e.numero_revisao::text, 3, '0')
          else ''
        end
        || '.pdf'
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
)
with check (
  bucket_id = 'calibracao-certificados'
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.organizacao_id = public.current_organizacao_id()
      and e.status not in ('fechada', 'cancelada')
      and name =
        e.organizacao_id::text
        || '/'
        || e.id::text
        || '/CAL-'
        || lpad(e.numero_certificado::text, 6, '0')
        || case
          when e.numero_revisao > 0
            then '-R' || lpad(e.numero_revisao::text, 3, '0')
          else ''
        end
        || '.pdf'
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

drop policy if exists "calibracao_certificados_storage_delete_execucao_aberta"
on storage.objects;

create policy "calibracao_certificados_storage_delete_execucao_aberta"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'calibracao-certificados'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.id::text = (storage.foldername(name))[2]
      and e.organizacao_id = public.current_organizacao_id()
      and e.status not in ('fechada', 'cancelada')
      and name = e.organizacao_id::text
        || '/'
        || e.id::text
        || '/CAL-'
        || lpad(e.numero_certificado::text, 6, '0')
        || case
          when e.numero_revisao > 0
            then '-R' || lpad(e.numero_revisao::text, 3, '0')
          else ''
        end
        || '.pdf'
  )
  and public.current_user_perfil() in ('admin', 'gestor', 'tecnico')
);

create or replace function public.finalizar_calibracao_execucao(
  p_execucao_id uuid,
  p_pdf_storage_path text,
  p_pdf_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execucao public.calibracao_execucoes%rowtype;
  v_tipo_os_id uuid;
  v_estado_os_id uuid;
  v_os_id uuid;
  v_expected_pdf_storage_path text;
begin
  if coalesce(public.current_user_perfil(), '') not in ('admin', 'gestor', 'tecnico') then
    raise exception 'Usuario sem permissao para finalizar calibracao.';
  end if;

  select *
  into v_execucao
  from public.calibracao_execucoes
  where id = p_execucao_id
    and organizacao_id = public.current_organizacao_id()
  for update;

  if not found then
    raise exception 'Execucao de calibracao nao encontrada.';
  end if;

  if v_execucao.status in ('fechada', 'cancelada') then
    raise exception 'A calibracao fechada ou cancelada nao pode ser finalizada.';
  end if;

  if v_execucao.resultado_geral is null then
    raise exception 'Calcule o resultado geral antes de finalizar.';
  end if;

  if not exists (
    select 1 from public.calibracao_execucao_tabelas t
    where t.execucao_id = v_execucao.id
  ) then
    raise exception 'A calibracao nao possui tabelas.';
  end if;

  if exists (
    select 1
    from public.calibracao_execucao_tabelas t
    where t.execucao_id = v_execucao.id
      and (
        t.padrao_id is null
        or t.padrao_tabela_id is null
        or t.padrao_validade_snapshot is null
        or t.padrao_validade_snapshot < v_execucao.data_calibracao
      )
  ) then
    raise exception 'Todas as tabelas devem possuir padrao valido na data da calibracao.';
  end if;

  if exists (
    select 1
    from public.calibracao_execucao_tabelas t
    where t.execucao_id = v_execucao.id
      and not exists (
        select 1 from public.calibracao_execucao_pontos p
        where p.execucao_tabela_id = t.id
      )
  ) then
    raise exception 'Todas as tabelas devem possuir ao menos um ponto.';
  end if;

  if exists (
    select 1
    from public.calibracao_execucao_tabelas t
    join public.calibracao_execucao_pontos p on p.execucao_tabela_id = t.id
    where t.execucao_id = v_execucao.id
      and (
        p.incerteza_expandida is null
        or p.fator_abrangencia_k is null
        or (
          select count(*) from public.calibracao_execucao_leituras l
          where l.execucao_ponto_id = p.id
        ) <> t.quantidade_leituras_snapshot
      )
  ) then
    raise exception 'Todos os pontos devem possuir leituras e calculos completos.';
  end if;

  if v_execucao.criterio_conformidade_aplicado is distinct from (
    select exists (
      select 1 from public.calibracao_execucao_tabelas t
      where t.execucao_id = v_execucao.id
        and t.incluir_criterio_aceitacao_snapshot
    )
  ) then
    raise exception 'A configuracao geral do criterio de aceitacao esta inconsistente.';
  end if;

  if exists (
    select 1 from public.calibracao_execucao_tabelas t
    where t.execucao_id = v_execucao.id
      and t.incluir_criterio_aceitacao_snapshot
      and (
        t.criterio_aceitacao_tipo_snapshot is null
        or t.criterio_aceitacao_valor_maximo_snapshot is null
        or (
          t.criterio_aceitacao_tipo_snapshot = 'faixa'
          and t.criterio_aceitacao_valor_minimo_snapshot is null
        )
        or t.regra_decisao_snapshot is null
      )
  ) then
    raise exception 'Todas as tabelas devem possuir criterio e regra de decisao.';
  end if;

  if exists (
    select 1
    from public.calibracao_execucao_tabelas t
    join public.calibracao_execucao_pontos p on p.execucao_tabela_id = t.id
    where t.execucao_id = v_execucao.id
      and t.incluir_criterio_aceitacao_snapshot
      and (
        p.resultado_conformidade is null
        or p.resultado_conformidade not in ('conforme', 'nao_conforme')
      )
  ) then
    raise exception 'Todos os pontos devem possuir avaliacao de conformidade.';
  end if;

  if (
    not v_execucao.criterio_conformidade_aplicado
    and v_execucao.resultado_geral <> 'sem_declaracao_conformidade'
  ) then
    raise exception 'Resultado geral invalido para calibracao sem declaracao de conformidade.';
  end if;

  if (
    v_execucao.criterio_conformidade_aplicado
    and v_execucao.resultado_geral not in ('conforme', 'nao_conforme')
  ) then
    raise exception 'Resultado geral invalido para calibracao com declaracao de conformidade.';
  end if;

  if (
    v_execucao.criterio_conformidade_aplicado
    and v_execucao.resultado_geral = 'conforme'
    and exists (
      select 1
      from public.calibracao_execucao_tabelas t
      join public.calibracao_execucao_pontos p on p.execucao_tabela_id = t.id
      where t.execucao_id = v_execucao.id
        and t.incluir_criterio_aceitacao_snapshot
        and p.resultado_conformidade <> 'conforme'
    )
  ) then
    raise exception 'Resultado geral inconsistente com os resultados dos pontos.';
  end if;

  if (
    v_execucao.criterio_conformidade_aplicado
    and v_execucao.resultado_geral = 'nao_conforme'
    and not exists (
      select 1
      from public.calibracao_execucao_tabelas t
      join public.calibracao_execucao_pontos p on p.execucao_tabela_id = t.id
      where t.execucao_id = v_execucao.id
        and t.incluir_criterio_aceitacao_snapshot
        and p.resultado_conformidade = 'nao_conforme'
    )
  ) then
    raise exception 'Resultado geral inconsistente com os resultados dos pontos.';
  end if;

  v_expected_pdf_storage_path :=
    v_execucao.organizacao_id::text
    || '/'
    || v_execucao.id::text
    || '/CAL-'
    || lpad(v_execucao.numero_certificado::text, 6, '0')
    || case
      when v_execucao.numero_revisao > 0
        then '-R' || lpad(v_execucao.numero_revisao::text, 3, '0')
      else ''
    end
    || '.pdf';

  if p_pdf_storage_path is distinct from v_expected_pdf_storage_path then
    raise exception 'Caminho do certificado PDF invalido.';
  end if;

  if p_pdf_hash is null or p_pdf_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Hash SHA-256 do certificado PDF invalido.';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'calibracao-certificados'
      and o.name = p_pdf_storage_path
  ) then
    raise exception 'Certificado PDF nao encontrado no storage.';
  end if;

  v_os_id := v_execucao.os_id;

  if v_os_id is null then
    select id into v_tipo_os_id
    from public.tipos_os
    where organizacao_id = v_execucao.organizacao_id
      and ativo
      and lower(nome) in (
        lower('Calibracao'),
        lower(U&'Calibra\00e7\00e3o')
      )
    limit 1;

    select id into v_estado_os_id
    from public.estados_os
    where organizacao_id = v_execucao.organizacao_id
      and ativo
      and finaliza_os
    order by ordem desc
    limit 1;

    if v_tipo_os_id is null then
      raise exception 'Cadastre um tipo de OS ativo chamado Calibracao antes de finalizar.';
    end if;

    if v_estado_os_id is null then
      raise exception 'Cadastre um estado final ativo de OS antes de finalizar.';
    end if;

    insert into public.ordens_servico (
      organizacao_id, empresa_id, equipamento_id, tipo_os_id, estado_os_id,
      solicitante_texto, responsavel_texto, data_abertura, data_fechamento,
      descricao_servico, observacoes, prioridade, status_sistema, ativo
    )
    values (
      v_execucao.organizacao_id, v_execucao.empresa_id, v_execucao.equipamento_id,
      v_tipo_os_id, v_estado_os_id, v_execucao.responsavel_solicitante,
      v_execucao.responsavel_tecnico_nome, now(), now(),
      'Calibracao executada. Certificado CAL-' || lpad(v_execucao.numero_certificado::text, 6, '0') || '.',
      v_execucao.observacoes, 'normal', 'fechada', true
    )
    returning id into v_os_id;

    insert into public.ordem_servico_historico (
      ordem_servico_id, estado_novo_id, acao, observacao
    )
    values (
      v_os_id, v_estado_os_id, 'criada_calibracao',
      'Ordem de Servico fechada gerada automaticamente pela calibracao.'
    );
  end if;

  update public.calibracao_execucoes
  set
    os_id = v_os_id,
    pdf_storage_path = p_pdf_storage_path,
    pdf_hash = p_pdf_hash,
    status = 'fechada',
    fechado_em = now()
  where id = p_execucao_id;

  update public.equipamentos
  set
    data_ultima_calibracao = v_execucao.data_calibracao,
    data_proxima_calibracao = v_execucao.data_validade
  where id = v_execucao.equipamento_id
    and organizacao_id = v_execucao.organizacao_id;

  return v_os_id;
end;
$$;

alter function public.finalizar_calibracao_execucao(uuid, text, text) owner to postgres;
revoke all on function public.finalizar_calibracao_execucao(uuid, text, text) from public;
grant execute on function public.finalizar_calibracao_execucao(uuid, text, text) to authenticated;

-- ============================================================
-- Fim da migration 028_calibracao_execucoes_revisoes.sql
-- ============================================================

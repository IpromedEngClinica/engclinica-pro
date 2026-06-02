-- ============================================================
-- EngClinica Pro
-- Migration: 032_refinar_planos_fluxo_recorrente.sql
-- Objetivo:
-- - Refinar visitas recorrentes dos planos
-- - Registrar abertura, finalizacao e cancelamento dos itens
-- - Vincular OS e calibracoes a origem operacional do plano
-- - Finalizar calibracoes do plano sem gerar OS
-- ============================================================

alter table public.plano_execucoes
add column if not exists data_abertura date null;

alter table public.plano_execucoes
add column if not exists data_fechamento date null;

alter table public.plano_execucao_itens
add column if not exists motivo_cancelamento text null;

alter table public.plano_execucao_itens
add column if not exists aberto_em timestamp with time zone null;

alter table public.plano_execucao_itens
add column if not exists finalizado_em timestamp with time zone null;

update public.plano_execucao_itens
set aberto_em = iniciado_em
where aberto_em is null
  and iniciado_em is not null;

update public.plano_execucao_itens
set finalizado_em = concluido_em
where finalizado_em is null
  and concluido_em is not null;

alter table public.plano_execucao_itens
drop constraint if exists plano_execucao_itens_status_check;

alter table public.plano_execucao_itens
add constraint plano_execucao_itens_status_check check (
  status in ('pendente', 'aberto', 'em_execucao', 'concluido', 'cancelado')
);

alter table public.ordens_servico
add column if not exists plano_id uuid null references public.planos(id) on delete set null;

alter table public.ordens_servico
add column if not exists plano_execucao_id uuid null references public.plano_execucoes(id) on delete set null;

alter table public.ordens_servico
add column if not exists plano_execucao_item_id uuid null references public.plano_execucao_itens(id) on delete set null;

create index if not exists idx_os_plano
on public.ordens_servico (plano_id);

create index if not exists idx_os_plano_execucao
on public.ordens_servico (plano_execucao_id);

create index if not exists idx_os_plano_execucao_item
on public.ordens_servico (plano_execucao_item_id);

alter table public.calibracao_execucoes
add column if not exists origem text null;

alter table public.calibracao_execucoes
add column if not exists plano_id uuid null references public.planos(id) on delete set null;

alter table public.calibracao_execucoes
add column if not exists plano_execucao_id uuid null references public.plano_execucoes(id) on delete set null;

alter table public.calibracao_execucoes
add column if not exists plano_execucao_item_id uuid null references public.plano_execucao_itens(id) on delete set null;

alter table public.calibracao_execucoes
drop constraint if exists calibracao_execucoes_origem_check;

alter table public.calibracao_execucoes
add constraint calibracao_execucoes_origem_check check (
  origem is null or origem in ('plano')
);

create index if not exists idx_calibracao_execucoes_plano
on public.calibracao_execucoes (plano_id);

create index if not exists idx_calibracao_execucoes_plano_execucao
on public.calibracao_execucoes (plano_execucao_id);

create index if not exists idx_calibracao_execucoes_plano_execucao_item
on public.calibracao_execucoes (plano_execucao_item_id);

create or replace function public.validar_vinculos_origem_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'calibracao_execucoes'
    and new.origem = 'plano'
    and (
      new.plano_id is null
      or new.plano_execucao_id is null
      or new.plano_execucao_item_id is null
    )
  then
    raise exception 'Informe os vinculos completos da calibracao com o plano.';
  end if;

  if (
    new.plano_id is not null
    or new.plano_execucao_id is not null
    or new.plano_execucao_item_id is not null
  ) and not exists (
    select 1
    from public.plano_execucao_itens i
    join public.plano_execucoes e on e.id = i.execucao_id
    join public.planos p on p.id = e.plano_id
    where i.id = new.plano_execucao_item_id
      and e.id = new.plano_execucao_id
      and p.id = new.plano_id
      and i.organizacao_id = new.organizacao_id
      and e.organizacao_id = new.organizacao_id
      and p.organizacao_id = new.organizacao_id
  ) then
    raise exception 'Os vinculos informados nao pertencem ao mesmo plano e organizacao.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_os_validar_vinculos_origem_plano
on public.ordens_servico;

create trigger trg_os_validar_vinculos_origem_plano
before insert or update of plano_id, plano_execucao_id, plano_execucao_item_id
on public.ordens_servico
for each row execute function public.validar_vinculos_origem_plano();

drop trigger if exists trg_calibracao_validar_vinculos_origem_plano
on public.calibracao_execucoes;

create trigger trg_calibracao_validar_vinculos_origem_plano
before insert or update of origem, plano_id, plano_execucao_id, plano_execucao_item_id
on public.calibracao_execucoes
for each row execute function public.validar_vinculos_origem_plano();

create or replace function public.finalizar_calibracao_execucao_plano(
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

  if v_execucao.origem is distinct from 'plano' or v_execucao.plano_execucao_item_id is null then
    raise exception 'A calibracao informada nao pertence a um plano.';
  end if;

  if v_execucao.status in ('fechada', 'cancelada') then
    raise exception 'A calibracao fechada ou cancelada nao pode ser finalizada.';
  end if;

  if v_execucao.resultado_geral is null then
    raise exception 'Calcule o resultado geral antes de finalizar.';
  end if;

  if not exists (
    select 1
    from public.calibracao_execucao_tabelas t
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
        select 1
        from public.calibracao_execucao_pontos p
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
          select count(*)
          from public.calibracao_execucao_leituras l
          where l.execucao_ponto_id = p.id
        ) <> t.quantidade_leituras_snapshot
      )
  ) then
    raise exception 'Todos os pontos devem possuir leituras e calculos completos.';
  end if;

  if v_execucao.criterio_conformidade_aplicado is distinct from (
    select exists (
      select 1
      from public.calibracao_execucao_tabelas t
      where t.execucao_id = v_execucao.id
        and t.incluir_criterio_aceitacao_snapshot
    )
  ) then
    raise exception 'A configuracao geral do criterio de aceitacao esta inconsistente.';
  end if;

  if exists (
    select 1
    from public.calibracao_execucao_tabelas t
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
    select 1
    from storage.objects o
    where o.bucket_id = 'calibracao-certificados'
      and o.name = p_pdf_storage_path
  ) then
    raise exception 'Certificado PDF nao encontrado no storage.';
  end if;

  update public.calibracao_execucoes
  set
    pdf_storage_path = p_pdf_storage_path,
    pdf_hash = p_pdf_hash,
    status = 'fechada',
    fechado_em = now()
  where id = v_execucao.id;

  update public.equipamentos
  set
    data_ultima_calibracao = v_execucao.data_calibracao,
    data_proxima_calibracao = v_execucao.data_validade
  where id = v_execucao.equipamento_id
    and organizacao_id = v_execucao.organizacao_id;

  return v_execucao.id;
end;
$$;

alter function public.finalizar_calibracao_execucao_plano(uuid, text, text) owner to postgres;
revoke all on function public.finalizar_calibracao_execucao_plano(uuid, text, text) from public;
grant execute on function public.finalizar_calibracao_execucao_plano(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- Fim da migration 032_refinar_planos_fluxo_recorrente.sql
-- ============================================================

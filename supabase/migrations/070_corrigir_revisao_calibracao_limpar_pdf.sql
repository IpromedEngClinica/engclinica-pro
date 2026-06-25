-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 070_corrigir_revisao_calibracao_limpar_pdf.sql
-- Objetivo:
-- - Permitir editar calibracoes finalizadas em revisao sem violar RLS
-- - Limpar referencias ao PDF/hash anterior antes de regerar o certificado
-- ============================================================

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
    fechado_em = null,
    pdf_storage_path = null,
    pdf_hash = null
  where id = v_execucao.id;

  return v_numero_revisao;
end;
$$;

alter function public.iniciar_revisao_calibracao_execucao(uuid, text) owner to postgres;
revoke all on function public.iniciar_revisao_calibracao_execucao(uuid, text) from public;
grant execute on function public.iniciar_revisao_calibracao_execucao(uuid, text) to authenticated;

-- Corrige revisoes iniciadas antes desta migration que ficaram com PDF antigo vinculado.
update public.calibracao_execucoes
set
  pdf_storage_path = null,
  pdf_hash = null,
  updated_at = now()
where status = 'em_execucao'
  and atualizado_apos_finalizacao = true
  and fechado_em is null
  and (pdf_storage_path is not null or pdf_hash is not null);

notify pgrst, 'reload schema';

-- Fim da migration 070_corrigir_revisao_calibracao_limpar_pdf.sql

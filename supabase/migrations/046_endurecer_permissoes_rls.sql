-- ============================================================
-- EngClinica Pro
-- Migration: 046_endurecer_permissoes_rls.sql
-- Objetivo:
-- - Fazer as policies obedecerem a matriz de permissoes
-- - Remover liberacoes antigas por perfil fixo, principalmente tecnico
-- ============================================================

update public.perfil_permissoes
set permitido = false, updated_at = now()
where perfil = 'tecnico'
  and permissao_chave in (
    'empresas.gerenciar',
    'orcamentos.visualizar',
    'orcamentos.gerenciar',
    'contratos.visualizar',
    'contratos.gerenciar',
    'campos_gerenciais.gerenciar',
    'usuarios.gerenciar'
  );

update public.perfil_permissoes
set permitido = false, updated_at = now()
where perfil = 'solicitante'
  and permissao_chave not in (
    'dashboard.visualizar',
    'equipamentos.visualizar',
    'os.visualizar',
    'calibracao.visualizar',
    'seguranca_eletrica.visualizar',
    'protocolos.visualizar'
  );

-- Empresas e setores
drop policy if exists "empresas_select_mesma_organizacao" on public.empresas;
drop policy if exists "empresas_select_hierarquia" on public.empresas;
drop policy if exists "empresas_insert_admin_gestor" on public.empresas;
drop policy if exists "empresas_update_admin_gestor" on public.empresas;

create policy "empresas_select_por_permissao"
on public.empresas
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.visualizar')
  and (
    not public.is_solicitante()
    or id = public.current_empresa_id()
  )
);

create policy "empresas_insert_por_permissao"
on public.empresas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.gerenciar')
);

create policy "empresas_update_por_permissao"
on public.empresas
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.gerenciar')
);

drop policy if exists "empresa_setores_select_mesma_organizacao" on public.empresa_setores;
drop policy if exists "empresa_setores_select_hierarquia" on public.empresa_setores;
drop policy if exists "empresa_setores_write_admin_gestor" on public.empresa_setores;

create policy "empresa_setores_select_por_permissao"
on public.empresa_setores
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "empresa_setores_write_por_permissao"
on public.empresa_setores
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('empresas.gerenciar')
);

-- Equipamentos
drop policy if exists "equipamentos_select_mesma_organizacao" on public.equipamentos;
drop policy if exists "equipamentos_select_hierarquia" on public.equipamentos;
drop policy if exists "equipamentos_insert_admin_gestor_tecnico" on public.equipamentos;
drop policy if exists "equipamentos_update_admin_gestor_tecnico" on public.equipamentos;

create policy "equipamentos_select_por_permissao"
on public.equipamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('equipamentos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "equipamentos_insert_por_permissao"
on public.equipamentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('equipamentos.gerenciar')
);

create policy "equipamentos_update_por_permissao"
on public.equipamentos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('equipamentos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('equipamentos.gerenciar')
);

-- Ordens de servico
drop policy if exists "os_select_mesma_organizacao" on public.ordens_servico;
drop policy if exists "os_select_hierarquia" on public.ordens_servico;
drop policy if exists "os_insert_admin_gestor_tecnico" on public.ordens_servico;
drop policy if exists "os_update_admin_gestor_tecnico" on public.ordens_servico;

create policy "os_select_por_permissao"
on public.ordens_servico
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('os.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "os_insert_por_permissao"
on public.ordens_servico
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('os.gerenciar')
);

create policy "os_update_por_permissao"
on public.ordens_servico
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('os.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('os.gerenciar')
);

drop policy if exists "os_acessorios_select_mesma_organizacao" on public.ordem_servico_acessorios;
drop policy if exists "os_acessorios_insert_mesma_organizacao" on public.ordem_servico_acessorios;
drop policy if exists "os_acessorios_update_mesma_organizacao" on public.ordem_servico_acessorios;
drop policy if exists "os_acessorios_delete_mesma_organizacao" on public.ordem_servico_acessorios;

create policy "os_acessorios_select_por_permissao"
on public.ordem_servico_acessorios
for select
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('os.visualizar')
      and (
        not public.is_solicitante()
        or os.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "os_acessorios_write_por_permissao"
on public.ordem_servico_acessorios
for all
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('os.gerenciar')
  )
)
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_acessorios.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('os.gerenciar')
  )
);

drop policy if exists "os_historico_select_mesma_organizacao" on public.ordem_servico_historico;
drop policy if exists "os_historico_insert_mesma_organizacao" on public.ordem_servico_historico;

create policy "os_historico_select_por_permissao"
on public.ordem_servico_historico
for select
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_historico.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('os.visualizar')
      and (
        not public.is_solicitante()
        or os.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "os_historico_insert_por_permissao"
on public.ordem_servico_historico
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = ordem_servico_historico.ordem_servico_id
      and os.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('os.gerenciar')
  )
);

-- Orcamentos
drop policy if exists "orcamentos_select_mesma_organizacao" on public.orcamentos;
drop policy if exists "orcamentos_select_hierarquia" on public.orcamentos;
drop policy if exists "orcamentos_insert_admin_gestor_tecnico" on public.orcamentos;
drop policy if exists "orcamentos_update_admin_gestor_tecnico" on public.orcamentos;

create policy "orcamentos_select_por_permissao"
on public.orcamentos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('orcamentos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "orcamentos_insert_por_permissao"
on public.orcamentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('orcamentos.gerenciar')
);

create policy "orcamentos_update_por_permissao"
on public.orcamentos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('orcamentos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('orcamentos.gerenciar')
);

drop policy if exists "orcamento_itens_select_mesma_organizacao" on public.orcamento_itens;
drop policy if exists "orcamento_itens_insert_mesma_organizacao" on public.orcamento_itens;
drop policy if exists "orcamento_itens_update_mesma_organizacao" on public.orcamento_itens;
drop policy if exists "orcamento_itens_delete_mesma_organizacao" on public.orcamento_itens;

create policy "orcamento_itens_select_por_permissao"
on public.orcamento_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('orcamentos.visualizar')
      and (
        not public.is_solicitante()
        or o.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "orcamento_itens_write_por_permissao"
on public.orcamento_itens
for all
to authenticated
using (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('orcamentos.gerenciar')
  )
)
with check (
  exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('orcamentos.gerenciar')
  )
);

-- Protocolos
drop policy if exists "protocolos_os_select_mesma_organizacao" on public.protocolos_os;
drop policy if exists "protocolos_os_select_hierarquia" on public.protocolos_os;
drop policy if exists "protocolos_os_insert_admin_gestor_tecnico" on public.protocolos_os;
drop policy if exists "protocolos_os_update_admin_gestor_tecnico" on public.protocolos_os;

create policy "protocolos_os_select_por_permissao"
on public.protocolos_os
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('protocolos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "protocolos_os_insert_por_permissao"
on public.protocolos_os
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('protocolos.gerenciar')
);

create policy "protocolos_os_update_por_permissao"
on public.protocolos_os
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('protocolos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('protocolos.gerenciar')
);

drop policy if exists "protocolo_os_acessorios_select_mesma_organizacao" on public.protocolo_os_acessorios;
drop policy if exists "protocolo_os_acessorios_insert_mesma_organizacao" on public.protocolo_os_acessorios;
drop policy if exists "protocolo_os_acessorios_update_mesma_organizacao" on public.protocolo_os_acessorios;
drop policy if exists "protocolo_os_acessorios_delete_mesma_organizacao" on public.protocolo_os_acessorios;

create policy "protocolo_os_acessorios_select_por_permissao"
on public.protocolo_os_acessorios
for select
to authenticated
using (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('protocolos.visualizar')
      and (
        not public.is_solicitante()
        or p.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "protocolo_os_acessorios_write_por_permissao"
on public.protocolo_os_acessorios
for all
to authenticated
using (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('protocolos.gerenciar')
  )
)
with check (
  exists (
    select 1
    from public.protocolos_os p
    where p.id = protocolo_os_acessorios.protocolo_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('protocolos.gerenciar')
  )
);

-- Contratos
drop policy if exists "contratos_select_mesma_organizacao" on public.contratos;
drop policy if exists "contratos_select_hierarquia" on public.contratos;
drop policy if exists "contratos_insert_admin_gestor_financeiro" on public.contratos;
drop policy if exists "contratos_update_admin_gestor_financeiro" on public.contratos;
drop policy if exists "contratos_insert_admin_gestor_comercial" on public.contratos;
drop policy if exists "contratos_update_admin_gestor_comercial" on public.contratos;

create policy "contratos_select_por_permissao"
on public.contratos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "contratos_insert_por_permissao"
on public.contratos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.gerenciar')
);

create policy "contratos_update_por_permissao"
on public.contratos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.gerenciar')
);

drop policy if exists "contrato_documentos_select_mesma_organizacao" on public.contrato_documentos;
drop policy if exists "contrato_documentos_insert_admin_gestor_financeiro" on public.contrato_documentos;
drop policy if exists "contrato_documentos_delete_admin_gestor_financeiro" on public.contrato_documentos;
drop policy if exists "contrato_documentos_insert_admin_gestor_comercial" on public.contrato_documentos;
drop policy if exists "contrato_documentos_delete_admin_gestor_comercial" on public.contrato_documentos;

create policy "contrato_documentos_select_por_permissao"
on public.contrato_documentos
for select
to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and c.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('contratos.visualizar')
      and (
        not public.is_solicitante()
        or c.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "contrato_documentos_insert_por_permissao"
on public.contrato_documentos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.gerenciar')
);

create policy "contrato_documentos_delete_por_permissao"
on public.contrato_documentos
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('contratos.gerenciar')
);

-- Laudos
drop policy if exists "laudos_obsolescencia_select_mesma_organizacao" on public.laudos_obsolescencia;
drop policy if exists "laudos_obsolescencia_select_hierarquia" on public.laudos_obsolescencia;
drop policy if exists "laudos_obsolescencia_insert_admin_gestor_tecnico" on public.laudos_obsolescencia;
drop policy if exists "laudos_obsolescencia_update_admin_gestor" on public.laudos_obsolescencia;

create policy "laudos_obsolescencia_select_por_permissao"
on public.laudos_obsolescencia
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('laudos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "laudos_obsolescencia_insert_por_permissao"
on public.laudos_obsolescencia
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('laudos.gerenciar')
);

create policy "laudos_obsolescencia_update_por_permissao"
on public.laudos_obsolescencia
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('laudos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('laudos.gerenciar')
);

-- Calibracao
drop policy if exists "calibracao_execucoes_select_mesma_organizacao" on public.calibracao_execucoes;
drop policy if exists "calibracao_execucoes_select_hierarquia" on public.calibracao_execucoes;
drop policy if exists "calibracao_execucoes_insert_admin_gestor_tecnico" on public.calibracao_execucoes;
drop policy if exists "calibracao_execucoes_update_admin_gestor_tecnico" on public.calibracao_execucoes;

create policy "calibracao_execucoes_select_por_permissao"
on public.calibracao_execucoes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "calibracao_execucoes_insert_por_permissao"
on public.calibracao_execucoes
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and status = 'rascunho'
  and os_id is null
  and pdf_storage_path is null
  and pdf_hash is null
  and fechado_em is null
  and public.user_has_permission('calibracao.gerenciar')
);

create policy "calibracao_execucoes_update_por_permissao"
on public.calibracao_execucoes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and status not in ('fechada', 'cancelada')
  and public.user_has_permission('calibracao.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and status in ('rascunho', 'em_execucao', 'cancelada')
  and os_id is null
  and pdf_storage_path is null
  and pdf_hash is null
  and fechado_em is null
  and public.user_has_permission('calibracao.gerenciar')
);

drop policy if exists "calibracao_execucao_tabelas_select_mesma_organizacao" on public.calibracao_execucao_tabelas;
drop policy if exists "calibracao_execucao_tabelas_insert_editavel" on public.calibracao_execucao_tabelas;
drop policy if exists "calibracao_execucao_tabelas_delete_editavel" on public.calibracao_execucao_tabelas;

create policy "calibracao_execucao_tabelas_select_por_permissao"
on public.calibracao_execucao_tabelas
for select
to authenticated
using (
  exists (
    select 1
    from public.calibracao_execucoes e
    where e.id = calibracao_execucao_tabelas.execucao_id
      and e.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('calibracao.visualizar')
      and (
        not public.is_solicitante()
        or e.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "calibracao_execucao_tabelas_insert_por_permissao"
on public.calibracao_execucao_tabelas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.id = calibracao_execucao_tabelas.execucao_id
      and e.organizacao_id = public.current_organizacao_id()
      and e.status not in ('fechada', 'cancelada')
  )
);

create policy "calibracao_execucao_tabelas_delete_por_permissao"
on public.calibracao_execucao_tabelas
for delete
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
  and exists (
    select 1
    from public.calibracao_execucoes e
    where e.id = calibracao_execucao_tabelas.execucao_id
      and e.status not in ('fechada', 'cancelada')
  )
);

drop policy if exists "calibracao_execucao_pontos_select_mesma_organizacao" on public.calibracao_execucao_pontos;
drop policy if exists "calibracao_execucao_pontos_insert_editavel" on public.calibracao_execucao_pontos;
drop policy if exists "calibracao_execucao_pontos_update_editavel" on public.calibracao_execucao_pontos;
drop policy if exists "calibracao_execucao_pontos_delete_editavel" on public.calibracao_execucao_pontos;

create policy "calibracao_execucao_pontos_select_por_permissao"
on public.calibracao_execucao_pontos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.visualizar')
);

create policy "calibracao_execucao_pontos_write_por_permissao"
on public.calibracao_execucao_pontos
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
);

drop policy if exists "calibracao_execucao_leituras_select_mesma_organizacao" on public.calibracao_execucao_leituras;
drop policy if exists "calibracao_execucao_leituras_insert_editavel" on public.calibracao_execucao_leituras;
drop policy if exists "calibracao_execucao_leituras_delete_editavel" on public.calibracao_execucao_leituras;

create policy "calibracao_execucao_leituras_select_por_permissao"
on public.calibracao_execucao_leituras
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.visualizar')
);

create policy "calibracao_execucao_leituras_write_por_permissao"
on public.calibracao_execucao_leituras
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
);

drop policy if exists "calibracao_execucao_componentes_select_mesma_organizacao" on public.calibracao_execucao_componentes_incerteza;
drop policy if exists "calibracao_execucao_componentes_insert_editavel" on public.calibracao_execucao_componentes_incerteza;
drop policy if exists "calibracao_execucao_componentes_delete_editavel" on public.calibracao_execucao_componentes_incerteza;

create policy "calibracao_execucao_componentes_select_por_permissao"
on public.calibracao_execucao_componentes_incerteza
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.visualizar')
);

create policy "calibracao_execucao_componentes_write_por_permissao"
on public.calibracao_execucao_componentes_incerteza
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('calibracao.gerenciar')
);

-- Seguranca eletrica
drop policy if exists "seguranca_eletrica_execucoes_select_mesma_organizacao" on public.seguranca_eletrica_execucoes;
drop policy if exists "seguranca_eletrica_execucoes_select_hierarquia" on public.seguranca_eletrica_execucoes;
drop policy if exists "seguranca_eletrica_execucoes_insert_admin_gestor_tecnico" on public.seguranca_eletrica_execucoes;
drop policy if exists "seguranca_eletrica_execucoes_update_admin_gestor_tecnico" on public.seguranca_eletrica_execucoes;

create policy "seguranca_eletrica_execucoes_select_por_permissao"
on public.seguranca_eletrica_execucoes
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "seguranca_eletrica_execucoes_insert_por_permissao"
on public.seguranca_eletrica_execucoes
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.gerenciar')
);

create policy "seguranca_eletrica_execucoes_update_por_permissao"
on public.seguranca_eletrica_execucoes
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.gerenciar')
);

drop policy if exists "seguranca_eletrica_resultados_select_mesma_organizacao" on public.seguranca_eletrica_resultados;
drop policy if exists "seguranca_eletrica_resultados_insert_mesma_organizacao" on public.seguranca_eletrica_resultados;
drop policy if exists "seguranca_eletrica_resultados_delete_mesma_organizacao" on public.seguranca_eletrica_resultados;

create policy "seguranca_eletrica_resultados_select_por_permissao"
on public.seguranca_eletrica_resultados
for select
to authenticated
using (
  exists (
    select 1
    from public.seguranca_eletrica_execucoes e
    where e.id = seguranca_eletrica_resultados.execucao_id
      and e.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('seguranca_eletrica.visualizar')
      and (
        not public.is_solicitante()
        or e.empresa_id = public.current_empresa_id()
      )
  )
);

create policy "seguranca_eletrica_resultados_write_por_permissao"
on public.seguranca_eletrica_resultados
for all
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('seguranca_eletrica.gerenciar')
);

-- Planos
drop policy if exists "planos_select_mesma_organizacao" on public.planos;
drop policy if exists "planos_select_hierarquia" on public.planos;
drop policy if exists "planos_insert_admin_gestor_tecnico" on public.planos;
drop policy if exists "planos_update_admin_gestor_tecnico" on public.planos;

create policy "planos_select_por_permissao"
on public.planos
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('planos.visualizar')
  and (
    not public.is_solicitante()
    or empresa_id = public.current_empresa_id()
  )
);

create policy "planos_insert_por_permissao"
on public.planos
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('planos.gerenciar')
);

create policy "planos_update_por_permissao"
on public.planos
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('planos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('planos.gerenciar')
);

drop policy if exists "plano_setores_select_mesma_organizacao" on public.plano_setores;
drop policy if exists "plano_setores_write_admin_gestor_tecnico" on public.plano_setores;
drop policy if exists "plano_equipamentos_select_mesma_organizacao" on public.plano_equipamentos;
drop policy if exists "plano_equipamentos_write_admin_gestor_tecnico" on public.plano_equipamentos;
drop policy if exists "plano_ciclos_select_mesma_organizacao" on public.plano_ciclos;
drop policy if exists "plano_ciclos_write_admin_gestor_tecnico" on public.plano_ciclos;
drop policy if exists "plano_ciclo_setores_select_mesma_organizacao" on public.plano_ciclo_setores;
drop policy if exists "plano_ciclo_setores_write_admin_gestor_tecnico" on public.plano_ciclo_setores;
drop policy if exists "plano_ciclo_itens_select_mesma_organizacao" on public.plano_ciclo_itens;
drop policy if exists "plano_ciclo_itens_write_admin_gestor_tecnico" on public.plano_ciclo_itens;

create policy "plano_setores_select_por_permissao"
on public.plano_setores
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_setores_write_por_permissao"
on public.plano_setores
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

create policy "plano_equipamentos_select_por_permissao"
on public.plano_equipamentos
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_equipamentos_write_por_permissao"
on public.plano_equipamentos
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

create policy "plano_ciclos_select_por_permissao"
on public.plano_ciclos
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_ciclos_write_por_permissao"
on public.plano_ciclos
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

create policy "plano_ciclo_setores_select_por_permissao"
on public.plano_ciclo_setores
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_ciclo_setores_write_por_permissao"
on public.plano_ciclo_setores
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

create policy "plano_ciclo_itens_select_por_permissao"
on public.plano_ciclo_itens
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_ciclo_itens_write_por_permissao"
on public.plano_ciclo_itens
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

drop policy if exists "plano_relatorios_anuais_select_mesma_organizacao" on public.plano_relatorios_anuais;
drop policy if exists "plano_relatorios_anuais_write_admin_gestor_tecnico" on public.plano_relatorios_anuais;

create policy "plano_relatorios_anuais_select_por_permissao"
on public.plano_relatorios_anuais
for select to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.visualizar'));

create policy "plano_relatorios_anuais_write_por_permissao"
on public.plano_relatorios_anuais
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('planos.gerenciar'));

-- Relatorios
drop policy if exists "relatorios_select_mesma_organizacao" on public.relatorios;
drop policy if exists "relatorios_insert_admin_gestor_tecnico" on public.relatorios;
drop policy if exists "relatorios_update_admin_gestor_tecnico" on public.relatorios;

create policy "relatorios_select_por_permissao"
on public.relatorios
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('relatorios.visualizar')
);

create policy "relatorios_insert_por_permissao"
on public.relatorios
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('relatorios.gerenciar')
);

create policy "relatorios_update_por_permissao"
on public.relatorios
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('relatorios.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('relatorios.gerenciar')
);

-- Procedimentos preventivos
drop policy if exists "procedimentos_preventiva_select_mesma_organizacao" on public.procedimentos_preventiva;
drop policy if exists "procedimentos_preventiva_insert_admin_gestor_tecnico" on public.procedimentos_preventiva;
drop policy if exists "procedimentos_preventiva_update_admin_gestor_tecnico" on public.procedimentos_preventiva;

create policy "procedimentos_preventiva_select_por_permissao"
on public.procedimentos_preventiva
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('procedimentos.visualizar')
);

create policy "procedimentos_preventiva_insert_por_permissao"
on public.procedimentos_preventiva
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('procedimentos.gerenciar')
);

create policy "procedimentos_preventiva_update_por_permissao"
on public.procedimentos_preventiva
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('procedimentos.gerenciar')
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.user_has_permission('procedimentos.gerenciar')
);

drop policy if exists "procedimento_preventiva_itens_select_mesma_organizacao" on public.procedimento_preventiva_itens;
drop policy if exists "procedimento_preventiva_itens_insert_mesma_organizacao" on public.procedimento_preventiva_itens;
drop policy if exists "procedimento_preventiva_itens_update_mesma_organizacao" on public.procedimento_preventiva_itens;
drop policy if exists "procedimento_preventiva_itens_delete_mesma_organizacao" on public.procedimento_preventiva_itens;

create policy "procedimento_preventiva_itens_select_por_permissao"
on public.procedimento_preventiva_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('procedimentos.visualizar')
  )
);

create policy "procedimento_preventiva_itens_write_por_permissao"
on public.procedimento_preventiva_itens
for all
to authenticated
using (
  exists (
    select 1
    from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('procedimentos.gerenciar')
  )
)
with check (
  exists (
    select 1
    from public.procedimentos_preventiva p
    where p.id = procedimento_preventiva_itens.procedimento_id
      and p.organizacao_id = public.current_organizacao_id()
      and public.user_has_permission('procedimentos.gerenciar')
  )
);

-- Campos gerenciais
drop policy if exists "tipos_equipamento_insert_admin_gestor" on public.tipos_equipamento;
drop policy if exists "tipos_equipamento_update_admin_gestor" on public.tipos_equipamento;
drop policy if exists "tipos_os_insert_admin_gestor" on public.tipos_os;
drop policy if exists "tipos_os_update_admin_gestor" on public.tipos_os;
drop policy if exists "estados_os_insert_admin_gestor" on public.estados_os;
drop policy if exists "estados_os_update_admin_gestor" on public.estados_os;
drop policy if exists "pecas_insert_admin_gestor" on public.pecas;
drop policy if exists "pecas_update_admin_gestor" on public.pecas;
drop policy if exists "peca_fabricantes_insert_admin_gestor" on public.peca_fabricantes;
drop policy if exists "peca_fabricantes_update_admin_gestor" on public.peca_fabricantes;
drop policy if exists "peca_modelos_insert_admin_gestor" on public.peca_modelos;
drop policy if exists "peca_modelos_update_admin_gestor" on public.peca_modelos;
drop policy if exists "peca_variacoes_insert_admin_gestor" on public.peca_variacoes;
drop policy if exists "peca_variacoes_update_admin_gestor" on public.peca_variacoes;

create policy "tipos_equipamento_write_por_permissao"
on public.tipos_equipamento
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "tipos_os_write_por_permissao"
on public.tipos_os
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "estados_os_write_por_permissao"
on public.estados_os
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "pecas_write_por_permissao"
on public.pecas
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "peca_fabricantes_write_por_permissao"
on public.peca_fabricantes
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "peca_modelos_write_por_permissao"
on public.peca_modelos
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

create policy "peca_variacoes_write_por_permissao"
on public.peca_variacoes
for all to authenticated
using (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'))
with check (organizacao_id = public.current_organizacao_id() and public.user_has_permission('campos_gerenciais.gerenciar'));

-- Storage
drop policy if exists "contratos_storage_select_mesma_organizacao" on storage.objects;
drop policy if exists "contratos_storage_insert_admin_gestor_financeiro" on storage.objects;
drop policy if exists "contratos_storage_delete_admin_gestor_financeiro" on storage.objects;
drop policy if exists "contratos_storage_insert_admin_gestor_comercial" on storage.objects;
drop policy if exists "contratos_storage_delete_admin_gestor_comercial" on storage.objects;

create policy "contratos_storage_select_por_permissao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('contratos.visualizar')
);

create policy "contratos_storage_insert_por_permissao"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('contratos.gerenciar')
);

create policy "contratos_storage_delete_por_permissao"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'contratos-documentos'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('contratos.gerenciar')
);

drop policy if exists "calibracao_certificados_storage_select_mesma_organizacao" on storage.objects;
drop policy if exists "calibracao_certificados_storage_insert_admin_gestor_tecnico" on storage.objects;
drop policy if exists "calibracao_certificados_storage_update_admin_gestor_tecnico" on storage.objects;
drop policy if exists "calibracao_certificados_storage_delete_execucao_aberta" on storage.objects;

create policy "calibracao_certificados_storage_select_por_permissao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'calibracao-certificados'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('calibracao.visualizar')
  and (
    not public.is_solicitante()
    or exists (
      select 1
      from public.calibracao_execucoes e
      where e.id::text = (storage.foldername(name))[2]
        and e.organizacao_id = public.current_organizacao_id()
        and e.empresa_id = public.current_empresa_id()
    )
  )
);

create policy "calibracao_certificados_storage_insert_por_permissao"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'calibracao-certificados'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('calibracao.gerenciar')
);

create policy "calibracao_certificados_storage_delete_por_permissao"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'calibracao-certificados'
  and (storage.foldername(name))[1] = public.current_organizacao_id()::text
  and public.user_has_permission('calibracao.gerenciar')
);

notify pgrst, 'reload schema';

-- Fim da migration 046_endurecer_permissoes_rls.sql

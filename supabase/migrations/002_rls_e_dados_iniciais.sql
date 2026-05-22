-- ============================================================
-- EngClinica Pro
-- Migration: 002_rls_e_dados_iniciais.sql
-- Objetivo:
-- - Criar organização inicial da ACI
-- - Vincular usuário administrador inicial
-- - Inserir campos gerenciais base
-- - Criar funções auxiliares de contexto
-- - Criar policies iniciais de RLS
-- Banco alvo: PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. ORGANIZAÇÃO INICIAL E USUÁRIO ADMIN
-- ============================================================

do $$
declare
  v_organizacao_id uuid;
  v_admin_user_id uuid := '76f6b935-cb48-4200-bfd6-c9f1f9e47485';
begin
  select id
  into v_organizacao_id
  from public.organizacoes
  where cnpj = '71.208.094/0001-37'
  limit 1;

  if v_organizacao_id is null then
    insert into public.organizacoes (
      nome,
      nome_fantasia,
      cnpj,
      email,
      telefone,
      cidade,
      estado,
      ativo
    )
    values (
      'ACI Comércio LTDA',
      'ACI Equipamentos Hospitalares',
      '71.208.094/0001-37',
      'acicomercio@yahoo.com.br',
      '(32) 3221-7944',
      'Juiz de Fora',
      'MG',
      true
    )
    returning id into v_organizacao_id;
  end if;

  insert into public.usuarios (
    id,
    organizacao_id,
    nome,
    email,
    telefone,
    cargo,
    perfil,
    ativo
  )
  values (
    v_admin_user_id,
    v_organizacao_id,
    'Icaro Heitor Piris Rezende',
    'ipromed.eng@gmail.com',
    null,
    'Administrador',
    'admin',
    true
  )
  on conflict (id) do update set
    organizacao_id = excluded.organizacao_id,
    nome = excluded.nome,
    email = excluded.email,
    cargo = excluded.cargo,
    perfil = excluded.perfil,
    ativo = true,
    updated_at = now();
end $$;

-- ============================================================
-- 2. FUNÇÕES AUXILIARES PARA RLS
-- ============================================================

create or replace function public.current_organizacao_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select organizacao_id
  from public.usuarios
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_perfil()
returns text
language sql
security definer
set search_path = public
as $$
  select perfil
  from public.usuarios
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_perfil() = 'admin', false);
$$;

create or replace function public.is_admin_or_gestor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_perfil() in ('admin', 'gestor'), false);
$$;

grant execute on function public.current_organizacao_id() to authenticated;
grant execute on function public.current_user_perfil() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_gestor() to authenticated;

-- ============================================================
-- 3. CAMPOS GERENCIAIS INICIAIS
-- ============================================================

do $$
declare
  v_organizacao_id uuid;
begin
  select id
  into v_organizacao_id
  from public.organizacoes
  where cnpj = '71.208.094/0001-37'
  limit 1;

  -- Tipos de equipamento
  insert into public.tipos_equipamento (organizacao_id, nome, ativo)
  values
    (v_organizacao_id, 'Monitor Multiparâmetro', true),
    (v_organizacao_id, 'Ventilador Pulmonar', true),
    (v_organizacao_id, 'Bisturi Elétrico', true),
    (v_organizacao_id, 'Desfibrilador', true),
    (v_organizacao_id, 'Bomba de Infusão', true),
    (v_organizacao_id, 'Bomba de Seringa', true),
    (v_organizacao_id, 'Autoclave', true),
    (v_organizacao_id, 'Aspirador Cirúrgico', true),
    (v_organizacao_id, 'Cardioversor', true),
    (v_organizacao_id, 'Câmara de Conservação', true)
  on conflict (organizacao_id, nome) do nothing;

  -- Tipos de OS
  insert into public.tipos_os (
    organizacao_id,
    nome,
    descricao,
    exige_equipamento,
    gera_orcamento,
    ativo
  )
  values
    (v_organizacao_id, 'Manutenção Preventiva', 'Serviço preventivo programado.', true, false, true),
    (v_organizacao_id, 'Calibração', 'Serviço de calibração/verificação metrológica.', true, false, true),
    (v_organizacao_id, 'Manutenção Corretiva', 'Correção de falha ou defeito.', true, true, true),
    (v_organizacao_id, 'Visita Técnica', 'Atendimento técnico presencial.', false, false, true),
    (v_organizacao_id, 'Teste de Segurança Elétrica', 'Teste de segurança elétrica em equipamento.', true, false, true),
    (v_organizacao_id, 'Instalação', 'Instalação ou comissionamento de equipamento.', true, false, true),
    (v_organizacao_id, 'Certificação', 'Certificação técnica ou documental.', true, false, true),
    (v_organizacao_id, 'Garantia de Serviço', 'Retorno vinculado à garantia de serviço.', true, false, true),
    (v_organizacao_id, 'Garantia de Fábrica', 'Atendimento vinculado à garantia de fábrica.', true, false, true),
    (v_organizacao_id, 'Entrada de Equipamentos', 'Entrada de equipamento para avaliação/orçamento.', true, true, true),
    (v_organizacao_id, 'Orçamentar', 'OS para elaboração de orçamento.', true, true, true),
    (v_organizacao_id, 'Orçamento Não Aprovado', 'Registro de orçamento não aprovado.', true, false, true),
    (v_organizacao_id, 'Reparo Externo', 'Equipamento enviado para reparo externo.', true, true, true),
    (v_organizacao_id, 'Laudo de Obsolescência', 'Emissão de laudo de obsolescência.', true, false, true),
    (v_organizacao_id, 'Devolução Sem Reparo', 'Devolução sem execução de reparo.', true, false, true),
    (v_organizacao_id, 'Despesas', 'Registro de despesas vinculadas ao atendimento.', false, false, true),
    (v_organizacao_id, 'Qualificação Térmica', 'Serviço de qualificação térmica.', true, false, true)
  on conflict (organizacao_id, nome) do nothing;

  -- Estados de OS
  insert into public.estados_os (
    organizacao_id,
    nome,
    descricao,
    finaliza_os,
    cancela_os,
    ordem,
    ativo
  )
  values
    (v_organizacao_id, 'Aberta', 'OS aberta e aguardando andamento.', false, false, 10, true),
    (v_organizacao_id, 'Aguardando Peças', 'OS aguardando disponibilidade ou compra de peças.', false, false, 20, true),
    (v_organizacao_id, 'Aguardando Aprovação do Orçamento', 'OS aguardando aceite do orçamento.', false, false, 30, true),
    (v_organizacao_id, 'Orçamento Aprovado', 'Orçamento aprovado pelo cliente.', false, false, 40, true),
    (v_organizacao_id, 'Serviço Finalizado', 'Serviço técnico finalizado, aguardando fechamento/entrega.', false, false, 50, true),
    (v_organizacao_id, 'Análise Completa', 'Análise técnica finalizada.', false, false, 60, true),
    (v_organizacao_id, 'Reparo Externo', 'Equipamento em reparo externo.', false, false, 70, true),
    (v_organizacao_id, 'Entrada de Equipamentos para Orçamento', 'Equipamento recebido para avaliação/orçamento.', false, false, 80, true),
    (v_organizacao_id, 'Orçamento Não Aprovado', 'Cliente não aprovou o orçamento.', false, false, 90, true),
    (v_organizacao_id, 'Liberado para Entrega', 'Equipamento liberado para retirada/entrega.', false, false, 100, true),
    (v_organizacao_id, 'Enviado para Autorizada', 'Equipamento enviado para autorizada/fabricante.', false, false, 110, true),
    (v_organizacao_id, 'Garantia de Serviço', 'OS vinculada à garantia de serviço.', false, false, 120, true),
    (v_organizacao_id, 'Garantia de Fábrica', 'OS vinculada à garantia de fábrica.', false, false, 130, true),
    (v_organizacao_id, 'Fechada', 'OS finalizada e encerrada.', true, false, 900, true),
    (v_organizacao_id, 'Cancelada', 'OS cancelada.', false, true, 999, true)
  on conflict (organizacao_id, nome) do nothing;

  -- Peças iniciais
  insert into public.pecas (
    organizacao_id,
    nome,
    descricao,
    unidade,
    ativo
  )
  values
    (v_organizacao_id, 'Bateria', 'Bateria para equipamento médico-hospitalar.', 'un', true),
    (v_organizacao_id, 'Sensor SpO2', 'Sensor de oximetria SpO2.', 'un', true),
    (v_organizacao_id, 'Cabo de Força', 'Cabo de alimentação elétrica.', 'un', true),
    (v_organizacao_id, 'Filtro HEPA', 'Filtro HEPA para equipamentos compatíveis.', 'un', true),
    (v_organizacao_id, 'Válvula Reguladora', 'Válvula reguladora para sistemas/equipamentos.', 'un', true),
    (v_organizacao_id, 'Cabo ECG', 'Cabo de ECG.', 'un', true),
    (v_organizacao_id, 'Mangueira', 'Mangueira para equipamento médico-hospitalar.', 'un', true),
    (v_organizacao_id, 'Placa Eletrônica', 'Placa eletrônica ou módulo de controle.', 'un', true),
    (v_organizacao_id, 'Fonte de Alimentação', 'Fonte de alimentação interna ou externa.', 'un', true),
    (v_organizacao_id, 'Transdutor', 'Transdutor/sensor técnico.', 'un', true)
  on conflict (organizacao_id, nome) do nothing;
end $$;

-- ============================================================
-- 4. POLICIES RLS
-- ============================================================

-- ------------------------------------------------------------
-- ORGANIZACOES
-- ------------------------------------------------------------

drop policy if exists "organizacoes_select_mesma_organizacao" on public.organizacoes;
create policy "organizacoes_select_mesma_organizacao"
on public.organizacoes
for select
to authenticated
using (
  id = public.current_organizacao_id()
);

drop policy if exists "organizacoes_update_admin" on public.organizacoes;
create policy "organizacoes_update_admin"
on public.organizacoes
for update
to authenticated
using (
  id = public.current_organizacao_id()
  and public.is_admin()
)
with check (
  id = public.current_organizacao_id()
  and public.is_admin()
);

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------

drop policy if exists "usuarios_select_mesma_organizacao" on public.usuarios;
create policy "usuarios_select_mesma_organizacao"
on public.usuarios
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "usuarios_update_admin_ou_proprio" on public.usuarios;
create policy "usuarios_update_admin_ou_proprio"
on public.usuarios
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and (
    public.is_admin()
    or id = auth.uid()
  )
)
with check (
  organizacao_id = public.current_organizacao_id()
  and (
    public.is_admin()
    or id = auth.uid()
  )
);

drop policy if exists "usuarios_insert_admin" on public.usuarios;
create policy "usuarios_insert_admin"
on public.usuarios
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin()
);

-- ------------------------------------------------------------
-- EMPRESAS
-- ------------------------------------------------------------

drop policy if exists "empresas_select_mesma_organizacao" on public.empresas;
create policy "empresas_select_mesma_organizacao"
on public.empresas
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "empresas_insert_admin_gestor" on public.empresas;
create policy "empresas_insert_admin_gestor"
on public.empresas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "empresas_update_admin_gestor" on public.empresas;
create policy "empresas_update_admin_gestor"
on public.empresas
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ------------------------------------------------------------
-- CAMPOS GERENCIAIS: TIPOS_EQUIPAMENTO
-- ------------------------------------------------------------

drop policy if exists "tipos_equipamento_select_mesma_organizacao" on public.tipos_equipamento;
create policy "tipos_equipamento_select_mesma_organizacao"
on public.tipos_equipamento
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "tipos_equipamento_insert_admin_gestor" on public.tipos_equipamento;
create policy "tipos_equipamento_insert_admin_gestor"
on public.tipos_equipamento
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "tipos_equipamento_update_admin_gestor" on public.tipos_equipamento;
create policy "tipos_equipamento_update_admin_gestor"
on public.tipos_equipamento
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ------------------------------------------------------------
-- CAMPOS GERENCIAIS: TIPOS_OS
-- ------------------------------------------------------------

drop policy if exists "tipos_os_select_mesma_organizacao" on public.tipos_os;
create policy "tipos_os_select_mesma_organizacao"
on public.tipos_os
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "tipos_os_insert_admin_gestor" on public.tipos_os;
create policy "tipos_os_insert_admin_gestor"
on public.tipos_os
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "tipos_os_update_admin_gestor" on public.tipos_os;
create policy "tipos_os_update_admin_gestor"
on public.tipos_os
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ------------------------------------------------------------
-- CAMPOS GERENCIAIS: ESTADOS_OS
-- ------------------------------------------------------------

drop policy if exists "estados_os_select_mesma_organizacao" on public.estados_os;
create policy "estados_os_select_mesma_organizacao"
on public.estados_os
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "estados_os_insert_admin_gestor" on public.estados_os;
create policy "estados_os_insert_admin_gestor"
on public.estados_os
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "estados_os_update_admin_gestor" on public.estados_os;
create policy "estados_os_update_admin_gestor"
on public.estados_os
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ------------------------------------------------------------
-- CAMPOS GERENCIAIS: PECAS
-- ------------------------------------------------------------

drop policy if exists "pecas_select_mesma_organizacao" on public.pecas;
create policy "pecas_select_mesma_organizacao"
on public.pecas
for select
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
);

drop policy if exists "pecas_insert_admin_gestor" on public.pecas;
create policy "pecas_insert_admin_gestor"
on public.pecas
for insert
to authenticated
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

drop policy if exists "pecas_update_admin_gestor" on public.pecas;
create policy "pecas_update_admin_gestor"
on public.pecas
for update
to authenticated
using (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
)
with check (
  organizacao_id = public.current_organizacao_id()
  and public.is_admin_or_gestor()
);

-- ============================================================
-- Fim da migration 002_rls_e_dados_iniciais.sql
-- ============================================================
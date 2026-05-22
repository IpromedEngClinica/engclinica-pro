# Modelo de Banco Proposto — EngClinica Pro

Este documento propõe a modelagem inicial de banco de dados para o EngClinica Pro, com foco em PostgreSQL/Supabase.

A modelagem foi baseada no estado atual do sistema documentado em `docs/MODELO_DADOS_ATUAL.md` e na estrutura funcional já existente no frontend.

## Objetivo

Transformar o modelo atual baseado em estado local React em uma estrutura relacional persistente, segura e escalável.

## Diretrizes principais

1. Usar UUID como chave primária.
2. Evitar relacionamento por texto.
3. Utilizar chaves estrangeiras para integridade.
4. Registrar datas de criação e atualização.
5. Preparar a estrutura para multiempresa.
6. Preparar autenticação e permissões.
7. Criar base para auditoria.
8. Permitir futura evolução para SaaS.

---

# 1. Convenções gerais

## Tipos padrão

| Finalidade | Tipo sugerido |
|---|---|
| Chave primária | `uuid` |
| Texto curto | `varchar` ou `text` |
| Texto longo | `text` |
| Datas | `timestamp with time zone` |
| Valores monetários | `numeric(12,2)` |
| Quantidades | `numeric(12,2)` ou `integer` |
| Booleanos | `boolean` |
| Status | `varchar` ou tabela relacional |
| Arquivos/anexos | tabela própria + storage |

## Campos recomendados em quase todas as tabelas

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
created_by uuid null,
updated_by uuid null,
ativo boolean not null default true

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create index idx_equipamentos_data_proxima_preventiva
on public.equipamentos(data_proxima_preventiva);

create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_fantasia text,
  cnpj text,
  email text,
  telefone text,
  cidade text,
  estado text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  email text not null,
  telefone text,
  cargo text,
  perfil text not null default 'tecnico',
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  nome_fantasia text,
  tipo_cliente text,
  tipo_relacao text not null default 'cliente',
  cpf_cnpj text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  contato text,
  email text,
  celular text,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);
create index idx_empresas_organizacao on public.empresas(organizacao_id);
create index idx_empresas_nome on public.empresas(nome);
create index idx_empresas_cpf_cnpj on public.empresas(cpf_cnpj);

create table public.tipos_equipamento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organizacao_id, nome)
);

create table public.tipos_os (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  descricao text,
  exige_equipamento boolean not null default false,
  gera_orcamento boolean not null default false,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organizacao_id, nome)
);

create table public.estados_os (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  descricao text,
  finaliza_os boolean not null default false,
  cancela_os boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organizacao_id, nome)
);

create table public.pecas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  descricao text,
  fabricante text,
  codigo_interno text,
  unidade text not null default 'un',
  custo_referencia numeric(12,2),
  valor_venda_referencia numeric(12,2),
  estoque_minimo numeric(12,2),
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organizacao_id, nome)
);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  empresa_id uuid not null references public.empresas(id),
  tipo_equipamento_id uuid null references public.tipos_equipamento(id),
  tipo_texto text,
  fabricante text,
  modelo text,
  numero_serie text,
  patrimonio text,
  tag text,
  setor text,
  status text not null default 'Ativo',
  data_aquisicao date,
  data_instalacao date,
  data_ultima_preventiva date,
  data_proxima_preventiva date,
  data_ultima_calibracao date,
  data_proxima_calibracao date,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  empresa_id uuid not null references public.empresas(id),
  tipo_equipamento_id uuid null references public.tipos_equipamento(id),
  tipo_texto text,
  fabricante text,
  modelo text,
  numero_serie text,
  patrimonio text,
  tag text,
  setor text,
  status text not null default 'Ativo',
  data_aquisicao date,
  data_instalacao date,
  data_ultima_preventiva date,
  data_proxima_preventiva date,
  data_ultima_calibracao date,
  data_proxima_calibracao date,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);

create index idx_equipamentos_organizacao on public.equipamentos(organizacao_id);
create index idx_equipamentos_empresa on public.equipamentos(empresa_id);
create index idx_equipamentos_tipo on public.equipamentos(tipo_equipamento_id);
create index idx_equipamentos_serie on public.equipamentos(numero_serie);
create index idx_equipamentos_patrimonio on public.equipamentos(patrimonio);
create index idx_equipamentos_tag on public.equipamentos(tag);
create index idx_equipamentos_proxima_preventiva on public.equipamentos(data_proxima_preventiva);
create index idx_equipamentos_proxima_calibracao on public.equipamentos(data_proxima_calibracao);

create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  numero text not null,
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid null references public.equipamentos(id),
  tipo_os_id uuid null references public.tipos_os(id),
  estado_os_id uuid null references public.estados_os(id),
  tecnico_responsavel_id uuid null references public.usuarios(id),
  solicitante_texto text,
  responsavel_texto text,
  data_abertura timestamp with time zone not null default now(),
  data_fechamento timestamp with time zone,
  origem_problema text,
  descricao_servico text,
  observacoes text,
  prioridade text not null default 'normal',
  status_sistema text not null default 'aberta',
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id),
  unique (organizacao_id, numero)
);

create index idx_os_organizacao on public.ordens_servico(organizacao_id);
create index idx_os_empresa on public.ordens_servico(empresa_id);
create index idx_os_equipamento on public.ordens_servico(equipamento_id);
create index idx_os_estado on public.ordens_servico(estado_os_id);
create index idx_os_tipo on public.ordens_servico(tipo_os_id);
create index idx_os_data_abertura on public.ordens_servico(data_abertura);

create table public.ordem_servico_acessorios (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  descricao text not null,
  quantidade integer not null default 1,
  observacoes text,
  created_at timestamp with time zone not null default now()
);

create table public.ordem_servico_historico (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  usuario_id uuid null references public.usuarios(id),
  estado_anterior_id uuid null references public.estados_os(id),
  estado_novo_id uuid null references public.estados_os(id),
  acao text not null,
  observacao text,
  created_at timestamp with time zone not null default now()
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  numero text not null,
  ordem_servico_id uuid null references public.ordens_servico(id),
  empresa_id uuid not null references public.empresas(id),
  tipo text not null,
  status text not null default 'Pendente',
  identificador text,
  data_criacao timestamp with time zone not null default now(),
  data_validade date,
  validade_dias integer not null default 15,
  forma_pagamento text,
  modo_pagamento text,
  numero_parcelas integer,
  valor_entrada numeric(12,2) default 0,
  prazo_entrega text,
  frete text,
  detalhes text,
  responsavel_id uuid null references public.usuarios(id),
  responsavel_texto text,
  data_aprovacao timestamp with time zone,
  data_reprovacao timestamp with time zone,
  motivo_reprovacao text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id),
  unique (organizacao_id, numero)
);

create table public.orcamento_pecas (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  peca_id uuid null references public.pecas(id),
  peca_texto text,
  quantidade numeric(12,2) not null default 1,
  custo_unitario numeric(12,2),
  valor_unitario numeric(12,2) not null default 0,
  garantia_dias integer default 90,
  observacoes text,
  created_at timestamp with time zone not null default now()
);

create table public.orcamento_servicos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo_os_id uuid null references public.tipos_os(id),
  tipo_servico_texto text,
  tipo_equipamento_id uuid null references public.tipos_equipamento(id),
  tipo_equipamento_texto text,
  quantidade numeric(12,2) not null default 1,
  horas_tecnicas numeric(12,2),
  custo_hora numeric(12,2),
  valor_unitario numeric(12,2) not null default 0,
  garantia_dias integer default 90,
  observacoes text,
  created_at timestamp with time zone not null default now()
);

create index idx_orcamentos_organizacao on public.orcamentos(organizacao_id);
create index idx_orcamentos_empresa on public.orcamentos(empresa_id);
create index idx_orcamentos_os on public.orcamentos(ordem_servico_id);
create index idx_orcamentos_status on public.orcamentos(status);

create table public.protocolos_recolhimento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  numero text not null,
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  ordem_servico_id uuid null references public.ordens_servico(id),
  data_recolhimento timestamp with time zone not null default now(),
  recolhido_por_id uuid null references public.usuarios(id),
  recolhido_por_texto text,
  defeito_relatado text,
  estado_fisico text,
  observacoes text,
  assinatura_cliente_url text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id),
  unique (organizacao_id, numero)
);

create table public.protocolo_recolhimento_acessorios (
  id uuid primary key default gen_random_uuid(),
  protocolo_recolhimento_id uuid not null references public.protocolos_recolhimento(id) on delete cascade,
  descricao text not null,
  quantidade integer not null default 1,
  observacoes text,
  created_at timestamp with time zone not null default now()
);

create table public.protocolos_entrega (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  numero text not null,
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid null references public.equipamentos(id),
  ordem_servico_id uuid not null references public.ordens_servico(id),
  data_entrega timestamp with time zone not null default now(),
  entregue_por_id uuid null references public.usuarios(id),
  entregue_por_texto text,
  recebido_por text,
  testado boolean not null default false,
  funciona boolean not null default false,
  observacoes text,
  assinatura_cliente_url text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id),
  unique (organizacao_id, numero)
);

create table public.protocolo_entrega_acessorios (
  id uuid primary key default gen_random_uuid(),
  protocolo_entrega_id uuid not null references public.protocolos_entrega(id) on delete cascade,
  descricao text not null,
  quantidade integer not null default 1,
  observacoes text,
  created_at timestamp with time zone not null default now()
);

create table public.procedimentos_preventiva (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  nome text not null,
  tipo_equipamento_id uuid null references public.tipos_equipamento(id),
  tipo_equipamento_texto text,
  descricao text,
  versao integer not null default 1,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);

create table public.procedimento_preventiva_itens (
  id uuid primary key default gen_random_uuid(),
  procedimento_id uuid not null references public.procedimentos_preventiva(id) on delete cascade,
  descricao text not null,
  obrigatorio boolean not null default true,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table public.preventivas_executadas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  procedimento_id uuid not null references public.procedimentos_preventiva(id),
  equipamento_id uuid not null references public.equipamentos(id),
  ordem_servico_id uuid null references public.ordens_servico(id),
  tecnico_responsavel_id uuid null references public.usuarios(id),
  data_execucao timestamp with time zone not null default now(),
  aprovado_para_uso boolean not null default false,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);

create table public.preventiva_respostas (
  id uuid primary key default gen_random_uuid(),
  preventiva_executada_id uuid not null references public.preventivas_executadas(id) on delete cascade,
  item_id uuid null references public.procedimento_preventiva_itens(id),
  item_texto text not null,
  resultado text not null,
  observacao text,
  created_at timestamp with time zone not null default now()
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  empresa_id uuid not null references public.empresas(id),
  numero text,
  objeto text,
  tipo_contrato text,
  data_inicio date,
  data_fim date,
  valor_mensal numeric(12,2),
  valor_total numeric(12,2),
  indice_reajuste text,
  periodicidade_preventiva text,
  status text not null default 'ativo',
  observacoes text,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id),
  updated_by uuid null references public.usuarios(id)
);

create table public.contrato_equipamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  equipamento_id uuid not null references public.equipamentos(id),
  created_at timestamp with time zone not null default now(),
  unique (contrato_id, equipamento_id)
);

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  entidade_tipo text not null,
  entidade_id uuid not null,
  nome_arquivo text not null,
  caminho_storage text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  descricao text,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references public.usuarios(id)
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  usuario_id uuid null references public.usuarios(id),
  entidade_tipo text not null,
  entidade_id uuid,
  acao text not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table public.sequencias_documentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id),
  tipo_documento text not null,
  ano integer not null,
  ultimo_numero integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organizacao_id, tipo_documento, ano)
);

create policy "usuarios acessam dados da propria organizacao"
on public.empresas
for select
using (
  organizacao_id in (
    select organizacao_id
    from public.usuarios
    where id = auth.uid()
  )
);


-- ============================================================
-- Ipromed - Sistema de Gestao
-- Migration: 056_cadastrar_aci_principal.sql
-- Objetivo:
-- - Garantir cadastro interno da propria ACI como empresa Principal
-- - Manter o tipo_cliente "Principal" apenas no banco de dados
-- ============================================================

with dados_aci as (
  select
    o.id as organizacao_id,
    'ACI Comercio LTDA'::text as nome,
    'ACI Comercio LTDA'::text as nome_fantasia,
    'Principal'::text as tipo_cliente,
    'ambos'::text as tipo_relacao,
    '71.208.094/0001-37'::text as cpf_cnpj,
    '36080-370'::text as cep,
    U&'Rua Jos\00e9 Martins da Silva'::text as rua,
    '215'::text as numero,
    null::text as complemento,
    U&'Cer\00e2mica'::text as bairro,
    'Juiz de Fora'::text as cidade,
    'MG'::text as estado,
    null::text as contato,
    'acicomercio@yahoo.com.br'::text as email,
    '32 98477-7813'::text as celular,
    '3221-7944'::text as telefone
  from public.organizacoes o
),
atualizadas as (
  update public.empresas e
  set
    nome = d.nome,
    nome_fantasia = d.nome_fantasia,
    tipo_cliente = d.tipo_cliente,
    tipo_relacao = d.tipo_relacao,
    cpf_cnpj = d.cpf_cnpj,
    cep = d.cep,
    rua = d.rua,
    numero = d.numero,
    complemento = d.complemento,
    bairro = d.bairro,
    cidade = d.cidade,
    estado = d.estado,
    contato = d.contato,
    email = d.email,
    celular = d.celular,
    telefone = d.telefone,
    ativo = true,
    updated_at = now()
  from dados_aci d
  where e.organizacao_id = d.organizacao_id
    and regexp_replace(coalesce(e.cpf_cnpj, ''), '\D', '', 'g') = '71208094000137'
  returning e.organizacao_id
)
insert into public.empresas (
  organizacao_id,
  nome,
  nome_fantasia,
  tipo_cliente,
  tipo_relacao,
  cpf_cnpj,
  cep,
  rua,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  contato,
  email,
  celular,
  telefone,
  observacoes,
  incluir_criterio_aceitacao_calibracao,
  ativo
)
select
  d.organizacao_id,
  d.nome,
  d.nome_fantasia,
  d.tipo_cliente,
  d.tipo_relacao,
  d.cpf_cnpj,
  d.cep,
  d.rua,
  d.numero,
  d.complemento,
  d.bairro,
  d.cidade,
  d.estado,
  d.contato,
  d.email,
  d.celular,
  d.telefone,
  'Cadastro interno da empresa principal da organizacao.',
  false,
  true
from dados_aci d
where not exists (
  select 1
  from atualizadas a
  where a.organizacao_id = d.organizacao_id
)
and not exists (
  select 1
  from public.empresas e
  where e.organizacao_id = d.organizacao_id
    and regexp_replace(coalesce(e.cpf_cnpj, ''), '\D', '', 'g') = '71208094000137'
);

notify pgrst, 'reload schema';

-- Fim da migration 056_cadastrar_aci_principal.sql

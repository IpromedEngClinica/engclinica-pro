# Modelo de Dados Atual — EngClinica Pro

Este documento descreve o modelo de dados atualmente identificado no frontend do EngClinica Pro, especialmente a partir do arquivo `src/contexts/DataContext.tsx`.

O objetivo é registrar como os dados estão estruturados hoje antes da futura migração para banco de dados persistente.

## Observação importante

Na versão atual, os dados são armazenados em estado local React, usando `useState`.

Isso significa que o modelo atual ainda não representa um banco de dados real. Ele serve como referência funcional para a futura modelagem em PostgreSQL/Supabase ou backend próprio.

---

# 1. Empresa

Representa uma empresa, clínica, hospital, prefeitura, cliente jurídico ou cliente particular.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `nome` | string | Razão social ou nome principal |
| `nomeFantasia` | string | Nome comercial |
| `tipoCliente` | string | Prefeitura, Pessoa Jurídica, Particular ou vazio |
| `cpfCnpj` | string | CPF ou CNPJ |
| `cep` | string | CEP |
| `rua` | string | Logradouro |
| `numero` | string | Número |
| `complemento` | string | Complemento |
| `bairro` | string | Bairro |
| `cidade` | string | Cidade |
| `estado` | string | UF |
| `contato` | string | Pessoa de contato |
| `email` | string | E-mail |
| `celular` | string | Celular |
| `telefone` | string | Telefone fixo |

## Problemas atuais

- O relacionamento com outras entidades ainda usa o nome da empresa em alguns pontos.
- O ideal é usar `empresa_id` como chave estrangeira.
- Não há validação formal de CPF/CNPJ.
- Não há controle de cliente ativo/inativo.
- Não há separação entre cliente, fornecedor e empresa usuária do sistema.

## Sugestão futura

Criar tabela `empresas` com UUID e relacionamento por ID.

---

# 2. Equipamento

Representa um equipamento médico-hospitalar cadastrado no sistema.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `tipo` | string | Tipo do equipamento |
| `fabricante` | string | Fabricante |
| `modelo` | string | Modelo |
| `status` | string | Ex: Ativo, Em manutenção, Desativado |
| `empresa` | string | Nome da empresa proprietária |
| `serie` | string | Número de série |
| `patrimonio` | string | Patrimônio |
| `setor` | string | Setor onde está instalado |
| `tag` | string | Identificação interna |

## Problemas atuais

- Relacionamento com empresa é feito por texto.
- Status é texto livre/controlado apenas no frontend.
- Não há histórico técnico próprio do equipamento.
- Não há campos para vencimento de preventiva, calibração ou garantia.
- Não há anexos/fotos vinculados diretamente ao equipamento.

## Sugestão futura

Criar tabela `equipamentos` com:

- `id`
- `empresa_id`
- `tipo_equipamento_id`
- `fabricante`
- `modelo`
- `numero_serie`
- `patrimonio`
- `tag`
- `setor`
- `status`
- `data_cadastro`
- `ativo`

---

# 3. Ordem de Serviço

Representa uma OS técnica vinculada ou não a um equipamento.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `numero` | string | Ex: OS-2026-0001 |
| `dataCriacao` | string | Data em ISO |
| `estado` | string | Estado atual da OS |
| `responsavelTecnico` | string | Técnico executor |
| `solicitante` | string | Nome da empresa solicitante |
| `equipamentoId` | number/null | ID do equipamento |
| `tipoServico` | string | Tipo da OS |
| `origemProblema` | string | Relato/origem do problema |
| `descricaoServico` | string | Descrição do serviço executado |
| `acessorios` | string[] | Lista de acessórios |
| `observacoes` | string | Observações gerais |

## Problemas atuais

- Número da OS é gerado no frontend.
- Possibilidade de duplicidade em uso simultâneo.
- Solicitante é texto, não `empresa_id`.
- Técnico é texto, não `usuario_id`.
- Não há histórico de mudanças de estado.
- Não há data de fechamento.
- Não há controle de prioridade.
- Não há assinatura do cliente.
- Não há anexos/fotos.

## Sugestão futura

Criar tabela `ordens_servico` com:

- `id`
- `numero`
- `empresa_id`
- `equipamento_id`
- `tecnico_responsavel_id`
- `tipo_os_id`
- `estado_os_id`
- `data_abertura`
- `data_fechamento`
- `origem_problema`
- `descricao_servico`
- `observacoes`
- `prioridade`
- `criado_por`
- `atualizado_por`

Criar também tabela `ordem_servico_historico`.

---

# 4. Orçamento

Representa orçamento de peças, serviços ou ambos.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `numero` | string | Número do orçamento |
| `osId` | number/null | OS vinculada |
| `dataCriacao` | string | Data em ISO |
| `tipo` | string | Serviço, Peças ou Peças + Serviços |
| `solicitante` | string | Nome da empresa solicitante |
| `pecas` | array | Itens de peças |
| `servicos` | array | Itens de serviços |
| `formaPagamento` | string | Dinheiro, Cartão, Boleto, Pix |
| `modoPagamento` | string | À vista, Parcelado, Entrada + Parcela |
| `numeroParcelas` | number | Quantidade de parcelas |
| `valorEntrada` | number | Valor de entrada |
| `prazoEntrega` | string | Prazo de entrega |
| `validadeDias` | number | Validade do orçamento |
| `frete` | string | CIF ou FOB |
| `detalhes` | string | Informações técnicas |
| `responsavelOrcamentista` | string | Responsável pelo orçamento |
| `status` | string | Pendente, Aprovado, Reprovado, Faturado, Cancelado |
| `identificador` | string | Identificação complementar |

## Problemas atuais

- Solicitante é texto.
- Responsável é texto.
- Status não possui histórico.
- Não há data de aprovação/reprovação.
- Não há motivo de reprovação.
- Não há controle de versão.
- Não há separação clara entre custo e preço de venda.
- Não há margem de lucro.
- Não há vínculo robusto com peças cadastradas.

## Sugestão futura

Criar:

- `orcamentos`
- `orcamento_pecas`
- `orcamento_servicos`
- `orcamento_status_historico`

---

# 5. Item de Peça do Orçamento

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `peca` | string | Nome da peça |
| `quantidade` | number | Quantidade |
| `valorUnitario` | number | Valor unitário |
| `garantiaDias` | number | Garantia em dias |

## Problemas atuais

- Peça é texto.
- Não há controle de custo.
- Não há controle de estoque.
- Não há fornecedor.
- Não há margem.

## Sugestão futura

Criar relacionamento com tabela `pecas` e, futuramente, módulo de estoque.

---

# 6. Item de Serviço do Orçamento

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `tipoServico` | string | Tipo de serviço |
| `tipoEquipamento` | string | Tipo de equipamento |
| `quantidade` | number | Quantidade |
| `valorUnitario` | number | Valor unitário |
| `garantiaDias` | number | Garantia em dias |

## Problemas atuais

- Serviço é texto.
- Tipo de equipamento é texto.
- Não há cálculo por hora técnica.
- Não há custo operacional.
- Não há margem.

## Sugestão futura

Criar tabela de serviços padrão e tabela de itens de serviço por orçamento.

---

# 7. Protocolo de Recolhimento

Representa a entrada/recolhimento de um equipamento para avaliação ou manutenção.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `numero` | string | Ex: PR-2026-0001 |
| `dataCriacao` | string | Data em ISO |
| `equipamentoId` | number | Equipamento recolhido |
| `empresa` | string | Nome da empresa |
| `recolhidoPor` | string | Responsável pelo recolhimento |
| `defeitoRelatado` | string | Defeito informado |
| `acessorios` | string[] | Acessórios recebidos |
| `osId` | number/null | OS criada |
| `osNumero` | string | Número da OS |

## Problemas atuais

- Empresa é texto.
- Recolhido por é texto.
- Número é gerado no frontend.
- Não há assinatura do cliente.
- Não há fotos.
- Não há estado físico do equipamento.
- Não há checklist de entrada.

## Sugestão futura

Adicionar:

- assinatura
- fotos
- checklist de acessórios
- estado físico
- vínculo obrigatório com equipamento e OS

---

# 8. Protocolo de Entrega

Representa a entrega/devolução do equipamento ao cliente.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `numero` | string | Ex: PE-2026-0001 |
| `dataEntrega` | string | Data da entrega |
| `osId` | number | OS vinculada |
| `osNumero` | string | Número da OS |
| `empresa` | string | Nome da empresa |
| `equipamentoId` | number/null | Equipamento entregue |
| `entreguePor` | string | Responsável pela entrega |
| `recebidoPor` | string | Pessoa que recebeu |
| `testado` | boolean | Se foi testado |
| `funciona` | boolean | Se está funcionando |
| `observacoes` | string | Observações |
| `acessorios` | string[] | Acessórios entregues |

## Problemas atuais

- Empresa é texto.
- Responsáveis são texto.
- Não há assinatura.
- Não há foto de entrega.
- Não há comprovante formal robusto.
- Ao criar entrega, a OS é fechada automaticamente sem validações mais profundas.

## Sugestão futura

Criar tabela `protocolos_entrega` com assinatura, fotos e vínculo por IDs.

---

# 9. Procedimento de Preventiva

Representa um modelo de checklist preventivo por tipo de equipamento.

## Campos atuais

| Campo | Tipo atual | Observação |
|---|---|---|
| `id` | number | Gerado no frontend |
| `nome` | string | Nome do procedimento |
| `tipoEquipamento` | string | Tipo de equipamento |
| `itens` | string[] | Itens do checklist |

## Problemas atuais

- Tipo de equipamento é texto.
- Itens são strings simples.
- Não há versão do procedimento.
- Não há obrigatoriedade por item.
- Não há periodicidade.
- Não há vínculo formal com equipamento.

## Sugestão futura

Criar:

- `procedimentos_preventiva`
- `procedimento_itens`
- `preventivas_executadas`
- `preventiva_respostas`

---

# 10. Campos Gerenciais

Campos gerenciais identificados:

## Tipos de Equipamento

Exemplos atuais:

- Monitor Multiparâmetro
- Ventilador Pulmonar
- Bisturi Elétrico
- Desfibrilador
- Bomba de Infusão

## Tipos de OS

Exemplos atuais:

- Manutenção Preventiva
- Calibração
- Manutenção Corretiva
- Visita Técnica
- Teste de Segurança Elétrica
- Instalação
- Certificação
- Garantia de Serviço
- Garantia de Fábrica
- Entrada de Equipamentos
- Orçamentar
- Orçamento Não Aprovado
- Reparo Externo
- Laudo de Obsolescência
- Devolução Sem Reparo
- Despesas
- Qualificação Térmica

## Estados da OS

Exemplos atuais:

- Aberta
- Fechada
- Cancelada
- Aguardando Peças
- Aguardando Aprovação Do Orçamento
- Serviço Finalizado
- Análise Completa
- Reparo Externo
- Orçamento Aprovado
- Entrada De Equipamentos Para Orçamento
- Orçamento Não Aprovado
- Liberado Para Entrega
- Enviado Para Autorizada
- Garantia De Serviço
- Garantia De Fábrica

## Peças

Exemplos atuais:

- Bateria
- Sensor SpO2
- Cabo de Força
- Filtro HEPA
- Válvula Reguladora

## Problemas atuais

- Listas são armazenadas em memória.
- Não há padronização de nomenclatura.
- Não há controle de ativo/inativo.
- Não há ordenação customizada persistente.
- Algumas listas podem se confundir com status operacionais.

---

# 11. Problemas estruturais gerais

## IDs

Atualmente, vários registros usam `Date.now()` como ID.

Problema:

- pode gerar colisão;
- não é adequado para múltiplos usuários;
- não é seguro como identificador persistente.

Sugestão:

- usar UUID no banco.

## Relacionamentos

Alguns relacionamentos usam texto em vez de ID.

Problema:

- se o nome mudar, o vínculo pode quebrar;
- dificulta filtros e relatórios;
- dificulta integridade referencial.

Sugestão:

- usar chaves estrangeiras.

## Auditoria

Não há registro de alterações.

Sugestão:

- criar tabela `auditoria`.
- registrar usuário, ação, entidade, data, valores antigos e novos.

## Permissões

Não há controle de acesso.

Sugestão:

- criar perfis e permissões por módulo.

## Persistência

Não há banco real.

Sugestão:

- iniciar com Supabase/PostgreSQL.
- migrar entidade por entidade.

---

# 12. Próxima etapa técnica

A próxima etapa é transformar este modelo atual em uma proposta de banco de dados relacional.

Documento sugerido:

```text
docs/MODELO_BANCO_PROPOSTO.md
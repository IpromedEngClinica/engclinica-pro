# Resumo da migration de Campos Gerenciais

Arquivo criado:

```text
supabase/migrations/012_campos_gerenciais_integridade.sql
```

## Objetivo

Garantir que o banco de dados acompanhe o código novo dos Campos Gerenciais, sem depender apenas do frontend.

A migration reforça o uso das tabelas gerenciais:

- `tipos_equipamento`
- `tipos_os`
- `estados_os`
- `pecas`

E garante que os módulos principais usem IDs relacionais, não apenas texto livre.

## O que a migration faz

### 1. Garante colunas necessárias

Em `equipamentos`:

```sql
tipo_equipamento_id
tipo_texto
```

Em `ordens_servico`:

```sql
tipo_os_id
estado_os_id
status_sistema
data_fechamento
```

Em `orcamento_itens`:

```sql
tipo_servico_id
tipo_equipamento_id
peca_id
peca_nome
garantia
```

### 2. Garante foreign keys

A migration adiciona vínculos para:

```text
equipamentos.tipo_equipamento_id -> tipos_equipamento.id
ordens_servico.tipo_os_id -> tipos_os.id
ordens_servico.estado_os_id -> estados_os.id
orcamento_itens.tipo_servico_id -> tipos_os.id
orcamento_itens.tipo_equipamento_id -> tipos_equipamento.id
orcamento_itens.peca_id -> pecas.id
```

Antes de criar as FKs, ela limpa IDs órfãos, colocando `null` onde houver referência inválida.

### 3. Reforça status operacional da OS

Garante que `ordens_servico.status_sistema` aceite apenas:

```text
aberta
fechada
cancelada
```

Também ajusta valor padrão para:

```text
aberta
```

### 4. Cria cadastros mínimos necessários

Para cada organização, garante registros mínimos em `tipos_os`:

```text
Entrada de Equipamentos
Orçamentar
Manutenção Corretiva
```

E em `estados_os`:

```text
Aberta
Entrada de Equipamentos para Orçamento
Equipamento Entregue
Fechada
Cancelada
```

Esses cadastros são usados por fluxos automáticos como protocolo de recolhimento e protocolo de entrega.

### 5. Faz backfill de equipamentos

Quando um equipamento tiver `tipo_texto`, mas não tiver `tipo_equipamento_id`, a migration:

1. cria o tipo em `tipos_equipamento`, se ainda não existir;
2. preenche `equipamentos.tipo_equipamento_id`;
3. mantém `tipo_texto` como fallback/legado.

### 6. Faz backfill de peças dos orçamentos

Para itens de orçamento do tipo `peca`:

1. cria registros em `pecas` usando `peca_nome` ou `descricao`;
2. preenche `orcamento_itens.peca_id`;
3. garante `peca_nome` como snapshot/fallback.

### 7. Faz backfill conservador de serviços

Para itens de orçamento do tipo `servico`, tenta preencher:

```text
tipo_servico_id
tipo_equipamento_id
```

somente quando o nome bate exatamente com um cadastro gerencial existente.

### 8. Ajusta OS antigas

Para ordens de serviço:

- preenche `estado_os_id` com `Aberta` quando estiver vazio;
- recalcula `status_sistema` com base em `estados_os.finaliza_os` e `estados_os.cancela_os`;
- preenche `data_fechamento` quando a OS estiver em estado finalizador;
- limpa `data_fechamento` quando a OS estiver aberta.

### 9. Cria índices

Cria índices para melhorar consultas por:

```text
equipamentos.tipo_equipamento_id
ordens_servico.tipo_os_id
ordens_servico.estado_os_id
ordens_servico.status_sistema
orcamento_itens.tipo_servico_id
orcamento_itens.tipo_equipamento_id
orcamento_itens.peca_id
```

## Arquivos de código relacionados

Além da migration, foram ajustados os pontos de frontend/hooks:

```text
src/pages/TiposEquipamento.tsx
src/pages/TiposOS.tsx
src/pages/EstadosOS.tsx
src/pages/Pecas.tsx
src/hooks/useTiposEquipamento.ts
src/hooks/useCamposOS.ts
src/hooks/usePecas.ts
src/components/CamposGerenciaisList.tsx
src/components/SearchableSelect.tsx
src/components/OrcamentoFormDialog.tsx
```

## Como aplicar

Como o Supabase CLI não estava disponível no ambiente local, a migration foi criada, mas não aplicada automaticamente no banco remoto.

Ordem recomendada:

```text
010_refatorar_orcamentos_campos_operacionais.sql
011_orcamentos_status_identificacao_data.sql
012_campos_gerenciais_integridade.sql
```

Se for aplicar pelo SQL Editor do Supabase, aplicar nessa ordem.

## Validação feita

Foi executado:

```bash
npm run build
```

Resultado:

```text
Build passou com sucesso.
```

Observações do build:

- aviso de `Browserslist` desatualizado;
- aviso de chunk maior que 500 kB;
- nenhum erro de TypeScript/Vite.


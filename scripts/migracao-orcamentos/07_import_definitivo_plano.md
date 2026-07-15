# Plano do import definitivo de orcamentos ArkMeds

Este arquivo e intencionalmente documental. Nenhum script de import definitivo foi criado ou executado nesta etapa.

## Fonte permitida

O import definitivo deve ler apenas registros revisados em:

- `staging_arkmeds_orcamentos`
- `staging_arkmeds_orcamento_itens`

O lote inicial recomendado e `outputs/migracao-orcamentos/lote_1_importacao_segura.csv`.

## Regras bloqueantes

Um orcamento so pode ser importado definitivamente se:

- `status_validacao = 'ok_para_importar'`;
- `tem_itens_preservados = true`;
- `status_preservacao_itens = 'itens_preservados'`;
- `soma_itens` bate com `arkmeds_valor_total` dentro da tolerancia;
- `pdf_original_url` esta preenchido;
- `classificacao_vinculo_os` e `com_os_confirmada`, `sem_os_avulso` ou `provavel_avulso_numero_baixo`;
- nao existe divergencia critica em `status_comparacao_pdf_endpoint`.

Nenhum orcamento deve ser importado sem seus itens, exceto se estiver marcado manualmente como realmente sem itens em uma etapa futura de aprovacao.

## Cabecalho destino

Destino provavel: `public.orcamentos`.

Mapeamento previsto:

- `numero` <- `arkmeds_orcamento_numero_original`
- `empresa_id` <- `empresa_id_resolvida`
- `equipamento_id` <- `equipamento_id_resolvido`
- `ordem_servico_id` <- `ordem_servico_id_resolvida`
- `data_orcamento` <- `arkmeds_data_criacao`
- `data_validade` <- `arkmeds_data_validade`
- `valor_total` <- `arkmeds_valor_total`
- `forma_pagamento` <- `forma_pagamento`
- `modo_pagamento` <- `modo_pagamento`
- `prazo_entrega` <- `prazo_entrega`
- `frete` <- `frete`
- `responsavel_orcamentista` <- `responsavel_orcamentista`
- `detalhes_orcamento` <- `informacoes_tecnicas`
- `observacoes` <- `observacoes_gerais`

Os campos de origem ArkMeds e PDF original devem ser preservados em campos dedicados de auditoria ou observacao de migracao antes da execucao final.

## Itens destino

Destino provavel: `public.orcamento_itens`.

Mapeamento previsto:

- `orcamento_id` <- id do cabecalho criado
- `tipo` <- `tipo_item`
- `descricao` <- `descricao`
- `quantidade` <- `quantidade`
- `valor_unitario` <- `valor_unitario`
- `valor_total` <- `valor_total_calculado`
- `garantia` <- `garantia`
- `observacoes` <- `observacoes`
- `peca_nome` <- `descricao` quando `tipo_item = 'peca'`

Os IDs originais `arkmeds_item_id`, `arkmeds_servico_id`, `arkmeds_peca_id`, `modelo_fabricante`, `unidade_medida` e `dados_brutos_json` devem ser preservados em campos de auditoria ou em uma tabela auxiliar antes da execucao final.

## Ordem recomendada da futura execucao

1. Revisar `relatorio_preservacao_itens_orcamentos.csv`.
2. Revisar `relatorio_comparacao_pdf_endpoint.csv`.
3. Revisar `relatorio_associacao_os_score.csv`.
4. Aprovar manualmente o lote.
5. Criar migration complementar para campos de auditoria no destino, se necessario.
6. Criar script de import definitivo com transacao por orcamento.
7. Rodar primeiro em lote pequeno e conferir PDF/orcamento no sistema.

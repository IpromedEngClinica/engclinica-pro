# Mapeamento ArkMeds para Ipromed

## Fonte ArkMeds confirmada

### Listagem interna

Endpoint somente leitura:

`GET /calibracao/api/list_calib_balanca/`

Campos confirmados:

- ID interno da calibracao;
- numero do certificado;
- empresa e ID da empresa;
- equipamento e ID do equipamento;
- tipo do formulario;
- data da calibracao;
- validade;
- ID interno da OS;
- URL do PDF original.

Na verificacao distribuida ao longo dos 6.179 registros, todas as paginas amostradas retornaram o formulario historico do tipo 1.

### Formulario de detalhe

Rota confirmada para o tipo 1:

`GET /calibracao/equipamento/editar/{id}`

Campos confirmados:

- numero;
- empresa;
- equipamento;
- OS;
- procedimento;
- observacoes;
- local;
- temperatura, umidade e pressao atmosferica com incertezas;
- datas de calibracao, emissao e validade;
- tecnico executor;
- responsavel tecnico;
- responsavel solicitante.

O JSON `tabelas` preserva:

- nome e unidade da tabela;
- ID do padrao;
- ID da tabela do certificado do padrao;
- resolucao do equipamento e do padrao;
- criterio de aceitacao;
- erro maximo;
- correcao de erro sistematico;
- fator de confiabilidade;
- pontos nominais;
- todas as leituras brutas.

### PDF original

O PDF confirmou dados finais que nao ficam preenchidos no JSON do formulario historico:

- media dos valores medidos;
- tendencia;
- incerteza expandida;
- fator de abrangencia `k`;
- resultado do criterio de aceitacao.

Por isso, a importacao definitiva deve preservar o PDF e seu SHA-256, alem de recalcular os resultados no Ipromed e comparar os dois lados.

## Destino Ipromed

| ArkMeds | Ipromed |
| --- | --- |
| Cabecalho e ambiente | `calibracao_execucoes` |
| Tabela metrologica e snapshot do padrao | `calibracao_execucao_tabelas` |
| Ponto nominal e resultados | `calibracao_execucao_pontos` |
| Leitura bruta | `calibracao_execucao_leituras` |
| Componentes de incerteza reconstruidos | `calibracao_execucao_componentes_incerteza` |
| PDF original | storage privado e hash na execucao/snapshot de migracao |

## Resultado da primeira amostra

- 20 certificados coletados;
- 39 tabelas metrologicas;
- 284 pontos nominais;
- 284 leituras brutas;
- 20 empresas encontradas por ID legado;
- 2 equipamentos encontrados por ID legado;
- 20 procedimentos encontrados;
- 18 certificados bloqueados porque o equipamento historico ainda nao existe no Ipromed;
- 2 certificados aptos para a proxima etapa de revisao, ainda sem importacao.

## Pendencias para a importacao definitiva

1. Sanear ou importar os equipamentos historicos ausentes.
2. Mapear cada ID de padrao ArkMeds para o certificado historico correspondente no Ipromed.
3. Recalcular uma amostra e comparar media, tendencia, incerteza, `k` e conformidade com o PDF.
4. Definir como armazenar o numero legado sem conflitar com a sequencia atual.
5. Criar uma funcao transacional que grave cabecalho e todos os filhos ou reverta integralmente.
6. Somente depois liberar um lote pequeno de importacao real.

# Migracao de calibracoes ArkMeds

Esta pasta executa a migracao historica em etapas. O ArkMeds e sempre consultado somente para leitura. A criacao de registros no Ipromed ocorre apenas no script de importacao definitiva, mediante dupla confirmacao.

## O que ja foi confirmado

- A listagem interna do ArkMeds e paginada e informa o total atual de certificados.
- O formulario historico preserva empresa, equipamento, OS, procedimento, datas, ambiente e responsaveis.
- O campo JSON `tabelas` preserva tabelas metrologicas, padrao utilizado, resolucoes, criterio, pontos nominais e leituras brutas.
- O PDF original continua sendo a evidencia para conferir os resultados calculados e a apresentacao historica.

## 1. Coleta local em dry-run

```powershell
node .\scripts\migracao-calibracoes\01_coletar_calibracoes.mjs --limit 20
```

Opcoes:

- `--offset 100`: inicia a coleta no registro 101 da ordenacao atual.
- `--baixar-pdfs`: baixa tambem os PDFs da amostra e calcula SHA-256.
- `--gravar-staging`: solicita gravacao nas tabelas de staging.

A gravacao no staging exige as duas condicoes:

```powershell
$env:CONFIRMAR_STAGING_CALIBRACOES="true"
node .\scripts\migracao-calibracoes\01_coletar_calibracoes.mjs --limit 20 --gravar-staging
```

Sem ambas as confirmacoes, o resultado fica somente em `outputs/migracao-calibracoes/`.

## 2. Compatibilidade com o Ipromed

```powershell
node .\scripts\migracao-calibracoes\02_analisar_compatibilidade.mjs
```

O relatorio verifica:

- empresa pelo numero legado ArkMeds;
- equipamento pelo numero legado ArkMeds e proprietario;
- OS pelo `arkmeds_os_id`;
- procedimento pelo nome;
- correspondencia das tabelas metrologicas.

## 3. Selecao de um lote compativel

O seletor ignora automaticamente certificados ArkMeds ja importados. Cada candidato precisa ter empresa e equipamento com vinculo exato, procedimento resolvido, PDF valido, quantidade de resultados igual a quantidade de pontos e dados do certificado do padrao disponiveis.

```powershell
$env:TARGET_COUNT="100"
$env:LOTE_NOME="lote_100_adicional"
$env:LIST_PAGE_SIZE="1000"
node .\scripts\migracao-calibracoes\03_selecionar_lote_30_compativeis.mjs
```

Para regenerar somente a evidencia de IDs ja importados, informe `ARKMEDS_CALIBRATION_IDS` e `ALLOW_IMPORTED_REQUESTED_IDS=true`. Essa opcao nao grava no banco.

## 4. Importacao definitiva

O script roda em dry-run por padrao:

```powershell
$env:LOTE_NOME="lote_100_adicional"
$env:EXPECTED_COUNT="100"
node .\scripts\migracao-calibracoes\04_importar_lote_30.mjs
```

A importacao real exige simultaneamente a variavel e o argumento de confirmacao:

```powershell
$env:CONFIRMAR_IMPORTACAO_CALIBRACOES="true"
node .\scripts\migracao-calibracoes\04_importar_lote_30.mjs --confirmar-importacao
```

Travas aplicadas:

- chave idempotente por `origem = 'arkmeds'` e `arkmeds_calibracao_id`;
- validacao previa de empresas, equipamentos, proprietarios e procedimentos;
- validacao do PDF e do hash SHA-256 antes da importacao;
- upload do PDF original no Storage;
- transacao individual contendo certificado, tabelas, pontos, leituras e log;
- rollback do certificado e remocao do PDF caso qualquer filho falhe;
- relatorios de dry-run e importacao em `outputs/migracao-calibracoes/importacao/`.

## 5. Migracao completa em blocos

O orquestrador processa todos os certificados elegiveis em blocos de ate 500 registros, com retomada por estado, dry-run antes de cada gravacao e auditoria do banco e do Storage ao final de cada bloco.

```powershell
$env:CONFIRMAR_IMPORTACAO_TOTAL_CALIBRACOES="true"
$env:CALIBRACOES_BLOCK_SIZE="500"
$env:ARKMEDS_LIST_PAGE_SIZE="500"
node .\scripts\migracao-calibracoes\05_migrar_restantes_em_blocos.mjs --confirmar-importacao-total
```

A importacao real exige simultaneamente a variavel `CONFIRMAR_IMPORTACAO_TOTAL_CALIBRACOES=true` e o argumento `--confirmar-importacao-total`. Sem as duas confirmacoes, o script nao altera o banco.

Arquivos de controle e conferencia:

- estado para retomada: `outputs/migracao-calibracoes/migracao_total_estado.json`;
- resumo consolidado: `outputs/migracao-calibracoes/migracao_total_resumo.md`;
- rejeicoes detalhadas: `outputs/migracao-calibracoes/migracao_total_rejeicoes.csv`;
- bloqueios de vinculo: `outputs/migracao-calibracoes/migracao_total_bloqueios_vinculo.csv`.

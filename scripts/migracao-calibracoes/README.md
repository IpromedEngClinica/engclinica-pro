# Migracao de calibracoes ArkMeds

Esta pasta inicia a migracao em modo seguro. Os scripts consultam o ArkMeds somente para leitura e nao criam registros em `calibracao_execucoes`.

## O que ja foi confirmado

- A listagem interna do ArkMeds disponibiliza 6.179 certificados.
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

## Travas antes da importacao definitiva

Ainda nao existe script de importacao definitiva nesta branch. Antes disso, sera necessario:

1. mapear o historico dos certificados dos padroes ArkMeds para os padroes Ipromed;
2. comparar os calculos de uma amostra com o PDF original;
3. definir o tratamento dos formularios ArkMeds de tipos diferentes do formulario historico;
4. preservar PDF, hash, dados brutos e relacionamento com o certificado do padrao valido na data;
5. importar cada certificado e seus filhos em uma unica transacao.

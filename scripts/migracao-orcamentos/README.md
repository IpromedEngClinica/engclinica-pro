# Migracao de orcamentos ArkMeds - staging

Esta pasta executa apenas dry-run. Nenhum script cria orcamentos definitivos no Ipromed, altera o ArkMeds ou apaga staging.

## Pre-requisitos

1. Aplicar as migrations:

```sql
supabase/migrations/090_staging_migracao_orcamentos_arkmeds.sql
supabase/migrations/091_melhorar_staging_orcamentos_arkmeds.sql
supabase/migrations/092_enriquecer_staging_orcamentos_arkmeds.sql
supabase/migrations/093_orcamentos_staging_avisos_validacao.sql
supabase/migrations/094_orcamentos_staging_status_e_integridade.sql
supabase/migrations/095_orcamentos_migracao_arkmeds_definitiva.sql
```

2. Garantir as variaveis de ambiente:

```powershell
$env:SUPABASE_URL="https://..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."
```

3. Garantir sessao ArkMeds valida em:

```text
tmp/arkmeds-state.json
```

## Execucao completa

```powershell
node .\scripts\migracao-orcamentos\05_dry_run_completo.mjs
```

## Execucao por etapas

```powershell
node .\scripts\migracao-orcamentos\01_coletar_cabecalhos.mjs
node .\scripts\migracao-orcamentos\02_coletar_itens.mjs
node .\scripts\migracao-orcamentos\06_enriquecer_detalhes_orcamentos.mjs
node .\scripts\migracao-orcamentos\03_validar_staging.mjs
node .\scripts\migracao-orcamentos\04_gerar_relatorios.mjs
```

Para testar com volume reduzido:

```powershell
node .\scripts\migracao-orcamentos\01_coletar_cabecalhos.mjs --max=50
node .\scripts\migracao-orcamentos\02_coletar_itens.mjs --max=50
node .\scripts\migracao-orcamentos\06_enriquecer_detalhes_orcamentos.mjs --max=50
node .\scripts\migracao-orcamentos\03_validar_staging.mjs
node .\scripts\migracao-orcamentos\04_gerar_relatorios.mjs
```

## Relatorios gerados

Os arquivos ficam em:

```text
outputs/migracao-orcamentos/
```

Arquivos principais:

- `relatorio_orcamentos_staging.csv`
- `relatorio_orcamento_itens_staging.csv`
- `relatorio_inconsistencias_orcamentos.csv`
- `relatorio_associacao_os_score.csv`
- `relatorio_associacao_os_por_numero_cliente.csv`
- `relatorio_os_confirmadas.csv`
- `relatorio_os_sugeridas_media_confianca.csv`
- `relatorio_os_baixa_confianca.csv`
- `relatorio_orcamentos_avulsos.csv`
- `relatorio_preservacao_itens_orcamentos.csv`
- `relatorio_detalhes_tecnicos_orcamentos.csv`
- `relatorio_comparacao_pdf_endpoint.csv`
- `relatorio_integridade_itens_staging.csv`
- `relatorio_conferencia_lote_1.csv`
- `lote_1_importacao_segura.csv`
- `lote_historico_cancelados.csv`
- `lote_historico_reprovados.csv`
- `lote_ignorados.csv`
- `relatorio_resumo_migracao_orcamentos.md`

## Revisao antes do import final

Antes de criar qualquer import definitivo, revise:

1. `relatorio_preservacao_itens_orcamentos.csv`
2. `relatorio_comparacao_pdf_endpoint.csv`
3. `relatorio_detalhes_tecnicos_orcamentos.csv`
4. `relatorio_inconsistencias_orcamentos.csv`
5. `relatorio_associacao_os_por_numero_cliente.csv`
6. `relatorio_os_confirmadas.csv`
7. `relatorio_os_sugeridas_media_confianca.csv`
8. `relatorio_os_baixa_confianca.csv`
9. Orcamentos com `pendente_os`, `pendente_empresa`, `pendente_itens`, `pendente_valor` e `duplicidade_suspeita`
10. Orcamentos com motivos `DIVERGENCIA_VALOR`, `DIVERGENCIA_TOTAL_ENDPOINT_PDF`, `DIVERGENCIA_ITENS_ENDPOINT_PDF`, `SEM_ITENS_RETORNADOS`, `ERRO_ENDPOINT_ITENS`, `ENDPOINT_ITENS_NAO_TENTADO`, `COM_ANEXO` e `JA_GEROU_OS`

## Regras desta versao

- Valores monetarios sao preservados em reais: `"1585.00"` vira `1585.00`, nao `158500`.
- O numero original do orcamento fica preservado em `arkmeds_orcamento_numero_original`.
- Orcamentos com sufixo como `56066.1` usam `56066` como numero base para procurar OS candidata.
- O vinculo com OS nao e mais assumido apenas pelo numero. Ele usa score com numero base, cliente, data e evidencia de equipamento.
- Numeros baixos ate `1373` tendem a `provavel_avulso_numero_baixo`, salvo evidencia explicita de OS.
- Os status originais do ArkMeds ficam preservados em `arkmeds_status_grupo`, `arkmeds_status_label`, `arkmeds_status_original` e `status_normalizado_importacao`.
- Pendentes, aprovados em curso e faturados entram na politica operacional se passarem nas validacoes.
- Cancelados e reprovados entram apenas em lotes historicos de consulta, quando nao houver bloqueantes criticos.
- Recusados ficam ignorados por padrao.
- Orcamentos mistos (`Pecas e Servicos`) precisam tentar os dois endpoints de itens.
- A coleta de itens limpa apenas os itens do orcamento reprocessado antes de reinserir, evitando duplicidade em dry-runs repetidos.
- `ok_para_importar` exige cabecalho, itens preservados, soma de itens coerente, PDF referenciado e vinculo seguro com OS ou avulso seguro.
- Se os itens estiverem preservados, mas os detalhes tecnicos/PDF estiverem parciais, o status fica `ok_para_importar_com_detalhes_parciais`.
- PDF sem texto extraivel, detalhes tecnicos parciais e divergencias PDF x endpoint sao avisos de auditoria. Eles nao bloqueiam importacao quando cabecalho, itens, valor e vinculo OS/avulso estao seguros.
- O `lote_1_importacao_segura.csv` aceita `ok_para_importar` e `ok_para_importar_com_detalhes_parciais`, desde que `motivos_bloqueantes` esteja vazio.

## Import definitivo

O import definitivo foi preparado em:

```text
scripts/migracao-orcamentos/07_importar_orcamentos_definitivo.mjs
```

Por seguranca, ele roda em dry-run por padrao. Exemplo de simulacao limitada:

```powershell
node .\scripts\migracao-orcamentos\07_importar_orcamentos_definitivo.mjs --lote lote_1 --limit 20
```

Para importar de verdade uma amostra de 20 registros, as tres travas precisam estar presentes:

```powershell
$env:CONFIRMAR_IMPORTACAO_ORCAMENTOS="true"
node .\scripts\migracao-orcamentos\07_importar_orcamentos_definitivo.mjs --lote lote_1 --limit 20 --confirmar-importacao
```

Sem `--confirmar-importacao`, sem `CONFIRMAR_IMPORTACAO_ORCAMENTOS=true`, ou sem `--lote lote_1`, o script apenas simula.

O script importa somente IDs presentes em `outputs/migracao-orcamentos/lote_1_importacao_segura.csv`, valida novamente as regras do Lote 1, impede duplicidade por `origem_migracao = 'arkmeds'` + `arkmeds_orcamento_id`, insere cada orcamento em transacao propria e faz rollback daquele orcamento se algum item falhar.

Relatorios pos-importacao:

```text
outputs/migracao-orcamentos/importacao/importacao_lote_1_resultado.csv
outputs/migracao-orcamentos/importacao/importacao_lote_1_erros.csv
outputs/migracao-orcamentos/importacao/importacao_lote_1_resumo.md
```

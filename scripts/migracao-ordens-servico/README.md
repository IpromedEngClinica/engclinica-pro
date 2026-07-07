# Migração de ordens de serviço Arkmeds

Este diretório prepara a migração das OS antigas sem inserir dados por acidente.

Fluxo recomendado:

1. Gere o payload e a planilha de revisão:

```powershell
node scripts/migracao-ordens-servico/refresh_snapshot.mjs
python scripts/migracao-ordens-servico/prepare_payload.py
```

2. Quando houver conflitos de equipamento, colete e classifique os proprietários na Arkmeds:

```powershell
$env:ARKMEDS_EMAIL="..."
$env:ARKMEDS_PASSWORD="..."
node scripts/migracao-ordens-servico/fetch_arkmeds_equipment_details.mjs
python scripts/migracao-ordens-servico/prepare_payload.py
```

3. Confira os arquivos gerados em `outputs/`:

- `migracao_os_resumo.json`
- `migracao_os_payload.json`
- `migracao_os_revisao.xlsx`
- `migracao_os_auditoria_equipamentos.xlsx`

4. Faça uma simulação do import:

```powershell
node scripts/migracao-ordens-servico/import_ordens_servico.mjs
```

5. Execute a importação somente quando o resumo estiver conferido:

```powershell
node scripts/migracao-ordens-servico/import_ordens_servico.mjs --execute
```

O importador usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

Regra de segurança aplicada no payload:

- importa direto quando o cliente e o equipamento antigos existem no banco novo e o equipamento pertence ao cliente;
- importa direto quando a Arkmeds mostra que o solicitante da OS e o proprietário do equipamento são clientes diferentes, desde que o proprietário do equipamento bata com o banco novo;
- corrige o proprietário do equipamento no banco novo quando a página do equipamento na Arkmeds mostra que ele pertence ao solicitante da OS;
- cria equipamento histórico desativado quando o cliente existe, mas o equipamento antigo não existe mais;
- bloqueia para revisão quando o cliente antigo não existe ou quando o equipamento antigo existe, mas está vinculado a outro cliente;
- exclui os registros do teste Hospital Alfa;
- pula OS cujo número já existe no banco.

## Checklists de preventiva Arkmeds

Depois de importar as ordens de serviço, os checklists preenchidos de preventiva
podem ser migrados pelo script:

```powershell
node scripts/migracao-ordens-servico/import_checklists_preventiva_arkmeds.mjs
```

Por padrão, o comando roda em modo simulação e gera arquivos em `outputs/`.
Para gravar no Supabase:

```powershell
node scripts/migracao-ordens-servico/import_checklists_preventiva_arkmeds.mjs --execute --limit=500 --concurrency=8 --request-timeout-ms=12000
```

Use lotes sem `--offset` durante a execução real. O script ignora OS que já
possuem checklist local, então pode ser repetido até não haver novos itens.
Ele consulta a página `list_checklist` da Arkmeds, busca o JSON preenchido em
`/cadastros/apis/get_json/{os}/{checklist}/`, cria procedimentos faltantes
quando possível e grava `os_checklists_preventiva`,
`os_checklist_preventiva_itens` e histórico da OS.

As OS que não puderem ser importadas ficam registradas em
`outputs/arkmeds_checklists_preventiva_pendentes.json` e são puladas nos lotes
seguintes. Para tentar essas pendências novamente, adicione `--retry-pending`.

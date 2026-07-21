import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { outputDir } from "./lib.mjs";

const { Client } = pg;
const REPORT_DIR = path.join(outputDir, "saldo-final-2026-07-21");
const EXCLUDED_ARKMEDS_IDS = new Set([3843, 3845]);
const SNAPSHOT_PATH = path.join(
  outputDir,
  "conferencia-status-atual",
  "snapshot_arkmeds_atual.json",
);
const OUTPUT_PATH = path.join(REPORT_DIR, "saldo_final.json");

const clean = (value) => String(value ?? "").trim();
const asNumber = (value) => Number(value || 0);

function currentStatusLabel(group) {
  const labels = {
    pendentes: "Pendente",
    aprovados_em_curso: "Aprovado",
    reprovados_em_curso: "Reprovado",
    faturados: "Faturado",
    cancelados: "Cancelado",
    recusados: "Recusado",
  };
  return labels[group] || group || "Sem status";
}

function pendingAction(row) {
  if (row.current_status_group !== "cancelados") {
    if (row.current_status_group === "recusados") return "Manter fora da importacao";
    return "Revisar antes da importacao final";
  }

  if (row.status_validacao === "historico_consulta") {
    return "Incluir no dry-run de cancelados";
  }
  if (row.status_validacao === "pendente_os") {
    return "Revisar vinculo com OS ou confirmar como avulso";
  }
  if (row.status_validacao === "pendente_itens") {
    return "Revisar itens historicos";
  }
  if (row.status_validacao === "pendente_valor") {
    return "Revisar composicao do valor";
  }
  return "Revisar antes do dry-run";
}

function toOutputRow(row, live) {
  const source = row.dados_planilha_json || {};
  const currentStatusGroup = live?.status_grupo || row.arkmeds_status_grupo || "";
  const currentStatus = currentStatusLabel(currentStatusGroup);
  const output = {
    arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
    numero: clean(live?.numero || row.arkmeds_orcamento_numero_original || row.arkmeds_orcamento_numero),
    solicitante: clean(live?.solicitante || row.arkmeds_solicitante),
    status_arkmeds_atual: currentStatus,
    status_grupo_atual: currentStatusGroup,
    status_planilha: clean(row.arkmeds_status_planilha || source["Etapa Atual"]),
    data_criacao: live?.data_criacao || row.arkmeds_data_criacao || null,
    data_cancelamento: row.arkmeds_data_cancelamento || source["Data de Cancelamento"] || null,
    tipo_orcamento: clean(row.arkmeds_tipo_texto || source["Tipo de Orçamento"]),
    valor_total: asNumber(live?.valor_total ?? row.arkmeds_valor_total),
    soma_itens: asNumber(row.soma_itens),
    diferenca_valor: asNumber(row.diferenca_valor),
    quantidade_servicos: Number(row.itens_servicos_quantidade || 0),
    quantidade_pecas: Number(row.itens_pecas_quantidade || 0),
    quantidade_itens_staging: Number(row.quantidade_itens_staging || 0),
    itens_resumo: clean(row.itens_resumo),
    ordem_servico_origem: clean(row.arkmeds_ordem_servico_planilha || row.arkmeds_ordem_servico_numero),
    ordem_servico_resolvida: clean(row.os_resolvida_numero),
    empresa_resolvida: clean(row.empresa_resolvida),
    identificador: clean(row.identificador_migracao),
    equipamento: clean(row.equipamento_texto || row.descricao_equipamento),
    fabricante: clean(row.fabricante),
    modelo: clean(row.modelo),
    numero_serie: clean(row.numero_serie),
    patrimonio: clean(row.patrimonio),
    classificacao_vinculo_os: clean(row.classificacao_vinculo_os),
    status_validacao: clean(row.status_validacao),
    motivos_bloqueantes: (row.motivos_bloqueantes || []).join(", "),
    avisos_validacao: (row.avisos_validacao || []).join(", "),
    tem_itens_preservados: row.tem_itens_preservados === true ? "Sim" : "Nao",
    pdf_original_url: clean(row.pdf_original_url),
    observacoes_planilha: clean(row.arkmeds_observacoes_planilha || source.Observações),
    dados_planilha: source,
  };
  output.acao_recomendada = pendingAction({
    current_status_group: currentStatusGroup,
    status_validacao: output.status_validacao,
  });
  return output;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const liveRows = JSON.parse(await fs.readFile(SNAPSHOT_PATH, "utf8"));
  const liveById = new Map(
    liveRows.map((row) => [Number(row.arkmeds_orcamento_id), row]),
  );

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows: remainingRows } = await client.query(`
      select
        s.*,
        empresa.nome as empresa_resolvida,
        os.numero as os_resolvida_numero,
        coalesce(items.quantidade_itens, 0)::int as quantidade_itens_staging,
        coalesce(items.itens_resumo, '') as itens_resumo
      from public.staging_arkmeds_orcamentos s
      left join public.empresas empresa on empresa.id = s.empresa_id_resolvida
      left join public.ordens_servico os on os.id = s.ordem_servico_id_resolvida
      left join lateral (
        select
          count(*) as quantidade_itens,
          string_agg(
            concat_ws(' - ', nullif(i.tipo_item, ''), nullif(i.descricao, '')),
            ' | ' order by i.tipo_item, i.arkmeds_item_id
          ) as itens_resumo
        from public.staging_arkmeds_orcamento_itens i
        where i.staging_orcamento_id = s.id
      ) items on true
      where not exists (
        select 1
        from public.orcamentos o
        where o.origem_migracao = 'arkmeds'
          and o.arkmeds_orcamento_id = s.arkmeds_orcamento_id
      )
        and not coalesce(s.motivos_associacao_os, '{}'::text[])
          @> array['IGNORAR_SEM_ITENS_PELO_USUARIO']::text[]
      order by s.arkmeds_orcamento_id desc
    `);

    const { rows: importedCounts } = await client.query(`
      select status, count(*)::int as total
      from public.orcamentos
      where origem_migracao = 'arkmeds'
      group by status
      order by status
    `);

    const stageIds = new Set(
      remainingRows.map((row) => Number(row.arkmeds_orcamento_id)),
    );
    const { rows: allStageIds } = await client.query(`
      select arkmeds_orcamento_id
      from public.staging_arkmeds_orcamentos
    `);
    const allStageIdSet = new Set(
      allStageIds.map((row) => Number(row.arkmeds_orcamento_id)),
    );

    const remaining = remainingRows.map((row) =>
      toOutputRow(row, liveById.get(Number(row.arkmeds_orcamento_id))),
    );
    const newWithoutStaging = liveRows
      .filter((row) => !EXCLUDED_ARKMEDS_IDS.has(Number(row.arkmeds_orcamento_id)))
      .filter((row) => !allStageIdSet.has(Number(row.arkmeds_orcamento_id)))
      .map((row) => ({
        arkmeds_orcamento_id: Number(row.arkmeds_orcamento_id),
        numero: clean(row.numero),
        solicitante: clean(row.solicitante),
        status_arkmeds_atual: currentStatusLabel(row.status_grupo),
        status_grupo_atual: row.status_grupo,
        data_criacao: row.data_criacao || null,
        valor_total: asNumber(row.valor_total),
        acao_recomendada: "Coletar cabecalho e itens para o staging",
      }))
      .sort((a, b) => b.arkmeds_orcamento_id - a.arkmeds_orcamento_id);

    const cancelados = remaining.filter(
      (row) => row.status_grupo_atual === "cancelados",
    );
    const outros = remaining.filter(
      (row) => row.status_grupo_atual !== "cancelados",
    );
    const canceladosPorValidacao = Object.fromEntries(
      [...new Set(cancelados.map((row) => row.status_validacao))]
        .sort()
        .map((status) => [
          status || "sem_status",
          cancelados.filter((row) => row.status_validacao === status).length,
        ]),
    );

    const payload = {
      gerado_em: new Date().toISOString(),
      origem_arkmeds: "somente_leitura",
      resumo: {
        total_arkmeds_atual: liveRows.length,
        total_importado_ipromed: importedCounts.reduce(
          (sum, row) => sum + Number(row.total),
          0,
        ),
        importados_por_status: Object.fromEntries(
          importedCounts.map((row) => [row.status, Number(row.total)]),
        ),
        total_restante_staging: remaining.length,
        cancelados_restantes: cancelados.length,
        outros_restantes: outros.length,
        novos_sem_staging: newWithoutStaging.length,
        cancelados_por_validacao: canceladosPorValidacao,
      },
      cancelados,
      outros,
      novos_sem_staging: newWithoutStaging,
    };

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
    console.log(JSON.stringify({ output: OUTPUT_PATH, ...payload.resumo }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

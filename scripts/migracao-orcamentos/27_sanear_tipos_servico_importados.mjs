import path from "node:path";
import pg from "pg";
import { outputDir, writeCsv } from "./lib.mjs";
import {
  buildCatalogIndex,
  matchSpreadsheetServices,
  resolveCatalogItem,
} from "./planilha_orcamentos.mjs";
import { parseSpreadsheetServiceEntries } from "./regras_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const OUTPUT_FILE = path.join(
  outputDir,
  "saneamento_tipos_servico_importados.csv"
);

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Configure SUPABASE_DB_URL.");
  }
  return process.env.SUPABASE_DB_URL;
}

async function loadCandidates(client) {
  const { rows } = await client.query(`
    with unique_service_map as (
      select
        arkmeds_servico_id,
        min(tipo_servico_id::text)::uuid as tipo_servico_id
      from public.orcamento_itens
      where origem_migracao = 'arkmeds'
        and tipo = 'servico'
        and arkmeds_servico_id is not null
        and tipo_servico_id is not null
      group by arkmeds_servico_id
      having count(distinct tipo_servico_id) = 1
    ),
    unique_equipment_map as (
      select
        arkmeds_servico_id,
        min(tipo_equipamento_id::text)::uuid as tipo_equipamento_id
      from public.orcamento_itens
      where origem_migracao = 'arkmeds'
        and tipo = 'servico'
        and arkmeds_servico_id is not null
        and tipo_equipamento_id is not null
      group by arkmeds_servico_id
      having count(distinct tipo_equipamento_id) = 1
    ),
    domain_service_counts as (
      select
        orcamento_id,
        count(*) filter (
          where tipo = 'servico'
            and coalesce(descricao, '') !~* '(deslocamento|viagem|frete)'
        )::int as quantidade
      from public.orcamento_itens
      group by orcamento_id
    )
    select
      oi.id as item_id,
      o.id as orcamento_id,
      o.numero as numero_orcamento,
      oi.arkmeds_servico_id,
      oi.descricao,
      oi.tipo_servico_id as tipo_servico_atual_id,
      oi.tipo_equipamento_id as tipo_equipamento_atual_id,
      coalesce(
        sm.tipo_servico_id,
        case
          when dsc.quantidade = 1
            and coalesce(oi.descricao, '') !~* '(deslocamento|viagem|frete)'
          then os.tipo_os_id
          else null
        end
      ) as tipo_servico_novo_id,
      case
        when sm.tipo_servico_id is not null then 'arkmeds_servico_id'
        when dsc.quantidade = 1 and os.tipo_os_id is not null then 'ordem_servico_vinculada'
        else null
      end as tipo_servico_origem,
      coalesce(oi.tipo_equipamento_id, em.tipo_equipamento_id) as tipo_equipamento_novo_id,
      tos.nome as tipo_servico_novo,
      te.nome as tipo_equipamento_novo
    from public.orcamento_itens oi
    join public.orcamentos o on o.id = oi.orcamento_id
    left join unique_service_map sm
      on sm.arkmeds_servico_id = oi.arkmeds_servico_id
    left join unique_equipment_map em
      on em.arkmeds_servico_id = oi.arkmeds_servico_id
    left join public.ordens_servico os on os.id = o.ordem_servico_id
    left join domain_service_counts dsc on dsc.orcamento_id = o.id
    left join public.tipos_os tos on tos.id = coalesce(
      sm.tipo_servico_id,
      case
        when dsc.quantidade = 1
          and coalesce(oi.descricao, '') !~* '(deslocamento|viagem|frete)'
        then os.tipo_os_id
        else null
      end
    )
    left join public.tipos_equipamento te
      on te.id = coalesce(oi.tipo_equipamento_id, em.tipo_equipamento_id)
    where oi.origem_migracao = 'arkmeds'
      and oi.tipo = 'servico'
      and oi.tipo_servico_id is null
      and (
        sm.tipo_servico_id is not null
        or (
          dsc.quantidade = 1
          and os.tipo_os_id is not null
          and coalesce(oi.descricao, '') !~* '(deslocamento|viagem|frete)'
        )
      )
    order by o.numero, oi.ordem, oi.id
  `);

  return rows;
}

async function loadSpreadsheetCandidates(client) {
  const { rows: budgets } = await client.query(`
    select distinct
      o.id as orcamento_id,
      o.numero as numero_orcamento,
      coalesce(
        s.dados_planilha_json,
        o.dados_migracao_json -> 'dados_planilha_json',
        '{}'::jsonb
      ) as dados_planilha_json
    from public.orcamentos o
    join public.orcamento_itens unresolved on unresolved.orcamento_id = o.id
    left join public.staging_arkmeds_orcamentos s
      on s.arkmeds_orcamento_id = o.arkmeds_orcamento_id
    where unresolved.origem_migracao = 'arkmeds'
      and unresolved.tipo = 'servico'
      and unresolved.tipo_servico_id is null
      and coalesce(unresolved.descricao, '') !~* '(deslocamento|viagem|frete)'
  `);
  if (!budgets.length) return [];

  const budgetIds = budgets.map((item) => item.orcamento_id);
  const { rows: items } = await client.query(
    `select *
     from public.orcamento_itens
     where orcamento_id = any($1::uuid[])
       and tipo = 'servico'
       and coalesce(descricao, '') !~* '(deslocamento|viagem|frete)'
     order by orcamento_id, ordem, id`,
    [budgetIds]
  );
  const { rows: serviceTypes } = await client.query(
    "select id, nome from public.tipos_os where ativo = true"
  );
  const { rows: equipmentTypes } = await client.query(
    "select id, nome from public.tipos_equipamento where ativo = true"
  );

  const itemsByBudget = new Map();
  for (const item of items) {
    if (!itemsByBudget.has(item.orcamento_id)) {
      itemsByBudget.set(item.orcamento_id, []);
    }
    itemsByBudget.get(item.orcamento_id).push(item);
  }

  const serviceTypeIndex = buildCatalogIndex(serviceTypes);
  const equipmentTypeIndex = buildCatalogIndex(equipmentTypes);
  const candidates = [];

  for (const budget of budgets) {
    const budgetItems = itemsByBudget.get(budget.orcamento_id) || [];
    const spreadsheetEntries = parseSpreadsheetServiceEntries(
      budget.dados_planilha_json?.servicos
    );
    if (!spreadsheetEntries.length || budgetItems.length !== spreadsheetEntries.length) {
      continue;
    }

    const matches = matchSpreadsheetServices(budgetItems, budget);
    if (matches.some((match) => !match)) continue;

    budgetItems.forEach((item, index) => {
      if (item.tipo_servico_id) return;

      const match = matches[index];
      const serviceType = resolveCatalogItem(serviceTypeIndex, match.service);
      if (!serviceType) return;

      const equipmentType = resolveCatalogItem(
        equipmentTypeIndex,
        match.equipment
      );
      candidates.push({
        item_id: item.id,
        orcamento_id: budget.orcamento_id,
        numero_orcamento: budget.numero_orcamento,
        arkmeds_servico_id: item.arkmeds_servico_id,
        descricao: item.descricao,
        tipo_servico_atual_id: null,
        tipo_equipamento_atual_id: item.tipo_equipamento_id,
        tipo_servico_novo_id: serviceType.id,
        tipo_servico_origem: "planilha",
        tipo_equipamento_novo_id:
          item.tipo_equipamento_id || equipmentType?.id || null,
        tipo_servico_novo: serviceType.nome,
        tipo_equipamento_novo: equipmentType?.nome || null,
      });
    });
  }

  return candidates;
}

async function applyCandidates(client, candidates) {
  await client.query("begin");
  try {
    for (const item of candidates) {
      await client.query(
        `update public.orcamento_itens
         set tipo_servico_id = $2,
             tipo_equipamento_id = coalesce(tipo_equipamento_id, $3),
             dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
               || jsonb_build_object(
                 'tipo_servico_saneado_em', now(),
                 'tipo_servico_saneado_origem', $4::text
               )
         where id = $1
           and tipo_servico_id is null`,
        [
          item.item_id,
          item.tipo_servico_novo_id,
          item.tipo_equipamento_novo_id,
          item.tipo_servico_origem,
        ]
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const mappedCandidates = await loadCandidates(client);
    const spreadsheetCandidates = await loadSpreadsheetCandidates(client);
    const candidatesByItem = new Map();
    for (const item of [...mappedCandidates, ...spreadsheetCandidates]) {
      if (!candidatesByItem.has(item.item_id)) {
        candidatesByItem.set(item.item_id, item);
      }
    }
    const candidates = [...candidatesByItem.values()];
    if (APPLY && candidates.length) {
      await applyCandidates(client, candidates);
    }

    await writeCsv(
      OUTPUT_FILE,
      candidates.map((item) => ({
        numero_orcamento: item.numero_orcamento,
        item_id: item.item_id,
        arkmeds_servico_id: item.arkmeds_servico_id,
        descricao_original: item.descricao,
        tipo_servico: item.tipo_servico_novo,
        tipo_equipamento: item.tipo_equipamento_novo,
        origem_correcao: item.tipo_servico_origem,
        resultado: APPLY ? "corrigido" : "simulado",
      })),
      [
        "numero_orcamento",
        "item_id",
        "arkmeds_servico_id",
        "descricao_original",
        "tipo_servico",
        "tipo_equipamento",
        "origem_correcao",
        "resultado",
      ]
    );

    console.log(
      JSON.stringify(
        {
          modo: APPLY ? "aplicado" : "simulacao",
          itens: candidates.length,
          por_arkmeds_servico_id: candidates.filter(
            (item) => item.tipo_servico_origem === "arkmeds_servico_id"
          ).length,
          por_ordem_servico: candidates.filter(
            (item) => item.tipo_servico_origem === "ordem_servico_vinculada"
          ).length,
          por_planilha: candidates.filter(
            (item) => item.tipo_servico_origem === "planilha"
          ).length,
          relatorio: OUTPUT_FILE,
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

await main();

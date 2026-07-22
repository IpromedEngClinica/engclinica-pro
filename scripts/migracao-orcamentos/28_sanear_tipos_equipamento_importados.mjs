import path from "node:path";
import pg from "pg";
import {
  cleanText,
  fetchArkmedsJson,
  normalizeKindText,
  outputDir,
  writeCsv,
} from "./lib.mjs";
import {
  buildCatalogIndex,
  resolveEquipmentFromServiceDescription,
} from "./planilha_orcamentos.mjs";

const { Client } = pg;
const APPLY = process.argv.includes("--aplicar");
const OUTPUT_FILE = path.join(
  outputDir,
  "saneamento_tipos_equipamento_importados.csv"
);

function requireDatabaseUrl() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Configure SUPABASE_DB_URL.");
  }
  return process.env.SUPABASE_DB_URL;
}

function resolveServiceType(serviceTypeIndex, catalogText) {
  const normalizedText = normalizeKindText(catalogText);
  const matches = [];

  for (const rows of serviceTypeIndex.values()) {
    for (const row of rows) {
      const normalizedName = normalizeKindText(row.nome);
      if (normalizedName && normalizedText.startsWith(normalizedName)) {
        matches.push({ row, length: normalizedName.length });
      }
    }
  }

  matches.sort((a, b) => b.length - a.length);
  return matches[0]?.row || null;
}

async function loadCandidates(client) {
  const { rows: items } = await client.query(`
        select
          oi.id as item_id,
          o.id as orcamento_id,
          o.numero as numero_orcamento,
          oi.arkmeds_servico_id,
          oi.descricao,
          oi.tipo_servico_id as tipo_servico_atual_id,
          oi.tipo_equipamento_id as tipo_equipamento_atual_id
        from public.orcamento_itens oi
        join public.orcamentos o on o.id = oi.orcamento_id
        where oi.origem_migracao = 'arkmeds'
          and oi.tipo = 'servico'
          and oi.tipo_equipamento_id is null
          and coalesce(oi.descricao, '') !~* '(deslocamento|viagem|frete)'
        order by o.numero, oi.ordem, oi.id
      `);
  const { rows: serviceTypes } = await client.query(
    "select id, nome from public.tipos_os where ativo = true"
  );
  const { rows: equipmentTypes } = await client.query(
    "select id, nome from public.tipos_equipamento where ativo = true"
  );

  const serviceTypeIndex = buildCatalogIndex(serviceTypes);
  const equipmentTypeIndex = buildCatalogIndex(equipmentTypes);
  const candidates = [];

  for (const item of items) {
    const equipmentType = resolveEquipmentFromServiceDescription(
      equipmentTypeIndex,
      item.descricao
    );
    if (!equipmentType) continue;

    candidates.push({
      ...item,
      tipo_equipamento_novo_id: equipmentType.id,
      tipo_equipamento_novo: equipmentType.nome,
      tipo_servico_novo_id: null,
      tipo_servico_novo: null,
      catalogo_arkmeds: null,
    });
  }

  const unresolvedServiceByArkmedsId = new Map();
  for (const candidate of candidates) {
    if (
      candidate.tipo_servico_atual_id ||
      candidate.arkmeds_servico_id == null ||
      unresolvedServiceByArkmedsId.has(candidate.arkmeds_servico_id)
    ) {
      continue;
    }
    unresolvedServiceByArkmedsId.set(candidate.arkmeds_servico_id, candidate);
  }

  const serviceResolutionByArkmedsId = new Map();
  for (const [arkmedsServiceId, candidate] of unresolvedServiceByArkmedsId) {
    try {
      const query = cleanText(candidate.descricao).replace(/^em\s+/i, "");
      const payload = await fetchArkmedsJson(
        `/orcamento/api/carregar_servicos_editar/?texto=${encodeURIComponent(query)}`
      );
      const catalogItem = Array.isArray(payload)
        ? payload.find((item) => Number(item.id) === Number(arkmedsServiceId))
        : null;
      const serviceType = catalogItem
        ? resolveServiceType(serviceTypeIndex, catalogItem.text)
        : null;

      serviceResolutionByArkmedsId.set(arkmedsServiceId, {
        catalogText: catalogItem?.text || null,
        serviceType,
      });
    } catch (error) {
      serviceResolutionByArkmedsId.set(arkmedsServiceId, {
        catalogText: null,
        serviceType: null,
        error: error.message,
      });
    }
  }

  return candidates.map((candidate) => {
    const resolution = serviceResolutionByArkmedsId.get(
      candidate.arkmeds_servico_id
    );
    return {
      ...candidate,
      tipo_servico_novo_id: resolution?.serviceType?.id || null,
      tipo_servico_novo: resolution?.serviceType?.nome || null,
      catalogo_arkmeds: resolution?.catalogText || null,
      erro_catalogo: resolution?.error || null,
    };
  });
}

async function applyCandidates(client, candidates) {
  await client.query("begin");
  try {
    for (const item of candidates) {
      await client.query(
        `update public.orcamento_itens
         set tipo_equipamento_id = coalesce(
               tipo_equipamento_id,
               $2::uuid
             ),
             tipo_servico_id = coalesce(tipo_servico_id, $3::uuid),
             dados_migracao_json = coalesce(dados_migracao_json, '{}'::jsonb)
               || jsonb_build_object(
                 'tipo_equipamento_saneado_em', now(),
                 'tipo_equipamento_saneado_origem', 'descricao_item'
               )
               || case
                    when tipo_servico_id is null and $3::uuid is not null
                    then jsonb_build_object(
                      'tipo_servico_saneado_em', now(),
                      'tipo_servico_saneado_origem', 'catalogo_arkmeds'
                    )
                    else '{}'::jsonb
                  end
         where id = $1
           and (tipo_equipamento_id is null or tipo_servico_id is null)`,
        [
          item.item_id,
          item.tipo_equipamento_novo_id,
          item.tipo_servico_novo_id,
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
    const candidates = await loadCandidates(client);
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
        catalogo_arkmeds: item.catalogo_arkmeds,
        erro_catalogo: item.erro_catalogo,
        resultado: APPLY ? "corrigido" : "simulado",
      })),
      [
        "numero_orcamento",
        "item_id",
        "arkmeds_servico_id",
        "descricao_original",
        "tipo_servico",
        "tipo_equipamento",
        "catalogo_arkmeds",
        "erro_catalogo",
        "resultado",
      ]
    );

    console.log(
      JSON.stringify(
        {
          modo: APPLY ? "aplicado" : "simulacao",
          itens: candidates.length,
          orcamentos: new Set(
            candidates.map((item) => item.orcamento_id)
          ).size,
          tipos_servico_recuperados: candidates.filter(
            (item) =>
              !item.tipo_servico_atual_id && item.tipo_servico_novo_id
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

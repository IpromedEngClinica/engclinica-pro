import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const payloadPath = path.join(root, "outputs", "migracao_os_payload.json");

const execute = process.argv.includes("--execute");
const batchSize = 300;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

const compact = (record) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== "")
  );

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

async function getOrganizacaoId(payload) {
  const empresaId = payload.ordens_servico[0]?.empresa_id || payload.equipamentos_historicos[0]?.empresa_id;
  if (!empresaId) throw new Error("Payload vazio.");

  const data = await must(
    "Buscar organizacao",
    supabase.from("empresas").select("organizacao_id").eq("id", empresaId).single()
  );
  return data.organizacao_id;
}

async function supportsArkmedsColumn() {
  const { error } = await supabase.from("ordens_servico").select("arkmeds_os_id").limit(1);
  return !error;
}

async function fetchByIn(table, columns, field, values) {
  const uniqueValues = [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
  const rows = [];
  for (const part of chunk(uniqueValues, 500)) {
    const data = await must(
      `Buscar ${table}.${field}`,
      supabase.from(table).select(columns).in(field, part)
    );
    rows.push(...(data || []));
  }
  return rows;
}

async function ensureTiposEquipamento(organizacaoId, equipamentosHistoricos) {
  const nomes = [
    ...new Set(
      equipamentosHistoricos
        .filter((item) => !item.tipo_equipamento_id && item.tipo_equipamento_nome)
        .map((item) => item.tipo_equipamento_nome)
    ),
  ];
  if (!nomes.length) return new Map();

  const existentes = await must(
    "Buscar tipos de equipamento",
    supabase.from("tipos_equipamento").select("id,nome").eq("organizacao_id", organizacaoId)
  );
  const byName = new Map((existentes || []).map((item) => [normalize(item.nome), item]));
  const faltantes = nomes.filter((nome) => !byName.has(normalize(nome)));

  if (faltantes.length && execute) {
    const data = await must(
      "Criar tipos de equipamento",
      supabase
        .from("tipos_equipamento")
        .insert(
          faltantes.map((nome) => ({
            organizacao_id: organizacaoId,
            nome,
            descricao: "Criado automaticamente na migracao de OS Arkmeds.",
            ativo: true,
          }))
        )
        .select("id,nome")
    );
    for (const item of data || []) byName.set(normalize(item.nome), item);
  }

  return byName;
}

async function ensureEquipamentosHistoricos(organizacaoId, payload) {
  const historicos = payload.equipamentos_historicos || [];
  const numeros = historicos.map((item) => item.numero_cadastro);
  const existentes = await fetchByIn(
    "equipamentos",
    "id,numero_cadastro,tipo_equipamento_id,empresa_id",
    "numero_cadastro",
    numeros
  );
  const byNumero = new Map((existentes || []).map((item) => [String(item.numero_cadastro), item]));
  const tiposByName = await ensureTiposEquipamento(organizacaoId, historicos);

  const criar = historicos.filter((item) => !byNumero.has(String(item.numero_cadastro)));

  if (criar.length && execute) {
    for (const part of chunk(criar, batchSize)) {
      const data = await must(
        "Criar equipamentos historicos",
        supabase
          .from("equipamentos")
          .insert(
            part.map((item) => {
              const tipo =
                item.tipo_equipamento_id ||
                tiposByName.get(normalize(item.tipo_equipamento_nome))?.id ||
                null;
              return compact({
                organizacao_id: organizacaoId,
                empresa_id: item.empresa_id,
                numero_cadastro: item.numero_cadastro,
                tipo_equipamento_id: tipo,
                tipo_texto: item.tipo_texto,
                fabricante: item.fabricante,
                modelo: item.modelo,
                numero_serie: item.numero_serie,
                patrimonio: item.patrimonio,
                tag: item.tag,
                setor: item.setor,
                status: "Desativado",
                ativo: false,
                observacoes: item.observacoes,
              });
            })
          )
          .select("id,numero_cadastro,tipo_equipamento_id,empresa_id")
      );
      for (const item of data || []) byNumero.set(String(item.numero_cadastro), item);
    }
  }

  return {
    existentes: existentes.length,
    criar: criar.length,
    byNumero,
  };
}

async function applyEquipamentoOwnerUpdates(payload) {
  const updates = payload.equipamentos_owner_updates || [];
  if (!updates.length) {
    return { total: 0, atualizados: 0 };
  }

  if (!execute) {
    return { total: updates.length, atualizados: 0 };
  }

  let atualizados = 0;
  for (const item of updates) {
    const nota = [
      "Proprietario corrigido durante migracao de OS Arkmeds.",
      `Cliente anterior: ${item.cliente_atual_nome || item.empresa_id_atual || "-"}.`,
      `Cliente correto: ${item.cliente_correto_nome || item.empresa_id_correta || "-"}.`,
      `Proprietario Arkmeds: ${item.arkmeds_proprietario || "-"}.`,
    ].join(" ");

    const atual = await must(
      "Buscar observacao atual do equipamento",
      supabase.from("equipamentos").select("observacoes").eq("id", item.equipamento_id).single()
    );

    const observacao = [atual?.observacoes, nota].filter(Boolean).join("\n");

    const { error } = await supabase
      .from("equipamentos")
      .update({
        empresa_id: item.empresa_id_correta,
        empresa_setor_id: null,
        observacoes: observacao,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.equipamento_id);

    if (error) {
      throw new Error(`Corrigir proprietario equipamento ${item.numero_cadastro}: ${error.message}`);
    }
    atualizados += 1;
  }

  return { total: updates.length, atualizados };
}

async function existingOs(payload, includeArkmeds) {
  const numeros = payload.ordens_servico.map((item) => item.numero);
  const byNumeroRows = await fetchByIn("ordens_servico", "id,numero", "numero", numeros);
  const byNumero = new Set(byNumeroRows.map((item) => String(item.numero)));

  const byArkmeds = new Set();
  if (includeArkmeds) {
    const ids = payload.ordens_servico.map((item) => item.arkmeds_os_id);
    const rows = await fetchByIn("ordens_servico", "id,arkmeds_os_id", "arkmeds_os_id", ids);
    for (const item of rows) byArkmeds.add(Number(item.arkmeds_os_id));
  }

  return { byNumero, byArkmeds };
}

async function importOrdens(organizacaoId, payload, equipamentosByNumero, includeArkmeds) {
  const existentes = await existingOs(payload, includeArkmeds);
  const candidatas = [];
  const bloqueadas = [];

  for (const item of payload.ordens_servico) {
    if (existentes.byNumero.has(String(item.numero))) {
      bloqueadas.push({ numero: item.numero, motivo: "numero_existente" });
      continue;
    }
    if (includeArkmeds && existentes.byArkmeds.has(Number(item.arkmeds_os_id))) {
      bloqueadas.push({ numero: item.numero, motivo: "arkmeds_os_id_existente" });
      continue;
    }

    let equipamentoId = item.equipamento_id;
    if (!equipamentoId && item.equipamento_modo === "historico_desativado") {
      equipamentoId = equipamentosByNumero.get(String(item.arkmeds_equipamento_id))?.id || null;
    }
    if (item.equipamento_modo === "historico_desativado" && !equipamentoId && execute) {
      bloqueadas.push({ numero: item.numero, motivo: "equipamento_historico_nao_criado" });
      continue;
    }

    candidatas.push({ ...item, equipamento_id: equipamentoId });
  }

  if (!execute) {
    return {
      candidatas: candidatas.length,
      bloqueadas: bloqueadas.length,
      inseridas: 0,
      dryRun: true,
    };
  }

  let inseridas = 0;
  for (const part of chunk(candidatas, batchSize)) {
    const rows = part.map((item) => {
      const base = compact({
        organizacao_id: organizacaoId,
        numero: String(item.numero),
        empresa_id: item.empresa_id,
        equipamento_id: item.equipamento_id,
        tipo_os_id: item.tipo_os_id,
        estado_os_id: item.estado_os_id,
        tecnico_responsavel_id: item.tecnico_responsavel_id,
        solicitante_texto: item.solicitante_texto,
        responsavel_texto: item.responsavel_texto,
        data_abertura: item.data_abertura,
        data_fechamento: item.data_fechamento,
        problema_relatado: item.problema_relatado,
        origem_problema: item.origem_problema,
        descricao_servico: item.descricao_servico,
        observacoes: item.observacoes,
        prioridade: item.prioridade,
        status_sistema: item.status_sistema,
        ativo: item.ativo,
        created_at: item.data_abertura,
        updated_at: item.data_fechamento || item.data_abertura,
      });
      if (includeArkmeds) base.arkmeds_os_id = item.arkmeds_os_id;
      return base;
    });

    const inserted = await must(
      "Inserir ordens de servico",
      supabase.from("ordens_servico").insert(rows).select("id,numero")
    );
    inseridas += inserted.length;

    const estadoByNumero = new Map(part.map((item) => [String(item.numero), item.estado_os_id]));
    const historicoRows = inserted.map((item) => ({
      ordem_servico_id: item.id,
      estado_novo_id: estadoByNumero.get(String(item.numero)) || null,
      acao: "importacao_arkmeds",
      observacao: "OS importada do historico Arkmeds.",
    }));
    await must(
      "Inserir historico de OS",
      supabase.from("ordem_servico_historico").insert(historicoRows)
    );
  }

  return {
    candidatas: candidatas.length,
    bloqueadas: bloqueadas.length,
    inseridas,
    dryRun: false,
  };
}

async function main() {
  const payload = JSON.parse(await fs.readFile(payloadPath, "utf-8"));
  const organizacaoId = await getOrganizacaoId(payload);
  const includeArkmeds = await supportsArkmedsColumn();

  const equipamentos = await ensureEquipamentosHistoricos(organizacaoId, payload);
  const equipamentosOwnerUpdates = await applyEquipamentoOwnerUpdates(payload);
  const ordens = await importOrdens(organizacaoId, payload, equipamentos.byNumero, includeArkmeds);

  console.log(
    JSON.stringify(
      {
        modo: execute ? "execute" : "dry-run",
        coluna_arkmeds_os_id_disponivel: includeArkmeds,
        equipamentos_historicos: {
          ja_existiam: equipamentos.existentes,
          para_criar: equipamentos.criar,
          criados: execute ? equipamentos.criar : 0,
        },
        equipamentos_corrigir_proprietario: equipamentosOwnerUpdates,
        ordens_servico: ordens,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

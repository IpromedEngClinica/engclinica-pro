import { createClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadArkmedsOsDetails } from "./lib/arkmeds-os-details.mjs";

const { Client } = pg;
const root = process.cwd();
const outputDir = path.join(root, "outputs", "sincronizacao-os");
const detailsCacheDir = path.join(outputDir, "detalhes-cache");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const capturePath = path.join(root, "outputs", "arkmeds_os_list_request_capture.json");
const baseUrl = "https://aci.arkmeds.com";
const execute = process.argv.includes("--execute");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number.parseInt(limitArg?.split("=")[1] || "500", 10) || 500;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const fixMojibake = (value) => {
  const text = String(value ?? "");
  if (!/[ÃÂ]/.test(text)) return text;
  const fixed = Buffer.from(text, "latin1").toString("utf8");
  return fixed.includes("�") ? text : fixed;
};

const clean = (value) => {
  const text = fixMojibake(value).replace(/\s+/g, " ").trim();
  return !text || text === "-" || text.toLocaleLowerCase("pt-BR") === "nan"
    ? ""
    : text;
};

const normalize = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

const parseDateTimeBr = (value) => {
  const match = clean(value).match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`;
};

const statusSistemaOs = (value) => {
  const key = normalize(value);
  if (key.includes("cancel")) return "cancelada";
  if (key.includes("fechad") || key.includes("finalizado")) return "fechada";
  return "aberta";
};

const prioridadeOs = (value) => {
  const key = normalize(value);
  if (key.includes("muito")) return "urgente";
  if (key.includes("urgente")) return "alta";
  if (key.includes("pouco") || key.includes("nao urgente")) return "baixa";
  return "normal";
};

const statusEquipamento = (value) => {
  const key = normalize(value);
  if (key.includes("manutencao")) return "Em manuten\u00e7\u00e3o";
  if (key.includes("desativ")) return "Desativado";
  if (key.includes("locad")) return "Locado";
  return "Ativo";
};

const field = (row, names) => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return clean(row[name]);
  }
  return "";
};

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function fetchAll(table, select, orderBy = null) {
  const result = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const page = await must(`Buscar ${table}`, query);
    result.push(...(page || []));
    if (!page || page.length < 1000) break;
  }
  return result;
}

async function cookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  return state.cookies
    .filter((item) => item.domain.includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function fetchArkmeds(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      cookie: await cookieHeader(),
      "x-requested-with": "XMLHttpRequest",
    },
  });
  const text = await response.text();
  if (/usuarios\/conectar|name="username"/i.test(text)) {
    throw new Error("Sessao ArkMeds expirada. Renove o login antes de sincronizar.");
  }
  if (!response.ok) throw new Error(`ArkMeds HTTP ${response.status}: ${pathname}`);
  return text;
}

async function fetchLatestOs(total) {
  const capture = JSON.parse(await fs.readFile(capturePath, "utf8"))[0];
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  const csrf = state.cookies.find(
    (item) => item.name === "csrftoken" && item.domain.includes("aci.arkmeds.com")
  )?.value || "";
  const params = new URLSearchParams(capture.postData);
  params.set("start", "0");
  params.set("length", String(total));
  params.set("order[0][column]", "4");
  params.set("order[0][dir]", "desc");

  const response = await fetch(`${baseUrl}/ordem_servico/apis/ordem_servico_list/`, {
    method: "POST",
    headers: {
      cookie: await cookieHeader(),
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      "x-csrftoken": csrf,
      referer: `${baseUrl}/ordem_servico/`,
    },
    body: params.toString(),
  });

  if (!response.ok) throw new Error(`ArkMeds OS HTTP ${response.status}`);
  return response.json();
}

function tableRowsFromHtml(html) {
  const dom = new JSDOM(html);
  const table = dom.window.document.querySelector("table.table");
  if (!table) return [];
  const headers = [...table.querySelectorAll("thead th")].map((th) => clean(th.textContent));
  return [...table.querySelectorAll("tbody tr")]
    .map((tr) => {
      const row = {};
      [...tr.querySelectorAll("td")].forEach((td, index) => {
        row[headers[index] || `col_${index}`] = clean(td.textContent);
      });
      const href = tr.querySelector('a[href*="visual/"]')?.getAttribute("href") || "";
      const match = href.match(/visual\/(\d+)/);
      if (match) row.__id = Number.parseInt(match[1], 10);
      return row;
    })
    .filter((row) => row.__id);
}

async function fetchRequiredEquipmentRows(requiredIds) {
  const remaining = new Set(requiredIds.map(Number));
  const found = new Map();

  for (let page = 1; remaining.size > 0 && page <= 200; page += 1) {
    const html = await fetchArkmeds(`/cadastros/equipamento/?page=${page}`);
    const rows = tableRowsFromHtml(html);
    if (!rows.length) break;
    for (const row of rows) {
      if (remaining.has(row.__id)) {
        found.set(row.__id, row);
        remaining.delete(row.__id);
      }
    }
  }

  return { found, missing: [...remaining] };
}

async function ensureReference({ table, name, map, payload }) {
  const key = normalize(name);
  if (map.has(key)) return map.get(key).id;
  if (!execute) return null;
  const created = await must(
    `Criar referencia ${table}`,
    supabase.from(table).insert(payload).select("id,nome").single()
  );
  map.set(key, created);
  return created.id;
}

function buildUserMap(users) {
  const map = new Map();
  for (const user of users) {
    const key = normalize(user.nome);
    if (key && !map.has(key)) map.set(key, user);
  }
  return map;
}

async function setSequenceToImportedMax() {
  if (!execute) return null;
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  try {
    const result = await client.query(
      `select coalesce(max(numero_ordem), 1)::bigint as max_numero
       from public.ordens_servico
       where arkmeds_os_id is not null`
    );
    const maxNumero = Number(result.rows[0].max_numero);
    await client.query(
      "select setval('public.ordens_servico_numero_seq', $1, true)",
      [maxNumero]
    );
    return maxNumero;
  } finally {
    await client.end();
  }
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const arkmedsResult = await fetchLatestOs(limit);
  const sourceOs = arkmedsResult.data || [];

  const [organizacoes, empresas, equipamentos, tiposEquipamento, tiposOs, estadosOs, users, dbOs] =
    await Promise.all([
      fetchAll("organizacoes", "id"),
      fetchAll("empresas", "id,numero_cadastro,nome,nome_fantasia,ativo", "numero_cadastro"),
      fetchAll("equipamentos", "id,numero_cadastro,empresa_id,tipo_texto,ativo", "numero_cadastro"),
      fetchAll("tipos_equipamento", "id,nome,ativo", "nome"),
      fetchAll("tipos_os", "id,nome,ativo", "nome"),
      fetchAll("estados_os", "id,nome,finaliza_os,cancela_os,ativo", "nome"),
      fetchAll("usuarios", "id,nome,email,perfil,ativo", "nome"),
      fetchAll(
        "ordens_servico",
        "id,numero,numero_ordem,arkmeds_os_id,oculta_operacao,problema_relatado,origem_problema,descricao_servico",
        "numero_ordem"
      ),
    ]);

  const organizacaoId = organizacoes[0]?.id;
  if (!organizacaoId) throw new Error("Organizacao nao encontrada.");

  const empresasByNumero = new Map(
    empresas.map((item) => [String(item.numero_cadastro), item])
  );
  const equipamentosByNumero = new Map(
    equipamentos.map((item) => [String(item.numero_cadastro), item])
  );
  const tiposEquipamentoByName = new Map(
    tiposEquipamento.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])
  );
  const tiposOsByName = new Map(
    tiposOs.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])
  );
  const estadosOsByName = new Map(
    estadosOs.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])
  );
  const usersByName = buildUserMap(users.filter((item) => item.ativo !== false));
  const osByArkmedsId = new Map(
    dbOs.filter((item) => item.arkmeds_os_id).map((item) => [Number(item.arkmeds_os_id), item])
  );
  const osDetailsResult = await loadArkmedsOsDetails({
    ids: sourceOs
      .filter((row) => {
        const existing = osByArkmedsId.get(Number(row.id));
        return !existing
          || !clean(existing.problema_relatado)
          || !clean(existing.origem_problema)
          || !clean(existing.descricao_servico);
      })
      .map((row) => row.id),
    baseUrl,
    cookie: await cookieHeader(),
    cacheDir: detailsCacheDir,
    concurrency: 8,
  });

  const missingEquipmentIds = [...new Set(
    sourceOs
      .map((item) => Number(item.equipamento))
      .filter((id) => id && !equipamentosByNumero.has(String(id)))
  )];
  const equipmentSource = await fetchRequiredEquipmentRows(missingEquipmentIds);
  const ownerByEquipmentId = new Map();

  for (const os of sourceOs) {
    const equipmentId = Number(os.equipamento);
    const companyNumber = String(os.solicitante || "");
    if (!equipmentId || !companyNumber) continue;
    if (!ownerByEquipmentId.has(equipmentId)) ownerByEquipmentId.set(equipmentId, new Set());
    ownerByEquipmentId.get(equipmentId).add(companyNumber);
  }

  const equipmentCreates = [];
  const equipmentPending = equipmentSource.missing.map((numeroCadastro) => ({
    numero_cadastro: numeroCadastro,
    motivo: "equipamento_nao_encontrado_na_listagem_arkmeds",
  }));

  for (const [numeroCadastro, row] of equipmentSource.found) {
    const owners = [...(ownerByEquipmentId.get(numeroCadastro) || [])];
    if (owners.length !== 1 || !empresasByNumero.has(owners[0])) {
      equipmentPending.push({
        numero_cadastro: numeroCadastro,
        motivo: owners.length > 1 ? "proprietario_divergente_nas_os" : "proprietario_nao_encontrado",
        proprietarios: owners,
      });
      continue;
    }

    const tipoNome = field(row, ["Tipo"]) || "Equipamento";
    const tipoId = await ensureReference({
      table: "tipos_equipamento",
      name: tipoNome,
      map: tiposEquipamentoByName,
      payload: {
        organizacao_id: organizacaoId,
        nome: tipoNome,
        descricao: "Criado automaticamente pela sincronizacao ArkMeds.",
        ativo: true,
      },
    });
    const identificacao = field(row, ["Identifica\u00e7\u00e3o", "Identificacao"]);
    const status = statusEquipamento(field(row, ["Estado"]));
    equipmentCreates.push({
      organizacao_id: organizacaoId,
      numero_cadastro: numeroCadastro,
      empresa_id: empresasByNumero.get(owners[0]).id,
      tipo_equipamento_id: tipoId,
      tipo_texto: tipoNome,
      fabricante: field(row, ["Fabricante"]) || null,
      modelo: field(row, ["Modelo"]) || null,
      numero_serie: field(row, ["N\u00ba de S\u00e9rie", "N\u00b0 de S\u00e9rie", "Numero de Serie"]) || null,
      patrimonio: field(row, ["Patrim\u00f4nio", "Patrimonio"]) || null,
      tag: identificacao || null,
      setor: identificacao.replace(/^Setor:\s*/i, "") || null,
      status,
      ativo: status !== "Desativado",
      observacoes: "Sincronizado do ArkMeds para viabilizar a OS de origem.",
      updated_at: new Date().toISOString(),
    });
  }

  if (execute) {
    for (const payload of equipmentCreates) {
      await must(
        `Criar equipamento ArkMeds ${payload.numero_cadastro}`,
        supabase.from("equipamentos").insert(payload).select("id,numero_cadastro").single()
      );
    }
  }

  const currentEquipment = execute
    ? await fetchAll("equipamentos", "id,numero_cadastro,empresa_id,tipo_texto,ativo", "numero_cadastro")
    : equipamentos;
  const currentEquipmentByNumber = new Map(
    currentEquipment.map((item) => [String(item.numero_cadastro), item])
  );
  if (!execute) {
    for (const payload of equipmentCreates) {
      currentEquipmentByNumber.set(String(payload.numero_cadastro), {
        ...payload,
        id: `dry-run-equipment-${payload.numero_cadastro}`,
      });
    }
  }

  const osCreates = [];
  const osUpdates = [];
  const osPending = [];
  const typeNamesCreated = new Set();
  const stateNamesCreated = new Set();

  for (const row of sourceOs) {
    const arkmedsId = Number(row.id);
    const numero = clean(row.numero);
    if (!arkmedsId || !numero) continue;
    const existing = osByArkmedsId.get(arkmedsId);
    const detail = osDetailsResult.detailsById.get(arkmedsId);
    const empresa = empresasByNumero.get(String(row.solicitante));
    const equipamentoNumero = Number(row.equipamento) || null;
    const equipamento = equipamentoNumero
      ? currentEquipmentByNumber.get(String(equipamentoNumero))
      : null;

    if (!empresa) {
      osPending.push({ arkmeds_os_id: arkmedsId, numero, motivo: "empresa_nao_encontrada" });
      continue;
    }
    if (equipamentoNumero && !equipamento) {
      osPending.push({
        arkmeds_os_id: arkmedsId,
        numero,
        motivo: "equipamento_nao_encontrado",
        equipamento_arkmeds_id: equipamentoNumero,
      });
      continue;
    }

    const tipoNome = clean(row.get_tipo_servico) || "Manuten\u00e7\u00e3o Corretiva";
    const estadoNome = clean(row.estado_str) || "Aberta";
    const tipoId = await ensureReference({
      table: "tipos_os",
      name: tipoNome,
      map: tiposOsByName,
      payload: {
        organizacao_id: organizacaoId,
        nome: tipoNome,
        descricao: "Criado automaticamente pela sincronizacao ArkMeds.",
        ativo: true,
      },
    });
    if (!tiposOsByName.has(normalize(tipoNome))) typeNamesCreated.add(tipoNome);

    const estadoStatus = statusSistemaOs(estadoNome);
    const estadoId = await ensureReference({
      table: "estados_os",
      name: estadoNome,
      map: estadosOsByName,
      payload: {
        organizacao_id: organizacaoId,
        nome: estadoNome,
        ordem: estadoStatus === "aberta" ? 30 : 90,
        finaliza_os: estadoStatus === "fechada",
        cancela_os: estadoStatus === "cancelada",
        ativo: true,
      },
    });
    if (!estadosOsByName.has(normalize(estadoNome))) stateNamesCreated.add(estadoNome);

    const tecnico = usersByName.get(normalize(row.responsavel_str));
    const dataAbertura = parseDateTimeBr(row.data_criacao_str) || new Date().toISOString();
    const payload = {
      organizacao_id: organizacaoId,
      arkmeds_os_id: arkmedsId,
      numero,
      empresa_id: empresa.id,
      equipamento_id: equipamento?.id || null,
      tipo_os_id: tipoId,
      estado_os_id: estadoId,
      tecnico_responsavel_id: tecnico?.id || null,
      solicitante_texto: clean(row.get_solicitante) || null,
      responsavel_texto: clean(row.responsavel_str) || null,
      data_abertura: dataAbertura,
      data_fechamento: parseDateTimeBr(row.data_conclusao_str),
      problema_relatado:
        clean(existing?.problema_relatado)
        || clean(detail?.problema_relatado)
        || clean(row.problema_str)
        || null,
      origem_problema:
        clean(existing?.origem_problema)
        || clean(detail?.origem_problema)
        || null,
      descricao_servico:
        clean(existing?.descricao_servico)
        || clean(detail?.descricao_servico)
        || null,
      observacoes: [
        clean(row.observacoes),
        clean(row.observacoes_adm),
        `Sincronizado do ArkMeds. ID ArkMeds: ${arkmedsId}.`,
      ].filter(Boolean).join("\n"),
      prioridade: prioridadeOs(row.get_prioridade),
      status_sistema: estadoStatus,
      ativo: true,
      oculta_operacao: false,
      updated_at: new Date().toISOString(),
    };

    if (existing) osUpdates.push({ id: existing.id, payload });
    else osCreates.push(payload);
  }

  if (execute) {
    for (const payload of osCreates) {
      await must(
        `Criar OS ArkMeds ${payload.numero}`,
        supabase.from("ordens_servico").insert(payload).select("id,numero").single()
      );
    }
    for (const item of osUpdates) {
      await must(
        `Atualizar OS ArkMeds ${item.payload.numero}`,
        supabase.from("ordens_servico").update(item.payload).eq("id", item.id).select("id").single()
      );
    }
  }

  const sequence = await setSequenceToImportedMax();
  const report = {
    gerado_em: new Date().toISOString(),
    modo: execute ? "execute" : "dry-run",
    limite: limit,
    arkmeds: {
      total_disponivel: arkmedsResult.recordsTotal,
      consultadas: sourceOs.length,
      maior_numero: Math.max(...sourceOs.map((item) => Number(item.numero) || 0), 0),
    },
    detalhes_os: {
      lidos: osDetailsResult.detailsById.size,
      rede: osDetailsResult.fetched,
      cache: osDetailsResult.cached,
      erros: osDetailsResult.errors,
    },
    equipamentos: {
      necessarios: missingEquipmentIds.length,
      criar: equipmentCreates.length,
      pendentes: equipmentPending,
    },
    ordens_servico: {
      criar: osCreates.length,
      atualizar: osUpdates.length,
      pendentes: osPending,
      exemplos_criar: osCreates.slice(0, 20).map((item) => ({
        arkmeds_os_id: item.arkmeds_os_id,
        numero: item.numero,
        solicitante: item.solicitante_texto,
      })),
    },
    referencias: {
      tipos_os_criar: [...typeNamesCreated],
      estados_os_criar: [...stateNamesCreated],
    },
    sequence_os: sequence,
  };

  const suffix = execute ? "execute" : "dry_run";
  await fs.writeFile(
    path.join(outputDir, `sincronizacao_os_${suffix}.json`),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

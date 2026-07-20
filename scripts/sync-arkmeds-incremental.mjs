import { createClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import fs from "node:fs/promises";
import path from "node:path";
import { loadArkmedsOsDetails } from "./lib/arkmeds-os-details.mjs";

const root = process.cwd();
const outputs = path.join(root, "outputs");
const detailsCacheDir = path.join(outputs, "sincronizacao-os", "detalhes-cache");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const baseUrl = "https://aci.arkmeds.com";
const execute = process.argv.includes("--execute");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number.parseInt(limitArg?.split("=")[1] || "50", 10) || 50;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ufPorNome = new Map([
  ["acre", "AC"], ["alagoas", "AL"], ["amapa", "AP"], ["amazonas", "AM"],
  ["bahia", "BA"], ["ceara", "CE"], ["distrito federal", "DF"], ["espirito santo", "ES"],
  ["goias", "GO"], ["maranhao", "MA"], ["mato grosso", "MT"], ["mato grosso do sul", "MS"],
  ["minas gerais", "MG"], ["para", "PA"], ["paraiba", "PB"], ["parana", "PR"],
  ["pernambuco", "PE"], ["piaui", "PI"], ["rio de janeiro", "RJ"], ["rio grande do norte", "RN"],
  ["rio grande do sul", "RS"], ["rondonia", "RO"], ["roraima", "RR"], ["santa catarina", "SC"],
  ["sao paulo", "SP"], ["sergipe", "SE"], ["tocantins", "TO"],
]);

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

const clean = (value) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return !text || text === "-" || text.toLocaleLowerCase("pt-BR") === "nan" ? "" : text;
};

const parseIntSafe = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
};

const parseDateTimeBr = (value) => {
  const text = clean(value);
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`;
};

const estadoUf = (estado) => {
  const key = normalize(estado);
  if (!key) return null;
  return ufPorNome.get(key) || estado;
};

const statusEquipamento = (estado) => {
  const key = normalize(estado);
  if (key.includes("manutencao")) return "Em manutenção";
  if (key.includes("desativ")) return "Desativado";
  if (key.includes("locad")) return "Locado";
  return "Ativo";
};

const statusSistemaOs = (estado) => {
  const key = normalize(estado);
  if (key.includes("cancel")) return "cancelada";
  if (key.includes("fechad") || key.includes("servico finalizado") || key.includes("finalizado")) return "fechada";
  return "aberta";
};

const prioridadeOs = (value) => {
  const key = normalize(value);
  if (key.includes("muito")) return "urgente";
  if (key.includes("urgente")) return "alta";
  if (key.includes("pouco") || key.includes("nao urgente")) return "baixa";
  return "normal";
};

async function cookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  return state.cookies
    .filter((item) => item.domain.includes("aci.arkmeds.com"))
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function fetchArkmeds(pathname, init = {}) {
  const cookie = await cookieHeader();
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      cookie,
      "x-requested-with": "XMLHttpRequest",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (/usuarios\/conectar|name="username"/i.test(text)) {
    throw new Error("Sessao ArkMeds expirada. Abra/renove o login antes de sincronizar.");
  }
  return { response, text };
}

function tableRowsFromHtml(html) {
  const dom = new JSDOM(html);
  const table = dom.window.document.querySelector("table.table");
  if (!table) return [];
  const headers = [...table.querySelectorAll("thead th")].map((th) => clean(th.textContent));
  return [...table.querySelectorAll("tbody tr")].map((tr) => {
    const cells = [...tr.querySelectorAll("td")];
    const record = {};
    cells.forEach((td, index) => {
      const header = headers[index] || `col_${index}`;
      record[header] = clean(td.textContent);
    });
    const viewHref = tr.querySelector('a[href^="visual/"]')?.getAttribute("href") || "";
    const matchId = viewHref.match(/visual\/(\d+)/);
    if (matchId) record.__id = Number.parseInt(matchId[1], 10);
    return record;
  }).filter((row) => row.__id || row["#"]);
}

async function fetchPagedTable(pathname, total) {
  const rows = [];
  for (let page = 1; rows.length < total; page += 1) {
    const { text } = await fetchArkmeds(`${pathname}?page=${page}`);
    const pageRows = tableRowsFromHtml(text);
    if (!pageRows.length) break;
    rows.push(...pageRows);
  }
  return rows.slice(0, total);
}

async function fetchLatestOs(total) {
  const capture = JSON.parse(await fs.readFile(path.join(outputs, "arkmeds_os_list_request_capture.json"), "utf-8"))[0];
  const params = new URLSearchParams(capture.postData);
  params.set("start", "0");
  params.set("length", String(total));
  params.set("order[0][column]", "4");
  params.set("order[0][dir]", "desc");
  const cookie = await cookieHeader();
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
  const csrf = state.cookies.find((item) => item.name === "csrftoken" && item.domain.includes("aci.arkmeds.com"))?.value || "";
  const response = await fetch(`${baseUrl}/ordem_servico/apis/ordem_servico_list/`, {
    method: "POST",
    headers: {
      cookie,
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

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function getOrganizacaoId() {
  const org = await must("Buscar organizacao", supabase.from("organizacoes").select("id").limit(1).single());
  return org.id;
}

async function fetchAll(table, select, orderBy = "numero_cadastro") {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const data = await must(`Buscar ${table}`, query);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function ensureTipoEquipamento(organizacaoId, nome, tiposByNorm, criados) {
  const tipoNome = clean(nome) || "Equipamento";
  const key = normalize(tipoNome);
  const existing = tiposByNorm.get(key);
  if (existing) return existing.id;
  if (!execute) {
    criados.push(tipoNome);
    return null;
  }
  const data = await must(
    "Criar tipo equipamento",
    supabase
      .from("tipos_equipamento")
      .insert({ organizacao_id: organizacaoId, nome: tipoNome, descricao: "Criado automaticamente pela sincronizacao ArkMeds.", ativo: true })
      .select("id,nome")
      .single()
  );
  tiposByNorm.set(key, data);
  criados.push(tipoNome);
  return data.id;
}

async function ensureTipoOs(organizacaoId, nome, tiposByNorm, criados) {
  const tipoNome = clean(nome) || "Manutenção Corretiva";
  const key = normalize(tipoNome);
  const existing = tiposByNorm.get(key);
  if (existing) return existing.id;
  if (!execute) {
    criados.push(tipoNome);
    return null;
  }
  const data = await must(
    "Criar tipo OS",
    supabase
      .from("tipos_os")
      .insert({ organizacao_id: organizacaoId, nome: tipoNome, descricao: "Criado automaticamente pela sincronizacao ArkMeds.", ativo: true })
      .select("id,nome")
      .single()
  );
  tiposByNorm.set(key, data);
  criados.push(tipoNome);
  return data.id;
}

async function ensureEstadoOs(organizacaoId, nome, estadosByNorm, criados) {
  const estadoNome = clean(nome) || "Aberta";
  const key = normalize(estadoNome);
  const existing = estadosByNorm.get(key);
  if (existing) return existing.id;
  if (!execute) {
    criados.push(estadoNome);
    return null;
  }
  const finaliza = statusSistemaOs(estadoNome) === "fechada";
  const cancela = statusSistemaOs(estadoNome) === "cancelada";
  const data = await must(
    "Criar estado OS",
    supabase
      .from("estados_os")
      .insert({ organizacao_id: organizacaoId, nome: estadoNome, ordem: finaliza || cancela ? 90 : 30, finaliza_os: finaliza, cancela_os: cancela, ativo: true })
      .select("id,nome,finaliza_os,cancela_os")
      .single()
  );
  estadosByNorm.set(key, data);
  criados.push(estadoNome);
  return data.id;
}

function empresaPayload(organizacaoId, row) {
  const numeroCadastro = Number(row.__id || row["#"]);
  return {
    organizacao_id: organizacaoId,
    numero_cadastro: numeroCadastro,
    nome: clean(row.Nome) || `Cliente ArkMeds ${numeroCadastro}`,
    nome_fantasia: clean(row["Nome Fantasia"]) || null,
    tipo_cliente: null,
    tipo_relacao: "cliente",
    cpf_cnpj: clean(row["CNPJ / CPF"]) || null,
    cidade: clean(row.Cidade) || null,
    estado: estadoUf(row.Estado),
    contato: clean(row.Contato) || null,
    email: clean(row.Email) || null,
    ativo: true,
    observacoes: "Sincronizado do ArkMeds.",
    updated_at: new Date().toISOString(),
  };
}

async function syncEmpresas(organizacaoId, arkRows, empresasByNumero) {
  const criar = [];
  const atualizar = [];
  for (const row of arkRows) {
    const payload = empresaPayload(organizacaoId, row);
    if (empresasByNumero.has(String(payload.numero_cadastro))) atualizar.push(payload);
    else criar.push(payload);
  }
  if (execute) {
    for (const payload of [...criar, ...atualizar]) {
      await must(
        "Upsert empresa",
        supabase.from("empresas").upsert(payload, { onConflict: "organizacao_id,numero_cadastro" }).select("id,numero_cadastro").single()
      );
    }
  }
  return { criar: criar.length, atualizar: atualizar.length, exemplos_criar: criar.slice(0, 10).map((item) => `${item.numero_cadastro} - ${item.nome}`) };
}

async function syncEquipamentos(organizacaoId, arkRows, context) {
  const criar = [];
  const atualizar = [];
  const pendentes = [];
  const tiposCriar = [];

  for (const row of arkRows) {
    const numeroCadastro = Number(row.__id || row["#"]);
    const empresaMatches = context.empresasByNome.get(normalize(row["Proprietário"])) || [];
    if (empresaMatches.length !== 1) {
      pendentes.push({
        numero_cadastro: numeroCadastro,
        motivo: empresaMatches.length ? "proprietario_ambiguo" : "proprietario_nao_encontrado",
        proprietario: clean(row["Proprietário"]),
      });
      continue;
    }
    const tipoEquipamentoId = await ensureTipoEquipamento(organizacaoId, row.Tipo, context.tiposEquipamentoByNorm, tiposCriar);
    const payload = {
      organizacao_id: organizacaoId,
      numero_cadastro: numeroCadastro,
      empresa_id: empresaMatches[0].id,
      tipo_equipamento_id: tipoEquipamentoId,
      tipo_texto: clean(row.Tipo) || null,
      fabricante: clean(row.Fabricante) || null,
      modelo: clean(row.Modelo) || null,
      numero_serie: clean(row["Nº de Série"]) || null,
      patrimonio: clean(row["Patrimônio"]) || null,
      tag: clean(row["Identificação"]) || null,
      setor: clean(row["Identificação"]).replace(/^Setor:\s*/i, "") || null,
      status: statusEquipamento(row.Estado),
      ativo: statusEquipamento(row.Estado) !== "Desativado",
      observacoes: "Sincronizado do ArkMeds.",
      updated_at: new Date().toISOString(),
    };
    if (context.equipamentosByNumero.has(String(numeroCadastro))) atualizar.push(payload);
    else criar.push(payload);
  }

  if (execute) {
    for (const payload of [...criar, ...atualizar]) {
      await must(
        "Upsert equipamento",
        supabase.from("equipamentos").upsert(payload, { onConflict: "organizacao_id,numero_cadastro" }).select("id,numero_cadastro").single()
      );
    }
  }
  return {
    criar: criar.length,
    atualizar: atualizar.length,
    pendentes,
    tipos_criar: [...new Set(tiposCriar)],
    exemplos_criar: criar.slice(0, 10).map((item) => `${item.numero_cadastro} - ${item.tipo_texto} - ${item.modelo || ""}`.trim()),
  };
}

async function renumerarLocaisSeNecessario(arkOsRows) {
  const arkNumeros = arkOsRows.map((item) => parseIntSafe(item.numero)).filter(Boolean);
  const arkMax = Math.max(...arkNumeros, 0);
  const localRows = await must(
    "Buscar OS locais",
    supabase
      .from("ordens_servico")
      .select("id,numero,numero_ordem,arkmeds_os_id,created_at")
      .is("arkmeds_os_id", null)
      .not("numero_ordem", "is", null)
      .lte("numero_ordem", arkMax)
      .order("numero_ordem", { ascending: true })
  );
  const remap = [];
  if (localRows.length) {
    const maxDbRow = await must(
      "Buscar max numero OS",
      supabase
        .from("ordens_servico")
        .select("numero_ordem")
        .not("numero_ordem", "is", null)
        .order("numero_ordem", { ascending: false })
        .limit(1)
    );
    let next = Math.max(arkMax, Number(maxDbRow?.[0]?.numero_ordem || 0)) + 1;
    for (const row of localRows) remap.push({ id: row.id, numero_anterior: row.numero, numero_novo: String(next++) });
  }
  if (execute) {
    for (const item of remap) {
      await must(
        "Renumerar OS local",
        supabase.from("ordens_servico").update({ numero: item.numero_novo, updated_at: new Date().toISOString() }).eq("id", item.id).select("id").single()
      );
    }
  }
  return { arkMax, total: remap.length, remap };
}

async function syncOs(organizacaoId, arkOsRows, context) {
  const tiposCriar = [];
  const estadosCriar = [];
  const pendentes = [];
  const criar = [];
  const atualizar = [];

  for (const row of arkOsRows) {
    const arkmedsId = Number(row.id);
    const numero = clean(row.numero);
    if (!arkmedsId || !numero) continue;
    const existing = context.osByArkmedsId.get(arkmedsId);
    const detail = context.osDetailsByArkmedsId.get(arkmedsId);
    const empresa = context.empresasByNumero.get(String(row.solicitante));
    const equipamento = row.equipamento ? context.equipamentosByNumero.get(String(row.equipamento)) : null;
    if (!empresa) {
      pendentes.push({ arkmeds_os_id: arkmedsId, numero, motivo: "empresa_nao_encontrada", solicitante: row.get_solicitante, solicitante_id: row.solicitante });
      continue;
    }
    const tipoOsId = await ensureTipoOs(organizacaoId, row.get_tipo_servico, context.tiposOsByNorm, tiposCriar);
    const estadoOsId = await ensureEstadoOs(organizacaoId, row.estado_str, context.estadosOsByNorm, estadosCriar);
    const tecnico = context.usuariosByNome.get(normalize(row.responsavel_str));
    const payload = {
      organizacao_id: organizacaoId,
      arkmeds_os_id: arkmedsId,
      numero,
      empresa_id: empresa.id,
      equipamento_id: equipamento?.id || null,
      tipo_os_id: tipoOsId,
      estado_os_id: estadoOsId,
      tecnico_responsavel_id: tecnico?.id || null,
      solicitante_texto: clean(row.get_solicitante) || null,
      responsavel_texto: clean(row.responsavel_str) || null,
      data_abertura: parseDateTimeBr(row.data_criacao_str),
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
      observacoes: [clean(row.observacoes), clean(row.observacoes_adm), `Sincronizado do ArkMeds. ID ArkMeds: ${arkmedsId}.`].filter(Boolean).join("\n"),
      prioridade: prioridadeOs(row.get_prioridade),
      status_sistema: statusSistemaOs(row.estado_str),
      ativo: true,
      updated_at: new Date().toISOString(),
    };
    if (context.osByArkmedsId.has(arkmedsId)) atualizar.push(payload);
    else criar.push(payload);
  }

  if (execute) {
    for (const payload of criar) {
      await must(
        "Inserir OS ArkMeds",
        supabase.from("ordens_servico").insert(payload).select("id,numero").single()
      );
    }
    for (const payload of atualizar) {
      const existentePorArkmeds = context.osByArkmedsId.get(Number(payload.arkmeds_os_id));
      if (!existentePorArkmeds?.id) continue;
      await must(
        "Atualizar OS ArkMeds",
        supabase.from("ordens_servico").update(payload).eq("id", existentePorArkmeds.id).select("id,numero").single()
      );
    }
  }
  return {
    criar: criar.length,
    atualizar: atualizar.length,
    pendentes,
    tipos_criar: [...new Set(tiposCriar)],
    estados_criar: [...new Set(estadosCriar)],
    exemplos_criar: criar.slice(0, 10).map((item) => `${item.numero} - ${item.solicitante_texto}`),
  };
}

async function setSequenceAfterMax() {
  const rows = await must(
    "Buscar max OS",
    supabase.from("ordens_servico").select("numero_ordem").not("numero_ordem", "is", null).order("numero_ordem", { ascending: false }).limit(1)
  );
  const maxNumero = Number(rows?.[0]?.numero_ordem || 0);
  if (execute) {
    const { error } = await supabase.rpc("exec_sql", { sql: `select setval('public.ordens_servico_numero_seq', ${maxNumero}, true);` });
    if (error) {
      const dbUrl = process.env.SUPABASE_DB_URL;
      if (!dbUrl) throw new Error(`Nao foi possivel ajustar sequence via RPC e SUPABASE_DB_URL nao esta disponivel: ${error.message}`);
      const { Client } = await import("pg");
      const client = new Client({ connectionString: dbUrl });
      await client.connect();
      await client.query(`select setval('public.ordens_servico_numero_seq', $1, true);`, [maxNumero]);
      await client.end();
    }
  }
  return maxNumero;
}

function buildMaps(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function buildEmpresaNameMap(rows) {
  const map = new Map();
  const add = (key, row) => {
    const normalized = normalize(key);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, []);
    const list = map.get(normalized);
    if (!list.some((item) => item.id === row.id)) list.push(row);
  };

  for (const row of rows) {
    add(row.nome, row);
    add(row.nome_fantasia, row);
    if (row.nome && row.nome_fantasia) {
      add(`${row.nome_fantasia} - ${row.nome}`, row);
      add(`${row.nome} - ${row.nome_fantasia}`, row);
    }
  }

  return map;
}

async function main() {
  await fs.mkdir(outputs, { recursive: true });
  const organizacaoId = await getOrganizacaoId();

  const [arkEmpresas, arkEquipamentos, arkOsResult] = await Promise.all([
    fetchPagedTable("/cadastros/empresa/", limit),
    fetchPagedTable("/cadastros/equipamento/", limit),
    fetchLatestOs(limit),
  ]);
  const arkOs = arkOsResult.data || [];

  const [
    empresas,
    equipamentos,
    tiposEquipamento,
    tiposOs,
    estadosOs,
    usuarios,
    osRows,
  ] = await Promise.all([
    fetchAll("empresas", "id,numero_cadastro,nome,nome_fantasia,ativo", "numero_cadastro"),
    fetchAll("equipamentos", "id,numero_cadastro,empresa_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,status,ativo", "numero_cadastro"),
    fetchAll("tipos_equipamento", "id,nome,ativo", "nome"),
    fetchAll("tipos_os", "id,nome,ativo", "nome"),
    fetchAll("estados_os", "id,nome,finaliza_os,cancela_os,ativo", "nome"),
    fetchAll("usuarios", "id,nome,email,perfil,ativo", "nome"),
    fetchAll(
      "ordens_servico",
      "id,numero,numero_ordem,arkmeds_os_id,problema_relatado,origem_problema,descricao_servico",
      "numero_ordem"
    ),
  ]);

  const context = {
    empresasByNumero: new Map(empresas.map((item) => [String(item.numero_cadastro), item])),
    empresasByNome: buildEmpresaNameMap(empresas.filter((item) => item.ativo !== false)),
    equipamentosByNumero: new Map(equipamentos.map((item) => [String(item.numero_cadastro), item])),
    tiposEquipamentoByNorm: new Map(tiposEquipamento.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])),
    tiposOsByNorm: new Map(tiposOs.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])),
    estadosOsByNorm: new Map(estadosOs.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])),
    usuariosByNome: new Map(usuarios.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])),
    osByArkmedsId: new Map(osRows.filter((item) => item.arkmeds_os_id).map((item) => [Number(item.arkmeds_os_id), item])),
    osByNumero: new Map(osRows.map((item) => [String(item.numero), item])),
  };
  const osDetailsResult = await loadArkmedsOsDetails({
    ids: arkOs
      .filter((row) => {
        const existing = context.osByArkmedsId.get(Number(row.id));
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
  context.osDetailsByArkmedsId = osDetailsResult.detailsById;

  const empresasResumo = await syncEmpresas(organizacaoId, arkEmpresas, context.empresasByNumero);

  const empresasAtualizadas = execute
    ? await fetchAll("empresas", "id,numero_cadastro,nome,nome_fantasia,ativo", "numero_cadastro")
    : empresas;
  context.empresasByNumero = new Map(empresasAtualizadas.map((item) => [String(item.numero_cadastro), item]));
  context.empresasByNome = buildEmpresaNameMap(empresasAtualizadas.filter((item) => item.ativo !== false));

  const equipamentosResumo = await syncEquipamentos(organizacaoId, arkEquipamentos, context);

  const equipamentosAtualizados = execute
    ? await fetchAll("equipamentos", "id,numero_cadastro,empresa_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,status,ativo", "numero_cadastro")
    : equipamentos;
  context.equipamentosByNumero = new Map(equipamentosAtualizados.map((item) => [String(item.numero_cadastro), item]));

  const renumeracao = await renumerarLocaisSeNecessario(arkOs);
  if (execute && renumeracao.total > 0) {
    const osAtualizadas = await fetchAll(
      "ordens_servico",
      "id,numero,numero_ordem,arkmeds_os_id,problema_relatado,origem_problema,descricao_servico",
      "numero_ordem"
    );
    context.osByArkmedsId = new Map(osAtualizadas.filter((item) => item.arkmeds_os_id).map((item) => [Number(item.arkmeds_os_id), item]));
    context.osByNumero = new Map(osAtualizadas.map((item) => [String(item.numero), item]));
  }
  const osResumo = await syncOs(organizacaoId, arkOs, context);
  const sequenceAfter = await setSequenceAfterMax();

  const resumo = {
    modo: execute ? "execute" : "dry-run",
    limite: limit,
    arkmeds: {
      empresas: arkEmpresas.length,
      equipamentos: arkEquipamentos.length,
      os: arkOs.length,
      os_max_numero: renumeracao.arkMax,
    },
    empresas: empresasResumo,
    equipamentos: equipamentosResumo,
    os: osResumo,
    detalhes_os: {
      lidos: osDetailsResult.detailsById.size,
      rede: osDetailsResult.fetched,
      cache: osDetailsResult.cached,
      erros: osDetailsResult.errors,
    },
    renumeracao_os_locais: {
      total: renumeracao.total,
      exemplos: renumeracao.remap.slice(0, 20),
    },
    sequence_os_apos_sync: sequenceAfter,
  };

  const suffix = execute ? "execute" : "dry_run";
  await fs.writeFile(path.join(outputs, `arkmeds_incremental_sync_${suffix}.json`), JSON.stringify(resumo, null, 2), "utf-8");
  await fs.writeFile(path.join(outputs, `arkmeds_incremental_sync_${suffix}_empresas.json`), JSON.stringify(arkEmpresas, null, 2), "utf-8");
  await fs.writeFile(path.join(outputs, `arkmeds_incremental_sync_${suffix}_equipamentos.json`), JSON.stringify(arkEquipamentos, null, 2), "utf-8");
  await fs.writeFile(path.join(outputs, `arkmeds_incremental_sync_${suffix}_os.json`), JSON.stringify(arkOs, null, 2), "utf-8");
  console.log(JSON.stringify(resumo, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

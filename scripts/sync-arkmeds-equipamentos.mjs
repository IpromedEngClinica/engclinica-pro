import { createClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "outputs", "sincronizacao-equipamentos");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const baseUrl = "https://aci.arkmeds.com";
const execute = process.argv.includes("--execute");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number.parseInt(limitArg?.split("=")[1] || "500", 10) || 500;
const pageSize = 25;

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
  if (!/[ÃƒÃ‚]/.test(text)) return text;
  const fixed = Buffer.from(text, "latin1").toString("utf8");
  return fixed.includes("ï¿½") ? text : fixed;
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

const field = (row, names) => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return clean(row[name]);
  }
  return "";
};

const sourceStatus = (value) => {
  const key = normalize(value);
  if (key.includes("manutencao")) return "Em manutenção";
  if (key.includes("desativ")) return "Desativado";
  if (key.includes("locad")) return "Locado";
  return "Ativo";
};

const sameValue = (left, right) => (left ?? null) === (right ?? null);

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

async function fetchRecentEquipment() {
  const rows = [];
  const maxPages = Math.ceil(limit / pageSize);

  for (let firstPage = 1; firstPage <= maxPages; firstPage += 4) {
    const pages = Array.from(
      { length: Math.min(4, maxPages - firstPage + 1) },
      (_, index) => firstPage + index
    );
    const htmlPages = await Promise.all(
      pages.map((page) => fetchArkmeds(`/cadastros/equipamento/?page=${page}`))
    );
    const batchRows = htmlPages.flatMap(tableRowsFromHtml);
    if (!batchRows.length) break;
    rows.push(...batchRows);
  }

  return rows.slice(0, limit);
}

function addCompanyIndex(index, value, company) {
  const key = normalize(value);
  if (!key) return;
  if (!index.has(key)) index.set(key, new Map());
  index.get(key).set(company.id, company);
}

function resolveCompany(ownerName, companyNameIndex, companyFantasyIndex) {
  const key = normalize(ownerName);
  const byName = [...(companyNameIndex.get(key)?.values() || [])];
  if (byName.length === 1) return { company: byName[0], matchedBy: "razao_social" };
  if (byName.length > 1) return { candidates: byName, matchedBy: "razao_social_ambigua" };

  const byFantasy = [...(companyFantasyIndex.get(key)?.values() || [])];
  if (byFantasy.length === 1) return { company: byFantasy[0], matchedBy: "nome_fantasia" };
  return {
    candidates: byFantasy,
    matchedBy: byFantasy.length > 1 ? "nome_fantasia_ambiguo" : "nao_encontrado",
  };
}

function buildSectorIndex(sectors) {
  const index = new Map();
  for (const sector of sectors.filter((item) => item.ativo !== false)) {
    const key = `${sector.empresa_id}:${normalize(sector.nome)}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(sector);
  }
  return index;
}

function explicitSector(identification) {
  const match = clean(identification).match(/^Setor:\s*(.+)$/i);
  return match ? clean(match[1]) : "";
}

function pickOfficialSector(sectorIndex, companyId, sectorName) {
  if (!sectorName) return null;
  const matches = sectorIndex.get(`${companyId}:${normalize(sectorName)}`) || [];
  return matches.length === 1 ? matches[0] : null;
}

async function ensureEquipmentType({ organizationId, name, typeIndex }) {
  const key = normalize(name);
  if (typeIndex.has(key)) return typeIndex.get(key);
  if (!execute) return null;
  const created = await must(
    `Criar tipo de equipamento ${name}`,
    supabase
      .from("tipos_equipamento")
      .insert({
        organizacao_id: organizationId,
        nome: name,
        descricao: "Criado automaticamente pela sincronizacao ArkMeds.",
        ativo: true,
      })
      .select("id,nome")
      .single()
  );
  typeIndex.set(key, created);
  return created;
}

function buildDesiredPayload({ row, existing, company, typeId, sectorIndex, organizationId }) {
  const identification = field(row, ["Identificação", "Identificacao"]);
  const sectorName = explicitSector(identification);
  const officialSector = pickOfficialSector(sectorIndex, company.id, sectorName);
  const companyChanged = existing && existing.empresa_id !== company.id;
  const preserveOfficialSector = existing?.empresa_setor_id && !companyChanged;
  const status = sourceStatus(field(row, ["Estado"]));
  const payload = {
    organizacao_id: organizationId,
    empresa_id: company.id,
    tipo_equipamento_id: typeId || existing?.tipo_equipamento_id || null,
    tipo_texto: field(row, ["Tipo"]) || "Equipamento",
    fabricante: field(row, ["Fabricante"]) || null,
    modelo: field(row, ["Modelo"]) || null,
    numero_serie:
      field(row, ["Nº de Série", "N° de Série", "Numero de Serie"]) || null,
    patrimonio: field(row, ["Patrimônio", "Patrimonio"]) || null,
    ativo: status !== "Desativado",
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    payload.numero_cadastro = row.__id;
    payload.tag = sectorName ? null : identification || null;
    payload.setor = officialSector?.nome || sectorName || null;
    payload.empresa_setor_id = officialSector?.id || null;
    payload.status = status;
    payload.observacoes = "Sincronizado do ArkMeds.";
    return payload;
  }

  if (status === "Desativado") payload.status = status;
  if (!preserveOfficialSector && sectorName) {
    payload.setor = officialSector?.nome || sectorName;
    payload.empresa_setor_id = officialSector?.id || null;
  } else if (companyChanged) {
    payload.setor = null;
    payload.empresa_setor_id = null;
  }

  if (sectorName) {
    if (/^Setor:/i.test(existing.tag || "") || normalize(existing.tag) === normalize(identification)) {
      payload.tag = null;
    }
  } else if (identification) {
    payload.tag = identification;
  }

  return payload;
}

function changedFields(existing, payload) {
  const ignored = new Set(["updated_at", "organizacao_id", "numero_cadastro"]);
  return Object.entries(payload)
    .filter(([key, value]) => !ignored.has(key) && !sameValue(existing[key], value))
    .map(([key, value]) => ({ campo: key, anterior: existing[key] ?? null, novo: value ?? null }));
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const [organizations, companies, equipment, types, sectors] = await Promise.all([
    fetchAll("organizacoes", "id"),
    fetchAll("empresas", "id,numero_cadastro,nome,nome_fantasia,ativo", "numero_cadastro"),
    fetchAll(
      "equipamentos",
      "id,numero_cadastro,empresa_id,tipo_equipamento_id,tipo_texto,fabricante,modelo,numero_serie,patrimonio,tag,setor,empresa_setor_id,local_instalacao,status,ativo,observacoes",
      "numero_cadastro"
    ),
    fetchAll("tipos_equipamento", "id,nome,ativo", "nome"),
    fetchAll("empresa_setores", "id,empresa_id,nome,ativo", "nome"),
  ]);

  const organizationId = organizations[0]?.id;
  if (!organizationId) throw new Error("Organizacao nao encontrada.");

  const equipmentByNumber = new Map(
    equipment.map((item) => [String(item.numero_cadastro), item])
  );
  const sourceRows = await fetchRecentEquipment();
  const companyNameIndex = new Map();
  const companyFantasyIndex = new Map();
  const companyById = new Map(companies.map((item) => [item.id, item]));
  for (const company of companies.filter((item) => item.ativo !== false)) {
    addCompanyIndex(companyNameIndex, company.nome, company);
    addCompanyIndex(companyFantasyIndex, company.nome_fantasia, company);
    if (clean(company.nome) && clean(company.nome_fantasia)) {
      addCompanyIndex(
        companyNameIndex,
        `${company.nome_fantasia} - ${company.nome}`,
        company
      );
      addCompanyIndex(
        companyNameIndex,
        `${company.nome} - ${company.nome_fantasia}`,
        company
      );
    }
  }
  const typeIndex = new Map(
    types.filter((item) => item.ativo !== false).map((item) => [normalize(item.nome), item])
  );
  const sectorIndex = buildSectorIndex(sectors);

  const creates = [];
  const updates = [];
  const unchanged = [];
  const pending = [];
  const typeNamesToCreate = new Set();

  for (const row of sourceRows) {
    const ownerName = field(row, ["Proprietário", "Proprietario"]);
    const resolution = resolveCompany(ownerName, companyNameIndex, companyFantasyIndex);
    if (!resolution.company) {
      pending.push({
        arkmeds_equipamento_id: row.__id,
        proprietario: ownerName,
        motivo: resolution.matchedBy,
        candidatos: (resolution.candidates || []).map((item) => ({
          numero_cadastro: item.numero_cadastro,
          nome: item.nome,
        })),
      });
      continue;
    }

    const typeName = field(row, ["Tipo"]) || "Equipamento";
    const typeKey = normalize(typeName);
    if (!typeIndex.has(typeKey)) typeNamesToCreate.add(typeName);
    const type = await ensureEquipmentType({
      organizationId,
      name: typeName,
      typeIndex,
    });
    const existing = equipmentByNumber.get(String(row.__id));
    const payload = buildDesiredPayload({
      row,
      existing,
      company: resolution.company,
      typeId: type?.id || null,
      sectorIndex,
      organizationId,
    });

    if (!existing) {
      creates.push({
        payload,
        origem: {
          proprietario: ownerName,
          correspondencia_cliente: resolution.matchedBy,
          identificacao: field(row, ["Identificação", "Identificacao"]),
        },
      });
      continue;
    }

    const changes = changedFields(existing, payload);
    if (changes.length) {
      updates.push({
        id: existing.id,
        numero_cadastro: existing.numero_cadastro,
        payload,
        alteracoes: changes,
        proprietario_origem: ownerName,
        cliente_anterior: companyById.get(existing.empresa_id)?.nome || null,
        cliente_novo: resolution.company.nome,
      });
    } else {
      unchanged.push(existing.numero_cadastro);
    }
  }

  if (execute) {
    for (const item of creates) {
      await must(
        `Criar equipamento ArkMeds ${item.payload.numero_cadastro}`,
        supabase.from("equipamentos").insert(item.payload).select("id").single()
      );
    }
    for (const item of updates) {
      await must(
        `Atualizar equipamento ArkMeds ${item.numero_cadastro}`,
        supabase.from("equipamentos").update(item.payload).eq("id", item.id).select("id").single()
      );
    }
  }

  const report = {
    gerado_em: new Date().toISOString(),
    modo: execute ? "execute" : "dry-run",
    limite_configurado: limit,
    arkmeds: {
      consultados: sourceRows.length,
      maior_id: Math.max(...sourceRows.map((item) => item.__id), 0),
      menor_id: Math.min(...sourceRows.map((item) => item.__id), Number.MAX_SAFE_INTEGER),
    },
    equipamentos: {
      criar: creates.length,
      atualizar: updates.length,
      sem_alteracao: unchanged.length,
      pendentes: pending.length,
      exemplos_criar: creates.slice(0, 30).map((item) => ({
        numero_cadastro: item.payload.numero_cadastro,
        tipo: item.payload.tipo_texto,
        proprietario: item.origem.proprietario,
        setor: item.payload.setor,
      })),
      exemplos_atualizar: updates.slice(0, 30).map((item) => ({
        numero_cadastro: item.numero_cadastro,
        alteracoes: item.alteracoes,
      })),
      resumo_campos_atualizar: Object.entries(
        updates
          .flatMap((item) => item.alteracoes)
          .reduce((acc, item) => {
            acc[item.campo] = (acc[item.campo] || 0) + 1;
            return acc;
          }, {})
      )
        .map(([campo, quantidade]) => ({ campo, quantidade }))
        .sort((left, right) => right.quantidade - left.quantidade),
      alteracoes_proprietario: updates
        .filter((item) => item.alteracoes.some((change) => change.campo === "empresa_id"))
        .map((item) => ({
          numero_cadastro: item.numero_cadastro,
          proprietario_arkmeds: item.proprietario_origem,
          cliente_anterior: item.cliente_anterior,
          cliente_novo: item.cliente_novo,
        })),
      pendencias: pending,
    },
    referencias: {
      tipos_equipamento_criar: [...typeNamesToCreate],
    },
  };

  const suffix = execute ? "execute" : "dry_run";
  await fs.writeFile(
    path.join(outputDir, `sincronizacao_equipamentos_${suffix}.json`),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

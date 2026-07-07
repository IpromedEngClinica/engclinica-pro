import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outputsDir = path.join(root, "outputs");
const statePath = path.join(root, "tmp", "arkmeds-state.json");
const pendingLedgerPath = path.join(outputsDir, "arkmeds_checklists_preventiva_pendentes.json");

const execute = process.argv.includes("--execute");
const retryPending = process.argv.includes("--retry-pending");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
const offset = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(1, Math.min(8, Number(concurrencyArg?.split("=")[1] || 3)));
const requestTimeoutMsArg = process.argv.find((arg) => arg.startsWith("--request-timeout-ms="));
const requestTimeoutMs = Math.max(5000, Number(requestTimeoutMsArg?.split("=")[1] || 15000));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const baseUrl = "https://aci.arkmeds.com";
const batchSize = 500;

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

const fixMojibake = (value) => {
  const text = String(value || "");
  if (!/[ÃÂ]/.test(text)) return text;
  const fixed = Buffer.from(text, "latin1").toString("utf8");
  return fixed.includes("�") ? text : fixed;
};

const stripHtmlEntities = (value) =>
  fixMojibake(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const toCsvValue = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const body = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(";")),
  ].join("\n");
  await fs.writeFile(filePath, body, "utf8");
};

async function readPendingLedger() {
  try {
    const content = await fs.readFile(pendingLedgerPath, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writePendingLedger(previousRows, currentRows) {
  const byArkmedsOsId = new Map();
  for (const row of previousRows) {
    if (row?.arkmeds_os_id) byArkmedsOsId.set(String(row.arkmeds_os_id), row);
  }
  for (const row of currentRows) {
    if (!row?.arkmeds_os_id) continue;
    byArkmedsOsId.set(String(row.arkmeds_os_id), {
      arkmeds_os_id: row.arkmeds_os_id,
      os_id: row.os_id || null,
      os_numero: row.os_numero || null,
      equipamento: row.equipamento || null,
      cliente: row.cliente || null,
      pendencia: row.pendencia || "Pendente sem detalhe.",
      atualizado_em: new Date().toISOString(),
    });
  }
  const rows = Array.from(byArkmedsOsId.values()).sort(
    (a, b) => Number(a.os_numero || 0) - Number(b.os_numero || 0)
  );
  await fs.writeFile(pendingLedgerPath, JSON.stringify(rows, null, 2), "utf8");
  return rows;
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function fetchAll(table, columns, buildQuery) {
  const rows = [];
  for (let from = 0; ; from += batchSize) {
    let query = supabase.from(table).select(columns).range(from, from + batchSize - 1);
    query = buildQuery ? buildQuery(query) : query;
    const data = await must(`Buscar ${table}`, query);
    rows.push(...data);
    if (data.length < batchSize) break;
  }
  return rows;
}

async function readArkmedsCookieHeader() {
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  const cookies = (state.cookies || []).filter((cookie) =>
    String(cookie.domain || "").includes("aci.arkmeds.com")
  );
  if (!cookies.length) {
    throw new Error(
      "Sessao ArkMeds nao encontrada em tmp/arkmeds-state.json. Renove o login antes de importar."
    );
  }
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function fetchArkmedsText(cookieHeader, route, accept = "text/html") {
  let timeout;
  const controller = new AbortController();
  const request = (async () => {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: {
        Accept: accept,
        Cookie: cookieHeader,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      text,
    };
  })();

  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout ArkMeds ${requestTimeoutMs}ms em ${route}`));
    }, requestTimeoutMs);
  });

  try {
    return await Promise.race([request, timer]);
  } finally {
    clearTimeout(timeout);
  }
}

function extractChecklistIds(html) {
  const ids = [];
  const regex = /idsList\.push\((\d+)\)/g;
  let match;
  while ((match = regex.exec(html))) ids.push(Number(match[1]));
  return [...new Set(ids)];
}

function parseMaybeJson(value) {
  if (value === null || value === undefined || value === "") return null;
  let parsed = value;
  for (let index = 0; index < 2; index += 1) {
    if (typeof parsed !== "string") return parsed;
    parsed = JSON.parse(parsed);
  }
  return parsed;
}

async function fetchArkmedsChecklist(cookieHeader, arkmedsOsId, checklistId) {
  const response = await fetchArkmedsText(
    cookieHeader,
    `/cadastros/apis/get_json/${arkmedsOsId}/${checklistId}/`,
    "application/json"
  );
  if (!response.ok || !response.contentType.includes("application/json")) {
    return {
      ok: false,
      status: response.status,
      erro: `Resposta invalida da ArkMeds (${response.status}, ${response.contentType || "sem content-type"})`,
    };
  }

  const payload = JSON.parse(response.text);
  return {
    ok: true,
    status: response.status,
    title: stripHtmlEntities(payload.title),
    template: parseMaybeJson(payload.json) || [],
    values: parseMaybeJson(payload.values) || [],
  };
}

function mapArkmedsItem(templateItem, valueItem, ordem) {
  const descricao = stripHtmlEntities(valueItem?.desc || templateItem?.desc || "");
  const rawValue = stripHtmlEntities(valueItem?.val || "");
  const na = Boolean(valueItem?.na);
  const approved = Boolean(valueItem?.aprov);
  const labels = (templateItem?.appr || []).map(stripHtmlEntities);
  const isApproval =
    /aprova[cç][aã]o\s+para\s+uso/i.test(descricao) ||
    labels.some((label) => normalize(label).includes("aprovado") || normalize(label).includes("reprovado"));

  if (!descricao || /^obs\.?:?$/i.test(descricao)) {
    return {
      skip: true,
      observacaoGeral: rawValue,
    };
  }

  if (na) {
    return {
      descricao,
      tipo_resposta: isApproval ? "aprovacao_uso" : "conformidade",
      resposta: "nao_aplica",
      observacao: rawValue && rawValue !== "N/A" ? `Valor ArkMeds: ${rawValue}` : null,
      ordem,
    };
  }

  if (isApproval) {
    const resposta =
      normalize(rawValue).includes("restri") ? "aprovado_com_restricao" : approved ? "aprovado" : "nao_aprovado";
    return {
      descricao,
      tipo_resposta: "aprovacao_uso",
      resposta,
      observacao: rawValue && !["Aprovado", "Reprovado"].includes(rawValue) ? `Valor ArkMeds: ${rawValue}` : null,
      ordem,
    };
  }

  if (templateItem?.tipo === "opt") {
    return {
      descricao,
      tipo_resposta: "conformidade",
      resposta: approved ? "conforme" : "nao_conforme",
      observacao:
        rawValue && !["Conforme", "Nao Conforme", "Não Conforme"].includes(rawValue)
          ? `Valor ArkMeds: ${rawValue}`
          : null,
      ordem,
    };
  }

  return {
    descricao,
    tipo_resposta: "conformidade",
    resposta: approved ? "conforme" : "nao_conforme",
    observacao: rawValue ? `Valor ArkMeds: ${rawValue}` : null,
    ordem,
  };
}

function mapArkmedsChecklist(checklistPayload) {
  const template = checklistPayload.template || [];
  const values = checklistPayload.values || [];
  const mapped = [];
  const observacoes = [];
  const size = Math.max(template.length, values.length);

  for (let index = 0; index < size; index += 1) {
    const item = mapArkmedsItem(template[index], values[index], index + 1);
    if (item.skip) {
      if (item.observacaoGeral) observacoes.push(item.observacaoGeral);
      continue;
    }
    if (item.descricao) mapped.push(item);
  }

  const approvalItem = mapped.find((item) => item.tipo_resposta === "aprovacao_uso");
  let resultadoGeral = "aprovado";
  if (approvalItem?.resposta === "nao_aprovado") resultadoGeral = "nao_aprovado";
  else if (approvalItem?.resposta === "aprovado_com_restricao") resultadoGeral = "aprovado_com_restricao";
  else if (!approvalItem && mapped.some((item) => item.resposta === "nao_conforme")) {
    resultadoGeral = "aprovado_com_restricao";
  }

  return {
    itens: mapped,
    observacoes: observacoes.join("\n").trim() || null,
    resultadoGeral,
  };
}

function buildProcedureKey(procedure) {
  return `${normalize(procedure.titulo)}|${procedure.tipo_equipamento_id || ""}`;
}

function findProcedure({ title, tipoEquipamentoId, proceduresByKey, proceduresByTitle }) {
  const exact = proceduresByKey.get(`${normalize(title)}|${tipoEquipamentoId || ""}`);
  if (exact) return exact;
  const byTitle = proceduresByTitle.get(normalize(title)) || [];
  if (byTitle.length === 1) return byTitle[0];
  return null;
}

function findProcedureItem(procedure, checklistItem) {
  const itens = procedure?.itens || [];
  const byDescription = itens.filter(
    (item) =>
      normalize(item.descricao) === normalize(checklistItem.descricao) &&
      item.tipo_resposta === checklistItem.tipo_resposta
  );
  if (byDescription.length === 1) return byDescription[0];
  const byOrder = itens.find(
    (item) => Number(item.ordem) === Number(checklistItem.ordem) && item.tipo_resposta === checklistItem.tipo_resposta
  );
  return byOrder || null;
}

async function loadExistingData() {
  const ordens = await fetchAll(
    "ordens_servico",
    `
      id,
      numero,
      arkmeds_os_id,
      data_abertura,
      data_fechamento,
      equipamento_id,
      tipo_os:tipos_os ( nome ),
      estado_os:estados_os ( nome, finaliza_os ),
      equipamento:equipamentos (
        id,
        tipo_equipamento_id,
        tipo_texto,
        data_ultima_preventiva,
        data_proxima_preventiva,
        tipo_equipamento:tipos_equipamento ( id, nome )
      )
    `,
    (query) => query.not("arkmeds_os_id", "is", null)
  );

  const preventiveOrders = ordens.filter((os) =>
    normalize(os.tipo_os?.nome).includes("preventiva")
  );

  const existingChecklists = await fetchAll(
    "os_checklists_preventiva",
    "id,ordem_servico_id,procedimento_id",
    null
  );
  const checklistByOsId = new Map(existingChecklists.map((item) => [item.ordem_servico_id, item]));

  const procedures = await fetchAll(
    "procedimentos_preventiva",
    `
      id,
      organizacao_id,
      tipo_equipamento_id,
      titulo,
      validade_meses,
      ativo,
      tipo_equipamento:tipos_equipamento ( id, nome ),
      itens:procedimento_preventiva_itens (
        id,
        descricao,
        tipo_resposta,
        ordem,
        ativo
      )
    `,
    (query) => query.eq("ativo", true)
  );
  const proceduresByKey = new Map(procedures.map((procedure) => [buildProcedureKey(procedure), procedure]));
  const proceduresByTitle = new Map();
  for (const procedure of procedures) {
    const key = normalize(procedure.titulo);
    proceduresByTitle.set(key, [...(proceduresByTitle.get(key) || []), procedure]);
  }

  return {
    ordens: preventiveOrders,
    checklistByOsId,
    procedures,
    proceduresByKey,
    proceduresByTitle,
  };
}

async function ensureProcedure(organizacaoId, os, checklistPayload, mappedChecklist, dataCache) {
  const tipoEquipamentoId = os.equipamento?.tipo_equipamento_id || null;
  const existing = findProcedure({
    title: checklistPayload.title,
    tipoEquipamentoId,
    proceduresByKey: dataCache.proceduresByKey,
    proceduresByTitle: dataCache.proceduresByTitle,
  });
  if (existing) return { procedure: existing, created: false };

  if (!tipoEquipamentoId) return { procedure: null, created: false, wouldCreate: false };

  if (!execute) {
    return {
      procedure: {
        id: "__dry_run_create__",
        organizacao_id: organizacaoId,
        tipo_equipamento_id: tipoEquipamentoId,
        titulo: checklistPayload.title,
        validade_meses: 12,
        ativo: true,
        tipo_equipamento: os.equipamento?.tipo_equipamento || null,
        itens: mappedChecklist.itens.map((item) => ({
          id: null,
          descricao: item.descricao,
          tipo_resposta: item.tipo_resposta,
          ordem: item.ordem,
          ativo: true,
        })),
      },
      created: false,
      wouldCreate: true,
    };
  }

  const { data: procedure, error: procedureError } = await supabase
    .from("procedimentos_preventiva")
    .insert({
      organizacao_id: organizacaoId,
      tipo_equipamento_id: tipoEquipamentoId,
      titulo: checklistPayload.title,
      descricao: "Criado automaticamente durante importacao de checklists historicos da ArkMeds.",
      validade_meses: 12,
      ativo: true,
    })
    .select("id,organizacao_id,tipo_equipamento_id,titulo,validade_meses,ativo")
    .single();
  if (procedureError) throw new Error(`Criar procedimento ${checklistPayload.title}: ${procedureError.message}`);

  const itens = mappedChecklist.itens.map((item) => ({
    procedimento_id: procedure.id,
    descricao: item.descricao,
    tipo_resposta: item.tipo_resposta,
    ordem: item.ordem,
    obrigatorio: true,
    ativo: true,
  }));
  const { data: createdItems, error: itensError } = await supabase
    .from("procedimento_preventiva_itens")
    .insert(itens)
    .select("id,descricao,tipo_resposta,ordem,ativo");
  if (itensError) throw new Error(`Criar itens do procedimento ${checklistPayload.title}: ${itensError.message}`);

  const complete = {
    ...procedure,
    itens: createdItems || [],
    tipo_equipamento: os.equipamento?.tipo_equipamento || null,
  };
  dataCache.proceduresByKey.set(buildProcedureKey(complete), complete);
  const titleKey = normalize(complete.titulo);
  dataCache.proceduresByTitle.set(titleKey, [...(dataCache.proceduresByTitle.get(titleKey) || []), complete]);
  return { procedure: complete, created: true, wouldCreate: false };
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + Number(months || 12));
  return copy;
}

function dateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

async function insertChecklist(os, checklistPayload, mappedChecklist, procedure) {
  const baseDate = os.data_fechamento || os.data_abertura;
  const validadeMeses = Number(procedure.validade_meses || 12);
  const dataValidade = baseDate ? dateOnly(addMonths(new Date(baseDate), validadeMeses)) : null;
  const observacoes = [
    mappedChecklist.observacoes,
    `Importado da ArkMeds. OS ArkMeds: ${os.arkmeds_os_id}. Checklist ArkMeds: ${checklistPayload.arkmedsChecklistId}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: checklist, error: checklistError } = await supabase
    .from("os_checklists_preventiva")
    .insert({
      ordem_servico_id: os.id,
      procedimento_id: procedure.id,
      titulo_procedimento: procedure.titulo,
      tipo_equipamento_nome:
        procedure.tipo_equipamento?.nome ||
        os.equipamento?.tipo_equipamento?.nome ||
        os.equipamento?.tipo_texto ||
        null,
      validade_meses: validadeMeses,
      data_validade: dataValidade,
      resultado_geral: mappedChecklist.resultadoGeral,
      observacoes,
      created_at: os.data_fechamento || os.data_abertura || new Date().toISOString(),
    })
    .select("id")
    .single();
  if (checklistError) throw new Error(`Inserir checklist OS ${os.numero}: ${checklistError.message}`);

  const rows = mappedChecklist.itens.map((item) => {
    const procedureItem = findProcedureItem(procedure, item);
    return {
      checklist_id: checklist.id,
      procedimento_item_id: procedureItem?.id || null,
      descricao: item.descricao,
      tipo_resposta: item.tipo_resposta,
      resposta: item.resposta,
      observacao: item.observacao || null,
      ordem: item.ordem,
      created_at: os.data_fechamento || os.data_abertura || new Date().toISOString(),
    };
  });

  if (rows.length) {
    const { error: itensError } = await supabase.from("os_checklist_preventiva_itens").insert(rows);
    if (itensError) throw new Error(`Inserir itens checklist OS ${os.numero}: ${itensError.message}`);
  }

  await supabase.from("ordem_servico_historico").insert({
    ordem_servico_id: os.id,
    acao: "importacao_checklist_arkmeds",
    observacao: `Checklist preventivo importado da ArkMeds. Checklist ArkMeds: ${checklistPayload.arkmedsChecklistId}.`,
    created_at: new Date().toISOString(),
  });

  if (os.equipamento_id && baseDate) {
    const dataUltima = dateOnly(baseDate);
    const shouldUpdate =
      !os.equipamento?.data_ultima_preventiva ||
      new Date(dataUltima) >= new Date(os.equipamento.data_ultima_preventiva);
    if (shouldUpdate) {
      await supabase
        .from("equipamentos")
        .update({
          data_ultima_preventiva: dataUltima,
          data_proxima_preventiva: dataValidade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", os.equipamento_id);
    }
  }

  return checklist.id;
}

async function processOrder(os, cookieHeader, dataCache, organizacaoId) {
  const base = {
    os_id: os.id,
    os_numero: os.numero,
    arkmeds_os_id: os.arkmeds_os_id,
    equipamento_id: os.equipamento_id || "",
    tipo_equipamento:
      os.equipamento?.tipo_equipamento?.nome || os.equipamento?.tipo_texto || "",
    status: "",
    checklist_ids_arkmeds: "",
    procedimento: "",
    itens: 0,
    resultado_geral: "",
    pendencia: "",
  };

  if (dataCache.checklistByOsId.has(os.id)) {
    return { ...base, status: "ignorado", pendencia: "OS ja possui checklist preventivo local." };
  }
  if (!os.equipamento_id) {
    return { ...base, status: "pendente", pendencia: "OS sem equipamento vinculado." };
  }
  if (!os.equipamento?.tipo_equipamento_id) {
    return { ...base, status: "pendente", pendencia: "Equipamento sem tipo de equipamento vinculado." };
  }

  const listResponse = await fetchArkmedsText(cookieHeader, `/ordem_servico/list_checklist/${os.arkmeds_os_id}`);
  if (!listResponse.ok) {
    return {
      ...base,
      status: "erro",
      pendencia: `Nao foi possivel abrir checklist na ArkMeds (${listResponse.status}).`,
    };
  }

  const checklistIds = extractChecklistIds(listResponse.text);
  if (!checklistIds.length) {
    return { ...base, status: "pendente", pendencia: "ArkMeds nao retornou checklist para esta OS." };
  }

  const imported = [];
  const pendencias = [];
  for (const checklistId of checklistIds) {
    const checklistPayload = await fetchArkmedsChecklist(cookieHeader, os.arkmeds_os_id, checklistId);
    if (!checklistPayload.ok) {
      pendencias.push(`Checklist ${checklistId}: ${checklistPayload.erro}`);
      continue;
    }
    checklistPayload.arkmedsChecklistId = checklistId;
    const mappedChecklist = mapArkmedsChecklist(checklistPayload);
    if (!mappedChecklist.itens.length) {
      pendencias.push(`Checklist ${checklistId}: sem itens preenchidos.`);
      continue;
    }

    const { procedure, created, wouldCreate } = await ensureProcedure(
      organizacaoId,
      os,
      checklistPayload,
      mappedChecklist,
      dataCache
    );
    if (!procedure) {
      pendencias.push(
        `Checklist ${checklistId}: procedimento local nao encontrado para "${checklistPayload.title}" e tipo do equipamento.`
      );
      continue;
    }

    let checklistLocalId = null;
    if (execute) {
      checklistLocalId = await insertChecklist(os, checklistPayload, mappedChecklist, procedure);
      dataCache.checklistByOsId.set(os.id, {
        id: checklistLocalId,
        ordem_servico_id: os.id,
        procedimento_id: procedure.id,
      });
    }

    imported.push({
      checklistId,
      title: checklistPayload.title,
      procedureId: procedure.id,
      procedureCreated: created,
      procedureWouldCreate: wouldCreate,
      checklistLocalId,
      itens: mappedChecklist.itens.length,
      resultadoGeral: mappedChecklist.resultadoGeral,
    });
  }

  if (!imported.length) {
    return {
      ...base,
      status: "pendente",
      checklist_ids_arkmeds: checklistIds.join(", "),
      pendencia: pendencias.join(" | ") || "Nenhum checklist importavel.",
    };
  }

  return {
    ...base,
    status: execute ? "importado" : "simulado",
    checklist_ids_arkmeds: imported.map((item) => item.checklistId).join(", "),
    procedimento: imported.map((item) => item.title).join(" | "),
    itens: imported.reduce((sum, item) => sum + item.itens, 0),
    resultado_geral: imported.map((item) => item.resultadoGeral).join(" | "),
    pendencia: [
      ...pendencias,
      ...imported
        .filter((item) => item.procedureWouldCreate)
        .map((item) => `Procedimento "${item.title}" seria criado no modo execute.`),
    ].join(" | "),
  };
}

async function mapLimit(items, size, worker) {
  const results = [];
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = {
          os_id: items[index]?.id,
          os_numero: items[index]?.numero,
          arkmeds_os_id: items[index]?.arkmeds_os_id,
          status: "erro",
          pendencia: error.message,
        };
      }
      done += 1;
      if (done % 25 === 0 || done === items.length) {
        console.log(`Progresso checklists ArkMeds: ${done}/${items.length}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  await fs.mkdir(outputsDir, { recursive: true });
  const cookieHeader = await readArkmedsCookieHeader();
  const dataCache = await loadExistingData();
  const previousPendingRows = await readPendingLedger();
  const previousPendingIds = new Set(previousPendingRows.map((row) => String(row.arkmeds_os_id)));
  const organizacaoId =
    dataCache.procedures[0]?.organizacao_id ||
    (await must("Buscar organizacao", supabase.from("organizacoes").select("id").limit(1))).at(0)?.id;

  let ordens = dataCache.ordens
    .filter((os) => !dataCache.checklistByOsId.has(os.id))
    .filter((os) => retryPending || !previousPendingIds.has(String(os.arkmeds_os_id)))
    .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
  ordens = ordens.slice(offset, limit ? offset + limit : undefined);

  const results = await mapLimit(ordens, concurrency, (os) =>
    processOrder(os, cookieHeader, dataCache, organizacaoId)
  );

  const resumo = results.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      acc.total += 1;
      acc.itens += Number(item.itens || 0);
      return acc;
    },
    { total: 0, itens: 0 }
  );
  resumo.pendencias_puladas = retryPending ? 0 : previousPendingRows.length;

  let pendingLedgerRows = previousPendingRows;
  if (execute) {
    pendingLedgerRows = await writePendingLedger(
      previousPendingRows,
      results.filter((item) => item.status === "pendente" || item.status === "erro")
    );
    resumo.pendencias_registradas = pendingLedgerRows.length;
  }

  const rangeSuffix = limit ? `_offset_${offset}_limit_${limit}` : "";
  const suffix = `${execute ? "execute" : "dry_run"}${rangeSuffix}`;
  const jsonPath = path.join(outputsDir, `arkmeds_checklists_preventiva_import_${suffix}.json`);
  const csvPath = path.join(outputsDir, `arkmeds_checklists_preventiva_import_${suffix}.csv`);
  const resumoPath = path.join(outputsDir, `arkmeds_checklists_preventiva_import_${suffix}_resumo.json`);
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        modo: execute ? "execute" : "dry-run",
        gerado_em: new Date().toISOString(),
        offset,
        limite: limit,
        concorrencia: concurrency,
        retry_pending: retryPending,
        request_timeout_ms: requestTimeoutMs,
        resumo,
        resultados: results,
      },
      null,
      2
    ),
    "utf8"
  );
  await writeCsv(csvPath, results);
  await fs.writeFile(resumoPath, JSON.stringify(resumo, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        modo: execute ? "execute" : "dry-run",
        arquivos: {
          resumo: path.relative(root, resumoPath),
          json: path.relative(root, jsonPath),
          csv: path.relative(root, csvPath),
        },
        offset,
        limite: limit,
        retry_pending: retryPending,
        request_timeout_ms: requestTimeoutMs,
        resumo,
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

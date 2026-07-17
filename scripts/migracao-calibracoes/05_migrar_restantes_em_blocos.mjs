import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  ensureOutputDir,
  fetchAllRows,
  fetchCalibrationList,
  outputDir,
  parseArgs,
  requireSupabase,
  resolveOrganizacaoId,
  rootDir,
  toCsv,
} from "./lib.mjs";

const args = parseArgs();
const confirmed =
  args["confirmar-importacao-total"] === true &&
  process.env.CONFIRMAR_IMPORTACAO_TOTAL_CALIBRACOES === "true";
const blockSize = Number.parseInt(process.env.CALIBRACOES_BLOCK_SIZE || "500", 10);
const listPageSize = Number.parseInt(process.env.ARKMEDS_LIST_PAGE_SIZE || "500", 10);
const maxTransientAttempts = Number.parseInt(process.env.MAX_TRANSIENT_ATTEMPTS || "3", 10);
const statePath = path.join(outputDir, "migracao_total_estado.json");
const lockPath = path.join(outputDir, ".migracao_total.lock");
const selectorPath = path.join(rootDir, "scripts", "migracao-calibracoes", "03_selecionar_lote_30_compativeis.mjs");
const importerPath = path.join(rootDir, "scripts", "migracao-calibracoes", "04_importar_lote_30.mjs");

if (!confirmed) {
  throw new Error(
    "A migracao total exige CONFIRMAR_IMPORTACAO_TOTAL_CALIBRACOES=true e --confirmar-importacao-total."
  );
}
if (!Number.isInteger(blockSize) || blockSize <= 0 || blockSize > 500) {
  throw new Error("CALIBRACOES_BLOCK_SIZE deve estar entre 1 e 500.");
}
if (!Number.isInteger(listPageSize) || listPageSize <= 0 || listPageSize > 500) {
  throw new Error("ARKMEDS_LIST_PAGE_SIZE deve estar entre 1 e 500.");
}

function isTransientError(message) {
  return /\bHTTP 5\d\d\b|timeout|timed out|ECONN|socket|fetch failed/i.test(String(message || ""));
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(statePath, "utf-8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      iniciado_em: new Date().toISOString(),
      proximo_bloco: 1,
      blocos: [],
      rejeicoes: {},
      bloqueios_vinculo: [],
    };
  }
}

async function saveState(state) {
  state.atualizado_em = new Date().toISOString();
  const temporaryPath = `${statePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2));
  await fs.rename(temporaryPath, statePath);
}

async function fetchArkmedsInventory() {
  const first = await fetchCalibrationList({ start: 0, length: listPageSize });
  const records = [...(first.data || [])];
  const total = Number(first.recordsTotal || records.length);
  for (let start = listPageSize; start < total; start += listPageSize) {
    const page = await fetchCalibrationList({
      start,
      length: Math.min(listPageSize, total - start),
    });
    records.push(...(page.data || []));
    console.log(`Inventario ArkMeds: ${Math.min(records.length, total)}/${total}`);
  }
  return { total, records };
}

function runNode(scriptPath, scriptArgs, env) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(scriptPath)} terminou com codigo ${result.status ?? "desconhecido"}.`);
  }
}

async function fetchImportedIds(supabase, organizacaoId) {
  const rows = await fetchAllRows(
    supabase,
    "calibracao_execucoes",
    "arkmeds_calibracao_id",
    [
      { column: "organizacao_id", value: organizacaoId },
      { column: "origem", value: "arkmeds" },
    ]
  );
  return new Set(
    rows
      .map((item) => item.arkmeds_calibracao_id)
      .filter((value) => value != null)
      .map(String)
  );
}

async function auditBatch(organizacaoId, selected) {
  const expected = {
    execucoes: selected.length,
    tabelas: selected.reduce((sum, item) => sum + item.tabelas.length, 0),
    pontos: selected.reduce(
      (sum, item) => sum + item.tabelas.reduce((tableSum, table) => tableSum + table.pontos.length, 0),
      0
    ),
    leituras: selected.reduce(
      (sum, item) => sum + item.tabelas.reduce(
        (tableSum, table) => tableSum + table.pontos.reduce(
          (pointSum, point) => pointSum + point.leituras.length,
          0
        ),
        0
      ),
      0
    ),
  };
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const ids = selected.map((item) => String(item.arkmeds_calibracao_id));
    const result = await client.query(
      `with target as (
         select * from public.calibracao_execucoes
         where organizacao_id=$1 and origem='arkmeds' and arkmeds_calibracao_id=any($2::bigint[])
       ), tabelas as (
         select t.* from public.calibracao_execucao_tabelas t join target e on e.id=t.execucao_id
       ), pontos as (
         select p.* from public.calibracao_execucao_pontos p join tabelas t on t.id=p.execucao_tabela_id
       ), leituras as (
         select l.* from public.calibracao_execucao_leituras l join pontos p on p.id=l.execucao_ponto_id
       )
       select
         (select count(*)::int from target) execucoes,
         (select count(*)::int from tabelas) tabelas,
         (select count(*)::int from pontos) pontos,
         (select count(*)::int from leituras) leituras,
         (select count(*)::int from target
          where status<>'fechada' or pdf_hash is null or pdf_storage_path is null
             or arkmeds_dados_brutos_json is null) cabecalhos_invalidos,
         (select count(*)::int from pontos
          where media_valores_medidos is null or tendencia_corrigida is null
             or incerteza_expandida is null or fator_abrangencia_k is null) pontos_invalidos,
         (select count(*)::int from storage.objects o join target e
          on o.bucket_id='calibracao-certificados' and o.name=e.pdf_storage_path) pdfs`,
      [organizacaoId, ids]
    );
    const actual = result.rows[0];
    const valid =
      actual.execucoes === expected.execucoes &&
      actual.tabelas === expected.tabelas &&
      actual.pontos === expected.pontos &&
      actual.leituras === expected.leituras &&
      actual.pdfs === expected.execucoes &&
      actual.cabecalhos_invalidos === 0 &&
      actual.pontos_invalidos === 0;
    if (!valid) {
      throw new Error(`Auditoria divergente: ${JSON.stringify({ expected, actual })}`);
    }
    return { expected, actual, valid };
  } finally {
    await client.end();
  }
}

async function writeFinalReports(state, inventory, importedCount) {
  const rejectionRows = Object.values(state.rejeicoes);
  const linkageRows = state.bloqueios_vinculo || [];
  await fs.writeFile(
    path.join(outputDir, "migracao_total_rejeicoes.csv"),
    toCsv(rejectionRows, [
      { key: "arkmeds_calibracao_id", label: "ID ArkMeds" },
      { key: "certificado", label: "Certificado" },
      { key: "equipamento", label: "Equipamento" },
      { key: "motivo", label: "Motivo" },
      { key: "tentativas", label: "Tentativas" },
      { key: "transitorio", label: "Transitorio" },
      { key: "terminal", label: "Terminal" },
    ])
  );
  await fs.writeFile(
    path.join(outputDir, "migracao_total_bloqueios_vinculo.csv"),
    toCsv(linkageRows, [
      { key: "arkmeds_calibracao_id", label: "ID ArkMeds" },
      { key: "certificado", label: "Certificado" },
      { key: "empresa", label: "Empresa" },
      { key: "equipamento", label: "Equipamento" },
      { key: "motivo", label: "Motivo" },
    ])
  );
  const importedInBatches = state.blocos.reduce((sum, block) => sum + block.importados, 0);
  const terminalRejections = rejectionRows.filter((item) => item.terminal).length;
  await fs.writeFile(
    path.join(outputDir, "migracao_total_resumo.md"),
    [
      "# Migracao total de calibracoes ArkMeds",
      "",
      `- Atualizacao: ${new Date().toISOString()}`,
      `- Total atual no ArkMeds: ${inventory.total}`,
      `- Total ArkMeds no Ipromed: ${importedCount}`,
      `- Importados nesta execucao em blocos: ${importedInBatches}`,
      `- Blocos concluidos: ${state.blocos.length}`,
      `- Bloqueados por vinculo: ${linkageRows.length}`,
      `- Rejeitados apos analise detalhada: ${terminalRejections}`,
      `- Rejeicoes transitorias ainda disponiveis para nova tentativa: ${rejectionRows.filter((item) => !item.terminal).length}`,
      "",
      "Cada bloco foi submetido a dry-run, importacao transacional e auditoria de cabecalho, PDF, tabelas, pontos e leituras.",
      "",
    ].join("\n")
  );
}

async function main() {
  await ensureOutputDir();
  const lock = await fs.open(lockPath, "wx").catch((error) => {
    if (error.code === "EEXIST") {
      throw new Error("Ja existe uma migracao total de calibracoes em andamento.");
    }
    throw error;
  });

  try {
    const supabase = requireSupabase();
    const organizacaoId = await resolveOrganizacaoId(supabase);
    const state = await readState();
    const inventory = await fetchArkmedsInventory();
    const filters = [{ column: "organizacao_id", value: organizacaoId }];
    const [companies, equipment] = await Promise.all([
      fetchAllRows(supabase, "empresas", "id,numero_cadastro,nome", filters),
      fetchAllRows(supabase, "equipamentos", "id,numero_cadastro,empresa_id", filters),
    ]);
    const companiesByLegacyId = new Map(
      companies.map((item) => [String(item.numero_cadastro), item])
    );
    const equipmentByLegacyId = new Map(
      equipment.map((item) => [String(item.numero_cadastro), item])
    );

    state.bloqueios_vinculo = inventory.records.flatMap((item) => {
      const company = companiesByLegacyId.get(String(item.solicitante_id));
      const localEquipment = equipmentByLegacyId.get(String(item.equipamento_id));
      let motivo = null;
      if (!company) motivo = "empresa_nao_encontrada_por_id_arkmeds";
      else if (!localEquipment) motivo = "equipamento_nao_encontrado_por_id_arkmeds";
      else if (localEquipment.empresa_id !== company.id) motivo = "equipamento_vinculado_a_outra_empresa";
      return motivo ? [{
        arkmeds_calibracao_id: item.id,
        certificado: item.numero,
        empresa: item.solicitante,
        equipamento: item.equipamento,
        motivo,
      }] : [];
    });
    await saveState(state);

    for (;;) {
      const importedIds = await fetchImportedIds(supabase, organizacaoId);
      const terminalRejected = new Set(
        Object.values(state.rejeicoes)
          .filter((item) => item.terminal)
          .map((item) => String(item.arkmeds_calibracao_id))
      );
      const blockedLinkage = new Set(
        state.bloqueios_vinculo.map((item) => String(item.arkmeds_calibracao_id))
      );
      const pending = inventory.records.filter((item) =>
        !importedIds.has(String(item.id)) &&
        !terminalRejected.has(String(item.id)) &&
        !blockedLinkage.has(String(item.id))
      );

      if (!pending.length) {
        await writeFinalReports(state, inventory, importedIds.size);
        console.log("Nao ha mais certificados elegiveis pendentes.");
        break;
      }

      const blockNumber = state.proximo_bloco;
      const lotName = `lote_total_${String(blockNumber).padStart(2, "0")}`;
      const candidateFile = path.join(outputDir, `${lotName}_candidatos.json`);
      await fs.writeFile(candidateFile, JSON.stringify(pending.map((item) => String(item.id))));
      const targetCount = Math.min(blockSize, pending.length);
      console.log(`\n=== ${lotName}: alvo ${targetCount}, pendentes elegiveis ${pending.length} ===`);

      runNode(selectorPath, [], {
        ...process.env,
        TARGET_COUNT: String(targetCount),
        LOTE_NOME: lotName,
        LIST_PAGE_SIZE: String(inventory.records.length),
        LIST_FETCH_PAGE_SIZE: String(listPageSize),
        PDF_DIR_NAME: `${lotName.replace(/_/g, "-")}-pdfs`,
        ARKMEDS_CALIBRATION_IDS: "",
        ARKMEDS_CALIBRATION_IDS_FILE: candidateFile,
        ALLOW_IMPORTED_REQUESTED_IDS: "false",
        ALLOW_PARTIAL_LOT: "true",
        MIGRACAO_CALIBRACOES_QUIET: "true",
      });

      const lot = JSON.parse(
        await fs.readFile(path.join(outputDir, `${lotName}.json`), "utf-8")
      );
      for (const selected of lot.selected) {
        delete state.rejeicoes[String(selected.arkmeds_calibracao_id)];
      }
      for (const rejection of lot.rejected || []) {
        const key = String(rejection.arkmeds_calibracao_id);
        const previous = state.rejeicoes[key] || { tentativas: 0 };
        const attempts = previous.tentativas + 1;
        const transient = isTransientError(rejection.motivo);
        state.rejeicoes[key] = {
          ...rejection,
          tentativas: attempts,
          transitorio: transient,
          terminal: !transient || attempts >= maxTransientAttempts,
          atualizado_em: new Date().toISOString(),
        };
      }
      await saveState(state);

      if (!lot.selected.length) {
        console.log(`${lotName}: nenhum certificado compativel; seguindo apos registrar rejeicoes.`);
        continue;
      }

      const childBaseEnv = {
        ...process.env,
        LOTE_NOME: lotName,
        EXPECTED_COUNT: String(lot.selected.length),
        MIGRACAO_CALIBRACOES_QUIET: "true",
      };
      delete childBaseEnv.CONFIRMAR_IMPORTACAO_CALIBRACOES;
      runNode(importerPath, [], childBaseEnv);
      runNode(importerPath, ["--confirmar-importacao"], {
        ...childBaseEnv,
        CONFIRMAR_IMPORTACAO_CALIBRACOES: "true",
      });
      const audit = await auditBatch(organizacaoId, lot.selected);
      state.blocos.push({
        lote: lotName,
        concluido_em: new Date().toISOString(),
        importados: lot.selected.length,
        rejeitados_na_selecao: (lot.rejected || []).length,
        tabelas: audit.expected.tabelas,
        pontos: audit.expected.pontos,
        leituras: audit.expected.leituras,
        auditoria: audit.actual,
      });
      state.proximo_bloco += 1;
      await saveState(state);
      const updatedImportedIds = await fetchImportedIds(supabase, organizacaoId);
      await writeFinalReports(state, inventory, updatedImportedIds.size);
      console.log(`${lotName}: ${lot.selected.length} importado(s) e auditado(s).`);
    }
  } finally {
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

await main();

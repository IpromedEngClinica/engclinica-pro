import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { outputDir, writeCsv } from "./lib.mjs";

const { Client } = pg;
const REPORT_DIR = path.join(outputDir, "resolucoes-finais-2026-07-20");
const LOT_PATH = path.join(outputDir, "lote_resolucoes_finais_2026_07_20.csv");
const STANDALONE_MARKER = "AVULSO_CONFIRMADO_PELO_USUARIO";
const LINK_MARKER = "VINCULO_CONFIRMADO_PELO_USUARIO";
const OVERRIDE_MARKER = "CLIENTE_CONFIRMADO_PELO_USUARIO_DIVERGE_DA_OS";

const FPA = {
  legacyId: 244,
  nome: "FPA CALIBRAÇÂO",
  nomeFantasia: "FPA - CALIBRAÇÃO AUDIÔMETRO",
  cep: "36038-320",
  rua: "Rua Mário Cruz Meyer",
  numero: "10",
  bairro: "Aeroporto",
  complemento: "LOJA 106",
  cidade: "Juiz de Fora",
  estado: "MG",
};

const ACTIONS = [
  { id: 2910, numero: "48899.1", mode: "link", osNumber: "48899", companyName: "Hospital Universitário Juiz de Fora - Unidade Santa Catarina", allowCompanyMismatch: true },
  { id: 2915, numero: "46444.1", mode: "link", osNumber: "46444", companyName: "Hospital Universitário Juiz de Fora - Unidade Dom Bosco", allowCompanyMismatch: true },
  { id: 3116, numero: "50534", mode: "link", osNumber: "50534", companyLegacyId: 548 },
  { id: 3235, numero: "50739", mode: "link", osNumber: "50739", companyLegacyId: 548 },
  { id: 4429, numero: "55537", mode: "link", osNumber: "55537", companyName: "Prefeitura Municipal de Rio Casca" },
  { id: 592, numero: "35859", mode: "link", osNumber: "35859", companyLegacyId: 713 },
  { id: 1105, numero: "37014.1", mode: "standalone", companyName: "Prefeitura Municipal de Chácara" },
  { id: 3058, numero: "50151", mode: "standalone", companyLegacyId: 244, createFpa: true },
];

const apply = process.argv.includes("--aplicar");

async function companyByLegacyId(client, legacyId) {
  const { rows } = await client.query(
    `select id, nome, numero_cadastro from public.empresas
     where ativo = true and numero_cadastro = $1::bigint`,
    [legacyId]
  );
  return rows.length === 1 ? rows[0] : null;
}

async function companyByName(client, name) {
  const { rows } = await client.query(
    `select id, nome, numero_cadastro from public.empresas
     where ativo = true and lower(trim(nome)) = lower(trim($1))`,
    [name]
  );
  return rows.length === 1 ? rows[0] : null;
}

async function ensureFpa(client) {
  const existing = await companyByLegacyId(client, FPA.legacyId);
  if (existing) return existing;
  if (!apply) return { id: null, nome: FPA.nome, numero_cadastro: FPA.legacyId, pendingCreate: true };

  const { rows } = await client.query(
    `insert into public.empresas (
       organizacao_id, numero_cadastro, nome, nome_fantasia, tipo_cliente, tipo_relacao,
       cep, rua, numero, bairro, complemento, cidade, estado, observacoes, ativo
     )
     select id, $1, $2, $3, 'Pessoa Jurídica', 'fornecedor',
            $4, $5, $6, $7, $8, $9, $10,
            'Sincronizado do ArkMeds para conciliação do orçamento 50151. ID ArkMeds: 244.', true
     from public.organizacoes
     order by created_at
     limit 1
     returning id, nome, numero_cadastro`,
    [FPA.legacyId, FPA.nome, FPA.nomeFantasia, FPA.cep, FPA.rua, FPA.numero,
      FPA.bairro, FPA.complemento, FPA.cidade, FPA.estado]
  );
  if (rows.length !== 1) throw new Error("Não foi possível cadastrar o FPA de forma única.");
  return rows[0];
}

async function resolveCompany(client, action) {
  if (action.createFpa) return ensureFpa(client);
  if (action.companyLegacyId != null) return companyByLegacyId(client, action.companyLegacyId);
  return companyByName(client, action.companyName);
}

async function resolveOrder(client, number) {
  const { rows } = await client.query(
    `select os.id, os.numero, os.empresa_id, os.equipamento_id, empresa.nome as empresa
     from public.ordens_servico os
     join public.empresas empresa on empresa.id = os.empresa_id
     where os.numero = $1`,
    [number]
  );
  return rows.length === 1 ? rows[0] : null;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) throw new Error("Configure SUPABASE_DB_URL.");
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const report = [];
  const approved = [];

  try {
    if (apply) await client.query("begin");

    for (const action of ACTIONS) {
      const { rows: budgets } = await client.query(
        `select arkmeds_orcamento_id, arkmeds_orcamento_numero_original, arkmeds_solicitante
         from public.staging_arkmeds_orcamentos where arkmeds_orcamento_id = $1`,
        [action.id]
      );
      const budget = budgets[0] || null;
      const company = await resolveCompany(client, action);
      const order = action.mode === "link" ? await resolveOrder(client, action.osNumber) : null;
      let result = "aprovado";
      let reason = action.mode === "standalone" ? STANDALONE_MARKER : LINK_MARKER;

      if (!budget) { result = "bloqueado"; reason = "ORCAMENTO_NAO_LOCALIZADO"; }
      else if (!company) { result = "bloqueado"; reason = "EMPRESA_NAO_LOCALIZADA"; }
      else if (action.mode === "link" && !order) { result = "bloqueado"; reason = "OS_NAO_LOCALIZADA"; }
      else if (action.mode === "link" && company.id !== order.empresa_id && !action.allowCompanyMismatch) {
        result = "bloqueado"; reason = "CLIENTE_DIVERGE_DA_OS";
      } else if (action.allowCompanyMismatch) {
        reason = OVERRIDE_MARKER;
      }

      const row = {
        arkmeds_orcamento_id: action.id,
        numero_orcamento: budget?.arkmeds_orcamento_numero_original || action.numero,
        cliente_origem: budget?.arkmeds_solicitante || "",
        modo_resolucao: action.mode,
        empresa_resolvida: company?.nome || "",
        empresa_id_resolvida: company?.id || "",
        empresa_a_criar: company?.pendingCreate ? "sim" : "não",
        os_numero: order?.numero || "",
        os_empresa_atual: order?.empresa || "",
        resultado: result,
        motivo: reason,
        modo_execucao: apply ? "aplicacao" : "dry_run",
      };
      report.push(row);
      if (result === "aprovado") approved.push({ action, company, order });
    }

    const blocked = report.filter((row) => row.resultado === "bloqueado");
    if (blocked.length) throw new Error(`Resoluções bloqueadas: ${blocked.map((row) => row.numero_orcamento).join(", ")}`);

    if (apply) {
      for (const { action, company, order } of approved) {
        const standalone = action.mode === "standalone";
        const marker = action.allowCompanyMismatch ? OVERRIDE_MARKER : standalone ? STANDALONE_MARKER : LINK_MARKER;
        await client.query(
          `update public.staging_arkmeds_orcamentos
           set arkmeds_ordem_servico_id = case when $2 then null else arkmeds_ordem_servico_id end,
               arkmeds_ordem_servico_numero = case when $2 then null else $3 end,
               os_candidata_id = case when $2 then null else $4::uuid end,
               os_candidata_numero = case when $2 then null else $3 end,
               cliente_os_candidato = case when $2 then null else $5 end,
               empresa_id_resolvida = $6::uuid,
               ordem_servico_id_resolvida = case when $2 then null else $4::uuid end,
               equipamento_id_resolvido = case when $2 then null else $7::uuid end,
               classificacao_vinculo_os = case when $2 then 'sem_os_avulso' else 'com_os_confirmada' end,
               score_os = 100,
               confianca_os = 'alta',
               motivos_associacao_os = array[$8]::text[],
               motivos_bloqueantes = array_remove(array_remove(array_remove(
                 coalesce(motivos_bloqueantes, '{}'::text[]), 'OS_AMBIGUA'),
                 'POSSIVEL_OS_POR_NUMERO'), 'EMPRESA_NAO_RESOLVIDA'),
               status_validacao = 'ok_para_importar_com_detalhes_parciais',
               recomendacao_migracao = case when $2 then 'tratar_como_avulso' else 'confirmar_vinculo' end,
               atualizado_em = now()
           where arkmeds_orcamento_id = $1`,
          [action.id, standalone, order?.numero || null, order?.id || null, order?.empresa || null,
            company.id, order?.equipamento_id || null, marker]
        );
      }
      await client.query("commit");
    }

    const columns = ["arkmeds_orcamento_id", "numero_orcamento", "cliente_origem", "modo_resolucao",
      "empresa_resolvida", "empresa_id_resolvida", "empresa_a_criar", "os_numero", "os_empresa_atual",
      "resultado", "motivo", "modo_execucao"];
    await writeCsv(path.join(REPORT_DIR, apply ? "resultado_aplicacao.csv" : "resultado_dry_run.csv"), report, columns);
    await writeCsv(LOT_PATH, approved.map(({ action }) => ({ arkmeds_orcamento_id: action.id, numero_orcamento: action.numero })),
      ["arkmeds_orcamento_id", "numero_orcamento"]);
    console.log(JSON.stringify({ modo: apply ? "aplicacao" : "dry_run", total: report.length, aprovados: approved.length, bloqueados: 0, lote: LOT_PATH }, null, 2));
  } catch (error) {
    if (apply) await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

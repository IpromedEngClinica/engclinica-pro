import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("Configure SUPABASE_DB_URL.");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "outputs", "sincronizacao-os");
const outputPath = path.join(outputDir, "backup_os_ipromed_20260715.json");

async function rows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const ordensServico = await rows(
      client,
      `select *
       from public.ordens_servico
       where arkmeds_os_id is null
       order by numero_ordem, created_at`
    );

    const osIds = ordensServico.map((item) => item.id);
    const historico = osIds.length
      ? await rows(client, "select * from public.ordem_servico_historico where ordem_servico_id = any($1::uuid[]) order by created_at", [osIds])
      : [];
    const checklists = osIds.length
      ? await rows(client, "select * from public.os_checklists_preventiva where ordem_servico_id = any($1::uuid[]) order by created_at", [osIds])
      : [];
    const checklistIds = checklists.map((item) => item.id);
    const checklistItens = checklistIds.length
      ? await rows(client, "select * from public.os_checklist_preventiva_itens where checklist_id = any($1::uuid[]) order by checklist_id, ordem", [checklistIds])
      : [];
    const planoCicloItens = osIds.length
      ? await rows(client, "select * from public.plano_ciclo_itens where os_id = any($1::uuid[]) order by created_at", [osIds])
      : [];
    const acessorios = osIds.length
      ? await rows(client, "select * from public.ordem_servico_acessorios where ordem_servico_id = any($1::uuid[]) order by created_at", [osIds])
      : [];
    const protocolos = osIds.length
      ? await rows(client, "select * from public.protocolos_os where ordem_servico_id = any($1::uuid[]) order by created_at", [osIds])
      : [];

    const backup = {
      gerado_em: new Date().toISOString(),
      criterio: "ordens_servico.arkmeds_os_id is null",
      contagens: {
        ordens_servico: ordensServico.length,
        ordem_servico_historico: historico.length,
        os_checklists_preventiva: checklists.length,
        os_checklist_preventiva_itens: checklistItens.length,
        plano_ciclo_itens: planoCicloItens.length,
        ordem_servico_acessorios: acessorios.length,
        protocolos_os: protocolos.length,
      },
      dados: {
        ordens_servico: ordensServico,
        ordem_servico_historico: historico,
        os_checklists_preventiva: checklists,
        os_checklist_preventiva_itens: checklistItens,
        plano_ciclo_itens: planoCicloItens,
        ordem_servico_acessorios: acessorios,
        protocolos_os: protocolos,
      },
    };

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(backup, null, 2), "utf8");
    console.log(JSON.stringify({ arquivo: outputPath, ...backup.contagens }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

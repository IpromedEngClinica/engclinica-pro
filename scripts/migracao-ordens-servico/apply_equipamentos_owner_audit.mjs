import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const auditPath = path.join(outputsPath(), "auditoria_empresas_equipamentos_arkmeds_todos.json");
const execute = process.argv.includes("--execute");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function outputsPath() {
  return path.join(root, "outputs");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const auditRows = JSON.parse(await fs.readFile(auditPath, "utf-8"));
  const corrections = auditRows.filter(
    (row) =>
      row.status_auditoria === "corrigir_empresa_do_equipamento" &&
      row.equipamento_id &&
      row.empresa_sugerida_id &&
      row.empresa_sugerida_id !== row.empresa_atual_id
  );

  let updated = 0;
  const failures = [];

  if (execute) {
    for (const row of corrections) {
      const { error } = await supabase
        .from("equipamentos")
        .update({
          empresa_id: row.empresa_sugerida_id,
          empresa_setor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.equipamento_id);

      if (error) {
        failures.push({
          equipamento_numero_cadastro: row.equipamento_numero_cadastro,
          erro: error.message,
        });
      } else {
        updated += 1;
      }
    }
  }

  const pairs = corrections.reduce((acc, row) => {
    const key = `${row.empresa_atual_nome} -> ${row.empresa_sugerida_nome}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        modo: execute ? "execute" : "dry-run",
        correcoes_identificadas: corrections.length,
        atualizados: updated,
        falhas: failures,
        pares: Object.entries(pairs)
          .sort((a, b) => b[1] - a[1])
          .map(([par, total]) => ({ par, total })),
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

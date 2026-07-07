import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const snapshotPath = path.join(root, "tmp_os_db_snapshot.json");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function fetchAll(table, select, orderBy = "created_at") {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase.from(table).select(select).range(from, to);
    if (orderBy) query = query.order(orderBy, { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function main() {
  const [
    empresas,
    equipamentos,
    tiposEquipamento,
    tiposOs,
    estadosOs,
    usuarios,
    osExistentes,
  ] = await Promise.all([
    fetchAll(
      "empresas",
      "id,numero_cadastro,nome,nome_fantasia,cpf_cnpj,cep,cidade,estado,ativo,tipo_cliente,tipo_relacao",
      "numero_cadastro"
    ),
    fetchAll(
      "equipamentos",
      `
        id,
        numero_cadastro,
        empresa_id,
        tipo_texto,
        tipo_equipamento_id,
        fabricante,
        modelo,
        numero_serie,
        patrimonio,
        tag,
        setor,
        status,
        ativo,
        tipo_equipamento:tipos_equipamento (id, nome)
      `,
      "numero_cadastro"
    ),
    fetchAll("tipos_equipamento", "id,nome,ativo", "nome"),
    fetchAll("tipos_os", "id,nome,ativo", "nome"),
    fetchAll("estados_os", "id,nome,ordem,finaliza_os,cancela_os,ativo", "ordem"),
    fetchAll("usuarios", "id,nome,email,perfil,ativo", "nome"),
    fetchAll("ordens_servico", "id,numero,empresa_id,equipamento_id,status_sistema,ativo", "numero"),
  ]);

  const snapshot = {
    gerado_em: new Date().toISOString(),
    empresas,
    equipamentos,
    tiposEquipamento,
    tiposOs,
    estadosOs,
    usuarios,
    osExistentes,
  };

  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(
    JSON.stringify(
      {
        arquivo: path.relative(root, snapshotPath),
        empresas: empresas.length,
        equipamentos: equipamentos.length,
        tiposEquipamento: tiposEquipamento.length,
        tiposOs: tiposOs.length,
        estadosOs: estadosOs.length,
        usuarios: usuarios.length,
        osExistentes: osExistentes.length,
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

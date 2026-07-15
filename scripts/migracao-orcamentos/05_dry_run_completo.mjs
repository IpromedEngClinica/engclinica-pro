import { spawn } from "node:child_process";

const steps = [
  ["01_coletar_cabecalhos.mjs"],
  ["02_coletar_itens.mjs"],
  ["06_enriquecer_detalhes_orcamentos.mjs"],
  ["03_validar_staging.mjs"],
  ["04_gerar_relatorios.mjs"],
];

function runStep(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`scripts/migracao-orcamentos/${script}`], {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} terminou com codigo ${code}`));
    });

    child.on("error", reject);
  });
}

for (const [script] of steps) {
  console.log(`\n==> Rodando ${script}`);
  await runStep(script);
}

console.log("\nDry-run completo finalizado. Revise outputs/migracao-orcamentos antes de qualquer import definitivo.");

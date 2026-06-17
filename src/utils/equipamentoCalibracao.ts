import type { EquipamentoSupabase } from "@/services/equipamentosService";

export const getBloqueioCriacaoCalibracao = (
  equipamento?: EquipamentoSupabase | null
) => {
  if (!equipamento) return "Equipamento nao informado.";

  const status = equipamento.status?.trim().toLowerCase();

  if (
    equipamento.ativo === false ||
    status === "desativado" ||
    status === "obsoleto"
  ) {
    return "Nao e possivel criar calibracao para equipamento desativado.";
  }

  if (!equipamento.empresa_id) {
    return "O equipamento nao possui cliente vinculado. Atualize o cadastro antes de criar a calibracao.";
  }

  return null;
};

export type EquipamentoIdentificavel = {
  tipo_texto?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  tipo_equipamento?: {
    nome?: string | null;
  } | null;
};

export const formatarIdentificacaoCompletaEquipamento = (
  equipamento?: EquipamentoIdentificavel | null
) => {
  if (!equipamento) return "-";

  const partes = [
    equipamento.tipo_equipamento?.nome || equipamento.tipo_texto,
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.numero_serie ? `NS: ${equipamento.numero_serie}` : null,
  ].filter(Boolean);

  return partes.length ? partes.join(" - ") : "-";
};

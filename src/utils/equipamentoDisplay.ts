export type EquipamentoDisplay = {
  id?: string | null;
  tipo_texto?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  numeroSerie?: string | null;
  patrimonio?: string | null;
  tag?: string | null;
  ativo?: boolean | null;
  status?: string | null;
  tipo_equipamento?: {
    nome?: string | null;
  } | null;
};

export const getIdentificadorEquipamento = (
  equipamento?: EquipamentoDisplay | null
) => {
  if (!equipamento) return "-";

  return (
    equipamento.numero_serie ||
    equipamento.numeroSerie ||
    equipamento.tag ||
    equipamento.patrimonio ||
    equipamento.modelo ||
    equipamento.id ||
    "-"
  );
};

export const getEquipamentoLabel = (
  equipamento?: EquipamentoDisplay | null
) => {
  if (!equipamento) return "-";

  const tipo =
    equipamento.tipo_equipamento?.nome ||
    equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    equipamento.fabricante,
    equipamento.modelo,
    getIdentificadorEquipamento(equipamento),
  ]
    .filter(Boolean)
    .join(" - ");
};

export const getStatusEquipamentoLabel = (
  equipamento?: EquipamentoDisplay | null
) => {
  if (equipamento?.ativo === false) {
    return "Desativado";
  }

  return equipamento?.status || "Ativo";
};

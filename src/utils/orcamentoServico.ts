type OrcamentoServicoEstruturado = {
  descricao?: string | null;
  observacoes?: string | null;
  tipo_servico_id?: string | null;
  tipo_equipamento_id?: string | null;
  tipo_servico?: { nome?: string | null } | null;
  tipo_equipamento?: { nome?: string | null } | null;
};

const normalize = (value?: string | null) =>
  (value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

export const getDescricaoComplementarServico = (
  item: OrcamentoServicoEstruturado
) => {
  const observacoes = item.observacoes?.trim();
  if (observacoes) return observacoes;

  const descricao = item.descricao?.trim() || "";
  if (!descricao) return "";

  const hasStructuredService = Boolean(item.tipo_servico_id);
  const hasStructuredEquipment = Boolean(item.tipo_equipamento_id);
  if (!hasStructuredService && !hasStructuredEquipment) return descricao;

  // Imported ArkMeds descriptions such as "Em Autoclave Vertical" identify
  // the service target; they are not complementary customer-facing text.
  if (hasStructuredService && /^em\s+/i.test(descricao)) return "";

  const service = item.tipo_servico?.nome?.trim() || "";
  const equipment = item.tipo_equipamento?.nome?.trim() || "";
  const normalizedDescription = normalize(descricao);
  const structuralDescriptions = [
    service,
    equipment,
    [service, equipment].filter(Boolean).join(" - "),
    service && equipment ? `${service} em ${equipment}` : "",
  ]
    .map(normalize)
    .filter(Boolean);

  return structuralDescriptions.includes(normalizedDescription) ? "" : descricao;
};

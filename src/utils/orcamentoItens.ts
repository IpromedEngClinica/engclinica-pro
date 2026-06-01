import type { OrcamentoItemSupabase } from "@/services/orcamentosService";

export const formatDescricaoPecaOrcamento = (item: OrcamentoItemSupabase) => {
  const base = item.peca_nome || item.peca?.nome || item.descricao || "Peca";
  const detalhes: string[] = [];

  if (item.mostrar_fabricante && item.fabricante_texto) {
    detalhes.push(`Fabricante: ${item.fabricante_texto}`);
  }

  if (item.mostrar_modelo && item.modelo_texto) {
    detalhes.push(`Modelo: ${item.modelo_texto}`);
  }

  if (!detalhes.length) return base;

  return `${base} — ${detalhes.join(" — ")}`;
};

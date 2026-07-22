import { describe, expect, it } from "vitest";
import { getDescricaoComplementarServico } from "@/utils/orcamentoServico";

const structuredItem = {
  tipo_servico_id: "tipo-servico",
  tipo_equipamento_id: "tipo-equipamento",
  tipo_servico: { nome: "Manutenção Corretiva" },
  tipo_equipamento: { nome: "Autoclave" },
};

describe("getDescricaoComplementarServico", () => {
  it("oculta o equipamento importado da informacao complementar", () => {
    expect(
      getDescricaoComplementarServico({
        ...structuredItem,
        descricao: "Em Autoclave Vertical",
      })
    ).toBe("");
  });

  it("oculta a descricao estrutural criada pelo formulario", () => {
    expect(
      getDescricaoComplementarServico({
        ...structuredItem,
        descricao: "Manutenção Corretiva - Autoclave",
      })
    ).toBe("");
  });

  it("preserva uma informacao complementar real", () => {
    expect(
      getDescricaoComplementarServico({
        ...structuredItem,
        descricao: "Troca do conjunto de vedação",
      })
    ).toBe("Troca do conjunto de vedação");
  });

  it("prioriza observacoes explicitamente cadastradas", () => {
    expect(
      getDescricaoComplementarServico({
        ...structuredItem,
        descricao: "Em Autoclave Vertical",
        observacoes: "Executar após aprovação das peças.",
      })
    ).toBe("Executar após aprovação das peças.");
  });
});

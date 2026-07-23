import { describe, expect, it } from "vitest";
import {
  montarOpcoesSetor,
  normalizarSetor,
  SEM_SETOR_SELECT_VALUE,
  setorParaDocumento,
} from "@/utils/setor";

describe("setor", () => {
  it("mantem o equipamento sem setor quando essa opcao for escolhida", () => {
    expect(normalizarSetor("Sem setor")).toBe("");
    expect(setorParaDocumento("Sem setor")).toBeNull();
    expect(setorParaDocumento("  Laboratorio  ")).toBe("Laboratorio");
  });

  it("oferece a opcao sem setor antes dos setores do cliente", () => {
    expect(montarOpcoesSetor(["Laboratorio"])).toEqual([
      {
        value: SEM_SETOR_SELECT_VALUE,
        label: "Sem setor",
        searchText: "sem setor vazio nenhum",
      },
      { value: "Laboratorio", label: "Laboratorio" },
    ]);
  });
});

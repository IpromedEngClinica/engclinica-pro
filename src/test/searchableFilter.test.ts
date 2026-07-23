import { describe, expect, it } from "vitest";
import { matchesSearchableFilter } from "@/utils/searchableFilter";

describe("matchesSearchableFilter", () => {
  it("preserva a frase pesquisada quando os termos se repetem", () => {
    expect(
      matchesSearchableFilter("Hospital São João de Deus", "de de")
    ).toBe(true);
    expect(
      matchesSearchableFilter("10º Batalhão de Infantaria", "de de")
    ).toBe(false);
  });

  it("permite combinar termos relevantes não consecutivos", () => {
    expect(
      matchesSearchableFilter(
        "Prefeitura Municipal de Tocantins MG",
        "prefeitura tocantins"
      )
    ).toBe(true);
  });

  it("ignora acentos e pontuação", () => {
    expect(
      matchesSearchableFilter("Clínica São José - 12.345/0001", "clinica sao")
    ).toBe(true);
  });
});

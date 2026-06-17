import { describe, expect, it } from "vitest";
import { formatarIdentificacaoCompletaEquipamento } from "@/utils/equipamentoFormatters";

describe("equipamentoFormatters", () => {
  it("monta a identificacao completa do equipamento", () => {
    expect(
      formatarIdentificacaoCompletaEquipamento({
        tipo_equipamento: { nome: "Balanca" },
        fabricante: "Fabricante",
        modelo: "Modelo X",
        numero_serie: "123",
      })
    ).toBe("Balanca - Fabricante - Modelo X - NS: 123");
  });

  it("omite campos ausentes e usa fallback textual do tipo", () => {
    expect(
      formatarIdentificacaoCompletaEquipamento({
        tipo_texto: "Termometro",
        numero_serie: "ABC",
      })
    ).toBe("Termometro - NS: ABC");
    expect(formatarIdentificacaoCompletaEquipamento(null)).toBe("-");
  });
});

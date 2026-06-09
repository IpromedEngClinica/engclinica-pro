import { describe, expect, it } from "vitest";
import {
  avaliarResultadoSegurancaEletrica,
  calcularResultadoGeralSegurancaEletrica,
  SEGURANCA_ELETRICA_TEMPLATE,
} from "@/utils/segurancaEletricaTemplate";

describe("segurancaEletricaTemplate", () => {
  it("calcula desvio para tensao de rede sem declarar aprovacao", () => {
    const item = SEGURANCA_ELETRICA_TEMPLATE[0];

    const resultado = avaliarResultadoSegurancaEletrica({
      ...item,
      valorRegistrado: 127.13,
    });

    expect(resultado.desvio).toBeCloseTo(-0.13, 6);
    expect(resultado.desvioTexto).toBe("-0,13");
    expect(resultado.resultado).toBe("n/a");
  });

  it("aprova ou reprova itens com limite maximo", () => {
    const resistencia = SEGURANCA_ELETRICA_TEMPLATE.find(
      (item) => item.caracteristica === "Resistência de Terra"
    );

    expect(resistencia).toBeDefined();
    expect(
      avaliarResultadoSegurancaEletrica({
        ...resistencia!,
        valorRegistrado: 0.47,
      }).resultado
    ).toBe("aprovado");
    expect(
      avaliarResultadoSegurancaEletrica({
        ...resistencia!,
        valorRegistrado: 2.1,
      }).resultado
    ).toBe("reprovado");
  });

  it("reprova resultado geral quando ao menos um item falha", () => {
    expect(
      calcularResultadoGeralSegurancaEletrica([
        { resultado: "aprovado" },
        { resultado: "n/a" },
      ])
    ).toBe("aprovado");
    expect(
      calcularResultadoGeralSegurancaEletrica([
        { resultado: "aprovado" },
        { resultado: "reprovado" },
      ])
    ).toBe("reprovado");
  });
});

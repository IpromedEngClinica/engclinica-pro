import { describe, expect, it } from "vitest";
import { calcularProximaExecucao } from "@/utils/planoFrequencia";

describe("calcularProximaExecucao", () => {
  it("soma dias nas frequencias curtas", () => {
    expect(calcularProximaExecucao("2026-06-01", "semanal")).toBe("2026-06-08");
    expect(calcularProximaExecucao("2026-06-01", "quinzenal")).toBe("2026-06-15");
  });

  it("preserva o fim do mes ao adicionar meses", () => {
    expect(calcularProximaExecucao("2026-01-31", "mensal")).toBe("2026-02-28");
    expect(calcularProximaExecucao("2024-02-29", "anual")).toBe("2025-02-28");
  });

  it("calcula frequencias de multiplos meses", () => {
    expect(calcularProximaExecucao("2026-06-01", "quadrimestral")).toBe("2026-10-01");
    expect(calcularProximaExecucao("2026-06-01", "bianual")).toBe("2028-06-01");
  });
});

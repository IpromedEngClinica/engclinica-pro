import { describe, expect, it } from "vitest";
import {
  addDaysToLocalDateTime,
  calcularValidadeFimDoMes,
  localDateTimeToIso,
  toLocalDateTimeInput,
} from "@/utils/planoDatas";

describe("datas e horarios dos planos", () => {
  it("preserva o horario ao calcular o fechamento previsto", () => {
    expect(addDaysToLocalDateTime("2026-06-10T14:30", 3)).toBe("2026-06-13T14:30");
  });

  it("converte data local para ISO e volta para o campo do formulario", () => {
    const iso = localDateTimeToIso("2026-06-10T14:30");
    expect(toLocalDateTimeInput(iso)).toBe("2026-06-10T14:30");
  });

  it("define a validade no ultimo dia do mes apos o periodo", () => {
    expect(calcularValidadeFimDoMes("2026-06-11T09:00:00-03:00", 12)).toBe("2027-06-30");
  });
});

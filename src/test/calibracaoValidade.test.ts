import { describe, expect, it } from "vitest";
import {
  fimDoMesValidade,
  formatarDataPadrao,
  formatarMesAno,
  mesValidadeAposMeses,
  primeiroDiaMesValidade,
} from "@/utils/calibracaoValidade";

describe("calibracaoValidade", () => {
  it("calcula validade mensal padrao em doze meses", () => {
    expect(mesValidadeAposMeses(new Date(2026, 5, 15))).toBe("2027-06");
  });

  it("persiste o primeiro dia e calcula o fim do mes para alertas", () => {
    expect(primeiroDiaMesValidade("2027-06")).toBe("2027-06-01");
    expect(fimDoMesValidade("2027-06")).toBe("2027-06-30");
    expect(fimDoMesValidade("2028-02")).toBe("2028-02-29");
  });

  it("formata validade como mes e ano", () => {
    expect(formatarMesAno("2027-06-01")).toBe("06/2027");
  });

  it("formata validade do padrao com separadores explicitos", () => {
    expect(formatarDataPadrao("2027-01-30")).toBe("30 - 01 - 2027");
  });
});

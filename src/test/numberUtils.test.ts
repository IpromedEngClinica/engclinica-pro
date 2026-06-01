import { describe, expect, it } from "vitest";
import {
  formatDecimalPtBr,
  getVeffForCalculation,
  isInfiniteInput,
  normalizeDecimalInput,
  parseVeffInput,
  requireDecimal,
} from "@/utils/numberUtils";

describe("numberUtils", () => {
  it.each([
    ["20,8", 20.8],
    ["20.8", 20.8],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    [" 1 234,56 ", 1234.56],
    [1234.56, 1234.56],
  ])("normaliza %s", (value, expected) => {
    expect(normalizeDecimalInput(value)).toBe(expected);
  });

  it.each([null, undefined, "", " ", "abc", Number.NaN, Infinity])(
    "rejeita %s",
    (value) => {
      expect(normalizeDecimalInput(value)).toBeNull();
    }
  );

  it("exige valor decimal valido", () => {
    expect(() => requireDecimal("abc", '"Valor nominal"')).toThrow(
      'Valor inválido em "Valor nominal".'
    );
  });

  it("formata valores para exibicao pt-BR", () => {
    expect(formatDecimalPtBr(1234.56)).toBe("1.234,56");
    expect(formatDecimalPtBr("20.95000000")).toBe("20,95");
    expect(formatDecimalPtBr(null)).toBe("");
  });

  it.each(["inf", "INF", " infinito ", "Infinity", "∞"])(
    "identifica veff infinito em %s",
    (value) => {
      expect(isInfiniteInput(value)).toBe(true);
      expect(parseVeffInput(value)).toEqual({
        value: null,
        infinito: true,
      });
    }
  );

  it("mantem veff numerico como valor finito", () => {
    expect(parseVeffInput("1.234,56")).toEqual({
      value: 1234.56,
      infinito: false,
    });
  });

  it("mantem veff vazio ou invalido identificavel para validacao", () => {
    expect(parseVeffInput("")).toEqual({ value: null, infinito: false });
    expect(parseVeffInput("abc")).toEqual({ value: null, infinito: false });
  });

  it("converte veff infinito ou ausente para calculos em memoria", () => {
    expect(
      getVeffForCalculation({
        graus_liberdade_efetivos_veff: null,
        veff_infinito: true,
      })
    ).toBe(Number.POSITIVE_INFINITY);
    expect(
      getVeffForCalculation({
        graus_liberdade_efetivos_veff: 30,
        veff_infinito: false,
      })
    ).toBe(30);
    expect(
      getVeffForCalculation({
        graus_liberdade_efetivos_veff: null,
        veff_infinito: false,
      })
    ).toBe(Number.POSITIVE_INFINITY);
  });
});

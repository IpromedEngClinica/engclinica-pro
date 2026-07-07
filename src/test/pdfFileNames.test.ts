import { describe, expect, it } from "vitest";
import { buildPdfFileName } from "@/utils/pdfFileNames";

describe("pdfFileNames", () => {
  it("monta nomes legiveis e seguros para download", () => {
    expect(
      buildPdfFileName("OS", [
        { value: 55824, fallback: "sem-numero" },
        { value: "Clínica Dra. Thaís / Lima", fallback: "cliente" },
        { value: "Ultrassom Fisioterapêutico", fallback: "equipamento" },
        { value: "0444790012", fallback: "sem-ns" },
      ])
    ).toBe(
      "OS - 55824-Clinica Dra. Thais Lima-Ultrassom Fisioterapeutico-0444790012.pdf"
    );
  });

  it("mantem o padrao quando numero de serie estiver vazio", () => {
    expect(
      buildPdfFileName("CAL", [
        { value: "000123-R001", fallback: "sem-numero" },
        { value: "Cliente Teste", fallback: "cliente" },
        { value: "Termômetro", fallback: "equipamento" },
        { value: "", fallback: "sem-ns" },
      ])
    ).toBe("CAL - 000123-R001-Cliente Teste-Termometro-sem-ns.pdf");
  });
});

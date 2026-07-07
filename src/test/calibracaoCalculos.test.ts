import { describe, expect, it } from "vitest";
import {
  avaliarConformidade,
  arredondarParaAlgarismosSignificativos,
  arredondarParaCasas,
  calcularResultadoGeralCalibracao,
  calcularDesvioPadraoAmostral,
  calcularIncertezaResolucao,
  calcularIncertezaTipoA,
  calcularMedia,
  calcularPontoCalibracao,
  converterIncertezaExpandida,
  encontrarPontoPadraoExato,
  encontrarPontoPadraoMaisProximo,
  obterCasasDecimaisAlgarismosSignificativos,
  obterCasasDecimaisIncerteza,
  selecionarPontoPadraoReferencia,
} from "@/utils/calibracaoCalculos";
import { calcularFatorStudentT95 } from "@/utils/studentT";

describe("calibracaoCalculos", () => {
  it("calcula media e tendencia bruta para uma leitura", () => {
    const resultado = calcularPontoCalibracao({
      valorNominal: 18,
      leituras: [17.9],
      pontoPadrao: {
        valorNominal: 18,
        tendencia: 0,
        incertezaExpandida: 0.2,
        fatorAbrangenciaK: 1.96,
        veffInfinito: true,
      },
      fatorModo: "calcular_95",
    });

    expect(resultado.media).toBeCloseTo(17.9);
    expect(resultado.tendenciaBruta).toBeCloseTo(-0.1);
    expect(resultado.resultadoConformidade).toBe("sem_criterio");
  });

  it("calcula repetibilidade para leituras repetidas", () => {
    expect(calcularMedia([23.1, 23.2, 23.3])).toBeCloseTo(23.2);
    expect(calcularDesvioPadraoAmostral([23.1, 23.2, 23.3])).toBeCloseTo(0.1);
    expect(calcularIncertezaTipoA([23.1, 23.2, 23.3])).toBeCloseTo(
      0.1 / Math.sqrt(3)
    );
  });

  it("converte a incerteza expandida do padrao para incerteza padrao", () => {
    expect(converterIncertezaExpandida(0.2, 1.96)).toBeCloseTo(0.2 / 1.96);
  });

  it("calcula componente de resolucao retangular", () => {
    expect(calcularIncertezaResolucao(0.1)).toBeCloseTo(0.1 / Math.sqrt(12));
  });

  it("usa t-Student auditavel e limite normal para veff infinito", () => {
    expect(calcularFatorStudentT95(3)).toBe(3.182);
    expect(calcularFatorStudentT95(Number.POSITIVE_INFINITY)).toBe(1.96);
  });

  it("avalia conformidade considerando incerteza", () => {
    expect(
      avaliarConformidade({
        tendenciaCorrigida: 0.4,
        incertezaExpandida: 0.5,
        valorNominal: 20,
        criterio: {
          aplicar: true,
          tipo: "absoluto",
          valorMaximo: 1,
          regraDecisao: "considerando_incerteza",
        },
      })
    ).toEqual({ resultado: "conforme", limite: 1 });
  });

  it("usa fator k manual e aplica correcao sistematica do padrao", () => {
    const resultado = calcularPontoCalibracao({
      valorNominal: 10,
      leituras: [10.5],
      pontoPadrao: {
        valorNominal: 10,
        tendencia: 0.2,
        incertezaExpandida: 0.1,
        fatorAbrangenciaK: 2,
      },
      corrigirErroSistematico: true,
      fatorModo: "manual_execucao",
      fatorK: 3,
    });

    expect(resultado.correcaoPadrao).toBeCloseTo(-0.2);
    expect(resultado.tendenciaCorrigida).toBeCloseTo(0.3);
    expect(resultado.incertezaExpandida).toBeCloseTo(resultado.uc * 3);
  });

  it("encontra somente ponto nominal exato do padrao", () => {
    const pontos = [{ valorNominal: 23 }, { valorNominal: 25 }];
    expect(encontrarPontoPadraoExato(23, pontos)?.valorNominal).toBe(23);
    expect(encontrarPontoPadraoExato(24, pontos)).toBeUndefined();
  });

  it("usa o ponto mais proximo do padrao quando nao existe nominal exato", () => {
    const pontos = [{ valorNominal: 50 }, { valorNominal: 100 }];
    expect(encontrarPontoPadraoMaisProximo(70, pontos)?.valorNominal).toBe(50);
    expect(selecionarPontoPadraoReferencia(70, pontos)?.valorNominal).toBe(50);
    expect(selecionarPontoPadraoReferencia(100, pontos)?.valorNominal).toBe(100);
  });

  it("reporta incerteza com as casas decimais textuais do padrao", () => {
    expect(obterCasasDecimaisIncerteza("0,20", 0.2)).toBe(2);
    expect(obterCasasDecimaisIncerteza("1", 1)).toBe(0);
    expect(arredondarParaCasas(0.183746, 1)).toBe(0.2);
    expect(arredondarParaCasas(0.04731, 2)).toBe(0.05);
  });

  it("reporta incerteza expandida com no maximo dois algarismos significativos", () => {
    expect(arredondarParaAlgarismosSignificativos(0.183746, 2)).toBe(0.18);
    expect(arredondarParaAlgarismosSignificativos(0.04731, 2)).toBe(0.047);
    expect(arredondarParaAlgarismosSignificativos(12.374, 2)).toBe(12);
    expect(obterCasasDecimaisAlgarismosSignificativos(0.047, 2)).toBe(3);
    expect(obterCasasDecimaisAlgarismosSignificativos(0.18, 2)).toBe(2);

    const resultado = calcularPontoCalibracao({
      valorNominal: 10,
      leituras: [10],
      pontoPadrao: {
        valorNominal: 10,
        incertezaExpandida: 0.2,
        incertezaExpandidaTexto: "0,20",
        fatorAbrangenciaK: 2,
      },
      fatorModo: "k_fixo",
      fatorK: 1.83746,
    });

    expect(resultado.incertezaExpandidaCalculada).toBeCloseTo(0.183746);
    expect(resultado.incertezaExpandidaReportada).toBe(0.18);
    expect(resultado.casasDecimaisIncerteza).toBe(2);
  });

  it("gera resultado geral sem declaracao quando nenhuma tabela possui criterio", () => {
    expect(
      calcularResultadoGeralCalibracao(["sem_criterio", "sem_criterio"])
    ).toBe("sem_declaracao_conformidade");
  });

  it("avalia somente tabelas com criterio no resultado geral", () => {
    expect(
      calcularResultadoGeralCalibracao(["sem_criterio", "conforme"])
    ).toBe("conforme");
    expect(
      calcularResultadoGeralCalibracao(["sem_criterio", "nao_conforme"])
    ).toBe("nao_conforme");
  });
});

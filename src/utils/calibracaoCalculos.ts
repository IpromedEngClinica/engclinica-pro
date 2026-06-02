import { calcularFatorStudentT95 } from "@/utils/studentT";

export type CategoriaComponenteIncerteza = "tipo_a" | "tipo_b";
export type DistribuicaoComponenteIncerteza =
  | "normal"
  | "retangular"
  | "triangular"
  | "t_student"
  | "outra";
export type RegraDecisao =
  | "aceitacao_simples"
  | "considerando_incerteza"
  | "personalizada";
export type ResultadoConformidade = "conforme" | "nao_conforme" | "sem_criterio";
export type ResultadoGeralCalibracao =
  | "conforme"
  | "nao_conforme"
  | "sem_declaracao_conformidade";

export const calcularResultadoGeralCalibracao = (
  resultados: Array<ResultadoConformidade | null>
): ResultadoGeralCalibracao | null => {
  if (!resultados.length || resultados.some((resultado) => !resultado)) {
    return null;
  }
  const resultadosComCriterio = resultados.filter(
    (resultado) => resultado !== "sem_criterio"
  );
  if (!resultadosComCriterio.length) return "sem_declaracao_conformidade";
  return resultadosComCriterio.some((resultado) => resultado === "nao_conforme")
    ? "nao_conforme"
    : "conforme";
};

export type ComponenteIncerteza = {
  nome: string;
  categoria: CategoriaComponenteIncerteza;
  distribuicao?: DistribuicaoComponenteIncerteza | null;
  valorOrigem?: number | null;
  divisor?: number | null;
  coeficienteSensibilidade?: number;
  incertezaPadrao: number;
  grausLiberdade?: number | null;
  infinito?: boolean;
  origem?: string | null;
};

export type PontoPadraoCalculo = {
  valorNominal: number;
  valorNominalTexto?: string | null;
  tendencia?: number | null;
  incertezaExpandida?: number | null;
  incertezaExpandidaTexto?: string | null;
  fatorAbrangenciaK?: number | null;
  grausLiberdade?: number | null;
  veffInfinito?: boolean;
};

export type CriterioAceitacaoCalculo = {
  aplicar: boolean;
  tipo?: "absoluto" | "percentual" | "faixa" | null;
  valorMaximo?: number | null;
  valorMinimo?: number | null;
  regraDecisao?: RegraDecisao | null;
};

export type CalcularPontoInput = {
  valorNominal: number;
  leituras: number[];
  pontoPadrao: PontoPadraoCalculo;
  resolucaoEquipamento?: number | null;
  resolucaoPadrao?: number | null;
  corrigirErroSistematico?: boolean;
  fatorModo: "calcular_95" | "k_fixo" | "manual_execucao";
  fatorK?: number | null;
  criterio?: CriterioAceitacaoCalculo;
  outrasComponentes?: ComponenteIncerteza[];
};

export const calcularMedia = (valores: number[]) => {
  if (!valores.length) return null;
  return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
};

export const calcularDesvioPadraoAmostral = (valores: number[]) => {
  if (valores.length < 2) return 0;
  const media = calcularMedia(valores) as number;
  const somaQuadrados = valores.reduce(
    (acc, valor) => acc + Math.pow(valor - media, 2),
    0
  );
  return Math.sqrt(somaQuadrados / (valores.length - 1));
};

export const calcularIncertezaTipoA = (valores: number[]) => {
  if (!valores.length) return null;
  return calcularDesvioPadraoAmostral(valores) / Math.sqrt(valores.length);
};

export const arredondarParaCasas = (valor: number, casas: number) => {
  const fator = Math.pow(10, casas);
  return Math.round((valor + Number.EPSILON) * fator) / fator;
};

export const obterCasasDecimaisIncerteza = (
  valorTexto?: string | null,
  valorFallback?: number | null
) => {
  const texto = valorTexto?.trim() || (
    valorFallback == null
      ? ""
      : valorFallback.toLocaleString("en-US", {
          maximumFractionDigits: 20,
          useGrouping: false,
        })
  );
  const mantissa = texto.replace(/\s/g, "").split(/[eE]/)[0];
  const separador = Math.max(mantissa.lastIndexOf(","), mantissa.lastIndexOf("."));
  return separador < 0 ? 0 : mantissa.length - separador - 1;
};

export const converterIncertezaExpandida = (
  incertezaExpandida: number,
  fatorAbrangenciaK: number
) => {
  if (fatorAbrangenciaK <= 0) throw new Error("Fator k do padrao invalido.");
  return incertezaExpandida / fatorAbrangenciaK;
};

export const calcularIncertezaResolucao = (resolucao?: number | null) => {
  if (!resolucao) return 0;
  // Quantizacao com distribuicao retangular: intervalo total dividido por sqrt(12).
  return Math.abs(resolucao) / Math.sqrt(12);
};

export const calcularIncertezaCombinada = (
  componentes: Array<{
    incertezaPadrao: number;
    coeficienteSensibilidade?: number;
  }>
) => {
  const soma = componentes.reduce((acc, componente) => {
    const c = componente.coeficienteSensibilidade ?? 1;
    return acc + Math.pow(c * componente.incertezaPadrao, 2);
  }, 0);
  return Math.sqrt(soma);
};

export const calcularVeff = (
  uc: number,
  componentes: Array<{
    incertezaPadrao: number;
    coeficienteSensibilidade?: number;
    grausLiberdade?: number | null;
    infinito?: boolean;
  }>
) => {
  const denominador = componentes.reduce((acc, componente) => {
    if (componente.infinito) return acc;
    const vi = componente.grausLiberdade;
    if (!vi || vi <= 0) return acc;
    const c = componente.coeficienteSensibilidade ?? 1;
    return acc + Math.pow(c * componente.incertezaPadrao, 4) / vi;
  }, 0);

  return denominador === 0 ? Number.POSITIVE_INFINITY : Math.pow(uc, 4) / denominador;
};

export const encontrarPontoPadraoExato = (
  valorNominal: number,
  pontos: PontoPadraoCalculo[]
) => pontos.find((ponto) => Math.abs(ponto.valorNominal - valorNominal) < 1e-10);

const calcularLimiteCriterio = (
  valorNominal: number,
  criterio: CriterioAceitacaoCalculo
) => {
  if (criterio.tipo === "percentual") {
    return Math.abs(valorNominal) * ((criterio.valorMaximo || 0) / 100);
  }
  return criterio.valorMaximo ?? null;
};

export const avaliarConformidade = ({
  criterio,
  incertezaExpandida,
  tendenciaCorrigida,
  valorNominal,
}: {
  criterio?: CriterioAceitacaoCalculo;
  incertezaExpandida: number;
  tendenciaCorrigida: number;
  valorNominal: number;
}): { resultado: ResultadoConformidade; limite: number | null } => {
  if (!criterio?.aplicar) return { resultado: "sem_criterio", limite: null };
  if (!criterio.regraDecisao) throw new Error("Informe a regra de decisao.");
  if (criterio.regraDecisao === "personalizada") {
    throw new Error("A regra de decisao personalizada exige avaliacao manual.");
  }

  if (criterio.tipo === "faixa") {
    if (criterio.valorMinimo == null || criterio.valorMaximo == null) {
      throw new Error("Informe os limites do criterio de aceitacao.");
    }
    const margem =
      criterio.regraDecisao === "considerando_incerteza" ? incertezaExpandida : 0;
    const conforme =
      tendenciaCorrigida - margem >= criterio.valorMinimo &&
      tendenciaCorrigida + margem <= criterio.valorMaximo;
    return { resultado: conforme ? "conforme" : "nao_conforme", limite: criterio.valorMaximo };
  }

  const limite = calcularLimiteCriterio(valorNominal, criterio);
  if (limite == null) throw new Error("Informe o limite do criterio de aceitacao.");
  const erro = Math.abs(tendenciaCorrigida);
  const valorComparado =
    criterio.regraDecisao === "considerando_incerteza"
      ? erro + incertezaExpandida
      : erro;
  return { resultado: valorComparado <= limite ? "conforme" : "nao_conforme", limite };
};

export const calcularPontoCalibracao = (input: CalcularPontoInput) => {
  if (!input.leituras.length) throw new Error("Informe ao menos uma leitura.");
  if (input.pontoPadrao.incertezaExpandida == null) {
    throw new Error("O ponto correspondente do padrao nao possui incerteza expandida.");
  }
  if (!input.pontoPadrao.fatorAbrangenciaK) {
    throw new Error("O ponto correspondente do padrao nao possui fator k valido.");
  }

  const media = calcularMedia(input.leituras) as number;
  const desvioPadrao = calcularDesvioPadraoAmostral(input.leituras);
  const uTipoA = calcularIncertezaTipoA(input.leituras) as number;
  const uPadrao = converterIncertezaExpandida(
    input.pontoPadrao.incertezaExpandida,
    input.pontoPadrao.fatorAbrangenciaK
  );
  const uResolucaoEquipamento = calcularIncertezaResolucao(
    input.resolucaoEquipamento
  );
  const uResolucaoPadrao = calcularIncertezaResolucao(input.resolucaoPadrao);
  const tendenciaBruta = media - input.valorNominal;
  const correcaoPadrao = input.corrigirErroSistematico
    ? -(input.pontoPadrao.tendencia || 0)
    : 0;
  const tendenciaCorrigida = tendenciaBruta + correcaoPadrao;

  const componentes: ComponenteIncerteza[] = [
    {
      nome: "Repetibilidade",
      categoria: "tipo_a",
      distribuicao: "t_student",
      valorOrigem: desvioPadrao,
      divisor: Math.sqrt(input.leituras.length),
      incertezaPadrao: uTipoA,
      grausLiberdade: input.leituras.length > 1 ? input.leituras.length - 1 : null,
      infinito: input.leituras.length <= 1,
      origem: "Leituras repetidas",
    },
    {
      nome: "Certificado do padrao",
      categoria: "tipo_b",
      distribuicao: "normal",
      valorOrigem: input.pontoPadrao.incertezaExpandida,
      divisor: input.pontoPadrao.fatorAbrangenciaK,
      incertezaPadrao: uPadrao,
      grausLiberdade: input.pontoPadrao.grausLiberdade,
      infinito: input.pontoPadrao.veffInfinito ?? !input.pontoPadrao.grausLiberdade,
      origem: "Certificado do padrao",
    },
    {
      nome: "Resolucao do equipamento",
      categoria: "tipo_b",
      distribuicao: "retangular",
      valorOrigem: input.resolucaoEquipamento ?? 0,
      divisor: Math.sqrt(12),
      incertezaPadrao: uResolucaoEquipamento,
      infinito: true,
      origem: "Resolucao declarada no procedimento",
    },
    {
      nome: "Resolucao do padrao",
      categoria: "tipo_b",
      distribuicao: "retangular",
      valorOrigem: input.resolucaoPadrao ?? 0,
      divisor: Math.sqrt(12),
      incertezaPadrao: uResolucaoPadrao,
      infinito: true,
      origem: "Resolucao declarada no procedimento",
    },
    ...(input.outrasComponentes || []),
  ];

  const uc = calcularIncertezaCombinada(componentes);
  const veff = calcularVeff(uc, componentes);
  const fatorK =
    input.fatorModo === "calcular_95"
      ? calcularFatorStudentT95(veff)
      : input.fatorK;
  if (!fatorK || fatorK <= 0) throw new Error("Informe um fator k valido.");
  const incertezaExpandidaCalculada = uc * fatorK;
  const casasDecimaisIncerteza = obterCasasDecimaisIncerteza(
    input.pontoPadrao.incertezaExpandidaTexto,
    input.pontoPadrao.incertezaExpandida
  );
  const incertezaExpandidaReportada = arredondarParaCasas(
    incertezaExpandidaCalculada,
    casasDecimaisIncerteza
  );
  const conformidade = avaliarConformidade({
    criterio: input.criterio,
    incertezaExpandida: incertezaExpandidaCalculada,
    tendenciaCorrigida,
    valorNominal: input.valorNominal,
  });

  return {
    media,
    desvioPadrao,
    uTipoA,
    tendenciaBruta,
    correcaoPadrao,
    tendenciaCorrigida,
    uPadrao,
    uResolucaoEquipamento,
    uResolucaoPadrao,
    uc,
    veff,
    veffInfinito: !Number.isFinite(veff),
    fatorK,
    incertezaExpandida: incertezaExpandidaCalculada,
    incertezaExpandidaCalculada,
    incertezaExpandidaReportada,
    casasDecimaisIncerteza,
    criterioAceitacaoValor: conformidade.limite,
    resultadoConformidade: conformidade.resultado,
    componentes,
  };
};

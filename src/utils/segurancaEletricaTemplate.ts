export type SegurancaEletricaResultadoStatus = "aprovado" | "reprovado" | "n/a";

export type SegurancaEletricaTemplateItem = {
  grupo: string;
  caracteristica: string;
  unidade: "V" | "A" | "Ω" | "µA";
  valorEsperadoTexto: string;
  valorEsperadoNumero?: number | null;
  operadorLimite?: "<=" | null;
};

export type SegurancaEletricaResultadoInput = SegurancaEletricaTemplateItem & {
  valorRegistrado?: number | null;
  valorRegistradoTexto?: string | null;
  desvio?: number | null;
  desvioTexto?: string | null;
  resultado?: SegurancaEletricaResultadoStatus;
};

export const SEGURANCA_ELETRICA_TEMPLATE: SegurancaEletricaTemplateItem[] = [
  {
    grupo: "Tensão de rede",
    caracteristica: "Tensão Rede Pol. Reversa",
    unidade: "V",
    valorEsperadoTexto: "127,00",
    valorEsperadoNumero: 127,
  },
  {
    grupo: "Tensão de rede",
    caracteristica: "Tensão Rede Pol. Normal",
    unidade: "V",
    valorEsperadoTexto: "127,00",
    valorEsperadoNumero: 127,
  },
  {
    grupo: "Isolação das partes aplicadas",
    caracteristica: "Corrente de Consumo",
    unidade: "A",
    valorEsperadoTexto: "1,00",
    valorEsperadoNumero: 1,
    operadorLimite: "<=",
  },
  {
    grupo: "Isolação das partes aplicadas",
    caracteristica: "Resistência de Terra",
    unidade: "Ω",
    valorEsperadoTexto: "≤ 2",
    valorEsperadoNumero: 2,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga para o terra",
    caracteristica: "Pol. Normal",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga para o terra",
    caracteristica: "Pol. Normal sem L2.",
    unidade: "µA",
    valorEsperadoTexto: "≤ 1000",
    valorEsperadoNumero: 1000,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga para o terra",
    caracteristica: "Pol. Reversa",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga para o terra",
    caracteristica: "Pol. Reversa em L2",
    unidade: "µA",
    valorEsperadoTexto: "≤ 1000",
    valorEsperadoNumero: 1000,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Normal",
    unidade: "µA",
    valorEsperadoTexto: "≤ 100",
    valorEsperadoNumero: 100,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Normal sem L2.",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Normal sem Terra",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Reversa",
    unidade: "µA",
    valorEsperadoTexto: "≤ 100",
    valorEsperadoNumero: 100,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Reversa em L2",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pela carcaça e terra",
    caracteristica: "Pol. Reversa sem Terra",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Normal",
    unidade: "µA",
    valorEsperadoTexto: "≤ 100",
    valorEsperadoNumero: 100,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Normal sem L2.",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Normal sem Terra",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Reversa",
    unidade: "µA",
    valorEsperadoTexto: "≤ 100",
    valorEsperadoNumero: 100,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Reversa em L2",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
  {
    grupo: "Corrente de fuga pelo cabo e terra",
    caracteristica: "Pol. Reversa sem Terra",
    unidade: "µA",
    valorEsperadoTexto: "≤ 500",
    valorEsperadoNumero: 500,
    operadorLimite: "<=",
  },
];

export const criarResultadosSegurancaEletricaVazios = () =>
  SEGURANCA_ELETRICA_TEMPLATE.map((item) => ({
    ...item,
    valorRegistrado: null,
    valorRegistradoTexto: "",
    desvio: null,
    desvioTexto: "N/A",
    resultado: "n/a" as SegurancaEletricaResultadoStatus,
  }));

export const formatDecimalSeguranca = (
  value?: number | null,
  minimumFractionDigits = 2
) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }

  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
};

export const avaliarResultadoSegurancaEletrica = (
  item: SegurancaEletricaResultadoInput
) => {
  const valor = item.valorRegistrado;
  const esperado = item.valorEsperadoNumero;

  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return {
      desvio: null,
      desvioTexto: "N/A",
      resultado: "n/a" as SegurancaEletricaResultadoStatus,
    };
  }

  if (item.operadorLimite === "<=" && esperado !== null && esperado !== undefined) {
    return {
      desvio: null,
      desvioTexto: "N/A",
      resultado:
        Number(valor) <= Number(esperado)
          ? ("aprovado" as const)
          : ("reprovado" as const),
    };
  }

  if (esperado !== null && esperado !== undefined) {
    const desvio = Number(esperado) - Number(valor);
    return {
      desvio,
      desvioTexto: formatDecimalSeguranca(desvio),
      resultado: "n/a" as SegurancaEletricaResultadoStatus,
    };
  }

  return {
    desvio: null,
    desvioTexto: "N/A",
    resultado: "n/a" as SegurancaEletricaResultadoStatus,
  };
};

export const calcularResultadoGeralSegurancaEletrica = (
  resultados: Array<{ resultado?: SegurancaEletricaResultadoStatus | null }>
) =>
  resultados.some((item) => item.resultado === "reprovado")
    ? ("reprovado" as const)
    : ("aprovado" as const);

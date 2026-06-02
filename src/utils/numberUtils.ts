export const normalizeDecimalInput = (
  value: string | number | null | undefined
): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  let normalized = raw.replace(/\s/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const requireDecimal = (
  value: string | number | null | undefined,
  fieldName: string
): number => {
  const parsed = normalizeDecimalInput(value);

  if (parsed === null) {
    throw new Error(`Valor inválido em ${fieldName}.`);
  }

  return parsed;
};

export const formatDecimalPtBr = (
  value: number | string | null | undefined,
  maximumFractionDigits = 8,
  minimumFractionDigits = 0
) => {
  const parsed = normalizeDecimalInput(value);

  if (parsed === null) return "";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: Math.max(maximumFractionDigits, minimumFractionDigits),
    minimumFractionDigits,
  }).format(parsed);
};

export const contarCasasDecimaisTexto = (
  value: string | number | null | undefined
) => {
  if (value === null || value === undefined) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const index = Math.max(lastComma, lastDot);

  return index < 0 ? 0 : cleaned.slice(index + 1).length;
};

export const obterCasasResolucaoEquipamento = (
  resolucaoTexto?: string | null,
  resolucaoNumerica?: number | null
) => {
  if (resolucaoTexto?.trim()) {
    return contarCasasDecimaisTexto(resolucaoTexto);
  }

  if (resolucaoNumerica === null || resolucaoNumerica === undefined) {
    return 0;
  }

  const [coeficiente, expoenteTexto] = String(resolucaoNumerica)
    .toLowerCase()
    .split("e");
  const expoente = Number(expoenteTexto || 0);

  return Math.max(0, contarCasasDecimaisTexto(coeficiente) - expoente);
};

export const formatarNumeroComCasas = (
  value: number | null | undefined,
  casas: number
) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(value);
};

export const maiorQuantidadeCasas = (
  valores: Array<string | number | null | undefined>
) =>
  valores.reduce(
    (maior, valor) => Math.max(maior, contarCasasDecimaisTexto(valor)),
    0
  );

export const isInfiniteInput = (
  value: string | number | null | undefined
) => {
  if (value === null || value === undefined) return false;

  const normalized = String(value).trim().toLowerCase().replace(/\s/g, "");

  return ["inf", "infinito", "infinity", "∞"].includes(normalized);
};

export const parseVeffInput = (
  value: string | number | null | undefined
): {
  value: number | null;
  infinito: boolean;
} => {
  if (isInfiniteInput(value)) {
    return {
      value: null,
      infinito: true,
    };
  }

  return {
    value: normalizeDecimalInput(value),
    infinito: false,
  };
};

export const getVeffForCalculation = (ponto: {
  graus_liberdade_efetivos_veff: number | null;
  veff_infinito: boolean;
}) => {
  if (ponto.veff_infinito) {
    return Number.POSITIVE_INFINITY;
  }

  return ponto.graus_liberdade_efetivos_veff ?? Number.POSITIVE_INFINITY;
};

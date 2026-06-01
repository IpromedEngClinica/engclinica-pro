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
  maximumFractionDigits = 8
) => {
  const parsed = normalizeDecimalInput(value);

  if (parsed === null) return "";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(parsed);
};

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

export const FREQUENCIAS_PLANO = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "quadrimestral", label: "Quadrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "bianual", label: "Bianual" },
] as const;

export type PlanoFrequencia = (typeof FREQUENCIAS_PLANO)[number]["value"];

const parseDate = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data invalida.");
  return date;
};

const toDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

export const calcularProximaExecucao = (
  dataAtual: string | Date,
  frequencia: PlanoFrequencia
) => {
  const date = parseDate(dataAtual);
  if (frequencia === "semanal" || frequencia === "quinzenal") {
    date.setDate(date.getDate() + (frequencia === "semanal" ? 7 : 14));
    return toDateOnly(date);
  }
  const meses: Record<Exclude<PlanoFrequencia, "semanal" | "quinzenal">, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    quadrimestral: 4,
    semestral: 6,
    anual: 12,
    bianual: 24,
  };
  return toDateOnly(addMonths(date, meses[frequencia]));
};

export const getPlanoFrequenciaLabel = (frequencia: PlanoFrequencia) =>
  FREQUENCIAS_PLANO.find((item) => item.value === frequencia)?.label || frequencia;

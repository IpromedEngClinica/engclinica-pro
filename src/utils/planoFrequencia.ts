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

export const getPlanoFrequenciaLabel = (value?: string | null) =>
  FREQUENCIAS_PLANO.find((item) => item.value === value)?.label || "-";

const addMonthsPreservingDay = (date: Date, months: number) => {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + months);
  const lastDay = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
  copy.setDate(Math.min(day, lastDay));
  return copy;
};

export const calcularProximaData = (
  dataBase: string | Date,
  frequencia: PlanoFrequencia
) => {
  const base = typeof dataBase === "string"
    ? new Date(`${dataBase.slice(0, 10)}T00:00:00`)
    : new Date(dataBase);

  if (Number.isNaN(base.getTime())) {
    throw new Error("Data base invalida.");
  }

  const next = new Date(base);
  if (frequencia === "semanal") next.setDate(next.getDate() + 7);
  else if (frequencia === "quinzenal") next.setDate(next.getDate() + 15);
  else if (frequencia === "mensal") return addMonthsPreservingDay(base, 1).toISOString().slice(0, 10);
  else if (frequencia === "bimestral") return addMonthsPreservingDay(base, 2).toISOString().slice(0, 10);
  else if (frequencia === "trimestral") return addMonthsPreservingDay(base, 3).toISOString().slice(0, 10);
  else if (frequencia === "quadrimestral") return addMonthsPreservingDay(base, 4).toISOString().slice(0, 10);
  else if (frequencia === "semestral") return addMonthsPreservingDay(base, 6).toISOString().slice(0, 10);
  else if (frequencia === "anual") return addMonthsPreservingDay(base, 12).toISOString().slice(0, 10);
  else if (frequencia === "bianual") return addMonthsPreservingDay(base, 24).toISOString().slice(0, 10);

  return next.toISOString().slice(0, 10);
};

export const gerarDatasPrevistasNoPeriodo = ({
  dataInicial,
  frequencia,
  inicioPeriodo,
  fimPeriodo,
}: {
  dataInicial: string;
  frequencia: PlanoFrequencia;
  inicioPeriodo: string;
  fimPeriodo: string;
}) => {
  const inicio = new Date(`${inicioPeriodo}T00:00:00`);
  const fim = new Date(`${fimPeriodo}T23:59:59`);
  let cursor = new Date(`${dataInicial.slice(0, 10)}T00:00:00`);
  const previstas: string[] = [];

  if (
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fim.getTime()) ||
    Number.isNaN(cursor.getTime())
  ) {
    return previstas;
  }

  let guard = 0;
  while (cursor < inicio && guard < 600) {
    cursor = new Date(`${calcularProximaData(cursor, frequencia)}T00:00:00`);
    guard += 1;
  }

  while (cursor <= fim && guard < 900) {
    previstas.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(`${calcularProximaData(cursor, frequencia)}T00:00:00`);
    guard += 1;
  }

  return previstas;
};

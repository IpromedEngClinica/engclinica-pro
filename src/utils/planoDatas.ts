const parseDateValue = (value: string) =>
  new Date(value.includes("T") ? value : `${value}T00:00:00`);

export const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const localDateTimeToIso = (value: string) => {
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data e horario invalidos.");
  return date.toISOString();
};

export const addDaysToLocalDateTime = (value: string, days: number) => {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + days);
  return toLocalDateTimeInput(date.toISOString());
};

export const formatDateValue = (value?: string | null) => {
  if (!value) return "-";
  const date = parseDateValue(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
};

export const formatDateTimeValue = (value?: string | null) => {
  if (!value) return "-";
  const date = parseDateValue(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const calcularValidadeFimDoMes = (dataBase: string, meses: number) => {
  const date = parseDateValue(dataBase);
  date.setMonth(date.getMonth() + meses + 1, 0);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const getDataBaseValidadeCiclo = (ciclo: {
  cronograma_mes_inicio?: string | null;
  data_abertura?: string | null;
  data_prevista?: string | null;
}) => {
  if (ciclo.cronograma_mes_inicio) {
    return `${ciclo.cronograma_mes_inicio.slice(0, 7)}-01`;
  }

  return ciclo.data_abertura || ciclo.data_prevista || new Date().toISOString();
};

export const calcularValidadeRelatorioCiclo = (
  ciclo: {
    cronograma_mes_inicio?: string | null;
    data_abertura?: string | null;
    data_prevista?: string | null;
  },
  meses: number
) => calcularValidadeFimDoMes(getDataBaseValidadeCiclo(ciclo), meses);

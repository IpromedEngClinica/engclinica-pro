const toDate = (value: string) =>
  new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00`);

export const mesValidadeAposMeses = (dataBase: Date, meses = 12) => {
  const data = new Date(dataBase.getFullYear(), dataBase.getMonth() + meses, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
};

export const primeiroDiaMesValidade = (validadeMes: string) =>
  validadeMes ? `${validadeMes.slice(0, 7)}-01` : null;

export const fimDoMesValidade = (validadeMes?: string | null) => {
  if (!validadeMes) return null;
  const data = toDate(validadeMes);
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  return `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;
};

export const formatarMesAno = (validadeMes?: string | null) => {
  if (!validadeMes) return "-";
  const [ano, mes] = validadeMes.slice(0, 7).split("-");
  return ano && mes ? `${mes}/${ano}` : "-";
};

export const formatarLocalCalibracao = (local?: string | null) => {
  if (local === "dependencias_contratada") return "Dependências da Contratada";
  if (local === "dependencias_contratante") return "Dependências da Contratante";
  return local || "-";
};

export const formatarDataPadrao = (value?: string | null) => {
  if (!value) return "-";
  const [ano, mes, dia] = value.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia} - ${mes} - ${ano}` : "-";
};

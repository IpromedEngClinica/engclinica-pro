export const CHECKLIST_CHECK_MARK = "\u2713";
export const CHECKLIST_CROSS_MARK = "\u2715";
export const CHECKLIST_WARNING_MARK = "\u26A0";

export const normalizarRespostaChecklist = (resposta?: string | null) => {
  return (resposta || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

export const formatRespostaChecklist = (respostaRaw?: string | null) => {
  const resposta = normalizarRespostaChecklist(respostaRaw);

  const map: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Nao Conforme",
    nao_aplica: "N/A",
    n_a: "N/A",
    na: "N/A",
    aprovado: "Aprovado",
    nao_aprovado: "Nao aprovado",
    aprovado_com_restricao: "Aprovado com restricao",
  };

  return map[resposta] || respostaRaw || "-";
};

export const getChecklistMarks = (respostaRaw?: string | null) => {
  const resposta = normalizarRespostaChecklist(respostaRaw);
  const isConforme =
    resposta === "conforme" ||
    resposta === "aprovado" ||
    resposta === "aprovado_com_restricao";
  const isNaoConforme =
    resposta === "nao_conforme" || resposta === "nao_aprovado";
  const isNaoAplica =
    resposta === "nao_aplica" ||
    resposta === "n_a" ||
    resposta === "na" ||
    resposta === "n/a";

  return {
    conforme: isConforme ? "X" : "",
    naoConforme: isNaoConforme ? "X" : "",
    naoAplica: isNaoAplica ? "X" : "",
    texto: formatRespostaChecklist(respostaRaw),
  };
};

export const formatResultadoGeralChecklist = (resultado?: string | null) => {
  const resposta = normalizarRespostaChecklist(resultado);

  const map: Record<string, string> = {
    aprovado: "Aprovado para uso",
    nao_aprovado: "Nao aprovado para uso",
    aprovado_com_restricao: "Aprovado com restricao",
  };

  return map[resposta] || "-";
};

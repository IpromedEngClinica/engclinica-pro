export const SEM_SETOR_SELECT_VALUE = "__sem_setor__";

export const isSetorNaoInformado = (value?: string | null) => {
  const normalized = value?.trim().toLocaleLowerCase("pt-BR") || "";
  return !normalized || normalized === "sem setor";
};

export const normalizarSetor = (value?: string | null) =>
  isSetorNaoInformado(value) ? "" : value!.trim();

export const setorParaDocumento = (value?: string | null) =>
  normalizarSetor(value) || null;

export const montarOpcoesSetor = (setores: string[]) => [
  {
    value: SEM_SETOR_SELECT_VALUE,
    label: "Sem setor",
    searchText: "sem setor vazio nenhum",
  },
  ...setores.map((setor) => ({ value: setor, label: setor })),
];

export const UFS_BRASIL = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

export type UfBrasil = (typeof UFS_BRASIL)[number]["sigla"];

export const getUfLabel = (sigla: string) => {
  const uf = UFS_BRASIL.find((item) => item.sigla === sigla);
  return uf ? `${uf.sigla} - ${uf.nome}` : sigla;
};

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

const CIDADE_PARTICULAS_MINUSCULAS = new Set([
  "da",
  "das",
  "de",
  "di",
  "do",
  "dos",
  "e",
]);

const normalizarEspacos = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const capitalizarParteNome = (parte: string) => {
  if (!parte) return parte;

  const lower = parte.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
};

export const normalizarNomeCidade = (value?: string | null) => {
  const cidade = normalizarEspacos(value || "");

  if (!cidade) return "";

  return cidade
    .split(" ")
    .map((palavra, index) => {
      const lower = palavra.toLocaleLowerCase("pt-BR");

      if (index > 0 && CIDADE_PARTICULAS_MINUSCULAS.has(lower)) {
        return lower;
      }

      return palavra
        .split("-")
        .map((parte) => capitalizarParteNome(parte))
        .join("-");
    })
    .join(" ");
};

export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export const consultarCep = async (cep: string): Promise<ViaCepResponse> => {
  const digits = onlyDigits(cep);

  if (digits.length !== 8) {
    throw new Error("CEP deve conter 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

  if (!response.ok) {
    throw new Error("Erro ao consultar CEP.");
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  return data;
};

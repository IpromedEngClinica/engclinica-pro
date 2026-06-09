const ESTADOS_OS_PRIORIDADE = [
  "Entrada de Equipamento para Orçamento",
  "Análise Completa",
  "Orçamento Aprovado",
  "Liberado para Entrega",
  "Fechada",
];

const normalizar = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const prioridadeEstado = (nome: string) => {
  const index = ESTADOS_OS_PRIORIDADE.map(normalizar).indexOf(normalizar(nome));
  return index === -1 ? ESTADOS_OS_PRIORIDADE.length : index;
};

export const ordenarNomesEstadosOS = (nomes: string[]) =>
  [...nomes].sort((a, b) => {
    const prioridadeA = prioridadeEstado(a);
    const prioridadeB = prioridadeEstado(b);

    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    return a.localeCompare(b, "pt-BR");
  });

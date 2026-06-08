export const HISTORICO_LABELS: Record<string, string> = {
  criada_os: "OS criada",
  atualizada_os: "OS atualizada",
  fechada_os: "OS concluída",
  cancelada_os: "OS cancelada",
  criada_calibracao: "Calibração criada",
  atualizada_calibracao: "Calibração atualizada",
  concluida_calibracao: "Calibração concluída",
  criado_protocolo: "Protocolo criado",
  atualizado_protocolo: "Protocolo atualizado",
  criado_orcamento: "Orçamento criado",
  atualizado_orcamento: "Orçamento atualizado",
  criado_laudo_obsolescencia: "Laudo de obsolescência criado",
};

export function formatarTipoHistorico(tipo: string): string {
  return (
    HISTORICO_LABELS[tipo] ??
    tipo.replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase())
  );
}

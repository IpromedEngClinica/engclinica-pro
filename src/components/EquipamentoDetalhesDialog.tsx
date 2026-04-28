import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Equipamento, useData } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: Equipamento | null;
  onSelectOS?: (osId: number) => void;
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border bg-card shadow-sm">
    <div className="inline-block -mt-3 ml-4 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
      {title}
    </div>
    <div className="p-5 pt-3 space-y-2 text-foreground">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="text-sm">
    <span className="font-semibold text-foreground">{label}: </span>
    <span className="text-foreground">{children || "—"}</span>
  </div>
);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const EquipamentoDetalhesDialog = ({ open, onOpenChange, equipamento, onSelectOS }: Props) => {
  const { ordensServico } = useData();

  const historico = useMemo(() => {
    if (!equipamento) return [];
    return ordensServico
      .filter((o) => o.equipamentoId === equipamento.id)
      .sort((a, b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
  }, [ordensServico, equipamento]);

  const recorrentes = useMemo(() => {
    const counts: Record<string, number> = {};
    historico.forEach((o) => {
      const key = (o.origemProblema || o.tipoServico || "").trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1]);
  }, [historico]);

  if (!equipamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl text-foreground">
            {equipamento.tipo} <span className="text-muted-foreground font-normal">| {equipamento.modelo}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          <Card title="Dados Básicos">
            <Field label="Identificação">{equipamento.tag}</Field>
            <Field label="Estado">{equipamento.status}</Field>
            <Field label="Tipo">{equipamento.tipo}</Field>
            <Field label="Proprietário">{equipamento.empresa}</Field>
            <Field label="Fabricante">{equipamento.fabricante}</Field>
            <Field label="Modelo">{equipamento.modelo}</Field>
            <Field label="Número de Série">{equipamento.serie}</Field>
            <Field label="Patrimônio">{equipamento.patrimonio}</Field>
            <Field label="Setor">{equipamento.setor}</Field>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Histórico de Atividades</h2>

            <Card title="Ordens de Serviço">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ordem de serviço registrada para este equipamento.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Número</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Solicitante</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Responsável</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo de Serviço</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Origem do Problema</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => onSelectOS?.(o.id)}
                        >
                          <td className="px-3 py-2 font-medium text-primary">{o.numero}</td>
                          <td className="px-3 py-2">{o.estado}</td>
                          <td className="px-3 py-2">{o.solicitante}</td>
                          <td className="px-3 py-2">{o.responsavelTecnico || "—"}</td>
                          <td className="px-3 py-2">{o.tipoServico}</td>
                          <td className="px-3 py-2">{formatDate(o.dataCriacao)}</td>
                          <td className="px-3 py-2">{o.origemProblema || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="mt-6">
              <Card title="Defeitos Recorrentes">
                {recorrentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum defeito recorrente identificado.
                  </p>
                ) : (
                  <ul className="text-sm space-y-1.5">
                    {recorrentes.map(([nome, qtd]) => (
                      <li key={nome} className="flex items-center justify-between">
                        <span className="text-foreground">{nome}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {qtd}x
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipamentoDetalhesDialog;

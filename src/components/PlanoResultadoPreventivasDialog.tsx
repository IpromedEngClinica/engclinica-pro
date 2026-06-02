import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResultadoFinalizacaoPreventivasLote } from "@/services/planosService";

type Props = {
  open: boolean;
  resultado: ResultadoFinalizacaoPreventivasLote | null;
  equipamentoLabel: (equipamentoId: string) => string;
  onOpenChange: (open: boolean) => void;
};

const PlanoResultadoPreventivasDialog = ({
  open,
  resultado,
  equipamentoLabel,
  onOpenChange,
}: Props) => {
  if (!resultado) return null;
  const linhas = [
    ...resultado.finalizados.map((item) => ({
      itemId: item.itemId,
      equipamentoId: item.equipamentoId,
      resultado: "Finalizada",
      motivo: `OS ${item.osId}`,
    })),
    ...resultado.ignorados.map((item) => ({
      itemId: item.itemId,
      equipamentoId: item.equipamentoId,
      resultado: "Ignorada",
      motivo: item.motivo,
    })),
  ];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader><DialogTitle>Resultado da finalizacao em lote</DialogTitle></DialogHeader>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <Resumo label="Selecionadas" value={resultado.totalSelecionados} />
        <Resumo label="Finalizadas" value={resultado.totalFinalizados} />
        <Resumo label="Ignoradas" value={resultado.totalIgnorados} />
      </div>
      <div className="max-h-80 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/40"><Th>Equipamento</Th><Th>Resultado</Th><Th>Detalhes</Th></tr></thead>
          <tbody>{linhas.map((item) => <tr className="border-t" key={item.itemId}><Td>{equipamentoLabel(item.equipamentoId)}</Td><Td>{item.resultado}</Td><Td>{item.motivo}</Td></tr>)}</tbody>
        </table>
      </div>
      <DialogFooter><Button onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Resumo = ({ label, value }: { label: string; value: number }) => <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value}</p></div>;
const Th = ({ children }: { children: React.ReactNode }) => <th className="px-3 py-2 text-left font-medium">{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td className="px-3 py-2 align-top">{children}</td>;

export default PlanoResultadoPreventivasDialog;

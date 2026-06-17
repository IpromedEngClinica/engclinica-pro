import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ResultadoFinalizacaoPreventivasLote,
  ResultadoNaoLocalizados,
} from "@/services/planosService";

type Resultado = ResultadoFinalizacaoPreventivasLote | ResultadoNaoLocalizados;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  resultado: Resultado | null;
};

const isPreventivaResultado = (
  resultado: Resultado
): resultado is ResultadoFinalizacaoPreventivasLote =>
  "totalFinalizados" in resultado;

const PlanoResultadoLoteDialog = ({ open, onOpenChange, resultado, titulo }: Props) => {
  if (!resultado) return null;

  const totalSucesso = isPreventivaResultado(resultado)
    ? resultado.totalFinalizados
    : resultado.totalAtualizados;
  const sucessos = isPreventivaResultado(resultado)
    ? resultado.finalizados.map((item) => ({
        id: item.itemId,
        equipamento: item.equipamentoDescricao,
        resultado: "Finalizado",
        documento: item.numeroOs ? `OS ${item.numeroOs}` : "OS vinculada",
        detalhes: "Checklist conforme e aprovado.",
      }))
    : resultado.atualizados.map((item) => ({
        id: item.equipamentoId,
        equipamento: item.equipamentoDescricao,
        resultado: "Nao localizado",
        documento: "-",
        detalhes: "Itens pendentes do equipamento atualizados no ciclo.",
      }));
  const ignorados = resultado.ignorados.map((item) => ({
    id: "itemId" in item ? item.itemId : item.equipamentoId,
    equipamento: item.equipamentoDescricao || "-",
    resultado: "Ignorado",
    documento: "-",
    detalhes: item.motivo,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Resumo label="Selecionadas" value={resultado.totalSelecionados} />
          <Resumo label="Concluidas" value={totalSucesso} />
          <Resumo label="Ignoradas" value={resultado.totalIgnorados} />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <Th>Equipamento</Th>
                <Th>Resultado</Th>
                <Th>Documento</Th>
                <Th>Detalhes</Th>
              </tr>
            </thead>
            <tbody>
              {[...sucessos, ...ignorados].map((item) => (
                <tr key={`${item.resultado}-${item.id}`} className="border-t">
                  <Td>{item.equipamento}</Td>
                  <Td>
                    <Badge variant={item.resultado === "Ignorado" ? "outline" : "default"}>
                      {item.resultado}
                    </Badge>
                  </Td>
                  <Td>{item.documento}</Td>
                  <Td>{item.detalhes}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Resumo = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border bg-muted/20 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">{children}</th>
);
const Td = ({ children }: { children?: React.ReactNode }) => (
  <td className="whitespace-nowrap px-3 py-2 align-top">{children}</td>
);

export default PlanoResultadoLoteDialog;

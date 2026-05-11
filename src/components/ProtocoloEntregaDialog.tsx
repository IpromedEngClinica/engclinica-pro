import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { OrdemServico, useData } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: OrdemServico | null;
}

const toLocalDatetimeValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ProtocoloEntregaDialog = ({ open, onOpenChange, os }: Props) => {
  const { addProtocoloEntrega } = useData();
  const [dataEntrega, setDataEntrega] = useState("");
  const [entreguePor, setEntreguePor] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");
  const [testado, setTestado] = useState<boolean | null>(null);
  const [funciona, setFunciona] = useState<boolean | null>(null);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open) {
      setDataEntrega(toLocalDatetimeValue(new Date()));
      setEntreguePor("");
      setRecebidoPor("");
      setTestado(null);
      setFunciona(null);
      setObservacoes("");
    }
  }, [open]);

  const handleSave = () => {
    if (!os) return;
    if (!entreguePor.trim() || !recebidoPor.trim()) {
      toast({ title: "Preencha quem entregou e quem recebeu", variant: "destructive" });
      return;
    }
    if (testado === null || funciona === null) {
      toast({ title: "Informe se foi testado e se funciona", variant: "destructive" });
      return;
    }
    const iso = dataEntrega ? new Date(dataEntrega).toISOString() : new Date().toISOString();
    const protocolo = addProtocoloEntrega({
      osId: os.id,
      dataEntrega: iso,
      entreguePor: entreguePor.trim(),
      recebidoPor: recebidoPor.trim(),
      testado,
      funciona,
      observacoes: observacoes.trim(),
    });
    toast({
      title: `Protocolo ${protocolo.numero} criado`,
      description: `OS ${os.numero} fechada automaticamente.`,
    });
    onOpenChange(false);
  };

  if (!os) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Protocolo de Entrega</DialogTitle>
          <p className="text-sm text-muted-foreground">OS {os.numero} · {os.solicitante}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Aviso de acessórios */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Acessórios registrados na OS
                </h3>
                {os.acessorios && os.acessorios.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-amber-900 dark:text-amber-100">
                    {os.acessorios.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    Nenhum acessório foi registrado nesta OS.
                  </p>
                )}
                <p className="text-xs text-amber-800 dark:text-amber-300 pt-1">
                  Confira a devolução dos acessórios antes de confirmar a entrega.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Entrega *</Label>
                <Input
                  type="datetime-local"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entregue por *</Label>
                <Input
                  placeholder="Nome de quem entrega"
                  value={entreguePor}
                  onChange={(e) => setEntreguePor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>O equipamento foi testado?</Label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={testado === true} onCheckedChange={(v) => setTestado(v ? true : null)} />
                    Sim
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={testado === false} onCheckedChange={(v) => setTestado(v ? false : null)} />
                    Não
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>O equipamento funciona?</Label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={funciona === true} onCheckedChange={(v) => setFunciona(v ? true : null)} />
                    Sim
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={funciona === false} onCheckedChange={(v) => setFunciona(v ? false : null)} />
                    Não
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recebido por *</Label>
              <Input
                placeholder="Nome de quem recebe"
                value={recebidoPor}
                onChange={(e) => setRecebidoPor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                rows={4}
                placeholder="Informações adicionais sobre a entrega..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Ao salvar, a OS {os.numero} será automaticamente alterada para o estado "Fechada".
          </p>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Protocolo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocoloEntregaDialog;

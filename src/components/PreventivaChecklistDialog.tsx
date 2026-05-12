import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import { useData, Equipamento } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamento: Equipamento | null;
}

type Conforme = "Conforme" | "Não Conforme" | "N/A";

const PreventivaChecklistDialog = ({ open, onOpenChange, equipamento }: Props) => {
  const { getProcedimentoByTipo, criarOSPreventivaFromChecklist } = useData();
  const procedimento = useMemo(
    () => (equipamento ? getProcedimentoByTipo(equipamento.tipo) : undefined),
    [equipamento, getProcedimentoByTipo]
  );

  const [respostas, setRespostas] = useState<Record<string, { conforme: Conforme; observacao: string }>>({});
  const [aprovado, setAprovado] = useState<"SIM" | "NÃO" | "">("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open && procedimento) {
      const init: Record<string, { conforme: Conforme; observacao: string }> = {};
      procedimento.itens.forEach((it) => {
        init[it] = { conforme: "Conforme", observacao: "" };
      });
      setRespostas(init);
      setAprovado("");
      setResponsavel("");
      setObservacoes("");
    }
  }, [open, procedimento]);

  if (!equipamento || !procedimento) return null;

  const handleSubmit = () => {
    if (!aprovado) {
      toast({ title: "Selecione a aprovação para uso", variant: "destructive" });
      return;
    }
    if (!responsavel.trim()) {
      toast({ title: "Informe o responsável técnico", variant: "destructive" });
      return;
    }
    const respList = procedimento.itens.map((it) => ({
      item: it,
      conforme: respostas[it]?.conforme ?? "Conforme",
      observacao: respostas[it]?.observacao ?? "",
    }));
    const os = criarOSPreventivaFromChecklist({
      equipamentoId: equipamento.id,
      procedimentoId: procedimento.id,
      respostas: respList,
      aprovadoParaUso: aprovado === "SIM",
      responsavelTecnico: responsavel,
      observacoes,
    });
    toast({ title: "OS de Preventiva criada", description: `${os.numero} - Estado: Fechada` });
    onOpenChange(false);
  };

  const setResp = (item: string, patch: Partial<{ conforme: Conforme; observacao: string }>) => {
    setRespostas((prev) => ({
      ...prev,
      [item]: { ...(prev[item] ?? { conforme: "Conforme", observacao: "" }), ...patch },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de Preventiva
          </DialogTitle>
          <DialogDescription>
            {procedimento.nome} • {equipamento.tipo} • TAG {equipamento.tag}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium w-44">Avaliação</th>
                  <th className="text-left px-3 py-2 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {procedimento.itens.map((it) => (
                  <tr key={it} className="border-b last:border-0">
                    <td className="px-3 py-2">{it}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {(["Conforme", "Não Conforme", "N/A"] as Conforme[]).map((c) => {
                          const sel = respostas[it]?.conforme === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setResp(it, { conforme: c })}
                              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                sel
                                  ? c === "Conforme"
                                    ? "bg-success/10 border-success text-success"
                                    : c === "Não Conforme"
                                    ? "bg-destructive/10 border-destructive text-destructive"
                                    : "bg-muted border-border"
                                  : "bg-background hover:bg-muted/50"
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={respostas[it]?.observacao ?? ""}
                        onChange={(e) => setResp(it, { observacao: e.target.value })}
                        placeholder="Opcional"
                        className="h-8"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-2 border-primary/40 rounded-lg p-4 bg-primary/5">
            <div className="font-semibold mb-2">Aprovação para uso</div>
            <div className="flex gap-2">
              {(["SIM", "NÃO"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAprovado(v)}
                  className={`px-4 py-2 rounded-md border font-medium ${
                    aprovado === v
                      ? v === "SIM"
                        ? "bg-success text-success-foreground border-success"
                        : "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  {v === "SIM" ? "Aprovado para uso" : "Não aprovado"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Responsável Técnico</label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observações Gerais</label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Concluir e gerar OS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreventivaChecklistDialog;

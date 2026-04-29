import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Equipamento, useData } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: Equipamento | null;
}

const ProtocoloRecolhimentoDialog = ({ open, onOpenChange, equipamento }: Props) => {
  const { addProtocoloRecolhimento } = useData();
  const [recolhidoPor, setRecolhidoPor] = useState("");
  const [defeito, setDefeito] = useState("");
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");

  useEffect(() => {
    if (open) {
      setRecolhidoPor("");
      setDefeito("");
      setAcessorios([]);
      setNovoAcessorio("");
    }
  }, [open]);

  const handleAddAcessorio = () => {
    const v = novoAcessorio.trim();
    if (!v) return;
    setAcessorios((prev) => [...prev, v]);
    setNovoAcessorio("");
  };

  const handleRemoveAcessorio = (i: number) =>
    setAcessorios((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!equipamento) return;
    if (!recolhidoPor.trim() || !defeito.trim()) {
      toast({ title: "Preencha quem recolheu e o defeito relatado", variant: "destructive" });
      return;
    }
    const protocolo = addProtocoloRecolhimento({
      equipamentoId: equipamento.id,
      empresa: equipamento.empresa,
      recolhidoPor: recolhidoPor.trim(),
      defeitoRelatado: defeito.trim(),
      acessorios,
    });
    toast({
      title: `Protocolo ${protocolo.numero} criado`,
      description: `OS ${protocolo.osNumero} aberta com estado "Entrada de Equipamentos".`,
    });
    onOpenChange(false);
  };

  if (!equipamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Protocolo de Recolhimento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {equipamento.tipo} — {equipamento.modelo} · {equipamento.empresa}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Nome de quem recolheu *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={recolhidoPor}
                onChange={(e) => setRecolhidoPor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Defeito relatado *</Label>
              <Textarea
                placeholder="Descreva o defeito relatado..."
                rows={4}
                value={defeito}
                onChange={(e) => setDefeito(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Acessórios</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Novo acessório..."
                value={novoAcessorio}
                onChange={(e) => setNovoAcessorio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAcessorio();
                  }
                }}
              />
              <Button type="button" onClick={handleAddAcessorio}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
            {acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {acessorios.map((a, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{a}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAcessorio(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum acessório adicionado.</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Ao salvar, será aberta automaticamente uma Ordem de Serviço com o tipo
            "Entrada de Equipamentos" vinculada a este equipamento.
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

export default ProtocoloRecolhimentoDialog;

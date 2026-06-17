import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  type TipoEquipamentoSupabase,
  useCriarTipoEquipamento,
} from "@/hooks/useTiposEquipamento";

interface TipoEquipamentoQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tipo: TipoEquipamentoSupabase) => void;
}

const TipoEquipamentoQuickAddDialog = ({
  open,
  onOpenChange,
  onCreated,
}: TipoEquipamentoQuickAddDialogProps) => {
  const criarTipo = useCriarTipoEquipamento();
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (open) setNome("");
  }, [open]);

  const handleSave = async () => {
    const nomeNormalizado = nome.trim();

    if (!nomeNormalizado) {
      toast({
        title: "Informe o nome do tipo de equipamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tipo = await criarTipo.mutateAsync(nomeNormalizado);
      onCreated(tipo);
      onOpenChange(false);
      toast({ title: "Tipo de equipamento cadastrado com sucesso!" });
    } catch (error) {
      toast({
        title: "Erro ao cadastrar tipo de equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={criarTipo.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Novo tipo de equipamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="novo-tipo-equipamento">Nome *</Label>
          <Input
            id="novo-tipo-equipamento"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
            placeholder="Ex: Monitor Multiparâmetro"
            autoFocus
            disabled={criarTipo.isPending}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={criarTipo.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={criarTipo.isPending}>
            {criarTipo.isPending ? "Cadastrando..." : "Cadastrar tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TipoEquipamentoQuickAddDialog;

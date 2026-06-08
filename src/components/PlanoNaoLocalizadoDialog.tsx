import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantidade: number;
  loading?: boolean;
  onConfirmar: (observacao: string) => void;
};

const PlanoNaoLocalizadoDialog = ({
  open,
  onOpenChange,
  quantidade,
  loading = false,
  onConfirmar,
}: Props) => {
  const [observacao, setObservacao] = useState("");

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) setObservacao("");
  };

  const confirmar = () => {
    onConfirmar(observacao);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como nao localizado</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            Equipamentos selecionados: <strong>{quantidade}</strong>
          </p>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
            Nenhuma OS, calibracao ou certificado sera criado. A marcacao sera aplicada aos itens pendentes do mesmo equipamento neste ciclo.
          </div>
          <Textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Observacao opcional"
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={loading || quantidade === 0} onClick={confirmar}>
            {loading ? "Salvando..." : "Confirmar nao localizado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanoNaoLocalizadoDialog;

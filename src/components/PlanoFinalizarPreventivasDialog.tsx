import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  quantidade: number;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

const PlanoFinalizarPreventivasDialog = ({ open, quantidade, saving, onOpenChange, onConfirm }: Props) =>
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Finalizar preventivas como conformes</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">
        Esta acao fecha as OS e grava todos os itens dos checklists selecionados como conformes. Confirme apenas quando a verificacao operacional tiver sido realizada.
      </p>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button><Button disabled={saving} onClick={onConfirm}>{saving ? "Finalizando..." : `Finalizar ${quantidade} item(ns)`}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;

export default PlanoFinalizarPreventivasDialog;

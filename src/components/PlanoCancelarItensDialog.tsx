import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  quantidade: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => Promise<void>;
};

const motivos = [
  "Cliente indisponivel",
  "Equipamento indisponivel",
  "Servico nao autorizado",
  "Outro",
];

const PlanoCancelarItensDialog = ({ open, quantidade, onOpenChange, onConfirm }: Props) => {
  const [motivo, setMotivo] = useState(motivos[0]);
  const [detalhes, setDetalhes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMotivo(motivos[0]);
    setDetalhes("");
  }, [open]);

  const confirmar = async () => {
    const texto = motivo === "Outro" ? detalhes.trim() : [motivo, detalhes.trim()].filter(Boolean).join(": ");
    if (!texto) return;
    setSaving(true);
    try {
      await onConfirm(texto);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Cancelar {quantidade} item(ns)</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Motivo *</Label><Select value={motivo} onValueChange={setMotivo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{motivos.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>{motivo === "Outro" ? "Descreva o motivo *" : "Detalhes"}</Label><Textarea value={detalhes} onChange={(event) => setDetalhes(event.target.value)} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button><Button variant="destructive" disabled={saving || (motivo === "Outro" && !detalhes.trim())} onClick={confirmar}>{saving ? "Cancelando..." : "Confirmar cancelamento"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

export default PlanoCancelarItensDialog;

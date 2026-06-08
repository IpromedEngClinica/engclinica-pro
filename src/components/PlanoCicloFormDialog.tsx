import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCriarCicloPlano } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoCiclo, PlanoCicloInput } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano;
  onSaved?: (ciclo: PlanoCiclo) => void;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const adicionarDias = (data: string, dias: number) => {
  const date = new Date(`${data}T00:00:00`);
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
};

const tituloPadrao = () => {
  const date = new Date();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  return `Ciclo ${mes}/${date.getFullYear()}`;
};

const vazio = (plano: Plano) => {
  const data = hoje();
  return {
    titulo: tituloPadrao(),
    dataPrevista: data,
    dataAbertura: data,
    dataFechamentoPrevista: adicionarDias(data, plano.prazo_execucao_dias),
    dataRealizacaoCalibracao: data,
    dataEmissaoCalibracao: data,
    observacoes: "",
  };
};

const PlanoCicloFormDialog = ({ open, onOpenChange, plano, onSaved }: Props) => {
  const criar = useCriarCicloPlano();
  const [form, setForm] = useState(vazio(plano));

  useEffect(() => {
    if (open) setForm(vazio(plano));
  }, [open, plano]);

  const salvar = async () => {
    const input: PlanoCicloInput = {
      titulo: form.titulo,
      dataPrevista: form.dataPrevista,
      dataAbertura: form.dataAbertura,
      dataFechamentoPrevista: form.dataFechamentoPrevista,
      dataRealizacaoCalibracao: form.dataRealizacaoCalibracao,
      dataEmissaoCalibracao: form.dataEmissaoCalibracao,
      observacoes: form.observacoes,
    };

    try {
      const ciclo = await criar.mutateAsync({ planoId: plano.id, input });
      toast({ title: "Ciclo criado." });
      onSaved?.(ciclo);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao criar ciclo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo ciclo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Titulo do ciclo*" value={form.titulo} onChange={(titulo) => setForm({ ...form, titulo })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field type="date" label="Data prevista*" value={form.dataPrevista} onChange={(dataPrevista) => setForm({ ...form, dataPrevista })} />
            <Field type="date" label="Data de abertura*" value={form.dataAbertura} onChange={(dataAbertura) => setForm({ ...form, dataAbertura, dataFechamentoPrevista: adicionarDias(dataAbertura, plano.prazo_execucao_dias) })} />
            <Field type="date" label="Fechamento previsto*" value={form.dataFechamentoPrevista} onChange={(dataFechamentoPrevista) => setForm({ ...form, dataFechamentoPrevista })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field type="date" label="Realizacao das calibracoes" value={form.dataRealizacaoCalibracao} onChange={(dataRealizacaoCalibracao) => setForm({ ...form, dataRealizacaoCalibracao })} />
            <Field type="date" label="Emissao dos certificados" value={form.dataEmissaoCalibracao} onChange={(dataEmissaoCalibracao) => setForm({ ...form, dataEmissaoCalibracao })} />
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={criar.isPending}>
            {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar ciclo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

export default PlanoCicloFormDialog;

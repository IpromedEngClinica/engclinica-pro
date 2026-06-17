import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAtualizarCicloPlano, useCriarCicloPlano } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoCiclo, PlanoCicloInput } from "@/services/planosService";
import {
  addDaysToLocalDateTime,
  toLocalDateTimeInput,
} from "@/utils/planoDatas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano;
  ciclo?: PlanoCiclo | null;
  onSaved?: (ciclo: PlanoCiclo) => void;
};

const agora = () => toLocalDateTimeInput(new Date().toISOString());

const tituloPadrao = () => {
  const date = new Date();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  return `Ciclo ${mes}/${date.getFullYear()}`;
};

const vazio = (plano: Plano, ciclo?: PlanoCiclo | null) => {
  const dataHora = ciclo ? toLocalDateTimeInput(ciclo.data_abertura) : agora();
  const data = dataHora.slice(0, 10);
  return {
    titulo: ciclo?.titulo || tituloPadrao(),
    dataAbertura: dataHora,
    dataFechamentoPrevista: ciclo
      ? toLocalDateTimeInput(ciclo.data_fechamento_prevista)
      : addDaysToLocalDateTime(dataHora, plano.prazo_execucao_dias),
    dataRealizacaoCalibracao: ciclo?.data_realizacao_calibracao || data,
    dataEmissaoCalibracao: ciclo?.data_emissao_calibracao || data,
    observacoes: ciclo?.observacoes || "",
  };
};

const PlanoCicloFormDialog = ({ open, onOpenChange, plano, ciclo, onSaved }: Props) => {
  const criar = useCriarCicloPlano();
  const atualizar = useAtualizarCicloPlano();
  const [form, setForm] = useState(vazio(plano, ciclo));

  useEffect(() => {
    if (open) setForm(vazio(plano, ciclo));
  }, [ciclo, open, plano]);

  const salvar = async () => {
    const input: PlanoCicloInput = {
      titulo: form.titulo,
      dataPrevista: form.dataAbertura.slice(0, 10),
      dataAbertura: form.dataAbertura,
      dataFechamentoPrevista: form.dataFechamentoPrevista,
      dataRealizacaoCalibracao: form.dataRealizacaoCalibracao,
      dataEmissaoCalibracao: form.dataEmissaoCalibracao,
      observacoes: form.observacoes,
    };

    try {
      const cicloSalvo = ciclo
        ? await atualizar.mutateAsync({ cicloId: ciclo.id, planoId: plano.id, input })
        : await criar.mutateAsync({ planoId: plano.id, input });
      toast({ title: ciclo ? "Datas do ciclo atualizadas." : "Ciclo criado." });
      onSaved?.(cicloSalvo);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: ciclo ? "Erro ao atualizar ciclo" : "Erro ao criar ciclo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ciclo ? "Editar ciclo" : "Novo ciclo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Titulo do ciclo*" value={form.titulo} onChange={(titulo) => setForm({ ...form, titulo })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field type="datetime-local" label="Data e hora da execucao*" value={form.dataAbertura} onChange={(dataAbertura) => setForm({ ...form, dataAbertura, dataFechamentoPrevista: addDaysToLocalDateTime(dataAbertura, plano.prazo_execucao_dias) })} />
            <Field type="datetime-local" label="Data e hora do fechamento*" value={form.dataFechamentoPrevista} onChange={(dataFechamentoPrevista) => setForm({ ...form, dataFechamentoPrevista })} />
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
          <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending}>
            {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ciclo ? "Salvar alteracoes" : "Criar ciclo"}
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

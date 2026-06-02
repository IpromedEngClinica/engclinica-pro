import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAtualizarExecucaoPlano, useCriarExecucaoPlano, usePlanos } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { PlanoExecucao, PlanoExecucaoInput } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId?: string | null;
  execucao?: PlanoExecucao | null;
  onSaved?: (execucao: PlanoExecucao) => void;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const vazio = () => ({ planoId: "", nomeVisita: "", dataPrevista: hoje(), dataAbertura: hoje(), dataFechamento: "", dataAberturaPreventiva: hoje(), dataFechamentoPreventiva: hoje(), dataRealizacaoCalibracao: hoje(), dataEmissaoCalibracao: hoje(), observacoes: "" });

const PlanoExecucaoFormDialog = ({ open, onOpenChange, planoId, execucao = null, onSaved }: Props) => {
  const [form, setForm] = useState(vazio);
  const { data: planos = [] } = usePlanos(true);
  const criar = useCriarExecucaoPlano();
  const atualizar = useAtualizarExecucaoPlano();
  const saving = criar.isPending || atualizar.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(execucao ? {
      planoId: execucao.plano_id, nomeVisita: execucao.nome_visita || "", dataPrevista: execucao.data_prevista,
      dataAbertura: execucao.data_abertura || "",
      dataFechamento: execucao.data_fechamento || "",
      dataAberturaPreventiva: execucao.data_abertura_preventiva || "",
      dataFechamentoPreventiva: execucao.data_fechamento_preventiva || "",
      dataRealizacaoCalibracao: execucao.data_realizacao_calibracao || "",
      dataEmissaoCalibracao: execucao.data_emissao_calibracao || "",
      observacoes: execucao.observacoes || "",
    } : { ...vazio(), planoId: planoId || "" });
  }, [execucao, open, planoId]);

  const salvar = async () => {
    const input: PlanoExecucaoInput = form;
    try {
      const saved = execucao
        ? await atualizar.mutateAsync({ id: execucao.id, input })
        : await criar.mutateAsync({ planoId: form.planoId, input });
      toast({ title: execucao ? "Datas da visita atualizadas." : "Visita do plano criada." });
      onSaved?.(saved as PlanoExecucao);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar visita", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{execucao ? "Editar datas da visita" : "Iniciar nova visita"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Plano *</Label><Select disabled={Boolean(execucao)} value={form.planoId} onValueChange={(value) => setForm({ ...form, planoId: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{planos.map((plano) => <SelectItem key={plano.id} value={plano.id}>{plano.titulo}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Nome da visita</Label><Input placeholder="Ex.: Visita Junho/2026" value={form.nomeVisita} onChange={(event) => setForm({ ...form, nomeVisita: event.target.value })} /></div>
        <Field label="Data prevista da visita *" value={form.dataPrevista} onChange={(value) => setForm({ ...form, dataPrevista: value })} />
        <Field label="Abertura da visita" value={form.dataAbertura} onChange={(value) => setForm({ ...form, dataAbertura: value })} />
        <Field label="Fechamento da visita" value={form.dataFechamento} onChange={(value) => setForm({ ...form, dataFechamento: value })} />
        <div />
        <Field label="Abertura preventiva" value={form.dataAberturaPreventiva} onChange={(value) => setForm({ ...form, dataAberturaPreventiva: value })} />
        <Field label="Fechamento preventiva" value={form.dataFechamentoPreventiva} onChange={(value) => setForm({ ...form, dataFechamentoPreventiva: value })} />
        <Field label="Realizacao calibracao" value={form.dataRealizacaoCalibracao} onChange={(value) => setForm({ ...form, dataRealizacaoCalibracao: value })} />
        <Field label="Emissao calibracao" value={form.dataEmissaoCalibracao} onChange={(value) => setForm({ ...form, dataEmissaoCalibracao: value })} />
        <div className="space-y-1.5 sm:col-span-2"><Label>Observacoes</Label><Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) =>
  <div className="space-y-1.5"><Label>{label}</Label><Input type="date" value={value} onChange={(event) => onChange(event.target.value)} /></div>;

export default PlanoExecucaoFormDialog;

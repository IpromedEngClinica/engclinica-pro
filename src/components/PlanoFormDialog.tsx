import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAtualizarPlano, useCriarPlano } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoInput, PlanoModoOrganizacao } from "@/services/planosService";
import { FREQUENCIAS_PLANO, type PlanoFrequencia } from "@/utils/planoFrequencia";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano?: Plano | null;
  onSaved?: (plano: Plano, created: boolean) => void;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const vazio = () => ({ titulo: "", empresaId: "", dataInicio: hoje(), frequencia: "mensal" as PlanoFrequencia, modoOrganizacao: "por_setor" as PlanoModoOrganizacao, observacoes: "" });

const PlanoFormDialog = ({ open, onOpenChange, plano = null, onSaved }: Props) => {
  const [form, setForm] = useState(vazio);
  const { data: empresas = [] } = useEmpresas();
  const criar = useCriarPlano();
  const atualizar = useAtualizarPlano();
  const saving = criar.isPending || atualizar.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(plano ? {
      titulo: plano.titulo, empresaId: plano.empresa_id, dataInicio: plano.data_inicio,
      frequencia: plano.frequencia, modoOrganizacao: plano.modo_organizacao, observacoes: plano.observacoes || "",
    } : vazio());
  }, [open, plano]);

  const salvar = async () => {
    const input: PlanoInput = form;
    try {
      const saved = plano
        ? await atualizar.mutateAsync({ id: plano.id, input })
        : await criar.mutateAsync(input);
      toast({ title: plano ? "Plano atualizado." : "Plano criado." });
      onSaved?.(saved as Plano, !plano);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar plano", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>{plano ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <Field label="Titulo do plano *" value={form.titulo} onChange={(titulo) => setForm({ ...form, titulo })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Cliente *</Label><Select value={form.empresaId} onValueChange={(empresaId) => setForm({ ...form, empresaId })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map((empresa) => <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome_fantasia || empresa.nome}</SelectItem>)}</SelectContent></Select></div>
          <Field type="date" label="Data inicial *" value={form.dataInicio} onChange={(dataInicio) => setForm({ ...form, dataInicio })} />
        </div>
        <div className="space-y-1.5"><Label>Frequencia de execucao *</Label><Select value={form.frequencia} onValueChange={(frequencia) => setForm({ ...form, frequencia: frequencia as PlanoFrequencia })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FREQUENCIAS_PLANO.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Modo de organizacao *</Label><Select value={form.modoOrganizacao} onValueChange={(modoOrganizacao) => setForm({ ...form, modoOrganizacao: modoOrganizacao as PlanoModoOrganizacao })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="por_setor">Por setores</SelectItem><SelectItem value="unidade_inteira">Todos os equipamentos da unidade</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Observacoes</Label><Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) =>
  <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;

export default PlanoFormDialog;

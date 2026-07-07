import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAtualizarPlano, useCriarPlano, usePlanoUsuarios } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoInput } from "@/services/planosService";
import { FREQUENCIAS_PLANO, type PlanoFrequencia } from "@/utils/planoFrequencia";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano?: Plano | null;
  onSaved?: (plano: Plano, created: boolean) => void;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const vazio = () => ({
  titulo: "",
  empresaId: "",
  responsavelId: "__none__",
  dataInicial: hoje(),
  frequencia: "mensal" as PlanoFrequencia,
  prazoExecucaoDias: "30",
  descricao: "",
});

const PlanoFormDialog = ({ open, onOpenChange, plano = null, onSaved }: Props) => {
  const [form, setForm] = useState(vazio);
  const { data: empresas = [] } = useEmpresas();
  const { data: usuarios = [] } = usePlanoUsuarios();
  const criar = useCriarPlano();
  const atualizar = useAtualizarPlano();
  const saving = criar.isPending || atualizar.isPending;
  const empresaSelecionada = empresas.find((empresa) => empresa.id === form.empresaId);
  const getEmpresaOptionLabel = (empresa: (typeof empresas)[number]) =>
    [
      empresa.nome_fantasia || empresa.nome,
      empresa.cidade,
      empresa.estado,
      empresa.cpf_cnpj,
    ]
      .filter(Boolean)
      .join(" | ");
  const empresasOptions = empresas.map(getEmpresaOptionLabel);

  useEffect(() => {
    if (!open) return;
    setForm(plano ? {
      titulo: plano.titulo,
      empresaId: plano.empresa_id,
      responsavelId: plano.responsavel_id || "__none__",
      dataInicial: plano.data_inicial,
      frequencia: plano.frequencia,
      prazoExecucaoDias: String(plano.prazo_execucao_dias),
      descricao: plano.descricao || "",
    } : vazio());
  }, [open, plano]);

  const salvar = async () => {
    const input: PlanoInput = {
      titulo: form.titulo,
      empresaId: form.empresaId,
      responsavelId: form.responsavelId === "__none__" ? null : form.responsavelId,
      dataInicial: form.dataInicial,
      frequencia: form.frequencia,
      prazoExecucaoDias: Number(form.prazoExecucaoDias),
      descricao: form.descricao,
    };

    try {
      const saved = plano
        ? await atualizar.mutateAsync({ id: plano.id, input })
        : await criar.mutateAsync(input);
      toast({ title: plano ? "Plano atualizado." : "Plano criado." });
      onSaved?.(saved, !plano);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        title: "Erro ao salvar plano",
        description: "Nao foi possivel salvar o plano. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plano ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Titulo*" value={form.titulo} onChange={(titulo) => setForm({ ...form, titulo })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente*</Label>
              <SearchableSelect
                value={empresaSelecionada ? getEmpresaOptionLabel(empresaSelecionada) : ""}
                onValueChange={(value) => {
                  const empresa = empresas.find(
                    (item) => getEmpresaOptionLabel(item) === value
                  );
                  setForm({ ...form, empresaId: empresa?.id || "" });
                }}
                options={empresasOptions}
                placeholder="Selecione ou busque o cliente"
                emptyText="Nenhum cliente encontrado."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsavel</Label>
              <Select value={form.responsavelId} onValueChange={(responsavelId) => setForm({ ...form, responsavelId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsavel</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field type="date" label="Data inicial*" value={form.dataInicial} onChange={(dataInicial) => setForm({ ...form, dataInicial })} />
            <div className="space-y-1.5">
              <Label>Frequencia*</Label>
              <Select value={form.frequencia} onValueChange={(frequencia) => setForm({ ...form, frequencia: frequencia as PlanoFrequencia })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIAS_PLANO.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field type="number" label="Prazo (dias)*" value={form.prazoExecucaoDias} onChange={(prazoExecucaoDias) => setForm({ ...form, prazoExecucaoDias })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
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

export default PlanoFormDialog;

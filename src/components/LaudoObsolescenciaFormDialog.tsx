import { FileWarning, Loader2, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { toast } from "@/hooks/use-toast";
import {
  useCriarLaudoObsolescencia,
  useCriarMotivoObsolescencia,
  useGarantirMotivosPadraoObsolescencia,
  useMotivosObsolescencia,
} from "@/hooks/useLaudosObsolescencia";
import type { LaudoObsolescenciaSupabase } from "@/services/laudosObsolescenciaService";

interface LaudoObsolescenciaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmpresaId?: string | null;
  initialEquipamentoId?: string | null;
  onCreated?: (laudo: LaudoObsolescenciaSupabase) => void;
}

const emptyForm = {
  empresaId: "",
  equipamentoId: "",
  motivoId: "",
  motivoTexto: "",
  observacoes: "",
};

const getEquipamentoLabel = (equipamento: {
  tipo_equipamento?: { nome: string } | null;
  tipo_texto?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  tag?: string | null;
  patrimonio?: string | null;
  numero_serie?: string | null;
}) => {
  const tipo =
    equipamento.tipo_equipamento?.nome ||
    equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.tag || equipamento.patrimonio || equipamento.numero_serie,
  ]
    .filter(Boolean)
    .join(" - ");
};

const LaudoObsolescenciaFormDialog = ({
  open,
  onOpenChange,
  initialEmpresaId,
  initialEquipamentoId,
  onCreated,
}: LaudoObsolescenciaFormDialogProps) => {
  const [form, setForm] = useState(emptyForm);
  const [novoMotivoOpen, setNovoMotivoOpen] = useState(false);
  const [novoMotivo, setNovoMotivo] = useState("");

  const { data: empresas = [] } = useEmpresas();
  const { data: equipamentos = [] } = useEquipamentos();
  const { data: motivos = [] } = useMotivosObsolescencia();
  const garantirMotivos = useGarantirMotivosPadraoObsolescencia();
  const criarMotivo = useCriarMotivoObsolescencia();
  const criarLaudo = useCriarLaudoObsolescencia();

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      empresaId: initialEmpresaId || "",
      equipamentoId: initialEquipamentoId || "",
    });
    setNovoMotivoOpen(false);
    setNovoMotivo("");
    garantirMotivos.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEmpresaId, initialEquipamentoId]);

  const equipamentosFiltrados = useMemo(
    () =>
      equipamentos.filter((equipamento) => {
        if (!form.empresaId) return false;
        return equipamento.empresa_id === form.empresaId && equipamento.ativo;
      }),
    [equipamentos, form.empresaId]
  );

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "empresaId" ? { equipamentoId: "" } : {}),
    }));
  };

  const handleMotivoChange = (motivoId: string) => {
    const motivo = motivos.find((item) => item.id === motivoId);

    setForm((current) => ({
      ...current,
      motivoId,
      motivoTexto: motivo?.nome || "",
    }));
  };

  const handleCriarMotivo = async () => {
    try {
      const motivo = await criarMotivo.mutateAsync({ nome: novoMotivo });
      setForm((current) => ({
        ...current,
        motivoId: motivo.id,
        motivoTexto: motivo.nome,
      }));
      setNovoMotivo("");
      setNovoMotivoOpen(false);
      toast({ title: "Motivo cadastrado com sucesso." });
    } catch (error) {
      toast({
        title: "Erro ao cadastrar motivo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.empresaId || !form.equipamentoId || !form.motivoTexto.trim()) {
      toast({
        title: "Preencha os campos obrigatorios.",
        description: "Empresa, equipamento e motivo sao obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      "Ao emitir este laudo, o equipamento sera desativado automaticamente. Deseja continuar?"
    );

    if (!confirmed) return;

    try {
      const laudo = await criarLaudo.mutateAsync({
        empresaId: form.empresaId,
        equipamentoId: form.equipamentoId,
        motivoId: form.motivoId || null,
        motivoTexto: form.motivoTexto,
        observacoes: form.observacoes || null,
      });

      toast({
        title: "Laudo emitido com sucesso.",
        description: `Laudo nº ${laudo.numero} criado e equipamento desativado.`,
      });
      onCreated?.(laudo);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao emitir laudo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const saving = criarLaudo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-primary" />
            Novo Laudo de Obsolescencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Ao emitir o laudo, o equipamento sera desativado automaticamente.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={form.empresaId}
                onValueChange={(value) => update("empresaId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome || empresa.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipamento *</Label>
              <Select
                value={form.equipamentoId}
                onValueChange={(value) => update("equipamentoId", value)}
                disabled={!form.empresaId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.empresaId
                        ? "Selecione o equipamento"
                        : "Selecione uma empresa primeiro"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {equipamentosFiltrados.map((equipamento) => (
                    <SelectItem key={equipamento.id} value={equipamento.id}>
                      {getEquipamentoLabel(equipamento)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Motivo *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNovoMotivoOpen((value) => !value)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar motivo
              </Button>
            </div>
            <Select value={form.motivoId} onValueChange={handleMotivoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {novoMotivoOpen && (
            <div className="rounded-lg border p-4 space-y-3">
              <Label>Novo motivo</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={novoMotivo}
                  onChange={(event) => setNovoMotivo(event.target.value)}
                  placeholder="Descreva o motivo de obsolescencia"
                />
                <Button
                  type="button"
                  onClick={handleCriarMotivo}
                  disabled={criarMotivo.isPending}
                >
                  {criarMotivo.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Textarea
              value={form.observacoes}
              onChange={(event) => update("observacoes", event.target.value)}
              rows={4}
              placeholder="Observacoes complementares do laudo"
            />
          </div>

        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Emitir laudo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LaudoObsolescenciaFormDialog;

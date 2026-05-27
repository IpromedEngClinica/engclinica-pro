import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "@/hooks/use-toast";
import {
  EquipamentoFormInput,
  EquipamentoSupabase,
} from "@/services/equipamentosService";
import type { EmpresaSupabase } from "@/services/empresasService";
import {
  useAtualizarEquipamento,
  useCriarEquipamento,
} from "@/hooks/useEquipamentos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useTiposEquipamento } from "@/hooks/useTiposEquipamento";
import EquipamentoHistoricoSection from "@/components/EquipamentoHistoricoSection";

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  equipamento?: EquipamentoSupabase | null;
  prefilledEmpresa?: string;
  onOpenEmpresa?: (empresa: EmpresaSupabase) => void;
}

const emptyForm: EquipamentoFormInput = {
  empresaId: "",
  tipoEquipamentoId: "",
  tipoTexto: "",
  fabricante: "",
  modelo: "",
  numeroSerie: "",
  patrimonio: "",
  setor: "",
  tag: "",
  status: "Ativo",
  dataAquisicao: "",
  dataInstalacao: "",
  dataUltimaPreventiva: "",
  dataProximaPreventiva: "",
  dataUltimaCalibracao: "",
  dataProximaCalibracao: "",
  observacoes: "",
};

const statusOptions = ["Ativo", "Em manutenção", "Desativado"];

const EquipamentoFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  equipamento = null,
  prefilledEmpresa,
  onOpenEmpresa,
}: Props) => {
  const criarEquipamento = useCriarEquipamento();
  const atualizarEquipamento = useAtualizarEquipamento();

  const { data: empresas = [] } = useEmpresas("ativas");
  const { data: tiposEquipamento = [] } = useTiposEquipamento();

  const [form, setForm] = useState<EquipamentoFormInput>(emptyForm);

  const readOnly = mode === "view";
  const saving = criarEquipamento.isPending || atualizarEquipamento.isPending;

  const empresaOptions = useMemo(
    () =>
      empresas.map((empresa) =>
        empresa.nome_fantasia
          ? `${empresa.nome_fantasia} — ${empresa.nome}`
          : empresa.nome
      ),
    [empresas]
  );

  const tipoOptions = useMemo(
    () => tiposEquipamento.map((tipo) => tipo.nome),
    [tiposEquipamento]
  );

  const selectedEmpresaLabel = useMemo(() => {
    const empresa = empresas.find((item) => item.id === form.empresaId);

    if (!empresa) return "";

    return empresa.nome_fantasia
      ? `${empresa.nome_fantasia} — ${empresa.nome}`
      : empresa.nome;
  }, [empresas, form.empresaId]);

  const selectedEmpresa = useMemo(
    () =>
      empresas.find((item) => item.id === form.empresaId) ||
      equipamento?.empresa ||
      null,
    [empresas, equipamento, form.empresaId]
  );

  const selectedTipoLabel = useMemo(() => {
    const tipo = tiposEquipamento.find(
      (item) => item.id === form.tipoEquipamentoId
    );

    return tipo?.nome || form.tipoTexto || "";
  }, [tiposEquipamento, form.tipoEquipamentoId, form.tipoTexto]);

  useEffect(() => {
    if (!open) return;

    if (equipamento && (mode === "edit" || mode === "view")) {
      setForm({
        empresaId: equipamento.empresa_id,
        tipoEquipamentoId: equipamento.tipo_equipamento_id || "",
        tipoTexto: equipamento.tipo_texto || "",
        fabricante: equipamento.fabricante || "",
        modelo: equipamento.modelo || "",
        numeroSerie: equipamento.numero_serie || "",
        patrimonio: equipamento.patrimonio || "",
        setor: equipamento.setor || "",
        tag: equipamento.tag || "",
        status: equipamento.status || "Ativo",
        dataAquisicao: equipamento.data_aquisicao || "",
        dataInstalacao: equipamento.data_instalacao || "",
        dataUltimaPreventiva: equipamento.data_ultima_preventiva || "",
        dataProximaPreventiva: equipamento.data_proxima_preventiva || "",
        dataUltimaCalibracao: equipamento.data_ultima_calibracao || "",
        dataProximaCalibracao: equipamento.data_proxima_calibracao || "",
        observacoes: equipamento.observacoes || "",
      });
      return;
    }

    const empresaPrefill = empresas.find((empresa) => {
      const label = empresa.nome_fantasia
        ? `${empresa.nome_fantasia} — ${empresa.nome}`
        : empresa.nome;

      return label === prefilledEmpresa || empresa.nome === prefilledEmpresa;
    });

    setForm({
      ...emptyForm,
      empresaId: empresaPrefill?.id || "",
    });
  }, [open, equipamento, mode, prefilledEmpresa, empresas]);

  const update = (field: keyof EquipamentoFormInput, value: string) => {
    if (readOnly) return;

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmpresaChange = (label: string) => {
    const empresa = empresas.find((item) => {
      const optionLabel = item.nome_fantasia
        ? `${item.nome_fantasia} — ${item.nome}`
        : item.nome;

      return optionLabel === label;
    });

    update("empresaId", empresa?.id || "");
  };

  const handleTipoChange = (label: string) => {
    const tipo = tiposEquipamento.find((item) => item.nome === label);

    setForm((prev) => ({
      ...prev,
      tipoEquipamentoId: tipo?.id || "",
      tipoTexto: tipo ? "" : label,
    }));
  };

  const handleSave = async () => {
    if (!form.empresaId) {
      toast({
        title: "Selecione o proprietário do equipamento.",
        variant: "destructive",
      });
      return;
    }

    if (!form.tipoEquipamentoId && !form.tipoTexto?.trim()) {
      toast({
        title: "Selecione ou informe o tipo do equipamento.",
        variant: "destructive",
      });
      return;
    }

    if (!form.fabricante?.trim()) {
      toast({
        title: "Informe o fabricante do equipamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: EquipamentoFormInput = {
        ...form,
        fabricante: form.fabricante?.trim(),
        modelo: form.modelo?.trim(),
        numeroSerie: form.numeroSerie?.trim(),
        patrimonio: form.patrimonio?.trim(),
        tag: form.tag?.trim(),
        setor: form.setor?.trim(),
        tipoTexto: form.tipoTexto?.trim(),
      };

      if (mode === "edit" && equipamento) {
        await atualizarEquipamento.mutateAsync({
          id: equipamento.id,
          input: payload,
        });

        toast({ title: "Equipamento atualizado com sucesso!" });
      } else {
        await criarEquipamento.mutateAsync(payload);

        toast({ title: "Equipamento cadastrado com sucesso!" });
      }

      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar equipamento.";

      toast({
        title: "Erro ao salvar equipamento",
        description: message,
        variant: "destructive",
      });
    }
  };

  const title =
    mode === "view"
      ? "Visualizar Equipamento"
      : mode === "edit"
        ? "Editar Equipamento"
        : "Novo Equipamento";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          readOnly
            ? "sm:max-w-6xl max-h-[90vh] overflow-y-auto"
            : "sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">
            Dados do Equipamento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Tipo *</Label>
              {readOnly ? (
                <Input value={selectedTipoLabel} disabled />
              ) : (
                <SearchableSelect
                  value={selectedTipoLabel}
                  onValueChange={handleTipoChange}
                  options={tipoOptions}
                  placeholder="Selecione o tipo"
                  emptyText="Nenhum tipo encontrado."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Fabricante *</Label>
              <Input
                placeholder="Ex: Philips"
                value={form.fabricante}
                onChange={(e) => update("fabricante", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Modelo</Label>
              <Input
                placeholder="Ex: MX800"
                value={form.modelo}
                onChange={(e) => update("modelo", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Estado</Label>
              {readOnly ? (
                <Input value={form.status} disabled />
              ) : (
                <Select
                  value={form.status || "Ativo"}
                  onValueChange={(v) => update("status", v)}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">
            Proprietário e Identificação
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Proprietário *</Label>
              {readOnly ? (
                selectedEmpresa && onOpenEmpresa ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEmpresa(selectedEmpresa)}
                  >
                    {selectedEmpresaLabel ||
                      selectedEmpresa.nome_fantasia ||
                      selectedEmpresa.nome}
                  </button>
                ) : (
                  <Input value={selectedEmpresaLabel} disabled />
                )
              ) : (
                <SearchableSelect
                  value={selectedEmpresaLabel}
                  onValueChange={handleEmpresaChange}
                  options={empresaOptions}
                  placeholder="Selecione a empresa"
                  emptyText="Nenhuma empresa encontrada."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">TAG</Label>
              <Input
                placeholder="Ex: TAG-0001"
                value={form.tag}
                onChange={(e) => update("tag", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Número de Série</Label>
              <Input
                placeholder="Ex: SN-001234"
                value={form.numeroSerie}
                onChange={(e) => update("numeroSerie", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Patrimônio</Label>
              <Input
                placeholder="Ex: PAT-0001"
                value={form.patrimonio}
                onChange={(e) => update("patrimonio", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Setor</Label>
              <Input
                placeholder="Ex: UTI, Centro Cirúrgico"
                value={form.setor}
                onChange={(e) => update("setor", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">
            Preventiva e Calibração
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Última Preventiva</Label>
              <Input
                type="date"
                value={form.dataUltimaPreventiva}
                onChange={(e) => update("dataUltimaPreventiva", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Próxima Preventiva</Label>
              <Input
                type="date"
                value={form.dataProximaPreventiva}
                onChange={(e) => update("dataProximaPreventiva", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Última Calibração</Label>
              <Input
                type="date"
                value={form.dataUltimaCalibracao}
                onChange={(e) => update("dataUltimaCalibracao", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Próxima Calibração</Label>
              <Input
                type="date"
                value={form.dataProximaCalibracao}
                onChange={(e) => update("dataProximaCalibracao", e.target.value)}
                disabled={readOnly || saving}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Observações</h3>

          <Textarea
            value={form.observacoes}
            onChange={(e) => update("observacoes", e.target.value)}
            placeholder="Observações técnicas, acessórios, histórico inicial ou restrições."
            disabled={readOnly || saving}
            rows={4}
          />
        </div>

        {readOnly && (
          <EquipamentoHistoricoSection equipamentoId={equipamento?.id} />
        )}

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>

          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Equipamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipamentoFormDialog;

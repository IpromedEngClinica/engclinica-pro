import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useData, OrdemServico } from "@/contexts/DataContext";

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  os?: OrdemServico | null;
  fromEquipamento?: { id: number; empresa: string } | null;
  initialTipoServico?: string;
}

const nowLocalDatetime = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const emptyForm = {
  dataCriacao: "",
  estado: "Aberta",
  responsavelTecnico: "Ícaro Rezende",
  solicitante: "",
  equipamentoId: "",
  tipoServico: "",
  origemProblema: "",
  descricaoServico: "",
  observacoes: "",
};

const OrdemServicoFormDialog = ({ open, onOpenChange, mode = "create", os = null, fromEquipamento = null, initialTipoServico = "" }: Props) => {
  const { empresas, equipamentos, tiposOS, estadosOS, addOrdemServico, updateOrdemServico, nextOSNumber } = useData();

  const [form, setForm] = useState(emptyForm);
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");
  const [numeroPreview, setNumeroPreview] = useState("");

  const readOnly = mode === "view";

  useEffect(() => {
    if (!open) return;
    if (os && (mode === "edit" || mode === "view")) {
      setForm({
        dataCriacao: os.dataCriacao,
        estado: os.estado,
        responsavelTecnico: os.responsavelTecnico,
        solicitante: os.solicitante,
        equipamentoId: os.equipamentoId ? String(os.equipamentoId) : "",
        tipoServico: os.tipoServico,
        origemProblema: os.origemProblema,
        descricaoServico: os.descricaoServico,
        observacoes: os.observacoes,
      });
      setAcessorios(os.acessorios || []);
      setNumeroPreview(os.numero);
    } else {
      setForm({
        ...emptyForm,
        dataCriacao: nowLocalDatetime(),
        solicitante: fromEquipamento?.empresa || "",
        equipamentoId: fromEquipamento?.id ? String(fromEquipamento.id) : "",
        tipoServico: initialTipoServico || "",
      });
      setAcessorios([]);
      setNumeroPreview(nextOSNumber());
    }
    setNovoAcessorio("");
  }, [open, os, mode, nextOSNumber, fromEquipamento, initialTipoServico]);

  const update = (field: string, value: string) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const equipamentosDoCliente = useMemo(
    () => equipamentos.filter((e) => e.empresa === form.solicitante),
    [equipamentos, form.solicitante]
  );

  const equipamentoOptions = equipamentosDoCliente.map(
    (e) => `${e.tipo} - ${e.modelo} (${e.serie})`
  );

  const handleSolicitanteChange = (v: string) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, solicitante: v, equipamentoId: "" }));
  };

  const handleEquipamentoChange = (label: string) => {
    if (readOnly) return;
    const eq = equipamentosDoCliente.find(
      (e) => `${e.tipo} - ${e.modelo} (${e.serie})` === label
    );
    update("equipamentoId", eq ? String(eq.id) : "");
  };

  const equipamentoLabel = (() => {
    const eq = equipamentos.find((e) => String(e.id) === form.equipamentoId);
    return eq ? `${eq.tipo} - ${eq.modelo} (${eq.serie})` : "";
  })();

  const handleAddAcessorio = () => {
    const v = novoAcessorio.trim();
    if (!v) return;
    setAcessorios((prev) => [...prev, v]);
    setNovoAcessorio("");
  };

  const handleRemoveAcessorio = (i: number) =>
    setAcessorios((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!form.solicitante || !form.equipamentoId || !form.tipoServico || !form.estado) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      dataCriacao: form.dataCriacao,
      estado: form.estado,
      responsavelTecnico: form.responsavelTecnico,
      solicitante: form.solicitante,
      equipamentoId: Number(form.equipamentoId),
      tipoServico: form.tipoServico,
      origemProblema: form.origemProblema,
      descricaoServico: form.descricaoServico,
      acessorios,
      observacoes: form.observacoes,
    };
    if (mode === "edit" && os) {
      updateOrdemServico(os.id, payload);
      toast({ title: "Ordem de Serviço atualizada com sucesso!" });
    } else {
      addOrdemServico(payload);
      toast({ title: "Ordem de Serviço criada com sucesso!" });
    }
    onOpenChange(false);
  };

  const title =
    mode === "view" ? `Visualizar OS ${numeroPreview}` :
    mode === "edit" ? `Editar OS ${numeroPreview}` : "Nova Ordem de Serviço";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Identificação */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Número</Label>
              <Input value={numeroPreview} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Data de Criação</Label>
              <Input
                type="datetime-local"
                value={form.dataCriacao}
                onChange={(e) => update("dataCriacao", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Estado *</Label>
              {readOnly ? (
                <Input value={form.estado} disabled />
              ) : (
                <SearchableSelect
                  value={form.estado}
                  onValueChange={(v) => update("estado", v)}
                  options={estadosOS}
                  placeholder="Selecione o estado"
                  emptyText="Nenhum estado encontrado."
                />
              )}
            </div>
          </div>
        </div>

        {/* Pessoas e Equipamento */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Pessoas e Equipamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Responsável Técnico</Label>
              <Input
                value={form.responsavelTecnico}
                onChange={(e) => update("responsavelTecnico", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Solicitante *</Label>
              {readOnly ? (
                <Input value={form.solicitante} disabled />
              ) : (
                <SearchableSelect
                  value={form.solicitante}
                  onValueChange={handleSolicitanteChange}
                  options={empresas}
                  placeholder="Selecione a empresa"
                  emptyText="Nenhuma empresa encontrada."
                />
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm">Equipamento *</Label>
              {readOnly ? (
                <Input value={equipamentoLabel} disabled />
              ) : (
                <SearchableSelect
                  value={equipamentoLabel}
                  onValueChange={handleEquipamentoChange}
                  options={equipamentoOptions}
                  placeholder={
                    form.solicitante
                      ? "Selecione o equipamento do cliente"
                      : "Selecione um solicitante primeiro"
                  }
                  emptyText={
                    form.solicitante
                      ? "Nenhum equipamento cadastrado para este cliente."
                      : "Selecione um solicitante primeiro."
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Detalhes do Serviço */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Detalhes do Serviço</h3>
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Tipo de Serviço *</Label>
              {readOnly ? (
                <Input value={form.tipoServico} disabled />
              ) : (
                <SearchableSelect
                  value={form.tipoServico}
                  onValueChange={(v) => update("tipoServico", v)}
                  options={tiposOS}
                  placeholder="Selecione o tipo de serviço"
                  emptyText="Nenhum tipo encontrado."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Origem do Problema</Label>
              <Input
                placeholder="Ex: Relato do operador, alarme, etc."
                value={form.origemProblema}
                onChange={(e) => update("origemProblema", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Descrição do Serviço</Label>
              <Textarea
                placeholder="Detalhe o serviço a ser executado..."
                rows={5}
                value={form.descricaoServico}
                onChange={(e) => update("descricaoServico", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Acessórios */}
        <div className="rounded-lg border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Acessórios</h3>
          {!readOnly && (
            <div className="flex gap-2">
              <Input
                placeholder="Novo acessório..."
                value={novoAcessorio}
                onChange={(e) => setNovoAcessorio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAcessorio();
                  }
                }}
              />
              <Button type="button" onClick={handleAddAcessorio}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
          )}
          {acessorios.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {acessorios.map((a, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{a}</span>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAcessorio(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum acessório adicionado.</p>
          )}
        </div>

        {/* Observações */}
        <div className="rounded-lg border p-5 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Observações Gerais</h3>
          <Textarea
            placeholder="Informações gerais..."
            rows={5}
            value={form.observacoes}
            onChange={(e) => update("observacoes", e.target.value)}
            disabled={readOnly}
          />
        </div>

        </div>
        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && <Button onClick={handleSave}>Salvar OS</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrdemServicoFormDialog;

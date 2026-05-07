import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "@/hooks/use-toast";
import { useData, Equipamento } from "@/contexts/DataContext";

const capitalizeWords = (str: string) =>
  str.replace(/(^|\s)(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("pt-BR"));

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  equipamento?: Equipamento | null;
}

const emptyForm = {
  tipo: "",
  fabricante: "",
  modelo: "",
  estado: "Ativo",
  proprietario: "",
  serie: "",
  patrimonio: "",
  setor: "",
  tag: "",
};

const EquipamentoFormDialog = ({ open, onOpenChange, mode = "create", equipamento = null }: Props) => {
  const { tipos, addTipo, empresas, addEquipamento, updateEquipamento } = useData();
  const [addingTipo, setAddingTipo] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");
  const [form, setForm] = useState(emptyForm);

  const readOnly = mode === "view";

  useEffect(() => {
    if (!open) return;
    setAddingTipo(false);
    setNovoTipo("");
    if (equipamento && (mode === "edit" || mode === "view")) {
      setForm({
        tipo: equipamento.tipo,
        fabricante: equipamento.fabricante,
        modelo: equipamento.modelo,
        estado: equipamento.status,
        proprietario: equipamento.empresa,
        serie: equipamento.serie,
        patrimonio: equipamento.patrimonio,
        setor: equipamento.setor,
        tag: equipamento.tag,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, equipamento, mode]);

  const update = (field: string, value: string) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTipo = () => {
    const formatted = capitalizeWords(novoTipo.trim());
    if (!formatted) return;
    if (tipos.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: "Tipo já cadastrado", variant: "destructive" });
      return;
    }
    addTipo(formatted);
    update("tipo", formatted);
    setNovoTipo("");
    setAddingTipo(false);
    toast({ title: "Tipo adicionado com sucesso" });
  };

  const handleSave = () => {
    if (!form.tipo || !form.fabricante || !form.proprietario) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      tipo: form.tipo,
      fabricante: form.fabricante,
      modelo: form.modelo,
      status: form.estado,
      empresa: form.proprietario,
      serie: form.serie,
      patrimonio: form.patrimonio,
      setor: form.setor,
      tag: form.tag,
    };
    if (mode === "edit" && equipamento) {
      updateEquipamento(equipamento.id, payload);
      toast({ title: "Equipamento atualizado com sucesso!" });
    } else {
      addEquipamento(payload);
      toast({ title: "Equipamento cadastrado com sucesso!" });
    }
    onOpenChange(false);
  };

  const title =
    mode === "view" ? "Visualizar Equipamento" : mode === "edit" ? "Editar Equipamento" : "Novo Equipamento";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        {/* Dados do Equipamento */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Dados do Equipamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Tipo *</Label>
              {readOnly ? (
                <Input value={form.tipo} disabled />
              ) : !addingTipo ? (
                <SearchableSelect
                  value={form.tipo}
                  onValueChange={(v) => update("tipo", v)}
                  options={tipos}
                  placeholder="Selecione o tipo"
                  emptyText="Nenhum tipo encontrado."
                  onAddNew={() => setAddingTipo(true)}
                  addNewLabel="Adicionar novo tipo"
                />
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Novo tipo..." value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTipo()} className="flex-1" />
                  <Button type="button" size="sm" onClick={handleAddTipo}>Salvar</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingTipo(false); setNovoTipo(""); }}>Cancelar</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Fabricante *</Label>
              <Input placeholder="Ex: Philips" value={form.fabricante} onChange={(e) => update("fabricante", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Modelo</Label>
              <Input placeholder="Ex: MX800" value={form.modelo} onChange={(e) => update("modelo", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Estado</Label>
              {readOnly ? (
                <Input value={form.estado} disabled />
              ) : (
                <Select value={form.estado} onValueChange={(v) => update("estado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Desativado">Desativado</SelectItem>
                    <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Proprietário e Identificação */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Proprietário e Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Proprietário *</Label>
              {readOnly ? (
                <Input value={form.proprietario} disabled />
              ) : (
                <SearchableSelect
                  value={form.proprietario}
                  onValueChange={(v) => update("proprietario", v)}
                  options={empresas}
                  placeholder="Selecione a empresa"
                  emptyText="Nenhuma empresa encontrada."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">TAG</Label>
              <Input placeholder="Ex: TAG-0001" value={form.tag} onChange={(e) => update("tag", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Número de Série</Label>
              <Input placeholder="Ex: SN-001234" value={form.serie} onChange={(e) => update("serie", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Patrimônio</Label>
              <Input placeholder="Ex: PAT-0001" value={form.patrimonio} onChange={(e) => update("patrimonio", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Setor</Label>
              <Input placeholder="Ex: UTI, Centro Cirúrgico" value={form.setor} onChange={(e) => update("setor", e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && <Button onClick={handleSave}>Salvar Equipamento</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipamentoFormDialog;

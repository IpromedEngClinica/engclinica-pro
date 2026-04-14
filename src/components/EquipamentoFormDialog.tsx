import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const initialTipos = [
  "Monitor Multiparâmetro",
  "Ventilador Pulmonar",
  "Bisturi Elétrico",
  "Desfibrilador",
  "Bomba De Infusão",
];

const mockEmpresas = [
  "Hospital São Lucas",
  "Clínica Santa Maria",
  "Hospital Regional",
  "UPA Centro",
  "Clínica Vida",
];

const capitalizeWords = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EquipamentoFormDialog = ({ open, onOpenChange }: Props) => {
  const [tipos, setTipos] = useState<string[]>(initialTipos);
  const [novoTipo, setNovoTipo] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  const [form, setForm] = useState({
    tipo: "",
    fabricante: "",
    modelo: "",
    estado: "Ativo",
    proprietario: "",
    serie: "",
    patrimonio: "",
    setor: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAddTipo = () => {
    const formatted = capitalizeWords(novoTipo.trim());
    if (!formatted) return;
    if (tipos.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: "Tipo já cadastrado", variant: "destructive" });
      return;
    }
    setTipos([...tipos, formatted]);
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
    toast({ title: "Equipamento cadastrado com sucesso!" });
    onOpenChange(false);
    setForm({ tipo: "", fabricante: "", modelo: "", estado: "Ativo", proprietario: "", serie: "", patrimonio: "", setor: "" });
    setAddingTipo(false);
    setNovoTipo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Equipamento</DialogTitle>
        </DialogHeader>

        {/* Dados do Equipamento */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Dados do Equipamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              {!addingTipo ? (
                <div className="flex gap-2">
                  <Select value={form.tipo} onValueChange={(v) => update("tipo", v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setAddingTipo(true)} title="Adicionar novo tipo">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Novo tipo..."
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTipo()}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddTipo}>Salvar</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingTipo(false); setNovoTipo(""); }}>Cancelar</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fabricante *</Label>
              <Input placeholder="Ex: Philips" value={form.fabricante} onChange={(e) => update("fabricante", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input placeholder="Ex: MX800" value={form.modelo} onChange={(e) => update("modelo", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => update("estado", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Desativado">Desativado</SelectItem>
                  <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Proprietário e Identificação */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Proprietário e Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proprietário *</Label>
              <Select value={form.proprietario} onValueChange={(v) => update("proprietario", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {mockEmpresas.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número de Série</Label>
              <Input placeholder="Ex: SN-001234" value={form.serie} onChange={(e) => update("serie", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Patrimônio</Label>
              <Input placeholder="Ex: PAT-0001" value={form.patrimonio} onChange={(e) => update("patrimonio", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              <Input placeholder="Ex: UTI, Centro Cirúrgico" value={form.setor} onChange={(e) => update("setor", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Procedimento - futuro */}
        <div className="rounded-lg border p-4 opacity-50">
          <h3 className="text-sm font-semibold text-muted-foreground">Procedimento</h3>
          <p className="text-xs text-muted-foreground mt-1">Será implementado futuramente</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Equipamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipamentoFormDialog;

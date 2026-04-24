import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useData, Empresa } from "@/contexts/DataContext";

export type DialogMode = "create" | "edit" | "view";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  empresa?: Empresa | null;
}

const emptyForm = {
  nome: "", nomeFantasia: "", cpfCnpj: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  contato: "", email: "", celular: "", telefone: "",
};

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const EmpresaFormDialog = ({ open, onOpenChange, mode = "create", empresa = null }: EmpresaFormDialogProps) => {
  const { addEmpresa, updateEmpresa } = useData();
  const [form, setForm] = useState(emptyForm);

  const readOnly = mode === "view";

  useEffect(() => {
    if (!open) return;
    if (empresa && (mode === "edit" || mode === "view")) {
      const { id, ...rest } = empresa;
      setForm(rest);
    } else {
      setForm(emptyForm);
    }
  }, [open, empresa, mode]);

  const handleChange = (field: string, value: string) => {
    if (readOnly) return;
    if (field === "cpfCnpj") value = formatCpfCnpj(value);
    if (field === "cep") value = formatCep(value);
    if (field === "celular" || field === "telefone") value = formatPhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.nome || !form.cpfCnpj) {
      toast.error("Preencha os campos obrigatórios: Nome e CPF/CNPJ");
      return;
    }
    if (mode === "edit" && empresa) {
      updateEmpresa(empresa.id, form);
      toast.success("Empresa atualizada com sucesso!");
    } else {
      addEmpresa(form);
      toast.success("Empresa cadastrada com sucesso!");
    }
    onOpenChange(false);
  };

  const title =
    mode === "view" ? "Visualizar Empresa" : mode === "edit" ? "Editar Empresa" : "Nova Empresa / Cliente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Dados Principais */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Dados Principais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} placeholder="Razão Social" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={form.nomeFantasia} onChange={(e) => handleChange("nomeFantasia", e.target.value)} placeholder="Nome Fantasia" disabled={readOnly} />
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>CPF/CNPJ *</Label>
            <Input value={form.cpfCnpj} onChange={(e) => handleChange("cpfCnpj", e.target.value)} placeholder="000.000.000-00 / 00.000.000/0000-00" disabled={readOnly} />
          </div>
        </div>

        {/* Endereço */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Endereço</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => handleChange("cep", e.target.value)} placeholder="00000-000" disabled={readOnly} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-3">
              <Label>Rua</Label>
              <Input value={form.rua} onChange={(e) => handleChange("rua", e.target.value)} placeholder="Logradouro" disabled={readOnly} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => handleChange("numero", e.target.value)} placeholder="Nº" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => handleChange("complemento", e.target.value)} placeholder="Sala, Bloco..." disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => handleChange("bairro", e.target.value)} placeholder="Bairro" disabled={readOnly} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => handleChange("cidade", e.target.value)} placeholder="Cidade" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => handleChange("estado", e.target.value)} placeholder="UF" disabled={readOnly} />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input value={form.contato} onChange={(e) => handleChange("contato", e.target.value)} placeholder="Nome do contato" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="email@exemplo.com" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Celular / WhatsApp</Label>
              <Input value={form.celular} onChange={(e) => handleChange("celular", e.target.value)} placeholder="(00) 00000-0000" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => handleChange("telefone", e.target.value)} placeholder="(00) 0000-0000" disabled={readOnly} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && <Button onClick={handleSubmit}>Salvar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaFormDialog;

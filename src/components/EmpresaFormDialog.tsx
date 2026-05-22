import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { EmpresaFormInput, EmpresaSupabase } from "@/services/empresasService";
import { useAtualizarEmpresa, useCriarEmpresa } from "@/hooks/useEmpresas";

export type DialogMode = "create" | "edit" | "view";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  empresa?: EmpresaSupabase | null;
}

type TipoCliente = "Prefeitura" | "Pessoa Jurídica" | "Particular";

const TIPOS_CLIENTE: TipoCliente[] = ["Prefeitura", "Pessoa Jurídica", "Particular"];

const emptyForm: EmpresaFormInput = {
  nome: "",
  nomeFantasia: "",
  tipoCliente: "",
  tipoRelacao: "cliente",
  cpfCnpj: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  contato: "",
  email: "",
  celular: "",
  telefone: "",
  observacoes: "",
};

const empresaToForm = (empresa: EmpresaSupabase): EmpresaFormInput => ({
  nome: empresa.nome ?? "",
  nomeFantasia: empresa.nome_fantasia ?? "",
  tipoCliente: empresa.tipo_cliente ?? "",
  tipoRelacao: empresa.tipo_relacao ?? "cliente",
  cpfCnpj: empresa.cpf_cnpj ?? "",
  cep: empresa.cep ?? "",
  rua: empresa.rua ?? "",
  numero: empresa.numero ?? "",
  complemento: empresa.complemento ?? "",
  bairro: empresa.bairro ?? "",
  cidade: empresa.cidade ?? "",
  estado: empresa.estado ?? "",
  contato: empresa.contato ?? "",
  email: empresa.email ?? "",
  celular: empresa.celular ?? "",
  telefone: empresa.telefone ?? "",
  observacoes: empresa.observacoes ?? "",
});

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

const EmpresaFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  empresa = null,
}: EmpresaFormDialogProps) => {
  const criarEmpresa = useCriarEmpresa();
  const atualizarEmpresa = useAtualizarEmpresa();

  const [form, setForm] = useState<EmpresaFormInput>(emptyForm);

  const readOnly = mode === "view";
  const saving = criarEmpresa.isPending || atualizarEmpresa.isPending;

  useEffect(() => {
    if (!open) return;

    if (empresa && (mode === "edit" || mode === "view")) {
      setForm(empresaToForm(empresa));
    } else {
      setForm(emptyForm);
    }
  }, [open, empresa, mode]);

  const handleChange = (field: keyof EmpresaFormInput, value: string) => {
    if (readOnly) return;

    let formattedValue = value;

    if (field === "cpfCnpj") formattedValue = formatCpfCnpj(value);
    if (field === "cep") formattedValue = formatCep(value);
    if (field === "celular" || field === "telefone") {
      formattedValue = formatPhone(value);
    }
    if (field === "estado") formattedValue = value.toUpperCase().slice(0, 2);

    setForm((prev) => ({ ...prev, [field]: formattedValue }));
  };

  const handleSubmit = async () => {
    if (!form.nome?.trim()) {
      toast.error("Preencha o nome da empresa.");
      return;
    }

    try {
      if (mode === "edit" && empresa) {
        await atualizarEmpresa.mutateAsync({
          id: empresa.id,
          input: {
            ...form,
            nome: form.nome.trim(),
          },
        });

        toast.success("Empresa atualizada com sucesso!");
      } else {
        await criarEmpresa.mutateAsync({
          ...form,
          nome: form.nome.trim(),
        });

        toast.success("Empresa cadastrada com sucesso!");
      }

      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar empresa.";

      toast.error(message);
    }
  };

  const title =
    mode === "view"
      ? "Visualizar Empresa"
      : mode === "edit"
        ? "Editar Empresa"
        : "Nova Empresa / Cliente";

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
              <Input
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                placeholder="Razão Social"
                disabled={readOnly || saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input
                value={form.nomeFantasia}
                onChange={(e) => handleChange("nomeFantasia", e.target.value)}
                placeholder="Nome Fantasia"
                disabled={readOnly || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Cliente</Label>
              <Select
                value={form.tipoCliente || ""}
                onValueChange={(v) => handleChange("tipoCliente", v)}
                disabled={readOnly || saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CLIENTE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>CPF/CNPJ</Label>
              <Input
                value={form.cpfCnpj}
                onChange={(e) => handleChange("cpfCnpj", e.target.value)}
                placeholder="000.000.000-00 / 00.000.000/0000-00"
                disabled={readOnly || saving}
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Endereço</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
                placeholder="00000-000"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-3">
              <Label>Rua</Label>
              <Input
                value={form.rua}
                onChange={(e) => handleChange("rua", e.target.value)}
                placeholder="Logradouro"
                disabled={readOnly || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={form.numero}
                onChange={(e) => handleChange("numero", e.target.value)}
                placeholder="Nº"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => handleChange("complemento", e.target.value)}
                placeholder="Sala, Bloco..."
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => handleChange("bairro", e.target.value)}
                placeholder="Bairro"
                disabled={readOnly || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
                placeholder="Cidade"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input
                value={form.estado}
                onChange={(e) => handleChange("estado", e.target.value)}
                placeholder="UF"
                disabled={readOnly || saving}
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input
                value={form.contato}
                onChange={(e) => handleChange("contato", e.target.value)}
                placeholder="Nome do contato"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@exemplo.com"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Celular / WhatsApp</Label>
              <Input
                value={form.celular}
                onChange={(e) => handleChange("celular", e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={readOnly || saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(00) 0000-0000"
                disabled={readOnly || saving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>

          {!readOnly && (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaFormDialog;
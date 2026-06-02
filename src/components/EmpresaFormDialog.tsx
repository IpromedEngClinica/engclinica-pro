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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { EmpresaFormInput, EmpresaSupabase } from "@/services/empresasService";
import { useAtualizarEmpresa, useCriarEmpresa } from "@/hooks/useEmpresas";
import { consultarCep, onlyDigits, UFS_BRASIL } from "@/utils/brasil";

export type DialogMode = "create" | "edit" | "view";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  empresa?: EmpresaSupabase | null;
}

type TipoCliente = "Prefeitura" | "Pessoa Jurídica" | "Particular";

const TIPOS_CLIENTE: TipoCliente[] = ["Prefeitura", "Pessoa Jurídica", "Particular"];

const TIPOS_RELACAO = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "parceiro", label: "Parceiro" },
  { value: "ambos", label: "Ambos" },
];

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
  incluirCriterioAceitacaoCalibracao: false,
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
  incluirCriterioAceitacaoCalibracao:
    empresa.incluir_criterio_aceitacao_calibracao ?? false,
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
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [ultimoCepConsultado, setUltimoCepConsultado] = useState("");

  const readOnly = mode === "view";
  const saving = criarEmpresa.isPending || atualizarEmpresa.isPending;

  useEffect(() => {
    if (!open) return;

    if (empresa && (mode === "edit" || mode === "view")) {
      setForm(empresaToForm(empresa));
      setUltimoCepConsultado(onlyDigits(empresa.cep ?? ""));
    } else {
      setForm(emptyForm);
      setUltimoCepConsultado("");
    }
  }, [open, empresa, mode]);

  const preencherCep = async (cep: string) => {
    if (readOnly) return;

    const cepDigits = onlyDigits(cep);

    if (cepDigits.length !== 8) return;
    if (cepDigits === ultimoCepConsultado) return;

    try {
      setBuscandoCep(true);
      setUltimoCepConsultado(cepDigits);

      const data = await consultarCep(cepDigits);

      setForm((prev) => ({
        ...prev,
        cep: data.cep || prev.cep,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        complemento: prev.complemento || data.complemento || "",
      }));

      toast.success("Endereço preenchido pelo CEP.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar CEP.";
      toast.error(message);
    } finally {
      setBuscandoCep(false);
    }
  };

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

    if (field === "cep") {
      const cepDigits = onlyDigits(formattedValue);
      if (cepDigits.length === 8) {
        preencherCep(cepDigits);
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.nome?.trim()) {
      toast.error("Preencha o nome da empresa.");
      return;
    }

    if (form.estado && form.estado.length !== 2) {
      toast.error("UF deve conter exatamente 2 letras.");
      return;
    }

    try {
      if (mode === "edit" && empresa) {
        await atualizarEmpresa.mutateAsync({
          id: empresa.id,
          input: {
            ...form,
            nome: form.nome.trim(),
            estado: form.estado?.toUpperCase() || "",
          },
        });

        toast.success("Empresa atualizada com sucesso!");
      } else {
        await criarEmpresa.mutateAsync({
          ...form,
          nome: form.nome.trim(),
          estado: form.estado?.toUpperCase() || "",
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <Label>Tipo de Relação</Label>
              <Select
                value={form.tipoRelacao || "cliente"}
                onValueChange={(v) => handleChange("tipoRelacao", v)}
                disabled={readOnly || saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a relação" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RELACAO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
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
                placeholder="000.000.000-00"
                disabled={readOnly || saving}
              />
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.incluirCriterioAceitacaoCalibracao ?? false}
                  onCheckedChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      incluirCriterioAceitacaoCalibracao: Boolean(value),
                    }))
                  }
                  disabled={readOnly || saving}
                />
                Incluir critério de aceitação nas calibrações deste cliente?
              </label>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              Quando habilitado, novas calibrações deste cliente utilizarão
              critério de aceitação e poderão emitir declaração de conformidade.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Endereço</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
                placeholder="00000-000"
                disabled={readOnly || saving || buscandoCep}
              />
              {buscandoCep && (
                <p className="text-xs text-muted-foreground">Consultando CEP...</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label>UF</Label>
              <Select
                value={form.estado || ""}
                onValueChange={(value) => handleChange("estado", value)}
                disabled={readOnly || saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a UF" />
                </SelectTrigger>
                <SelectContent>
                  {UFS_BRASIL.map((uf) => (
                    <SelectItem key={uf.sigla} value={uf.sigla}>
                      {uf.sigla} - {uf.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

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

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Observações</h3>

          <div className="space-y-1.5">
            <Label>Observações internas</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              placeholder="Informações internas sobre a empresa."
              disabled={readOnly || saving}
              rows={4}
            />
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

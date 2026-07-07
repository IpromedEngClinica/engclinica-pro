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
import { ChevronDown, ClipboardPaste, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  EmpresaFormInput,
  EmpresaSetorFormInput,
  EmpresaSupabase,
} from "@/services/empresasService";
import { useAtualizarEmpresa, useCriarEmpresa } from "@/hooks/useEmpresas";
import { consultarCep, onlyDigits, UFS_BRASIL } from "@/utils/brasil";
import { useAuth } from "@/contexts/AuthContext";

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

const REPRESENTANTES_COMERCIAIS = ["Dayvid", "Lauro", "Leandro", "Igor"];

const EMPRESA_DRAFT_KEY = "engclinica:empresa-create-draft";

const emptyForm: EmpresaFormInput = {
  nome: "",
  nomeFantasia: "",
  tipoCliente: "",
  tipoRelacao: "cliente",
  representanteComercialSetor: "",
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
  setores: [],
};

const empresaToForm = (empresa: EmpresaSupabase): EmpresaFormInput => ({
  nome: empresa.nome ?? "",
  nomeFantasia: empresa.nome_fantasia ?? "",
  tipoCliente: empresa.tipo_cliente ?? "",
  tipoRelacao: empresa.tipo_relacao ?? "cliente",
  representanteComercialSetor: empresa.representante_comercial_setor ?? "",
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
  setores: (empresa.setores || []).map((setor) => ({
    id: setor.id,
    nome: setor.nome ?? "",
    cep: setor.cep ?? "",
    rua: setor.rua ?? "",
    numero: setor.numero ?? "",
    complemento: setor.complemento ?? "",
    bairro: setor.bairro ?? "",
    cidade: setor.cidade ?? "",
    estado: setor.estado ?? "",
    observacoes: setor.observacoes ?? "",
    mesmoEnderecoCliente: setor.mesmo_endereco_cliente ?? false,
  })),
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

const normalizeCadastroRapidoText = (value: string) =>
  value
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getCadastroRapidoValue = (texto: string, labels: string[]) => {
  const lines = texto
    .split(/\r?\n/)
    .map((line) => line.replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;

    const rawLabel = line.slice(0, separatorIndex);
    const normalizedLabel = normalizeCadastroRapidoText(rawLabel);

    if (labels.some((label) => normalizedLabel.includes(label))) {
      return line.slice(separatorIndex + 1).trim();
    }
  }

  return "";
};

const parseCadastroRapidoEndereco = (endereco: string) => {
  const cleaned = endereco.trim();
  if (!cleaned) {
    return { rua: "", numero: "", complemento: "" };
  }

  const numeroMatch = cleaned.match(
    /^(.*?)(?:,\s*)?(?:n(?:umero|º|o)?\.?\s*)?(\d+[a-zA-Z]?)(?:\s*[-–—]\s*(.*))?$/i
  );

  if (!numeroMatch) {
    return { rua: cleaned, numero: "", complemento: "" };
  }

  return {
    rua: numeroMatch[1]?.replace(/[,\s]+$/g, "").trim() || cleaned,
    numero: numeroMatch[2]?.trim() || "",
    complemento: numeroMatch[3]?.trim() || "",
  };
};

const parseCadastroRapidoEmpresa = (texto: string): Partial<EmpresaFormInput> => {
  const razaoSocial = getCadastroRapidoValue(texto, ["razao social"]);
  const cpfCnpj = getCadastroRapidoValue(texto, [
    "cnpj ou cpf",
    "cpf ou cnpj",
    "cnpj",
    "cpf",
  ]);
  const telefone = getCadastroRapidoValue(texto, ["telefone", "celular"]);
  const endereco = getCadastroRapidoValue(texto, ["endereco"]);
  const bairro = getCadastroRapidoValue(texto, ["bairro"]);
  const cidade = getCadastroRapidoValue(texto, ["cidade"]);
  const estado = getCadastroRapidoValue(texto, ["estado", "uf"]);
  const cep = getCadastroRapidoValue(texto, ["cep"]);
  const email = getCadastroRapidoValue(texto, ["e-mail", "email"]);
  const enderecoParsed = parseCadastroRapidoEndereco(endereco);
  const telefoneDigits = onlyDigits(telefone);
  const documentoDigits = onlyDigits(cpfCnpj);

  return {
    nome: razaoSocial,
    cpfCnpj: cpfCnpj ? formatCpfCnpj(cpfCnpj) : "",
    tipoCliente:
      documentoDigits.length === 14
        ? "Pessoa JurÃ­dica"
        : documentoDigits.length === 11
          ? "Particular"
          : "",
    telefone:
      telefone && telefoneDigits.length <= 10 ? formatPhone(telefone) : "",
    celular:
      telefone && telefoneDigits.length > 10 ? formatPhone(telefone) : "",
    rua: enderecoParsed.rua,
    numero: enderecoParsed.numero,
    complemento: enderecoParsed.complemento,
    bairro,
    cidade,
    estado: estado.toUpperCase().slice(0, 2),
    cep: cep ? formatCep(cep) : "",
    email,
  };
};

const emptySetor = (): EmpresaSetorFormInput => ({
  nome: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  observacoes: "",
  mesmoEnderecoCliente: false,
});

const ENDERECO_FIELDS: Array<
  keyof Pick<
    EmpresaSetorFormInput,
    "cep" | "rua" | "numero" | "complemento" | "bairro" | "cidade" | "estado"
  >
> = ["cep", "rua", "numero", "complemento", "bairro", "cidade", "estado"];

const setorHasData = (setor: EmpresaSetorFormInput) =>
  Boolean(
    setor.nome?.trim() ||
      setor.mesmoEnderecoCliente ||
      setor.cep?.trim() ||
      setor.rua?.trim() ||
      setor.numero?.trim() ||
      setor.complemento?.trim() ||
      setor.bairro?.trim() ||
      setor.cidade?.trim() ||
      setor.estado?.trim() ||
      setor.observacoes?.trim()
  );

const getEnderecoClienteParaSetor = (
  form: EmpresaFormInput
): Pick<
  EmpresaSetorFormInput,
  "cep" | "rua" | "numero" | "complemento" | "bairro" | "cidade" | "estado"
> => ({
  cep: form.cep || "",
  rua: form.rua || "",
  numero: form.numero || "",
  complemento: form.complemento || "",
  bairro: form.bairro || "",
  cidade: form.cidade || "",
  estado: form.estado || "",
});

const sincronizarSetoresComEnderecoCliente = (
  form: EmpresaFormInput
): EmpresaFormInput => ({
  ...form,
  setores: (form.setores || []).map((setor) =>
    setor.mesmoEnderecoCliente
      ? { ...setor, ...getEnderecoClienteParaSetor(form) }
      : setor
  ),
});

const EmpresaFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  empresa = null,
}: EmpresaFormDialogProps) => {
  const criarEmpresa = useCriarEmpresa();
  const atualizarEmpresa = useAtualizarEmpresa();
  const { usuario } = useAuth();

  const [form, setForm] = useState<EmpresaFormInput>(emptyForm);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCepSetorIndex, setBuscandoCepSetorIndex] = useState<number | null>(
    null
  );
  const [ultimoCepConsultado, setUltimoCepConsultado] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [cadastroRapidoOpen, setCadastroRapidoOpen] = useState(false);
  const [cadastroRapidoTexto, setCadastroRapidoTexto] = useState("");
  const [setoresOpen, setSetoresOpen] = useState(false);

  const readOnly = mode === "view";
  const saving = criarEmpresa.isPending || atualizarEmpresa.isPending;
  const showInternalFields = Boolean(
    usuario?.perfil && usuario.perfil !== "solicitante"
  );

  useEffect(() => {
    if (!open) {
      setDraftReady(false);
      return;
    }

    if (empresa && (mode === "edit" || mode === "view")) {
      setForm(empresaToForm(empresa));
      setUltimoCepConsultado(onlyDigits(empresa.cep ?? ""));
      setSetoresOpen(false);
      setDraftReady(false);
    } else {
      let nextForm: EmpresaFormInput = { ...emptyForm, setores: [] };

      try {
        const savedDraft = sessionStorage.getItem(EMPRESA_DRAFT_KEY);
        if (savedDraft) {
          const parsedDraft = JSON.parse(savedDraft) as Partial<EmpresaFormInput>;
          nextForm = {
            ...emptyForm,
            ...parsedDraft,
            setores: Array.isArray(parsedDraft.setores) ? parsedDraft.setores : [],
          };
          toast.info("Rascunho do cadastro recuperado.");
        }
      } catch {
        sessionStorage.removeItem(EMPRESA_DRAFT_KEY);
      }

      setForm(nextForm);
      setUltimoCepConsultado("");
      setSetoresOpen(false);

      const timer = window.setTimeout(() => setDraftReady(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open, empresa, mode]);

  useEffect(() => {
    if (!open || mode !== "create" || readOnly || !draftReady) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(EMPRESA_DRAFT_KEY, JSON.stringify(form));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [open, mode, readOnly, draftReady, form]);

  const clearCreateDraft = () => {
    if (mode === "create") {
      sessionStorage.removeItem(EMPRESA_DRAFT_KEY);
    }
  };

  const aplicarCadastroRapido = () => {
    if (readOnly) return;

    const parsed = parseCadastroRapidoEmpresa(cadastroRapidoTexto);
    const hasAnyValue = Object.values(parsed).some((value) =>
      typeof value === "string" ? Boolean(value.trim()) : Boolean(value)
    );

    if (!hasAnyValue) {
      toast.error("Nao foi possivel identificar campos na ficha colada.");
      return;
    }

    setForm((prev) => {
      const next: EmpresaFormInput = {
        ...prev,
        nome: parsed.nome || prev.nome,
        tipoCliente: parsed.tipoCliente || prev.tipoCliente,
        cpfCnpj: parsed.cpfCnpj || prev.cpfCnpj,
        cep: parsed.cep || prev.cep,
        rua: parsed.rua || prev.rua,
        numero: parsed.numero || prev.numero,
        complemento: parsed.complemento || prev.complemento,
        bairro: parsed.bairro || prev.bairro,
        cidade: parsed.cidade || prev.cidade,
        estado: parsed.estado || prev.estado,
        telefone: parsed.telefone || prev.telefone,
        celular: parsed.celular || prev.celular,
        email: parsed.email || prev.email,
      };

      return sincronizarSetoresComEnderecoCliente(next);
    });

    if (parsed.cep) {
      setUltimoCepConsultado(onlyDigits(parsed.cep));
    }

    setCadastroRapidoOpen(false);
    setCadastroRapidoTexto("");
    toast.success("Ficha interpretada. Confira os dados antes de salvar.");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    if (!nextOpen) {
      clearCreateDraft();
      setCadastroRapidoOpen(false);
      setCadastroRapidoTexto("");
    }
    onOpenChange(nextOpen);
  };

  const preencherCep = async (cep: string) => {
    if (readOnly) return;

    const cepDigits = onlyDigits(cep);

    if (cepDigits.length !== 8) return;
    if (cepDigits === ultimoCepConsultado) return;

    try {
      setBuscandoCep(true);
      setUltimoCepConsultado(cepDigits);

      const data = await consultarCep(cepDigits);

      setForm((prev) =>
        sincronizarSetoresComEnderecoCliente({
          ...prev,
          cep: data.cep || prev.cep,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: prev.complemento || data.complemento || "",
        })
      );

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

    setForm((prev) => {
      const next = { ...prev, [field]: formattedValue };

      if (
        ENDERECO_FIELDS.includes(field as (typeof ENDERECO_FIELDS)[number])
      ) {
        return sincronizarSetoresComEnderecoCliente(next);
      }

      return next;
    });

    if (field === "cep") {
      const cepDigits = onlyDigits(formattedValue);
      if (cepDigits.length === 8) {
        preencherCep(cepDigits);
      }
    }
  };

  const preencherCepSetor = async (index: number, cep: string) => {
    if (readOnly) return;

    const cepDigits = onlyDigits(cep);
    if (cepDigits.length !== 8) return;

    try {
      setBuscandoCepSetorIndex(index);
      const data = await consultarCep(cepDigits);

      setForm((prev) => {
        const setores = [...(prev.setores || [])];
        const setor = setores[index];
        if (!setor) return prev;

        setores[index] = {
          ...setor,
          cep: data.cep || setor.cep,
          rua: data.logradouro || setor.rua,
          bairro: data.bairro || setor.bairro,
          cidade: data.localidade || setor.cidade,
          estado: data.uf || setor.estado,
          complemento: setor.complemento || data.complemento || "",
        };

        return { ...prev, setores };
      });

      toast.success("Endereço do setor preenchido pelo CEP.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao consultar CEP.";
      toast.error(message);
    } finally {
      setBuscandoCepSetorIndex(null);
    }
  };

  const handleSetorChange = (
    index: number,
    field: keyof EmpresaSetorFormInput,
    value: string
  ) => {
    if (readOnly) return;

    let formattedValue = value;
    if (field === "cep") formattedValue = formatCep(value);
    if (field === "estado") formattedValue = value.toUpperCase().slice(0, 2);

    setForm((prev) => {
      const setores = [...(prev.setores || [])];
      const setor = setores[index] || emptySetor();
      setores[index] = { ...setor, [field]: formattedValue };
      return { ...prev, setores };
    });

    if (field === "cep") {
      const cepDigits = onlyDigits(formattedValue);
      if (cepDigits.length === 8) {
        preencherCepSetor(index, cepDigits);
      }
    }
  };

  const handleSetorMesmoEnderecoChange = (index: number, checked: boolean) => {
    if (readOnly) return;

    setForm((prev) => {
      const setores = [...(prev.setores || [])];
      const setor = setores[index] || emptySetor();

      setores[index] = checked
        ? {
            ...setor,
            mesmoEnderecoCliente: true,
            ...getEnderecoClienteParaSetor(prev),
          }
        : {
            ...setor,
            mesmoEnderecoCliente: false,
          };

      return { ...prev, setores };
    });
  };

  const adicionarSetor = () => {
    if (readOnly) return;
    setSetoresOpen(true);
    setForm((prev) => ({
      ...prev,
      setores: [...(prev.setores || []), emptySetor()],
    }));
  };

  const removerSetor = (index: number) => {
    if (readOnly) return;
    setForm((prev) => ({
      ...prev,
      setores: (prev.setores || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validarSetores = () => {
    const setores = form.setores || [];
    const nomes = new Set<string>();

    for (const setor of setores) {
      if (!setorHasData(setor)) continue;

      const nome = setor.nome.trim();
      if (!nome) {
        toast.error("Informe o nome do setor/unidade ou remova a linha.");
        return false;
      }

      if (setor.estado && setor.estado.length !== 2) {
        toast.error("UF do setor deve conter exatamente 2 letras.");
        return false;
      }

      const key = nome.toLocaleLowerCase("pt-BR");
      if (nomes.has(key)) {
        toast.error("Existe setor/unidade duplicado para esta empresa.");
        return false;
      }
      nomes.add(key);
    }

    return true;
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

    if (!validarSetores()) return;

    try {
      const setores = (form.setores || [])
        .filter(setorHasData)
        .map((setor) => {
          const setorNormalizado = setor.mesmoEnderecoCliente
            ? { ...setor, ...getEnderecoClienteParaSetor(form) }
            : setor;

          return {
            ...setorNormalizado,
            nome: setor.nome.trim(),
            estado: setorNormalizado.estado?.toUpperCase() || "",
          };
        });

      if (mode === "edit" && empresa) {
        await atualizarEmpresa.mutateAsync({
          id: empresa.id,
          input: {
            ...form,
            nome: form.nome.trim(),
            estado: form.estado?.toUpperCase() || "",
            setores,
          },
        });

        toast.success("Empresa atualizada com sucesso!");
      } else {
        await criarEmpresa.mutateAsync({
          ...form,
          nome: form.nome.trim(),
          estado: form.estado?.toUpperCase() || "",
          setores,
        });

        toast.success("Empresa cadastrada com sucesso!");
      }

      clearCreateDraft();
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
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="flex flex-1 items-start gap-2 text-left"
              onClick={() => setSetoresOpen((current) => !current)}
            >
              <ChevronDown
                className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${
                  setoresOpen ? "rotate-180" : ""
                }`}
              />
              <div>
              <h3 className="text-sm font-semibold text-foreground">
                Setores / Unidades do Cliente
              </h3>
              <p className="text-xs text-muted-foreground">
                {(form.setores || []).length} setor(es) cadastrado(s). Clique para exibir ou recolher.
              </p>
              </div>
            </button>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarSetor}
                disabled={saving}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar setor
              </Button>
            )}
          </div>

          {setoresOpen && (form.setores || []).length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Nenhum setor fixo cadastrado. Equipamentos deste cliente continuarão
              usando setor em campo livre.
            </p>
          ) : null}

          {setoresOpen && (form.setores || []).length > 0 ? (
            <div className="space-y-4">
              {(form.setores || []).map((setor, index) => (
                <div
                  key={setor.id || index}
                  className="rounded-md border bg-muted/20 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">
                      Setor / Unidade {index + 1}
                    </h4>

                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerSetor(index)}
                        disabled={saving}
                        title="Remover setor"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Nome do setor/unidade *</Label>
                      <Input
                        value={setor.nome}
                        onChange={(e) =>
                          handleSetorChange(index, "nome", e.target.value)
                        }
                        placeholder="Ex: UBS Centro, Escola Municipal A, UTI"
                        disabled={readOnly || saving}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <Checkbox
                        checked={setor.mesmoEnderecoCliente ?? false}
                        onCheckedChange={(value) =>
                          handleSetorMesmoEnderecoChange(index, value === true)
                        }
                        disabled={readOnly || saving}
                      />
                      Setor no mesmo endereço do cliente
                    </label>

                    <div className="space-y-1.5">
                      <Label>CEP</Label>
                      <Input
                        value={setor.cep}
                        onChange={(e) =>
                          handleSetorChange(index, "cep", e.target.value)
                        }
                        placeholder="00000-000"
                        disabled={
                          readOnly ||
                          saving ||
                          setor.mesmoEnderecoCliente ||
                          buscandoCepSetorIndex === index
                        }
                      />
                      {buscandoCepSetorIndex === index && (
                        <p className="text-xs text-muted-foreground">
                          Consultando CEP...
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Rua</Label>
                      <Input
                        value={setor.rua}
                        onChange={(e) =>
                          handleSetorChange(index, "rua", e.target.value)
                        }
                        placeholder="Logradouro"
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Número</Label>
                      <Input
                        value={setor.numero}
                        onChange={(e) =>
                          handleSetorChange(index, "numero", e.target.value)
                        }
                        placeholder="Nº"
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Complemento</Label>
                      <Input
                        value={setor.complemento}
                        onChange={(e) =>
                          handleSetorChange(index, "complemento", e.target.value)
                        }
                        placeholder="Sala, bloco..."
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Bairro</Label>
                      <Input
                        value={setor.bairro}
                        onChange={(e) =>
                          handleSetorChange(index, "bairro", e.target.value)
                        }
                        placeholder="Bairro"
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Cidade</Label>
                      <Input
                        value={setor.cidade}
                        onChange={(e) =>
                          handleSetorChange(index, "cidade", e.target.value)
                        }
                        placeholder="Cidade"
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>UF</Label>
                      <Select
                        value={setor.estado || ""}
                        onValueChange={(value) =>
                          handleSetorChange(index, "estado", value)
                        }
                        disabled={readOnly || saving || setor.mesmoEnderecoCliente}
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

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Observações do setor</Label>
                      <Textarea
                        value={setor.observacoes}
                        onChange={(e) =>
                          handleSetorChange(index, "observacoes", e.target.value)
                        }
                        placeholder="Referências, responsável local ou informações internas."
                        disabled={readOnly || saving}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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

          {showInternalFields && (
            <div className="space-y-1.5">
              <Label>Representante comercial do setor</Label>
              <Select
                value={form.representanteComercialSetor || undefined}
                onValueChange={(value) =>
                  handleChange("representanteComercialSetor", value)
                }
                disabled={readOnly || saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o representante" />
                </SelectTrigger>
                <SelectContent>
                  {REPRESENTANTES_COMERCIAIS.map((representante) => (
                    <SelectItem key={representante} value={representante}>
                      {representante}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCadastroRapidoOpen(true)}
                disabled={saving}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Cadastro rapido
              </Button>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>

            {!readOnly && (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={cadastroRapidoOpen} onOpenChange={setCadastroRapidoOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastro rapido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cole a ficha padrao de cadastro. O sistema vai identificar os campos
            e preencher o formulario principal para conferencia antes de salvar.
          </p>
          <Textarea
            value={cadastroRapidoTexto}
            onChange={(event) => setCadastroRapidoTexto(event.target.value)}
            rows={12}
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setCadastroRapidoOpen(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={aplicarCadastroRapido}
            disabled={saving || !cadastroRapidoTexto.trim()}
          >
            Preencher cadastro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EmpresaFormDialog;

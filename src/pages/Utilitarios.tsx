import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ListLimitSelect, { DEFAULT_LIST_LIMIT } from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { toast } from "@/hooks/use-toast";
import {
  useAtualizarMensalidadeTermo,
  useAtualizarStatusTermoLocacao,
  useCriarRecibo,
  useCriarTermoLocacao,
  useRecibos,
  useTermosLocacao,
  useVencimentosUtilitarios,
} from "@/hooks/useUtilitarios";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type {
  Recibo,
  TermoLocacao,
  TermoLocacaoModalidade,
  TermoLocacaoTipo,
  VencimentoClienteGrupo,
  VencimentoEquipamentoItem,
} from "@/services/utilitariosService";
import { gerarPdfCadastroVisita } from "@/utils/gerarPdfCadastroVisita";
import { gerarPdfRecibo } from "@/utils/gerarPdfRecibo";
import { gerarPdfTermoLocacao } from "@/utils/gerarPdfTermoLocacao";

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type FormState = {
  tipo: TermoLocacaoTipo;
  modalidadeCobranca: TermoLocacaoModalidade;
  empresaLocatariaId: string;
  equipamentoId: string;
  responsavelEntrega: string;
  responsavelRecebimento: string;
  localEntrega: string;
  dataInicio: string;
  dataPrevistaDevolucao: string;
  valorUnico: string;
  valorMensal: string;
  diaVencimento: string;
  quantidadeMensalidades: string;
  primeiroVencimento: string;
  observacoes: string;
};

type CadastroVisitaFormState = {
  cliente: string;
  dataVisita: string;
  linhas: string;
  colunas: CadastroVisitaColunasState;
};

type CadastroVisitaColunasState = {
  setor: boolean;
  modelo: boolean;
  numeroSerie: boolean;
  patrimonio: boolean;
  tag: boolean;
  observacoes: boolean;
};

type ReciboFormState = {
  empresaId: string;
  equipamentoId: string;
  ordemServicoId: string;
  orcamentoId: string;
  dataRecibo: string;
  valor: string;
  formaPagamento: string;
  recebidoDe: string;
  referente: string;
  observacoes: string;
};

const emptyForm = (): FormState => ({
  tipo: "locacao",
  modalidadeCobranca: "valor_unico",
  empresaLocatariaId: "",
  equipamentoId: "",
  responsavelEntrega: "",
  responsavelRecebimento: "",
  localEntrega: "",
  dataInicio: new Date().toISOString().slice(0, 10),
  dataPrevistaDevolucao: "",
  valorUnico: "",
  valorMensal: "",
  diaVencimento: "",
  quantidadeMensalidades: "",
  primeiroVencimento: "",
  observacoes: "",
});

const emptyCadastroVisitaForm = (): CadastroVisitaFormState => ({
  cliente: "",
  dataVisita: "",
  linhas: "25",
  colunas: {
    setor: true,
    modelo: true,
    numeroSerie: true,
    patrimonio: true,
    tag: true,
    observacoes: true,
  },
});

const emptyReciboForm = (): ReciboFormState => ({
  empresaId: "",
  equipamentoId: "",
  ordemServicoId: "",
  orcamentoId: "",
  dataRecibo: new Date().toISOString().slice(0, 10),
  valor: "",
  formaPagamento: "",
  recebidoDe: "",
  referente: "Manutenção no equipamento descrito.",
  observacoes: "",
});

const parseNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (empresa?: EmpresaSupabase | null) =>
  empresa?.nome_fantasia || empresa?.nome || "-";

const onlyDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

const isEmpresaPrincipalAci = (empresa?: EmpresaSupabase | null) =>
  empresa?.tipo_cliente === "Principal" ||
  onlyDigits(empresa?.cpf_cnpj) === "71208094000137";

const getTipoEquipamento = (equipamento?: EquipamentoSupabase | null) =>
  equipamento?.tipo_equipamento?.nome ||
  equipamento?.tipo_texto ||
  "Equipamento";

const getEquipamentoDescricao = (equipamento?: EquipamentoSupabase | null) =>
  [equipamento?.fabricante, equipamento?.modelo, equipamento?.numero_serie]
    .filter(Boolean)
    .join(" | ") || "-";

const getStatusBadgeVariant = (status: TermoLocacao["status"]) => {
  if (status === "ativo") return "default";
  if (status === "encerrado") return "secondary";
  return "destructive";
};

const getServicoLabel = (tipo: VencimentoEquipamentoItem["tipoServico"]) =>
  tipo === "calibracao" ? "Calibracao" : "Preventiva";

const getVencimentoIdentificacao = (item: VencimentoEquipamentoItem) =>
  [
    item.numeroSerie ? `NS: ${item.numeroSerie}` : null,
    item.patrimonio ? `Pat: ${item.patrimonio}` : null,
    item.tag ? `TAG: ${item.tag}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "-";

const getVencimentoEquipamentoNome = (item: VencimentoEquipamentoItem) =>
  [item.tipoEquipamento, item.fabricante, item.modelo]
    .filter(Boolean)
    .join(" ");

const resumirItensMensagem = (itens: VencimentoEquipamentoItem[]) => {
  const resumo = new Map<string, number>();

  itens.forEach((item) => {
    const nome = item.tipoEquipamento.toLocaleLowerCase("pt-BR");
    resumo.set(nome, (resumo.get(nome) || 0) + 1);
  });

  return Array.from(resumo.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([nome, total]) => `${total}x ${nome}`)
    .join(", ");
};

const getServicosMensagem = (itens: VencimentoEquipamentoItem[]) => {
  const tipos = new Set(itens.map((item) => item.tipoServico));

  if (tipos.has("calibracao") && tipos.has("preventiva")) {
    return "calibracao e manutencao preventiva";
  }

  return tipos.has("preventiva") ? "manutencao preventiva" : "calibracao";
};

const montarMensagemVencimentos = (cliente: VencimentoClienteGrupo) => {
  const servicos = getServicosMensagem(cliente.itens);
  const resumo = resumirItensMensagem(cliente.itens);
  const lista = cliente.itens
    .map((item) => {
      const detalhes = getVencimentoIdentificacao(item);
      const setor = item.setor ? ` | Setor: ${item.setor}` : "";
      return `- ${formatDate(item.dataVencimento)} | ${getServicoLabel(
        item.tipoServico
      )} | ${getVencimentoEquipamentoNome(item)} | ${detalhes}${setor}`;
    })
    .join("\n");

  return [
    `Prezado(a)${cliente.contato ? ` ${cliente.contato}` : ""},`,
    "",
    `Identificamos em nosso sistema que existem equipamentos sob responsabilidade de ${cliente.clienteNome} com ${servicos} proxima do vencimento e/ou ja vencida, totalizando ${cliente.itens.length} item(ns), sendo: ${resumo}.`,
    "",
    "Reforcamos que a renovacao periodica ajuda a manter a confiabilidade dos equipamentos, a rastreabilidade dos servicos e a conformidade em auditorias.",
    "",
    "Para evitar indisponibilidade de equipamentos ou atraso na regularizacao, recomendamos agendar os servicos com antecedencia.",
    "",
    "Ficamos a disposicao para programar o atendimento e elaborar uma proposta para execucao dos servicos.",
    "",
    "Lista detalhada:",
    lista,
    "",
    "Atenciosamente,",
    "ACI Equipamentos Hospitalares",
  ].join("\n");
};

const copiarTexto = async (texto: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const normalizarBusca = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-/]/g, "")
    .toLowerCase()
    .trim();

const ObjectSearchSelect = ({
  disabled,
  emptyText = "Nenhum registro encontrado.",
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  emptyText?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  value: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const termosBusca = normalizarBusca(query).split(/\s+/).filter(Boolean);
  const filteredOptions = termosBusca.length
    ? options.filter((option) => {
        const searchable = normalizarBusca(
          `${option.label} ${option.description || ""}`
        );
        return termosBusca.every((term) => searchable.includes(term));
      })
    : options;

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between font-normal"
        >
          <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
            {selected?.label || placeholder}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filteredOptions.length === 0 && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{option.label}</div>
                    {option.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Utilitarios = () => {
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reciboDialogOpen, setReciboDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [reciboForm, setReciboForm] = useState<ReciboFormState>(emptyReciboForm);
  const [cadastroVisitaForm, setCadastroVisitaForm] =
    useState<CadastroVisitaFormState>(emptyCadastroVisitaForm);
  const [gerandoCadastroVisita, setGerandoCadastroVisita] = useState(false);
  const [gerandoReciboId, setGerandoReciboId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(DEFAULT_LIST_LIMIT);
  const isCadastroVisita = location.pathname.endsWith("/cadastro-visita");
  const isRecibos = location.pathname.endsWith("/recibos");
  const isVencimentos = location.pathname.endsWith("/vencimentos");
  const anoAtual = new Date().getFullYear();
  const [vencimentosAno, setVencimentosAno] = useState(String(anoAtual));
  const [incluirCalibracao, setIncluirCalibracao] = useState(true);
  const [incluirPreventiva, setIncluirPreventiva] = useState(true);

  const { data: empresas = [] } = useEmpresas({ statusFiltro: "ativas" });
  const { data: equipamentos = [] } = useEquipamentos({
    statusFiltro: "ativos",
  });
  const { data: ordensServico = [] } = useOrdensServico();
  const { data: orcamentos = [] } = useOrcamentos();
  const { data: termos = [], isLoading, refetch, isFetching } = useTermosLocacao();
  const {
    data: recibos = [],
    isLoading: recibosLoading,
    refetch: refetchRecibos,
    isFetching: recibosFetching,
  } = useRecibos();
  const vencimentosFiltro = useMemo(
    () => ({
      ano: Number(vencimentosAno) || anoAtual,
      incluirCalibracao,
      incluirPreventiva,
    }),
    [anoAtual, incluirCalibracao, incluirPreventiva, vencimentosAno]
  );
  const {
    data: vencimentosRelatorio,
    isLoading: vencimentosLoading,
    isFetching: vencimentosFetching,
    refetch: refetchVencimentos,
  } = useVencimentosUtilitarios(vencimentosFiltro);
  const criarTermo = useCriarTermoLocacao();
  const criarRecibo = useCriarRecibo();
  const atualizarStatus = useAtualizarStatusTermoLocacao();
  const atualizarMensalidade = useAtualizarMensalidadeTermo();

  const empresaAci = useMemo(
    () => empresas.find((empresa) => isEmpresaPrincipalAci(empresa)) || null,
    [empresas]
  );

  const empresaOptions = useMemo(
    () =>
      empresas
        .filter((empresa) => !isEmpresaPrincipalAci(empresa))
        .map((empresa) => ({
          value: empresa.id,
          label: getEmpresaNome(empresa),
          description: [empresa.cpf_cnpj, empresa.cidade, empresa.estado]
            .filter(Boolean)
            .join(" | "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [empresas]
  );

  const equipamentoOptions = useMemo(
    () =>
      equipamentos
        .filter((equipamento) => equipamento.empresa_id === empresaAci?.id)
        .map((equipamento) => ({
          value: equipamento.id,
          label: `${getTipoEquipamento(equipamento)} - ${
            equipamento.modelo || equipamento.fabricante || "sem identificacao"
          }`,
          description: [
            `Cliente: ${getEmpresaNome(equipamento.empresa)}`,
            equipamento.numero_serie ? `Serie: ${equipamento.numero_serie}` : null,
            equipamento.patrimonio ? `Patrimonio: ${equipamento.patrimonio}` : null,
            equipamento.tag ? `TAG: ${equipamento.tag}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [empresaAci?.id, equipamentos]
  );

  const reciboEquipamentoOptions = useMemo(
    () =>
      equipamentos
        .filter(
          (equipamento) =>
            !reciboForm.empresaId || equipamento.empresa_id === reciboForm.empresaId
        )
        .map((equipamento) => ({
          value: equipamento.id,
          label: `${getTipoEquipamento(equipamento)} - ${
            equipamento.modelo || equipamento.fabricante || "sem identificacao"
          }`,
          description: [
            getEmpresaNome(equipamento.empresa),
            equipamento.numero_serie ? `Serie: ${equipamento.numero_serie}` : null,
            equipamento.patrimonio ? `Patrimonio: ${equipamento.patrimonio}` : null,
            equipamento.tag ? `TAG: ${equipamento.tag}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [equipamentos, reciboForm.empresaId]
  );

  const reciboOsOptions = useMemo(
    () =>
      ordensServico
        .filter(
          (os) =>
            (!reciboForm.empresaId || os.empresa_id === reciboForm.empresaId) &&
            (!reciboForm.equipamentoId ||
              os.equipamento_id === reciboForm.equipamentoId)
        )
        .map((os) => ({
          value: os.id,
          label: `OS ${os.numero}`,
          description: [
            getEmpresaNome(os.empresa),
            os.equipamento ? getTipoEquipamento(os.equipamento) : null,
            os.status_sistema,
          ]
            .filter(Boolean)
            .join(" | "),
        })),
    [ordensServico, reciboForm.equipamentoId, reciboForm.empresaId]
  );

  const reciboOrcamentoOptions = useMemo(
    () =>
      orcamentos
        .filter(
          (orcamento) =>
            (!reciboForm.empresaId || orcamento.empresa_id === reciboForm.empresaId) &&
            (!reciboForm.equipamentoId ||
              orcamento.equipamento_id === reciboForm.equipamentoId) &&
            (!reciboForm.ordemServicoId ||
              orcamento.ordem_servico_id === reciboForm.ordemServicoId)
        )
        .map((orcamento) => ({
          value: orcamento.id,
          label: `Orcamento ${orcamento.numero}`,
          description: [
            orcamento.identificador,
            getEmpresaNome(orcamento.empresa),
            formatCurrency(orcamento.valor_total),
            orcamento.status,
          ]
            .filter(Boolean)
            .join(" | "),
        })),
    [
      orcamentos,
      reciboForm.equipamentoId,
      reciboForm.empresaId,
      reciboForm.ordemServicoId,
    ]
  );

  const {
    paginatedItems: recibosLimitados,
    ...recibosPagination
  } = usePaginatedList(recibos, limit);

  const {
    paginatedItems: termosLimitados,
    ...termosPagination
  } = usePaginatedList(termos, limit);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateCadastroVisitaForm = <K extends keyof CadastroVisitaFormState>(
    key: K,
    value: CadastroVisitaFormState[K]
  ) => {
    setCadastroVisitaForm((current) => ({ ...current, [key]: value }));
  };

  const updateReciboForm = <K extends keyof ReciboFormState>(
    key: K,
    value: ReciboFormState[K]
  ) => {
    setReciboForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setDialogOpen(false);
  };

  const resetReciboForm = () => {
    setReciboForm(emptyReciboForm());
    setReciboDialogOpen(false);
  };

  const handleSubmit = async () => {
    try {
      if (!empresaAci) {
        throw new Error("Cadastre a ACI como empresa Principal antes de criar o termo.");
      }

      await criarTermo.mutateAsync({
        tipo: form.tipo,
        modalidadeCobranca: form.modalidadeCobranca,
        empresaLocadoraId: empresaAci?.id || null,
        empresaLocatariaId: form.empresaLocatariaId,
        equipamentoId: form.equipamentoId,
        responsavelEntrega: form.responsavelEntrega,
        responsavelRecebimento: form.responsavelRecebimento,
        localEntrega: form.localEntrega,
        dataInicio: form.dataInicio,
        dataPrevistaDevolucao: form.dataPrevistaDevolucao || null,
        valorUnico: parseNumber(form.valorUnico),
        valorMensal: parseNumber(form.valorMensal),
        diaVencimento: form.diaVencimento ? Number(form.diaVencimento) : null,
        quantidadeMensalidades: form.quantidadeMensalidades
          ? Number(form.quantidadeMensalidades)
          : undefined,
        primeiroVencimento: form.primeiroVencimento || null,
        observacoes: form.observacoes,
      });
      toast({ title: "Termo cadastrado" });
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar termo",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleSubmitRecibo = async () => {
    try {
      const valor = parseNumber(reciboForm.valor);
      if (!valor) throw new Error("Informe o valor do recibo.");

      const recibo = await criarRecibo.mutateAsync({
        empresaId: reciboForm.empresaId,
        equipamentoId: reciboForm.equipamentoId,
        ordemServicoId: reciboForm.ordemServicoId || null,
        orcamentoId: reciboForm.orcamentoId || null,
        dataRecibo: reciboForm.dataRecibo,
        valor,
        formaPagamento: reciboForm.formaPagamento,
        recebidoDe: reciboForm.recebidoDe,
        referente: reciboForm.referente,
        observacoes: reciboForm.observacoes,
      });

      resetReciboForm();
      toast({ title: "Recibo cadastrado." });
      await gerarPdfRecibo(recibo);
    } catch (error) {
      toast({
        title: "Erro ao cadastrar recibo",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleGerarPdf = async (termo: TermoLocacao) => {
    try {
      await gerarPdfTermoLocacao(termo);
    } catch (error) {
      toast({
        title: "Erro ao gerar documento",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleGerarPdfRecibo = async (recibo: Recibo) => {
    try {
      setGerandoReciboId(recibo.id);
      await gerarPdfRecibo(recibo);
    } catch (error) {
      toast({
        title: "Erro ao gerar recibo",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setGerandoReciboId(null);
    }
  };

  const handleGerarCadastroVisita = async () => {
    const linhas = Number(cadastroVisitaForm.linhas);

    if (!Number.isInteger(linhas) || linhas < 1 || linhas > 120) {
      toast({
        title: "Quantidade de linhas invalida",
        description: "Informe um numero entre 1 e 120.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGerandoCadastroVisita(true);
      await gerarPdfCadastroVisita({
        cliente: cadastroVisitaForm.cliente.trim(),
        dataVisita: cadastroVisitaForm.dataVisita || undefined,
        linhas,
        colunas: cadastroVisitaForm.colunas,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar Cadastro Visita",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setGerandoCadastroVisita(false);
    }
  };

  const handleCopiarMensagemVencimentos = async (
    cliente: VencimentoClienteGrupo
  ) => {
    try {
      await copiarTexto(montarMensagemVencimentos(cliente));
      toast({ title: "Mensagem copiada" });
    } catch (error) {
      toast({
        title: "Erro ao copiar mensagem",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleStatus = async (
    termo: TermoLocacao,
    status: TermoLocacao["status"]
  ) => {
    try {
      await atualizarStatus.mutateAsync({
        id: termo.id,
        status,
        dataDevolucao:
          status === "encerrado" ? new Date().toISOString().slice(0, 10) : null,
      });
      toast({ title: "Status atualizado" });
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleMensalidade = async (
    mensalidadeId: string,
    pago: boolean,
    observacoes?: string | null
  ) => {
    try {
      await atualizarMensalidade.mutateAsync({
        id: mensalidadeId,
        pago,
        observacoes,
      });
      toast({ title: pago ? "Mensalidade marcada como paga" : "Pagamento estornado" });
    } catch (error) {
      toast({
        title: "Erro ao atualizar mensalidade",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  if (isRecibos) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Utilitarios"
          description="Ferramentas operacionais e documentos auxiliares."
        >
          <Button onClick={() => setReciboDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo recibo
          </Button>
        </PageHeader>

        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="text-base font-semibold">Gerador de Recibos</h2>
              <p className="text-sm text-muted-foreground">
                Registre pagamentos recebidos e gere o PDF com assinatura do
                responsavel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ListLimitSelect value={limit} onChange={setLimit} />
              <Button variant="outline" onClick={() => refetchRecibos()}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    recibosFetching ? "animate-spin" : ""
                  }`}
                />
                Atualizar
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">N</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Referente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vinculos</TableHead>
                <TableHead className="w-[150px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recibosLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Carregando recibos...
                  </TableCell>
                </TableRow>
              ) : recibosLimitados.length ? (
                recibosLimitados.map((recibo) => (
                  <TableRow key={recibo.id}>
                    <TableCell className="font-semibold">{recibo.numero}</TableCell>
                    <TableCell>{getEmpresaNome(recibo.empresa)}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getTipoEquipamento(recibo.equipamento)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getEquipamentoDescricao(recibo.equipamento)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="line-clamp-2">{recibo.referente}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(recibo.valor)}
                    </TableCell>
                    <TableCell>{formatDate(recibo.data_recibo)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recibo.ordem_servico?.numero && (
                          <Badge variant="secondary">
                            OS {recibo.ordem_servico.numero}
                          </Badge>
                        )}
                        {recibo.orcamento?.numero && (
                          <Badge variant="outline">
                            Orc. {recibo.orcamento.numero}
                          </Badge>
                        )}
                        {!recibo.ordem_servico?.numero &&
                          !recibo.orcamento?.numero && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGerarPdfRecibo(recibo)}
                        disabled={gerandoReciboId === recibo.id}
                      >
                        {gerandoReciboId === recibo.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhum recibo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ListPagination
            {...recibosPagination}
            onPageChange={recibosPagination.setPage}
          />
        </div>

        <Dialog open={reciboDialogOpen} onOpenChange={setReciboDialogOpen}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo recibo</DialogTitle>
              <DialogDescription>
                Informe o cliente, equipamento e valor recebido. OS e orcamento
                sao opcionais para rastreabilidade.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5">
              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold">Dados principais</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <ObjectSearchSelect
                      value={reciboForm.empresaId}
                      options={empresaOptions}
                      placeholder="Selecione o cliente"
                      emptyText="Nenhum cliente encontrado."
                      onChange={(value) =>
                        setReciboForm((current) => ({
                          ...current,
                          empresaId: value,
                          equipamentoId:
                            current.equipamentoId &&
                            equipamentos.find((item) => item.id === current.equipamentoId)
                              ?.empresa_id === value
                              ? current.equipamentoId
                              : "",
                          ordemServicoId: "",
                          orcamentoId: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Equipamento</Label>
                    <ObjectSearchSelect
                      value={reciboForm.equipamentoId}
                      options={reciboEquipamentoOptions}
                      placeholder="Selecione o equipamento"
                      emptyText="Nenhum equipamento encontrado."
                      onChange={(value) =>
                        setReciboForm((current) => ({
                          ...current,
                          equipamentoId: value,
                          ordemServicoId: "",
                          orcamentoId: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data do recibo</Label>
                    <Input
                      type="date"
                      value={reciboForm.dataRecibo}
                      onChange={(event) =>
                        updateReciboForm("dataRecibo", event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor recebido</Label>
                    <Input
                      value={reciboForm.valor}
                      onChange={(event) =>
                        updateReciboForm("valor", event.target.value)
                      }
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Input
                      value={reciboForm.formaPagamento}
                      onChange={(event) =>
                        updateReciboForm("formaPagamento", event.target.value)
                      }
                      placeholder="Ex: PIX, dinheiro, boleto, cartao"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recebido de</Label>
                    <Input
                      value={reciboForm.recebidoDe}
                      onChange={(event) =>
                        updateReciboForm("recebidoDe", event.target.value)
                      }
                      placeholder="Opcional. Se vazio, usa o nome do cliente."
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold">
                  Vinculos opcionais
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ordem de Serviço</Label>
                    <ObjectSearchSelect
                      value={reciboForm.ordemServicoId}
                      options={reciboOsOptions}
                      placeholder="Sem OS vinculada"
                      emptyText="Nenhuma OS encontrada."
                      onChange={(value) =>
                        setReciboForm((current) => ({
                          ...current,
                          ordemServicoId: value,
                          orcamentoId: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Orçamento</Label>
                    <ObjectSearchSelect
                      value={reciboForm.orcamentoId}
                      options={reciboOrcamentoOptions}
                      placeholder="Sem orçamento vinculado"
                      emptyText="Nenhum orçamento encontrado."
                      onChange={(value) => updateReciboForm("orcamentoId", value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold">Descrição</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Referente</Label>
                    <Textarea
                      value={reciboForm.referente}
                      onChange={(event) =>
                        updateReciboForm("referente", event.target.value)
                      }
                      placeholder="Ex: Pagamento referente à manutenção corretiva do equipamento..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={reciboForm.observacoes}
                      onChange={(event) =>
                        updateReciboForm("observacoes", event.target.value)
                      }
                      placeholder="Opcional"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetReciboForm}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitRecibo} disabled={criarRecibo.isPending}>
                {criarRecibo.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar e gerar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isVencimentos) {
    const meses = vencimentosRelatorio?.meses || [];

    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Utilitarios"
          description="Ferramentas operacionais e documentos auxiliares."
        >
          <Button
            variant="outline"
            onClick={() => refetchVencimentos()}
            disabled={vencimentosFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                vencimentosFetching ? "animate-spin" : ""
              }`}
            />
            Atualizar
          </Button>
        </PageHeader>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Vencimentos</h2>
            <p className="text-sm text-muted-foreground">
              Relatorio interativo por mes e cliente para contato de renovacao
              de calibracoes e preventivas.
            </p>
          </div>

          <div className="grid gap-4 border-b p-4 lg:grid-cols-[180px_1fr_auto]">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={vencimentosAno}
                onChange={(event) => setVencimentosAno(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                <Checkbox
                  checked={incluirCalibracao}
                  onCheckedChange={(checked) =>
                    setIncluirCalibracao(Boolean(checked))
                  }
                />
                Calibracao
              </label>
              <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                <Checkbox
                  checked={incluirPreventiva}
                  onCheckedChange={(checked) =>
                    setIncluirPreventiva(Boolean(checked))
                  }
                />
                Preventiva
              </label>
            </div>

            <div className="flex items-end">
              <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">
                  {vencimentosRelatorio?.total || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4">
            {!incluirCalibracao && !incluirPreventiva ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Selecione ao menos um tipo de servico para gerar o relatorio.
              </div>
            ) : vencimentosLoading ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Carregando vencimentos...
              </div>
            ) : meses.length ? (
              meses.map((mes) => (
                <div key={mes.mes} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{mes.label}</h3>
                    </div>
                    <Badge variant="secondary">{mes.total} item(ns)</Badge>
                  </div>

                  <div className="divide-y">
                    {mes.clientes.map((cliente) => (
                      <div key={cliente.empresaId} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">
                              {cliente.clienteNome}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {cliente.contato && (
                                <span>Contato: {cliente.contato}</span>
                              )}
                              {cliente.telefone && (
                                <span>Telefone: {cliente.telefone}</span>
                              )}
                              {cliente.email && <span>E-mail: {cliente.email}</span>}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopiarMensagemVencimentos(cliente)
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar mensagem
                          </Button>
                        </div>

                        <div className="mt-4 overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">Vencimento</TableHead>
                                <TableHead className="w-[120px]">Servico</TableHead>
                                <TableHead>Equipamento</TableHead>
                                <TableHead>Identificacao</TableHead>
                                <TableHead>Setor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cliente.itens.map((item) => (
                                <TableRow
                                  key={`${item.equipamentoId}-${item.tipoServico}-${item.dataVencimento}`}
                                >
                                  <TableCell className="font-medium">
                                    {formatDate(item.dataVencimento)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        item.tipoServico === "calibracao"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {getServicoLabel(item.tipoServico)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      {item.tipoEquipamento}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {[item.fabricante, item.modelo]
                                        .filter(Boolean)
                                        .join(" | ") || "-"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getVencimentoIdentificacao(item)}
                                  </TableCell>
                                  <TableCell>{item.setor || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum vencimento encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isCadastroVisita) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Utilitarios"
          description="Ferramentas operacionais e documentos auxiliares."
        />

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Cadastro Visita</h2>
            <p className="text-sm text-muted-foreground">
              Gere uma folha em branco para o tecnico preencher os equipamentos
              encontrados no setor durante a visita.
            </p>
          </div>

          <div className="grid gap-5 p-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-semibold">Dados do documento</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome do cliente</Label>
                  <Input
                    value={cadastroVisitaForm.cliente}
                    onChange={(event) =>
                      updateCadastroVisitaForm("cliente", event.target.value)
                    }
                    placeholder="Opcional. Se ficar em branco, o tecnico preenche no local."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data da visita</Label>
                  <Input
                    type="date"
                    value={cadastroVisitaForm.dataVisita}
                    onChange={(event) =>
                      updateCadastroVisitaForm("dataVisita", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Numero de linhas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={cadastroVisitaForm.linhas}
                    onChange={(event) =>
                      updateCadastroVisitaForm("linhas", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={handleGerarCadastroVisita}
                  disabled={gerandoCadastroVisita}
                >
                  {gerandoCadastroVisita ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Gerar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCadastroVisitaForm(emptyCadastroVisitaForm())}
                  disabled={gerandoCadastroVisita}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="mb-3 text-sm font-semibold">
                Colunas do documento
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Equipamento e fabricante sao obrigatorios. As demais colunas
                podem ser removidas do PDF.
              </p>
              <div className="grid gap-3 text-sm">
                {[
                  ["equipamento", "Equipamento"],
                  ["fabricante", "Fabricante"],
                ].map(([id, label]) => (
                  <label
                    key={id as string}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                  >
                    <span className="font-medium">{label as string}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      Obrigatoria
                      <Checkbox checked disabled />
                    </div>
                  </label>
                ))}
                {[
                  ["setor", "Setor"],
                  ["modelo", "Modelo"],
                  ["numeroSerie", "N. Serie"],
                  ["patrimonio", "Patrimonio"],
                  ["tag", "TAG"],
                  ["observacoes", "Observacoes"],
                ].map(([id, label]) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                  >
                    <span>{label}</span>
                    <Checkbox
                      checked={
                        cadastroVisitaForm.colunas[
                          id as keyof CadastroVisitaColunasState
                        ]
                      }
                      onCheckedChange={(checked) =>
                        setCadastroVisitaForm((current) => ({
                          ...current,
                          colunas: {
                            ...current.colunas,
                            [id]: Boolean(checked),
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Utilitarios"
        description="Ferramentas operacionais e documentos auxiliares."
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo termo
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">
              Locação / Empréstimo
            </h2>
            <p className="text-sm text-muted-foreground">
              Controle os equipamentos cedidos a clientes e mensalidades de
              locacao.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ListLimitSelect value={limit} onChange={setLimit} />
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">N</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[260px] text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Carregando termos...
                </TableCell>
              </TableRow>
            ) : termosLimitados.length ? (
              termosLimitados.map((termo) => (
                <Fragment key={termo.id}>
                  <TableRow>
                    <TableCell className="font-semibold">{termo.numero}</TableCell>
                    <TableCell>{getEmpresaNome(termo.empresa_locataria)}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getTipoEquipamento(termo.equipamento)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getEquipamentoDescricao(termo.equipamento)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {termo.modalidade_cobranca === "valor_mensal"
                        ? "Valor mensal"
                        : "Valor unico"}
                    </TableCell>
                    <TableCell>
                      {termo.modalidade_cobranca === "valor_mensal"
                        ? formatCurrency(termo.valor_mensal)
                        : formatCurrency(termo.valor_unico)}
                    </TableCell>
                    <TableCell>{formatDate(termo.data_inicio)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(termo.status)}>
                        {termo.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {termo.modalidade_cobranca === "valor_mensal" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExpandedId(expandedId === termo.id ? null : termo.id)
                            }
                          >
                            Parcelas
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGerarPdf(termo)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Documento
                        </Button>
                        {termo.status === "ativo" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatus(termo, "encerrado")}
                            >
                              Encerrar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatus(termo, "cancelado")}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === termo.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="rounded-md border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Parcela</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead className="text-right">Acoes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(termo.mensalidades || []).map((mensalidade) => (
                                <TableRow key={mensalidade.id}>
                                  <TableCell>{mensalidade.numero_parcela}</TableCell>
                                  <TableCell>
                                    {formatDate(mensalidade.data_vencimento)}
                                  </TableCell>
                                  <TableCell>
                                    {formatCurrency(mensalidade.valor)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        mensalidade.pago ? "default" : "secondary"
                                      }
                                    >
                                      {mensalidade.pago ? "Pago" : "Pendente"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(mensalidade.data_pagamento)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {mensalidade.pago ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleMensalidade(
                                            mensalidade.id,
                                            false,
                                            mensalidade.observacoes
                                          )
                                        }
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Estornar
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleMensalidade(
                                            mensalidade.id,
                                            true,
                                            mensalidade.observacoes
                                          )
                                        }
                                      >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Marcar pago
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum termo cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ListPagination
          {...termosPagination}
          onPageChange={termosPagination.setPage}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo termo de locação / empréstimo</DialogTitle>
            <DialogDescription>
              Registre o equipamento cedido ao cliente. O modelo final do
              documento pode ser ajustado depois.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-semibold">Dados principais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(value) =>
                      updateForm("tipo", value as TermoLocacaoTipo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locacao">Locacao</SelectItem>
                      <SelectItem value="emprestimo">Emprestimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select
                    value={form.modalidadeCobranca}
                    onValueChange={(value) =>
                      updateForm(
                        "modalidadeCobranca",
                        value as TermoLocacaoModalidade
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor_unico">Valor unico</SelectItem>
                      <SelectItem value="valor_mensal">Valor mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <ObjectSearchSelect
                    value={form.empresaLocatariaId}
                    onChange={(value) => updateForm("empresaLocatariaId", value)}
                    options={empresaOptions}
                    placeholder="Selecione o cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Empresa locadora</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                    {empresaAci ? getEmpresaNome(empresaAci) : "ACI nao cadastrada"}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Equipamento</Label>
                  <ObjectSearchSelect
                    value={form.equipamentoId}
                    onChange={(value) => updateForm("equipamentoId", value)}
                    options={equipamentoOptions}
                    placeholder={
                      empresaAci
                        ? "Selecione o equipamento da ACI"
                        : "Cadastre a ACI como Principal para listar equipamentos"
                    }
                    emptyText="Nenhum equipamento ativo da ACI encontrado."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-semibold">Prazos e valores</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Data de inicio</Label>
                  <Input
                    type="date"
                    value={form.dataInicio}
                    onChange={(event) =>
                      updateForm("dataInicio", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Previsao de devolucao</Label>
                  <Input
                    type="date"
                    value={form.dataPrevistaDevolucao}
                    onChange={(event) =>
                      updateForm("dataPrevistaDevolucao", event.target.value)
                    }
                  />
                </div>

                {form.modalidadeCobranca === "valor_unico" ? (
                  <div className="space-y-2">
                    <Label>Valor unico</Label>
                    <Input
                      value={form.valorUnico}
                      onChange={(event) =>
                        updateForm("valorUnico", event.target.value)
                      }
                      placeholder="0,00"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Valor mensal</Label>
                      <Input
                        value={form.valorMensal}
                        onChange={(event) =>
                          updateForm("valorMensal", event.target.value)
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primeiro vencimento</Label>
                      <Input
                        type="date"
                        value={form.primeiroVencimento}
                        onChange={(event) =>
                          updateForm("primeiroVencimento", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de mensalidades</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.quantidadeMensalidades}
                        onChange={(event) =>
                          updateForm("quantidadeMensalidades", event.target.value)
                        }
                        placeholder="Ex: 12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dia de vencimento</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={form.diaVencimento}
                        onChange={(event) =>
                          updateForm("diaVencimento", event.target.value)
                        }
                        placeholder="Opcional"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-semibold">Entrega</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Responsavel pela entrega</Label>
                  <Input
                    value={form.responsavelEntrega}
                    onChange={(event) =>
                      updateForm("responsavelEntrega", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsavel pelo recebimento</Label>
                  <Input
                    value={form.responsavelRecebimento}
                    onChange={(event) =>
                      updateForm("responsavelRecebimento", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Local de entrega</Label>
                  <Input
                    value={form.localEntrega}
                    onChange={(event) =>
                      updateForm("localEntrega", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observacoes</Label>
                  <Textarea
                    value={form.observacoes}
                    onChange={(event) =>
                      updateForm("observacoes", event.target.value)
                    }
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={criarTermo.isPending}>
              {criarTermo.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar termo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Utilitarios;

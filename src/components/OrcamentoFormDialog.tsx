import {
  CalendarDays,
  Layers,
  Package,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import PecaQuickCreateDialog from "@/components/PecaQuickCreateDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useTiposOS } from "@/hooks/useCamposOS";
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  encontrarVariacaoPeca,
  getPrecoSugeridoPeca,
  PecaSupabase,
  usePecas,
} from "@/hooks/usePecas";
import { useTiposEquipamento } from "@/hooks/useTiposEquipamento";
import { toast } from "@/hooks/use-toast";
import {
  FormaPagamento,
  FreteTipo,
  ModoPagamento,
  OrcamentoFormInput,
  OrcamentoOrigem,
  OrcamentoSupabase,
  OrcamentoTipo,
} from "@/services/orcamentosService";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";
import {
  useAtualizarOrcamento,
  useCriarOrcamento,
} from "@/hooks/useOrcamentos";
import { cn } from "@/lib/utils";
import {
  getEquipamentoLabel as formatEquipamentoLabel,
  getIdentificadorEquipamento,
} from "@/utils/equipamentoDisplay";

export type OrcamentoDialogMode = "create" | "edit" | "view";
export type DialogMode = OrcamentoDialogMode;

interface OrcamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: OrcamentoDialogMode;
  orcamento?: OrcamentoSupabase | null;
  fromOS?: OrdemServicoSupabase | null;
}

type PecaForm = {
  pecaId: string;
  pecaNome: string;
  pecaVariacaoId: string;
  pecaFabricanteId: string;
  pecaModeloId: string;
  fabricanteTexto: string;
  modeloTexto: string;
  mostrarFabricante: boolean;
  mostrarModelo: boolean;
  quantidade: number;
  valorUnitario: number;
  valorUnitarioEditadoManual: boolean;
  garantia: string;
};

type ServicoForm = {
  tipoServicoId: string;
  tipoEquipamentoId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  garantia: string;
};

type FormState = {
  empresaId: string;
  equipamentoId: string;
  ordemServicoId: string;
  dataOrcamento: string;
  tipoOrcamento: OrcamentoTipo;
  origem: OrcamentoOrigem;
  formaPagamento: FormaPagamento | "";
  modoPagamento: ModoPagamento;
  numeroParcelas: number;
  diasEntreParcelas: number;
  valorEntrada: number;
  prazoEntrega: string;
  validadeDias: number;
  frete: FreteTipo | "";
  detalhesOrcamento: string;
  responsavelOrcamentista: string;
  identificador: string;
};

const RESPONSAVEL_PADRAO = "Icaro Rezende";

const emptyForm: FormState = {
  empresaId: "",
  equipamentoId: "",
  ordemServicoId: "",
  dataOrcamento: "",
  tipoOrcamento: "servico",
  origem: "avulso",
  formaPagamento: "",
  modoPagamento: "avista",
  numeroParcelas: 1,
  diasEntreParcelas: 30,
  valorEntrada: 0,
  prazoEntrega: "",
  validadeDias: 90,
  frete: "",
  detalhesOrcamento: "",
  responsavelOrcamentista: RESPONSAVEL_PADRAO,
  identificador: "",
};

const emptyPeca = (): PecaForm => ({
  pecaId: "",
  pecaNome: "",
  pecaVariacaoId: "",
  pecaFabricanteId: "",
  pecaModeloId: "",
  fabricanteTexto: "",
  modeloTexto: "",
  mostrarFabricante: false,
  mostrarModelo: false,
  quantidade: 1,
  valorUnitario: 0,
  valorUnitarioEditadoManual: false,
  garantia: "",
});

const emptyServico = (): ServicoForm => ({
  tipoServicoId: "",
  tipoEquipamentoId: "",
  descricao: "",
  quantidade: 1,
  valorUnitario: 0,
  garantia: "",
});

const tipoOptions: Array<{
  value: OrcamentoTipo;
  title: string;
  description: string;
  icon: typeof Wrench;
}> = [
  {
    value: "servico",
    title: "Servico",
    description: "Apenas mao de obra",
    icon: Wrench,
  },
  {
    value: "pecas",
    title: "Pecas",
    description: "Apenas pecas",
    icon: Package,
  },
  {
    value: "pecas_servicos",
    title: "Pecas + Servicos",
    description: "Pecas e servicos",
    icon: Layers,
  },
];

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatFormaPagamento = (forma?: FormaPagamento | "" | null) => {
  const map: Record<string, string> = {
    dinheiro: "Dinheiro",
    cartao: "Cartao",
    boleto: "Boleto",
    pix: "Pix",
  };

  return forma ? map[forma] || forma : "Nao informado";
};

const formatModoPagamento = (modo?: ModoPagamento | null) => {
  const map: Record<string, string> = {
    avista: "A vista",
    parcelado: "Parcelado",
    entrada_parcela: "Entrada + parcelas",
  };

  return modo ? map[modo] || modo : "A vista";
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const validadeToDays = (iso?: string | null) => {
  if (!iso) return 90;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return 90;
  return Math.max(
    1,
    Math.round((target.getTime() - today.getTime()) / 86400000)
  );
};

const getEmpresaNome = (
  source?: OrdemServicoSupabase | OrcamentoSupabase | null
) => source?.empresa?.nome_fantasia || source?.empresa?.nome || "";

const getEquipamentoLabel = (
  source?: OrdemServicoSupabase | OrcamentoSupabase | null
) => formatEquipamentoLabel(source?.equipamento);

const toDateTimeLocalValue = (iso?: string | null) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const montarIdentificadorPorOS = (os: OrdemServicoSupabase) => {
  const tipoServico = os.tipo_os?.nome || "Servico";
  const tipoEquipamento =
    os.equipamento?.tipo_equipamento?.nome ||
    os.equipamento?.tipo_texto ||
    "Equipamento";
  const modelo = os.equipamento?.modelo;
  const identificador = getIdentificadorEquipamento(os.equipamento);

  return [tipoServico, tipoEquipamento, modelo, identificador]
    .filter(Boolean)
    .join(" - ");
};

const OrcamentoFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  orcamento = null,
  fromOS = null,
}: OrcamentoFormDialogProps) => {
  const { data: empresas = [] } = useEmpresas();
  const { data: tiposOS = [] } = useTiposOS();
  const { data: tiposEquipamento = [] } = useTiposEquipamento();
  const { data: pecasCadastro = [] } = usePecas();
  const criarOrcamento = useCriarOrcamento();
  const atualizarOrcamento = useAtualizarOrcamento();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [pecas, setPecas] = useState<PecaForm[]>([emptyPeca()]);
  const [servicos, setServicos] = useState<ServicoForm[]>([emptyServico()]);
  const [preventiva, setPreventiva] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateIndex, setQuickCreateIndex] = useState<number | null>(null);

  const isView = mode === "view";
  const isSubmitting = criarOrcamento.isPending || atualizarOrcamento.isPending;
  const incluiPecas =
    form.tipoOrcamento === "pecas" || form.tipoOrcamento === "pecas_servicos";
  const incluiServicos =
    form.tipoOrcamento === "servico" ||
    form.tipoOrcamento === "pecas_servicos";

  const empresaSelecionada = empresas.find((empresa) => empresa.id === form.empresaId);
  const empresaLabel =
    empresaSelecionada?.nome_fantasia ||
    empresaSelecionada?.nome ||
    getEmpresaNome(fromOS || orcamento) ||
    "";

  const empresaOptions = empresas.map(
    (empresa) => empresa.nome_fantasia || empresa.nome
  );
  const tipoServicoOptions = tiposOS.map((tipo) => tipo.nome);
  const tipoEquipamentoOptions = tiposEquipamento.map((tipo) => tipo.nome);
  const pecaOptions = pecasCadastro.map((peca) => peca.nome);

  const getTipoServicoNome = (id: string) =>
    tiposOS.find((tipo) => tipo.id === id)?.nome || "";

  const getTipoEquipamentoNome = (id: string) =>
    tiposEquipamento.find((tipo) => tipo.id === id)?.nome || "";

  const getPecaCadastro = (item: PecaForm) =>
    pecasCadastro.find((peca) => peca.id === item.pecaId) ||
    pecasCadastro.find((peca) => peca.nome === item.pecaNome);

  const buildPecaPatch = (
    item: PecaForm,
    peca: PecaSupabase | null | undefined,
    fabricanteId?: string | null,
    modeloId?: string | null,
    forcePreco = false
  ): Partial<PecaForm> => {
    const variacao = encontrarVariacaoPeca(peca, fabricanteId, modeloId);
    const precoSugerido = getPrecoSugeridoPeca(peca, fabricanteId, modeloId);
    const shouldApplyPrice =
      forcePreco || !item.valorUnitarioEditadoManual;

    return {
      pecaVariacaoId: variacao?.id || "",
      ...(shouldApplyPrice && precoSugerido !== null
        ? { valorUnitario: precoSugerido }
        : {}),
    };
  };

  const selecionarPecaNoItem = (
    index: number,
    peca: PecaSupabase,
    forcePreco = true
  ) => {
    const baseItem = pecas[index] || emptyPeca();
    updatePeca(index, {
      pecaId: peca.id,
      pecaNome: peca.nome,
      pecaFabricanteId: "",
      pecaModeloId: "",
      fabricanteTexto: "",
      modeloTexto: "",
      mostrarFabricante: false,
      mostrarModelo: false,
      valorUnitarioEditadoManual: forcePreco
        ? false
        : baseItem.valorUnitarioEditadoManual,
      ...buildPecaPatch(baseItem, peca, null, null, forcePreco),
    });
  };

  useEffect(() => {
    if (!open) return;

    if (orcamento && (mode === "edit" || mode === "view")) {
      setForm({
        ...emptyForm,
        empresaId: orcamento.empresa_id,
        equipamentoId: orcamento.equipamento_id || "",
        ordemServicoId: orcamento.ordem_servico_id || "",
        dataOrcamento: toDateTimeLocalValue(orcamento.data_orcamento),
        tipoOrcamento: orcamento.tipo_orcamento || "servico",
        origem: orcamento.origem || "avulso",
        formaPagamento: orcamento.forma_pagamento || "",
        modoPagamento: orcamento.modo_pagamento || "avista",
        numeroParcelas: orcamento.numero_parcelas || 1,
        diasEntreParcelas: orcamento.dias_entre_parcelas || 30,
        valorEntrada: Number(orcamento.valor_entrada || 0),
        prazoEntrega:
          orcamento.prazo_entrega || orcamento.prazo_execucao || "",
        validadeDias: validadeToDays(orcamento.data_validade),
        frete: orcamento.frete || "",
        detalhesOrcamento: orcamento.detalhes_orcamento || "",
        responsavelOrcamentista:
          orcamento.responsavel_orcamentista || RESPONSAVEL_PADRAO,
        identificador: orcamento.identificador || orcamento.observacoes || "",
      });

      const itens = [...(orcamento.itens || [])].sort((a, b) => a.ordem - b.ordem);
      const pecasBanco = itens
        .filter((item) => item.tipo === "peca")
        .map((item) => ({
          pecaId: item.peca_id || "",
          pecaNome: item.peca?.nome || item.peca_nome || item.descricao || "",
          pecaVariacaoId: item.peca_variacao_id || "",
          pecaFabricanteId: item.peca_fabricante_id || "",
          pecaModeloId: item.peca_modelo_id || "",
          fabricanteTexto:
            item.fabricante_texto ||
            item.peca_variacao?.fabricante_texto ||
            item.peca_fabricante?.nome ||
            "",
          modeloTexto:
            item.modelo_texto ||
            item.peca_variacao?.modelo_texto ||
            item.peca_modelo?.nome ||
            "",
          mostrarFabricante: Boolean(item.mostrar_fabricante),
          mostrarModelo: Boolean(item.mostrar_modelo),
          quantidade: Number(item.quantidade || 1),
          valorUnitario: Number(item.valor_unitario || 0),
          valorUnitarioEditadoManual: true,
          garantia: item.garantia || "",
        }));
      const servicosBanco = itens
        .filter((item) => item.tipo !== "peca")
        .map((item) => ({
          tipoServicoId: item.tipo_servico_id || "",
          tipoEquipamentoId: item.tipo_equipamento_id || "",
          descricao: item.observacoes || item.descricao || "",
          quantidade: Number(item.quantidade || 1),
          valorUnitario: Number(item.valor_unitario || 0),
          garantia: item.garantia || "",
        }));

      setPecas(pecasBanco.length > 0 ? pecasBanco : [emptyPeca()]);
      setServicos(
        servicosBanco.length > 0 ? servicosBanco : [emptyServico()]
      );
      setPreventiva(false);
      return;
    }

    if (fromOS) {
      const detalhes =
        fromOS.descricao_servico || fromOS.problema_relatado || "";
      const identificador = montarIdentificadorPorOS(fromOS);
      setForm({
        ...emptyForm,
        empresaId: fromOS.empresa_id,
        equipamentoId: fromOS.equipamento_id || "",
        ordemServicoId: fromOS.id,
        dataOrcamento: toDateTimeLocalValue(),
        origem: "os",
        tipoOrcamento: "servico",
        detalhesOrcamento: detalhes,
        identificador,
      });
      setPecas([emptyPeca()]);
      setServicos([
        {
          ...emptyServico(),
          tipoServicoId: fromOS.tipo_os_id || "",
          tipoEquipamentoId: fromOS.equipamento?.tipo_equipamento?.id || "",
          descricao: detalhes,
        },
      ]);
      setPreventiva(false);
      return;
    }

    setForm({
      ...emptyForm,
      dataOrcamento: toDateTimeLocalValue(),
    });
    setPecas([emptyPeca()]);
    setServicos([emptyServico()]);
    setPreventiva(false);
  }, [open, fromOS, mode, orcamento]);

  const totalPecas = useMemo(
    () =>
      incluiPecas
        ? pecas.reduce(
            (acc, item) =>
              acc +
              Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
            0
          )
        : 0,
    [incluiPecas, pecas]
  );

  const totalServicos = useMemo(
    () =>
      incluiServicos
        ? servicos.reduce(
            (acc, item) =>
              acc +
              Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
            0
          )
        : 0,
    [incluiServicos, servicos]
  );

  const totalGeral = totalPecas + totalServicos;
  const numeroParcelas = Math.max(1, Number(form.numeroParcelas || 1));
  const diasEntreParcelas = Math.max(1, Number(form.diasEntreParcelas || 30));
  const valorEntrada =
    form.modoPagamento === "entrada_parcela"
      ? Math.min(Number(form.valorEntrada || 0), totalGeral)
      : 0;
  const valorParcela =
    form.modoPagamento === "parcelado"
      ? totalGeral / numeroParcelas
      : form.modoPagamento === "entrada_parcela"
        ? (totalGeral - valorEntrada) / numeroParcelas
        : totalGeral;
  const condicoesPagamentoTexto = (() => {
    const forma = formatFormaPagamento(form.formaPagamento);
    const modo = formatModoPagamento(form.modoPagamento);

    if (form.modoPagamento === "parcelado") {
      return `${forma} - ${numeroParcelas} parcelas de ${formatCurrency(
        valorParcela
      )} a cada ${diasEntreParcelas} dias.`;
    }

    if (form.modoPagamento === "entrada_parcela") {
      return `${forma} - Entrada de ${formatCurrency(
        valorEntrada
      )} + ${numeroParcelas} parcelas de ${formatCurrency(
        valorParcela
      )} a cada ${diasEntreParcelas} dias.`;
    }

    return `${forma} - ${modo}.`;
  })();

  const updatePeca = (index: number, patch: Partial<PecaForm>) => {
    setPecas((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const updateServico = (index: number, patch: Partial<ServicoForm>) => {
    setServicos((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const removePeca = (index: number) => {
    setPecas((current) =>
      current.length === 1
        ? [emptyPeca()]
        : current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const removeServico = (index: number) => {
    setServicos((current) =>
      current.length === 1
        ? [emptyServico()]
        : current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const validar = () => {
    if (!form.empresaId) {
      toast({ title: "Solicitante obrigatorio.", variant: "destructive" });
      return false;
    }

    const pecasValidas = pecas.filter((item) => item.pecaNome.trim());
    const servicosValidos = servicos.filter(
      (item) => item.tipoServicoId || item.descricao.trim()
    );

    if (incluiPecas && pecasValidas.length === 0) {
      toast({
        title: "Adicione ao menos uma peca.",
        variant: "destructive",
      });
      return false;
    }

    if (incluiServicos && servicosValidos.length === 0) {
      toast({
        title: "Adicione ao menos um servico.",
        variant: "destructive",
      });
      return false;
    }

    const todosItens = [
      ...(incluiPecas ? pecasValidas : []),
      ...(incluiServicos ? servicosValidos : []),
    ];

    if (todosItens.some((item) => Number(item.quantidade || 0) <= 0)) {
      toast({
        title: "Quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return false;
    }

    if (todosItens.some((item) => Number(item.valorUnitario || 0) < 0)) {
      toast({
        title: "Valor unitario nao pode ser negativo.",
        variant: "destructive",
      });
      return false;
    }

    if (form.modoPagamento !== "avista") {
      if (Number(form.numeroParcelas || 0) < 1) {
        toast({
          title: "Numero de parcelas deve ser maior que zero.",
          variant: "destructive",
        });
        return false;
      }

      if (Number(form.diasEntreParcelas || 0) < 1) {
        toast({
          title: "Dias entre parcelas deve ser maior que zero.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (
      form.modoPagamento === "entrada_parcela" &&
      Number(form.valorEntrada || 0) > totalGeral
    ) {
      toast({
        title: "Valor da entrada nao pode ser maior que o total.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const buildPayload = (): OrcamentoFormInput => {
    const itensPecas = incluiPecas
      ? pecas
          .filter((item) => item.pecaNome.trim())
          .map((item) => ({
            tipo: "peca" as const,
            descricao: item.pecaNome.trim(),
            pecaId: item.pecaId || undefined,
            pecaNome: item.pecaNome.trim(),
            pecaVariacaoId: item.pecaVariacaoId || undefined,
            pecaFabricanteId: item.pecaFabricanteId || undefined,
            pecaModeloId: item.pecaModeloId || undefined,
            fabricanteTexto: item.fabricanteTexto.trim(),
            modeloTexto: item.modeloTexto.trim(),
            mostrarFabricante: item.mostrarFabricante,
            mostrarModelo: item.mostrarModelo,
            quantidade: Number(item.quantidade || 1),
            valorUnitario: Number(item.valorUnitario || 0),
            garantia: item.garantia.trim(),
          }))
      : [];

    const itensServicos = incluiServicos
      ? servicos
          .filter((item) => item.tipoServicoId || item.descricao.trim())
          .map((item) => {
            const tipoServicoNome = getTipoServicoNome(item.tipoServicoId);
            const tipoEquipamentoNome = getTipoEquipamentoNome(
              item.tipoEquipamentoId
            );
            const descricao =
              item.descricao.trim() ||
              [tipoServicoNome, tipoEquipamentoNome].filter(Boolean).join(" - ") ||
              "Servico";

            return {
              tipo: "servico" as const,
              descricao,
              observacoes: item.descricao.trim(),
              quantidade: Number(item.quantidade || 1),
              valorUnitario: Number(item.valorUnitario || 0),
              garantia: item.garantia.trim(),
              tipoServicoId: item.tipoServicoId || undefined,
              tipoEquipamentoId: item.tipoEquipamentoId || undefined,
            };
          })
      : [];

    return {
      empresaId: form.empresaId,
      equipamentoId: form.equipamentoId || undefined,
      ordemServicoId: form.ordemServicoId || undefined,
      identificador: form.identificador.trim(),
      dataOrcamento: form.dataOrcamento
        ? new Date(form.dataOrcamento).toISOString()
        : undefined,
      dataValidade: addDays(form.validadeDias),
      status: "pendente",
      tipoOrcamento: form.tipoOrcamento,
      origem: form.origem,
      formaPagamento: form.formaPagamento || undefined,
      modoPagamento: form.modoPagamento,
      numeroParcelas:
        form.modoPagamento === "avista" ? undefined : numeroParcelas,
      diasEntreParcelas:
        form.modoPagamento === "avista" ? undefined : diasEntreParcelas,
      valorEntrada:
        form.modoPagamento === "entrada_parcela" ? valorEntrada : undefined,
      valorParcela:
        form.modoPagamento === "avista" ? undefined : valorParcela,
      condicoesPagamento: condicoesPagamentoTexto,
      prazoEntrega: form.prazoEntrega.trim(),
      frete: form.frete || undefined,
      detalhesOrcamento: form.detalhesOrcamento.trim(),
      responsavelOrcamentista:
        form.responsavelOrcamentista.trim() || RESPONSAVEL_PADRAO,
      itens: [...itensPecas, ...itensServicos],
    };
  };

  const handleSubmit = async () => {
    if (isView || !validar()) return;

    try {
      if (mode === "edit" && orcamento) {
        await atualizarOrcamento.mutateAsync({
          id: orcamento.id,
          input: buildPayload(),
        });
        toast({ title: "Orcamento atualizado com sucesso." });
      } else {
        await criarOrcamento.mutateAsync(buildPayload());
        toast({ title: "Orcamento criado com sucesso." });
      }

      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro inesperado ao salvar.";

      toast({
        title: "Erro ao salvar orcamento",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEmpresaChange = (label: string) => {
    const empresa = empresas.find(
      (item) => (item.nome_fantasia || item.nome) === label
    );
    setForm((current) => ({
      ...current,
      empresaId: empresa?.id || "",
    }));
  };

  const title =
    mode === "view" && orcamento
      ? `Orcamento ${orcamento.numero}`
      : mode === "edit" && orcamento
        ? `Editar orcamento ${orcamento.numero}`
        : "Novo Orcamento";

  const dataCriacao = orcamento?.data_orcamento || new Date().toISOString();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <section className="rounded-lg border p-5 space-y-5 bg-card">
            <h3 className="text-sm font-semibold">Identificacao</h3>

            <div className="space-y-2">
              <Label className="text-sm">Tipo de Orcamento *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tipoOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = form.tipoOrcamento === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isView}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          tipoOrcamento: option.value,
                        }))
                      }
                      className={cn(
                        "rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed",
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="w-4 h-4" />
                        {option.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={preventiva}
                disabled={isView}
                onCheckedChange={(value) => setPreventiva(Boolean(value))}
              />
              Preventiva (servico para varios equipamentos - descricao livre)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Numero</Label>
                <Input value={orcamento?.numero || "Gerado automaticamente"} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Data de Criacao</Label>
                <Input
                  type="datetime-local"
                  value={form.dataOrcamento}
                  disabled={isView}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dataOrcamento: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Responsavel Orcamentista</Label>
                <Input
                  value={form.responsavelOrcamentista}
                  disabled={isView}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsavelOrcamentista: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Identificador do Orcamento</Label>
              <Input
                placeholder="Ex: Equipamento, numero de serie, patrimonio ou descricao curta"
                value={form.identificador}
                disabled={isView}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    identificador: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Primeira linha da identificacao tecnica. Este campo e salvo em
                observacoes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Solicitante *</Label>
                {form.origem === "os" ? (
                  <Input value={empresaLabel || "Nao informado"} readOnly />
                ) : (
                  <SearchableSelect
                    value={empresaLabel}
                    onValueChange={handleEmpresaChange}
                    options={empresaOptions}
                    placeholder="Selecione o solicitante"
                    emptyText="Nenhum solicitante encontrado."
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Input value={form.origem === "os" ? "OS" : "Avulso"} readOnly />
              </div>
              <div className="space-y-2">
                <Label>OS vinculada</Label>
                <Input
                  value={
                    fromOS?.numero ||
                    orcamento?.ordem_servico?.numero ||
                    (form.ordemServicoId ? form.ordemServicoId : "-")
                  }
                  readOnly
                />
              </div>
            </div>

            {form.origem === "os" && (
              <div className="space-y-2">
                <Label>Equipamento da OS</Label>
                <Input value={getEquipamentoLabel(fromOS || orcamento)} readOnly />
              </div>
            )}
          </section>

          <section
            className={cn(
              "rounded-lg border p-5 space-y-4 bg-card",
              !incluiPecas && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Pecas</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!incluiPecas || isView}
                  onClick={() => {
                    setQuickCreateIndex(Math.max(0, pecas.length - 1));
                    setQuickCreateOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova peca
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!incluiPecas || isView}
                  onClick={() => setPecas((current) => [...current, emptyPeca()])}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar peca
                </Button>
              </div>
            </div>

            {!incluiPecas ? (
              <p className="text-sm text-muted-foreground">
                Tipo selecionado nao inclui pecas.
              </p>
            ) : (
              <div className="space-y-3">
                {pecas.map((item, index) => {
                  const pecaCadastro = getPecaCadastro(item);
                  const fabricantes = (pecaCadastro?.fabricantes || []).filter(
                    (fabricante) => fabricante.ativo
                  );
                  const modelos = (pecaCadastro?.modelos || []).filter(
                    (modelo) => modelo.ativo
                  );

                  const handlePecaSelecionada = (value: string) => {
                    const peca = pecasCadastro.find(
                      (itemCadastro) => itemCadastro.nome === value
                    );
                    if (peca) {
                      selecionarPecaNoItem(index, peca, false);
                    } else {
                      updatePeca(index, {
                        pecaId: "",
                        pecaNome: value,
                        pecaVariacaoId: "",
                        pecaFabricanteId: "",
                        pecaModeloId: "",
                        fabricanteTexto: "",
                        modeloTexto: "",
                        mostrarFabricante: false,
                        mostrarModelo: false,
                      });
                    }
                  };

                  return (
                  <div
                    key={index}
                    className="rounded-md border p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="space-y-2 md:col-span-3">
                      <Label>Peça cadastrada</Label>
                      <SearchableSelect
                        value={pecaCadastro?.nome || ""}
                        disabled={isView}
                        onValueChange={handlePecaSelecionada}
                        options={pecaOptions}
                        placeholder="Selecione uma peça..."
                        emptyText="Nenhuma peça cadastrada."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nome da peça</Label>
                      <Input
                        value={item.pecaNome}
                        disabled={isView}
                        onChange={(event) =>
                          handlePecaSelecionada(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidade}
                        disabled={isView}
                        onChange={(event) =>
                          updatePeca(index, {
                            quantidade: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Valor unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorUnitario}
                        disabled={isView}
                        onChange={(event) =>
                          updatePeca(index, {
                            valorUnitario: Number(event.target.value),
                            valorUnitarioEditadoManual: true,
                          })
                        }
                      />
                      {pecaCadastro && item.valorUnitarioEditadoManual && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-0 py-0 text-xs"
                          disabled={isView}
                          onClick={() => {
                            const preco = getPrecoSugeridoPeca(
                              pecaCadastro,
                              item.pecaFabricanteId || null,
                              item.pecaModeloId || null
                            );
                            updatePeca(index, {
                              ...buildPecaPatch(
                                item,
                                pecaCadastro,
                                item.pecaFabricanteId || null,
                                item.pecaModeloId || null,
                                true
                              ),
                              valorUnitario: preco ?? item.valorUnitario,
                              valorUnitarioEditadoManual: false,
                            });
                          }}
                        >
                          Usar preco sugerido
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Garantia</Label>
                      <Input
                        value={item.garantia}
                        disabled={isView}
                        onChange={(event) =>
                          updatePeca(index, { garantia: event.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        disabled={isView}
                        onClick={() => removePeca(index)}
                        title="Remover peca"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="space-y-2 md:col-span-3">
                        <Label>Fabricante</Label>
                        <Select
                          value={item.pecaFabricanteId || "none"}
                          disabled={isView || fabricantes.length === 0}
                          onValueChange={(value) => {
                            const fabricante =
                              value === "none"
                                ? null
                                : fabricantes.find((option) => option.id === value);
                            updatePeca(index, {
                              pecaFabricanteId: fabricante?.id || "",
                              fabricanteTexto: fabricante?.nome || "",
                              mostrarFabricante: fabricante
                                ? item.mostrarFabricante
                                : false,
                              ...buildPecaPatch(
                                item,
                                pecaCadastro,
                                fabricante?.id || null,
                                item.pecaModeloId || null
                              ),
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Nao informar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nao informar</SelectItem>
                            {fabricantes.map((fabricante) => (
                              <SelectItem key={fabricante.id} value={fabricante.id}>
                                {fabricante.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <Label>Modelo</Label>
                        <Select
                          value={item.pecaModeloId || "none"}
                          disabled={isView || modelos.length === 0}
                          onValueChange={(value) => {
                            const modelo =
                              value === "none"
                                ? null
                                : modelos.find((option) => option.id === value);
                            updatePeca(index, {
                              pecaModeloId: modelo?.id || "",
                              modeloTexto: modelo?.nome || "",
                              mostrarModelo: modelo ? item.mostrarModelo : false,
                              ...buildPecaPatch(
                                item,
                                pecaCadastro,
                                item.pecaFabricanteId || null,
                                modelo?.id || null
                              ),
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Nao informar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nao informar</SelectItem>
                            {modelos.map((modelo) => (
                              <SelectItem key={modelo.id} value={modelo.id}>
                                {modelo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 md:col-span-3 text-sm">
                        <Checkbox
                          checked={item.mostrarFabricante}
                          disabled={isView || !item.fabricanteTexto}
                          onCheckedChange={(checked) =>
                            updatePeca(index, {
                              mostrarFabricante: Boolean(checked),
                            })
                          }
                        />
                        Mostrar fabricante para o cliente
                      </label>
                      <label className="flex items-center gap-2 md:col-span-3 text-sm">
                        <Checkbox
                          checked={item.mostrarModelo}
                          disabled={isView || !item.modeloTexto}
                          onCheckedChange={(checked) =>
                            updatePeca(index, {
                              mostrarModelo: Boolean(checked),
                            })
                          }
                        />
                        Mostrar modelo para o cliente
                      </label>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className={cn(
              "rounded-lg border p-5 space-y-4 bg-card",
              !incluiServicos && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Servicos</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!incluiServicos || isView}
                onClick={() =>
                  setServicos((current) => [...current, emptyServico()])
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar servico
              </Button>
            </div>

            {!incluiServicos ? (
              <p className="text-sm text-muted-foreground">
                Tipo selecionado nao inclui servicos.
              </p>
            ) : (
              <div className="space-y-3">
                {servicos.map((item, index) => {
                  const tipoServicoNome = getTipoServicoNome(item.tipoServicoId);
                  const tipoEquipamentoNome = getTipoEquipamentoNome(
                    item.tipoEquipamentoId
                  );

                  return (
                    <div
                      key={index}
                      className="rounded-md border p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="space-y-2 md:col-span-3">
                          <Label>Tipo de Servico</Label>
                          <SearchableSelect
                            value={tipoServicoNome}
                            onValueChange={(value) => {
                              const tipo = tiposOS.find(
                                (item) => item.nome === value
                              );
                              updateServico(index, {
                                tipoServicoId: tipo?.id || "",
                              });
                            }}
                            options={tipoServicoOptions}
                            placeholder="Selecione"
                            emptyText="Nenhum tipo encontrado."
                          />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                          <Label>Tipo de Equipamento</Label>
                          <SearchableSelect
                            value={tipoEquipamentoNome}
                            onValueChange={(value) => {
                              const tipo = tiposEquipamento.find(
                                (item) => item.nome === value
                              );
                              updateServico(index, {
                                tipoEquipamentoId: tipo?.id || "",
                              });
                            }}
                            options={tipoEquipamentoOptions}
                            placeholder="Selecione"
                            emptyText="Nenhum tipo encontrado."
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantidade}
                            disabled={isView}
                            onChange={(event) =>
                              updateServico(index, {
                                quantidade: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Valor unitario</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.valorUnitario}
                            disabled={isView}
                            onChange={(event) =>
                              updateServico(index, {
                                valorUnitario: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-1">
                          <Label>Garantia</Label>
                          <Input
                            value={item.garantia}
                            disabled={isView}
                            onChange={(event) =>
                              updateServico(index, {
                                garantia: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            disabled={isView}
                            onClick={() => removeServico(index)}
                            title="Remover servico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descricao complementar</Label>
                        <Input
                          value={item.descricao}
                          disabled={isView}
                          onChange={(event) =>
                            updateServico(index, {
                              descricao: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border p-5 space-y-5 bg-card">
            <h3 className="text-sm font-semibold">Informacoes Financeiras</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-md bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Total Pecas</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalPecas)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Total Servicos</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalServicos)}
                </p>
              </div>
              <div className="rounded-md bg-primary/10 p-4">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(totalGeral)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={form.formaPagamento || "none"}
                  disabled={isView}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      formaPagamento:
                        value === "none" ? "" : (value as FormaPagamento),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao informado</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartao</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modo de Pagamento</Label>
                <Select
                  value={form.modoPagamento}
                  disabled={isView}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      modoPagamento: value as ModoPagamento,
                      numeroParcelas:
                        value === "avista" ? 1 : Math.max(2, current.numeroParcelas || 2),
                      diasEntreParcelas:
                        value === "avista" ? 30 : current.diasEntreParcelas || 30,
                      valorEntrada:
                        value === "entrada_parcela" ? current.valorEntrada || 0 : 0,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">A vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                    <SelectItem value="entrada_parcela">
                      Entrada + Parcelas
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.modoPagamento !== "avista" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {form.modoPagamento === "entrada_parcela" && (
                  <div className="space-y-2">
                    <Label>Valor da entrada</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valorEntrada}
                      disabled={isView}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          valorEntrada: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Numero de parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.numeroParcelas}
                    disabled={isView}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        numeroParcelas: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dias entre parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.diasEntreParcelas}
                    disabled={isView}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        diasEntreParcelas: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor da parcela</Label>
                  <Input value={formatCurrency(valorParcela)} readOnly />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Condicoes de pagamento</Label>
                  <Input value={condicoesPagamentoTexto} readOnly />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border p-5 space-y-4 bg-card">
            <h3 className="text-sm font-semibold">Entrega e Validade</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prazo de Entrega</Label>
                <Input
                  value={form.prazoEntrega}
                  disabled={isView}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      prazoEntrega: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Validade da Proposta (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.validadeDias}
                  disabled={isView}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validadeDias: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Frete</Label>
                <Select
                  value={form.frete || "none"}
                  disabled={isView}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      frete: value === "none" ? "" : (value as FreteTipo),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao informado</SelectItem>
                    <SelectItem value="cif">CIF</SelectItem>
                    <SelectItem value="fob">FOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-5 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Detalhes do Orcamento</h3>
            </div>
            <Textarea
              placeholder="Descricao detalhada do orcamento..."
              rows={6}
              value={form.detalhesOrcamento}
              disabled={isView}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  detalhesOrcamento: event.target.value,
                }))
              }
            />
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {isView ? "Fechar" : "Cancelar"}
          </Button>
          {!isView && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Salvando..." : "Salvar Orcamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PecaQuickCreateDialog
      open={quickCreateOpen}
      onOpenChange={setQuickCreateOpen}
      onCreated={(peca) => {
        const index = quickCreateIndex ?? Math.max(0, pecas.length - 1);
        selecionarPecaNoItem(index, peca, true);
      }}
    />
    </>
  );
};

export default OrcamentoFormDialog;

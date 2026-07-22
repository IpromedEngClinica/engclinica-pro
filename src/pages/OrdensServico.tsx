import {
  ClipboardList,
  FileText,
  FileSignature,
  Plus,
  Search,
  Eye,
  Pencil,
  EyeOff,
  MoreHorizontal,
  SlidersHorizontal,
  ChevronDown,
  PackageCheck,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangeFilter from "@/components/DateRangeFilter";
import SortableTableHeader from "@/components/SortableTableHeader";
import ListPagination from "@/components/ListPagination";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import PageHeader from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useAlterarEstadoOrdemServico,
  useExcluirOrdemServico,
  useOrdensServicoFilterOptions,
  useOrdensServicoPaginadas,
} from "@/hooks/useOrdensServico";
import { useEstadosOS } from "@/hooks/useCamposOS";
import {
  OrdensServicoSortField,
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { toast } from "@/hooks/use-toast";
import OrdemServicoFormDialog, {
  DialogMode,
} from "@/components/OrdemServicoFormDialog";
import OrdemServicoEdicaoLoteDialog from "@/components/OrdemServicoEdicaoLoteDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import ProtocoloEntregaDialog from "@/components/ProtocoloEntregaDialog";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import { ordenarNomesEstadosOS } from "@/utils/ordemEstadosOS";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";
import { useAuth } from "@/contexts/AuthContext";

const ALL = "__all__";

const dateFilterBoundary = (value: string, nextDay = false) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + (nextDay ? 1 : 0));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const getEmpresaNome = (os: OrdemServicoSupabase) => {
  return os.empresa?.nome || os.empresa?.nome_fantasia || "Não informado";
};

const getEquipamentoLabel = (os: OrdemServicoSupabase) => {
  if (!os.equipamento) return "—";

  const tipo =
    os.equipamento.tipo_equipamento?.nome ||
    os.equipamento.tipo_texto ||
    "Equipamento";

  const partes = [
    tipo,
    os.equipamento.fabricante,
    os.equipamento.modelo,
    os.equipamento.tag,
  ].filter(Boolean);

  return partes.join(" - ");
};

const getTipoServico = (os: OrdemServicoSupabase) => {
  return os.tipo_os?.nome || "Não informado";
};

const isOSPreventiva = (os: OrdemServicoSupabase) =>
  getTipoServico(os).toLowerCase().includes("preventiva");

const getEstado = (os: OrdemServicoSupabase) => {
  return os.estado_os?.nome || os.status_sistema || "Não informado";
};

const getTecnico = (os: OrdemServicoSupabase) => {
  return os.responsavel_texto || "—";
};

const getNumeroOrdenacao = (numero?: string | null) => {
  const digits = (numero || "").replace(/\D/g, "");
  const value = Number(digits || numero || 0);
  return Number.isFinite(value) ? value : 0;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const statusColor = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("fechada") || normalized.includes("fechado")) {
    return "bg-success/10 text-success";
  }

  if (normalized.includes("cancelada") || normalized.includes("cancelado")) {
    return "bg-destructive/10 text-destructive";
  }

  if (
    normalized.includes("aguardando") ||
    normalized.includes("orçamento") ||
    normalized.includes("peca") ||
    normalized.includes("peça")
  ) {
    return "bg-warning/10 text-warning";
  }

  return "bg-primary/10 text-primary";
};

const OrdensServico = () => {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState("numero");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<OrdemServicoSupabase | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesOS, setDetalhesOS] = useState<OrdemServicoSupabase | null>(
    null
  );
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [osEntrega, setOsEntrega] = useState<OrdemServicoSupabase | null>(null);
  const [orcamentoOpen, setOrcamentoOpen] = useState(false);
  const [osOrcamento, setOsOrcamento] = useState<OrdemServicoSupabase | null>(
    null
  );
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [osChecklist, setOsChecklist] = useState<OrdemServicoSupabase | null>(null);
  const [ordensSelecionadas, setOrdensSelecionadas] = useState<Set<string>>(
    () => new Set()
  );
  const [edicaoLoteOpen, setEdicaoLoteOpen] = useState(false);

  const [hideClosed, setHideClosed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: estadosOS = [] } = useEstadosOS();
  const { data: opcoesFiltrosOS } = useOrdensServicoFilterOptions();
  const alterarEstadoOS = useAlterarEstadoOrdemServico();
  const excluirOS = useExcluirOrdemServico();

  const emptyFilters = {
    estado: ALL,
    solicitante: ALL,
    tipoServico: ALL,
    responsavelTecnico: "",
    numero: "",
    dataAberturaDe: "",
    dataAberturaAte: "",
    dataFechamentoDe: "",
    dataFechamentoAte: "",
  };

  const [filters, setFilters] = useState(emptyFilters);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, hideClosed, listLimit, sortDirection, sortKey]);

  const sortableServerFields = useMemo(
    () =>
      new Set<string>(["numero", "data", "created_at", "responsavel"]),
    []
  );

  const sortByServerField = useMemo(() => {
    if (sortKey === "numero") return "numero_ordem";
    if (sortKey === "data") return "data_abertura";
    if (sortKey === "responsavel") return "responsavel_texto";
    return sortableServerFields.has(sortKey) ? sortKey : "numero_ordem";
  }, [sortKey, sortableServerFields]);

  const ordensServicoQueryFiltros = useMemo(
    () => ({
      termo: debouncedSearch,
      ocultarFechadas: hideClosed,
      estadoNome: filters.estado === ALL ? undefined : filters.estado,
      solicitanteNome:
        filters.solicitante === ALL ? undefined : filters.solicitante,
      tipoServicoNome:
        filters.tipoServico === ALL ? undefined : filters.tipoServico,
      responsavelTecnico: filters.responsavelTecnico,
      numero: filters.numero,
      dataAberturaDe: dateFilterBoundary(filters.dataAberturaDe),
      dataAberturaAte: dateFilterBoundary(filters.dataAberturaAte, true),
      dataFechamentoDe: dateFilterBoundary(filters.dataFechamentoDe),
      dataFechamentoAte: dateFilterBoundary(filters.dataFechamentoAte, true),
      page,
      limit: listLimit,
      sortBy: sortByServerField as OrdensServicoSortField,
      ascending: sortDirection === "asc",
    }),
    [
      debouncedSearch,
      filters,
      hideClosed,
      listLimit,
      page,
      sortDirection,
      sortByServerField,
    ]
  );

  const {
    data: ordensServicoResult,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOrdensServicoPaginadas(ordensServicoQueryFiltros);

  const ordensServico = ordensServicoResult?.items || [];
  const totalOrdensServico = ordensServicoResult?.total || 0;

  const opts = useMemo(
    () => ({
      estado: opcoesFiltrosOS?.estados || [],
      solicitante: opcoesFiltrosOS?.solicitantes || [],
      tipoServico: opcoesFiltrosOS?.tiposServico || [],
    }),
    [opcoesFiltrosOS]
  );

  const estadoOptions = useMemo(
    () => ordenarNomesEstadosOS(estadosOS.map((estado) => estado.nome)),
    [estadosOS]
  );

  const sortGetters = useMemo<Record<string, (item: OrdemServicoSupabase) => unknown>>(
    () => ({
      numero: (os) => getNumeroOrdenacao(os.numero),
      data: (os) => os.data_abertura || os.created_at,
      empresa: getEmpresaNome,
      equipamento: getEquipamentoLabel,
      estado: getEstado,
      tipo_os: getTipoServico,
      responsavel: getTecnico,
    }),
    []
  );

  const visibleOrdensServico = useMemo(
    () =>
      sortByValue(
        ordensServico,
        sortGetters[sortKey] || sortGetters.data,
        sortDirection
      ),
    [ordensServico, sortDirection, sortGetters, sortKey]
  );

  const podeEditarEmLote = ["admin", "gestor", "tecnico"].includes(
    usuario?.perfil || ""
  );
  const idsVisiveis = useMemo(
    () => visibleOrdensServico.map((os) => os.id),
    [visibleOrdensServico]
  );
  const quantidadeVisivelSelecionada = idsVisiveis.filter((id) =>
    ordensSelecionadas.has(id)
  ).length;
  const todasVisiveisSelecionadas =
    idsVisiveis.length > 0 && quantidadeVisivelSelecionada === idsVisiveis.length;
  const algumasVisiveisSelecionadas =
    quantidadeVisivelSelecionada > 0 && !todasVisiveisSelecionadas;

  const alternarSelecao = (id: string, checked: boolean) => {
    setOrdensSelecionadas((atuais) => {
      const proximas = new Set(atuais);
      if (checked) proximas.add(id);
      else proximas.delete(id);
      return proximas;
    });
  };

  const alternarSelecaoPagina = (checked: boolean) => {
    setOrdensSelecionadas((atuais) => {
      const proximas = new Set(atuais);
      idsVisiveis.forEach((id) => {
        if (checked) proximas.add(id);
        else proximas.delete(id);
      });
      return proximas;
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalOrdensServico / listLimit));
  const firstVisibleIndex = totalOrdensServico
    ? (page - 1) * listLimit + 1
    : 0;
  const lastVisibleIndex = Math.min(page * listLimit, totalOrdensServico);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;

    if (filters.estado !== ALL) n++;
    if (filters.solicitante !== ALL) n++;
    if (filters.tipoServico !== ALL) n++;
    if (filters.responsavelTecnico.trim()) n++;
    if (filters.numero.trim()) n++;
    if (filters.dataAberturaDe || filters.dataAberturaAte) n++;
    if (filters.dataFechamentoDe || filters.dataFechamentoAte) n++;

    return n;
  }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const hasUrlFilters = [
      "estado",
      "solicitante",
      "tipoServico",
      "responsavelTecnico",
      "numero",
      "dataAberturaDe",
      "dataAberturaAte",
      "dataFechamentoDe",
      "dataFechamentoAte",
      "hideClosed",
      "q",
    ].some((key) => params.has(key));

    setSearch(params.get("q") || "");
    setHideClosed(params.get("hideClosed") === "true");
    setFilters((current) => ({
      ...current,
      estado: params.get("estado") || ALL,
      solicitante: params.get("solicitante") || ALL,
      tipoServico: params.get("tipoServico") || ALL,
      responsavelTecnico: params.get("responsavelTecnico") || "",
      numero: params.get("numero") || "",
      dataAberturaDe: params.get("dataAberturaDe") || "",
      dataAberturaAte: params.get("dataAberturaAte") || "",
      dataFechamentoDe: params.get("dataFechamentoDe") || "",
      dataFechamentoAte: params.get("dataFechamentoAte") || "",
    }));

    if (hasUrlFilters) {
      setFiltersOpen(true);
    }
  }, [queryString]);

  useEffect(() => {
    const osId = searchParams.get("os");
    if (!osId) return;

    let active = true;

    const abrirOrdemServicoDaUrl = async () => {
      try {
        const ordem = await ordensServicoService.buscarPorId(osId);
        if (!active) return;

        setDetalhesOS(ordem);
        setDetalhesOpen(true);
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("os");
          return next;
        }, { replace: true });
      } catch (error) {
        if (!active) return;

        toast({
          title: "Erro ao abrir OS",
          description:
            error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      }
    };

    abrirOrdemServicoDaUrl();

    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams]);

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setOpen(true);
  };

  const carregarOSCompleta = async (os: OrdemServicoSupabase) => {
    return ordensServicoService.buscarPorId(os.id);
  };

  const openDetails = async (os: OrdemServicoSupabase) => {
    try {
      const ordemCompleta = await carregarOSCompleta(os);
      setDetalhesOS(ordemCompleta);
      setDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir OS",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openView = (os: OrdemServicoSupabase) => {
    openDetails(os);
  };

  const openEdit = async (os: OrdemServicoSupabase) => {
    try {
      const ordemCompleta = await carregarOSCompleta(os);
      setSelected(ordemCompleta);
      setMode("edit");
      setOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir edição",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openEntrega = (os: OrdemServicoSupabase) => {
    setOsEntrega(os);
    setEntregaOpen(true);
  };

  const openOrcamento = (os: OrdemServicoSupabase) => {
    setOsOrcamento(os);
    setOrcamentoOpen(true);
  };

  const openChecklist = async (os: OrdemServicoSupabase) => {
    try {
      const ordemCompleta = await carregarOSCompleta(os);
      setOsChecklist(ordemCompleta);
      setChecklistOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir checklist",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openEmpresaDetalhes = async (
    empresa: EmpresaSupabase | null | undefined
  ) => {
    if (!empresa) return;

    try {
      const empresaCompleta = await empresasService.buscarPorId(empresa.id);
      setEmpresaSelecionada(empresaCompleta);
      setEmpresaDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir empresa",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openEquipamentoDetalhes = async (
    equipamento: EquipamentoSupabase | null | undefined
  ) => {
    if (!equipamento) return;

    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        equipamento.id
      );
      setEquipamentoSelecionado(equipamentoCompleto);
      setEquipamentoDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const featurePending = (label: string) => {
    toast({
      title: label,
      description: "Funcionalidade será migrada para Supabase na próxima etapa.",
    });
  };

  const handleEstadoChange = async (
    os: OrdemServicoSupabase,
    estadoNome: string
  ) => {
    const estado = estadosOS.find((item) => item.nome === estadoNome);

    if (!estado) {
      toast({
        title: "Estado não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      await alterarEstadoOS.mutateAsync({
        id: os.id,
        estadoOsId: estado.id,
      });

      toast({
        title: "Estado da OS atualizado com sucesso!",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao alterar estado.";

      toast({
        title: "Erro ao alterar estado da OS",
        description: message,
        variant: "destructive",
      });
    } finally {
      setEditingEstadoId(null);
    }
  };

  const handleExcluir = async (os: OrdemServicoSupabase) => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir a OS ${os.numero}? Ela será ocultada da listagem, mas permanecerá no banco para histórico.`
    );

    if (!confirmado) return;

    try {
      await excluirOS.mutateAsync(os.id);

      toast({
        title: "OS excluída com sucesso.",
        description: `A OS ${os.numero} foi ocultada da listagem.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro inesperado ao excluir OS.";

      toast({
        title: "Erro ao excluir OS",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleGerarPdfOS = async (os: OrdemServicoSupabase) => {
    try {
      const osCompleta = await ordensServicoService.buscarPorId(os.id);
      await gerarPdfOrdemServico(
        usuario?.perfil === "solicitante"
          ? { ...osCompleta, descricao_servico: null }
          : osCompleta
      );
    } catch (error) {
      toast({
        title: "Erro ao gerar PDF",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie as ordens de serviço cadastradas no Supabase"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova OS
        </Button>
      </PageHeader>

      <OrdemServicoFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        os={selected}
      />

      <OrdemServicoEdicaoLoteDialog
        open={edicaoLoteOpen}
        onOpenChange={setEdicaoLoteOpen}
        ordemIds={Array.from(ordensSelecionadas)}
        onSuccess={() => setOrdensSelecionadas(new Set())}
      />

      <OrdemServicoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(value) => {
          setDetalhesOpen(value);
          if (!value) setDetalhesOS(null);
        }}
        os={detalhesOS}
        onEdit={(ordem) => {
          setDetalhesOpen(false);
          setDetalhesOS(null);
          setSelected(ordem);
          setMode("edit");
          setOpen(true);
        }}
        onDelete={(ordem) => {
          setDetalhesOpen(false);
          setDetalhesOS(null);
          handleExcluir(ordem);
        }}
        onOpenEmpresa={openEmpresaDetalhes}
        onOpenEquipamento={openEquipamentoDetalhes}
        onCriarOrcamento={openOrcamento}
        onProtocoloEntrega={openEntrega}
      />

      <EmpresaDetalhesDialog
        open={empresaDetalhesOpen}
        onOpenChange={(value) => {
          setEmpresaDetalhesOpen(value);
          if (!value) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
      />

      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={(value) => {
          setEquipamentoDetalhesOpen(value);
          if (!value) setEquipamentoSelecionado(null);
        }}
        equipamento={equipamentoSelecionado}
      />

      <ProtocoloEntregaDialog
        open={entregaOpen}
        onOpenChange={(value) => {
          setEntregaOpen(value);
          if (!value) setOsEntrega(null);
        }}
        os={osEntrega}
      />

      <OrcamentoFormDialog
        open={orcamentoOpen}
        onOpenChange={(value) => {
          setOrcamentoOpen(value);
          if (!value) setOsOrcamento(null);
        }}
        mode="create"
        fromOS={osOrcamento}
      />

      <PreventivaChecklistDialog
        open={checklistOpen}
        onOpenChange={(value) => {
          setChecklistOpen(value);
          if (!value) setOsChecklist(null);
        }}
        osExistenteId={osChecklist?.id || null}
        modo="usar_os_existente"
      />

      <div className="bg-card rounded-xl border mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {filtersOpen && (
          <div className="border-t px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SearchableSelect
                value={filters.estado === ALL ? "" : filters.estado}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, estado: v || ALL }))
                }
                options={opts.estado}
                placeholder="Estado (todos)"
                emptyText="Nenhum estado encontrado."
              />

              <SearchableSelect
                value={filters.solicitante === ALL ? "" : filters.solicitante}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, solicitante: v || ALL }))
                }
                options={opts.solicitante}
                placeholder="Solicitante (todos)"
                emptyText="Nenhum solicitante encontrado."
              />

              <SearchableSelect
                value={filters.tipoServico === ALL ? "" : filters.tipoServico}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, tipoServico: v || ALL }))
                }
                options={opts.tipoServico}
                placeholder="Tipo de Serviço (todos)"
                emptyText="Nenhum tipo encontrado."
              />

              <Input
                placeholder="Número da OS"
                value={filters.numero}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, numero: e.target.value }))
                }
              />

              <Input
                placeholder="Técnico Executor"
                value={filters.responsavelTecnico}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    responsavelTecnico: e.target.value,
                  }))
                }
              />

              <DateRangeFilter
                label="Abertura"
                from={filters.dataAberturaDe}
                to={filters.dataAberturaAte}
                onChange={(range) =>
                  setFilters((current) => ({
                    ...current,
                    dataAberturaDe: range.from,
                    dataAberturaAte: range.to,
                  }))
                }
              />

              <DateRangeFilter
                label="Fechamento"
                from={filters.dataFechamentoDe}
                to={filters.dataFechamentoAte}
                onChange={(range) =>
                  setFilters((current) => ({
                    ...current,
                    dataFechamentoDe: range.from,
                    dataFechamentoAte: range.to,
                  }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setFilters(emptyFilters)}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar OS, equipamento ou solicitante..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {podeEditarEmLote && ordensSelecionadas.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm font-medium text-primary">
                  {ordensSelecionadas.size} selecionada(s)
                </span>
                <Button size="sm" onClick={() => setEdicaoLoteOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edição rápida
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOrdensSelecionadas(new Set())}
                >
                  Limpar
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ListLimitSelect
              value={listLimit}
              onChange={setListLimit}
              total={totalOrdensServico}
            />
            <Button
              variant={hideClosed ? "default" : "outline"}
              size="sm"
              onClick={() => setHideClosed((v) => !v)}
              title="Ocultar OS fechadas e canceladas"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              {hideClosed ? "Mostrar todas" : "Ocultar fechadas"}
            </Button>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando ordens de serviço...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar ordens de serviço
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {error instanceof Error ? error.message : "Erro desconhecido."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {podeEditarEmLote && (
                    <th className="w-12 px-5 py-3 text-left">
                      <Checkbox
                        checked={
                          todasVisiveisSelecionadas
                            ? true
                            : algumasVisiveisSelecionadas
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(value) =>
                          alternarSelecaoPagina(value === true)
                        }
                        aria-label="Selecionar todas as OS desta página"
                      />
                    </th>
                  )}
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Numero" sortField="numero" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Estado" sortField="estado" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Solicitante" sortField="empresa" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Equipamento" sortField="equipamento" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Tecnico Executor" sortField="responsavel" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Tipo de Servico" sortField="tipo_os" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Data de Criacao" sortField="data" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleOrdensServico.map((os) => {
                  const estado = getEstado(os);
                  const solicitante = getEmpresaNome(os);
                  const equipamento = getEquipamentoLabel(os);
                  const tecnico = getTecnico(os);
                  const tipoServico = getTipoServico(os);
                  const preventiva = isOSPreventiva(os);

                  return (
                    <tr
                      key={os.id}
                      className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                        ordensSelecionadas.has(os.id) ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      {podeEditarEmLote && (
                        <td className="w-12 px-5 py-3">
                          <Checkbox
                            checked={ordensSelecionadas.has(os.id)}
                            onCheckedChange={(value) =>
                              alternarSelecao(os.id, value === true)
                            }
                            aria-label={`Selecionar OS ${os.numero}`}
                          />
                        </td>
                      )}
                      <td className="px-5 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openView(os)}
                          className="text-primary hover:underline flex items-center gap-2"
                        >
                          <ClipboardList className="w-4 h-4" /> {os.numero}
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        {editingEstadoId === os.id ? (
                          <div className="w-56">
                            <SearchableSelect
                              value={estado}
                              onValueChange={(value) =>
                                handleEstadoChange(os, value)
                              }
                              options={estadoOptions}
                              placeholder="Selecione o estado"
                              emptyText="Nenhum estado encontrado."
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingEstadoId(os.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                              estado
                            )}`}
                            title="Clique para alterar o estado"
                          >
                            {estado}
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {os.empresa ? (
                          <button
                            type="button"
                            className="text-primary hover:underline font-medium text-left"
                            onClick={() => openEmpresaDetalhes(os.empresa)}
                          >
                            {solicitante}
                          </button>
                        ) : (
                          solicitante
                        )}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {os.equipamento ? (
                          <button
                            type="button"
                            className="text-primary hover:underline font-medium text-left"
                            onClick={() =>
                              openEquipamentoDetalhes(os.equipamento)
                            }
                          >
                            {equipamento}
                          </button>
                        ) : (
                          equipamento
                        )}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {tecnico}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {tipoServico}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(os.data_abertura)}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Ações">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="w-52 bg-popover"
                            >
                              <DropdownMenuItem onClick={() => openView(os)}>
                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => openEdit(os)}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>

                              {preventiva && (
                                <DropdownMenuItem onClick={() => openChecklist(os)}>
                                  <ClipboardList className="w-4 h-4 mr-2" />
                                  Checklist preventiva
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleGerarPdfOS(os)}
                              >
                                <FileText className="w-4 h-4 mr-2" /> Gerar PDF
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => openOrcamento(os)}
                              >
                                <FileSignature className="w-4 h-4 mr-2" /> Gerar
                                Orçamento
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => openEntrega(os)}
                              >
                                <PackageCheck className="w-4 h-4 mr-2" />{" "}
                                Protocolo de Entrega
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleExcluir(os)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir OS
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleOrdensServico.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeEditarEmLote ? 9 : 8}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma ordem de serviço cadastrada no Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalOrdensServico}
              firstVisibleIndex={firstVisibleIndex}
              lastVisibleIndex={lastVisibleIndex}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdensServico;

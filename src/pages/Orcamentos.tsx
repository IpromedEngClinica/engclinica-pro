import {
  AlertCircle,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrcamentoDetalhesDialog from "@/components/OrcamentoDetalhesDialog";
import OrcamentoFormDialog, {
  OrcamentoDialogMode,
} from "@/components/OrcamentoFormDialog";
import SearchableSelect from "@/components/SearchableSelect";
import SortableTableHeader from "@/components/SortableTableHeader";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  useAlterarStatusOrcamento,
  useOrcamentos,
} from "@/hooks/useOrcamentos";
import {
  OrcamentoStatus,
  OrcamentoSupabase,
  orcamentosService,
} from "@/services/orcamentosService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfOrcamento } from "@/utils/gerarPdfOrcamento";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (orcamento: OrcamentoSupabase) =>
  orcamento.empresa?.nome_fantasia ||
  orcamento.empresa?.nome ||
  "Nao informado";

const tipoLabel = (tipo?: string | null) => {
  const map: Record<string, string> = {
    servico: "Servico",
    pecas: "Pecas",
    pecas_servicos: "Pecas + Servicos",
  };

  return tipo ? map[tipo] || tipo : "-";
};

const statusLabel = (status?: string | null) => {
  const map: Record<string, string> = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    faturado: "Faturado",
    cancelado: "Cancelado",
  };

  return status ? map[status] || status : "-";
};

const origemLabel = (origem?: string | null) =>
  origem === "os" ? "OS" : origem === "avulso" ? "Avulso" : "-";

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    pendente: "bg-warning/10 text-warning",
    aprovado: "bg-success/10 text-success",
    reprovado: "bg-destructive/10 text-destructive",
    faturado: "bg-primary/10 text-primary",
    cancelado: "bg-muted text-muted-foreground",
  };

  return map[status] || "bg-muted text-muted-foreground";
};

const getStatusBadgeClass = (status: string) =>
  `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition hover:opacity-80 cursor-pointer ${statusClass(
    status
  )}`;

const statusTabs: Array<{ value: OrcamentoStatus; label: string }> = [
  { value: "pendente", label: "Pendentes" },
  { value: "aprovado", label: "Aprovados" },
  { value: "reprovado", label: "Reprovados" },
  { value: "faturado", label: "Faturados" },
  { value: "cancelado", label: "Cancelados" },
];

const statusOptions: Array<{ value: OrcamentoStatus; label: string }> = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "faturado", label: "Faturado" },
  { value: "cancelado", label: "Cancelado" },
];

const Orcamentos = () => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] =
    useState<OrcamentoStatus | typeof ALL>("pendente");
  const [tipoFilter, setTipoFilter] = useState(ALL);
  const [clienteFiltro, setClienteFiltro] = useState(ALL);
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState(ALL);
  const [modoPagamentoFiltro, setModoPagamentoFiltro] = useState(ALL);
  const [freteFiltro, setFreteFiltro] = useState(ALL);
  const [orcamentistaFiltro, setOrcamentistaFiltro] = useState(ALL);
  const [dataInicioFiltro, setDataInicioFiltro] = useState("");
  const [dataFimFiltro, setDataFimFiltro] = useState("");
  const [valorMinFiltro, setValorMinFiltro] = useState("");
  const [valorMaxFiltro, setValorMaxFiltro] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState<
    typeof ALL | "com_os" | "avulso"
  >(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [mode, setMode] = useState<OrcamentoDialogMode>("create");
  const [selected, setSelected] = useState<OrcamentoSupabase | null>(null);
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const { data: orcamentos = [], isLoading, isError, error, refetch } =
    useOrcamentos();
  const alterarStatus = useAlterarStatusOrcamento();

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

  const opts = useMemo(
    () => ({
      clientes: uniq(orcamentos.map((orcamento) => getEmpresaNome(orcamento))),
      formasPagamento: uniq(
        orcamentos.map((orcamento) => orcamento.forma_pagamento || "")
      ),
      modosPagamento: uniq(
        orcamentos.map((orcamento) => orcamento.modo_pagamento || "")
      ),
      fretes: uniq(orcamentos.map((orcamento) => orcamento.frete || "")),
      orcamentistas: uniq(
        orcamentos.map((orcamento) => orcamento.responsavel_orcamentista || "")
      ),
    }),
    [orcamentos]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orcamentos.filter((orcamento) => {
      const empresa = getEmpresaNome(orcamento);
      const osNumero = orcamento.ordem_servico?.numero || "";
      const matchSearch =
        !q ||
        orcamento.numero.toLowerCase().includes(q) ||
        (orcamento.identificador || "").toLowerCase().includes(q) ||
        empresa.toLowerCase().includes(q) ||
        osNumero.toLowerCase().includes(q) ||
        tipoLabel(orcamento.tipo_orcamento).toLowerCase().includes(q) ||
        statusLabel(orcamento.status).toLowerCase().includes(q);

      const matchStatus =
        statusFiltro === ALL || orcamento.status === statusFiltro;
      const matchTipo =
        tipoFilter === ALL || orcamento.tipo_orcamento === tipoFilter;
      const matchCliente =
        clienteFiltro === ALL || empresa === clienteFiltro;
      const matchFormaPagamento =
        formaPagamentoFiltro === ALL ||
        orcamento.forma_pagamento === formaPagamentoFiltro;
      const matchModoPagamento =
        modoPagamentoFiltro === ALL ||
        orcamento.modo_pagamento === modoPagamentoFiltro;
      const matchFrete =
        freteFiltro === ALL || orcamento.frete === freteFiltro;
      const matchOrcamentista =
        orcamentistaFiltro === ALL ||
        orcamento.responsavel_orcamentista === orcamentistaFiltro;
      const matchDataInicio =
        !dataInicioFiltro || orcamento.data_orcamento >= dataInicioFiltro;
      const matchDataFim =
        !dataFimFiltro || orcamento.data_orcamento <= dataFimFiltro;
      const valorMin = Number(valorMinFiltro);
      const valorMax = Number(valorMaxFiltro);
      const matchValorMin =
        !valorMinFiltro || orcamento.valor_total >= valorMin;
      const matchValorMax =
        !valorMaxFiltro || orcamento.valor_total <= valorMax;
      const matchOrigem =
        origemFiltro === ALL ||
        (origemFiltro === "com_os"
          ? Boolean(orcamento.ordem_servico_id)
          : !orcamento.ordem_servico_id || orcamento.origem === "avulso");

      return (
        matchSearch &&
        matchStatus &&
        matchTipo &&
        matchCliente &&
        matchFormaPagamento &&
        matchModoPagamento &&
        matchFrete &&
        matchOrcamentista &&
        matchDataInicio &&
        matchDataFim &&
        matchValorMin &&
        matchValorMax &&
        matchOrigem
      );
    });
  }, [
    clienteFiltro,
    dataFimFiltro,
    dataInicioFiltro,
    formaPagamentoFiltro,
    freteFiltro,
    modoPagamentoFiltro,
    orcamentistaFiltro,
    orcamentos,
    origemFiltro,
    search,
    statusFiltro,
    tipoFilter,
    valorMaxFiltro,
    valorMinFiltro,
  ]);

  const sortGetters: Record<string, (item: OrcamentoSupabase) => unknown> = {
    numero: (o) => o.numero,
    data: (o) => o.data_orcamento || o.created_at,
    cliente: getEmpresaNome,
    equipamento: (o) => o.identificador || getEquipamentoLabel(o.equipamento),
    status: (o) => o.status,
    tipo: (o) => o.tipo_orcamento,
    origem: (o) => o.origem,
    os: (o) => o.ordem_servico?.numero,
    valor_pecas: (o) => o.valor_pecas,
    valor_servicos: (o) => o.valor_servicos,
    valor_total: (o) => o.valor_total,
    forma_pagamento: (o) => o.forma_pagamento,
    orcamentista: (o) => o.responsavel_orcamentista,
    validade: (o) => o.data_validade,
  };

  const sortedFiltered = useMemo(
    () =>
      sortByValue(
        filtered,
        sortGetters[sortKey] || sortGetters.data,
        sortDirection
      ),
    [filtered, sortDirection, sortKey]
  );

  const visibleOrcamentos = useMemo(
    () => sortedFiltered.slice(0, listLimit),
    [listLimit, sortedFiltered]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const activeTab = statusTabs.find((tab) => tab.value === statusFiltro);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFiltro !== ALL) count++;
    if (tipoFilter !== ALL) count++;
    if (clienteFiltro !== ALL) count++;
    if (formaPagamentoFiltro !== ALL) count++;
    if (modoPagamentoFiltro !== ALL) count++;
    if (freteFiltro !== ALL) count++;
    if (orcamentistaFiltro !== ALL) count++;
    if (dataInicioFiltro) count++;
    if (dataFimFiltro) count++;
    if (valorMinFiltro) count++;
    if (valorMaxFiltro) count++;
    if (origemFiltro !== ALL) count++;
    return count;
  }, [
    clienteFiltro,
    dataFimFiltro,
    dataInicioFiltro,
    formaPagamentoFiltro,
    freteFiltro,
    modoPagamentoFiltro,
    orcamentistaFiltro,
    origemFiltro,
    statusFiltro,
    tipoFilter,
    valorMaxFiltro,
    valorMinFiltro,
  ]);

  const limparFiltros = () => {
    setSearch("");
    setStatusFiltro(ALL);
    setTipoFilter(ALL);
    setClienteFiltro(ALL);
    setFormaPagamentoFiltro(ALL);
    setModoPagamentoFiltro(ALL);
    setFreteFiltro(ALL);
    setOrcamentistaFiltro(ALL);
    setDataInicioFiltro("");
    setDataFimFiltro("");
    setValorMinFiltro("");
    setValorMaxFiltro("");
    setOrigemFiltro(ALL);
  };

  const countByStatus = (status: OrcamentoStatus) =>
    orcamentos.filter((orcamento) => orcamento.status === status).length;

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setFormOpen(true);
  };

  const openDetails = (orcamento: OrcamentoSupabase) => {
    setSelected(orcamento);
    setDetalhesOpen(true);
  };

  const openEdit = (orcamento: OrcamentoSupabase) => {
    setSelected(orcamento);
    setMode("edit");
    setFormOpen(true);
  };

  const abrirEmpresa = async (empresa: OrcamentoSupabase["empresa"]) => {
    if (!empresa) return;
    try {
      const empresaCompleta = await empresasService.buscarPorId(empresa.id);
      setEmpresaSelecionada(empresaCompleta);
      setEmpresaDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir empresa",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirEquipamento = async (
    equipamento: OrcamentoSupabase["equipamento"]
  ) => {
    if (!equipamento) return;
    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        equipamento.id
      );
      setEquipamentoSelecionado(equipamentoCompleto);
      setEquipamentoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAlterarStatusRapido = async (
    orcamento: OrcamentoSupabase,
    status: OrcamentoStatus
  ) => {
    if (status === orcamento.status) return;

    let aprovadoPor: string | undefined;
    let motivoReprovacao: string | undefined;

    if (status === "aprovado") {
      const value = window.prompt("Aprovado por:", "");
      if (value === null) return;
      aprovadoPor = value.trim() || undefined;
    }

    if (status === "reprovado") {
      const value = window.prompt("Informe o motivo da reprovacao:", "");
      if (value === null) return;
      motivoReprovacao = value.trim() || undefined;
    }

    if (status === "cancelado") {
      const confirmar = window.confirm(
        `Cancelar o orcamento nº ${orcamento.numero}?`
      );
      if (!confirmar) return;
    }

    if (status === "pendente" && orcamento.status !== "pendente") {
      const confirmar = window.confirm(
        `Marcar o orcamento nº ${orcamento.numero} como pendente?`
      );
      if (!confirmar) return;
    }

    try {
      await alterarStatus.mutateAsync({
        id: orcamento.id,
        status,
        extra: {
          aprovadoPor,
          motivoReprovacao,
        },
      });

      toast({
        title: "Status do orcamento atualizado.",
        description: `Orcamento nº ${orcamento.numero} alterado para ${statusLabel(
          status
        )}.${orcamento.ordem_servico_id ? " A OS vinculada foi atualizada." : ""}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Orcamentos"
        description="Gerencie os orcamentos de pecas e servicos"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Orcamento
        </Button>
      </PageHeader>

      <OrcamentoFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setSelected(null);
        }}
        mode={mode}
        orcamento={selected}
      />

      <OrcamentoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(value) => {
          setDetalhesOpen(value);
          if (!value) setSelected(null);
        }}
        orcamento={selected}
        onOpenEmpresa={abrirEmpresa}
        onOpenEquipamento={abrirEquipamento}
        onEditar={(orcamento) => {
          setDetalhesOpen(false);
          openEdit(orcamento);
        }}
        onAlterarStatus={handleAlterarStatusRapido}
      />

      <EmpresaDetalhesDialog
        open={empresaDialogOpen}
        onOpenChange={(value) => {
          setEmpresaDialogOpen(value);
          if (!value) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
      />

      <EquipamentoDetalhesDialog
        open={equipamentoDialogOpen}
        onOpenChange={(value) => {
          setEquipamentoDialogOpen(value);
          if (!value) setEquipamentoSelecionado(null);
        }}
        equipamento={equipamentoSelecionado}
      />

      <div className="flex flex-wrap gap-1 border-b mb-6">
        {statusTabs.map((tab) => {
          const active = statusFiltro === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFiltro(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {countByStatus(tab.value)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
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
              <Select
                value={statusFiltro}
                onValueChange={(value) =>
                  setStatusFiltro(value as OrcamentoStatus | typeof ALL)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os tipos</SelectItem>
                  <SelectItem value="servico">Servico</SelectItem>
                  <SelectItem value="pecas">Pecas</SelectItem>
                  <SelectItem value="pecas_servicos">
                    Pecas + Servicos
                  </SelectItem>
                </SelectContent>
              </Select>

              <SearchableSelect
                value={clienteFiltro === ALL ? "" : clienteFiltro}
                onValueChange={(value) => setClienteFiltro(value || ALL)}
                options={opts.clientes}
                placeholder="Cliente (todos)"
                emptyText="Nenhum cliente encontrado."
              />

              <SearchableSelect
                value={formaPagamentoFiltro === ALL ? "" : formaPagamentoFiltro}
                onValueChange={(value) => setFormaPagamentoFiltro(value || ALL)}
                options={opts.formasPagamento}
                placeholder="Forma de pagamento"
                emptyText="Nenhuma forma encontrada."
              />

              <SearchableSelect
                value={modoPagamentoFiltro === ALL ? "" : modoPagamentoFiltro}
                onValueChange={(value) => setModoPagamentoFiltro(value || ALL)}
                options={opts.modosPagamento}
                placeholder="Modo de pagamento"
                emptyText="Nenhum modo encontrado."
              />

              <SearchableSelect
                value={freteFiltro === ALL ? "" : freteFiltro}
                onValueChange={(value) => setFreteFiltro(value || ALL)}
                options={opts.fretes}
                placeholder="Frete (todos)"
                emptyText="Nenhum frete encontrado."
              />

              <SearchableSelect
                value={orcamentistaFiltro === ALL ? "" : orcamentistaFiltro}
                onValueChange={(value) => setOrcamentistaFiltro(value || ALL)}
                options={opts.orcamentistas}
                placeholder="Orcamentista (todos)"
                emptyText="Nenhum orcamentista encontrado."
              />

              <Select
                value={origemFiltro}
                onValueChange={(value) =>
                  setOrigemFiltro(value as typeof ALL | "com_os" | "avulso")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as origens</SelectItem>
                  <SelectItem value="com_os">Com OS vinculada</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dataInicioFiltro}
                onChange={(event) => setDataInicioFiltro(event.target.value)}
                title="Data inicial"
              />
              <Input
                type="date"
                value={dataFimFiltro}
                onChange={(event) => setDataFimFiltro(event.target.value)}
                title="Data final"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Valor minimo"
                value={valorMinFiltro}
                onChange={(event) => setValorMinFiltro(event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Valor maximo"
                value={valorMaxFiltro}
                onChange={(event) => setValorMaxFiltro(event.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              Orcamentos {activeTab?.label || ""}
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar numero, solicitante, OS, tipo ou status..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ListLimitSelect
                value={listLimit}
                onChange={setListLimit}
                total={sortedFiltered.length}
              />
              <Button variant="outline" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando orcamentos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar orcamentos
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
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Numero" sortField="numero" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Tipo" sortField="tipo" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Origem" sortField="origem" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Status" sortField="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Solicitante" sortField="cliente" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Identificacao" sortField="equipamento" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="OS" sortField="os" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Pecas" sortField="valor_pecas" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Servicos" sortField="valor_servicos" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Total" sortField="valor_total" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Forma pgto." sortField="forma_pagamento" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Orcamentista" sortField="orcamentista" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Data" sortField="data" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Validade" sortField="validade" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Acoes
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleOrcamentos.map((orcamento) => {
                  const empresa = getEmpresaNome(orcamento);
                  const identificacao =
                    orcamento.identificador ||
                    getEquipamentoLabel(orcamento.equipamento);

                  return (
                    <tr
                      key={orcamento.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openDetails(orcamento)}
                          className="text-primary hover:underline flex items-center gap-2"
                        >
                          <FileSignature className="w-4 h-4" />
                          {orcamento.numero}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        {tipoLabel(orcamento.tipo_orcamento)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {origemLabel(orcamento.origem)}
                      </td>
                      <td className="px-5 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={getStatusBadgeClass(orcamento.status)}
                              title="Clique para alterar o status"
                            >
                              {statusLabel(orcamento.status)}
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="start"
                            className="w-44 bg-popover"
                          >
                            {statusOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                disabled={
                                  option.value === orcamento.status ||
                                  alterarStatus.isPending
                                }
                                onClick={() =>
                                  handleAlterarStatusRapido(
                                    orcamento,
                                    option.value
                                  )
                                }
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {orcamento.empresa ? (
                          <button
                            type="button"
                            className="text-primary hover:underline font-medium text-left"
                            onClick={() => abrirEmpresa(orcamento.empresa)}
                          >
                            {empresa}
                          </button>
                        ) : (
                          empresa
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[280px]">
                        {orcamento.equipamento ? (
                          <button
                            type="button"
                            className="text-primary hover:underline text-left line-clamp-2"
                            onClick={() =>
                              abrirEquipamento(orcamento.equipamento)
                            }
                          >
                            {identificacao}
                          </button>
                        ) : (
                          <span className="line-clamp-2">{identificacao}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {orcamento.ordem_servico?.numero || "-"}
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {formatCurrency(orcamento.valor_pecas)}
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {formatCurrency(orcamento.valor_servicos)}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {formatCurrency(orcamento.valor_total)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {orcamento.forma_pagamento || "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {orcamento.responsavel_orcamentista || "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(orcamento.data_orcamento)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(orcamento.data_validade)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Acoes">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-popover"
                            >
                              <DropdownMenuItem
                                onClick={() => openDetails(orcamento)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEdit(orcamento)}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const orcamentoCompleto =
                                    await orcamentosService.buscarPorId(orcamento.id);
                                  await gerarPdfOrcamento(orcamentoCompleto);
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Gerar PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAlterarStatusRapido(orcamento, "pendente")
                                }
                              >
                                Marcar como Pendente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAlterarStatusRapido(orcamento, "aprovado")
                                }
                              >
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAlterarStatusRapido(orcamento, "reprovado")
                                }
                              >
                                Reprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAlterarStatusRapido(orcamento, "faturado")
                                }
                              >
                                Marcar como Faturado
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAlterarStatusRapido(orcamento, "cancelado")
                                }
                              >
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={15}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum orcamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orcamentos;

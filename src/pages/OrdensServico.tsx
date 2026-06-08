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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchableSelect from "@/components/SearchableSelect";
import SortableTableHeader from "@/components/SortableTableHeader";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import {
  useAlterarEstadoOrdemServico,
  useExcluirOrdemServico,
  useOrdensServico,
} from "@/hooks/useOrdensServico";
import { useEstadosOS } from "@/hooks/useCamposOS";
import {
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
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import ProtocoloEntregaDialog from "@/components/ProtocoloEntregaDialog";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";

const getEmpresaNome = (os: OrdemServicoSupabase) => {
  return os.empresa?.nome_fantasia || os.empresa?.nome || "Não informado";
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

const getChecklistPreventiva = (os: OrdemServicoSupabase) => {
  const checklist = os.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const isOSPreventiva = (os: OrdemServicoSupabase) =>
  getTipoServico(os).toLowerCase().includes("preventiva") ||
  (os.descricao_servico || "").toLowerCase().includes("preventiva") ||
  Boolean(getChecklistPreventiva(os));

const getEstado = (os: OrdemServicoSupabase) => {
  return os.estado_os?.nome || os.status_sistema || "Não informado";
};

const getTecnico = (os: OrdemServicoSupabase) => {
  return os.responsavel_texto || "—";
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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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

  const [hideClosed, setHideClosed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: ordensServico = [], isLoading, isError, error, refetch } =
    useOrdensServico();
  const { data: estadosOS = [] } = useEstadosOS();
  const alterarEstadoOS = useAlterarEstadoOrdemServico();
  const excluirOS = useExcluirOrdemServico();

  const emptyFilters = {
    estado: ALL,
    solicitante: ALL,
    tipoServico: ALL,
    responsavelTecnico: "",
    numero: "",
  };

  const [filters, setFilters] = useState(emptyFilters);

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

  const opts = useMemo(
    () => ({
      estado: uniq(ordensServico.map((os) => getEstado(os))),
      solicitante: uniq(ordensServico.map((os) => getEmpresaNome(os))),
      tipoServico: uniq(ordensServico.map((os) => getTipoServico(os))),
    }),
    [ordensServico]
  );

  const estadoOptions = useMemo(
    () => estadosOS.map((estado) => estado.nome),
    [estadosOS]
  );

  const matchesText = (val: string, q: string) =>
    !q.trim() || val.toLowerCase().includes(q.trim().toLowerCase());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return ordensServico.filter((os) => {
      const estado = getEstado(os);
      const solicitante = getEmpresaNome(os);
      const equipamento = getEquipamentoLabel(os);
      const tipoServico = getTipoServico(os);
      const tecnico = getTecnico(os);

      const matchSearch =
        !q ||
        os.numero.toLowerCase().includes(q) ||
        solicitante.toLowerCase().includes(q) ||
        equipamento.toLowerCase().includes(q) ||
        tipoServico.toLowerCase().includes(q) ||
        tecnico.toLowerCase().includes(q) ||
        (os.problema_relatado || "").toLowerCase().includes(q);

      const matchHide =
        !hideClosed ||
        !(
          os.status_sistema === "fechada" ||
          os.status_sistema === "cancelada" ||
          estado.toLowerCase().includes("fechada") ||
          estado.toLowerCase().includes("cancelada")
        );

      const matchAdv =
        (filters.estado === ALL || estado === filters.estado) &&
        (filters.solicitante === ALL || solicitante === filters.solicitante) &&
        (filters.tipoServico === ALL || tipoServico === filters.tipoServico) &&
        matchesText(tecnico, filters.responsavelTecnico) &&
        matchesText(os.numero, filters.numero);

      return matchSearch && matchHide && matchAdv;
    });
  }, [ordensServico, search, hideClosed, filters]);

  const sortGetters: Record<string, (item: OrdemServicoSupabase) => unknown> = {
    numero: (os) => os.numero,
    data: (os) => os.data_abertura || os.created_at,
    empresa: getEmpresaNome,
    equipamento: getEquipamentoLabel,
    estado: getEstado,
    tipo_os: getTipoServico,
    responsavel: getTecnico,
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

    return n;
  }, [filters]);

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setOpen(true);
  };

  const openDetails = (os: OrdemServicoSupabase) => {
    setDetalhesOS(os);
    setDetalhesOpen(true);
  };

  const openView = (os: OrdemServicoSupabase) => {
    openDetails(os);
  };

  const openEdit = (os: OrdemServicoSupabase) => {
    setSelected(os);
    setMode("edit");
    setOpen(true);
  };

  const openEntrega = (os: OrdemServicoSupabase) => {
    setOsEntrega(os);
    setEntregaOpen(true);
  };

  const openOrcamento = (os: OrdemServicoSupabase) => {
    setOsOrcamento(os);
    setOrcamentoOpen(true);
  };

  const openChecklist = (os: OrdemServicoSupabase) => {
    setOsChecklist(os);
    setChecklistOpen(true);
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
      await gerarPdfOrdemServico(osCompleta);
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
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, equipamento ou solicitante..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
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
              Atualizar
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
                {sortedFiltered.map((os) => {
                  const estado = getEstado(os);
                  const solicitante = getEmpresaNome(os);
                  const equipamento = getEquipamentoLabel(os);
                  const tecnico = getTecnico(os);
                  const tipoServico = getTipoServico(os);
                  const preventiva = isOSPreventiva(os);
                  const checklist = getChecklistPreventiva(os);

                  return (
                    <tr
                      key={os.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
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
                                  {checklist ? "Editar checklist" : "Acessar checklist"}
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

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma ordem de serviço cadastrada no Supabase.
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

export default OrdensServico;

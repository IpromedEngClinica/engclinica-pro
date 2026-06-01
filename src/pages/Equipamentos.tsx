import {
  Cpu,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  ClipboardList,
  CalendarCheck,
  FileWarning,
  PackageCheck,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useNavigate } from "react-router-dom";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import {
  EquipamentoSupabase,
  equipamentosService,
  StatusEquipamentoFiltro,
} from "@/services/equipamentosService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import EquipamentoFormDialog, {
  DialogMode,
} from "@/components/EquipamentoFormDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import ProtocoloRecolhimentoDialog from "@/components/ProtocoloRecolhimentoDialog";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import LaudoObsolescenciaFormDialog from "@/components/LaudoObsolescenciaFormDialog";
import { procedimentosPreventivaService } from "@/services/procedimentosPreventivaService";
import type { ProcedimentoPreventiva } from "@/services/procedimentosPreventivaService";
import OrdemServicoFormDialog, {
  DialogMode as OrdemServicoDialogMode,
} from "@/components/OrdemServicoFormDialog";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";

const getTipoEquipamento = (equipamento: EquipamentoSupabase) => {
  return (
    equipamento.tipo_equipamento?.nome ||
    equipamento.tipo_texto ||
    "Não informado"
  );
};

const getEmpresaNome = (equipamento: EquipamentoSupabase) => {
  return (
    equipamento.empresa?.nome_fantasia ||
    equipamento.empresa?.nome ||
    "Não informado"
  );
};

const getEquipamentoStatusLabel = (equipamento: EquipamentoSupabase) => {
  if (equipamento.ativo === false) {
    return "Desativado";
  }

  return equipamento.status || "Ativo";
};

const getEquipamentoStatusBadge = (equipamento: EquipamentoSupabase) => {
  if (equipamento.ativo === false) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Desativado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-green-50 text-green-700 border-green-200"
    >
      {getEquipamentoStatusLabel(equipamento)}
    </Badge>
  );
};

const Equipamentos = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] =
    useState<StatusEquipamentoFiltro>("ativos");
  const [sortKey, setSortKey] = useState("tipo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<EquipamentoSupabase | null>(null);
  const [equipamentoDetalhes, setEquipamentoDetalhes] =
    useState<EquipamentoSupabase | null>(null);
  const [recolhimentoOpen, setRecolhimentoOpen] = useState(false);
  const [equipamentoRecolhimento, setEquipamentoRecolhimento] =
    useState<EquipamentoSupabase | null>(null);
  const [osOpen, setOsOpen] = useState(false);
  const [osMode, setOsMode] = useState<OrdemServicoDialogMode>("create");
  const [equipamentoParaOS, setEquipamentoParaOS] =
    useState<EquipamentoSupabase | null>(null);
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [empresaParaNovoEquipamento, setEmpresaParaNovoEquipamento] =
    useState<EmpresaSupabase | null>(null);
  const [preventivaOpen, setPreventivaOpen] = useState(false);
  const [equipamentoPreventiva, setEquipamentoPreventiva] =
    useState<EquipamentoSupabase | null>(null);
  const [procedimentoPreventiva, setProcedimentoPreventiva] =
    useState<ProcedimentoPreventiva | null>(null);
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [equipamentoLaudo, setEquipamentoLaudo] =
    useState<EquipamentoSupabase | null>(null);

  const { data: equipamentos = [], isLoading, isError, error, refetch } =
    useEquipamentos({ statusFiltro });

  const [filtersOpen, setFiltersOpen] = useState(false);

  const emptyFilters = {
    estado: ALL,
    proprietario: ALL,
    tipo: ALL,
    fabricante: ALL,
    modelo: "",
    tag: "",
    serie: "",
    patrimonio: "",
    setor: ALL,
  };

  const [filters, setFilters] = useState(emptyFilters);

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

  const opts = useMemo(
    () => ({
      estado: uniq(equipamentos.map((e) => e.status)),
      proprietario: uniq(equipamentos.map((e) => getEmpresaNome(e))),
      tipo: uniq(equipamentos.map((e) => getTipoEquipamento(e))),
      fabricante: uniq(equipamentos.map((e) => e.fabricante || "")),
      setor: uniq(equipamentos.map((e) => e.setor || "")),
    }),
    [equipamentos]
  );

  const matchesText = (val: string | null, q: string) =>
    !q.trim() || (val || "").toLowerCase().includes(q.trim().toLowerCase());

  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    return equipamentos.filter((e) => {
      const tipo = getTipoEquipamento(e);
      const empresa = getEmpresaNome(e);

      const matchesGeneral =
        !s ||
        tipo.toLowerCase().includes(s) ||
        empresa.toLowerCase().includes(s) ||
        (e.fabricante || "").toLowerCase().includes(s) ||
        (e.tag || "").toLowerCase().includes(s) ||
        (e.numero_serie || "").toLowerCase().includes(s) ||
        (e.patrimonio || "").toLowerCase().includes(s) ||
        (e.modelo || "").toLowerCase().includes(s);

      return (
        matchesGeneral &&
        (filters.estado === ALL || e.status === filters.estado) &&
        (filters.proprietario === ALL || empresa === filters.proprietario) &&
        (filters.tipo === ALL || tipo === filters.tipo) &&
        (filters.fabricante === ALL || e.fabricante === filters.fabricante) &&
        (filters.setor === ALL || e.setor === filters.setor) &&
        matchesText(e.modelo, filters.modelo) &&
        matchesText(e.tag, filters.tag) &&
        matchesText(e.numero_serie, filters.serie) &&
        matchesText(e.patrimonio, filters.patrimonio)
      );
    });
  }, [equipamentos, filters, search]);

  const sortGetters: Record<string, (item: EquipamentoSupabase) => unknown> = {
    tipo: getTipoEquipamento,
    status: getEquipamentoStatusLabel,
    empresa: getEmpresaNome,
    modelo: (e) => e.modelo,
    fabricante: (e) => e.fabricante,
    tag: (e) => e.tag,
    numero_serie: (e) => e.numero_serie,
    patrimonio: (e) => e.patrimonio,
    setor: (e) => e.setor,
  };

  const sortedFiltered = useMemo(
    () =>
      sortByValue(
        filtered,
        sortGetters[sortKey] || sortGetters.tipo,
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
    if (filters.proprietario !== ALL) n++;
    if (filters.tipo !== ALL) n++;
    if (filters.fabricante !== ALL) n++;
    if (filters.setor !== ALL) n++;
    if (statusFiltro !== "ativos") n++;

    (["modelo", "tag", "serie", "patrimonio"] as const).forEach((k) => {
      if (filters[k].trim()) n++;
    });

    return n;
  }, [filters, statusFiltro]);

  const openCreate = () => {
    setSelected(null);
    setEmpresaParaNovoEquipamento(null);
    setMode("create");
    setDialogOpen(true);
  };

  const openCreateForEmpresa = (empresa: EmpresaSupabase) => {
    setSelected(null);
    setEmpresaParaNovoEquipamento(empresa);
    setMode("create");
    setDialogOpen(true);
  };

  const openView = async (equipamento: EquipamentoSupabase) => {
    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        equipamento.id
      );
      setEquipamentoDetalhes(equipamentoCompleto);
      setDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openEdit = (equipamento: EquipamentoSupabase) => {
    setSelected(equipamento);
    setMode("edit");
    setDialogOpen(true);
  };

  const openRecolhimento = (equipamento: EquipamentoSupabase) => {
    if (equipamento.ativo === false) {
      toast({
        title: "Equipamento desativado.",
        description:
          "Nao e possivel criar protocolo de recolhimento para equipamento desativado.",
        variant: "destructive",
      });
      return;
    }

    setEquipamentoRecolhimento(equipamento);
    setRecolhimentoOpen(true);
  };

  const openCriarOS = (equipamento: EquipamentoSupabase) => {
    if (equipamento.ativo === false) {
      toast({
        title: "Equipamento desativado.",
        description:
          "Nao e possivel criar ordem de servico para equipamento desativado.",
        variant: "destructive",
      });
      return;
    }

    setEquipamentoParaOS(equipamento);
    setOsMode("create");
    setOsOpen(true);
  };

  const openCriarPreventiva = async (equipamento: EquipamentoSupabase) => {
    if (equipamento.ativo === false) {
      toast({
        title: "Equipamento desativado.",
        description:
          "Nao e possivel criar preventiva para equipamento desativado.",
        variant: "destructive",
      });
      return;
    }

    if (!equipamento.tipo_equipamento_id) {
      toast({
        title: "Tipo de equipamento nao informado.",
        description:
          "Cadastre o tipo de equipamento antes de criar a preventiva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const procedimento =
        await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(
          equipamento.tipo_equipamento_id
        );

      if (!procedimento) {
        toast({
          title: "Nenhum procedimento preventivo cadastrado.",
          description:
            "Cadastre um procedimento para este tipo de equipamento.",
          action: (
            <ToastAction
              altText="Cadastrar procedimento"
              onClick={() =>
                navigate(
                  `/procedimentos?tipoEquipamentoId=${equipamento.tipo_equipamento_id}`
                )
              }
            >
              Cadastrar
            </ToastAction>
          ),
        });
        return;
      }

      setEquipamentoPreventiva(equipamento);
      setProcedimentoPreventiva(procedimento);
      setPreventivaOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao buscar procedimento preventivo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openCriarLaudo = (equipamento: EquipamentoSupabase) => {
    if (!equipamento.ativo) {
      toast({
        title: "Equipamento ja esta desativado.",
        description: "Consulte os laudos existentes na tela de laudos.",
      });
      return;
    }

    setEquipamentoLaudo(equipamento);
    setLaudoOpen(true);
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

  const featurePending = (label: string) => {
    toast({
      title: label,
      description: "Funcionalidade será migrada para Supabase na próxima etapa.",
    });
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Equipamentos"
        description="Gerencie os equipamentos cadastrados no Supabase"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
        </Button>
      </PageHeader>

      <EquipamentoFormDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) setEmpresaParaNovoEquipamento(null);
        }}
        mode={mode}
        equipamento={selected}
        empresaInicialId={empresaParaNovoEquipamento?.id}
        empresaInicial={empresaParaNovoEquipamento}
        onOpenEmpresa={openEmpresaDetalhes}
      />

      <EquipamentoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(value) => {
          setDetalhesOpen(value);
          if (!value) setEquipamentoDetalhes(null);
        }}
        equipamento={equipamentoDetalhes}
        onEditar={(equipamento) => {
          setDetalhesOpen(false);
          setEquipamentoDetalhes(null);
          openEdit(equipamento);
        }}
        onCriarOS={openCriarOS}
        onCriarPreventiva={openCriarPreventiva}
        onCriarProtocoloRecolhimento={openRecolhimento}
        onCriarLaudo={openCriarLaudo}
      />

      <EmpresaDetalhesDialog
        open={empresaDetalhesOpen}
        onOpenChange={(value) => {
          setEmpresaDetalhesOpen(value);
          if (!value) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
        onCriarEquipamento={openCreateForEmpresa}
      />

      <ProtocoloRecolhimentoDialog
        open={recolhimentoOpen}
        onOpenChange={(value) => {
          setRecolhimentoOpen(value);
          if (!value) setEquipamentoRecolhimento(null);
        }}
        equipamento={equipamentoRecolhimento}
      />

      <PreventivaChecklistDialog
        open={preventivaOpen}
        onOpenChange={(value) => {
          setPreventivaOpen(value);
          if (!value) {
            setEquipamentoPreventiva(null);
            setProcedimentoPreventiva(null);
          }
        }}
        equipamento={equipamentoPreventiva}
        procedimento={procedimentoPreventiva}
      />

      <OrdemServicoFormDialog
        open={osOpen}
        onOpenChange={(value) => {
          setOsOpen(value);
          if (!value) setEquipamentoParaOS(null);
        }}
        mode={osMode}
        fromEquipamento={
          equipamentoParaOS
            ? {
                id: equipamentoParaOS.id,
                empresaId: equipamentoParaOS.empresa_id,
              }
            : null
        }
      />

      <LaudoObsolescenciaFormDialog
        open={laudoOpen}
        onOpenChange={(value) => {
          setLaudoOpen(value);
          if (!value) setEquipamentoLaudo(null);
        }}
        initialEmpresaId={equipamentoLaudo?.empresa_id}
        initialEquipamentoId={equipamentoLaudo?.id}
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
              <Select
                value={statusFiltro}
                onValueChange={(value) =>
                  setStatusFiltro(value as StatusEquipamentoFiltro)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status (ativos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Somente ativos</SelectItem>
                  <SelectItem value="todos">Ativos e desativados</SelectItem>
                  <SelectItem value="desativados">Somente desativados</SelectItem>
                </SelectContent>
              </Select>

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
                value={filters.proprietario === ALL ? "" : filters.proprietario}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, proprietario: v || ALL }))
                }
                options={opts.proprietario}
                placeholder="Proprietário (todos)"
                emptyText="Nenhum proprietário encontrado."
              />

              <SearchableSelect
                value={filters.tipo === ALL ? "" : filters.tipo}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, tipo: v || ALL }))
                }
                options={opts.tipo}
                placeholder="Tipo (todos)"
                emptyText="Nenhum tipo encontrado."
              />

              <SearchableSelect
                value={filters.fabricante === ALL ? "" : filters.fabricante}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, fabricante: v || ALL }))
                }
                options={opts.fabricante}
                placeholder="Fabricante (todos)"
                emptyText="Nenhum fabricante encontrado."
              />

              <SearchableSelect
                value={filters.setor === ALL ? "" : filters.setor}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, setor: v || ALL }))
                }
                options={opts.setor}
                placeholder="Setor (todos)"
                emptyText="Nenhum setor encontrado."
              />

              <Input
                placeholder="Identificação (TAG)"
                value={filters.tag}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, tag: e.target.value }))
                }
              />

              <Input
                placeholder="Modelo"
                value={filters.modelo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, modelo: e.target.value }))
                }
              />

              <Input
                placeholder="Número de Série"
                value={filters.serie}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, serie: e.target.value }))
                }
              />

              <Input
                placeholder="Patrimônio"
                value={filters.patrimonio}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, patrimonio: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(emptyFilters);
                  setStatusFiltro("ativos");
                }}
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
              placeholder="Buscar equipamento, empresa, TAG..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando equipamentos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar equipamentos
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
                    <SortableTableHeader label="Tipo" sortField="tipo" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Status" sortField="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Proprietario" sortField="empresa" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Modelo" sortField="modelo" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Fabricante" sortField="fabricante" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="TAG" sortField="tag" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="N. Serie" sortField="numero_serie" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Patrimonio" sortField="patrimonio" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Setor" sortField="setor" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedFiltered.map((e) => {
                  const tipo = getTipoEquipamento(e);
                  const empresa = getEmpresaNome(e);
                  const isAtivo = e.ativo !== false;

                  return (
                    <tr
                      key={e.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        <button
                          type="button"
                          onClick={() => openView(e)}
                          className="text-primary hover:underline flex items-center gap-2"
                        >
                          <Cpu className="w-4 h-4" /> {tipo}
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        {getEquipamentoStatusBadge(e)}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {e.empresa ? (
                          <button
                            type="button"
                            className="text-primary hover:underline font-medium text-left"
                            onClick={() => openEmpresaDetalhes(e.empresa)}
                          >
                            {empresa}
                          </button>
                        ) : (
                          empresa
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.modelo || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.fabricante || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.tag || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.numero_serie || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.patrimonio || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.setor || "—"}
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
                              className="w-56 bg-popover"
                            >
                              <DropdownMenuItem onClick={() => openView(e)}>
                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => openEdit(e)}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                disabled={!isAtivo}
                                onClick={() => openCriarOS(e)}
                              >
                                <ClipboardList className="w-4 h-4 mr-2" /> Criar
                                Ordem de Serviço
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!isAtivo}
                                onClick={() => openRecolhimento(e)}
                              >
                                <PackageCheck className="w-4 h-4 mr-2" /> Criar
                                Protocolo de Recolhimento
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!isAtivo}
                                onClick={() => openCriarPreventiva(e)}
                              >
                                <CalendarCheck className="w-4 h-4 mr-2" /> Criar
                                Preventiva
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!isAtivo}
                                onClick={() => openCriarLaudo(e)}
                              >
                                <FileWarning className="w-4 h-4 mr-2" /> Criar
                                Laudo de Obsolescência
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
                      colSpan={10}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum equipamento encontrado com os filtros aplicados.
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

export default Equipamentos;

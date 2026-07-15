import {
  AlertCircle,
  ChevronUp,
  ChevronsUpDown,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  useAtualizarRelatorioVisitaExterna,
  useAtualizarRelatorioControlePatrimonial,
  useCriarRelatorioVisitaExterna,
  useCriarRelatorioControlePatrimonial,
  useRelatorios,
  useRelatoriosEquipamentosOpcoes,
} from "@/hooks/useRelatorios";
import { toast } from "@/hooks/use-toast";
import {
  FILTROS_CONTROLE_PATRIMONIAL_PADRAO,
  FILTROS_VISITA_EXTERNA_PADRAO,
  getTipoEquipamentoRelatorio,
  relatoriosService,
  type RelatorioEquipamentoOpcao,
  type RelatorioControlePatrimonialFiltros,
  type RelatorioTipo,
  type RelatorioRegistro,
  type RelatorioVisitaExternaFiltros,
} from "@/services/relatoriosService";
import { gerarPdfControlePatrimonial } from "@/utils/gerarPdfControlePatrimonial";
import { gerarPdfVisitaExterna } from "@/utils/gerarPdfVisitaExterna";

const ALL_VALUE = "__todos__";

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const getEmpresaNome = (empresa?: {
  id?: string;
  nome?: string | null;
  nome_fantasia?: string | null;
}) => empresa?.nome || empresa?.nome_fantasia || "Sem nome";

const uniqueSorted = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

const filterEquipamentosByEmpresas = (
  equipamentos: RelatorioEquipamentoOpcao[],
  empresaIds: string[]
) => {
  const empresaSet = new Set(empresaIds);
  return empresaSet.size
    ? equipamentos.filter((equipamento) => empresaSet.has(equipamento.empresa_id))
    : equipamentos;
};

const filterEquipamentosByTipos = (
  equipamentos: RelatorioEquipamentoOpcao[],
  tipos: string[]
) => {
  const tipoSet = new Set(tipos);
  return tipoSet.size
    ? equipamentos.filter((equipamento) =>
        tipoSet.has(getTipoEquipamentoRelatorio(equipamento))
      )
    : equipamentos;
};

const filterEquipamentosBySetores = (
  equipamentos: RelatorioEquipamentoOpcao[],
  setores: string[]
) => {
  const setorSet = new Set(setores);
  return setorSet.size
    ? equipamentos.filter((equipamento) =>
        setorSet.has(equipamento.setor || "Sem setor")
      )
    : equipamentos;
};

const getStatusFiltroEquipamento = (equipamento: RelatorioEquipamentoOpcao) =>
  equipamento.ativo === false ? "Desativado" : equipamento.status || "Ativo";

const SelectField = ({
  disabled,
  label,
  includeBlank = true,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  includeBlank?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) => (
  <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
    <Label className="text-sm font-semibold text-foreground">{label}*</Label>
    <Select disabled={disabled} value={value || ALL_VALUE} onValueChange={onChange}>
      <SelectTrigger className="h-10 bg-background shadow-sm">
        <SelectValue placeholder="------" />
      </SelectTrigger>
      <SelectContent>
        {includeBlank && <SelectItem value={ALL_VALUE}>------</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const SearchableMultiSelectField = ({
  disabled,
  label,
  onChange,
  options,
  selectAllAction,
  values,
}: {
  disabled?: boolean;
  label: string;
  onChange: (values: string[]) => void;
  options: Array<{ label: string; value: string }>;
  selectAllAction?: boolean;
  values: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedValues = new Set(values);
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectedLabels = options
    .filter((option) => selectedValues.has(option.value))
    .map((option) => option.label);

  const toggle = (value: string, checked: boolean) => {
    onChange(
      checked
        ? uniqueSorted([...values, value])
        : values.filter((item) => item !== value)
    );
  };

  const displayValue = () => {
    if (!values.length || (options.length > 0 && values.length >= options.length)) {
      return "Todos";
    }
    if (values.length === 1) return selectedLabels[0] || "1 selecionado";
    return `${values.length} selecionados`;
  };

  return (
    <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <Label className="text-sm font-semibold text-foreground">{label}*</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-10 justify-between bg-background px-3 font-normal shadow-sm"
          >
            <span className="truncate">
              {displayValue()}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}...`}
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
              onClick={() => onChange([])}
            >
              Todos
            </button>
            {selectAllAction && options.length > 0 && (
              <button
                type="button"
                className="w-full rounded-sm px-2 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
                onClick={() => onChange([])}
              >
                Selecionar todos
              </button>
            )}
            {filteredOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selectedValues.has(option.value)}
                  onCheckedChange={(checked) =>
                    toggle(option.value, checked === true)
                  }
                />
                {option.label}
              </label>
            ))}
            {!filteredOptions.length && (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const Relatorios = () => {
  const [titulo, setTitulo] = useState("Controle patrimonial");
  const [tipoRelatorio, setTipoRelatorio] =
    useState<RelatorioTipo>("controle_patrimonial");
  const [filtros, setFiltros] = useState<RelatorioControlePatrimonialFiltros>(
    FILTROS_CONTROLE_PATRIMONIAL_PADRAO
  );
  const [filtrosVisita, setFiltrosVisita] =
    useState<RelatorioVisitaExternaFiltros>(FILTROS_VISITA_EXTERNA_PADRAO);
  const [editing, setEditing] = useState<RelatorioRegistro | null>(null);
  const [gerandoId, setGerandoId] = useState<string | null>(null);

  const { data: empresas = [], isLoading: empresasLoading } = useEmpresas({
    statusFiltro: "ativas",
  });
  const empresaIdsParaOpcoes =
    tipoRelatorio === "visita_externa"
      ? filtrosVisita.empresaIds
      : filtros.empresaIds;
  const { data: equipamentos = [], isLoading: equipamentosLoading } =
    useRelatoriosEquipamentosOpcoes(empresaIdsParaOpcoes);
  const {
    data: relatorios = [],
    isLoading: relatoriosLoading,
    isError,
    error,
    refetch,
  } = useRelatorios();
  const criarRelatorio = useCriarRelatorioControlePatrimonial();
  const atualizarRelatorio = useAtualizarRelatorioControlePatrimonial();
  const criarRelatorioVisita = useCriarRelatorioVisitaExterna();
  const atualizarRelatorioVisita = useAtualizarRelatorioVisitaExterna();

  const equipamentosFiltradosPorEmpresa = useMemo(
    () => filterEquipamentosByEmpresas(equipamentos, filtros.empresaIds),
    [equipamentos, filtros.empresaIds]
  );

  const tipoOptions = useMemo(
    () =>
      uniqueSorted(
        equipamentosFiltradosPorEmpresa.map((equipamento) =>
          getTipoEquipamentoRelatorio(equipamento)
        )
      ),
    [equipamentosFiltradosPorEmpresa]
  );

  const equipamentosFiltradosPorTipo = useMemo(
    () =>
      filterEquipamentosByTipos(
        equipamentosFiltradosPorEmpresa,
        filtros.tipoEquipamentoLabels
      ),
    [equipamentosFiltradosPorEmpresa, filtros.tipoEquipamentoLabels]
  );

  const statusOptions = useMemo(
    () =>
      uniqueSorted(
        equipamentosFiltradosPorTipo.map(
          (equipamento) => getStatusFiltroEquipamento(equipamento)
        )
      ),
    [equipamentosFiltradosPorTipo]
  );

  const quantidadePrevista = useMemo(() => {
    const statusSet = new Set(filtros.status);
    return equipamentosFiltradosPorTipo.filter((equipamento) =>
      statusSet.size ? statusSet.has(getStatusFiltroEquipamento(equipamento)) : true
    ).length;
  }, [equipamentosFiltradosPorTipo, filtros.status]);

  const visitaEquipamentosPorEmpresa = useMemo(
    () => filterEquipamentosByEmpresas(equipamentos, filtrosVisita.empresaIds),
    [equipamentos, filtrosVisita.empresaIds]
  );

  const visitaTipoOptions = useMemo(
    () =>
      uniqueSorted(
        visitaEquipamentosPorEmpresa.map((equipamento) =>
          getTipoEquipamentoRelatorio(equipamento)
        )
      ),
    [visitaEquipamentosPorEmpresa]
  );

  const visitaEquipamentosPorTipo = useMemo(
    () =>
      filterEquipamentosByTipos(
        visitaEquipamentosPorEmpresa,
        filtrosVisita.tipoEquipamentoLabels
      ),
    [visitaEquipamentosPorEmpresa, filtrosVisita.tipoEquipamentoLabels]
  );

  const visitaSetorOptions = useMemo(
    () =>
      uniqueSorted(
        visitaEquipamentosPorTipo.map(
          (equipamento) => equipamento.setor || "Sem setor"
        )
      ),
    [visitaEquipamentosPorTipo]
  );

  const visitaEquipamentosPorSetor = useMemo(
    () =>
      filterEquipamentosBySetores(
        visitaEquipamentosPorTipo,
        filtrosVisita.setorLabels
      ),
    [visitaEquipamentosPorTipo, filtrosVisita.setorLabels]
  );

  const quantidadePrevistaVisita = visitaEquipamentosPorSetor.length;
  const filtrosEquipamentosAtivos =
    tipoRelatorio === "visita_externa"
      ? filtrosVisita.tipoEquipamentoLabels.length > 0 ||
        filtrosVisita.setorLabels.length > 0
      : filtros.tipoEquipamentoLabels.length > 0 || filtros.status.length > 0;

  useEffect(() => {
    setFiltros((current) => ({
      ...current,
      tipoEquipamentoLabels:
        tipoOptions.length > 0 &&
        current.tipoEquipamentoLabels.length >= tipoOptions.length
          ? []
          : current.tipoEquipamentoLabels.filter((tipo) =>
              tipoOptions.includes(tipo)
            ),
    }));
  }, [tipoOptions]);

  useEffect(() => {
    setFiltros((current) => ({
      ...current,
      status:
        statusOptions.length > 0 && current.status.length >= statusOptions.length
          ? []
          : current.status.filter((status) => statusOptions.includes(status)),
    }));
  }, [statusOptions]);

  useEffect(() => {
    setFiltrosVisita((current) => ({
      ...current,
      tipoEquipamentoLabels:
        visitaTipoOptions.length > 0 &&
        current.tipoEquipamentoLabels.length >= visitaTipoOptions.length
          ? []
          : current.tipoEquipamentoLabels.filter((tipo) =>
              visitaTipoOptions.includes(tipo)
            ),
    }));
  }, [visitaTipoOptions]);

  useEffect(() => {
    setFiltrosVisita((current) => ({
      ...current,
      setorLabels:
        visitaSetorOptions.length > 0 &&
        current.setorLabels.length >= visitaSetorOptions.length
          ? []
          : current.setorLabels.filter((setor) =>
              visitaSetorOptions.includes(setor)
            ),
    }));
  }, [visitaSetorOptions]);

  const resetForm = () => {
    setTitulo(
      tipoRelatorio === "visita_externa"
        ? "Visita externa"
        : "Controle patrimonial"
    );
    setFiltros(FILTROS_CONTROLE_PATRIMONIAL_PADRAO);
    setFiltrosVisita(FILTROS_VISITA_EXTERNA_PADRAO);
    setEditing(null);
  };

  const handleTipoRelatorioChange = (value: string) => {
    const nextTipo = value as RelatorioTipo;
    setTipoRelatorio(nextTipo);
    setTitulo(
      nextTipo === "visita_externa" ? "Visita externa" : "Controle patrimonial"
    );
    setEditing(null);
  };

  const setResumo = (value: string) => {
    setFiltros((current) => ({
      ...current,
      incluirResumo: value !== "nao",
    }));
  };

  const setEmpresas = (empresaIds: string[]) => {
    setFiltros((current) => ({
      ...current,
      empresaIds,
      tipoEquipamentoLabels: [],
      status: [],
    }));
  };

  const setTipos = (tipoEquipamentoLabels: string[]) => {
    const todosSelecionados =
      tipoOptions.length > 0 && tipoEquipamentoLabels.length >= tipoOptions.length;
    setFiltros((current) => ({
      ...current,
      tipoEquipamentoLabels: todosSelecionados ? [] : tipoEquipamentoLabels,
      status: [],
    }));
  };

  const setStatusList = (status: string[]) => {
    const todosSelecionados =
      statusOptions.length > 0 && status.length >= statusOptions.length;
    setFiltros((current) => ({
      ...current,
      status: todosSelecionados ? [] : status,
    }));
  };

  const limparFiltrosEquipamentos = () => {
    if (tipoRelatorio === "visita_externa") {
      setFiltrosVisita((current) => ({
        ...current,
        tipoEquipamentoLabels: [],
        setorLabels: [],
      }));
      return;
    }

    setFiltros((current) => ({
      ...current,
      tipoEquipamentoLabels: [],
      status: [],
    }));
  };

  const setVisitaEmpresas = (empresaIds: string[]) => {
    setFiltrosVisita((current) => ({
      ...current,
      empresaIds,
      tipoEquipamentoLabels: [],
      setorLabels: [],
    }));
  };

  const setVisitaTipos = (tipoEquipamentoLabels: string[]) => {
    const todosSelecionados =
      visitaTipoOptions.length > 0 &&
      tipoEquipamentoLabels.length >= visitaTipoOptions.length;
    setFiltrosVisita((current) => ({
      ...current,
      tipoEquipamentoLabels: todosSelecionados ? [] : tipoEquipamentoLabels,
      setorLabels: [],
    }));
  };

  const setVisitaSetores = (setorLabels: string[]) => {
    const todosSelecionados =
      visitaSetorOptions.length > 0 &&
      setorLabels.length >= visitaSetorOptions.length;
    setFiltrosVisita((current) => ({
      ...current,
      setorLabels: todosSelecionados ? [] : setorLabels,
    }));
  };

  const setVisitaSepararPorSetor = (value: string) => {
    setFiltrosVisita((current) => ({
      ...current,
      separarPorSetor: value !== "nao",
    }));
  };

  const gerarPdf = async (relatorio: RelatorioRegistro) => {
    setGerandoId(relatorio.id);
    try {
      if (relatorio.tipo === "visita_externa") {
        const dados = await relatoriosService.buscarDadosVisitaExterna(relatorio);
        await gerarPdfVisitaExterna(dados);
      } else {
        const dados = await relatoriosService.buscarDadosControlePatrimonial(
          relatorio
        );
        await gerarPdfControlePatrimonial(dados);
      }
      toast({ title: "PDF gerado." });
    } catch (error) {
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setGerandoId(null);
    }
  };

  const handleSalvar = async () => {
    try {
      if (tipoRelatorio === "visita_externa") {
        const input = { titulo, filtros: filtrosVisita };
        if (editing) {
          await atualizarRelatorioVisita.mutateAsync({
            id: editing.id,
            input,
          });
        } else {
          await criarRelatorioVisita.mutateAsync(input);
        }
      } else {
        const input = { titulo, filtros };
        if (editing) {
          await atualizarRelatorio.mutateAsync({ id: editing.id, input });
        } else {
          await criarRelatorio.mutateAsync(input);
        }
      }

      toast({
        title: editing ? "Relatório atualizado." : "Relatório arquivado.",
        description: "Gere o PDF pela tabela de relatórios arquivados.",
      });
      resetForm();
      await refetch();
    } catch (error) {
      toast({
        title: "Erro ao salvar relatório",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleEditar = (relatorio: RelatorioRegistro) => {
    setEditing(relatorio);
    setTipoRelatorio(relatorio.tipo);
    setTitulo(relatorio.titulo);
    if (relatorio.tipo === "visita_externa") {
      setFiltrosVisita(relatorio.filtros as RelatorioVisitaExternaFiltros);
    } else {
      setFiltros(relatorio.filtros as RelatorioControlePatrimonialFiltros);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saving =
    criarRelatorio.isPending ||
    atualizarRelatorio.isPending ||
    criarRelatorioVisita.isPending ||
    atualizarRelatorioVisita.isPending;

  const empresaOptions = empresas.map((empresa) => ({
    value: empresa.id,
    label: getEmpresaNome(empresa),
  }));

  const getEmpresaFiltroLabel = (relatorio: RelatorioRegistro) => {
    const empresaIds = relatorio.filtros.empresaIds || [];
    if (!empresaIds.length) return "Todas";
    if (empresaIds.length > 1) return `${empresaIds.length} empresas`;
    return getEmpresaNome(
      empresas.find((empresa) => empresa.id === empresaIds[0])
    );
  };

  const getListFiltroLabel = (values: string[], allLabel: string) => {
    if (!values.length) return allLabel;
    if (values.length === 1) return values[0];
    return `${values.length} selecionados`;
  };

  const getTipoRelatorioLabel = (tipo: RelatorioTipo) =>
    tipo === "visita_externa" ? "Visita Externa" : "Controle Patrimonial";

  const getFiltroResumoLabel = (relatorio: RelatorioRegistro) => {
    if (relatorio.tipo === "visita_externa") {
      const filtrosRelatorio = relatorio.filtros as RelatorioVisitaExternaFiltros;
      return [
        getListFiltroLabel(filtrosRelatorio.tipoEquipamentoLabels, "Todos tipos"),
        getListFiltroLabel(filtrosRelatorio.setorLabels, "Todos setores"),
        filtrosRelatorio.separarPorSetor ? "Separado por setor" : "Lista única",
      ].join(" | ");
    }

    const filtrosRelatorio =
      relatorio.filtros as RelatorioControlePatrimonialFiltros;
    return [
      getListFiltroLabel(filtrosRelatorio.tipoEquipamentoLabels, "Todos tipos"),
      getListFiltroLabel(filtrosRelatorio.status, "Todos estados"),
    ].join(" | ");
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Relatórios"
        description="Configure os filtros, arquive o relatório e gere o PDF pela tabela."
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      <div className="mb-6">
        <div className="inline-flex overflow-hidden rounded-t-md bg-teal-600 text-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Search className="h-4 w-4" />
            Filtros
          </div>
          <div className="flex items-center border-l border-white/20 px-3">
            <ChevronUp className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-b-lg rounded-tr-lg border bg-card p-5 shadow-sm">
          <div className="mb-5 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_180px] md:items-end">
            <div className="md:col-span-2">
              <Label
                htmlFor="relatorio-titulo"
                className="mb-2 block text-sm font-semibold"
              >
                Título do relatório
              </Label>
              <Input
                id="relatorio-titulo"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ex: Controle patrimonial - Junho 2026"
              />
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Equipamentos</p>
              <p className="text-xl font-semibold">
                {!empresaIdsParaOpcoes.length
                  ? "-"
                  : equipamentosLoading
                    ? "..."
                    : tipoRelatorio === "visita_externa"
                      ? quantidadePrevistaVisita
                      : quantidadePrevista}
              </p>
              {empresaIdsParaOpcoes.length > 0 && filtrosEquipamentosAtivos && (
                <button
                  type="button"
                  className="mt-1 text-left text-[11px] font-medium text-primary hover:underline"
                  onClick={limparFiltrosEquipamentos}
                >
                  Filtros ativos. Limpar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <SelectField
              includeBlank={false}
              label="Tipo de Relatório"
              value={tipoRelatorio}
              onChange={handleTipoRelatorioChange}
              options={[
                {
                  value: "controle_patrimonial",
                  label: "Controle Patrimonial",
                },
                { value: "visita_externa", label: "Visita Externa" },
              ]}
            />
            {tipoRelatorio === "controle_patrimonial" ? (
              <>
                <SelectField
                  includeBlank={false}
                  label="Inserir Resumo"
                  value={filtros.incluirResumo ? "sim" : "nao"}
                  onChange={setResumo}
                  options={[
                    { value: "sim", label: "Sim" },
                    { value: "nao", label: "Não" },
                  ]}
                />
                <SearchableMultiSelectField
                  disabled={empresasLoading}
                  label="Empresa"
                  values={filtros.empresaIds}
                  onChange={setEmpresas}
                  options={empresaOptions}
                />
                <SearchableMultiSelectField
                  disabled={
                    equipamentosLoading ||
                    !filtros.empresaIds.length ||
                    !tipoOptions.length
                  }
                  label="Tipo de Equipamento"
                  values={filtros.tipoEquipamentoLabels}
                  onChange={setTipos}
                  selectAllAction
                  options={tipoOptions.map((tipo) => ({
                    value: tipo,
                    label: tipo,
                  }))}
                />
                <SearchableMultiSelectField
                  disabled={
                    equipamentosLoading ||
                    !filtros.empresaIds.length ||
                    !statusOptions.length
                  }
                  label="Estado"
                  values={filtros.status}
                  onChange={setStatusList}
                  options={statusOptions.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                />
              </>
            ) : (
              <>
                <SearchableMultiSelectField
                  disabled={empresasLoading}
                  label="Empresa"
                  values={filtrosVisita.empresaIds}
                  onChange={setVisitaEmpresas}
                  options={empresaOptions}
                />
                <SearchableMultiSelectField
                  disabled={
                    equipamentosLoading ||
                    !filtrosVisita.empresaIds.length ||
                    !visitaTipoOptions.length
                  }
                  label="Tipo de Equipamento"
                  values={filtrosVisita.tipoEquipamentoLabels}
                  onChange={setVisitaTipos}
                  selectAllAction
                  options={visitaTipoOptions.map((tipo) => ({
                    value: tipo,
                    label: tipo,
                  }))}
                />
                <SelectField
                  includeBlank={false}
                  label="Separar por setor"
                  value={filtrosVisita.separarPorSetor ? "sim" : "nao"}
                  onChange={setVisitaSepararPorSetor}
                  options={[
                    { value: "sim", label: "Sim" },
                    { value: "nao", label: "N\u00e3o" },
                  ]}
                />
                <SearchableMultiSelectField
                  disabled={
                    equipamentosLoading ||
                    !filtrosVisita.empresaIds.length ||
                    !visitaSetorOptions.length
                  }
                  label="Setor"
                  values={filtrosVisita.setorLabels}
                  onChange={setVisitaSetores}
                  selectAllAction
                  options={visitaSetorOptions.map((setor) => ({
                    value: setor,
                    label: setor,
                  }))}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSalvar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Salvar Relatório" : "Gerar Relatório"}
          </Button>
          {editing && (
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Cancelar edição
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Relatórios Arquivados</h2>
          <p className="text-sm text-muted-foreground">
            Gere o PDF final a partir dos filtros salvos.
          </p>
        </div>

        {relatoriosLoading && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando relatórios...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar relatórios
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  {error instanceof Error ? error.message : "Erro desconhecido."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!relatoriosLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left">Relatório</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Revisão</th>
                  <th className="px-4 py-3 text-left">Emissão</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Filtros</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map((relatorio) => (
                  <tr key={relatorio.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{relatorio.titulo}</td>
                    <td className="px-4 py-3">
                      {getTipoRelatorioLabel(relatorio.tipo)}
                    </td>
                    <td className="px-4 py-3">Rev. {relatorio.revisao}</td>
                    <td className="px-4 py-3">{formatDate(relatorio.emitido_em)}</td>
                    <td className="px-4 py-3">{getEmpresaFiltroLabel(relatorio)}</td>
                    <td className="px-4 py-3">{getFiltroResumoLabel(relatorio)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPdf(relatorio)}
                          disabled={gerandoId === relatorio.id}
                        >
                          {gerandoId === relatorio.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4" />
                          )}
                          Gerar PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditar(relatorio)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!relatorios.length && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Nenhum relatório arquivado.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorios;

import {
  ClipboardList,
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
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { toast } from "@/hooks/use-toast";
import OrdemServicoFormDialog, {
  DialogMode,
} from "@/components/OrdemServicoFormDialog";

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
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<OrdemServicoSupabase | null>(null);

  const [hideClosed, setHideClosed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: ordensServico = [], isLoading, isError, error, refetch } =
    useOrdensServico();

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
        tecnico.toLowerCase().includes(q);

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

  const openView = (os: OrdemServicoSupabase) => {
    setSelected(os);
    setMode("view");
    setOpen(true);
  };

  const openEdit = (os: OrdemServicoSupabase) => {
    setSelected(os);
    setMode("edit");
    setOpen(true);
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
                    Número
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Solicitante
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Equipamento
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Técnico Executor
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Tipo de Serviço
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Data de Criação
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((os) => {
                  const estado = getEstado(os);
                  const solicitante = getEmpresaNome(os);
                  const equipamento = getEquipamentoLabel(os);
                  const tecnico = getTecnico(os);
                  const tipoServico = getTipoServico(os);

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
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                            estado
                          )}`}
                        >
                          {estado}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {solicitante}
                      </td>

                      <td className="px-5 py-3 text-muted-foreground">
                        {equipamento}
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

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() =>
                                  featurePending("Geração de orçamento")
                                }
                              >
                                <FileSignature className="w-4 h-4 mr-2" /> Gerar
                                Orçamento
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  featurePending("Protocolo de entrega")
                                }
                              >
                                <PackageCheck className="w-4 h-4 mr-2" />{" "}
                                Protocolo de Entrega
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
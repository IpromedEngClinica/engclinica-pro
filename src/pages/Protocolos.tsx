import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  PackageSearch,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import ProtocoloDetalhesDialog from "@/components/ProtocoloDetalhesDialog";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import SortableTableHeader from "@/components/SortableTableHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useProtocolos } from "@/hooks/useProtocolos";
import {
  ProtocoloOSSupabase,
  protocolosService,
  TipoProtocoloOS,
} from "@/services/protocolosService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { toast } from "@/hooks/use-toast";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfProtocolo } from "@/utils/gerarPdfProtocolo";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const getEmpresaNome = (p: ProtocoloOSSupabase) =>
  p.empresa?.nome_fantasia || p.empresa?.nome || "Não informado";

const formatTipo = (tipo: string) => {
  const map: Record<string, string> = {
    recolhimento: "Recolhimento",
    entrega: "Entrega",
  };

  return map[tipo] || tipo;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getDataPrincipal = (p: ProtocoloOSSupabase) => {
  if (p.tipo === "recolhimento") return p.data_recolhimento || p.data_protocolo;
  if (p.tipo === "entrega") return p.data_entrega || p.data_protocolo;
  return p.data_protocolo;
};

const tipoBadgeClass = (tipo: TipoProtocoloOS) =>
  tipo === "entrega"
    ? "bg-success/10 text-success"
    : "bg-primary/10 text-primary";

const statusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("cancel")) {
    return "bg-destructive/10 text-destructive";
  }

  return "bg-muted text-muted-foreground";
};

const Protocolos = () => {
  const [tipoFiltro, setTipoFiltro] = useState<TipoProtocoloOS | "todos">(
    "todos"
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [protocoloDetalhes, setProtocoloDetalhes] =
    useState<ProtocoloOSSupabase | null>(null);
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);

  const { data: protocolos = [], isLoading, isError, error, refetch } =
    useProtocolos(tipoFiltro === "todos" ? undefined : tipoFiltro);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return protocolos.filter((p) => {
      const empresa = getEmpresaNome(p).toLowerCase();
      const equipamento = getEquipamentoLabel(p.equipamento).toLowerCase();
      const osNumero = p.ordem_servico?.numero || "";
      const responsavel = p.responsavel_nome || "";

      return (
        !q ||
        p.numero.toLowerCase().includes(q) ||
        empresa.includes(q) ||
        equipamento.includes(q) ||
        osNumero.toLowerCase().includes(q) ||
        responsavel.toLowerCase().includes(q)
      );
    });
  }, [protocolos, search]);

  const sortGetters: Record<string, (item: ProtocoloOSSupabase) => unknown> = {
    numero: (p) => p.numero,
    tipo: (p) => p.tipo,
    data: getDataPrincipal,
    cliente: getEmpresaNome,
    equipamento: (p) => getEquipamentoLabel(p.equipamento),
    os: (p) => p.ordem_servico?.numero,
    responsavel: (p) => p.responsavel_nome,
    status: (p) => p.status,
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

  const visibleProtocolos = useMemo(
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

  const openDetalhes = (protocolo: ProtocoloOSSupabase) => {
    setProtocoloDetalhes(protocolo);
    setDetalhesOpen(true);
  };

  const abrirEmpresa = async (empresa: ProtocoloOSSupabase["empresa"]) => {
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
    equipamento: ProtocoloOSSupabase["equipamento"]
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

  const TipoIcon = ({ tipo }: { tipo: TipoProtocoloOS }) =>
    tipo === "entrega" ? (
      <PackageCheck className="w-4 h-4" />
    ) : (
      <PackageSearch className="w-4 h-4" />
    );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Protocolos"
        description="Consulte os protocolos de recolhimento e entrega salvos no Supabase"
      />

      <ProtocoloDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(value) => {
          setDetalhesOpen(value);
          if (!value) setProtocoloDetalhes(null);
        }}
        protocolo={protocoloDetalhes}
        onOpenEmpresa={abrirEmpresa}
        onOpenEquipamento={abrirEquipamento}
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

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-start">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tipoFiltro === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("todos")}
            >
              Todos
            </Button>
            <Button
              variant={tipoFiltro === "recolhimento" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("recolhimento")}
            >
              <PackageSearch className="w-4 h-4 mr-2" />
              Recolhimento
            </Button>
            <Button
              variant={tipoFiltro === "entrega" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("entrega")}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Entrega
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolo, empresa, OS..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ListLimitSelect
              value={listLimit}
              onChange={setListLimit}
              total={sortedFiltered.length}
            />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando protocolos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar protocolos
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
                    <SortableTableHeader label="Empresa" sortField="cliente" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Equipamento" sortField="equipamento" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="OS vinculada" sortField="os" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Data" sortField="data" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Responsavel" sortField="responsavel" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Status" sortField="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleProtocolos.map((protocolo) => (
                  <tr
                    key={protocolo.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => openDetalhes(protocolo)}
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <TipoIcon tipo={protocolo.tipo} />
                        {protocolo.numero}
                      </button>
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${tipoBadgeClass(
                          protocolo.tipo
                        )}`}
                      >
                        {formatTipo(protocolo.tipo)}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.empresa ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => abrirEmpresa(protocolo.empresa)}
                        >
                          {getEmpresaNome(protocolo)}
                        </button>
                      ) : (
                        getEmpresaNome(protocolo)
                      )}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.equipamento ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() =>
                            abrirEquipamento(protocolo.equipamento)
                          }
                        >
                          {getEquipamentoLabel(protocolo.equipamento)}
                        </button>
                      ) : (
                        getEquipamentoLabel(protocolo.equipamento)
                      )}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.ordem_servico?.numero || "-"}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(getDataPrincipal(protocolo))}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.responsavel_nome || "-"}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                          protocolo.status
                        )}`}
                      >
                        {protocolo.status || "-"}
                      </span>
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
                            className="w-48 bg-popover"
                          >
                            <DropdownMenuItem
                              onClick={() => openDetalhes(protocolo)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                const protocoloCompleto =
                                  await protocolosService.buscarPorId(protocolo.id);
                                await gerarPdfProtocolo(protocoloCompleto);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Gerar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum protocolo encontrado.
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

export default Protocolos;

import {
  AlertCircle,
  Eye,
  FileText,
  FileWarning,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import LaudoObsolescenciaDetalhesDialog from "@/components/LaudoObsolescenciaDetalhesDialog";
import LaudoObsolescenciaFormDialog from "@/components/LaudoObsolescenciaFormDialog";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import PageHeader from "@/components/PageHeader";
import SortableTableHeader from "@/components/SortableTableHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useLaudosObsolescencia } from "@/hooks/useLaudosObsolescencia";
import {
  LaudoObsolescenciaSupabase,
  laudosObsolescenciaService,
} from "@/services/laudosObsolescenciaService";
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
import { gerarPdfLaudoObsolescencia } from "@/utils/gerarPdfLaudoObsolescencia";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const getEmpresaNome = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.empresa?.nome_fantasia || laudo.empresa?.nome || "Nao informado";

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getEquipamentoStatus = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.equipamento?.ativo === false
    ? "Desativado"
    : laudo.equipamento?.status || "-";

const LaudosObsolescencia = () => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] =
    useState<LaudoObsolescenciaSupabase | null>(null);
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);

  const { data: laudos = [], isLoading, isError, error, refetch } =
    useLaudosObsolescencia();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return laudos.filter((laudo) => {
      const empresa = getEmpresaNome(laudo).toLowerCase();
      const equipamento = getEquipamentoLabel(laudo.equipamento).toLowerCase();
      const motivo = laudo.motivo_texto.toLowerCase();

      return (
        !q ||
        String(laudo.numero).includes(q) ||
        empresa.includes(q) ||
        equipamento.includes(q) ||
        motivo.includes(q)
      );
    });
  }, [laudos, search]);

  const sortGetters: Record<
    string,
    (item: LaudoObsolescenciaSupabase) => unknown
  > = {
    numero: (l) => l.numero,
    data: (l) => l.data_criacao || l.created_at,
    empresa: getEmpresaNome,
    equipamento: (l) => getEquipamentoLabel(l.equipamento),
    motivo: (l) => l.motivo_texto,
    status: getEquipamentoStatus,
    responsavel: (l) => l.responsavel_nome,
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

  const visibleLaudos = useMemo(
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

  const openDetails = (laudo: LaudoObsolescenciaSupabase) => {
    setSelected(laudo);
    setDetailsOpen(true);
  };

  const abrirEmpresa = async (empresa: LaudoObsolescenciaSupabase["empresa"]) => {
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
    equipamento: LaudoObsolescenciaSupabase["equipamento"]
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

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Laudos de Obsolescencia"
        description="Emita e consulte laudos com desativacao automatica do equipamento"
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Laudo
        </Button>
      </PageHeader>

      <LaudoObsolescenciaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(laudo) => setSelected(laudo)}
      />

      <LaudoObsolescenciaDetalhesDialog
        open={detailsOpen}
        onOpenChange={(value) => {
          setDetailsOpen(value);
          if (!value) setSelected(null);
        }}
        laudo={selected}
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
        <div className="px-5 py-4 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-start">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar laudo, empresa, equipamento..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
            Carregando laudos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar laudos
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
                    <SortableTableHeader label="Data" sortField="data" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Empresa" sortField="empresa" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Equipamento" sortField="equipamento" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Motivo" sortField="motivo" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Status do equipamento" sortField="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader label="Responsavel" sortField="responsavel" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Acoes
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleLaudos.map((laudo) => (
                  <tr
                    key={laudo.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => openDetails(laudo)}
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <FileWarning className="w-4 h-4" />
                        {laudo.numero}
                      </button>
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(laudo.data_criacao)}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {laudo.empresa ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => abrirEmpresa(laudo.empresa)}
                        >
                          {getEmpresaNome(laudo)}
                        </button>
                      ) : (
                        getEmpresaNome(laudo)
                      )}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {laudo.equipamento ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => abrirEquipamento(laudo.equipamento)}
                        >
                          {getEquipamentoLabel(laudo.equipamento)}
                        </button>
                      ) : (
                        getEquipamentoLabel(laudo.equipamento)
                      )}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground max-w-[360px] truncate">
                      {laudo.motivo_texto}
                    </td>

                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        {getEquipamentoStatus(laudo)}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {laudo.responsavel_nome || "-"}
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
                            <DropdownMenuItem onClick={() => openDetails(laudo)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                const laudoCompleto =
                                  await laudosObsolescenciaService.buscarPorId(
                                    laudo.id
                                  );
                                await gerarPdfLaudoObsolescencia(laudoCompleto);
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
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum laudo encontrado.
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

export default LaudosObsolescencia;

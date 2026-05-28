import {
  AlertCircle,
  ArrowUpDown,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import ContratoDetalhesDialog from "@/components/ContratoDetalhesDialog";
import ContratoDocumentosDialog from "@/components/ContratoDocumentosDialog";
import ContratoFormDialog, {
  ContratoDialogMode,
} from "@/components/ContratoFormDialog";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
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
import { useContratos, useDesativarContrato } from "@/hooks/useContratos";
import { toast } from "@/hooks/use-toast";
import {
  ContratoStatusVencimento,
  ContratoSupabase,
  ContratoTipo,
  calcularDiasParaVencer,
  getDiasContratoTexto,
  getEmpresaContratoNome,
  getStatusVencimentoContrato,
  getTermosAditivosRestantes,
  getTermosAditivosTexto,
} from "@/services/contratosService";

const ALL = "__all__";

type SortKey =
  | "tipo"
  | "empresa"
  | "numero"
  | "ultima"
  | "proxima"
  | "dias"
  | "status"
  | "pasta"
  | "termo"
  | "restantes"
  | "visita"
  | "vendedor"
  | "documentos";

type SortDirection = "asc" | "desc";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const statusLabel: Record<ContratoStatusVencimento, string> = {
  vencido: "Vencido",
  critico: "Critico",
  atencao: "Atencao",
  ok: "Ok",
  sem_data: "Sem data",
};

const statusClass: Record<ContratoStatusVencimento, string> = {
  vencido: "bg-red-50 text-red-700 border-red-200",
  critico: "bg-orange-50 text-orange-700 border-orange-200",
  atencao: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ok: "bg-green-50 text-green-700 border-green-200",
  sem_data: "bg-muted text-muted-foreground",
};

const rowAlertClass: Record<ContratoStatusVencimento, string> = {
  vencido: "bg-red-50/40 hover:bg-red-50/70",
  critico: "bg-orange-50/35 hover:bg-orange-50/65",
  atencao: "bg-yellow-50/35 hover:bg-yellow-50/65",
  ok: "hover:bg-muted/30",
  sem_data: "hover:bg-muted/30",
};

const statusSortValue: Record<ContratoStatusVencimento, number> = {
  vencido: 0,
  critico: 1,
  atencao: 2,
  ok: 3,
  sem_data: 4,
};

const getSortValue = (contrato: ContratoSupabase, key: SortKey) => {
  switch (key) {
    case "tipo":
      return contrato.tipo;
    case "empresa":
      return getEmpresaContratoNome(contrato);
    case "numero":
      return contrato.numero_identificacao || "";
    case "ultima":
      return contrato.data_ultima_renovacao || "";
    case "proxima":
      return contrato.data_proxima_renovacao || "";
    case "dias":
      return calcularDiasParaVencer(contrato.data_proxima_renovacao) ?? 999999;
    case "status":
      return statusSortValue[
        getStatusVencimentoContrato(contrato.data_proxima_renovacao)
      ];
    case "pasta":
      return contrato.contrato_ou_ta_na_pasta ? 1 : 0;
    case "termo":
      return contrato.termos_aditivos_realizados;
    case "restantes":
      return getTermosAditivosRestantes(contrato) ?? 999999;
    case "visita":
      return contrato.periodicidade_visita || "";
    case "vendedor":
      return contrato.vendedor || "";
    case "documentos":
      return contrato.documentos?.length || 0;
    default:
      return "";
  }
};

const SortHeader = ({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) => (
  <button
    type="button"
    onClick={() => onSort(sortKey)}
    className="inline-flex items-center gap-1 hover:text-foreground"
  >
    {label}
    <ArrowUpDown
      className={`w-3.5 h-3.5 ${
        currentKey === sortKey ? "text-primary" : "text-muted-foreground"
      } ${currentKey === sortKey && direction === "desc" ? "rotate-180" : ""}`}
    />
  </button>
);

const Contratos = () => {
  const [search, setSearch] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<ContratoTipo | typeof ALL>(ALL);
  const [empresaFiltro, setEmpresaFiltro] = useState(ALL);
  const [statusFiltro, setStatusFiltro] = useState<
    ContratoStatusVencimento | typeof ALL
  >(ALL);
  const [pastaFiltro, setPastaFiltro] = useState<typeof ALL | "sim" | "nao">(
    ALL
  );
  const [periodicidadeFiltro, setPeriodicidadeFiltro] = useState(ALL);
  const [vendedorFiltro, setVendedorFiltro] = useState(ALL);
  const [documentosFiltro, setDocumentosFiltro] = useState<
    typeof ALL | "com" | "sem"
  >(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("proxima");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [documentosOpen, setDocumentosOpen] = useState(false);
  const [mode, setMode] = useState<ContratoDialogMode>("create");
  const [selected, setSelected] = useState<ContratoSupabase | null>(null);

  const { data: contratos = [], isLoading, isError, error, refetch } =
    useContratos();
  const desativarContrato = useDesativarContrato();

  const vendedores = useMemo(
    () =>
      Array.from(
        new Set(contratos.map((contrato) => contrato.vendedor).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[],
    [contratos]
  );

  const periodicidades = useMemo(
    () =>
      Array.from(
        new Set(
          contratos
            .map((contrato) => contrato.periodicidade_visita)
            .filter(Boolean)
        )
      ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[],
    [contratos]
  );

  const empresas = useMemo(
    () =>
      Array.from(
        new Set(
          contratos.map((contrato) => getEmpresaContratoNome(contrato)).filter(Boolean)
        )
      ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[],
    [contratos]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return contratos
      .filter((contrato) => {
        const empresa = getEmpresaContratoNome(contrato).toLowerCase();
        const status = getStatusVencimentoContrato(
          contrato.data_proxima_renovacao
        );
        const documentosCount = contrato.documentos?.length || 0;

        const matchSearch =
          !q ||
          empresa.includes(q) ||
          (contrato.numero_identificacao || "").toLowerCase().includes(q) ||
          (contrato.vendedor || "").toLowerCase().includes(q) ||
          (contrato.objeto || "").toLowerCase().includes(q) ||
          (contrato.observacoes || "").toLowerCase().includes(q);

        const matchTipo = tipoFiltro === ALL || contrato.tipo === tipoFiltro;
        const matchEmpresa = empresaFiltro === ALL || empresa === empresaFiltro;
        const matchStatus = statusFiltro === ALL || status === statusFiltro;
        const matchPasta =
          pastaFiltro === ALL ||
          (pastaFiltro === "sim"
            ? contrato.contrato_ou_ta_na_pasta
            : !contrato.contrato_ou_ta_na_pasta);
        const matchPeriodicidade =
          periodicidadeFiltro === ALL ||
          contrato.periodicidade_visita === periodicidadeFiltro;
        const matchVendedor =
          vendedorFiltro === ALL || contrato.vendedor === vendedorFiltro;
        const matchDocumentos =
          documentosFiltro === ALL ||
          (documentosFiltro === "com"
            ? documentosCount > 0
            : documentosCount === 0);
        const matchDataDe =
          !dataDe || contrato.data_proxima_renovacao >= dataDe;
        const matchDataAte =
          !dataAte || contrato.data_proxima_renovacao <= dataAte;

        return (
          matchSearch &&
          matchTipo &&
          matchEmpresa &&
          matchStatus &&
          matchPasta &&
          matchPeriodicidade &&
          matchVendedor &&
          matchDocumentos &&
          matchDataDe &&
          matchDataAte
        );
      })
      .sort((a, b) => {
        const aValue = getSortValue(a, sortKey);
        const bValue = getSortValue(b, sortKey);

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        const compare = String(aValue).localeCompare(String(bValue), "pt-BR", {
          numeric: true,
        });

        return sortDirection === "asc" ? compare : -compare;
      });
  }, [
    contratos,
    dataAte,
    dataDe,
    documentosFiltro,
    empresaFiltro,
    pastaFiltro,
    periodicidadeFiltro,
    search,
    sortDirection,
    sortKey,
    statusFiltro,
    tipoFiltro,
    vendedorFiltro,
  ]);

  const counters = useMemo(
    () => ({
      vencidos: contratos.filter(
        (contrato) =>
          getStatusVencimentoContrato(contrato.data_proxima_renovacao) ===
          "vencido"
      ).length,
      criticos: contratos.filter(
        (contrato) =>
          getStatusVencimentoContrato(contrato.data_proxima_renovacao) ===
          "critico"
      ).length,
      atencao: contratos.filter(
        (contrato) =>
          getStatusVencimentoContrato(contrato.data_proxima_renovacao) ===
          "atencao"
      ).length,
      total: contratos.length,
    }),
    [contratos]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const limparFiltros = () => {
    setSearch("");
    setTipoFiltro(ALL);
    setEmpresaFiltro(ALL);
    setStatusFiltro(ALL);
    setPastaFiltro(ALL);
    setPeriodicidadeFiltro(ALL);
    setVendedorFiltro(ALL);
    setDocumentosFiltro(ALL);
    setDataDe("");
    setDataAte("");
  };

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setFormOpen(true);
  };

  const openEdit = (contrato: ContratoSupabase) => {
    setSelected(contrato);
    setMode("edit");
    setFormOpen(true);
  };

  const openDetails = (contrato: ContratoSupabase) => {
    setSelected(contrato);
    setDetailsOpen(true);
  };

  const openDocumentos = (contrato: ContratoSupabase) => {
    setSelected(contrato);
    setDocumentosOpen(true);
  };

  const handleDesativar = async (contrato: ContratoSupabase) => {
    const confirmar = window.confirm(
      `Desativar o contrato ${contrato.numero_identificacao || ""}?`
    );
    if (!confirmar) return;

    try {
      await desativarContrato.mutateAsync(contrato.id);
      toast({ title: "Contrato desativado." });
    } catch (error) {
      toast({
        title: "Erro ao desativar contrato",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const renderStatus = (contrato: ContratoSupabase) => {
    const status = getStatusVencimentoContrato(contrato.data_proxima_renovacao);
    return (
      <Badge variant="outline" className={statusClass[status]}>
        {statusLabel[status]}
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Contratos"
        description="Gerencie vencimentos, renovacoes, documentos e termos aditivos."
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Contrato
        </Button>
      </PageHeader>

      <ContratoFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setSelected(null);
        }}
        mode={mode}
        contrato={selected}
      />

      <ContratoDetalhesDialog
        open={detailsOpen}
        onOpenChange={(value) => {
          setDetailsOpen(value);
          if (!value) setSelected(null);
        }}
        contrato={selected}
      />

      <ContratoDocumentosDialog
        open={documentosOpen}
        onOpenChange={(value) => {
          setDocumentosOpen(value);
          if (!value) setSelected(null);
        }}
        contrato={selected}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-semibold text-red-700">
            {counters.vencidos}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ate 30 dias</p>
          <p className="text-2xl font-semibold text-orange-700">
            {counters.criticos}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ate 60 dias</p>
          <p className="text-2xl font-semibold text-yellow-700">
            {counters.atencao}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total ativos</p>
          <p className="text-2xl font-semibold">{counters.total}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa, numero, vendedor, objeto..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFiltrosAbertos((current) => !current)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtros avancados
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>
          </div>

          {filtrosAbertos && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    Filtros avancados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Refine contratos por empresa, vencimento, documentos e
                    responsaveis.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                <Select
                  value={tipoFiltro}
                  onValueChange={(value) =>
                    setTipoFiltro(value as ContratoTipo | typeof ALL)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os tipos</SelectItem>
                    <SelectItem value="Privado">Privado</SelectItem>
                    <SelectItem value="Publico">Publico</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as empresas</SelectItem>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa} value={empresa.toLowerCase()}>
                        {empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFiltro}
                  onValueChange={(value) =>
                    setStatusFiltro(
                      value as ContratoStatusVencimento | typeof ALL
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os status</SelectItem>
                    <SelectItem value="vencido">Vencidos</SelectItem>
                    <SelectItem value="critico">Critico ate 30 dias</SelectItem>
                    <SelectItem value="atencao">Atencao ate 60 dias</SelectItem>
                    <SelectItem value="ok">Ok</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={pastaFiltro} onValueChange={setPastaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Pasta: todos</SelectItem>
                    <SelectItem value="sim">Com contrato/T.A.</SelectItem>
                    <SelectItem value="nao">Sem contrato/T.A.</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={periodicidadeFiltro}
                  onValueChange={setPeriodicidadeFiltro}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Visita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as visitas</SelectItem>
                    {periodicidades.map((periodicidade) => (
                      <SelectItem key={periodicidade} value={periodicidade}>
                        {periodicidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos vendedores</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor} value={vendedor}>
                        {vendedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={documentosFiltro}
                  onValueChange={(value) =>
                    setDocumentosFiltro(value as typeof ALL | "com" | "sem")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Documentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Docs: todos</SelectItem>
                    <SelectItem value="com">Com documentos</SelectItem>
                    <SelectItem value="sem">Sem documentos</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dataDe}
                  onChange={(event) => setDataDe(event.target.value)}
                  title="Vencimento de"
                />
                <Input
                  type="date"
                  value={dataAte}
                  onChange={(event) => setDataAte(event.target.value)}
                  title="Vencimento ate"
                />
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {filtered.length} contrato(s) encontrado(s).
          </p>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando contratos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar contratos
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
                  {[
                    ["Tipo", "tipo"],
                    ["Empresa", "empresa"],
                    ["Numero / ID", "numero"],
                    ["Ultima Renovacao", "ultima"],
                    ["Proxima Renovacao", "proxima"],
                    ["Dias", "dias"],
                    ["Status", "status"],
                    ["Contrato/T.A.", "pasta"],
                    ["Termo Atual", "termo"],
                    ["Restantes", "restantes"],
                    ["Visita", "visita"],
                    ["Vendedor", "vendedor"],
                    ["Documentos", "documentos"],
                  ].map(([label, key]) => (
                    <th
                      key={key}
                      className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap"
                    >
                      <SortHeader
                        label={label}
                        sortKey={key as SortKey}
                        currentKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Acoes
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((contrato) => {
                  const status = getStatusVencimentoContrato(
                    contrato.data_proxima_renovacao
                  );
                  const restantes = getTermosAditivosRestantes(contrato);
                  const documentosCount = contrato.documentos?.length || 0;

                  return (
                    <tr
                      key={contrato.id}
                      className={`border-b last:border-0 transition-colors ${rowAlertClass[status]}`}
                    >
                      <td className="px-4 py-3">{contrato.tipo}</td>
                      <td className="px-4 py-3 font-medium">
                        {getEmpresaContratoNome(contrato)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {contrato.numero_identificacao || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(contrato.data_ultima_renovacao)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatDate(contrato.data_proxima_renovacao)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getDiasContratoTexto(contrato.data_proxima_renovacao)}
                      </td>
                      <td className="px-4 py-3">{renderStatus(contrato)}</td>
                      <td className="px-4 py-3">
                        {contrato.contrato_ou_ta_na_pasta ? "Sim" : "Nao"}
                      </td>
                      <td className="px-4 py-3">
                        {getTermosAditivosTexto(contrato)}
                      </td>
                      <td className="px-4 py-3">
                        {restantes === null ? (
                          "-"
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              restantes === 0
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {restantes} restante(s)
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {contrato.periodicidade_visita || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {contrato.vendedor || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium"
                          onClick={() => openDocumentos(contrato)}
                        >
                          {documentosCount} docs
                        </button>
                      </td>
                      <td className="px-4 py-3">
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
                                onClick={() => openDetails(contrato)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEdit(contrato)}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDocumentos(contrato)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Documentos
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDesativar(contrato)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Desativar
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
                      colSpan={14}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum contrato encontrado.
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

export default Contratos;

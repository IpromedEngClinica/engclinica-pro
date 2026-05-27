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
} from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import OrcamentoDetalhesDialog from "@/components/OrcamentoDetalhesDialog";
import OrcamentoFormDialog, {
  OrcamentoDialogMode,
} from "@/components/OrcamentoFormDialog";
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
} from "@/services/orcamentosService";
import { gerarPdfOrcamento } from "@/utils/gerarPdfOrcamento";

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

const getEquipamentoLabel = (orcamento: OrcamentoSupabase) => {
  if (!orcamento.equipamento) return "-";

  const tipo =
    orcamento.equipamento.tipo_equipamento?.nome ||
    orcamento.equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    orcamento.equipamento.fabricante,
    orcamento.equipamento.modelo,
    orcamento.equipamento.tag ||
      orcamento.equipamento.patrimonio ||
      orcamento.equipamento.numero_serie,
  ]
    .filter(Boolean)
    .join(" - ");
};

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
  const [statusFiltro, setStatusFiltro] =
    useState<OrcamentoStatus>("pendente");
  const [tipoFilter, setTipoFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [mode, setMode] = useState<OrcamentoDialogMode>("create");
  const [selected, setSelected] = useState<OrcamentoSupabase | null>(null);
  const { data: orcamentos = [], isLoading, isError, error, refetch } =
    useOrcamentos();
  const alterarStatus = useAlterarStatusOrcamento();

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
        orcamento.status === statusFiltro;
      const matchTipo =
        tipoFilter === ALL || orcamento.tipo_orcamento === tipoFilter;

      return matchSearch && matchStatus && matchTipo;
    });
  }, [orcamentos, search, statusFiltro, tipoFilter]);

  const activeTab = statusTabs.find((tab) => tab.value === statusFiltro);

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

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              Orcamentos {activeTab?.label || ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} registro(s) nesta aba.
            </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    Numero
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Origem
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Solicitante
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Identificacao
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    OS
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Pecas
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Servicos
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Validade
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Acoes
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((orcamento) => {
                  const empresa = getEmpresaNome(orcamento);
                  const identificacao =
                    orcamento.identificador || getEquipamentoLabel(orcamento);

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
                        {empresa}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[280px]">
                        <span className="line-clamp-2">{identificacao}</span>
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
                                  await gerarPdfOrcamento(orcamento);
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
                      colSpan={13}
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

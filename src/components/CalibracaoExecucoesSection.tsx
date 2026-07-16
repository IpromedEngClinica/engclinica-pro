import {
  AlertCircle,
  Ban,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import CalibracaoExecucaoDetalhesDialog from "@/components/CalibracaoExecucaoDetalhesDialog";
import CalibracaoExecucaoFormDialog from "@/components/CalibracaoExecucaoFormDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import SortableTableHeader from "@/components/SortableTableHeader";
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
import {
  CALIBRACAO_EXECUCAO_QUERY_KEY,
  CALIBRACAO_EXECUCOES_DEFAULT_PAGINADO_FILTROS,
  CALIBRACAO_EXECUCOES_STALE_TIME,
  useCalibracaoExecucoesFiltros,
  useCalibracaoExecucoesPaginadas,
  useCancelarCalibracaoExecucao,
} from "@/hooks/useCalibracaoExecucoes";
import { toast } from "@/hooks/use-toast";
import {
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
  type CalibracaoExecucoesSortField,
} from "@/services/calibracaoExecucoesService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { formatarIdentificacaoCompletaEquipamento } from "@/utils/equipamentoFormatters";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import type { SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";

const date = (value?: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")
    : "-";

const CalibracaoExecucoesSection = () => {
  const queryClient = useQueryClient();
  const cancelar = useCancelarCalibracaoExecucao();
  const { data: opcoesFiltros } = useCalibracaoExecucoesFiltros();
  const [selected, setSelected] = useState<CalibracaoExecucao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [empresa, setEmpresa] = useState(ALL);
  const [tipoEquipamento, setTipoEquipamento] = useState(ALL);
  const [resultado, setResultado] = useState(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [validadeDe, setValidadeDe] = useState("");
  const [validadeAte, setValidadeAte] = useState("");
  const [sortKey, setSortKey] =
    useState<CalibracaoExecucoesSortField>("numero_certificado");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [page, setPage] = useState(1);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      350
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    empresa,
    tipoEquipamento,
    resultado,
    dataDe,
    dataAte,
    validadeDe,
    validadeAte,
    listLimit,
    sortKey,
    sortDirection,
  ]);

  const queryFiltros = useMemo(
    () => ({
      ...CALIBRACAO_EXECUCOES_DEFAULT_PAGINADO_FILTROS,
      termo: debouncedSearch,
      empresaId: empresa === ALL ? undefined : empresa,
      tipoEquipamentoId:
        tipoEquipamento === ALL ? undefined : tipoEquipamento,
      resultado: resultado === ALL ? undefined : resultado,
      dataDe: dataDe || undefined,
      dataAte: dataAte || undefined,
      validadeDe: validadeDe || undefined,
      validadeAte: validadeAte || undefined,
      page,
      limit: listLimit,
      sortBy: sortKey,
      ascending: sortDirection === "asc",
    }),
    [
      dataAte,
      dataDe,
      debouncedSearch,
      empresa,
      listLimit,
      page,
      resultado,
      sortDirection,
      sortKey,
      tipoEquipamento,
      validadeAte,
      validadeDe,
    ]
  );

  const {
    data: execucoesResult,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCalibracaoExecucoesPaginadas(queryFiltros);

  const execucoes = execucoesResult?.items || [];
  const total = execucoesResult?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / listLimit));
  const firstVisibleIndex = total ? (page - 1) * listLimit + 1 : 0;
  const lastVisibleIndex = Math.min(page * listLimit, total);

  const carregarExecucaoCompleta = async (item: CalibracaoExecucao) => {
    setLoadingActionId(item.id);
    try {
      return await queryClient.fetchQuery({
        queryKey: [...CALIBRACAO_EXECUCAO_QUERY_KEY, item.id],
        queryFn: () =>
          calibracaoExecucoesService.buscarExecucaoPorId(item.id),
        staleTime: CALIBRACAO_EXECUCOES_STALE_TIME,
      });
    } finally {
      setLoadingActionId(null);
    }
  };

  const abrirDetalhes = async (item: CalibracaoExecucao) => {
    try {
      setSelected(await carregarExecucaoCompleta(item));
      setDetailsOpen(true);
    } catch (loadError) {
      toast({
        title: "Erro ao carregar calibração",
        description:
          loadError instanceof Error ? loadError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirFormularioEdicao = (item: CalibracaoExecucao) => {
    setDetailsOpen(false);
    setSelected(item);
    setFormOpen(true);
  };

  const handleEditar = async (item: CalibracaoExecucao) => {
    if (
      item.status === "fechada" &&
      !window.confirm(
        "Esta calibração já foi finalizada. As alterações gerarão uma nova revisão do certificado.\nDeseja continuar?"
      )
    ) {
      return;
    }

    try {
      abrirFormularioEdicao(await carregarExecucaoCompleta(item));
    } catch (loadError) {
      toast({
        title: "Erro ao carregar calibração",
        description:
          loadError instanceof Error ? loadError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleCancelar = async (item: CalibracaoExecucao) => {
    if (!window.confirm("Cancelar esta calibração?")) return;
    try {
      await cancelar.mutateAsync(item.id);
      setDetailsOpen(false);
      toast({ title: "Calibração cancelada." });
    } catch (cancelError) {
      toast({
        title: "Erro ao cancelar calibração",
        description:
          cancelError instanceof Error ? cancelError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirPdf = async (item: CalibracaoExecucao, download = false) => {
    try {
      window.open(
        await calibracaoExecucoesService.criarUrlPdf(item, download),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (pdfError) {
      toast({
        title: "Erro ao abrir PDF",
        description:
          pdfError instanceof Error ? pdfError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const gerarPdf = async (item: CalibracaoExecucao) => {
    try {
      const execucaoCompleta = await carregarExecucaoCompleta(item);
      await gerarPdfCalibracaoCertificado(execucaoCompleta);
    } catch (pdfError) {
      toast({
        title: "Erro ao gerar PDF",
        description:
          pdfError instanceof Error ? pdfError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirEmpresa = async (item: CalibracaoExecucao) => {
    try {
      setEmpresaSelecionada(await empresasService.buscarPorId(item.empresa_id));
      setEmpresaDetalhesOpen(true);
    } catch (empresaError) {
      toast({
        title: "Erro ao abrir cliente",
        description:
          empresaError instanceof Error ? empresaError.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirEquipamento = async (item: CalibracaoExecucao) => {
    try {
      setEquipamentoSelecionado(
        await equipamentosService.buscarPorId(item.equipamento_id)
      );
      setEquipamentoDetalhesOpen(true);
    } catch (equipamentoError) {
      toast({
        title: "Erro ao abrir equipamento",
        description:
          equipamentoError instanceof Error
            ? equipamentoError.message
            : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const limparFiltros = () => {
    setEmpresa(ALL);
    setTipoEquipamento(ALL);
    setResultado(ALL);
    setDataDe("");
    setDataAte("");
    setValidadeDe("");
    setValidadeAte("");
  };

  const filtrosAtivos = [
    empresa !== ALL,
    tipoEquipamento !== ALL,
    resultado !== ALL,
    dataDe,
    dataAte,
    validadeDe,
    validadeAte,
  ].filter(Boolean).length;

  const sort = (key: string) => {
    const nextKey = key as CalibracaoExecucoesSortField;
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  return (
    <div className="space-y-4">
      <CalibracaoExecucaoFormDialog
        open={formOpen}
        execucao={selected}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setSelected(null);
        }}
      />
      <CalibracaoExecucaoDetalhesDialog
        open={detailsOpen}
        execucao={selected}
        onOpenChange={(value) => {
          setDetailsOpen(value);
          if (!value) setSelected(null);
        }}
        onEditar={abrirFormularioEdicao}
        onCancelar={handleCancelar}
      />
      <EmpresaDetalhesDialog
        open={empresaDetalhesOpen}
        empresa={empresaSelecionada}
        onOpenChange={(value) => {
          setEmpresaDetalhesOpen(value);
          if (!value) setEmpresaSelecionada(null);
        }}
      />
      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        equipamento={equipamentoSelecionado}
        onOpenChange={(value) => {
          setEquipamentoDetalhesOpen(value);
          if (!value) setEquipamentoSelecionado(null);
        }}
      />

      <div className="rounded-xl border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/30"
          onClick={() => setFiltrosAbertos((current) => !current)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filtros avançados
            {filtrosAtivos > 0 && (
              <Badge variant="secondary">{filtrosAtivos}</Badge>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              filtrosAbertos ? "rotate-180" : ""
            }`}
          />
        </button>
        {filtrosAbertos && (
          <div className="grid gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
            <FilterSelect
              value={empresa}
              onChange={setEmpresa}
              label="Empresa"
              options={(opcoesFiltros?.empresas || []).map((item) => [
                item.id,
                item.nome,
              ])}
            />
            <FilterSelect
              value={tipoEquipamento}
              onChange={setTipoEquipamento}
              label="Tipo de equipamento"
              options={(opcoesFiltros?.tiposEquipamento || []).map((item) => [
                item.id,
                item.nome,
              ])}
            />
            <FilterSelect
              value={resultado}
              onChange={setResultado}
              label="Resultado"
              options={[
                ["conforme", "Conforme"],
                ["nao_conforme", "Não conforme"],
                [
                  "sem_declaracao_conformidade",
                  "Sem declaração de conformidade",
                ],
              ]}
            />
            <fieldset className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs font-medium text-muted-foreground">
                Data de calibração
              </legend>
              <label className="space-y-1 text-xs text-muted-foreground">
                De
                <Input
                  type="date"
                  value={dataDe}
                  onChange={(event) => setDataDe(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Até
                <Input
                  type="date"
                  value={dataAte}
                  onChange={(event) => setDataAte(event.target.value)}
                />
              </label>
            </fieldset>
            <fieldset className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs font-medium text-muted-foreground">
                Validade
              </legend>
              <label className="space-y-1 text-xs text-muted-foreground">
                De
                <Input
                  type="month"
                  value={validadeDe}
                  onChange={(event) => setValidadeDe(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Até
                <Input
                  type="month"
                  value={validadeAte}
                  onChange={(event) => setValidadeAte(event.target.value)}
                />
              </label>
            </fieldset>
            <div className="flex justify-end md:col-span-2 xl:col-span-3">
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar calibração..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ListLimitSelect
              value={listLimit}
              onChange={setListLimit}
              total={total}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova Calibração
            </Button>
          </div>
        </div>

        {isFetching && !isLoading && (
          <div className="h-1 overflow-hidden bg-muted">
            <div className="h-full w-1/2 animate-pulse bg-primary" />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Carregando calibrações executadas...
          </div>
        )}

        {isError && (
          <div className="p-5">
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Erro ao carregar calibrações</p>
                <p className="mt-1 text-sm">
                  {error instanceof Error ? error.message : "Erro inesperado."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {[
                    ["Número do certificado", "numero_certificado"],
                    ["Cliente", "cliente"],
                    ["Equipamento", "equipamento"],
                    ["Data de calibração", "data_calibracao"],
                    ["Vencimento", "vencimento"],
                  ].map(([label, key]) => (
                    <th key={key} className="px-3 py-2 text-left">
                      <SortableTableHeader
                        label={label}
                        sortField={key}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={sort}
                      />
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                        onClick={() => void abrirDetalhes(item)}
                        disabled={loadingActionId === item.id}
                      >
                        {loadingActionId === item.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {formatNumeroCertificadoCalibracao(
                          item.numero_certificado
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-left text-primary hover:underline"
                        onClick={() => void abrirEmpresa(item)}
                      >
                        {item.empresa?.nome ||
                          item.empresa?.nome_fantasia ||
                          "-"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-left text-primary hover:underline"
                        onClick={() => void abrirEquipamento(item)}
                      >
                        {formatarIdentificacaoCompletaEquipamento(
                          item.equipamento
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">{date(item.data_calibracao)}</td>
                    <td className="px-3 py-2">
                      {date(item.data_validade || item.validade_mes)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loadingActionId === item.id}
                          >
                            {loadingActionId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void abrirDetalhes(item)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Visualizar
                          </DropdownMenuItem>
                          {item.status !== "cancelada" && (
                            <DropdownMenuItem
                              onClick={() => void handleEditar(item)}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => void gerarPdf(item)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {item.pdf_storage_path ? "Regenerar PDF" : "Gerar PDF"}
                          </DropdownMenuItem>
                          {item.pdf_storage_path && (
                            <>
                              <DropdownMenuItem
                                onClick={() => void abrirPdf(item)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Visualizar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void abrirPdf(item, true)}
                              >
                                <Download className="mr-2 h-4 w-4" /> Baixar PDF
                              </DropdownMenuItem>
                            </>
                          )}
                          {["rascunho", "em_execucao"].includes(item.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => void handleCancelar(item)}
                              >
                                <Ban className="mr-2 h-4 w-4" /> Cancelar calibração
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {total === 0 && !isFetching && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Nenhuma calibração executada.
                    </td>
                  </tr>
                )}
                {total === 0 && isFetching && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Atualizando calibrações executadas...
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
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

type FilterSelectProps = {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
};

const FilterSelect = ({
  label,
  onChange,
  options,
  value,
}: FilterSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Todos: {label}</SelectItem>
      {options.map(([id, text]) => (
        <SelectItem key={id} value={id}>
          {text}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CalibracaoExecucoesSection;

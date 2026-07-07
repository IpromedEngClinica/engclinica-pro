import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  MapPin,
  MoveRight,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import PageHeader from "@/components/PageHeader";
import SearchableSelect from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import {
  setoresOrganizacaoService,
  type EquipamentoSetorResumo,
} from "@/services/setoresOrganizacaoService";

const TODOS = "__todos__";
const SEM_SETOR = "__sem_setor__";
const PENDENTES = "__pendentes__";
type SortColumn = "numero" | "equipamento" | "identificacao" | "setor" | "status";
type SortDirection = "asc" | "desc";

const normalizarBusca = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatEmpresaLabel = (numero: number | null | undefined, nome: string) =>
  `${String(numero || 0).padStart(3, "0")} - ${nome}`;

const formatNumero = (numero: number | null | undefined) =>
  numero ? String(numero).padStart(3, "0") : "-";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro inesperado.";

const montarTextoEquipamento = (equipamento: EquipamentoSetorResumo) =>
  [
    setoresOrganizacaoService.montarDescricaoEquipamento(equipamento),
    equipamento.numero_cadastro,
    equipamento.numero_serie,
    equipamento.patrimonio,
    equipamento.tag,
    equipamento.setor,
    equipamento.local_instalacao,
  ]
    .filter(Boolean)
    .join(" ");

const compararTexto = (a: string | null | undefined, b: string | null | undefined) =>
  (a || "").localeCompare(b || "", "pt-BR", { numeric: true, sensitivity: "base" });

const compararEquipamentos = (
  a: EquipamentoSetorResumo,
  b: EquipamentoSetorResumo,
  column: SortColumn
) => {
  if (column === "numero") return (a.numero_cadastro || 0) - (b.numero_cadastro || 0);
  if (column === "equipamento") {
    return compararTexto(
      setoresOrganizacaoService.montarDescricaoEquipamento(a),
      setoresOrganizacaoService.montarDescricaoEquipamento(b)
    );
  }
  if (column === "identificacao") {
    return compararTexto(
      [a.numero_serie, a.patrimonio, a.tag].filter(Boolean).join(" "),
      [b.numero_serie, b.patrimonio, b.tag].filter(Boolean).join(" ")
    );
  }
  if (column === "setor") {
    const setorCompare = compararTexto(a.setor || a.local_instalacao, b.setor || b.local_instalacao);
    if (setorCompare !== 0) return setorCompare;
    return compararTexto(a.local_instalacao, b.local_instalacao);
  }
  return compararTexto(
    a.ativo ? a.status || "Ativo" : "Desativado",
    b.ativo ? b.status || "Ativo" : "Desativado"
  );
};

const OrganizarSetores = () => {
  const queryClient = useQueryClient();
  const { data: empresas = [], isLoading: loadingEmpresas } = useEmpresas({
    statusFiltro: "todas",
  });

  const [empresaId, setEmpresaId] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [setorSelecionadoId, setSetorSelecionadoId] = useState(TODOS);
  const [buscaEquipamento, setBuscaEquipamento] = useState("");
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<string[]>([]);
  const [setorDestinoNome, setSetorDestinoNome] = useState("");
  const [localDestino, setLocalDestino] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("setor");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [equipamentoDetalhes, setEquipamentoDetalhes] =
    useState<EquipamentoSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);

  const empresasOptions = useMemo(
    () => empresas.map((empresa) => formatEmpresaLabel(empresa.numero_cadastro, empresa.nome)),
    [empresas]
  );

  const empresaIdPorLabel = useMemo(() => {
    const map = new Map<string, string>();
    empresas.forEach((empresa) => {
      map.set(formatEmpresaLabel(empresa.numero_cadastro, empresa.nome), empresa.id);
    });
    return map;
  }, [empresas]);

  const empresaSelecionada = useMemo(
    () => empresas.find((empresa) => empresa.id === empresaId) || null,
    [empresaId, empresas]
  );

  const empresaLabelSelecionada = useMemo(
    () =>
      empresaSelecionada
        ? formatEmpresaLabel(empresaSelecionada.numero_cadastro, empresaSelecionada.nome)
        : "",
    [empresaSelecionada]
  );

  const setoresQueryKey = ["organizacao-setores", empresaSelecionada?.id];
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: setoresQueryKey,
    queryFn: () => setoresOrganizacaoService.carregarEmpresa(empresaSelecionada!.id),
    enabled: Boolean(empresaSelecionada?.id),
  });

  const setoresPorId = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["setores"][number]>();
    (data?.setores || []).forEach((setor) => map.set(setor.id, setor));
    return map;
  }, [data?.setores]);

  const setorOptions = useMemo(
    () => (data?.setores || []).map((setor) => setor.nome),
    [data?.setores]
  );

  const setorIdPorNome = useMemo(() => {
    const map = new Map<string, string>();
    (data?.setores || []).forEach((setor) => map.set(setor.nome, setor.id));
    return map;
  }, [data?.setores]);

  const equipamentos = data?.equipamentos || [];

  const setoresVazios = useMemo(() => {
    const setoresUsados = new Set(
      equipamentos
        .map((equipamento) => equipamento.empresa_setor_id)
        .filter((id): id is string => Boolean(id))
    );

    return (data?.setores || []).filter((setor) => !setoresUsados.has(setor.id));
  }, [data?.setores, equipamentos]);

  const isEquipamentoPendente = (equipamento: EquipamentoSetorResumo) => {
    if (!equipamento.empresa_setor_id) return true;
    const setorOficial = setoresPorId.get(equipamento.empresa_setor_id);
    return Boolean(setorOficial && equipamento.setor?.trim() !== setorOficial.nome);
  };

  const contagemPorSetor = useMemo(() => {
    const map = new Map<string, number>();
    equipamentos.forEach((equipamento) => {
      if (!equipamento.empresa_setor_id) return;
      map.set(
        equipamento.empresa_setor_id,
        (map.get(equipamento.empresa_setor_id) || 0) + 1
      );
    });
    return map;
  }, [equipamentos]);

  const totalSemSetor = useMemo(
    () => equipamentos.filter((equipamento) => !equipamento.empresa_setor_id).length,
    [equipamentos]
  );

  const totalPendentes = useMemo(
    () => equipamentos.filter((equipamento) => isEquipamentoPendente(equipamento)).length,
    [equipamentos, setoresPorId]
  );

  const equipamentosFiltrados = useMemo(() => {
    const termo = normalizarBusca(buscaEquipamento);

    return equipamentos
      .filter((equipamento) => {
        if (setorSelecionadoId === TODOS) return true;
        if (setorSelecionadoId === SEM_SETOR) return !equipamento.empresa_setor_id;
        if (setorSelecionadoId === PENDENTES) return isEquipamentoPendente(equipamento);
        return equipamento.empresa_setor_id === setorSelecionadoId;
      })
      .filter((equipamento) => {
        if (!termo) return true;
        return normalizarBusca(montarTextoEquipamento(equipamento)).includes(termo);
      })
      .sort((a, b) => {
        const compare = compararEquipamentos(a, b, sortColumn);
        if (compare !== 0) return sortDirection === "asc" ? compare : -compare;
        return (b.numero_cadastro || 0) - (a.numero_cadastro || 0);
      });
  }, [buscaEquipamento, equipamentos, setorSelecionadoId, setoresPorId, sortColumn, sortDirection]);

  const ordenarPor = (column: SortColumn) => {
    setSortColumn((currentColumn) => {
      if (currentColumn === column) {
        setSortDirection((currentDirection) => currentDirection === "asc" ? "desc" : "asc");
        return currentColumn;
      }
      setSortDirection(column === "numero" ? "desc" : "asc");
      return column;
    });
  };

  const equipamentosVisiveisIds = useMemo(
    () => equipamentosFiltrados.map((equipamento) => equipamento.id),
    [equipamentosFiltrados]
  );

  const equipamentosSelecionadosValidos = useMemo(
    () =>
      equipamentosSelecionados.filter((id) =>
        equipamentos.some((equipamento) => equipamento.id === id)
      ),
    [equipamentos, equipamentosSelecionados]
  );

  const todosVisiveisSelecionados =
    equipamentosVisiveisIds.length > 0 &&
    equipamentosVisiveisIds.every((id) => equipamentosSelecionados.includes(id));

  useEffect(() => {
    setSetorSelecionadoId(TODOS);
    setBuscaEquipamento("");
    setEquipamentosSelecionados([]);
    setSetorDestinoNome("");
    setLocalDestino("");
  }, [empresaId]);

  useEffect(() => {
    setEquipamentosSelecionados((current) =>
      current.filter((id) => equipamentos.some((equipamento) => equipamento.id === id))
    );
  }, [equipamentos]);

  const criarSetorMutation = useMutation({
    mutationFn: (nome: string) =>
      setoresOrganizacaoService.criarSetor(empresaSelecionada!.id, nome),
    onSuccess: () => {
      setNovoSetor("");
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["planos"] });
      toast.success("Setor criado.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const moverEquipamentosMutation = useMutation({
    mutationFn: async () => {
      if (!empresaSelecionada?.id) {
        throw new Error("Selecione um cliente primeiro.");
      }

      if (equipamentosSelecionadosValidos.length === 0) {
        throw new Error("Selecione ao menos um equipamento.");
      }

      if (setorDestinoNome === SEM_SETOR) {
        return setoresOrganizacaoService.removerEquipamentosDoSetor(
          empresaSelecionada.id,
          equipamentosSelecionadosValidos
        );
      }

      const setorOficialId = setorIdPorNome.get(setorDestinoNome);
      if (!setorOficialId) {
        throw new Error("Selecione o setor de destino.");
      }

      return setoresOrganizacaoService.aplicarMapeamento({
        empresaId: empresaSelecionada.id,
        setorAtualOriginal: null,
        setorOficialId,
        localInstalacao: localDestino,
        equipamentoIds: equipamentosSelecionadosValidos,
      });
    },
    onSuccess: (quantidade) => {
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["planos"] });
      setEquipamentosSelecionados([]);
      setLocalDestino("");
      toast.success(`${quantidade} equipamento(s) atualizado(s).`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const limparSetoresVaziosMutation = useMutation({
    mutationFn: () =>
      setoresOrganizacaoService.limparSetoresVazios(empresaSelecionada!.id),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["planos"] });

      if (resultado.quantidade === 0) {
        toast.info("Nenhum setor vazio encontrado.");
        return;
      }

      toast.success(`${resultado.quantidade} setor(es) vazio(s) removido(s).`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const criarSetor = () => {
    if (!empresaSelecionada?.id) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }

    criarSetorMutation.mutate(novoSetor);
  };

  const limparSetoresVazios = () => {
    if (!empresaSelecionada?.id) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }

    if (setoresVazios.length === 0) {
      toast.info("Nenhum setor vazio encontrado para este cliente.");
      return;
    }

    const preview = setoresVazios
      .slice(0, 8)
      .map((setor) => `- ${setor.nome}`)
      .join("\n");
    const restantes =
      setoresVazios.length > 8
        ? `\n... e mais ${setoresVazios.length - 8} setor(es).`
        : "";
    const confirmado = window.confirm(
      `Remover ${setoresVazios.length} setor(es) sem equipamentos vinculados?\n\n${preview}${restantes}`
    );

    if (!confirmado) return;

    limparSetoresVaziosMutation.mutate();
  };

  const toggleEquipamento = (id: string) => {
    setEquipamentosSelecionados((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleTodosVisiveis = () => {
    setEquipamentosSelecionados((current) => {
      const currentSet = new Set(current);
      if (todosVisiveisSelecionados) {
        equipamentosVisiveisIds.forEach((id) => currentSet.delete(id));
      } else {
        equipamentosVisiveisIds.forEach((id) => currentSet.add(id));
      }
      return Array.from(currentSet);
    });
  };

  const selecionarSetor = (id: string) => {
    setSetorSelecionadoId(id);
    setEquipamentosSelecionados([]);
  };

  const abrirEquipamento = async (equipamento: EquipamentoSetorResumo) => {
    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(equipamento.id);
      setEquipamentoDetalhes(equipamentoCompleto);
      setEquipamentoDetalhesOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderSetorButton = (
    id: string,
    label: string,
    quantidade: number,
    description?: string,
    pendente?: boolean
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => selecionarSetor(id)}
      className={`w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/60 ${
        setorSelecionadoId === id ? "border-primary bg-primary/5" : "bg-background"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
        <Badge variant={pendente ? "outline" : "secondary"}>{quantidade}</Badge>
      </div>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      )}
    </button>
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={(open) => {
          setEquipamentoDetalhesOpen(open);
          if (!open) setEquipamentoDetalhes(null);
        }}
        equipamento={equipamentoDetalhes}
      />
      <PageHeader
        title="Organizar Setores"
        description="Revise os setores do cliente, confira os equipamentos vinculados e mova itens entre setores."
      >
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={!empresaSelecionada || isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[minmax(280px,420px)_1fr]">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <SearchableSelect
              value={empresaLabelSelecionada}
              onValueChange={(label) => {
                setEmpresaId(empresaIdPorLabel.get(label) || "");
              }}
              options={empresasOptions}
              placeholder={loadingEmpresas ? "Carregando clientes..." : "Selecione o cliente"}
              emptyText="Nenhum cliente encontrado."
            />
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Equipamentos</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : data?.totalEquipamentos ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Setores</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : data?.setores.length ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sem setor</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : totalSemSetor || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : totalPendentes || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {empresaSelecionada && isFetching && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando setores e equipamentos de {empresaSelecionada.nome}...
        </div>
      )}

      {empresaSelecionada && isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar setores: {getErrorMessage(error)}
        </div>
      )}

      {empresaSelecionada && (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Setores do cliente</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparSetoresVazios}
                  disabled={
                    isLoading ||
                    limparSetoresVaziosMutation.isPending ||
                    setoresVazios.length === 0
                  }
                  title="Remove setores sem equipamentos vinculados"
                >
                  {limparSetoresVaziosMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Limpar vazios
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={novoSetor}
                  onChange={(event) => setNovoSetor(event.target.value)}
                  placeholder="Novo setor"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") criarSetor();
                  }}
                />
                <Button
                  type="button"
                  onClick={criarSetor}
                  disabled={criarSetorMutation.isPending}
                  size="icon"
                  title="Adicionar setor"
                >
                  {criarSetorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                {renderSetorButton(TODOS, "Todos os equipamentos", equipamentos.length)}
                {renderSetorButton(
                  PENDENTES,
                  "Pendentes de organizacao",
                  totalPendentes,
                  "Sem setor oficial ou com texto diferente do setor oficial.",
                  true
                )}
                {renderSetorButton(
                  SEM_SETOR,
                  "Sem setor",
                  totalSemSetor,
                  "Equipamentos sem unidade vinculada.",
                  totalSemSetor > 0
                )}
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando setores...</p>
                ) : data?.setores.length ? (
                  data.setores.map((setor) =>
                    renderSetorButton(
                      setor.id,
                      setor.nome,
                      contagemPorSetor.get(setor.id) || 0,
                      [setor.cidade, setor.estado].filter(Boolean).join(" / ")
                    )
                  )
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    Nenhum setor cadastrado para este cliente.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">Equipamentos do setor</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {equipamentosFiltrados.length} equipamento(s) no filtro atual.
                  </p>
                </div>
                <div className="relative min-w-[280px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={buscaEquipamento}
                    onChange={(event) => setBuscaEquipamento(event.target.value)}
                    className="pl-8"
                    placeholder="Buscar equipamento, serie, patrimonio..."
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-md border bg-muted/20 p-3 lg:grid-cols-[1fr_220px_180px_auto]">
                <div className="space-y-2">
                  <Label>Mover selecionados para</Label>
                  <SearchableSelect
                    value={setorDestinoNome === SEM_SETOR ? "Sem setor" : setorDestinoNome}
                    onValueChange={(value) =>
                      setSetorDestinoNome(value === "Sem setor" ? SEM_SETOR : value)
                    }
                    options={["Sem setor", ...setorOptions]}
                    placeholder="Selecione o destino"
                    emptyText="Nenhum setor encontrado."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local/Sala</Label>
                  <Input
                    value={localDestino}
                    onChange={(event) => setLocalDestino(event.target.value)}
                    placeholder="Opcional"
                    disabled={setorDestinoNome === SEM_SETOR}
                  />
                </div>
                <div className="flex items-end text-sm text-muted-foreground">
                  {equipamentosSelecionadosValidos.length} equipamento(s) selecionado(s)
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => moverEquipamentosMutation.mutate()}
                    disabled={
                      moverEquipamentosMutation.isPending ||
                      equipamentosSelecionadosValidos.length === 0 ||
                      !setorDestinoNome
                    }
                    className="w-full"
                  >
                    {moverEquipamentosMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : setorDestinoNome === SEM_SETOR ? (
                      <Unlink className="mr-2 h-4 w-4" />
                    ) : (
                      <MoveRight className="mr-2 h-4 w-4" />
                    )}
                    Aplicar
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={todosVisiveisSelecionados}
                          onCheckedChange={toggleTodosVisiveis}
                          aria-label="Selecionar equipamentos visiveis"
                        />
                      </TableHead>
                      <SortableHead
                        column="numero"
                        currentColumn={sortColumn}
                        direction={sortDirection}
                        onSort={ordenarPor}
                        className="w-[80px]"
                      >
                        N
                      </SortableHead>
                      <SortableHead
                        column="equipamento"
                        currentColumn={sortColumn}
                        direction={sortDirection}
                        onSort={ordenarPor}
                      >
                        Equipamento
                      </SortableHead>
                      <SortableHead
                        column="identificacao"
                        currentColumn={sortColumn}
                        direction={sortDirection}
                        onSort={ordenarPor}
                      >
                        Identificacao
                      </SortableHead>
                      <SortableHead
                        column="setor"
                        currentColumn={sortColumn}
                        direction={sortDirection}
                        onSort={ordenarPor}
                      >
                        Setor atual
                      </SortableHead>
                      <SortableHead
                        column="status"
                        currentColumn={sortColumn}
                        direction={sortDirection}
                        onSort={ordenarPor}
                      >
                        Status
                      </SortableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Carregando equipamentos...
                        </TableCell>
                      </TableRow>
                    ) : equipamentosFiltrados.length ? (
                      equipamentosFiltrados.map((equipamento) => {
                        const setorOficial = equipamento.empresa_setor_id
                          ? setoresPorId.get(equipamento.empresa_setor_id)
                          : null;
                        const pendente = isEquipamentoPendente(equipamento);
                        const checked = equipamentosSelecionados.includes(equipamento.id);

                        return (
                          <TableRow key={equipamento.id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleEquipamento(equipamento.id)}
                                aria-label={`Selecionar equipamento ${formatNumero(
                                  equipamento.numero_cadastro
                                )}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatNumero(equipamento.numero_cadastro)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  className="text-left font-medium text-primary hover:underline"
                                  onClick={() => void abrirEquipamento(equipamento)}
                                >
                                  {setoresOrganizacaoService.montarDescricaoEquipamento(
                                    equipamento
                                  )}
                                </button>
                                <p className="text-xs text-muted-foreground">
                                  {[equipamento.fabricante, equipamento.modelo]
                                    .filter(Boolean)
                                    .join(" | ") || "-"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <p>Serie: {equipamento.numero_serie || "-"}</p>
                                <p>Patrimonio: {equipamento.patrimonio || "-"}</p>
                                <p>TAG: {equipamento.tag || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {pendente ? (
                                    <Badge variant="outline">Pendente</Badge>
                                  ) : (
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                      Organizado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium">
                                  {setorOficial?.nome || equipamento.setor || "Sem setor"}
                                </p>
                                {equipamento.local_instalacao && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {equipamento.local_instalacao}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={equipamento.ativo ? "secondary" : "outline"}>
                                {equipamento.ativo ? equipamento.status || "Ativo" : "Desativado"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Nenhum equipamento encontrado para o setor e busca atuais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const SortableHead = ({
  column,
  currentColumn,
  direction,
  onSort,
  children,
  className,
}: {
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  children: ReactNode;
  className?: string;
}) => {
  const active = column === currentColumn;

  return (
    <TableHead className={className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 px-3 text-xs font-medium"
        onClick={() => onSort(column)}
      >
        {children}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="ml-1 h-3.5 w-3.5" />
          )
        ) : null}
      </Button>
    </TableHead>
  );
};

export default OrganizarSetores;

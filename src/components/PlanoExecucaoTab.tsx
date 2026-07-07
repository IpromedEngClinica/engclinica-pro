import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, Search } from "lucide-react";
import CalibracaoExecucaoFormDialog from "@/components/CalibracaoExecucaoFormDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import PlanoNaoLocalizadoDialog from "@/components/PlanoNaoLocalizadoDialog";
import PlanoResultadoLoteDialog from "@/components/PlanoResultadoLoteDialog";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import SortableTableHeader from "@/components/SortableTableHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAbrirPreventivaItem,
  useCancelarEquipamentosNoCiclo,
  useConcluirItemCicloCalibracao,
  useCriarOuBuscarCalibracaoParaItem,
  useFinalizarPreventivasConformesEmLote,
  useMarcarEquipamentosNaoLocalizados,
  usePlanoCicloAtual,
  usePlanoCicloItens,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import type {
  PlanoCicloItem,
  PlanoTipoServico,
  ProgressoFinalizacaoPreventivasLote,
  ResultadoCancelamentoItensCiclo,
  ResultadoFinalizacaoPreventivasLote,
  ResultadoNaoLocalizados,
} from "@/services/planosService";
import { formatDateTimeValue } from "@/utils/planoDatas";
import type { SortDirection } from "@/utils/sortUtils";

type Props = {
  planoId: string;
  onNovoCiclo?: () => void;
};

type SetorOpcao = {
  id: string;
  label: string;
  ordem: number;
};

type SortField =
  | "ordem"
  | "equipamento"
  | "numero_serie"
  | "patrimonio"
  | "abertura"
  | "previsao"
  | "status"
  | "documento";

const TODOS = "todos";
const SEM_SETOR = "sem-setor";
const pageSizes = ["10", "25", "50", "todos"];
const statusOperacionais = ["pendente", "aberto"];
const statusOptions = [
  ["operacionais", "Pendentes e abertos"],
  ["concluido", "Concluidos"],
  ["cancelado", "Cancelados"],
  ["nao_localizado", "Nao localizados"],
  ["todos", "Todos"],
] as const;
const servicos: Array<{ value: PlanoTipoServico; label: string }> = [
  { value: "preventiva", label: "M. Preventivas" },
  { value: "calibracao", label: "Calibracoes" },
  { value: "seguranca_eletrica", label: "T. Seguranca Eletrica" },
];

const equipamentoNome = (item: PlanoCicloItem) =>
  [
    item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento",
    item.equipamento?.fabricante,
    item.equipamento?.modelo,
  ].filter(Boolean).join(" - ");

const textoBusca = (item: PlanoCicloItem) =>
  [
    equipamentoNome(item),
    item.equipamento?.numero_serie,
    item.equipamento?.patrimonio,
    item.equipamento?.tag,
  ].filter(Boolean).join(" ").toLowerCase();

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  aberto: "Aberto",
  concluido: "Concluido",
  cancelado: "Cancelado",
  nao_localizado: "Nao localizado",
};

const compareText = (a: string | null | undefined, b: string | null | undefined) =>
  (a || "").localeCompare(b || "", "pt-BR", { numeric: true, sensitivity: "base" });

const PlanoExecucaoTab = ({ planoId, onNovoCiclo }: Props) => {
  const { data: ciclo, isLoading: loadingCiclo } = usePlanoCicloAtual(planoId);
  const { data: itensQuery = [], isLoading: loadingItens } = usePlanoCicloItens(ciclo?.id);
  const abrirPreventiva = useAbrirPreventivaItem();
  const abrirCalibracao = useCriarOuBuscarCalibracaoParaItem();
  const concluirCalibracao = useConcluirItemCicloCalibracao();
  const finalizarConformes = useFinalizarPreventivasConformesEmLote();
  const marcarNaoLocalizados = useMarcarEquipamentosNaoLocalizados();
  const cancelarEquipamentos = useCancelarEquipamentosNoCiclo();
  const itens = useMemo(
    () => itensQuery.length ? itensQuery : ciclo?.itens || [],
    [ciclo?.itens, itensQuery]
  );
  const [setor, setSetor] = useState(TODOS);
  const [servico, setServico] = useState<PlanoTipoServico>("preventiva");
  const [statusFiltro, setStatusFiltro] = useState("operacionais");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [sortField, setSortField] = useState<SortField>("ordem");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistOsId, setChecklistOsId] = useState<string | null>(null);
  const [checklistItemId, setChecklistItemId] = useState<string | null>(null);
  const [calibracaoOpen, setCalibracaoOpen] = useState(false);
  const [calibracaoExecucao, setCalibracaoExecucao] = useState<CalibracaoExecucao | null>(null);
  const [calibracaoItemId, setCalibracaoItemId] = useState<string | null>(null);
  const [naoLocalizadoOpen, setNaoLocalizadoOpen] = useState(false);
  const [resultadoOpen, setResultadoOpen] = useState(false);
  const [resultadoTitulo, setResultadoTitulo] = useState("");
  const [resultadoLote, setResultadoLote] =
    useState<ResultadoFinalizacaoPreventivasLote | ResultadoNaoLocalizados | ResultadoCancelamentoItensCiclo | null>(null);
  const [equipamentoDetalhes, setEquipamentoDetalhes] =
    useState<EquipamentoSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [progressoFinalizacao, setProgressoFinalizacao] =
    useState<ProgressoFinalizacaoPreventivasLote | null>(null);

  useEffect(() => {
    setSelecionados(new Set());
  }, [setor, servico, search, pageSize, ciclo?.id, statusFiltro]);

  const setores = useMemo(() => {
    const map = new Map<string, SetorOpcao>();
    itens.forEach((item) => {
      if (!item.ciclo_setor_id) return;
      map.set(item.ciclo_setor_id, {
        id: item.ciclo_setor_id,
        label: item.setor?.nome_snapshot || "Setor",
        ordem: item.setor?.ordem ?? 999999,
      });
    });
    const list = Array.from(map.values()).sort((a, b) =>
      a.ordem === b.ordem ? a.label.localeCompare(b.label) : a.ordem - b.ordem
    );
    if (itens.some((item) => !item.ciclo_setor_id)) {
      list.push({ id: SEM_SETOR, label: "Sem setor", ordem: 999999 });
    }
    return list;
  }, [itens]);

  const filtradosPorSetor = useMemo(() => itens.filter((item) =>
    setor === TODOS || (setor === SEM_SETOR ? !item.ciclo_setor_id : item.ciclo_setor_id === setor)
  ), [itens, setor]);

  const filtradosPorStatus = useMemo(() => filtradosPorSetor.filter((item) => {
    if (statusFiltro === "todos") return true;
    if (statusFiltro === "operacionais") return statusOperacionais.includes(item.status);
    return item.status === statusFiltro;
  }), [filtradosPorSetor, statusFiltro]);

  const contadores = useMemo(() => Object.fromEntries(
    servicos.map((item) => [
      item.value,
      filtradosPorStatus.filter((cicloItem) => cicloItem.tipo_servico === item.value).length,
    ])
  ) as Record<PlanoTipoServico, number>, [filtradosPorStatus]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ordemOriginal = new Map(filtradosPorStatus.map((item, index) => [item.id, index]));

    const getSortValue = (item: PlanoCicloItem) => {
      if (sortField === "ordem") return ordemOriginal.get(item.id) ?? 0;
      if (sortField === "equipamento") return equipamentoNome(item);
      if (sortField === "numero_serie") return item.equipamento?.numero_serie || "";
      if (sortField === "patrimonio") return item.equipamento?.patrimonio || "";
      if (sortField === "abertura") return item.aberto_em || ciclo?.data_abertura || "";
      if (sortField === "previsao") return ciclo?.data_fechamento_prevista || "";
      if (sortField === "status") return statusLabel[item.status] || item.status;
      if (sortField === "documento") {
        if (item.os_id) return "OS vinculada";
        if (item.calibracao_execucao_id) return "Certificado vinculado";
        return "";
      }
      return "";
    };

    return filtradosPorStatus
      .filter((item) =>
        item.tipo_servico === servico && (!q || textoBusca(item).includes(q))
      )
      .sort((a, b) => {
        const valueA = getSortValue(a);
        const valueB = getSortValue(b);
        const compare = typeof valueA === "number" && typeof valueB === "number"
          ? valueA - valueB
          : compareText(String(valueA), String(valueB));
        if (compare !== 0) return sortDirection === "asc" ? compare : -compare;
        return (ordemOriginal.get(a.id) ?? 0) - (ordemOriginal.get(b.id) ?? 0);
      });
  }, [ciclo?.data_abertura, ciclo?.data_fechamento_prevista, filtradosPorStatus, search, servico, sortDirection, sortField]);

  const handleSort = (field: string) => {
    const nextField = field as SortField;
    if (sortField === nextField) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(nextField);
    setSortDirection("asc");
  };

  const visiveis = pageSize === "todos" ? filtrados : filtrados.slice(0, Number(pageSize));
  const todosVisiveisSelecionados = visiveis.length > 0 && visiveis.every((item) => selecionados.has(item.id));
  const itensSelecionadosVisiveis = visiveis.filter((item) => selecionados.has(item.id));
  const preventivasSelecionadasValidas = itensSelecionadosVisiveis.filter((item) =>
    item.tipo_servico === "preventiva" && statusOperacionais.includes(item.status)
  );
  const naoLocalizadosSelecionadosValidos = itensSelecionadosVisiveis.filter((item) =>
    item.status === "pendente" && !item.os_id && !item.calibracao_execucao_id
  );
  const equipamentosNaoLocalizadosValidos = Array.from(new Set(
    naoLocalizadosSelecionadosValidos.map((item) => item.equipamento_id)
  ));
  const cancelamentosSelecionadosValidos = itensSelecionadosVisiveis.filter((item) =>
    item.status === "pendente" && !item.os_id && !item.calibracao_execucao_id
  );
  const equipamentosCancelamentoValidos = Array.from(new Set(
    cancelamentosSelecionadosValidos.map((item) => item.equipamento_id)
  ));
  const mutacaoLotePendente = abrirPreventiva.isPending ||
    finalizarConformes.isPending ||
    marcarNaoLocalizados.isPending ||
    cancelarEquipamentos.isPending;

  const toggleTodos = (checked: boolean) => {
    setSelecionados((current) => {
      const next = new Set(current);
      visiveis.forEach((item) => checked ? next.add(item.id) : next.delete(item.id));
      return next;
    });
  };

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelecionados((current) => {
      const next = new Set(current);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const handlePlay = async (item: PlanoCicloItem) => {
    if (!statusOperacionais.includes(item.status)) {
      toast({ title: statusLabel[item.status] || "Item nao acionavel" });
      return;
    }
    if (item.tipo_servico === "calibracao") {
      try {
        const resultado = await abrirCalibracao.mutateAsync(item.id);
        setCalibracaoExecucao(resultado.execucao);
        setCalibracaoItemId(resultado.item.id);
        setCalibracaoOpen(true);
        toast({
          title: item.calibracao_execucao_id
            ? "Calibracao aberta."
            : "Rascunho de calibracao criado.",
        });
      } catch (error) {
        toast({
          title: "Erro ao abrir calibracao",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      }
      return;
    }
    if (item.tipo_servico === "seguranca_eletrica") {
      toast({ title: "Modulo de Teste de Seguranca Eletrica em desenvolvimento." });
      return;
    }
    try {
      const resultado = await abrirPreventiva.mutateAsync(item.id);
      setChecklistOsId(resultado.os.id);
      setChecklistItemId(resultado.item.id);
      setChecklistOpen(true);
      toast({
        title: item.os_id ? "OS preventiva aberta." : "OS preventiva criada.",
        description: `OS ${resultado.os.numero} vinculada ao ciclo.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao abrir preventiva",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirSelecionadas = async () => {
    const itensParaAbrir = visiveis.filter((item) => selecionados.has(item.id) && item.tipo_servico === "preventiva" && statusOperacionais.includes(item.status));
    let sucesso = 0;
    let falhas = 0;

    for (const item of itensParaAbrir) {
      try {
        await abrirPreventiva.mutateAsync(item.id);
        sucesso += 1;
      } catch (error) {
        falhas += 1;
        console.error("Erro ao abrir preventiva selecionada:", error);
      }
    }

    setSelecionados(new Set());
    toast({
      title: "Abertura de OS concluida.",
      description: `${sucesso} aberta(s). ${falhas} falha(s).`,
      variant: falhas ? "destructive" : "default",
    });
  };

  const finalizarSelecionadasComoConformes = async () => {
    if (!ciclo || !preventivasSelecionadasValidas.length) return;

    const total = preventivasSelecionadasValidas.length;
    setProgressoFinalizacao({
      processados: 0,
      total,
      equipamentoDescricao: null,
      resultado: "finalizado",
    });

    try {
      const resultado = await finalizarConformes.mutateAsync({
        itemIds: preventivasSelecionadasValidas.map((item) => item.id),
        cicloId: ciclo.id,
        planoId,
        dataFechamento: ciclo.data_fechamento_prevista,
        dataReferenciaValidade: ciclo.data_abertura,
        onProgress: setProgressoFinalizacao,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setSelecionados(new Set());
      setResultadoTitulo("Preventivas finalizadas como conformes");
      setResultadoLote(resultado);
      setResultadoOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao finalizar preventivas",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setProgressoFinalizacao(null);
    }
  };

  const abrirEquipamento = async (item: PlanoCicloItem) => {
    try {
      const equipamento = await equipamentosService.buscarPorId(
        item.equipamento_id
      );
      setEquipamentoDetalhes(equipamento);
      setEquipamentoDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const confirmarNaoLocalizados = async (observacao: string) => {
    if (!ciclo || !equipamentosNaoLocalizadosValidos.length) return;
    try {
      const resultado = await marcarNaoLocalizados.mutateAsync({
        cicloId: ciclo.id,
        planoId,
        equipamentoIds: equipamentosNaoLocalizadosValidos,
        observacao,
      });
      setSelecionados(new Set());
      setNaoLocalizadoOpen(false);
      setResultadoTitulo("Equipamentos marcados como nao localizados");
      setResultadoLote(resultado);
      setResultadoOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao marcar nao localizado",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const cancelarSelecionados = async () => {
    if (!ciclo || !equipamentosCancelamentoValidos.length) return;

    const confirmado = window.confirm(
      `Cancelar a execucao de ${equipamentosCancelamentoValidos.length} equipamento(s) selecionado(s)? Esta acao nao cria OS e remove estes itens dos relatorios do ciclo.`
    );
    if (!confirmado) return;

    try {
      const resultado = await cancelarEquipamentos.mutateAsync({
        cicloId: ciclo.id,
        planoId,
        equipamentoIds: equipamentosCancelamentoValidos,
      });
      setSelecionados(new Set());
      setResultadoTitulo("Execucoes canceladas");
      setResultadoLote(resultado);
      setResultadoOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao cancelar execucao",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (loadingCiclo) {
    return <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">Carregando execucao...</div>;
  }

  if (!ciclo) {
    return (
      <div className="rounded-lg border bg-card p-8">
        <h2 className="font-semibold">Nenhum ciclo aberto.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Crie um novo ciclo para iniciar a execucao.</p>
        <Button className="mt-4" onClick={onNovoCiclo}>Novo ciclo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PreventivaChecklistDialog
        open={checklistOpen}
        onOpenChange={(value) => {
          setChecklistOpen(value);
          if (!value) {
            setChecklistOsId(null);
            setChecklistItemId(null);
          }
        }}
        osExistenteId={checklistOsId}
        planoCicloItemId={checklistItemId}
        dataFechamentoPrevista={ciclo.data_fechamento_prevista}
        dataReferenciaValidade={ciclo.data_abertura}
        modo="usar_os_existente"
      />
      <CalibracaoExecucaoFormDialog
        open={calibracaoOpen}
        onOpenChange={(value) => {
          setCalibracaoOpen(value);
          if (!value) {
            setCalibracaoExecucao(null);
            setCalibracaoItemId(null);
          }
        }}
        execucao={calibracaoExecucao}
        planoCicloItemId={calibracaoItemId}
        onSaved={(execucao) => setCalibracaoExecucao(execucao)}
        onFinalizada={async (execucao) => {
          if (!calibracaoItemId) return;
          try {
            await concluirCalibracao.mutateAsync({
              itemId: calibracaoItemId,
              execucaoId: execucao.id,
            });
            toast({ title: "Item de calibracao concluido no ciclo." });
          } catch (error) {
            toast({
              title: "Calibracao salva, mas o item do ciclo nao foi concluido",
              description: error instanceof Error ? error.message : "Erro inesperado.",
              variant: "destructive",
            });
          }
        }}
      />
      <PlanoNaoLocalizadoDialog
        open={naoLocalizadoOpen}
        onOpenChange={setNaoLocalizadoOpen}
        quantidade={equipamentosNaoLocalizadosValidos.length}
        loading={marcarNaoLocalizados.isPending}
        onConfirmar={confirmarNaoLocalizados}
      />
      <PlanoResultadoLoteDialog
        open={resultadoOpen}
        onOpenChange={setResultadoOpen}
        titulo={resultadoTitulo}
        resultado={resultadoLote}
      />
      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={(open) => {
          setEquipamentoDetalhesOpen(open);
          if (!open) setEquipamentoDetalhes(null);
        }}
        equipamento={equipamentoDetalhes}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="font-semibold">{ciclo.titulo}</h2>
          <p className="text-sm text-muted-foreground">
            {filtradosPorSetor.filter((item) => statusOperacionais.includes(item.status)).length} item(ns) restantes. Previsao: {ciclo.data_prevista}
          </p>
        </div>
        <Badge variant="outline">{statusLabel[ciclo.status]}</Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" variant={setor === TODOS ? "default" : "outline"} onClick={() => setSetor(TODOS)}>
          Todos os setores
        </Button>
        {setores.map((item) => (
          <Button key={item.id} size="sm" variant={setor === item.id ? "default" : "outline"} onClick={() => setSetor(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {servicos.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={servico === item.value ? "default" : "outline"}
            onClick={() => setServico(item.value)}
          >
            {item.label} ({contadores[item.value] || 0})
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={servico !== "preventiva" || selecionados.size === 0 || mutacaoLotePendente} onClick={abrirSelecionadas}>
              Abrir OS selecionadas
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={servico !== "preventiva" || preventivasSelecionadasValidas.length === 0 || mutacaoLotePendente}
              onClick={finalizarSelecionadasComoConformes}
            >
              {finalizarConformes.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {finalizarConformes.isPending
                ? "Finalizando preventivas..."
                : "Finalizar selecionadas como conformes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={equipamentosNaoLocalizadosValidos.length === 0 || mutacaoLotePendente}
              onClick={() => setNaoLocalizadoOpen(true)}
            >
              Marcar como nao localizado
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={equipamentosCancelamentoValidos.length === 0 || mutacaoLotePendente}
              onClick={cancelarSelecionados}
            >
              {cancelarEquipamentos.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancelar execução
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="min-w-72 pl-9" placeholder="Buscar equipamento, NS, patrimonio ou TAG" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizes.map((item) => <SelectItem key={item} value={item}>{item === "todos" ? "Todos" : item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {progressoFinalizacao && (
          <div
            className="space-y-3 border-b bg-muted/20 px-4 py-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  Finalizando preventivas selecionadas
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {progressoFinalizacao.processados} de {progressoFinalizacao.total}
              </span>
            </div>
            <Progress
              value={
                progressoFinalizacao.total
                  ? (progressoFinalizacao.processados /
                      progressoFinalizacao.total) *
                    100
                  : 0
              }
              className="h-2"
            />
            <p className="truncate text-xs text-muted-foreground">
              {progressoFinalizacao.equipamentoDescricao
                ? `${progressoFinalizacao.resultado === "finalizado" ? "Concluído" : "Ignorado"}: ${progressoFinalizacao.equipamentoDescricao}`
                : "Preparando o processamento..."}
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <Th><Checkbox checked={todosVisiveisSelecionados} onCheckedChange={(value) => toggleTodos(Boolean(value))} /></Th>
                <Th>Play</Th>
                <Th><SortableTableHeader label="#" sortField="ordem" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Equipamento" sortField="equipamento" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="N Serie" sortField="numero_serie" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Patrimonio" sortField="patrimonio" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Abertura" sortField="abertura" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Previsao" sortField="previsao" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Status" sortField="status" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
                <Th><SortableTableHeader label="Documento" sortField="documento" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              </tr>
            </thead>
            <tbody>
              {loadingItens && <tr><Td>Carregando itens...</Td></tr>}
              {!loadingItens && visiveis.map((item, index) => (
                <tr key={item.id} className="border-t">
                  <Td><Checkbox checked={selecionados.has(item.id)} onCheckedChange={(value) => toggleItem(item.id, Boolean(value))} /></Td>
                  <Td>
                    <Button size="icon" variant="ghost" onClick={() => handlePlay(item)} disabled={abrirPreventiva.isPending || abrirCalibracao.isPending || !statusOperacionais.includes(item.status)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  </Td>
                  <Td>{index + 1}</Td>
                  <Td>
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => void abrirEquipamento(item)}
                    >
                      {equipamentoNome(item)}
                    </button>
                    <p className="text-xs text-muted-foreground">{item.setor?.nome_snapshot || "Sem setor"}</p>
                  </Td>
                  <Td>{item.equipamento?.numero_serie || "-"}</Td>
                  <Td>{item.equipamento?.patrimonio || "-"}</Td>
                  <Td>{formatDateTimeValue(ciclo.data_abertura)}</Td>
                  <Td>{formatDateTimeValue(ciclo.data_fechamento_prevista)}</Td>
                  <Td><Badge variant="outline">{statusLabel[item.status]}</Badge></Td>
                  <Td>{item.os_id ? "OS vinculada" : item.calibracao_execucao_id ? "Certificado vinculado" : "-"}</Td>
                </tr>
              ))}
              {!loadingItens && !visiveis.length && <tr><Td>Nenhum item encontrado.</Td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoExecucaoTab;

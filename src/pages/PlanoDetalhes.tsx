import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus, CheckCircle2, ChevronDown, Pencil, Play, Settings2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PlanoCancelarItensDialog from "@/components/PlanoCancelarItensDialog";
import PlanoEstruturaSection from "@/components/PlanoEstruturaSection";
import PlanoFilaCalibracoesDialog from "@/components/PlanoFilaCalibracoesDialog";
import PlanoFilaPreventivasDialog from "@/components/PlanoFilaPreventivasDialog";
import PlanoFinalizarPreventivasDialog from "@/components/PlanoFinalizarPreventivasDialog";
import PlanoResultadoPreventivasDialog from "@/components/PlanoResultadoPreventivasDialog";
import PlanoFormDialog from "@/components/PlanoFormDialog";
import PlanoSetorEquipamentosDialog from "@/components/PlanoSetorEquipamentosDialog";
import PlanoVisitaFormDialog from "@/components/PlanoVisitaFormDialog";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  useAbrirCalibracoesEmLote,
  useAbrirPreventivasEmLote,
  useCancelarItensVisitaEmLote,
  useConcluirVisitaPlano,
  useCriarOuAbrirCalibracaoItem,
  useCriarOuAbrirOsPreventivaItem,
  useFinalizarPreventivasConformesEmLote,
  usePlano,
  useVisitasPlano,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { PlanoExecucao, PlanoExecucaoItem, PlanoItemStatus, PlanoTipoServico, ResultadoFinalizacaoPreventivasLote } from "@/services/planosService";
import { getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";

const ALL = "__all__";
const SEM_SETOR = "__sem_setor__";
const servicoLabel: Record<PlanoTipoServico, string> = {
  preventiva: "M. Preventivas",
  calibracao: "Calibracoes",
  seguranca_eletrica: "T. Seguranca Eletrica",
};
const statusLabel: Record<PlanoItemStatus, string> = {
  pendente: "Pendente",
  aberto: "Aberto",
  em_execucao: "Em execucao",
  concluido: "Concluido",
  cancelado: "Cancelado",
};
const formatDate = (value?: string | null) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const equipamentoLabel = (item?: PlanoExecucaoItem) =>
  [
    item?.equipamento?.tipo_equipamento?.nome || item?.equipamento?.tipo_texto || "Equipamento",
    item?.equipamento?.fabricante,
    item?.equipamento?.modelo,
    item?.equipamento?.numero_serie ? `NS ${item.equipamento.numero_serie}` : null,
  ].filter(Boolean).join(" - ");

const PlanoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: plano, isLoading, isError, error } = usePlano(id);
  const { data: visitas = [] } = useVisitasPlano(id);
  const concluirVisita = useConcluirVisitaPlano();
  const abrirPreventivas = useAbrirPreventivasEmLote();
  const abrirPreventivaItem = useCriarOuAbrirOsPreventivaItem();
  const finalizarPreventivas = useFinalizarPreventivasConformesEmLote();
  const abrirCalibracoes = useAbrirCalibracoesEmLote();
  const abrirCalibracaoItem = useCriarOuAbrirCalibracaoItem();
  const cancelarItens = useCancelarItensVisitaEmLote();
  const [visitaId, setVisitaId] = useState("");
  const [servico, setServico] = useState<PlanoTipoServico>("preventiva");
  const [setor, setSetor] = useState(ALL);
  const [search, setSearch] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageSetorId, setManageSetorId] = useState<string | null | undefined>(null);
  const [planoFormOpen, setPlanoFormOpen] = useState(false);
  const [visitaFormOpen, setVisitaFormOpen] = useState(false);
  const [editingVisita, setEditingVisita] = useState<PlanoExecucao | null>(null);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [finalizarPreventivasOpen, setFinalizarPreventivasOpen] = useState(false);
  const [resultadoPreventivas, setResultadoPreventivas] = useState<ResultadoFinalizacaoPreventivasLote | null>(null);
  const [filaPreventiva, setFilaPreventiva] = useState<PlanoExecucaoItem[]>([]);
  const [filaCalibracao, setFilaCalibracao] = useState<PlanoExecucaoItem[]>([]);

  const visitaAtiva = useMemo(() => visitas.find((item) => ["aberta", "em_execucao"].includes(item.status)), [visitas]);
  const visita = useMemo(() => visitas.find((item) => item.id === visitaId) || visitaAtiva || null, [visitaAtiva, visitaId, visitas]);
  const visitasHistoricas = useMemo(() => visitas.filter((item) => ["concluida", "cancelada"].includes(item.status)), [visitas]);
  const setores = useMemo(() => plano?.setores || [], [plano?.setores]);
  const itens = useMemo(() => visita?.itens || [], [visita?.itens]);
  const visitaEditavel = Boolean(visita && !["concluida", "cancelada"].includes(visita.status));
  const itensServico = useMemo(() => itens.filter((item) => item.tipo_servico === servico), [itens, servico]);
  const setoresOperacao = useMemo(() => {
    if (plano?.modo_organizacao === "unidade_inteira") return [{ id: SEM_SETOR, nome: "Todos os equipamentos da unidade" }];
    const comItens = new Set(itens.map((item) => item.setor_id).filter(Boolean) as string[]);
    const lista = setores.filter((item) => comItens.size ? comItens.has(item.id) : true).map((item) => ({ id: item.id, nome: item.nome }));
    if (!itens.length || itens.some((item) => !item.setor_id)) lista.push({ id: SEM_SETOR, nome: "Sem setor" });
    return lista.length ? lista : [{ id: SEM_SETOR, nome: "Sem setor" }];
  }, [itens, plano?.modo_organizacao, setores]);
  const filtered = useMemo(() => itensServico.filter((item) => {
    const texto = [equipamentoLabel(item), item.equipamento?.patrimonio, item.equipamento?.tag, item.setor?.nome].filter(Boolean).join(" ").toLowerCase();
    return (setor === ALL || (setor === SEM_SETOR ? !item.setor_id : item.setor_id === setor)) &&
      (!search.trim() || texto.includes(search.trim().toLowerCase()));
  }), [itensServico, search, setor]);
  const finalizados = itens.filter((item) => ["concluido", "cancelado"].includes(item.status)).length;
  const progresso = itens.length ? Math.round((finalizados / itens.length) * 100) : 0;

  useEffect(() => {
    if (!visitaId && visitaAtiva) setVisitaId(visitaAtiva.id);
  }, [visitaAtiva, visitaId]);
  useEffect(() => {
    if (!setoresOperacao.some((item) => item.id === setor)) {
      setSetor(setoresOperacao[0]?.id || SEM_SETOR);
    }
  }, [setor, setoresOperacao]);
  useEffect(() => setSelecionados([]), [servico, setor, visitaId]);

  if (isLoading) return <div className="p-8">Carregando plano...</div>;
  if (isError || !plano) return <div className="p-8 text-destructive">{error?.message || "Plano nao encontrado."}</div>;

  const executar = async (acao: "abrir" | "finalizar" | "cancelar") => {
    if (!selecionados.length) return;
    try {
      if (acao === "cancelar") return setCancelarOpen(true);
      if (acao === "finalizar") return setFinalizarPreventivasOpen(true);
      const resultado = servico === "preventiva"
        ? await abrirPreventivas.mutateAsync(selecionados)
        : servico === "calibracao" && acao === "abrir"
          ? await abrirCalibracoes.mutateAsync(selecionados)
          : null;
      if (!resultado) {
        toast({ title: "Modulo de seguranca eletrica em desenvolvimento." });
        return;
      }
      toast({ title: `${resultado.processados} item(ns) processado(s).`, description: resultado.ignorados.length ? `${resultado.ignorados.length} item(ns) ignorado(s).` : undefined });
      setSelecionados([]);
    } catch (err) {
      erro("Nao foi possivel processar os itens", err);
    }
  };
  const confirmarCancelamento = async (motivo: string) => {
    try {
      const resultado = await cancelarItens.mutateAsync({ ids: selecionados, motivo });
      toast({ title: `${resultado.processados} item(ns) cancelado(s).` });
      setSelecionados([]);
    } catch (err) {
      erro("Nao foi possivel cancelar os itens", err);
      throw err;
    }
  };
  const confirmarFinalizacaoPreventivas = async () => {
    try {
      if (!visita) return;
      const resultado = await finalizarPreventivas.mutateAsync({ ids: selecionados, visitaId: visita.id });
      const motivos = resultado.ignorados.reduce((map, item) => map.set(item.motivo, (map.get(item.motivo) || 0) + 1), new Map<string, number>());
      const resumoMotivos = Array.from(motivos).map(([motivo, total]) => `${total}x ${motivo}`).join(" ");
      toast({ title: `${resultado.totalFinalizados} preventiva(s) finalizada(s).`, description: resultado.totalIgnorados ? `${resultado.totalIgnorados} item(ns) ignorado(s). ${resumoMotivos}` : undefined });
      setResultadoPreventivas(resultado);
      setSelecionados([]);
      setFinalizarPreventivasOpen(false);
    } catch (err) {
      erro("Nao foi possivel finalizar as preventivas", err);
    }
  };
  const play = async (item: PlanoExecucaoItem) => {
    try {
      if (servico === "preventiva") {
        const aberto = await abrirPreventivaItem.mutateAsync(item.id);
        setFilaPreventiva([aberto]);
      } else if (servico === "calibracao") {
        const aberta = await abrirCalibracaoItem.mutateAsync(item.id);
        setFilaCalibracao([aberta]);
      } else {
        toast({ title: "Modulo de seguranca eletrica em desenvolvimento." });
      }
    } catch (err) {
      erro("Nao foi possivel abrir o item", err);
    }
  };
  const concluir = async () => {
    if (!visita) return;
    try {
      await concluirVisita.mutateAsync(visita.id);
      toast({ title: "Visita concluida e proxima recorrencia calculada." });
      setVisitaId("");
    } catch (err) {
      erro("Nao foi possivel concluir a visita", err);
    }
  };
  const selecionaveis = filtered.filter((item) => !["concluido", "cancelado"].includes(item.status));
  const todosMarcados = selecionaveis.length > 0 && selecionaveis.every((item) => selecionados.includes(item.id));

  return <div className="p-6 lg:p-8">
    <PageHeader title={plano.titulo} description={plano.empresa?.nome_fantasia || plano.empresa?.nome || ""}>
      <Button variant="outline" onClick={() => navigate("/planos")}><ArrowLeft className="mr-2 h-4 w-4" />Planos</Button>
      <Button variant="outline" onClick={() => setPlanoFormOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar plano</Button>
      <Button variant="outline" onClick={() => { setManageSetorId(null); setManageOpen(true); }}><Settings2 className="mr-2 h-4 w-4" />Estrutura</Button>
      <Button disabled={Boolean(visitaAtiva)} onClick={() => { setEditingVisita(null); setVisitaFormOpen(true); }}><CalendarPlus className="mr-2 h-4 w-4" />Nova visita</Button>
    </PageHeader>
    <PlanoFormDialog open={planoFormOpen} onOpenChange={setPlanoFormOpen} plano={plano} />
    <PlanoSetorEquipamentosDialog open={manageOpen} onOpenChange={setManageOpen} plano={plano} setorId={manageSetorId} />
    <PlanoVisitaFormDialog open={visitaFormOpen} onOpenChange={setVisitaFormOpen} planoId={plano.id} execucao={editingVisita} onSaved={(saved) => setVisitaId(saved.id)} />
    {visita && <><PlanoFilaPreventivasDialog open={filaPreventiva.length > 0} onOpenChange={(open) => !open && setFilaPreventiva([])} visita={visita} itens={filaPreventiva} /><PlanoFilaCalibracoesDialog open={filaCalibracao.length > 0} onOpenChange={(open) => !open && setFilaCalibracao([])} visita={visita} itens={filaCalibracao} /></>}
    <PlanoCancelarItensDialog open={cancelarOpen} quantidade={selecionados.length} onOpenChange={setCancelarOpen} onConfirm={confirmarCancelamento} />
    <PlanoFinalizarPreventivasDialog open={finalizarPreventivasOpen} quantidade={selecionados.length} saving={finalizarPreventivas.isPending} onOpenChange={setFinalizarPreventivasOpen} onConfirm={confirmarFinalizacaoPreventivas} />
    <PlanoResultadoPreventivasDialog open={Boolean(resultadoPreventivas)} resultado={resultadoPreventivas} equipamentoLabel={(equipamentoId) => equipamentoLabel(itens.find((item) => item.equipamento_id === equipamentoId))} onOpenChange={(open) => !open && setResultadoPreventivas(null)} />

    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-5"><Info label="Data inicial" value={formatDate(plano.data_inicio)} /><Info label="Frequencia" value={getPlanoFrequenciaLabel(plano.frequencia)} /><Info label="Modo" value={plano.modo_organizacao === "por_setor" ? "Por setores" : "Unidade inteira"} /><Info label="Proxima visita" value={formatDate(plano.proxima_execucao)} /><Info label="Estrutura" value={`${setores.length} setor(es) / ${plano.equipamentos?.length || 0} equipamento(s)`} /></div>
    <PlanoEstruturaSection plano={plano} onGerenciar={(setorId) => { setManageSetorId(setorId); setManageOpen(true); }} />
    <div className="mb-4 rounded-lg border bg-card p-4">{visita ? <><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground">Visita selecionada</p><h2 className="font-semibold">{visita.nome_visita || `Visita ${formatDate(visita.data_prevista)}`}</h2></div><div className="flex gap-2">{visitaEditavel && <Button size="sm" variant="outline" onClick={() => { setEditingVisita(visita); setVisitaFormOpen(true); }}><Pencil className="mr-1 h-4 w-4" />Editar datas</Button>}{visitaEditavel && <Button size="sm" onClick={concluir}><CheckCircle2 className="mr-1 h-4 w-4" />Concluir visita</Button>}</div></div><div className="mb-2 grid gap-2 text-sm md:grid-cols-4"><Info label="Prevista" value={formatDate(visita.data_prevista)} /><Info label="Abertura" value={formatDate(visita.data_abertura)} /><Info label="Fechamento" value={formatDate(visita.data_fechamento)} /><Info label="Status" value={visita.status} /></div><Progress value={progresso} /><p className="mt-1 text-xs text-muted-foreground">{progresso}% concluido ({finalizados}/{itens.length})</p></> : <p className="text-sm text-muted-foreground">Inicie uma visita para gerar os itens operacionais.</p>}</div>

    {visita && <div className="mb-3 rounded-lg border bg-card p-4"><p className="mb-2 text-sm font-medium">Execucao por setor</p><div className="mb-3 flex gap-2 overflow-x-auto">{setoresOperacao.map((item) => <Tab key={item.id} active={setor === item.id} onClick={() => setSetor(item.id)}>{item.nome}</Tab>)}</div><p className="mb-2 text-sm font-medium">Servicos do setor</p><div className="flex gap-2 overflow-x-auto">{(Object.entries(servicoLabel) as Array<[PlanoTipoServico, string]>).map(([idServico, label]) => <Tab key={idServico} active={servico === idServico} onClick={() => setServico(idServico)}>{label}</Tab>)}</div></div>}
    <div className="mb-3 flex flex-wrap gap-2"><Input className="max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipamento, NS, patrimonio ou TAG" />{selecionados.length > 0 && <div className="flex flex-wrap gap-2 rounded-md border border-primary/30 bg-primary/5 p-2"><strong className="px-1 py-2 text-sm">{selecionados.length} selecionado(s)</strong>{servico !== "seguranca_eletrica" && <Button size="sm" onClick={() => executar("abrir")}>{servico === "preventiva" ? "Abrir OS" : "Abrir calibracoes"}</Button>}{servico === "preventiva" && <Button size="sm" variant="outline" onClick={() => executar("finalizar")}>Finalizar em conformidade</Button>}<Button size="sm" variant="destructive" onClick={() => executar("cancelar")}>Cancelar</Button></div>}</div>

    <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead><tr className="bg-muted/40"><Th><Checkbox checked={todosMarcados} onCheckedChange={(value) => setSelecionados(value ? selecionaveis.map((item) => item.id) : [])} /></Th><Th /><Th>#</Th><Th>Equipamento</Th><Th>Solicitante</Th><Th>Abertura</Th><Th>Previsao</Th><Th>Status</Th></tr></thead><tbody>{filtered.map((item, index) => <tr key={item.id} className="border-t"><Td><Checkbox disabled={!visitaEditavel || ["concluido", "cancelado"].includes(item.status)} checked={selecionados.includes(item.id)} onCheckedChange={(value) => setSelecionados((current) => value ? [...current, item.id] : current.filter((idItem) => idItem !== item.id))} /></Td><Td><Button size="icon" variant="ghost" disabled={!visitaEditavel || ["concluido", "cancelado"].includes(item.status)} onClick={() => play(item)}><Play className="h-4 w-4" /></Button></Td><Td>{index + 1}</Td><Td><p className="font-medium">{equipamentoLabel(item)}</p><p className="text-xs text-muted-foreground">{item.setor?.nome || "Sem setor"}</p></Td><Td>{plano.empresa?.nome_fantasia || plano.empresa?.nome || "-"}</Td><Td>{formatDate(item.aberto_em)}</Td><Td>{formatDate(visita?.data_prevista)}</Td><Td><Badge variant="outline">{statusLabel[item.status]}</Badge></Td></tr>)}</tbody></table>{!filtered.length && <p className="p-6 text-sm text-muted-foreground">Nenhum item para os filtros selecionados.</p>}</div>

    <div className="mt-5 rounded-lg border bg-card"><button className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium" onClick={() => setHistoricoOpen(!historicoOpen)}>Visitas anteriores <ChevronDown className={`h-4 w-4 ${historicoOpen ? "rotate-180" : ""}`} /></button>{historicoOpen && <div className="overflow-x-auto border-t"><table className="w-full text-sm"><thead><tr className="bg-muted/40"><Th>Visita</Th><Th>Data prevista</Th><Th>Abertura</Th><Th>Fechamento</Th><Th>Concluidos</Th><Th>Cancelados</Th><Th>Status</Th><Th /></tr></thead><tbody>{visitasHistoricas.map((item) => <tr className="border-t" key={item.id}><Td>{item.nome_visita || "-"}</Td><Td>{formatDate(item.data_prevista)}</Td><Td>{formatDate(item.data_abertura)}</Td><Td>{formatDate(item.data_fechamento)}</Td><Td>{item.itens?.filter((current) => current.status === "concluido").length || 0}</Td><Td>{item.itens?.filter((current) => current.status === "cancelado").length || 0}</Td><Td><Badge variant="outline">{item.status}</Badge></Td><Td><Button size="sm" variant="outline" onClick={() => setVisitaId(item.id)}>Visualizar visita</Button></Td></tr>)}{!visitasHistoricas.length && <tr><Td>Nenhuma visita anterior.</Td></tr>}</tbody></table></div>}</div>
  </div>;
};

const erro = (title: string, error: unknown) => toast({ title, description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
const Info = ({ label, value }: { label: string; value: string }) => <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
const Tab = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => <Button className="shrink-0" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>{children}</Button>;
const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoDetalhes;

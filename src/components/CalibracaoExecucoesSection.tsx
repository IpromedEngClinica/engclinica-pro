import { Ban, ChevronDown, Download, Eye, FileText, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCalibracaoExecucoes, useCancelarCalibracaoExecucao } from "@/hooks/useCalibracaoExecucoes";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import {
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
} from "@/services/calibracaoExecucoesService";
import { empresasService, type EmpresaSupabase } from "@/services/empresasService";
import { equipamentosService, type EquipamentoSupabase } from "@/services/equipamentosService";
import { formatarIdentificacaoCompletaEquipamento } from "@/utils/equipamentoFormatters";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";
const date = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const CalibracaoExecucoesSection = () => {
  const { data: execucoes = [], refetch } = useCalibracaoExecucoes();
  const cancelar = useCancelarCalibracaoExecucao();
  const [selected, setSelected] = useState<CalibracaoExecucao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaSupabase | null>(null);
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState(ALL);
  const [tipoEquipamento, setTipoEquipamento] = useState(ALL);
  const [res, setRes] = useState(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [validadeDe, setValidadeDe] = useState("");
  const [validadeAte, setValidadeAte] = useState("");
  const [sortKey, setSortKey] = useState("numero_certificado");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);

  const filtered = useMemo(() => execucoes.filter((item) => {
    const termo = search.trim().toLowerCase();
    const geral = !termo || [formatNumeroCertificadoCalibracao(item.numero_certificado), item.empresa?.nome, item.empresa?.nome_fantasia, item.equipamento?.tipo_equipamento?.nome, item.equipamento?.tipo_texto, item.equipamento?.fabricante, item.equipamento?.modelo, item.equipamento?.numero_serie].some((value) => value?.toLowerCase().includes(termo));
    const validadeMes = (item.validade_mes || item.data_validade || "").slice(0, 7);
    return geral && (empresa === ALL || item.empresa_id === empresa) && (tipoEquipamento === ALL || item.equipamento?.tipo_equipamento_id === tipoEquipamento) && (res === ALL || item.resultado_geral === res) && (!dataDe || item.data_calibracao >= dataDe) && (!dataAte || item.data_calibracao <= dataAte) && (!validadeDe || validadeMes >= validadeDe) && (!validadeAte || validadeMes <= validadeAte);
  }), [dataAte, dataDe, empresa, execucoes, res, search, tipoEquipamento, validadeAte, validadeDe]);
  const getters = useMemo<Record<string, (item: CalibracaoExecucao) => unknown>>(() => ({
    numero_certificado: (item) => item.numero_certificado, data_calibracao: (item) => item.data_calibracao, cliente: (item) => item.empresa?.nome_fantasia || item.empresa?.nome,
    equipamento: (item) => formatarIdentificacaoCompletaEquipamento(item.equipamento),
    vencimento: (item) => item.data_validade || item.validade_mes,
  }), []);
  const sorted = useMemo(() => sortByValue(filtered, getters[sortKey], sortDirection), [filtered, getters, sortDirection, sortKey]);
  const {
    paginatedItems: visibleExecucoes,
    ...execucoesPagination
  } = usePaginatedList(sorted, listLimit);
  const sort = (key: string) => { if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };

  const handleCancelar = async (item: CalibracaoExecucao) => {
    if (!window.confirm("Cancelar esta calibracao?")) return;
    try { await cancelar.mutateAsync(item.id); setDetailsOpen(false); toast({ title: "Calibracao cancelada." }); }
    catch (error) { toast({ title: "Erro ao cancelar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const abrirFormularioEdicao = (item: CalibracaoExecucao) => {
    setDetailsOpen(false);
    setSelected(item);
    setFormOpen(true);
  };
  const handleEditar = (item: CalibracaoExecucao) => {
    if (
      item.status === "fechada" &&
      !window.confirm(
        "Esta calibracao ja foi finalizada. As alteracoes gerarao uma nova revisao do certificado.\nDeseja continuar?"
      )
    ) {
      return;
    }
    abrirFormularioEdicao(item);
  };
  const abrirPdf = async (item: CalibracaoExecucao, download = false) => {
    try { window.open(await calibracaoExecucoesService.criarUrlPdf(item, download), "_blank", "noopener,noreferrer"); }
    catch (error) { toast({ title: "Erro ao abrir PDF", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const gerarPdf = async (item: CalibracaoExecucao) => {
    try { await gerarPdfCalibracaoCertificado(item); }
    catch (error) { toast({ title: "Erro ao gerar PDF", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const abrirEmpresa = async (item: CalibracaoExecucao) => {
    try {
      setEmpresaSelecionada(await empresasService.buscarPorId(item.empresa_id));
      setEmpresaDetalhesOpen(true);
    } catch (error) {
      toast({ title: "Erro ao abrir cliente", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };
  const abrirEquipamento = async (item: CalibracaoExecucao) => {
    try {
      setEquipamentoSelecionado(await equipamentosService.buscarPorId(item.equipamento_id));
      setEquipamentoDetalhesOpen(true);
    } catch (error) {
      toast({ title: "Erro ao abrir equipamento", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };
  const unique = (values: Array<[string, string]>) => Array.from(new Map(values).entries());
  const limparFiltros = () => {
    setEmpresa(ALL); setTipoEquipamento(ALL); setRes(ALL);
    setDataDe(""); setDataAte(""); setValidadeDe(""); setValidadeAte("");
  };
  const filtrosAtivos = [empresa !== ALL, tipoEquipamento !== ALL, res !== ALL, dataDe, dataAte, validadeDe, validadeAte].filter(Boolean).length;

  return <div className="space-y-4">
    <CalibracaoExecucaoFormDialog open={formOpen} execucao={selected} onOpenChange={(value) => { setFormOpen(value); if (!value) setSelected(null); }} />
    <CalibracaoExecucaoDetalhesDialog open={detailsOpen} execucao={selected} onOpenChange={(value) => { setDetailsOpen(value); if (!value) setSelected(null); }} onEditar={abrirFormularioEdicao} onCancelar={handleCancelar} />
    <EmpresaDetalhesDialog open={empresaDetalhesOpen} empresa={empresaSelecionada} onOpenChange={(value) => { setEmpresaDetalhesOpen(value); if (!value) setEmpresaSelecionada(null); }} />
    <EquipamentoDetalhesDialog open={equipamentoDetalhesOpen} equipamento={equipamentoSelecionado} onOpenChange={(value) => { setEquipamentoDetalhesOpen(value); if (!value) setEquipamentoSelecionado(null); }} />
    <div className="rounded-xl border bg-card">
      <button type="button" className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/30" onClick={() => setFiltrosAbertos((current) => !current)}>
        <span className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4 text-primary" /> Filtros avançados {filtrosAtivos > 0 && <Badge variant="secondary">{filtrosAtivos}</Badge>}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`} />
      </button>
      {filtrosAbertos && <div className="grid gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
        <Sel value={empresa} onChange={setEmpresa} label="Empresa" options={unique(execucoes.map((item) => [item.empresa_id, item.empresa?.nome_fantasia || item.empresa?.nome || "-"]))} />
        <Sel value={tipoEquipamento} onChange={setTipoEquipamento} label="Tipo de equipamento" options={unique(execucoes.flatMap((item) => item.equipamento?.tipo_equipamento_id ? [[item.equipamento.tipo_equipamento_id, item.equipamento.tipo_equipamento?.nome || item.equipamento.tipo_texto || "-"]] : []))} />
        <Sel value={res} onChange={setRes} label="Resultado" options={[["conforme", "Conforme"], ["nao_conforme", "Nao conforme"], ["sem_declaracao_conformidade", "Sem declaracao de conformidade"]]} />
        <fieldset className="grid gap-2 rounded-md border p-3 sm:grid-cols-2"><legend className="px-1 text-xs font-medium text-muted-foreground">Data de calibracao</legend><label className="space-y-1 text-xs text-muted-foreground">De<Input type="date" title="Data de calibracao de" value={dataDe} onChange={(event) => setDataDe(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Ate<Input type="date" title="Data de calibracao ate" value={dataAte} onChange={(event) => setDataAte(event.target.value)} /></label></fieldset>
        <fieldset className="grid gap-2 rounded-md border p-3 sm:grid-cols-2"><legend className="px-1 text-xs font-medium text-muted-foreground">Validade</legend><label className="space-y-1 text-xs text-muted-foreground">De<Input type="month" title="Validade de" value={validadeDe} onChange={(event) => setValidadeDe(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Ate<Input type="month" title="Validade ate" value={validadeAte} onChange={(event) => setValidadeAte(event.target.value)} /></label></fieldset>
        <div className="flex justify-end md:col-span-2 xl:col-span-3"><Button variant="outline" size="sm" onClick={limparFiltros}>Limpar filtros</Button></div>
      </div>}
    </div>
    <div className="rounded-xl border bg-card"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar calibracao..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><ListLimitSelect value={listLimit} onChange={setListLimit} total={sorted.length} /><Button variant="outline" size="sm" onClick={() => refetch()}>Atualizar</Button><Button size="sm" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Nova Calibracao</Button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-y bg-muted/50">
        {[["Numero do certificado", "numero_certificado"], ["Cliente", "cliente"], ["Equipamento", "equipamento"], ["Data de calibracao", "data_calibracao"], ["Vencimento", "vencimento"]].map(([label, key]) => <th key={key} className="px-3 py-2 text-left"><SortableTableHeader label={label} sortField={key} sortKey={sortKey} sortDirection={sortDirection} onSort={sort} /></th>)}<th className="px-3 py-2 text-right">Acoes</th>
      </tr></thead><tbody>{visibleExecucoes.map((item) => <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><button className="font-medium text-primary hover:underline" onClick={() => { setSelected(item); setDetailsOpen(true); }}>{formatNumeroCertificadoCalibracao(item.numero_certificado)}</button></td><td className="px-3 py-2"><button className="text-left text-primary hover:underline" onClick={() => abrirEmpresa(item)}>{item.empresa?.nome_fantasia || item.empresa?.nome || "-"}</button></td><td className="px-3 py-2"><button className="text-left text-primary hover:underline" onClick={() => abrirEquipamento(item)}>{formatarIdentificacaoCompletaEquipamento(item.equipamento)}</button></td><td className="px-3 py-2">{date(item.data_calibracao)}</td><td className="px-3 py-2">{date(item.data_validade || item.validade_mes)}</td><td className="px-3 py-2 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelected(item); setDetailsOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>{item.status !== "cancelada" && <DropdownMenuItem onClick={() => handleEditar(item)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => gerarPdf(item)}><FileText className="mr-2 h-4 w-4" /> {item.pdf_storage_path ? "Regenerar PDF" : "Gerar PDF"}</DropdownMenuItem>{item.pdf_storage_path && <><DropdownMenuItem onClick={() => abrirPdf(item)}><Eye className="mr-2 h-4 w-4" /> Visualizar PDF</DropdownMenuItem><DropdownMenuItem onClick={() => abrirPdf(item, true)}><Download className="mr-2 h-4 w-4" /> Baixar PDF</DropdownMenuItem></>}{["rascunho", "em_execucao"].includes(item.status) && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => handleCancelar(item)}><Ban className="mr-2 h-4 w-4" /> Cancelar calibracao</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td></tr>)}{!sorted.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma calibracao encontrada.</td></tr>}</tbody></table><ListPagination {...execucoesPagination} onPageChange={execucoesPagination.setPage} /></div>
    </div>
  </div>;
};

const Sel = ({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos: {label}</SelectItem>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select>;

export default CalibracaoExecucoesSection;

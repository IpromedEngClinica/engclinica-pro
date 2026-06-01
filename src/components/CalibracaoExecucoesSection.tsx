import { Ban, Eye, FileText, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import CalibracaoExecucaoDetalhesDialog from "@/components/CalibracaoExecucaoDetalhesDialog";
import CalibracaoExecucaoFormDialog from "@/components/CalibracaoExecucaoFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCalibracaoExecucoes, useCancelarCalibracaoExecucao } from "@/hooks/useCalibracaoExecucoes";
import {
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
} from "@/services/calibracaoExecucoesService";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";
const date = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const resultado = (value?: string | null) => value?.replaceAll("_", " ") || "-";

const CalibracaoExecucoesSection = () => {
  const { data: execucoes = [] } = useCalibracaoExecucoes();
  const cancelar = useCancelarCalibracaoExecucao();
  const [selected, setSelected] = useState<CalibracaoExecucao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState(ALL);
  const [equipamento, setEquipamento] = useState(ALL);
  const [procedimento, setProcedimento] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [res, setRes] = useState(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [validadeDe, setValidadeDe] = useState("");
  const [validadeAte, setValidadeAte] = useState("");
  const [pdf, setPdf] = useState(ALL);
  const [sortKey, setSortKey] = useState("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => execucoes.filter((item) => {
    const termo = search.trim().toLowerCase();
    const geral = !termo || [formatNumeroCertificadoCalibracao(item.numero_certificado), item.empresa?.nome, item.empresa?.nome_fantasia, item.equipamento?.modelo, item.equipamento?.numero_serie, item.procedimento_nome_snapshot].some((value) => value?.toLowerCase().includes(termo));
    return geral && (empresa === ALL || item.empresa_id === empresa) && (equipamento === ALL || item.equipamento_id === equipamento) && (procedimento === ALL || item.procedimento_id === procedimento) && (status === ALL || item.status === status) && (res === ALL || item.resultado_geral === res) && (!dataDe || item.data_calibracao >= dataDe) && (!dataAte || item.data_calibracao <= dataAte) && (!validadeDe || (item.data_validade || "") >= validadeDe) && (!validadeAte || (item.data_validade || "") <= validadeAte) && (pdf === ALL || (pdf === "com") === Boolean(item.pdf_storage_path));
  }), [dataAte, dataDe, empresa, equipamento, execucoes, pdf, procedimento, res, search, status, validadeAte, validadeDe]);
  const getters = useMemo<Record<string, (item: CalibracaoExecucao) => unknown>>(() => ({
    numero: (item) => item.numero_certificado, data: (item) => item.data_calibracao, cliente: (item) => item.empresa?.nome,
    equipamento: (item) => item.equipamento?.modelo, procedimento: (item) => item.procedimento_nome_snapshot,
    validade: (item) => item.data_validade, resultado: (item) => item.resultado_geral, status: (item) => item.status, pdf: (item) => Boolean(item.pdf_storage_path),
  }), []);
  const sorted = useMemo(() => sortByValue(filtered, getters[sortKey], sortDirection), [filtered, getters, sortDirection, sortKey]);
  const sort = (key: string) => { if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };

  const handleCancelar = async (item: CalibracaoExecucao) => {
    if (!window.confirm("Cancelar esta calibracao?")) return;
    try { await cancelar.mutateAsync(item.id); setDetailsOpen(false); toast({ title: "Calibracao cancelada." }); }
    catch (error) { toast({ title: "Erro ao cancelar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const abrirPdf = async (item: CalibracaoExecucao) => {
    try { window.open(await calibracaoExecucoesService.criarUrlPdf(item), "_blank", "noopener,noreferrer"); }
    catch (error) { toast({ title: "Erro ao abrir PDF", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const unique = (values: Array<[string, string]>) => Array.from(new Map(values).entries());

  return <div className="space-y-4">
    <CalibracaoExecucaoFormDialog open={formOpen} execucao={selected} onOpenChange={(value) => { setFormOpen(value); if (!value) setSelected(null); }} />
    <CalibracaoExecucaoDetalhesDialog open={detailsOpen} execucao={selected} onOpenChange={(value) => { setDetailsOpen(value); if (!value) setSelected(null); }} onEditar={(item) => { setDetailsOpen(false); setSelected(item); setFormOpen(true); }} onCancelar={handleCancelar} />
    <div className="flex justify-end"><Button onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Nova Calibracao</Button></div>
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
      <Sel value={empresa} onChange={setEmpresa} label="Empresa" options={unique(execucoes.map((item) => [item.empresa_id, item.empresa?.nome_fantasia || item.empresa?.nome || "-"]))} />
      <Sel value={equipamento} onChange={setEquipamento} label="Equipamento" options={unique(execucoes.map((item) => [item.equipamento_id, item.equipamento?.modelo || item.equipamento?.numero_serie || "-"]))} />
      <Sel value={procedimento} onChange={setProcedimento} label="Procedimento" options={unique(execucoes.map((item) => [item.procedimento_id, item.procedimento_nome_snapshot]))} />
      <Sel value={status} onChange={setStatus} label="Status" options={[["rascunho", "Rascunho"], ["em_execucao", "Em execucao"], ["fechada", "Fechada"], ["cancelada", "Cancelada"]]} />
      <Sel value={res} onChange={setRes} label="Resultado" options={[["conforme", "Conforme"], ["nao_conforme", "Nao conforme"], ["sem_declaracao_conformidade", "Sem declaracao"]]} />
      <Input type="date" title="Data de calibracao de" value={dataDe} onChange={(event) => setDataDe(event.target.value)} /><Input type="date" title="Data de calibracao ate" value={dataAte} onChange={(event) => setDataAte(event.target.value)} />
      <Input type="date" title="Validade de" value={validadeDe} onChange={(event) => setValidadeDe(event.target.value)} /><Input type="date" title="Validade ate" value={validadeAte} onChange={(event) => setValidadeAte(event.target.value)} />
      <Sel value={pdf} onChange={setPdf} label="PDF" options={[["com", "Com PDF"], ["sem", "Sem PDF"]]} />
    </div>
    <div className="rounded-xl border bg-card"><div className="relative max-w-sm p-4"><Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar calibracao..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-sm"><thead><tr className="border-y bg-muted/50">
        {[["Numero", "numero"], ["Data", "data"], ["Cliente", "cliente"], ["Equipamento", "equipamento"], ["Procedimento", "procedimento"], ["Validade", "validade"], ["Resultado", "resultado"], ["Status", "status"], ["PDF", "pdf"]].map(([label, key]) => <th key={key} className="cursor-pointer px-3 py-2 text-left" onClick={() => sort(key)}>{label}</th>)}<th className="px-3 py-2 text-right">Acoes</th>
      </tr></thead><tbody>{sorted.map((item) => <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><button className="font-medium text-primary hover:underline" onClick={() => { setSelected(item); setDetailsOpen(true); }}>{formatNumeroCertificadoCalibracao(item.numero_certificado)}</button></td><td className="px-3 py-2">{date(item.data_calibracao)}</td><td className="px-3 py-2">{item.empresa?.nome_fantasia || item.empresa?.nome}</td><td className="px-3 py-2">{item.equipamento?.modelo || item.equipamento?.numero_serie || "-"}</td><td className="px-3 py-2">{item.procedimento_nome_snapshot}</td><td className="px-3 py-2">{date(item.data_validade)}</td><td className="px-3 py-2">{resultado(item.resultado_geral)}</td><td className="px-3 py-2"><Badge variant="outline">{item.status}</Badge></td><td className="px-3 py-2">{item.pdf_storage_path ? <Button variant="ghost" size="sm" onClick={() => abrirPdf(item)}><FileText className="mr-1 h-4 w-4" /> Abrir</Button> : "-"}</td><td className="px-3 py-2 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelected(item); setDetailsOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>{["rascunho", "em_execucao"].includes(item.status) && <><DropdownMenuItem onClick={() => { setSelected(item); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => handleCancelar(item)}><Ban className="mr-2 h-4 w-4" /> Cancelar</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td></tr>)}{!sorted.length && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhuma calibracao encontrada.</td></tr>}</tbody></table></div>
    </div>
  </div>;
};

const Sel = ({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos: {label}</SelectItem>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select>;

export default CalibracaoExecucoesSection;

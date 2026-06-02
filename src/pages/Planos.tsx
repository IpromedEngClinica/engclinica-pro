import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, Eye, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PlanoFormDialog from "@/components/PlanoFormDialog";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDesativarPlano, usePlanos } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano } from "@/services/planosService";
import { FREQUENCIAS_PLANO, getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";
type SortKey = "titulo" | "empresa" | "inicio" | "frequencia" | "setores" | "equipamentos" | "proxima" | "progresso" | "status";
const formatDate = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const empresaNome = (plano: Plano) => plano.empresa?.nome_fantasia || plano.empresa?.nome || "-";
const visitaAtual = (item: Plano) => item.execucoes?.find((execucao) => execucao.status === "aberta" || execucao.status === "em_execucao");
const progresso = (item: Plano) => { const itens = visitaAtual(item)?.itens || []; return itens.length ? Math.round((itens.filter((x) => x.status === "concluido" || x.status === "cancelado").length / itens.length) * 100) : 0; };
const sortValue = (item: Plano, key: SortKey) => ({ titulo: item.titulo, empresa: empresaNome(item), inicio: item.data_inicio, frequencia: item.frequencia, setores: item.setores?.length || 0, equipamentos: item.equipamentos?.length || 0, proxima: item.proxima_execucao || "", progresso: progresso(item), status: item.ativo ? 1 : 0 }[key]);

const Planos = () => {
  const navigate = useNavigate();
  const { data: planos = [], isLoading, isError, error } = usePlanos();
  const desativar = useDesativarPlano();
  const [selected, setSelected] = useState<Plano | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState(ALL);
  const [frequencia, setFrequencia] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("proxima");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const empresas = useMemo(() => Array.from(new Map(planos.map((item) => [item.empresa_id, empresaNome(item)])).entries()), [planos]);
  const filtered = useMemo(() => sortByValue(planos.filter((item) =>
    (!search.trim() || `${item.titulo} ${empresaNome(item)}`.toLowerCase().includes(search.toLowerCase())) &&
    (empresa === ALL || item.empresa_id === empresa) && (frequencia === ALL || item.frequencia === frequencia) &&
    (status === ALL || (status === "ativo") === item.ativo) && (!dataDe || (item.proxima_execucao || "") >= dataDe) && (!dataAte || (item.proxima_execucao || "") <= dataAte)
  ), (item) => sortValue(item, sortKey), direction), [dataAte, dataDe, direction, empresa, frequencia, planos, search, sortKey, status]);
  const sort = (key: SortKey) => { if (key === sortKey) setDirection(direction === "asc" ? "desc" : "asc"); else { setSortKey(key); setDirection("asc"); } };
  const handleDesativar = async (plano: Plano) => { if (!window.confirm(`Desativar o plano "${plano.titulo}"?`)) return; try { await desativar.mutateAsync(plano.id); toast({ title: "Plano desativado." }); } catch (e) { toast({ title: "Erro ao desativar plano", description: e instanceof Error ? e.message : "Erro inesperado.", variant: "destructive" }); } };

  return <div className="p-6 lg:p-8"><PageHeader title="Planos" description="Organize visitas tecnicas periodicas e os servicos de cada equipamento."><Button onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo Plano</Button></PageHeader>
    <PlanoFormDialog open={formOpen} onOpenChange={setFormOpen} plano={selected} onSaved={(plano, created) => { if (created) navigate(`/planos/${plano.id}`); }} />
    <Input className="mb-3 max-w-md" placeholder="Buscar plano ou cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="mb-4 rounded-lg border bg-card"><button className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium" onClick={() => setFiltersOpen(!filtersOpen)}><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filtros avancados</span><ChevronDown className={`h-4 w-4 ${filtersOpen ? "rotate-180" : ""}`} /></button>{filtersOpen && <div className="grid gap-3 border-t p-4 md:grid-cols-5"><Filtro value={empresa} onChange={setEmpresa} all="Todas as empresas" options={empresas} /><Filtro value={frequencia} onChange={setFrequencia} all="Todas as frequencias" options={FREQUENCIAS_PLANO.map((x) => [x.value, x.label])} /><Filtro value={status} onChange={setStatus} all="Todos os status" options={[["ativo", "Ativos"], ["inativo", "Inativos"]]} /><Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} /><Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} /></div>}</div>
    {isError ? <p className="text-destructive">{error.message}</p> : <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead><tr className="bg-muted/40">{([["titulo", "Titulo"], ["empresa", "Cliente"], ["inicio", "Data inicial"], ["frequencia", "Frequencia"], ["proxima", "Proxima visita"], ["setores", "Setores"], ["equipamentos", "Equipamentos"], ["progresso", "Progresso visita atual"], ["status", "Status"]] as [SortKey, string][]).map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3 text-left"><button className="flex items-center gap-1" onClick={() => sort(key)}>{label}<ArrowUpDown className="h-3 w-3" /></button></th>)}<th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t"><Td><button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => navigate(`/planos/${item.id}`)}>{item.titulo}</button></Td><Td>{empresaNome(item)}</Td><Td>{formatDate(item.data_inicio)}</Td><Td>{getPlanoFrequenciaLabel(item.frequencia)}</Td><Td>{formatDate(item.proxima_execucao)}</Td><Td>{item.setores?.length || 0}</Td><Td>{item.equipamentos?.length || 0}</Td><Td>{progresso(item)}%</Td><Td><Badge variant="outline">{item.ativo ? "Ativo" : "Inativo"}</Badge></Td><Td><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><Item icon={Eye} onClick={() => navigate(`/planos/${item.id}`)}>Abrir plano</Item><Item icon={Pencil} onClick={() => { setSelected(item); setFormOpen(true); }}>Editar</Item>{item.ativo && <><DropdownMenuSeparator /><Item icon={Trash2} onClick={() => handleDesativar(item)}>Desativar</Item></>}</DropdownMenuContent></DropdownMenu></Td></tr>)}{!isLoading && !filtered.length && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum plano encontrado.</td></tr>}</tbody></table></div>}
  </div>;
};
const Td = ({ children }: { children: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;
const Filtro = ({ value, onChange, all, options }: { value: string; onChange: (value: string) => void; all: string; options: readonly (readonly [string, string])[] }) => <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{all}</SelectItem>{options.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>;
const Item = ({ icon: Icon, children, onClick }: { icon: typeof Eye; children: React.ReactNode; onClick: () => void }) => <DropdownMenuItem onClick={onClick}><Icon className="mr-2 h-4 w-4" />{children}</DropdownMenuItem>;
export default Planos;

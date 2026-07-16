import { AlertCircle, ChevronDown, Copy, Eye, Loader2, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import CalibracaoProcedimentoDetalhesDialog from "@/components/CalibracaoProcedimentoDetalhesDialog";
import CalibracaoProcedimentoFormDialog from "@/components/CalibracaoProcedimentoFormDialog";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import SearchableSelect from "@/components/SearchableSelect";
import SortableTableHeader from "@/components/SortableTableHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalibracaoProcedimentos, useDesativarCalibracaoProcedimento, useDuplicarCalibracaoProcedimento } from "@/hooks/useCalibracaoProcedimentos";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { toast } from "@/hooks/use-toast";
import type { CalibracaoProcedimento } from "@/services/calibracaoProcedimentosService";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";

const ALL = "__all__";
const formatDateTime = (value: string) => new Date(value).toLocaleString("pt-BR");
const getTiposProcedimento = (item: CalibracaoProcedimento) =>
  item.tipos_equipamento?.length
    ? item.tipos_equipamento
    : item.tipo_equipamento
      ? [item.tipo_equipamento]
      : [];
const getTiposProcedimentoLabel = (item: CalibracaoProcedimento) => {
  const tipos = getTiposProcedimento(item).map((tipo) => tipo.nome);
  return tipos.length ? tipos.join(", ") : "-";
};

const CalibracaoProcedimentosSection = () => {
  const { data: procedimentos = [], isLoading, isError, error, refetch } = useCalibracaoProcedimentos();
  const duplicar = useDuplicarCalibracaoProcedimento();
  const desativar = useDesativarCalibracaoProcedimento();
  const [selected, setSelected] = useState<CalibracaoProcedimento | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState(ALL);
  const [statusFiltro, setStatusFiltro] = useState(ALL);
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [sortKey, setSortKey] = useState("atualizado");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);

  const tipos = useMemo(
    () =>
      Array.from(
        new Set(
          procedimentos.flatMap((item) =>
            getTiposProcedimento(item).map((tipo) => tipo.nome)
          )
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [procedimentos]
  );
  const filtered = useMemo(() => procedimentos.filter((item) => {
    const termo = search.trim().toLowerCase();
    const tipoNomes = getTiposProcedimento(item).map((tipo) => tipo.nome);
    const geral = !termo || [item.nome, ...tipoNomes].some((value) => value?.toLowerCase().includes(termo));
    return geral && (tipoFiltro === ALL || tipoNomes.includes(tipoFiltro)) && (statusFiltro === ALL || (statusFiltro === "ativo") === item.ativo) && (!nomeFiltro.trim() || item.nome.toLowerCase().includes(nomeFiltro.trim().toLowerCase()));
  }), [nomeFiltro, procedimentos, search, statusFiltro, tipoFiltro]);

  const getters = useMemo<Record<string, (item: CalibracaoProcedimento) => unknown>>(() => ({
    nome: (item) => item.nome,
    tipo: getTiposProcedimentoLabel,
    tabelas: (item) => item.tabelas?.length || 0,
    status: (item) => item.ativo ? "Ativo" : "Desativado",
    atualizado: (item) => item.updated_at,
  }), []);
  const sorted = useMemo(() => sortByValue(filtered, getters[sortKey] || getters.atualizado, sortDirection), [filtered, getters, sortDirection, sortKey]);
  const {
    paginatedItems: visibleProcedimentos,
    ...procedimentosPagination
  } = usePaginatedList(sorted, listLimit);
  const handleSort = (key: string) => { if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };
  const activeFilters = [tipoFiltro !== ALL, statusFiltro !== ALL, nomeFiltro.trim()].filter(Boolean).length;

  const handleDuplicar = async (item: CalibracaoProcedimento) => {
    if (!window.confirm(`Duplicar "${item.nome}" como uma nova versao?`)) return;
    try { await duplicar.mutateAsync(item.id); setDetailsOpen(false); toast({ title: "Procedimento duplicado com nova versao." }); }
    catch (error) { toast({ title: "Erro ao duplicar procedimento", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const handleDesativar = async (item: CalibracaoProcedimento) => {
    if (!window.confirm(`Desativar "${item.nome}"?`)) return;
    try { await desativar.mutateAsync(item.id); setDetailsOpen(false); toast({ title: "Procedimento desativado." }); }
    catch (error) { toast({ title: "Erro ao desativar procedimento", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <CalibracaoProcedimentoFormDialog open={formOpen} onOpenChange={(value) => { setFormOpen(value); if (!value) setSelected(null); }} procedimento={selected} />
      <CalibracaoProcedimentoDetalhesDialog open={detailsOpen} onOpenChange={(value) => { setDetailsOpen(value); if (!value) setSelected(null); }} procedimento={selected} onEditar={(item) => { setDetailsOpen(false); setSelected(item); setFormOpen(true); }} onDuplicar={handleDuplicar} onDesativar={handleDesativar} />
      <div className="flex justify-end"><Button onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Novo procedimento</Button></div>

      <div className="rounded-xl border bg-card">
        <button type="button" className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/30" onClick={() => setFiltersOpen((current) => !current)}>
          <span className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4 text-primary" /> Filtros avancados {activeFilters > 0 && <Badge variant="secondary">{activeFilters}</Badge>}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen && <div className="grid gap-3 border-t p-4 md:grid-cols-3">
          <SearchableSelect value={tipoFiltro === ALL ? "" : tipoFiltro} options={tipos} placeholder="Tipo de equipamento" emptyText="Nenhum tipo encontrado." onValueChange={(value) => setTipoFiltro(value || ALL)} />
          <Select value={statusFiltro} onValueChange={setStatusFiltro}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos os status</SelectItem><SelectItem value="ativo">Ativos</SelectItem><SelectItem value="desativado">Desativados</SelectItem></SelectContent></Select>
          <Input placeholder="Nome" value={nomeFiltro} onChange={(event) => setNomeFiltro(event.target.value)} />
          <div className="md:col-span-3 flex justify-end"><Button variant="outline" size="sm" onClick={() => { setTipoFiltro(ALL); setStatusFiltro(ALL); setNomeFiltro(""); }}>Limpar filtros</Button></div>
        </div>}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar procedimento..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><ListLimitSelect value={listLimit} onChange={setListLimit} total={sorted.length} /><Button variant="outline" size="sm" onClick={() => refetch()}>Atualizar</Button></div></div>
        {isLoading && <div className="flex justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando procedimentos...</div>}
        {isError && <div className="m-5 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error instanceof Error ? error.message : "Erro desconhecido."}</span></div>}
        {!isLoading && !isError && <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b bg-muted/50">
          {[["Procedimento", "nome"], ["Tipo de equipamento", "tipo"], ["Tabelas", "tabelas"], ["Status", "status"], ["Atualizado em", "atualizado"]].map(([label, key]) => <th key={key} className="px-4 py-3 text-left text-muted-foreground"><SortableTableHeader label={label} sortField={key} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></th>)}<th className="px-4 py-3 text-right text-muted-foreground">Acoes</th>
        </tr></thead><tbody>{visibleProcedimentos.map((item) => <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 text-left"><button className="block max-w-full whitespace-normal break-words text-left font-medium leading-snug text-primary hover:underline" onClick={() => { setSelected(item); setDetailsOpen(true); }}>{item.nome}</button></td><td className="px-4 py-3 text-left">{getTiposProcedimentoLabel(item)}</td><td className="px-4 py-3">{item.tabelas?.length || 0}</td><td className="px-4 py-3"><Badge variant="outline" className={item.ativo ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>{item.ativo ? "Ativo" : "Desativado"}</Badge></td><td className="px-4 py-3">{formatDateTime(item.updated_at)}</td><td className="px-4 py-3 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelected(item); setDetailsOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelected(item); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem><DropdownMenuItem onClick={() => handleDuplicar(item)}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>{item.ativo && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => handleDesativar(item)}><Trash2 className="mr-2 h-4 w-4" /> Desativar</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td></tr>)}{sorted.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum procedimento encontrado.</td></tr>}</tbody></table><ListPagination {...procedimentosPagination} onPageChange={procedimentosPagination.setPage} /></div>}
      </div>
    </div>
  );
};

export default CalibracaoProcedimentosSection;

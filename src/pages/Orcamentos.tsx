import { FileText, Plus, Search, Eye, Pencil, FileDown, CheckCircle2, XCircle, DollarSign, Ban, Clock, MoreHorizontal, SlidersHorizontal, ChevronDown } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData, Orcamento, OrcamentoStatus, ORCAMENTO_STATUS } from "@/contexts/DataContext";
import OrcamentoFormDialog, { DialogMode } from "@/components/OrcamentoFormDialog";
import { generateOrcamentoPdf } from "@/lib/orcamentoPdf";
import { toast } from "@/hooks/use-toast";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const statusBadgeClass: Record<OrcamentoStatus, string> = {
  Pendente: "bg-amber-100 text-amber-800",
  Aprovado: "bg-emerald-100 text-emerald-800",
  Reprovado: "bg-red-100 text-red-800",
  Faturado: "bg-blue-100 text-blue-800",
  Cancelado: "bg-gray-200 text-gray-700",
};

const statusIcon: Record<OrcamentoStatus, JSX.Element> = {
  Pendente: <Clock className="w-4 h-4" />,
  Aprovado: <CheckCircle2 className="w-4 h-4" />,
  Reprovado: <XCircle className="w-4 h-4" />,
  Faturado: <DollarSign className="w-4 h-4" />,
  Cancelado: <Ban className="w-4 h-4" />,
};

const ALL = "__all__";

const Orcamentos = () => {
  const { orcamentos, empresasList, updateOrcamentoStatus } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Orcamento | null>(null);
  const [tab, setTab] = useState<OrcamentoStatus>("Pendente");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const emptyFilters = { tipo: ALL, solicitante: ALL, numero: "", identificador: "", responsavel: "" };
  const [filters, setFilters] = useState(emptyFilters);

  const counts = useMemo(() => {
    const map: Record<OrcamentoStatus, number> = {
      Pendente: 0, Aprovado: 0, Reprovado: 0, Faturado: 0, Cancelado: 0,
    };
    orcamentos.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }, [orcamentos]);

  const matchesText = (val: string, q: string) => !q.trim() || val.toLowerCase().includes(q.trim().toLowerCase());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orcamentos.filter(
      (o) =>
        o.status === tab &&
        (o.numero.toLowerCase().includes(q) ||
          o.solicitante.toLowerCase().includes(q) ||
          o.tipo.toLowerCase().includes(q)) &&
        (filters.tipo === ALL || o.tipo === filters.tipo) &&
        (filters.solicitante === ALL || o.solicitante === filters.solicitante) &&
        matchesText(o.numero, filters.numero) &&
        matchesText(o.identificador || "", filters.identificador) &&
        matchesText(o.responsavelOrcamentista || "", filters.responsavel)
    );
  }, [orcamentos, search, tab, filters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.tipo !== ALL) n++;
    if (filters.solicitante !== ALL) n++;
    (["numero", "identificador", "responsavel"] as const).forEach((k) => { if (filters[k].trim()) n++; });
    return n;
  }, [filters]);

  const openCreate = () => { setSelected(null); setMode("create"); setOpen(true); };
  const openView = (o: Orcamento) => { setSelected(o); setMode("view"); setOpen(true); };
  const openEdit = (o: Orcamento) => { setSelected(o); setMode("edit"); setOpen(true); };

  const handleStatusChange = (o: Orcamento, status: OrcamentoStatus) => {
    updateOrcamentoStatus(o.id, status);
    toast({ title: `Orçamento ${o.numero} marcado como ${status}` });
  };

  const handlePdf = async (o: Orcamento) => {
    const empresa = empresasList.find((e) => e.nome === o.solicitante);
    await generateOrcamentoPdf(o, empresa);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Orçamentos" description="Gerencie os orçamentos de peças e serviços">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as OrcamentoStatus)} className="mb-4">
        <TabsList className="bg-card border h-auto p-1 flex-wrap">
          {ORCAMENTO_STATUS.map((s) => (
            <TabsTrigger key={s} value={s} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              {statusIcon[s]} {s}
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground data-[state=active]:bg-white/20">
                {counts[s] || 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filtros avançados */}
      <div className="bg-card rounded-xl border mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen && (
          <div className="border-t px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SearchableSelect
                value={filters.tipo === ALL ? "" : filters.tipo}
                onValueChange={(v) => setFilters((f) => ({ ...f, tipo: v || ALL }))}
                options={["Serviço", "Peças", "Peças + Serviços"]}
                placeholder="Tipo (todos)"
                emptyText="Nenhum tipo encontrado."
              />
              <SearchableSelect
                value={filters.solicitante === ALL ? "" : filters.solicitante}
                onValueChange={(v) => setFilters((f) => ({ ...f, solicitante: v || ALL }))}
                options={empresasList.map((e) => e.nome)}
                placeholder="Solicitante (todos)"
                emptyText="Nenhum solicitante encontrado."
              />
              <Input placeholder="Número" value={filters.numero} onChange={(e) => setFilters((f) => ({ ...f, numero: e.target.value }))} />
              <Input placeholder="Identificador" value={filters.identificador} onChange={(e) => setFilters((f) => ({ ...f, identificador: e.target.value }))} />
              <Input placeholder="Responsável" value={filters.responsavel} onChange={(e) => setFilters((f) => ({ ...f, responsavel: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setFilters(emptyFilters)}>
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar número, solicitante ou tipo..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Número</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Solicitante</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Valor Total</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const total =
                  o.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0) +
                  o.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-primary">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" /> {o.numero}</span>
                        {o.identificador && (
                          <span className="text-xs text-muted-foreground font-normal mt-0.5 max-w-[260px] truncate" title={o.identificador}>
                            {o.identificador}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {o.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground">{o.solicitante}</td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusBadgeClass[o.status]}`}>
                            {statusIcon[o.status]} {o.status}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {ORCAMENTO_STATUS.filter((s) => s !== o.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(o, s)} className="gap-2">
                              {statusIcon[s]} {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatBRL(total)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(o.dataCriacao)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Ações">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-popover">
                            <DropdownMenuItem onClick={() => openView(o)}>
                              <Eye className="w-4 h-4 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(o)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePdf(o)}>
                              <FileDown className="w-4 h-4 mr-2" /> Gerar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                            {ORCAMENTO_STATUS.filter((s) => s !== o.status).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => handleStatusChange(o, s)} className="gap-2">
                                {statusIcon[s]} {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum orçamento {tab.toLowerCase()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrcamentoFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        orcamento={selected}
      />
    </div>
  );
};

export default Orcamentos;

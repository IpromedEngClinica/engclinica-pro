import { FileText, Plus, Search, Eye, Pencil, FileDown, MoreVertical, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData, Orcamento, OrcamentoStatus, ORCAMENTO_STATUSES } from "@/contexts/DataContext";
import OrcamentoFormDialog, { DialogMode } from "@/components/OrcamentoFormDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { generateOrcamentoPDF } from "@/lib/orcamentoPdf";
import { toast } from "@/hooks/use-toast";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const totalOrc = (o: Orcamento) =>
  o.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0) +
  o.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);

const STATUS_STYLES: Record<OrcamentoStatus, { bg: string; text: string; ring: string; dot: string }> = {
  Pendente:  { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500" },
  Aprovado:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  Reprovado: { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200",    dot: "bg-rose-500" },
  Faturado:  { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500" },
  Cancelado: { bg: "bg-zinc-100",   text: "text-zinc-600",    ring: "ring-zinc-200",    dot: "bg-zinc-500" },
};

const Orcamentos = () => {
  const { orcamentos, empresasList, updateOrcamentoStatus } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Orcamento | null>(null);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [activeTab, setActiveTab] = useState<OrcamentoStatus | "Todos">("Pendente");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orcamentos.filter(
      (o) =>
        o.numero.toLowerCase().includes(q) ||
        o.solicitante.toLowerCase().includes(q) ||
        o.tipo.toLowerCase().includes(q),
    );
  }, [orcamentos, search]);

  const grouped = useMemo(() => {
    const g: Record<OrcamentoStatus, Orcamento[]> = {
      Pendente: [], Aprovado: [], Reprovado: [], Faturado: [], Cancelado: [],
    };
    filtered.forEach((o) => g[o.status].push(o));
    return g;
  }, [filtered]);

  const openCreate = () => { setSelected(null); setMode("create"); setOpen(true); };
  const openView = (o: Orcamento) => { setSelected(o); setMode("view"); setOpen(true); };
  const openEdit = (o: Orcamento) => { setSelected(o); setMode("edit"); setOpen(true); };

  const handlePDF = (o: Orcamento) => {
    const empresa = empresasList.find((e) => e.nome === o.solicitante);
    generateOrcamentoPDF(o, empresa);
    toast({ title: "PDF gerado com sucesso!" });
  };

  const changeStatus = (o: Orcamento, status: OrcamentoStatus) => {
    if (o.status === status) return;
    updateOrcamentoStatus(o.id, status);
    toast({ title: `Orçamento movido para ${status}` });
  };

  const StatusBadge = ({ status }: { status: OrcamentoStatus }) => {
    const s = STATUS_STYLES[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {status}
      </span>
    );
  };

  const ActionsMenu = ({ o }: { o: Orcamento }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Mais ações">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Mover para</DropdownMenuLabel>
        {ORCAMENTO_STATUSES.map((st) => (
          <DropdownMenuItem
            key={st}
            disabled={o.status === st}
            onClick={() => changeStatus(o, st)}
            className="gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[st].dot}`} />
            {st}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openView(o)}>
          <Eye className="w-4 h-4 mr-2" /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(o)}>
          <Pencil className="w-4 h-4 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePDF(o)}>
          <FileDown className="w-4 h-4 mr-2" /> Gerar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const Card = ({ o }: { o: Orcamento }) => (
    <div className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-primary font-medium text-sm">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{o.numero}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(o.dataCriacao)}</p>
        </div>
        <ActionsMenu o={o} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground truncate">{o.solicitante}</p>
        <p className="text-xs text-muted-foreground">{o.tipo}</p>
      </div>
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">{o.formaPagamento}</span>
        <span className="text-sm font-semibold text-foreground">{formatBRL(totalOrc(o))}</span>
      </div>
      <div className="flex items-center gap-1 pt-1">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openView(o)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> Ver
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handlePDF(o)}>
          <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
        </Button>
      </div>
    </div>
  );

  const KanbanColumn = ({ status }: { status: OrcamentoStatus }) => {
    const items = grouped[status];
    const s = STATUS_STYLES[status];
    return (
      <div className="flex flex-col bg-muted/30 rounded-xl border min-w-[280px] flex-1">
        <div className={`px-4 py-3 border-b flex items-center justify-between ${s.bg} rounded-t-xl`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <h3 className={`text-sm font-semibold ${s.text}`}>{status}</h3>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-background ${s.text}`}>
            {items.length}
          </span>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum orçamento</p>
          ) : (
            items.map((o) => <Card key={o.id} o={o} />)
          )}
        </div>
      </div>
    );
  };

  const tabsList: (OrcamentoStatus | "Todos")[] = ["Pendente", "Aprovado", "Reprovado", "Faturado", "Cancelado", "Todos"];
  const listItems = activeTab === "Todos" ? filtered : grouped[activeTab as OrcamentoStatus];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Orçamentos" description="Gerencie os orçamentos de peças e serviços">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar número, solicitante ou tipo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-md p-1">
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
            className="h-8"
          >
            <LayoutGrid className="w-4 h-4 mr-1.5" /> Kanban
          </Button>
          <Button
            variant={view === "lista" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("lista")}
            className="h-8"
          >
            <List className="w-4 h-4 mr-1.5" /> Lista
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ORCAMENTO_STATUSES.map((st) => (
            <KanbanColumn key={st} status={st} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="px-4 pt-4">
              <TabsList className="flex flex-wrap h-auto">
                {tabsList.map((t) => {
                  const count = t === "Todos" ? filtered.length : grouped[t as OrcamentoStatus].length;
                  return (
                    <TabsTrigger key={t} value={t} className="gap-2">
                      {t}
                      <span className="text-xs bg-background px-1.5 py-0.5 rounded-full">{count}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            <TabsContent value={activeTab} className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Número</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Solicitante</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Pagamento</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Valor Total</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-primary">
                          <span className="inline-flex items-center gap-2">
                            <FileText className="w-4 h-4" /> {o.numero}
                          </span>
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-5 py-3 text-muted-foreground">{o.tipo}</td>
                        <td className="px-5 py-3 text-foreground">{o.solicitante}</td>
                        <td className="px-5 py-3 text-muted-foreground">{o.formaPagamento} • {o.modoPagamento}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{formatBRL(totalOrc(o))}</td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(o.dataCriacao)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openView(o)} title="Visualizar">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePDF(o)} title="Gerar PDF">
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <ActionsMenu o={o} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {listItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          Nenhum orçamento nesta categoria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

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

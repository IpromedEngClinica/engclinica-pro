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

const Orcamentos = () => {
  const { orcamentos, empresasList, updateOrcamentoStatus } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Orcamento | null>(null);
  const [tab, setTab] = useState<OrcamentoStatus>("Pendente");

  const counts = useMemo(() => {
    const map: Record<OrcamentoStatus, number> = {
      Pendente: 0, Aprovado: 0, Reprovado: 0, Faturado: 0, Cancelado: 0,
    };
    orcamentos.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }, [orcamentos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orcamentos.filter(
      (o) =>
        o.status === tab &&
        (o.numero.toLowerCase().includes(q) ||
          o.solicitante.toLowerCase().includes(q) ||
          o.tipo.toLowerCase().includes(q))
    );
  }, [orcamentos, search, tab]);

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
                      <div className="flex justify-end gap-1">
                        {o.status !== "Aprovado" && o.status !== "Faturado" && o.status !== "Cancelado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(o, "Aprovado")}
                            title="Aprovar"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {o.status !== "Reprovado" && o.status !== "Cancelado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(o, "Reprovado")}
                            title="Reprovar"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {o.status !== "Cancelado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(o, "Cancelado")}
                            title="Cancelar"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handlePdf(o)} title="Gerar PDF">
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openView(o)} title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
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

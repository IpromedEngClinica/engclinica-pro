import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const Orcamentos = () => {
  const { orcamentos } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orcamentos.filter(
      (o) =>
        o.numero.toLowerCase().includes(q) ||
        o.solicitante.toLowerCase().includes(q) ||
        o.tipo.toLowerCase().includes(q)
    );
  }, [orcamentos, search]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Orçamentos" description="Gerencie os orçamentos de peças e serviços">
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </PageHeader>

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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Pagamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Valor Total</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Responsável</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const total =
                  o.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0) +
                  o.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-primary flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {o.numero}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {o.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground">{o.solicitante}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {o.formaPagamento} • {o.modoPagamento}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatBRL(total)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.responsavelOrcamentista}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(o.dataCriacao)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum orçamento cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrcamentoFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Orcamentos;

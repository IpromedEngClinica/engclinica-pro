import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import OrdemServicoFormDialog from "@/components/OrdemServicoFormDialog";

const OrdensServico = () => {
  const { ordensServico, equipamentos } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const equipamentoLabel = (id: number | null) => {
    const eq = equipamentos.find((e) => e.id === id);
    return eq ? `${eq.tipo} - ${eq.modelo}` : "—";
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ordensServico.filter(
      (os) =>
        os.numero.toLowerCase().includes(q) ||
        os.solicitante.toLowerCase().includes(q) ||
        os.tipoServico.toLowerCase().includes(q) ||
        equipamentoLabel(os.equipamentoId).toLowerCase().includes(q)
    );
  }, [ordensServico, search, equipamentos]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ordens de Serviço" description="Gerencie as ordens de serviço">
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova OS
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, equipamento ou solicitante..."
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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Solicitante</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo de Serviço</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((os) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-primary flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> {os.numero}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(os.dataCriacao)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {os.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-foreground">{os.solicitante}</td>
                  <td className="px-5 py-3 text-muted-foreground">{equipamentoLabel(os.equipamentoId)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{os.tipoServico}</td>
                  <td className="px-5 py-3 text-muted-foreground">{os.responsavelTecnico}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma ordem de serviço cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrdemServicoFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default OrdensServico;

import { Cpu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EquipamentoFormDialog from "@/components/EquipamentoFormDialog";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";

const statusColor: Record<string, string> = {
  Ativo: "bg-success/10 text-success",
  "Em manutenção": "bg-warning/10 text-warning",
  Desativado: "bg-destructive/10 text-destructive",
};

const Equipamentos = () => {
  const { equipamentos } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const filtered = equipamentos.filter((e) =>
    e.tipo.toLowerCase().includes(search.toLowerCase()) ||
    e.empresa.toLowerCase().includes(search.toLowerCase()) ||
    e.fabricante.toLowerCase().includes(search.toLowerCase()) ||
    e.tag.toLowerCase().includes(search.toLowerCase()) ||
    e.serie.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Equipamentos" description="Gerencie os equipamentos cadastrados">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
        </Button>
      </PageHeader>

      <EquipamentoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar equipamento, empresa, TAG..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Proprietário</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Modelo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fabricante</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">TAG</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nº Série</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Patrimônio</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Setor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> {e.tipo}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.empresa}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.modelo}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.fabricante}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.tag}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.serie}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.patrimonio}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.setor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Equipamentos;

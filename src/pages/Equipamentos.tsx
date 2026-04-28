import { Cpu, Plus, Search, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EquipamentoFormDialog, { DialogMode } from "@/components/EquipamentoFormDialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, Equipamento } from "@/contexts/DataContext";

const statusColor: Record<string, string> = {
  Ativo: "bg-success/10 text-success",
  "Em manutenção": "bg-warning/10 text-warning",
  Desativado: "bg-destructive/10 text-destructive",
};

const Equipamentos = () => {
  const { equipamentos } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Equipamento | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId) {
      const eq = equipamentos.find((e) => String(e.id) === viewId);
      if (eq) {
        setSelected(eq);
        setMode("view");
        setDialogOpen(true);
      }
      searchParams.delete("view");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, equipamentos, setSearchParams]);

  const filtered = equipamentos.filter((e) =>
    e.tipo.toLowerCase().includes(search.toLowerCase()) ||
    e.empresa.toLowerCase().includes(search.toLowerCase()) ||
    e.fabricante.toLowerCase().includes(search.toLowerCase()) ||
    e.tag.toLowerCase().includes(search.toLowerCase()) ||
    e.serie.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setSelected(null); setMode("create"); setDialogOpen(true); };
  const openView = (e: Equipamento) => { setSelected(e); setMode("view"); setDialogOpen(true); };
  const openEdit = (e: Equipamento) => { setSelected(e); setMode("edit"); setDialogOpen(true); };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Equipamentos" description="Gerencie os equipamentos cadastrados">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
        </Button>
      </PageHeader>

      <EquipamentoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={mode} equipamento={selected} />

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
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
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
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openView(e)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
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

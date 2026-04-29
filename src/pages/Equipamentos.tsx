import { Cpu, Plus, Search, MoreHorizontal, Eye, Pencil, ClipboardList, CalendarCheck, PackageX, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/PageHeader";
import EquipamentoFormDialog, { DialogMode } from "@/components/EquipamentoFormDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrdemServicoFormDialog from "@/components/OrdemServicoFormDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, Equipamento, OrdemServico } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Ativo: "bg-success/10 text-success",
  "Em manutenção": "bg-warning/10 text-warning",
  Desativado: "bg-destructive/10 text-destructive",
};

const Equipamentos = () => {
  const { equipamentos, ordensServico } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Equipamento | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesEq, setDetalhesEq] = useState<Equipamento | null>(null);

  const [osOpen, setOsOpen] = useState(false);
  const [osPreset, setOsPreset] = useState<{ equipamento: Equipamento; tipoServico?: string } | null>(null);

  const [osDetalhesOpen, setOsDetalhesOpen] = useState(false);
  const [osDetalhesSel, setOsDetalhesSel] = useState<OrdemServico | null>(null);

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId) {
      const eq = equipamentos.find((e) => String(e.id) === viewId);
      if (eq) {
        setDetalhesEq(eq);
        setDetalhesOpen(true);
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
  const openView = (e: Equipamento) => { setDetalhesEq(e); setDetalhesOpen(true); };
  const openEdit = (e: Equipamento) => { setSelected(e); setMode("edit"); setDialogOpen(true); };

  const openCriarOS = (e: Equipamento, tipoServico?: string) => {
    setOsPreset({ equipamento: e, tipoServico });
    setOsOpen(true);
  };

  const openOSById = (id: number) => {
    const os = ordensServico.find((o) => o.id === id);
    if (os) {
      setDetalhesOpen(false);
      setOsDetalhesSel(os);
      setOsDetalhesOpen(true);
    }
  };

  const futuro = (label: string) =>
    toast({ title: `${label}`, description: "Funcionalidade em desenvolvimento." });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Equipamentos" description="Gerencie os equipamentos cadastrados">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
        </Button>
      </PageHeader>

      <EquipamentoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={mode} equipamento={selected} />
      <EquipamentoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(v) => { setDetalhesOpen(v); if (!v) setDetalhesEq(null); }}
        equipamento={detalhesEq}
        onSelectOS={openOSById}
      />
      <OrdemServicoFormDialog
        open={osOpen}
        onOpenChange={(v) => { setOsOpen(v); if (!v) setOsPreset(null); }}
        mode="create"
        fromEquipamento={osPreset ? { id: osPreset.equipamento.id, empresa: osPreset.equipamento.empresa } : null}
        initialTipoServico={osPreset?.tipoServico || ""}
      />
      <OrdemServicoDetalhesDialog
        open={osDetalhesOpen}
        onOpenChange={(v) => { setOsDetalhesOpen(v); if (!v) setOsDetalhesSel(null); }}
        os={osDetalhesSel}
      />

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
                  <td className="px-5 py-3 font-medium text-foreground">
                    <button
                      type="button"
                      onClick={() => openView(e)}
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Cpu className="w-4 h-4" /> {e.tipo}
                    </button>
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
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Ações">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover">
                          <DropdownMenuItem onClick={() => openView(e)}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openCriarOS(e)}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Criar Ordem de Serviço
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => futuro("Criar Preventiva")}>
                            <CalendarCheck className="w-4 h-4 mr-2" /> Criar Preventiva
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => futuro("Criar Recolhimento")}>
                            <PackageX className="w-4 h-4 mr-2" /> Criar Recolhimento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openCriarOS(e, "Laudo De Obsolescência")}
                          >
                            <FileWarning className="w-4 h-4 mr-2" /> Criar Laudo de Obsolescência
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

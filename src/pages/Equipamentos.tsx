import { Cpu, Plus, Search, MoreHorizontal, Eye, Pencil, ClipboardList, CalendarCheck, FileWarning, FileBox, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import EquipamentoFormDialog, { DialogMode } from "@/components/EquipamentoFormDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrdemServicoFormDialog from "@/components/OrdemServicoFormDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import ProtocoloRecolhimentoDialog from "@/components/ProtocoloRecolhimentoDialog";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, Equipamento, OrdemServico } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Ativo: "bg-success/10 text-success",
  "Em manutenção": "bg-warning/10 text-warning",
  Desativado: "bg-destructive/10 text-destructive",
};

const ALL = "__all__";

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

  const [protocoloOpen, setProtocoloOpen] = useState(false);
  const [protocoloEq, setProtocoloEq] = useState<Equipamento | null>(null);

  // Filtros avançados
  const [filtersOpen, setFiltersOpen] = useState(false);
  const emptyFilters = {
    estado: ALL,
    proprietario: ALL,
    tipo: ALL,
    fabricante: ALL,
    modelo: "",
    tag: "",
    serie: "",
    patrimonio: "",
    setor: ALL,
  };
  const [filters, setFilters] = useState(emptyFilters);

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

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const opts = useMemo(
    () => ({
      estado: uniq(equipamentos.map((e) => e.status)),
      proprietario: uniq(equipamentos.map((e) => e.empresa)),
      tipo: uniq(equipamentos.map((e) => e.tipo)),
      fabricante: uniq(equipamentos.map((e) => e.fabricante)),
      setor: uniq(equipamentos.map((e) => e.setor)),
    }),
    [equipamentos]
  );

  const matchesText = (val: string, q: string) =>
    !q.trim() || val.toLowerCase().includes(q.trim().toLowerCase());

  const filtered = equipamentos.filter((e) => {
    const s = search.toLowerCase();
    const matchesGeneral =
      !s ||
      e.tipo.toLowerCase().includes(s) ||
      e.empresa.toLowerCase().includes(s) ||
      e.fabricante.toLowerCase().includes(s) ||
      e.tag.toLowerCase().includes(s) ||
      e.serie.toLowerCase().includes(s);

    return (
      matchesGeneral &&
      (filters.estado === ALL || e.status === filters.estado) &&
      (filters.proprietario === ALL || e.empresa === filters.proprietario) &&
      (filters.tipo === ALL || e.tipo === filters.tipo) &&
      (filters.fabricante === ALL || e.fabricante === filters.fabricante) &&
      (filters.setor === ALL || e.setor === filters.setor) &&
      matchesText(e.modelo, filters.modelo) &&
      matchesText(e.tag, filters.tag) &&
      matchesText(e.serie, filters.serie) &&
      matchesText(e.patrimonio, filters.patrimonio)
    );
  });

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.estado !== ALL) n++;
    if (filters.proprietario !== ALL) n++;
    if (filters.tipo !== ALL) n++;
    if (filters.fabricante !== ALL) n++;
    if (filters.setor !== ALL) n++;
    (["modelo", "tag", "serie", "patrimonio"] as const).forEach((k) => {
      if (filters[k].trim()) n++;
    });
    return n;
  }, [filters]);

  const openCreate = () => { setSelected(null); setMode("create"); setDialogOpen(true); };
  const openView = (e: Equipamento) => { setDetalhesEq(e); setDetalhesOpen(true); };
  const openEdit = (e: Equipamento) => { setSelected(e); setMode("edit"); setDialogOpen(true); };

  const openCriarOS = (e: Equipamento, tipoServico?: string) => {
    setOsPreset({ equipamento: e, tipoServico });
    setOsOpen(true);
  };

  const openProtocolo = (e: Equipamento) => {
    setProtocoloEq(e);
    setProtocoloOpen(true);
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
        onEdit={(e) => { setDetalhesOpen(false); openEdit(e); }}
        onCriarOS={(e, tipo) => { setDetalhesOpen(false); openCriarOS(e, tipo); }}
        onCriarProtocolo={(e) => { setDetalhesOpen(false); openProtocolo(e); }}
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
      <ProtocoloRecolhimentoDialog
        open={protocoloOpen}
        onOpenChange={(v) => { setProtocoloOpen(v); if (!v) setProtocoloEq(null); }}
        equipamento={protocoloEq}
      />

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
              <div>
                <Select value={filters.estado} onValueChange={(v) => setFilters((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Estado (todos)</SelectItem>
                    {opts.estado.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filters.proprietario} onValueChange={(v) => setFilters((f) => ({ ...f, proprietario: v }))}>
                  <SelectTrigger><SelectValue placeholder="Proprietário" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Proprietário (todos)</SelectItem>
                    {opts.proprietario.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filters.tipo} onValueChange={(v) => setFilters((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tipo (todos)</SelectItem>
                    {opts.tipo.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filters.fabricante} onValueChange={(v) => setFilters((f) => ({ ...f, fabricante: v }))}>
                  <SelectTrigger><SelectValue placeholder="Fabricante" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Fabricante (todos)</SelectItem>
                    {opts.fabricante.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filters.setor} onValueChange={(v) => setFilters((f) => ({ ...f, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Setor (todos)</SelectItem>
                    {opts.setor.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Identificação (TAG)"
                value={filters.tag}
                onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
              />
              <Input
                placeholder="Modelo"
                value={filters.modelo}
                onChange={(e) => setFilters((f) => ({ ...f, modelo: e.target.value }))}
              />
              <Input
                placeholder="Número de Série"
                value={filters.serie}
                onChange={(e) => setFilters((f) => ({ ...f, serie: e.target.value }))}
              />
              <Input
                placeholder="Patrimônio"
                value={filters.patrimonio}
                onChange={(e) => setFilters((f) => ({ ...f, patrimonio: e.target.value }))}
              />
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
                          <DropdownMenuItem onClick={() => openProtocolo(e)}>
                            <FileBox className="w-4 h-4 mr-2" /> Criar Protocolo de Recolhimento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => futuro("Criar Preventiva")}>
                            <CalendarCheck className="w-4 h-4 mr-2" /> Criar Preventiva
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum equipamento encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Equipamentos;

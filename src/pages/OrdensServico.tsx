import { ClipboardList, FileSignature, Plus, Search, Eye, Pencil, EyeOff, MoreHorizontal, SlidersHorizontal, ChevronDown, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchableSelect from "@/components/SearchableSelect";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData, OrdemServico, Empresa, Equipamento } from "@/contexts/DataContext";
import OrdemServicoFormDialog, { DialogMode } from "@/components/OrdemServicoFormDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";
import ProtocoloEntregaDialog from "@/components/ProtocoloEntregaDialog";

const ALL = "__all__";

const OrdensServico = () => {
  const { ordensServico, equipamentos, empresasList, estadosOS, tiposOS, updateOrdemServico } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<OrdemServico | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [osDetalhes, setOsDetalhes] = useState<OrdemServico | null>(null);
  const [empresaOpen, setEmpresaOpen] = useState(false);
  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null);
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipSel, setEquipSel] = useState<Equipamento | null>(null);
  const [orcOpen, setOrcOpen] = useState(false);
  const [osParaOrcamento, setOsParaOrcamento] = useState<OrdemServico | null>(null);
  const [hideClosed, setHideClosed] = useState(false);
  const [editingEstadoId, setEditingEstadoId] = useState<number | null>(null);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [osEntrega, setOsEntrega] = useState<OrdemServico | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const emptyFilters = {
    estado: ALL, solicitante: ALL, tipoServico: ALL, responsavelTecnico: "", numero: "",
  };
  const [filters, setFilters] = useState(emptyFilters);

  const equipamentoLabel = (id: number | null) => {
    const eq = equipamentos.find((e) => e.id === id);
    return eq ? `${eq.tipo} - ${eq.modelo}` : "—";
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const HIDDEN_ESTADOS = new Set(["Fechada"]);
  const HIDDEN_TIPOS = new Set(["Manutenção Preventiva", "Calibração"]);

  const matchesText = (val: string, q: string) => !q.trim() || val.toLowerCase().includes(q.trim().toLowerCase());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ordensServico.filter((os) => {
      const matchSearch =
        !q ||
        os.numero.toLowerCase().includes(q) ||
        os.solicitante.toLowerCase().includes(q) ||
        os.tipoServico.toLowerCase().includes(q) ||
        equipamentoLabel(os.equipamentoId).toLowerCase().includes(q);
      const matchHide =
        !hideClosed || (!HIDDEN_ESTADOS.has(os.estado) && !HIDDEN_TIPOS.has(os.tipoServico));
      const matchAdv =
        (filters.estado === ALL || os.estado === filters.estado) &&
        (filters.solicitante === ALL || os.solicitante === filters.solicitante) &&
        (filters.tipoServico === ALL || os.tipoServico === filters.tipoServico) &&
        matchesText(os.responsavelTecnico, filters.responsavelTecnico) &&
        matchesText(os.numero, filters.numero);
      return matchSearch && matchHide && matchAdv;
    });
  }, [ordensServico, search, equipamentos, hideClosed, filters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.estado !== ALL) n++;
    if (filters.solicitante !== ALL) n++;
    if (filters.tipoServico !== ALL) n++;
    if (filters.responsavelTecnico.trim()) n++;
    if (filters.numero.trim()) n++;
    return n;
  }, [filters]);

  const handleEstadoChange = (os: OrdemServico, novoEstado: string) => {
    if (!novoEstado || novoEstado === os.estado) {
      setEditingEstadoId(null);
      return;
    }
    updateOrdemServico(os.id, {
      dataCriacao: os.dataCriacao,
      estado: novoEstado,
      responsavelTecnico: os.responsavelTecnico,
      solicitante: os.solicitante,
      equipamentoId: os.equipamentoId,
      tipoServico: os.tipoServico,
      origemProblema: os.origemProblema,
      descricaoServico: os.descricaoServico,
      acessorios: os.acessorios,
      observacoes: os.observacoes,
    });
    setEditingEstadoId(null);
  };

  const openCreate = () => { setSelected(null); setMode("create"); setOpen(true); };
  const openView = (os: OrdemServico) => { setOsDetalhes(os); setDetalhesOpen(true); };
  const openEdit = (os: OrdemServico) => { setSelected(os); setMode("edit"); setOpen(true); };

  const handleGerarOrcamento = (os: OrdemServico) => {
    setOsParaOrcamento(os);
    setOrcOpen(true);
  };

  const openEmpresa = (nome: string) => {
    const emp = empresasList.find((e) => e.nome === nome);
    if (emp) { setEmpresaSel(emp); setEmpresaOpen(true); }
  };
  const openEquipamento = (id: number | null) => {
    const eq = equipamentos.find((e) => e.id === id);
    if (eq) { setEquipSel(eq); setEquipOpen(true); }
  };
  const openOSById = (id: number) => {
    const os = ordensServico.find((o) => o.id === id);
    if (os) {
      setEquipOpen(false);
      setOsDetalhes(os);
      setDetalhesOpen(true);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ordens de Serviço" description="Gerencie as ordens de serviço">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova OS
        </Button>
      </PageHeader>

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
                value={filters.estado === ALL ? "" : filters.estado}
                onValueChange={(v) => setFilters((f) => ({ ...f, estado: v || ALL }))}
                options={estadosOS}
                placeholder="Estado (todos)"
                emptyText="Nenhum estado encontrado."
              />
              <SearchableSelect
                value={filters.solicitante === ALL ? "" : filters.solicitante}
                onValueChange={(v) => setFilters((f) => ({ ...f, solicitante: v || ALL }))}
                options={empresasList.map((e) => e.nome)}
                placeholder="Solicitante (todos)"
                emptyText="Nenhum solicitante encontrado."
              />
              <SearchableSelect
                value={filters.tipoServico === ALL ? "" : filters.tipoServico}
                onValueChange={(v) => setFilters((f) => ({ ...f, tipoServico: v || ALL }))}
                options={tiposOS}
                placeholder="Tipo de Serviço (todos)"
                emptyText="Nenhum tipo encontrado."
              />
              <Input
                placeholder="Número da OS"
                value={filters.numero}
                onChange={(e) => setFilters((f) => ({ ...f, numero: e.target.value }))}
              />
              <Input
                placeholder="Técnico Executor"
                value={filters.responsavelTecnico}
                onChange={(e) => setFilters((f) => ({ ...f, responsavelTecnico: e.target.value }))}
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
        <div className="px-5 py-4 border-b flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, equipamento ou solicitante..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={hideClosed ? "default" : "outline"}
            size="sm"
            onClick={() => setHideClosed((v) => !v)}
            title="Ocultar OS fechadas, preventivas e calibrações"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            {hideClosed ? "Mostrar todas" : "Ocultar fechadas/preventivas"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Número</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Solicitante</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Técnico Executor</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo de Serviço</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data de Criação</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((os) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => openView(os)}
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4" /> {os.numero}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    {editingEstadoId === os.id ? (
                      <Select
                        defaultOpen
                        value={os.estado}
                        onValueChange={(v) => handleEstadoChange(os, v)}
                        onOpenChange={(o) => { if (!o) setTimeout(() => setEditingEstadoId(null), 50); }}
                      >
                        <SelectTrigger className="h-7 w-[240px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {estadosOS.map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingEstadoId(os.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Clique para editar o estado"
                      >
                        {os.estado}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => openEmpresa(os.solicitante)}
                      className="text-primary hover:underline text-left"
                    >
                      {os.solicitante}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    {os.equipamentoId ? (
                      <button
                        type="button"
                        onClick={() => openEquipamento(os.equipamentoId)}
                        className="text-primary hover:underline text-left"
                      >
                        {equipamentoLabel(os.equipamentoId)}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{os.responsavelTecnico}</td>
                  <td className="px-5 py-3 text-muted-foreground">{os.tipoServico}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(os.dataCriacao)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Ações">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-popover">
                          <DropdownMenuItem onClick={() => openView(os)}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(os)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleGerarOrcamento(os)}>
                            <FileSignature className="w-4 h-4 mr-2" /> Gerar Orçamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setOsEntrega(os); setEntregaOpen(true); }}>
                            <PackageCheck className="w-4 h-4 mr-2" /> Protocolo de Entrega
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma ordem de serviço cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrdemServicoFormDialog open={open} onOpenChange={setOpen} mode={mode} os={selected} />
      <OrdemServicoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(v) => {
          setDetalhesOpen(v);
          if (!v) setOsDetalhes(null);
        }}
        os={osDetalhes}
        onGerarOrcamento={(o) => { setDetalhesOpen(false); handleGerarOrcamento(o); }}
        onCriarProtocoloEntrega={(o) => { setDetalhesOpen(false); setOsEntrega(o); setEntregaOpen(true); }}
      />
      <EmpresaDetalhesDialog
        open={empresaOpen}
        onOpenChange={(v) => { setEmpresaOpen(v); if (!v) setEmpresaSel(null); }}
        empresa={empresaSel}
      />
      <EquipamentoDetalhesDialog
        open={equipOpen}
        onOpenChange={(v) => { setEquipOpen(v); if (!v) setEquipSel(null); }}
        equipamento={equipSel}
        onSelectOS={openOSById}
      />
      <OrcamentoFormDialog
        open={orcOpen}
        onOpenChange={(v) => {
          setOrcOpen(v);
          if (!v) setOsParaOrcamento(null);
        }}
        fromOS={osParaOrcamento}
      />
    </div>
  );
};

export default OrdensServico;

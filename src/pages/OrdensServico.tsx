import { ClipboardList, FileSignature, Plus, Search, Eye, Pencil, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useData, OrdemServico, Empresa, Equipamento } from "@/contexts/DataContext";
import OrdemServicoFormDialog, { DialogMode } from "@/components/OrdemServicoFormDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";

const OrdensServico = () => {
  const { ordensServico, equipamentos, empresasList, estadosOS, updateOrdemServico } = useData();
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
      return matchSearch && matchHide;
    });
  }, [ordensServico, search, equipamentos, hideClosed]);

  const handleEstadoChange = (os: OrdemServico, novoEstado: string) => {
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
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {os.estado}
                    </span>
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
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openView(os)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(os)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGerarOrcamento(os)}
                        title="Gerar orçamento a partir desta OS"
                        className="text-primary"
                      >
                        <FileSignature className="w-4 h-4" />
                      </Button>
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

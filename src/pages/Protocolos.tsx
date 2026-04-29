import { FileBox, Search, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import { ProtocoloRecolhimento, useData } from "@/contexts/DataContext";

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const Protocolos = () => {
  const { protocolosRecolhimento, ordensServico, equipamentos } = useData();
  const [search, setSearch] = useState("");
  const [selecionado, setSelecionado] = useState<ProtocoloRecolhimento | null>(null);

  const [osOpen, setOsOpen] = useState(false);
  const [osSel, setOsSel] = useState(ordensServico[0] ?? null);
  const [eqOpen, setEqOpen] = useState(false);
  const [eqSel, setEqSel] = useState(equipamentos[0] ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...protocolosRecolhimento].sort((a, b) =>
      (b.dataCriacao || "").localeCompare(a.dataCriacao || "")
    );
    if (!q) return list;
    return list.filter(
      (p) =>
        p.numero.toLowerCase().includes(q) ||
        p.empresa.toLowerCase().includes(q) ||
        p.recolhidoPor.toLowerCase().includes(q) ||
        p.osNumero.toLowerCase().includes(q) ||
        p.defeitoRelatado.toLowerCase().includes(q)
    );
  }, [protocolosRecolhimento, search]);

  const equipamentoLabel = (id: number) => {
    const eq = equipamentos.find((e) => e.id === id);
    return eq ? `${eq.tipo} - ${eq.modelo}` : "—";
  };

  const abrirOS = (osId: number | null) => {
    if (!osId) return;
    const os = ordensServico.find((o) => o.id === osId);
    if (os) {
      setOsSel(os);
      setOsOpen(true);
    }
  };

  const abrirEquipamento = (id: number) => {
    const eq = equipamentos.find((e) => e.id === id);
    if (eq) {
      setEqSel(eq);
      setEqOpen(true);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Protocolos"
        description="Consulte os protocolos de recolhimento gerados a partir dos equipamentos"
      />

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, empresa, OS..."
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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Recolhido por</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">OS</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">
                    <button
                      type="button"
                      onClick={() => setSelecionado(p)}
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <FileBox className="w-4 h-4" /> {p.numero}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(p.dataCriacao)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.empresa}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => abrirEquipamento(p.equipamentoId)}
                      className="text-primary hover:underline"
                    >
                      {equipamentoLabel(p.equipamentoId)}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.recolhidoPor}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => abrirOS(p.osId)}
                      className="text-primary hover:underline"
                    >
                      {p.osNumero}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelecionado(p)} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum protocolo de recolhimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog de visualização do protocolo */}
      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selecionado ? `Protocolo de Recolhimento ${selecionado.numero}` : ""}
            </DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Data: </span>
                  <span>{formatDate(selecionado.dataCriacao)}</span>
                </div>
                <div>
                  <span className="font-semibold">Empresa: </span>
                  <span>{selecionado.empresa}</span>
                </div>
                <div>
                  <span className="font-semibold">Equipamento: </span>
                  <button
                    type="button"
                    onClick={() => {
                      abrirEquipamento(selecionado.equipamentoId);
                      setSelecionado(null);
                    }}
                    className="text-primary hover:underline"
                  >
                    {equipamentoLabel(selecionado.equipamentoId)}
                  </button>
                </div>
                <div>
                  <span className="font-semibold">Recolhido por: </span>
                  <span>{selecionado.recolhidoPor}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold">OS gerada: </span>
                  <button
                    type="button"
                    onClick={() => {
                      abrirOS(selecionado.osId);
                      setSelecionado(null);
                    }}
                    className="text-primary hover:underline"
                  >
                    {selecionado.osNumero}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold">Defeito relatado</h3>
                <p className="text-sm whitespace-pre-wrap">{selecionado.defeitoRelatado}</p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold">Acessórios</h3>
                {selecionado.acessorios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum acessório registrado.</p>
                ) : (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selecionado.acessorios.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrdemServicoDetalhesDialog open={osOpen} onOpenChange={setOsOpen} os={osSel} />
      <EquipamentoDetalhesDialog
        open={eqOpen}
        onOpenChange={setEqOpen}
        equipamento={eqSel}
        onSelectOS={(id) => {
          const os = ordensServico.find((o) => o.id === id);
          if (os) {
            setEqOpen(false);
            setOsSel(os);
            setOsOpen(true);
          }
        }}
      />
    </div>
  );
};

export default Protocolos;

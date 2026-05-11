import { FileBox, Search, Eye, Printer, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import { ProtocoloRecolhimento, ProtocoloEntrega, useData } from "@/contexts/DataContext";
import { generateProtocoloEntregaPdf } from "@/lib/protocoloEntregaPdf";

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const Protocolos = () => {
  const { protocolosRecolhimento, protocolosEntrega, ordensServico, equipamentos, empresasList } = useData();
  const [search, setSearch] = useState("");
  const [searchEnt, setSearchEnt] = useState("");
  const [selecionado, setSelecionado] = useState<ProtocoloRecolhimento | null>(null);
  const [entregaSel, setEntregaSel] = useState<ProtocoloEntrega | null>(null);

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

  const filteredEntrega = useMemo(() => {
    const q = searchEnt.trim().toLowerCase();
    const list = [...protocolosEntrega].sort((a, b) =>
      (b.dataEntrega || "").localeCompare(a.dataEntrega || "")
    );
    if (!q) return list;
    return list.filter(
      (p) =>
        p.numero.toLowerCase().includes(q) ||
        p.empresa.toLowerCase().includes(q) ||
        p.entreguePor.toLowerCase().includes(q) ||
        p.recebidoPor.toLowerCase().includes(q) ||
        p.osNumero.toLowerCase().includes(q)
    );
  }, [protocolosEntrega, searchEnt]);

  const equipamentoLabel = (id: number | null) => {
    if (!id) return "—";
    const eq = equipamentos.find((e) => e.id === id);
    return eq ? `${eq.tipo} - ${eq.modelo}` : "—";
  };

  const abrirOS = (osId: number | null) => {
    if (!osId) return;
    const os = ordensServico.find((o) => o.id === osId);
    if (os) { setOsSel(os); setOsOpen(true); }
  };

  const abrirEquipamento = (id: number | null) => {
    if (!id) return;
    const eq = equipamentos.find((e) => e.id === id);
    if (eq) { setEqSel(eq); setEqOpen(true); }
  };

  const imprimirEntrega = (pe: ProtocoloEntrega) => {
    const empresa = empresasList.find((e) => e.nome === pe.empresa);
    const equipamento = equipamentos.find((e) => e.id === pe.equipamentoId);
    generateProtocoloEntregaPdf(pe, empresa, equipamento);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Protocolos"
        description="Consulte os protocolos de recolhimento e entrega"
      />

      <Tabs defaultValue="recolhimento" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recolhimento">
            <FileBox className="w-4 h-4 mr-2" /> Recolhimento
          </TabsTrigger>
          <TabsTrigger value="entrega">
            <PackageCheck className="w-4 h-4 mr-2" /> Entrega
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recolhimento">
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
                      <td className="px-5 py-3 font-medium">
                        <button type="button" onClick={() => setSelecionado(p)} className="text-primary hover:underline flex items-center gap-2">
                          <FileBox className="w-4 h-4" /> {p.numero}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(p.dataCriacao)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.empresa}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <button type="button" onClick={() => abrirEquipamento(p.equipamentoId)} className="text-primary hover:underline">
                          {equipamentoLabel(p.equipamentoId)}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.recolhidoPor}</td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => abrirOS(p.osId)} className="text-primary hover:underline">
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
        </TabsContent>

        <TabsContent value="entrega">
          <div className="bg-card rounded-xl border">
            <div className="px-5 py-4 border-b flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, empresa, OS..."
                  className="pl-9"
                  value={searchEnt}
                  onChange={(e) => setSearchEnt(e.target.value)}
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
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Entregue por</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Recebido por</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">OS</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntrega.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium">
                        <button type="button" onClick={() => setEntregaSel(p)} className="text-primary hover:underline flex items-center gap-2">
                          <PackageCheck className="w-4 h-4" /> {p.numero}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(p.dataEntrega)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.empresa}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <button type="button" onClick={() => abrirEquipamento(p.equipamentoId)} className="text-primary hover:underline">
                          {equipamentoLabel(p.equipamentoId)}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.entreguePor}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.recebidoPor}</td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => abrirOS(p.osId)} className="text-primary hover:underline">
                          {p.osNumero}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEntregaSel(p)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => imprimirEntrega(p)} title="Imprimir PDF">
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntrega.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        Nenhum protocolo de entrega encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detalhes - Recolhimento */}
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
                <div><span className="font-semibold">Data: </span>{formatDate(selecionado.dataCriacao)}</div>
                <div><span className="font-semibold">Empresa: </span>{selecionado.empresa}</div>
                <div><span className="font-semibold">Equipamento: </span>{equipamentoLabel(selecionado.equipamentoId)}</div>
                <div><span className="font-semibold">Recolhido por: </span>{selecionado.recolhidoPor}</div>
                <div className="sm:col-span-2"><span className="font-semibold">OS gerada: </span>{selecionado.osNumero}</div>
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

      {/* Detalhes - Entrega */}
      <Dialog open={!!entregaSel} onOpenChange={(v) => !v && setEntregaSel(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between mr-8">
              <span>{entregaSel ? `Protocolo de Entrega ${entregaSel.numero}` : ""}</span>
              {entregaSel && (
                <Button size="sm" variant="outline" onClick={() => imprimirEntrega(entregaSel)}>
                  <Printer className="w-4 h-4 mr-2" /> PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {entregaSel && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="font-semibold">Data da Entrega: </span>{formatDate(entregaSel.dataEntrega)}</div>
                <div><span className="font-semibold">Empresa: </span>{entregaSel.empresa}</div>
                <div><span className="font-semibold">Equipamento: </span>{equipamentoLabel(entregaSel.equipamentoId)}</div>
                <div><span className="font-semibold">OS: </span>{entregaSel.osNumero}</div>
                <div><span className="font-semibold">Entregue por: </span>{entregaSel.entreguePor}</div>
                <div><span className="font-semibold">Recebido por: </span>{entregaSel.recebidoPor}</div>
                <div><span className="font-semibold">Testado: </span>{entregaSel.testado ? "Sim" : "Não"}</div>
                <div><span className="font-semibold">Funciona: </span>{entregaSel.funciona ? "Sim" : "Não"}</div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{entregaSel.observacoes || "—"}</p>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold">Acessórios</h3>
                {entregaSel.acessorios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum acessório registrado.</p>
                ) : (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {entregaSel.acessorios.map((a, i) => <li key={i}>{a}</li>)}
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
          if (os) { setEqOpen(false); setOsSel(os); setOsOpen(true); }
        }}
      />
    </div>
  );
};

export default Protocolos;

import { CalendarDays, ChevronDown, Eye, Files, Loader2, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import PlanoCicloDetalhesDialog from "@/components/PlanoCicloDetalhesDialog";
import PlanoRelatorioAnualDialog from "@/components/PlanoRelatorioAnualDialog";
import PlanoRelatorioCicloDialog from "@/components/PlanoRelatorioCicloDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAdicionarEquipamentosCicloPlano,
  useAtualizarTituloControleCicloPlano,
  usePlano,
  usePlanoHistorico,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import {
  getSetorNomePlanoEquipamento,
  type PlanoCiclo,
  type PlanoEquipamento,
} from "@/services/planosService";
import { formatDateTimeValue } from "@/utils/planoDatas";

type Props = {
  planoId: string;
};

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const contar = (ciclo: PlanoCiclo, status?: string) =>
  (ciclo.itens || []).filter((item) => !status || item.status === status).length;

const equipamentoNome = (item: PlanoEquipamento) =>
  [
    item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento",
    item.equipamento?.fabricante,
    item.equipamento?.modelo,
  ].filter(Boolean).join(" - ");

const servicosEquipamento = (item: PlanoEquipamento) =>
  [
    item.executar_preventiva ? "P" : null,
    item.executar_calibracao ? "C" : null,
    item.executar_seguranca_eletrica ? "E" : null,
  ].filter(Boolean).join(" / ") || "-";

const PlanoHistoricoTab = ({ planoId }: Props) => {
  const { data: ciclos = [], isLoading } = usePlanoHistorico(planoId);
  const { data: plano } = usePlano(planoId);
  const atualizarTitulo = useAtualizarTituloControleCicloPlano();
  const adicionarEquipamentos = useAdicionarEquipamentosCicloPlano();
  const [selectedCicloId, setSelectedCicloId] = useState<string | null>(null);
  const [relatorioCicloId, setRelatorioCicloId] = useState<string | null>(null);
  const [relatorioAnualOpen, setRelatorioAnualOpen] = useState(false);
  const [relatorioAnualModo, setRelatorioAnualModo] = useState<"cronograma" | "cronograma_completo">("cronograma");
  const [relatorioAnualCiclo, setRelatorioAnualCiclo] = useState<PlanoCiclo | null>(null);
  const [cicloEditando, setCicloEditando] = useState<PlanoCiclo | null>(null);
  const [tituloEditando, setTituloEditando] = useState("");
  const [cicloAdicionando, setCicloAdicionando] = useState<PlanoCiclo | null>(null);
  const [buscaEquipamento, setBuscaEquipamento] = useState("");
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<string[]>([]);
  const historico = ciclos.filter((ciclo) => ciclo.status !== "aberto");

  const equipamentosDisponiveisCiclo = useMemo(() => {
    if (!cicloAdicionando) return [];
    const itensExistentes = new Set(
      (cicloAdicionando.itens || []).map((item) => item.plano_equipamento_id).filter(Boolean)
    );
    const termo = buscaEquipamento.trim().toLowerCase();

    return (plano?.equipamentos || [])
      .filter((item) => item.ativo && !itensExistentes.has(item.id))
      .filter((item) => {
        if (!termo) return true;
        const texto = [
          equipamentoNome(item),
          getSetorNomePlanoEquipamento(item),
          item.equipamento?.numero_serie,
          item.equipamento?.patrimonio,
          item.equipamento?.tag,
        ].filter(Boolean).join(" ").toLowerCase();
        return texto.includes(termo);
      });
  }, [buscaEquipamento, cicloAdicionando, plano?.equipamentos]);

  const abrirRelatorioCompleto = (cicloId: string) => {
    setRelatorioCicloId(cicloId);
  };

  const abrirRelatorioAnual = (modo: "cronograma" | "cronograma_completo", ciclo?: PlanoCiclo) => {
    setRelatorioAnualModo(modo);
    setRelatorioAnualCiclo(ciclo || null);
    setRelatorioAnualOpen(true);
  };

  const abrirEdicaoTitulo = (ciclo: PlanoCiclo) => {
    setCicloEditando(ciclo);
    setTituloEditando(ciclo.titulo_controle || ciclo.titulo);
  };

  const salvarTitulo = async () => {
    if (!cicloEditando) return;
    try {
      await atualizarTitulo.mutateAsync({
        cicloId: cicloEditando.id,
        planoId,
        titulo: tituloEditando,
      });
      toast({ title: "Nome do ciclo atualizado." });
      setCicloEditando(null);
      setTituloEditando("");
    } catch (error) {
      toast({
        title: "Erro ao atualizar ciclo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirAdicionarEquipamentos = (ciclo: PlanoCiclo) => {
    setCicloAdicionando(ciclo);
    setBuscaEquipamento("");
    setEquipamentosSelecionados([]);
  };

  const fecharAdicionarEquipamentos = () => {
    setCicloAdicionando(null);
    setBuscaEquipamento("");
    setEquipamentosSelecionados([]);
  };

  const toggleEquipamento = (id: string, checked: boolean) => {
    setEquipamentosSelecionados((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)
    );
  };

  const salvarEquipamentosNoCiclo = async () => {
    if (!cicloAdicionando) return;
    try {
      await adicionarEquipamentos.mutateAsync({
        cicloId: cicloAdicionando.id,
        planoId,
        planoEquipamentoIds: equipamentosSelecionados,
      });
      toast({
        title: "Equipamentos adicionados ao ciclo.",
        description: "O ciclo foi reaberto para executar apenas os novos itens.",
      });
      fecharAdicionarEquipamentos();
    } catch (error) {
      toast({
        title: "Erro ao adicionar equipamentos",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <PlanoCicloDetalhesDialog
        open={Boolean(selectedCicloId)}
        cicloId={selectedCicloId}
        onOpenChange={(open) => {
          if (!open) setSelectedCicloId(null);
        }}
      />
      <PlanoRelatorioCicloDialog
        open={Boolean(relatorioCicloId)}
        cicloId={relatorioCicloId}
        onOpenChange={(open) => {
          if (!open) setRelatorioCicloId(null);
        }}
      />
      <PlanoRelatorioAnualDialog
        open={relatorioAnualOpen}
        onOpenChange={(open) => {
          setRelatorioAnualOpen(open);
          if (!open) setRelatorioAnualCiclo(null);
        }}
        planoId={planoId}
        ciclo={relatorioAnualCiclo}
        modoInicial={relatorioAnualModo}
      />
      <Dialog
        open={Boolean(cicloEditando)}
        onOpenChange={(open) => {
          if (!open) {
            setCicloEditando(null);
            setTituloEditando("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar nome do ciclo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome para controle interno</Label>
            <Input
              value={tituloEditando}
              onChange={(event) => setTituloEditando(event.target.value)}
              placeholder="Ex: Visita 06/2026 - PSF Ginasio"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Esta alteracao serve apenas para organizacao do ciclo no sistema.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCicloEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarTitulo} disabled={atualizarTitulo.isPending}>
              {atualizarTitulo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(cicloAdicionando)}
        onOpenChange={(open) => {
          if (!open) fecharAdicionarEquipamentos();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar equipamentos ao ciclo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Os itens selecionados serao adicionados como pendentes no ciclo. O que ja foi executado permanece sem alteracao.
            </p>
            <Input
              value={buscaEquipamento}
              onChange={(event) => setBuscaEquipamento(event.target.value)}
              placeholder="Buscar equipamento, setor, NS, patrimonio ou TAG"
            />
            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <Th />
                    <Th>Equipamento</Th>
                    <Th>Setor</Th>
                    <Th>Identificacao</Th>
                    <Th>Servicos</Th>
                  </tr>
                </thead>
                <tbody>
                  {equipamentosDisponiveisCiclo.map((item) => (
                    <tr key={item.id} className="border-t">
                      <Td>
                        <Checkbox
                          checked={equipamentosSelecionados.includes(item.id)}
                          onCheckedChange={(checked) => toggleEquipamento(item.id, Boolean(checked))}
                        />
                      </Td>
                      <Td>{equipamentoNome(item)}</Td>
                      <Td>{getSetorNomePlanoEquipamento(item)}</Td>
                      <Td>
                        {[
                          item.equipamento?.numero_serie ? `NS ${item.equipamento.numero_serie}` : null,
                          item.equipamento?.patrimonio ? `Pat. ${item.equipamento.patrimonio}` : null,
                          item.equipamento?.tag ? `TAG ${item.equipamento.tag}` : null,
                        ].filter(Boolean).join(" | ") || "-"}
                      </Td>
                      <Td>{servicosEquipamento(item)}</Td>
                    </tr>
                  ))}
                  {!equipamentosDisponiveisCiclo.length && (
                    <tr>
                      <Td>Nenhum equipamento disponivel para adicionar a este ciclo.</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharAdicionarEquipamentos}>
              Cancelar
            </Button>
            <Button
              onClick={salvarEquipamentosNoCiclo}
              disabled={!equipamentosSelecionados.length || adicionarEquipamentos.isPending}
            >
              {adicionarEquipamentos.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar e reabrir ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <Th>Ciclo</Th>
              <Th>Execucao</Th>
              <Th>Fechamento</Th>
              <Th>Total de itens</Th>
              <Th>Concluidos</Th>
              <Th>Nao conformes</Th>
              <Th>Nao localizados</Th>
              <Th>Situacao</Th>
              <Th>Acoes</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><Td>Carregando historico...</Td></tr>}
            {!isLoading && historico.map((ciclo) => (
              <tr key={ciclo.id} className="border-t">
                <Td>{ciclo.titulo_controle || ciclo.titulo}</Td>
                <Td>{formatDateTimeValue(ciclo.data_abertura)}</Td>
                <Td>{formatDateTimeValue(ciclo.data_fechamento_real || ciclo.data_fechamento_prevista)}</Td>
                <Td>{contar(ciclo)}</Td>
                <Td>{contar(ciclo, "concluido")}</Td>
                <Td>0</Td>
                <Td>{contar(ciclo, "nao_localizado")}</Td>
                <Td><Badge variant="outline">{statusLabel[ciclo.status]}</Badge></Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => abrirAdicionarEquipamentos(ciclo)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar equipamentos
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrirEdicaoTitulo(ciclo)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar nome
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedCicloId(ciclo.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Files className="mr-2 h-4 w-4" />
                          Relatório
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirRelatorioCompleto(ciclo.id)}>
                          <Files className="mr-2 h-4 w-4" />
                          Relatório Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => abrirRelatorioAnual("cronograma", ciclo)}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Somente Cronograma
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => abrirRelatorioAnual("cronograma", ciclo)}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Atualizar visita
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => abrirRelatorioAnual("cronograma_completo", ciclo)}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Cronograma Completo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Td>
              </tr>
            ))}
            {!isLoading && !historico.length && <tr><Td>Nenhum ciclo concluido ou cancelado.</Td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoHistoricoTab;

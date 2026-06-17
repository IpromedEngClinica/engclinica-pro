import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  useChecklistPreventivaPorOs,
  useConcluirChecklistPreventiva,
  useExecutarPreventiva,
  useSalvarChecklistRascunho,
} from "@/hooks/usePreventivas";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import {
  AprovacaoUsoResposta,
  ChecklistResposta,
  ProcedimentoPreventiva,
  ProcedimentoPreventivaItem,
  procedimentosPreventivaService,
} from "@/services/procedimentosPreventivaService";
import { marcarChecklistCompletoComoConforme } from "@/utils/checklistPreventiva";

type PreventivaChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento?: EquipamentoSupabase | null;
  procedimento?: ProcedimentoPreventiva | null;
  osExistenteId?: string | null;
  planoCicloItemId?: string | null;
  dataFechamentoPrevista?: string | null;
  modo?: "criar_os" | "usar_os_existente";
  onConcluido?: (resultado: { osId: string; checklistId?: string | null }) => void;
};

type RespostaItem = {
  resposta: ChecklistResposta | AprovacaoUsoResposta | "";
  observacao: string;
};

const conformidadeOptions: Array<{ value: ChecklistResposta; label: string }> = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Nao Conforme" },
  { value: "nao_aplica", label: "N/A" },
];

const aprovacaoOptions: Array<{ value: AprovacaoUsoResposta; label: string }> = [
  { value: "aprovado", label: "Aprovado" },
  { value: "nao_aprovado", label: "Nao aprovado" },
  { value: "aprovado_com_restricao", label: "Aprovado com restricao" },
];

const getEquipamentoLabel = (equipamento: EquipamentoSupabase) =>
  [
    equipamento.tipo_equipamento?.nome || equipamento.tipo_texto || "Equipamento",
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.tag || equipamento.patrimonio || equipamento.numero_serie,
  ].filter(Boolean).join(" - ");

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome_fantasia || equipamento.empresa?.nome || "Nao informado";

const getChecklistPreventiva = (os: OrdemServicoSupabase | null | undefined) => {
  const checklist = os?.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const itemKey = (item: ProcedimentoPreventivaItem | { id: string; procedimento_item_id?: string | null; descricao: string; tipo_resposta: string }) =>
  "procedimento_id" in item ? item.id : item.procedimento_item_id || item.id;

const PreventivaChecklistDialog = ({
  open,
  onOpenChange,
  equipamento: equipamentoProp = null,
  procedimento: procedimentoProp = null,
  osExistenteId = null,
  planoCicloItemId = null,
  dataFechamentoPrevista = null,
  onConcluido,
}: PreventivaChecklistDialogProps) => {
  const usarOsExistente = Boolean(osExistenteId);
  const executarPreventiva = useExecutarPreventiva();
  const salvarRascunho = useSalvarChecklistRascunho();
  const concluirChecklist = useConcluirChecklistPreventiva();
  const { data: osExistente, isLoading: loadingOs } = useChecklistPreventivaPorOs(osExistenteId);
  const checklist = getChecklistPreventiva(osExistente);
  const equipamento = usarOsExistente ? osExistente?.equipamento || null : equipamentoProp;
  const [procedimentoOs, setProcedimentoOs] = useState<ProcedimentoPreventiva | null>(null);
  const procedimento = usarOsExistente ? procedimentoOs : procedimentoProp;
  const [respostas, setRespostas] = useState<Record<string, RespostaItem>>({});
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open || !usarOsExistente || !osExistente) return;

    const load = async () => {
      try {
        const checklistAtual = getChecklistPreventiva(osExistente);
        if (checklistAtual?.procedimento_id) {
          setProcedimentoOs(await procedimentosPreventivaService.buscarPorId(checklistAtual.procedimento_id));
          return;
        }
        const tipoId = osExistente.equipamento?.tipo_equipamento_id;
        setProcedimentoOs(tipoId ? await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(tipoId) : null);
      } catch (error) {
        toast({
          title: "Erro ao carregar procedimento preventivo",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      }
    };

    load();
  }, [open, osExistente, usarOsExistente]);

  const itens = useMemo(() => {
    if (procedimento?.itens?.length) return [...procedimento.itens].sort((a, b) => a.ordem - b.ordem);
    return [...(checklist?.itens || [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: item.procedimento_item_id || item.id,
        procedimento_id: checklist?.procedimento_id || "",
        descricao: item.descricao,
        tipo_resposta: item.tipo_resposta,
        ordem: item.ordem,
        obrigatorio: true,
        ativo: true,
      })) as ProcedimentoPreventivaItem[];
  }, [checklist, procedimento]);

  useEffect(() => {
    if (!open) return;

    const existing = new Map<string, RespostaItem>();
    (checklist?.itens || []).forEach((item) => {
      const key = item.procedimento_item_id || item.id;
      existing.set(key, {
        resposta: item.resposta,
        observacao: item.observacao || "",
      });
    });

    const initial: Record<string, RespostaItem> = {};
    itens.forEach((item) => {
      initial[item.id] = existing.get(item.id) || {
        resposta: !usarOsExistente && item.tipo_resposta === "conformidade" ? "conforme" : "",
        observacao: "",
      };
    });

    setRespostas(initial);
    setObservacoes(checklist?.observacoes || "");
  }, [checklist, itens, open, usarOsExistente]);

  const saving = executarPreventiva.isPending || salvarRascunho.isPending || concluirChecklist.isPending;

  if (loadingOs) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><p className="text-sm text-muted-foreground">Carregando checklist...</p></DialogContent>
      </Dialog>
    );
  }

  if (!equipamento) return null;

  const setResposta = (item: ProcedimentoPreventivaItem, patch: Partial<RespostaItem>) => {
    setRespostas((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || { resposta: "", observacao: "" }),
        ...patch,
      },
    }));
  };

  const montarRespostas = () => itens.map((item, index) => ({
    procedimentoItemId: item.id,
    descricao: item.descricao,
    tipoResposta: item.tipo_resposta,
    resposta: respostas[item.id]?.resposta || "",
    observacao: respostas[item.id]?.observacao,
    ordem: item.ordem || index + 1,
  }));

  const handleMarcarTodosConforme = () => {
    const respostasConformes = marcarChecklistCompletoComoConforme(
      itens.map((item) => ({
        id: item.id,
        tipoResposta: item.tipo_resposta,
        resposta: respostas[item.id]?.resposta || "",
        observacao: respostas[item.id]?.observacao || "",
      }))
    );

    setRespostas(Object.fromEntries(respostasConformes.map((item) => [
      item.id,
      {
        resposta: item.resposta as ChecklistResposta | AprovacaoUsoResposta,
        observacao: item.observacao,
      },
    ])));
  };

  const validarConclusao = () => {
    const faltantes = itens.filter((item) => item.obrigatorio && !respostas[item.id]?.resposta);
    if (faltantes.length > 0) {
      toast({ title: "Preencha todos os itens obrigatorios.", variant: "destructive" });
      return false;
    }
    const aprovacao = itens.find((item) => item.tipo_resposta === "aprovacao_uso");
    if (!aprovacao || !respostas[aprovacao.id]?.resposta) {
      toast({ title: "Informe a aprovacao para uso.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSalvarRascunho = async () => {
    if (!osExistenteId) return;
    try {
      const os = await salvarRascunho.mutateAsync({
        osId: osExistenteId,
        respostas: montarRespostas(),
        observacoes,
      });
      toast({ title: "Rascunho salvo." });
      onConcluido?.({ osId: os.id, checklistId: getChecklistPreventiva(os)?.id || null });
    } catch (error) {
      toast({
        title: "Erro ao salvar rascunho",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleConcluir = async () => {
    if (!procedimento && !checklist) {
      toast({
        title: "Nenhum procedimento preventivo cadastrado para este tipo de equipamento.",
        variant: "destructive",
      });
      return;
    }
    if (!validarConclusao()) return;

    try {
      if (osExistenteId) {
        if (osExistente?.status_sistema === "fechada") {
          const os = await salvarRascunho.mutateAsync({
            osId: osExistenteId,
            respostas: montarRespostas(),
            observacoes,
          });
          toast({ title: "Checklist atualizado." });
          onConcluido?.({ osId: os.id, checklistId: getChecklistPreventiva(os)?.id || null });
          onOpenChange(false);
          return;
        }

        const os = await concluirChecklist.mutateAsync({
          osId: osExistenteId,
          respostas: montarRespostas(),
          observacoes,
          dataFechamento: dataFechamentoPrevista,
          planoCicloItemId,
        });
        toast({ title: os.status_sistema === "fechada" ? "Preventiva concluida." : "Checklist salvo." });
        onConcluido?.({ osId: os.id, checklistId: getChecklistPreventiva(os)?.id || null });
        onOpenChange(false);
        return;
      }

      if (!procedimento) throw new Error("Procedimento preventivo nao encontrado.");
      const os = await executarPreventiva.mutateAsync({
        equipamentoId: equipamento.id,
        empresaId: equipamento.empresa_id,
        procedimentoId: procedimento.id,
        observacoes,
        respostas: montarRespostas().map((item) => ({
          ...item,
          resposta: item.resposta || "nao_aplica",
        })),
      });
      toast({ title: "OS de preventiva criada.", description: `OS ${os.numero} criada e fechada.` });
      onConcluido?.({ osId: os.id, checklistId: getChecklistPreventiva(os)?.id || null });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao concluir preventiva",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const semProcedimento = !procedimento && !checklist;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de Preventiva
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-4 text-sm">
            <div><p className="text-muted-foreground">Equipamento</p><p className="font-medium">{getEquipamentoLabel(equipamento)}</p></div>
            <div><p className="text-muted-foreground">Empresa</p><p className="font-medium">{getEmpresaNome(equipamento)}</p></div>
            <div><p className="text-muted-foreground">OS</p><p className="font-medium">{osExistente?.numero || "Sera criada ao concluir"}</p></div>
            <div><p className="text-muted-foreground">Procedimento</p><p className="font-medium">{procedimento?.titulo || checklist?.titulo_procedimento || "Nao encontrado"}</p></div>
          </div>

          {semProcedimento ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Nenhum procedimento preventivo cadastrado para este tipo de equipamento.
            </div>
          ) : (
            <div className="space-y-3">
              <Button type="button" variant="outline" size="sm" onClick={handleMarcarTodosConforme} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar todos como conforme
              </Button>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-left px-3 py-2 font-medium">Resposta</th>
                    <th className="text-left px-3 py-2 font-medium">Observacao</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const options = item.tipo_resposta === "aprovacao_uso" ? aprovacaoOptions : conformidadeOptions;
                    return (
                      <tr key={itemKey(item)} className="border-b last:border-0">
                        <td className="px-3 py-2 align-top">
                          <p className="font-medium">{item.descricao}</p>
                          {item.tipo_resposta === "aprovacao_uso" && <p className="text-xs text-muted-foreground">Aprovacao para uso</p>}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {options.map((option) => {
                              const selected = respostas[item.id]?.resposta === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setResposta(item, { resposta: option.value })}
                                  disabled={saving}
                                  className={`px-2 py-1 rounded-md border text-xs transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted/50"}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top min-w-[220px]">
                          <Input
                            value={respostas[item.id]?.observacao || ""}
                            onChange={(event) => setResposta(item, { observacao: event.target.value })}
                            placeholder="Opcional"
                            className="h-8"
                            disabled={saving}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Observacoes gerais</label>
            <Textarea rows={3} value={observacoes} onChange={(event) => setObservacoes(event.target.value)} disabled={saving} />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          {osExistenteId && <Button variant="outline" onClick={handleSalvarRascunho} disabled={saving || semProcedimento}>Salvar rascunho</Button>}
          <Button onClick={handleConcluir} disabled={saving || semProcedimento}>
            {saving ? "Salvando..." : osExistente?.status_sistema === "fechada" ? "Salvar alteracoes" : "Concluir preventiva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreventivaChecklistDialog;

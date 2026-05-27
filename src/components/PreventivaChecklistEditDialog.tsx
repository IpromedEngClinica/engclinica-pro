import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAtualizarChecklistPreventiva } from "@/hooks/usePreventivas";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import type {
  AprovacaoUsoResposta,
  ChecklistResposta,
} from "@/services/procedimentosPreventivaService";

interface PreventivaChecklistEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemServico: OrdemServicoSupabase | null;
}

type ChecklistEditResposta =
  | ChecklistResposta
  | AprovacaoUsoResposta
  | "";

type RespostaItem = {
  resposta: ChecklistEditResposta;
  observacao: string;
};

const conformidadeOptions: Array<{
  value: ChecklistResposta;
  label: string;
}> = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Nao Conforme" },
  { value: "nao_aplica", label: "N/A" },
];

const aprovacaoOptions: Array<{
  value: AprovacaoUsoResposta;
  label: string;
}> = [
  { value: "aprovado", label: "Aprovado" },
  { value: "nao_aprovado", label: "Nao aprovado" },
  { value: "aprovado_com_restricao", label: "Aprovado com restricao" },
];

const getChecklistPreventiva = (os: OrdemServicoSupabase | null) => {
  const checklist = os?.checklist_preventiva;

  if (Array.isArray(checklist)) return checklist[0] || null;

  return checklist || null;
};

const PreventivaChecklistEditDialog = ({
  open,
  onOpenChange,
  ordemServico,
}: PreventivaChecklistEditDialogProps) => {
  const atualizarChecklist = useAtualizarChecklistPreventiva();
  const checklist = getChecklistPreventiva(ordemServico);

  const itens = useMemo(
    () =>
      [...(checklist?.itens || [])].sort(
        (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
      ),
    [checklist]
  );

  const [resultadoGeral, setResultadoGeral] =
    useState<AprovacaoUsoResposta | "">("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<Record<string, RespostaItem>>({});

  useEffect(() => {
    if (!open || !checklist) return;

    const initial: Record<string, RespostaItem> = {};

    (checklist.itens || []).forEach((item) => {
      initial[item.id] = {
        resposta: item.resposta || "",
        observacao: item.observacao || "",
      };
    });

    setResultadoGeral(checklist.resultado_geral || "");
    setObservacoes(checklist.observacoes || "");
    setRespostas(initial);
  }, [open, checklist]);

  if (!ordemServico || !checklist) return null;

  const setResposta = (itemId: string, patch: Partial<RespostaItem>) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { resposta: "", observacao: "" }),
        ...patch,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!resultadoGeral) {
      toast({
        title: "Informe o resultado geral.",
        variant: "destructive",
      });
      return;
    }

    const faltantes = itens.filter((item) => !respostas[item.id]?.resposta);

    if (faltantes.length > 0) {
      toast({
        title: "Preencha todos os itens do checklist.",
        variant: "destructive",
      });
      return;
    }

    const temNaoConforme = itens.some(
      (item) => respostas[item.id]?.resposta === "nao_conforme"
    );

    if (temNaoConforme && resultadoGeral === "aprovado") {
      const continuar = window.confirm(
        "Existem itens nao conformes. Deseja manter o resultado geral como aprovado?"
      );

      if (!continuar) return;
    }

    try {
      await atualizarChecklist.mutateAsync({
        checklistId: checklist.id,
        ordemServicoId: ordemServico.id,
        resultadoGeral,
        observacoes,
        itens: itens.map((item, index) => ({
          id: item.id,
          procedimentoItemId: item.procedimento_item_id,
          descricao: item.descricao,
          tipoResposta: item.tipo_resposta,
          resposta: respostas[item.id].resposta as
            | ChecklistResposta
            | AprovacaoUsoResposta,
          observacao: respostas[item.id].observacao,
          ordem: item.ordem || index + 1,
        })),
      });

      toast({ title: "Checklist atualizado com sucesso." });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar checklist",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Editar checklist de preventiva
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-4 text-sm">
            <div>
              <p className="text-muted-foreground">OS</p>
              <p className="font-medium">{ordemServico.numero}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Procedimento</p>
              <p className="font-medium">
                {checklist.titulo_procedimento || "Checklist de Preventiva"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo de equipamento</p>
              <p className="font-medium">
                {checklist.tipo_equipamento_nome || "Nao informado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Validade padrao</p>
              <p className="font-medium">{checklist.validade_meses} meses</p>
            </div>
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <Label className="text-sm font-medium">Resultado geral</Label>
            <div className="flex flex-wrap gap-2">
              {aprovacaoOptions.map((option) => {
                const selected = resultadoGeral === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResultadoGeral(option.value)}
                    disabled={atualizarChecklist.isPending}
                    className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">
                    Resposta
                  </th>
                  <th className="text-left px-3 py-2 font-medium">
                    Observacao
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const options =
                    item.tipo_resposta === "aprovacao_uso"
                      ? aprovacaoOptions
                      : conformidadeOptions;

                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium">{item.descricao}</p>
                        {item.tipo_resposta === "aprovacao_uso" && (
                          <p className="text-xs text-muted-foreground">
                            Aprovacao para uso
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {options.map((option) => {
                            const selected =
                              respostas[item.id]?.resposta === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setResposta(item.id, {
                                    resposta: option.value,
                                  })
                                }
                                disabled={atualizarChecklist.isPending}
                                className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted/50"
                                }`}
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
                          onChange={(event) =>
                            setResposta(item.id, {
                              observacao: event.target.value,
                            })
                          }
                          placeholder="Opcional"
                          className="h-8"
                          disabled={atualizarChecklist.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Observacoes gerais</Label>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              disabled={atualizarChecklist.isPending}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={atualizarChecklist.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={atualizarChecklist.isPending}
          >
            {atualizarChecklist.isPending ? "Salvando..." : "Salvar checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreventivaChecklistEditDialog;

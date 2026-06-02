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
import { toast } from "@/hooks/use-toast";
import { useExecutarPreventiva } from "@/hooks/usePreventivas";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type {
  AprovacaoUsoResposta,
  ChecklistResposta,
  ProcedimentoPreventiva,
  ProcedimentoPreventivaItem,
} from "@/services/procedimentosPreventivaService";

interface PreventivaChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: EquipamentoSupabase | null;
  procedimento: ProcedimentoPreventiva | null;
  dataAbertura?: string | null;
  dataFechamento?: string | null;
  ordemServicoId?: string | null;
  onSaved?: (ordemServico: { id: string }) => void;
}

type RespostaItem = {
  resposta: ChecklistResposta | AprovacaoUsoResposta | "";
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

const getEquipamentoLabel = (equipamento: EquipamentoSupabase) =>
  [
    equipamento.tipo_equipamento?.nome || equipamento.tipo_texto || "Equipamento",
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.tag || equipamento.patrimonio || equipamento.numero_serie,
  ]
    .filter(Boolean)
    .join(" - ");

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome_fantasia ||
  equipamento.empresa?.nome ||
  "Nao informado";

const PreventivaChecklistDialog = ({
  open,
  onOpenChange,
  equipamento,
  procedimento,
  dataAbertura,
  dataFechamento,
  ordemServicoId,
  onSaved,
}: PreventivaChecklistDialogProps) => {
  const executarPreventiva = useExecutarPreventiva();
  const [respostas, setRespostas] = useState<Record<string, RespostaItem>>({});
  const [observacoes, setObservacoes] = useState("");

  const itens = useMemo(
    () => [...(procedimento?.itens || [])].sort((a, b) => a.ordem - b.ordem),
    [procedimento]
  );

  useEffect(() => {
    if (!open || !procedimento) return;

    const initial: Record<string, RespostaItem> = {};
    (procedimento.itens || []).forEach((item) => {
      initial[item.id] = {
        resposta: item.tipo_resposta === "conformidade" ? "conforme" : "",
        observacao: "",
      };
    });
    setRespostas(initial);
    setObservacoes("");
  }, [open, procedimento]);

  if (!equipamento || !procedimento) return null;

  const setResposta = (
    item: ProcedimentoPreventivaItem,
    patch: Partial<RespostaItem>
  ) => {
    setRespostas((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || { resposta: "", observacao: "" }),
        ...patch,
      },
    }));
  };

  const handleSubmit = async () => {
    const faltantes = itens.filter((item) => {
      if (!item.obrigatorio) return false;
      return !respostas[item.id]?.resposta;
    });

    if (faltantes.length > 0) {
      toast({
        title: "Preencha todos os itens obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    const aprovacao = itens.find(
      (item) => item.tipo_resposta === "aprovacao_uso"
    );

    if (!aprovacao || !respostas[aprovacao.id]?.resposta) {
      toast({
        title: "Informe a aprovacao para uso.",
        variant: "destructive",
      });
      return;
    }

    const temNaoConforme = itens.some(
      (item) => respostas[item.id]?.resposta === "nao_conforme"
    );
    const aprovadoParaUso = respostas[aprovacao.id]?.resposta === "aprovado";

    if (
      (temNaoConforme && aprovadoParaUso) ||
      (!temNaoConforme && respostas[aprovacao.id]?.resposta === "nao_aprovado")
    ) {
      const continuar = window.confirm(
        "A aprovacao escolhida parece inconsistente com as respostas. Deseja continuar?"
      );
      if (!continuar) return;
    }

    try {
      const os = await executarPreventiva.mutateAsync({
        equipamentoId: equipamento.id,
        empresaId: equipamento.empresa_id,
        procedimentoId: procedimento.id,
        ordemServicoId,
        observacoes,
        dataAbertura,
        dataFechamento,
        respostas: itens.map((item, index) => ({
          procedimentoItemId: item.id,
          descricao: item.descricao,
          tipoResposta: item.tipo_resposta,
          resposta: respostas[item.id]?.resposta || "nao_aplica",
          observacao: respostas[item.id]?.observacao,
          ordem: item.ordem || index + 1,
        })),
      });

      toast({
        title: ordemServicoId ? "Preventiva finalizada." : "OS de preventiva criada.",
        description: `OS ${os.numero} fechada.`,
      });
      onSaved?.(os);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao executar preventiva",
        description: error instanceof Error ? error.message : "Erro inesperado.",
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
            Checklist de Preventiva
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-4 text-sm">
            <div>
              <p className="text-muted-foreground">Equipamento</p>
              <p className="font-medium">{getEquipamentoLabel(equipamento)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Empresa</p>
              <p className="font-medium">{getEmpresaNome(equipamento)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Procedimento</p>
              <p className="font-medium">{procedimento.titulo}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Validade padrao</p>
              <p className="font-medium">{procedimento.validade_meses} meses</p>
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
                            Resultado geral da preventiva
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
                                  setResposta(item, {
                                    resposta: option.value,
                                  })
                                }
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
                            setResposta(item, {
                              observacao: event.target.value,
                            })
                          }
                          placeholder="Opcional"
                          className="h-8"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observacoes gerais</label>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={executarPreventiva.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={executarPreventiva.isPending}
          >
            {executarPreventiva.isPending
              ? "Gerando OS..."
              : "Concluir e gerar OS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreventivaChecklistDialog;

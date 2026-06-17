import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "@/hooks/use-toast";
import { useTiposEquipamento } from "@/hooks/useTiposEquipamento";
import {
  useAtualizarProcedimentoPreventiva,
  useCriarProcedimentoPreventiva,
} from "@/hooks/useProcedimentosPreventiva";
import type {
  ProcedimentoPreventiva,
  ProcedimentoPreventivaTipoResposta,
} from "@/services/procedimentosPreventivaService";

type ItemForm = {
  descricao: string;
  tipoResposta: ProcedimentoPreventivaTipoResposta;
  obrigatorio: boolean;
};

interface ProcedimentoPreventivaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento?: ProcedimentoPreventiva | null;
  tipoEquipamentoIdInicial?: string | null;
}

const emptyItem = (): ItemForm => ({
  descricao: "",
  tipoResposta: "conformidade",
  obrigatorio: true,
});

const ensureAprovacaoUso = (items: ItemForm[]) => {
  const semVazios = items.filter((item) => item.descricao.trim());
  const semAprovacao = semVazios.filter(
    (item) => item.tipoResposta !== "aprovacao_uso"
  );
  const aprovacao = semVazios.find(
    (item) => item.tipoResposta === "aprovacao_uso"
  );

  return [
    ...semAprovacao,
    aprovacao || {
      descricao: "Aprovacao para Uso",
      tipoResposta: "aprovacao_uso" as const,
      obrigatorio: true,
    },
  ];
};

const ProcedimentoPreventivaFormDialog = ({
  open,
  onOpenChange,
  procedimento = null,
  tipoEquipamentoIdInicial = null,
}: ProcedimentoPreventivaFormDialogProps) => {
  const { data: tiposEquipamento = [] } = useTiposEquipamento();
  const criarProcedimento = useCriarProcedimentoPreventiva();
  const atualizarProcedimento = useAtualizarProcedimentoPreventiva();

  const [titulo, setTitulo] = useState("");
  const [tipoEquipamentoId, setTipoEquipamentoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [validadeMeses, setValidadeMeses] = useState(12);
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);

  const saving = criarProcedimento.isPending || atualizarProcedimento.isPending;

  const tipoOptions = useMemo(
    () => tiposEquipamento.map((tipo) => tipo.nome),
    [tiposEquipamento]
  );

  const tipoSelecionadoLabel = useMemo(() => {
    return (
      tiposEquipamento.find((tipo) => tipo.id === tipoEquipamentoId)?.nome || ""
    );
  }, [tipoEquipamentoId, tiposEquipamento]);

  useEffect(() => {
    if (!open) return;

    if (procedimento) {
      setTitulo(procedimento.titulo);
      setTipoEquipamentoId(procedimento.tipo_equipamento_id);
      setDescricao(procedimento.descricao || "");
      setValidadeMeses(procedimento.validade_meses || 12);
      setItens(
        ensureAprovacaoUso(
          (procedimento.itens || []).map((item) => ({
            descricao: item.descricao,
            tipoResposta: item.tipo_resposta,
            obrigatorio: item.obrigatorio,
          }))
        )
      );
      return;
    }

    setTitulo("");
    setTipoEquipamentoId(tipoEquipamentoIdInicial || "");
    setDescricao("");
    setValidadeMeses(12);
    setItens([emptyItem()]);
  }, [open, procedimento, tipoEquipamentoIdInicial]);

  const updateItem = (index: number, patch: Partial<ItemForm>) => {
    setItens((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItens((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleTipoChange = (label: string) => {
    const tipo = tiposEquipamento.find((item) => item.nome === label);
    setTipoEquipamentoId(tipo?.id || "");
  };

  const handleSave = async () => {
    const itensNormalizados = ensureAprovacaoUso(itens);

    if (!titulo.trim()) {
      toast({ title: "Informe o titulo do procedimento.", variant: "destructive" });
      return;
    }

    if (!tipoEquipamentoId) {
      toast({ title: "Selecione o tipo de equipamento.", variant: "destructive" });
      return;
    }

    if (itensNormalizados.length === 0) {
      toast({ title: "Adicione ao menos um item.", variant: "destructive" });
      return;
    }

    const input = {
      titulo,
      tipoEquipamentoId,
      descricao,
      validadeMeses,
      itens: itensNormalizados.map((item, index) => ({
        descricao: item.descricao,
        tipoResposta: item.tipoResposta,
        obrigatorio: item.obrigatorio,
        ordem: index + 1,
      })),
    };

    try {
      if (procedimento) {
        await atualizarProcedimento.mutateAsync({
          id: procedimento.id,
          input,
        });
        toast({ title: "Procedimento atualizado." });
      } else {
        await criarProcedimento.mutateAsync(input);
        toast({ title: "Procedimento cadastrado." });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar procedimento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {procedimento ? "Editar Procedimento" : "Novo Procedimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Preventiva em Monitor Multiparametro"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Equipamento *</Label>
              <SearchableSelect
                value={tipoSelecionadoLabel}
                onValueChange={handleTipoChange}
                options={tipoOptions}
                placeholder="Selecione o tipo"
                emptyText="Nenhum tipo encontrado."
              />
            </div>

            <div className="space-y-2">
              <Label>Validade em meses *</Label>
              <Input
                type="number"
                min={1}
                value={validadeMeses}
                onChange={(event) =>
                  setValidadeMeses(Number(event.target.value || 12))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descricao</Label>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Orientacoes gerais do procedimento preventivo."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Itens do checklist</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItens((prev) => [...prev, emptyItem()])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Item
              </Button>
            </div>

            <div className="space-y-2">
              {itens.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_180px_120px_40px] gap-2 rounded-md border p-3"
                >
                  <Input
                    value={item.descricao}
                    onChange={(event) =>
                      updateItem(index, { descricao: event.target.value })
                    }
                    placeholder="Descricao do item"
                  />

                  <Select
                    value={item.tipoResposta}
                    onValueChange={(value) =>
                      updateItem(index, {
                        tipoResposta:
                          value as ProcedimentoPreventivaTipoResposta,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conformidade">
                        Conformidade
                      </SelectItem>
                      <SelectItem value="aprovacao_uso">
                        Aprovacao para uso
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={item.obrigatorio}
                      onCheckedChange={(checked) =>
                        updateItem(index, { obrigatorio: Boolean(checked) })
                      }
                    />
                    Obrigatorio
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={itens.length === 1}
                    title="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              A aprovacao para uso sera mantida ao final do checklist.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcedimentoPreventivaFormDialog;

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  PecaSupabase,
  useCriarFabricantePeca,
  useCriarModeloPeca,
  useCriarPeca,
  useCriarVariacaoPeca,
} from "@/hooks/usePecas";

export type PecaQuickCreateResult = {
  fabricanteId?: string;
  fabricanteNome?: string;
  modeloId?: string;
  modeloNome?: string;
  variacaoId?: string;
};

type PecaQuickCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (peca: PecaSupabase, result?: PecaQuickCreateResult) => void;
};

const PecaQuickCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: PecaQuickCreateDialogProps) => {
  const criar = useCriarPeca();
  const criarFabricante = useCriarFabricantePeca();
  const criarModelo = useCriarModeloPeca();
  const criarVariacao = useCriarVariacaoPeca();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoPadrao, setPrecoPadrao] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");

  const reset = () => {
    setNome("");
    setDescricao("");
    setPrecoPadrao("");
    setFabricante("");
    setModelo("");
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe o nome da peca.", variant: "destructive" });
      return;
    }

    try {
      const peca = await criar.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        precoPadrao: precoPadrao ? Number(precoPadrao) : null,
      });

      const fabricanteCriado = fabricante.trim()
        ? await criarFabricante.mutateAsync({
            pecaId: peca.id,
            nome: fabricante.trim(),
          })
        : null;
      const modeloCriado = modelo.trim()
        ? await criarModelo.mutateAsync({
            pecaId: peca.id,
            nome: modelo.trim(),
          })
        : null;
      const variacaoCriada =
        fabricanteCriado || modeloCriado
          ? await criarVariacao.mutateAsync({
              pecaId: peca.id,
              pecaFabricanteId: fabricanteCriado?.id || null,
              pecaModeloId: modeloCriado?.id || null,
              fabricanteTexto: fabricanteCriado?.nome || null,
              modeloTexto: modeloCriado?.nome || null,
              precoPadrao: precoPadrao ? Number(precoPadrao) : null,
            })
          : null;

      onCreated(
        {
          ...peca,
          fabricantes: fabricanteCriado ? [fabricanteCriado] : peca.fabricantes,
          modelos: modeloCriado ? [modeloCriado] : peca.modelos,
          variacoes: variacaoCriada ? [variacaoCriada] : peca.variacoes,
        },
        {
          fabricanteId: fabricanteCriado?.id,
          fabricanteNome: fabricanteCriado?.nome,
          modeloId: modeloCriado?.id,
          modeloNome: modeloCriado?.nome,
          variacaoId: variacaoCriada?.id,
        }
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title:
          error instanceof Error ? error.message : "Erro ao cadastrar peca.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova peca</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome / Tipo da peca</Label>
            <Input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Sensor de Oximetria"
            />
          </div>
          <div className="space-y-2">
            <Label>Preco padrao</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={precoPadrao}
              onChange={(event) => setPrecoPadrao(event.target.value)}
              placeholder="Preco opcional"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input
                value={fabricante}
                onChange={(event) => setFabricante(event.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={modelo}
                onChange={(event) => setModelo(event.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descricao</Label>
            <Textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              criar.isPending ||
              criarFabricante.isPending ||
              criarModelo.isPending ||
              criarVariacao.isPending
            }
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar peca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PecaQuickCreateDialog;

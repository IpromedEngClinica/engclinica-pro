import { useEffect, useMemo, useState } from "react";
import { BadgePercent } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AplicarDescontoOrcamentoInput,
  DescontoTipo,
  OrcamentoSupabase,
} from "@/services/orcamentosService";

type OrcamentoDescontoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoSupabase | null;
  onConfirm: (
    orcamento: OrcamentoSupabase,
    input: AplicarDescontoOrcamentoInput
  ) => Promise<void>;
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const OrcamentoDescontoDialog = ({
  open,
  onOpenChange,
  orcamento,
  onConfirm,
}: OrcamentoDescontoDialogProps) => {
  const [tipo, setTipo] = useState<DescontoTipo>("valor");
  const [valor, setValor] = useState(0);
  const [situacao, setSituacao] = useState<"pendente" | "aprovado">("pendente");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !orcamento) return;

    setTipo(orcamento.desconto_tipo || "valor");
    setValor(Number(orcamento.desconto_valor || 0));
    setSituacao(orcamento.status === "aprovado" ? "aprovado" : "pendente");
  }, [open, orcamento]);

  const subtotal = useMemo(
    () =>
      Number(orcamento?.valor_pecas || 0) +
      Number(orcamento?.valor_servicos || 0),
    [orcamento]
  );
  const descontoAplicado = useMemo(() => {
    const valorNormalizado = Math.max(0, Number(valor || 0));
    const desconto =
      tipo === "percentual"
        ? subtotal * (valorNormalizado / 100)
        : valorNormalizado;

    return Math.min(subtotal, desconto);
  }, [subtotal, tipo, valor]);
  const totalFinal = Math.max(0, subtotal - descontoAplicado);

  const handleConfirm = async () => {
    if (!orcamento || salvando) return;

    setSalvando(true);
    try {
      await onConfirm(orcamento, {
        descontoTipo: tipo,
        descontoValor: Number(valor || 0),
        situacao,
      });
      onOpenChange(false);
    } catch {
      // O retorno visual do erro e responsabilidade do chamador.
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-primary" />
            Aplicar desconto no Orçamento {orcamento?.numero || ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as DescontoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Valor fixo (R$)</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tipo === "percentual" ? "Desconto percentual" : "Valor do desconto"}</Label>
              <Input
                type="number"
                min="0"
                max={tipo === "percentual" ? 100 : subtotal}
                step="0.01"
                value={valor}
                onChange={(event) => setValor(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Após aplicar o desconto</Label>
            <Select value={situacao} onValueChange={(value) => setSituacao(value as "pendente" | "aprovado")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Manter pendente</SelectItem>
                <SelectItem value="aprovado">Aprovar proposta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Valor antes do desconto</p>
              <p className="font-semibold">{formatCurrency(subtotal)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Desconto aplicado</p>
              <p className="font-semibold">{formatCurrency(descontoAplicado)}</p>
            </div>
            <div className="rounded-md bg-primary p-3 text-primary-foreground">
              <p className="text-xs text-primary-foreground/80">Total Geral</p>
              <p className="font-semibold">{formatCurrency(totalFinal)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={salvando}>
            {salvando ? "Aplicando..." : "Aplicar desconto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrcamentoDescontoDialog;

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGerarRelatorioCompletoCiclo, usePlanoCiclo } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { PlanoRelatorioCicloOpcoes } from "@/services/planosService";
import { calcularValidadeRelatorioCiclo, formatDateValue } from "@/utils/planoDatas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId: string | null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const PlanoRelatorioCicloDialog = ({ cicloId, onOpenChange, open }: Props) => {
  const gerarRelatorio = useGerarRelatorioCompletoCiclo();
  const { data: ciclo } = usePlanoCiclo(open ? cicloId || undefined : undefined);
  const [validadeModo, setValidadeModo] = useState("12");
  const [validadePersonalizada, setValidadePersonalizada] = useState("12");
  const [incluirOsPreventivas, setIncluirOsPreventivas] = useState(true);
  const [incluirOsCorretivas, setIncluirOsCorretivas] = useState(true);
  const [incluirCertificadosCalibracao, setIncluirCertificadosCalibracao] = useState(true);
  const [incluirCertificadosSegurancaEletrica, setIncluirCertificadosSegurancaEletrica] = useState(true);

  useEffect(() => {
    if (!open) return;
    const meses = String(ciclo?.relatorio_validade_meses || 12);
    setValidadeModo(["6", "12", "18", "24"].includes(meses) ? meses : "personalizado");
    setValidadePersonalizada(meses);
    setIncluirOsPreventivas(true);
    setIncluirOsCorretivas(true);
    setIncluirCertificadosCalibracao(true);
    setIncluirCertificadosSegurancaEletrica(true);
  }, [ciclo?.relatorio_validade_meses, open]);

  const validadeMeses = useMemo(() => {
    if (validadeModo === "personalizado") {
      const value = Number(validadePersonalizada);
      return Number.isFinite(value) && value > 0 ? value : 12;
    }
    return Number(validadeModo);
  }, [validadeModo, validadePersonalizada]);

  const emitidoEm = hoje();
  const validadeSalvaCorrespondeAosMeses =
    ciclo?.relatorio_validade_ate &&
    !ciclo.cronograma_mes_inicio &&
    Number(ciclo.relatorio_validade_meses || 12) === validadeMeses;
  const validadeAte = ciclo
    ? validadeSalvaCorrespondeAosMeses
      ? ciclo.relatorio_validade_ate as string
      : calcularValidadeRelatorioCiclo(ciclo, validadeMeses)
    : emitidoEm;

  const handleGerar = async () => {
    if (!cicloId) return;
    const opcoes: PlanoRelatorioCicloOpcoes = {
      validadeMeses,
      emitidoEm,
      validadeAte,
      incluirOsPreventivas,
      incluirOsCorretivas,
      incluirCertificadosCalibracao,
      incluirCertificadosSegurancaEletrica,
    };

    try {
      const resultado = await gerarRelatorio.mutateAsync({
        cicloId,
        opcoes,
        completo: true,
      });
      if (resultado.ressalvas.length) {
        toast({
          title: "Relatório gerado com ressalvas",
          description: `${resultado.ressalvas.length} documento(s) nao puderam ser anexados: ${resultado.ressalvas.join(", ")}`,
        });
      } else {
        toast({ title: "Relatório completo gerado." });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar relatório completo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Validade do relatório*</Label>
              <Select value={validadeModo} onValueChange={setValidadeModo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="18">18 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {validadeModo === "personalizado" && (
              <div className="space-y-1">
                <Label>Meses</Label>
                <Input
                  type="number"
                  min={1}
                  value={validadePersonalizada}
                  onChange={(event) => setValidadePersonalizada(event.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Data de emissao</span><p className="font-medium">{formatDateValue(emitidoEm)}</p></div>
            <div><span className="text-muted-foreground">Validade ate</span><p className="font-medium">{formatDateValue(validadeAte)}</p></div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Incluir documentos</p>
            <Check label="Ordens de Servico preventivas" checked={incluirOsPreventivas} onCheckedChange={setIncluirOsPreventivas} />
            <Check label="Ordens de Servico corretivas" checked={incluirOsCorretivas} onCheckedChange={setIncluirOsCorretivas} />
            <Check label="Certificados de calibracao" checked={incluirCertificadosCalibracao} onCheckedChange={setIncluirCertificadosCalibracao} />
            <Check label="Certificados de seguranca eletrica" checked={incluirCertificadosSegurancaEletrica} onCheckedChange={setIncluirCertificadosSegurancaEletrica} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={gerarRelatorio.isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={gerarRelatorio.isPending} onClick={handleGerar}>
            {gerarRelatorio.isPending ? "Gerando..." : "Gerar relatório"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Check = ({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-2 text-sm">
    <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
    {label}
  </label>
);

export default PlanoRelatorioCicloDialog;

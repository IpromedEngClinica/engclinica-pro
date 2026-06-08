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
import { useGerarRelatorioAnualPlano, usePlano } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { PlanoRelatorioAnualInput, PlanoRelatorioAnualModoPeriodo, PlanoRelatorioAnualTipoSaida } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  modoInicial?: "cronograma" | "cronograma_completo";
};

const hoje = () => new Date().toISOString().slice(0, 10);

const addMeses = (data: string, meses: number) => {
  const date = new Date(`${data}T00:00:00`);
  date.setMonth(date.getMonth() + meses);
  return date.toISOString().slice(0, 10);
};

const fimPeriodo12Meses = (inicio: string) => {
  const date = new Date(`${inicio}T00:00:00`);
  date.setMonth(date.getMonth() + 12);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const mesAtual = () => new Date().getMonth() + 1;
const anoAtual = () => new Date().getFullYear();

const PlanoRelatorioAnualDialog = ({ modoInicial = "cronograma", onOpenChange, open, planoId }: Props) => {
  const gerar = useGerarRelatorioAnualPlano();
  const { data: plano } = usePlano(planoId);
  const [modoPeriodo, setModoPeriodo] = useState<PlanoRelatorioAnualModoPeriodo>("periodo_movel");
  const [ano, setAno] = useState(String(anoAtual()));
  const [mesInicial, setMesInicial] = useState(String(mesAtual()));
  const [incluirPreventiva, setIncluirPreventiva] = useState(true);
  const [incluirCalibracao, setIncluirCalibracao] = useState(true);
  const [incluirSegurancaEletrica, setIncluirSegurancaEletrica] = useState(true);
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [agruparPorSetor, setAgruparPorSetor] = useState(true);
  const [exibirProximaVisita, setExibirProximaVisita] = useState(true);
  const [exibirOcorrencias, setExibirOcorrencias] = useState(true);
  const [validadeMeses, setValidadeMeses] = useState("12");
  const [tipoSaida, setTipoSaida] = useState<PlanoRelatorioAnualTipoSaida>("cronograma");

  useEffect(() => {
    if (open) setTipoSaida(modoInicial);
  }, [modoInicial, open]);

  const periodo = useMemo(() => {
    const anoNumber = Number(ano) || anoAtual();
    const mesNumber = Number(mesInicial) || 1;
    if (modoPeriodo === "ano_civil") {
      return {
        inicio: `${anoNumber}-01-01`,
        fim: `${anoNumber}-12-31`,
        mesInicial: 1,
      };
    }
    const inicio = `${anoNumber}-${String(mesNumber).padStart(2, "0")}-01`;
    return {
      inicio,
      fim: fimPeriodo12Meses(inicio),
      mesInicial: mesNumber,
    };
  }, [ano, mesInicial, modoPeriodo]);

  const emitir = hoje();
  const validadeAte = addMeses(emitir, Number(validadeMeses) || 12);

  const handleGerar = async () => {
    if (!plano) return;

    const input: PlanoRelatorioAnualInput = {
      planoId: plano.id,
      modoPeriodo,
      dataInicio: periodo.inicio,
      dataFim: periodo.fim,
      anoReferencia: Number(ano) || anoAtual(),
      mesInicial: periodo.mesInicial,
      validadeMeses: Number(validadeMeses) || 12,
      emitidoEm: emitir,
      validadeAte,
      incluirPreventiva,
      incluirCalibracao,
      incluirSegurancaEletrica,
      incluirInativos,
      agruparPorSetor,
      tipoSaida,
    };

    try {
      const resultado = await gerar.mutateAsync({
        input,
        opcoesPdf: {
          emitidoEm: emitir,
          validadeAte,
          validadeMeses: input.validadeMeses,
          incluirPreventiva,
          incluirCalibracao,
          incluirSegurancaEletrica,
          exibirProximaVisita,
          exibirOcorrencias,
          agruparPorSetor,
        },
      });
      toast({
        title: resultado.ressalvas.length ? "Relatório gerado com ressalvas" : "Relatório anual gerado.",
        description: resultado.ressalvas.length ? resultado.ressalvas.join(", ") : `Revisao ${resultado.registro.revisao}`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório anual",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Gerar relatório anual</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Periodo">
              <Select value={modoPeriodo} onValueChange={(value) => setModoPeriodo(value as PlanoRelatorioAnualModoPeriodo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="periodo_movel">Periodo movel de 12 meses</SelectItem>
                  <SelectItem value="ano_civil">Ano civil</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ano">
              <Input value={ano} onChange={(event) => setAno(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Mes inicial">
              <Select value={mesInicial} onValueChange={setMesInicial} disabled={modoPeriodo === "ano_civil"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, index) => (
                    <SelectItem key={index + 1} value={String(index + 1)}>
                      {String(index + 1).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            Periodo: <strong>{periodo.inicio}</strong> a <strong>{periodo.fim}</strong>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Section title="Servicos">
              <Check label="Manutencao preventiva" checked={incluirPreventiva} onCheckedChange={setIncluirPreventiva} />
              <Check label="Calibracao" checked={incluirCalibracao} onCheckedChange={setIncluirCalibracao} />
              <Check label="Seguranca eletrica" checked={incluirSegurancaEletrica} onCheckedChange={setIncluirSegurancaEletrica} />
            </Section>
            <Section title="Exibir">
              <Check label="Equipamentos inativos que participaram" checked={incluirInativos} onCheckedChange={setIncluirInativos} />
              <Check label="Agrupar por setor" checked={agruparPorSetor} onCheckedChange={setAgruparPorSetor} />
              <Check label="Exibir proxima visita prevista" checked={exibirProximaVisita} onCheckedChange={setExibirProximaVisita} />
              <Check label="Exibir ocorrencias NC e NL" checked={exibirOcorrencias} onCheckedChange={setExibirOcorrencias} />
            </Section>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Validade do relatório">
              <Select value={validadeMeses} onValueChange={setValidadeMeses}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="18">18 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Documentos">
              <Select value={tipoSaida} onValueChange={(value) => setTipoSaida(value as PlanoRelatorioAnualTipoSaida)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cronograma">Somente cronograma anual</SelectItem>
                  <SelectItem value="cronograma_completo">Cronograma completo com PDFs</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={gerar.isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={gerar.isPending || !plano} onClick={handleGerar}>{gerar.isPending ? "Gerando..." : "Gerar PDF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="space-y-1"><Label>{label}</Label>{children}</div>
);

const Section = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="space-y-2 rounded-md border p-3"><p className="text-sm font-medium">{title}</p>{children}</div>
);

const Check = ({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange: (checked: boolean) => void }) => (
  <label className="flex items-center gap-2 text-sm">
    <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
    {label}
  </label>
);

export default PlanoRelatorioAnualDialog;

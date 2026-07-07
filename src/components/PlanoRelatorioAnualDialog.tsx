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
import type {
  PlanoCiclo,
  PlanoRelatorioAnualInput,
  PlanoRelatorioAnualModoPeriodo,
  PlanoRelatorioAnualTipoSaida,
} from "@/services/planosService";
import { calcularValidadeFimDoMes } from "@/utils/planoDatas";
import {
  gerarDatasPrevistasNoPeriodo,
  type PlanoFrequencia,
} from "@/utils/planoFrequencia";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  ciclo?: PlanoCiclo | null;
  modoInicial?: "cronograma" | "cronograma_completo";
};

const hoje = () => new Date().toISOString().slice(0, 10);

const fimPeriodo13Meses = (inicio: string) => {
  const date = new Date(`${inicio}T00:00:00`);
  date.setMonth(date.getMonth() + 13);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const inicioMes = (data: string) => {
  const date = new Date(`${data}T00:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
};

const mesAno = (data?: string | null) => {
  if (!data) return hoje().slice(0, 7);
  const date = new Date(`${data.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return hoje().slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const mesAtual = () => new Date().getMonth() + 1;
const anoAtual = () => new Date().getFullYear();
const mesesAno = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const parseMesAnoValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return {
      ano: String(anoAtual()),
      mes: String(mesAtual()).padStart(2, "0"),
    };
  }

  return {
    ano: match[1],
    mes: match[2],
  };
};

const montarMesesSelecionaveis = (dataInicio: string, quantidadeMeses = 13) =>
  Array.from({ length: quantidadeMeses }, (_, index) => {
    const date = new Date(`${dataInicio}T00:00:00`);
    date.setMonth(date.getMonth() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: `${date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}/${String(date.getFullYear()).slice(-2)}`,
    };
  });

const filtrarMesesNoPeriodo = (meses: string[] | null | undefined, dataInicio: string) => {
  const permitidos = new Set(montarMesesSelecionaveis(dataInicio).map((mes) => mes.key));
  return Array.from(new Set(meses || []))
    .map((mes) => mes.slice(0, 7))
    .filter((mes) => permitidos.has(mes))
    .sort();
};

const gerarMesesPrevistosPadrao = (
  dataInicio: string,
  dataFim: string,
  frequencia?: PlanoFrequencia
) => {
  if (!frequencia) return [];
  const permitidos = new Set(montarMesesSelecionaveis(dataInicio).map((mes) => mes.key));
  return gerarDatasPrevistasNoPeriodo({
    dataInicial: dataInicio,
    frequencia,
    inicioPeriodo: dataInicio,
    fimPeriodo: dataFim,
  })
    .map((data) => mesAno(data))
    .filter((mes, index, lista) => permitidos.has(mes) && lista.indexOf(mes) === index);
};

const PlanoRelatorioAnualDialog = ({ ciclo, modoInicial = "cronograma", onOpenChange, open, planoId }: Props) => {
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
  const [exibirOcorrenciasNc, setExibirOcorrenciasNc] = useState(true);
  const [exibirOcorrenciasNl, setExibirOcorrenciasNl] = useState(false);
  const [validadeMeses, setValidadeMeses] = useState("12");
  const [tipoSaida, setTipoSaida] = useState<PlanoRelatorioAnualTipoSaida>("cronograma");
  const [mesesVisitadosPreventiva, setMesesVisitadosPreventiva] = useState<string[]>([]);
  const [mesesPrevistosCronograma, setMesesPrevistosCronograma] = useState<string[]>([]);

  useEffect(() => {
    if (open) setTipoSaida(modoInicial);
  }, [modoInicial, open]);

  useEffect(() => {
    if (!open) return;
    const dataBase = ciclo?.cronograma_mes_inicio
      ? `${ciclo.cronograma_mes_inicio}-01`
      : plano?.data_inicial || ciclo?.data_prevista;
    if (!dataBase) return;

    const inicio = inicioMes(dataBase);
    const fim = fimPeriodo13Meses(inicio);
    setAno(inicio.slice(0, 4));
    setMesInicial(String(Number(inicio.slice(5, 7))));

    if (!ciclo) return;
    const mesesRealizadosSalvos = filtrarMesesNoPeriodo(
      ciclo.cronograma_meses_realizados,
      inicio
    );
    const mesesPrevistosSalvos = filtrarMesesNoPeriodo(
      ciclo.cronograma_meses_previstos,
      inicio
    );

    setMesesVisitadosPreventiva(
      mesesRealizadosSalvos.length
        ? mesesRealizadosSalvos
        : filtrarMesesNoPeriodo([mesAno(ciclo.data_abertura || ciclo.data_prevista)], inicio)
    );
    setMesesPrevistosCronograma(
      mesesPrevistosSalvos.length
        ? mesesPrevistosSalvos
        : gerarMesesPrevistosPadrao(inicio, fim, plano?.frequencia as PlanoFrequencia | undefined)
    );
  }, [ciclo, open, plano?.data_inicial, plano?.frequencia]);

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
      fim: fimPeriodo13Meses(inicio),
      mesInicial: mesNumber,
    };
  }, [ano, ciclo, mesInicial, modoPeriodo]);

  const emitir = hoje();
  const validadeAte = calcularValidadeFimDoMes(periodo.inicio, Number(validadeMeses) || 12);
  const mesInicioValue = `${String(Number(ano) || anoAtual()).padStart(4, "0")}-${String(Number(mesInicial) || 1).padStart(2, "0")}`;
  const mesesSelecionaveis = useMemo(
    () => montarMesesSelecionaveis(periodo.inicio),
    [periodo.inicio]
  );

  const toggleMes = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    mes: string,
    checked: boolean
  ) => {
    setter((atuais) =>
      checked
        ? Array.from(new Set([...atuais, mes])).sort()
        : atuais.filter((item) => item !== mes)
    );
  };

  const setMesInicioValue = (value: string) => {
    if (!value) return;
    const [anoValue, mesValue] = value.split("-");
    setAno(anoValue);
    setMesInicial(String(Number(mesValue) || 1));

    if (ciclo) {
      const inicio = `${anoValue}-${mesValue}-01`;
      const fim = fimPeriodo13Meses(inicio);
      setMesesVisitadosPreventiva((atuais) => filtrarMesesNoPeriodo(atuais, inicio));
      setMesesPrevistosCronograma(
        gerarMesesPrevistosPadrao(
          inicio,
          fim,
          plano?.frequencia as PlanoFrequencia | undefined
        )
      );
    }
  };

  const handleGerar = async () => {
    if (!plano) return;

    const input: PlanoRelatorioAnualInput = {
      planoId: plano.id,
      cicloId: ciclo?.id || null,
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
          exibirOcorrenciasNc,
          exibirOcorrenciasNl,
          agruparPorSetor,
          nomeCicloArquivo: ciclo?.titulo || null,
          cronogramaMesInicio: ciclo ? periodo.inicio.slice(0, 7) : null,
          mesesVisitadosPreventiva: ciclo ? mesesVisitadosPreventiva : null,
          mesReferenciaPreventivaAtual: ciclo ? mesesVisitadosPreventiva[0] || null : null,
          mesesPrevistosCronograma: ciclo ? mesesPrevistosCronograma : null,
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
        <DialogHeader><DialogTitle>{ciclo ? "Gerar cronograma do ciclo" : "Gerar relatório anual"}</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          {ciclo && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Atualizar visita ajusta apenas a marcação visual do cronograma. Validade do ciclo, etiqueta e equipamento não serão recalculadas.
            </div>
          )}

          {ciclo ? (
            <div className="grid gap-3">
              <Field label="Mês de início do relatório/plano">
                <MesAnoControl
                  value={mesInicioValue}
                  onChange={setMesInicioValue}
                />
              </Field>
              <Section title="Meses em que a visita foi realizada">
                <div className="grid gap-2 sm:grid-cols-4">
                  {mesesSelecionaveis.map((mes) => (
                    <Check
                      key={mes.key}
                      label={mes.label}
                      checked={mesesVisitadosPreventiva.includes(mes.key)}
                      onCheckedChange={(checked) =>
                        toggleMes(setMesesVisitadosPreventiva, mes.key, checked)
                      }
                    />
                  ))}
                </div>
              </Section>
              <Section title="Meses previstos no cronograma">
                <div className="grid gap-2 sm:grid-cols-4">
                  {mesesSelecionaveis.map((mes) => (
                    <Check
                      key={mes.key}
                      label={mes.label}
                      checked={mesesPrevistosCronograma.includes(mes.key)}
                      onCheckedChange={(checked) =>
                        toggleMes(setMesesPrevistosCronograma, mes.key, checked)
                      }
                    />
                  ))}
                </div>
              </Section>
            </div>
          ) : <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Período">
              <Select value={modoPeriodo} onValueChange={(value) => setModoPeriodo(value as PlanoRelatorioAnualModoPeriodo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="periodo_movel">Período móvel de 13 meses</SelectItem>
                  <SelectItem value="ano_civil">Ano civil</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ano">
              <Input value={ano} onChange={(event) => setAno(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Mês inicial">
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
          </div>}

          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            {ciclo ? <>Ciclo: <strong>{ciclo.titulo}</strong> - </> : null}
            Período: <strong>{periodo.inicio}</strong> a <strong>{periodo.fim}</strong>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Section title="Serviços">
              <Check label="Manutenção preventiva" checked={incluirPreventiva} onCheckedChange={setIncluirPreventiva} />
              <Check label="Calibração" checked={incluirCalibracao} onCheckedChange={setIncluirCalibracao} />
              <Check label="Segurança elétrica" checked={incluirSegurancaEletrica} onCheckedChange={setIncluirSegurancaEletrica} />
            </Section>
            <Section title="Exibir">
              <Check label="Equipamentos inativos que participaram" checked={incluirInativos} onCheckedChange={setIncluirInativos} />
              <Check label="Agrupar por setor" checked={agruparPorSetor} onCheckedChange={setAgruparPorSetor} />
              <Check label="Exibir próxima visita prevista" checked={exibirProximaVisita} onCheckedChange={setExibirProximaVisita} />
              <Check label="Exibir ocorrências NC" checked={exibirOcorrenciasNc} onCheckedChange={setExibirOcorrenciasNc} />
              <Check label="Preencher NL" checked={exibirOcorrenciasNl} onCheckedChange={setExibirOcorrenciasNl} />
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
                  <SelectItem value="cronograma">{ciclo ? "Somente cronograma do ciclo" : "Somente cronograma anual"}</SelectItem>
                  <SelectItem value="cronograma_completo">{ciclo ? "Cronograma do ciclo com PDFs" : "Cronograma completo com PDFs"}</SelectItem>
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

const MesAnoControl = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) => {
  const parsed = parseMesAnoValue(value);

  const updateMes = (mes: string) => {
    onChange(`${parsed.ano}-${mes}`);
  };

  const updateAno = (ano: string) => {
    onChange(`${ano}-${parsed.mes}`);
  };

  const anoBase = anoAtual();
  const anos = Array.from(
    new Set([
      ...Array.from({ length: 16 }, (_, index) => String(anoBase - 6 + index)),
      parsed.ano,
    ])
  ).sort();

  return (
    <div className="grid grid-cols-[1fr_96px] gap-2">
      <Select value={parsed.mes} onValueChange={updateMes}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {mesesAno.map((mes) => (
            <SelectItem key={mes.value} value={mes.value}>
              {mes.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={parsed.ano} onValueChange={updateAno}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anos.map((ano) => (
            <SelectItem key={ano} value={ano}>
              {ano}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

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

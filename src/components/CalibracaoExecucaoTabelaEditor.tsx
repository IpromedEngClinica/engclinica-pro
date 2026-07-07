import { AlertCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalibracaoExecucaoTabelaInput } from "@/services/calibracaoExecucoesService";
import type { CalibracaoProcedimentoPadraoSelecionavel } from "@/services/calibracaoProcedimentosService";
import {
  calcularPontoCalibracao,
  selecionarPontoPadraoReferencia,
  type RegraDecisao,
} from "@/utils/calibracaoCalculos";
import { formatarDataPadrao } from "@/utils/calibracaoValidade";
import {
  formatarNumeroComCasas,
  formatDecimalPtBr,
  normalizeDecimalInput,
  obterCasasResolucaoEquipamento,
} from "@/utils/numberUtils";

interface Props {
  tabela: CalibracaoExecucaoTabelaInput;
  padroes: CalibracaoProcedimentoPadraoSelecionavel[];
  disabled?: boolean;
  onChange: (tabela: CalibracaoExecucaoTabelaInput) => void;
  onRemover: () => void;
}

const resultadoLabel = {
  conforme: "Conforme",
  nao_conforme: "Nao conforme",
  sem_criterio: "Sem criterio",
};

const CalibracaoExecucaoTabelaEditor = ({
  tabela,
  padroes,
  disabled = false,
  onChange,
  onRemover,
}: Props) => {
  const padrao = padroes.find((item) => item.id === tabela.padraoId);
  const tabelaPadrao = padrao?.tabelas?.find((item) => item.id === tabela.padraoTabelaId);
  const padraoVinculadoSemValidade = Boolean(tabela.padraoId && !padrao);
  const mostrarResultado = tabela.incluirCriterio;
  const casasResolucaoEquipamento = obterCasasResolucaoEquipamento(
    tabela.resolucaoEquipamentoTexto,
    tabela.resolucaoEquipamento
  );

  const calculos = useMemo(
    () =>
      tabela.pontos.map((ponto) => {
        const leituras = ponto.leituras.flatMap((item) =>
          item.valor === null ? [] : [item.valor]
        );
        if (leituras.length !== tabela.quantidadeLeituras || !tabelaPadrao) return null;
        const correspondente = selecionarPontoPadraoReferencia(
          ponto.valorNominal,
          (tabelaPadrao.pontos || []).map((item) => ({
            valorNominal: item.valor_nominal,
            valorNominalTexto: item.valor_nominal_texto,
            tendencia: item.tendencia,
            incertezaExpandida: item.incerteza_expandida,
            incertezaExpandidaTexto: item.incerteza_expandida_texto,
            fatorAbrangenciaK: item.fator_abrangencia_k,
            grausLiberdade: item.graus_liberdade_efetivos_veff,
            veffInfinito: item.veff_infinito,
          }))
        );
        if (!correspondente) return null;
        try {
          return calcularPontoCalibracao({
            valorNominal: ponto.valorNominal,
            leituras,
            pontoPadrao: correspondente,
            resolucaoEquipamento: tabela.resolucaoEquipamento,
            resolucaoPadrao: tabela.resolucaoPadrao,
            corrigirErroSistematico: tabela.corrigirErroSistematico,
            fatorModo: tabela.fatorModo,
            fatorK: tabela.fatorK,
            criterio: {
              aplicar: mostrarResultado,
              tipo: tabela.criterioTipo,
              valorMaximo: tabela.criterioValorMaximo,
              valorMinimo: tabela.criterioValorMinimo,
              regraDecisao: tabela.regraDecisao,
            },
            outrasComponentes: ponto.outrasComponentes,
          });
        } catch {
          return null;
        }
      }),
    [mostrarResultado, tabela, tabelaPadrao]
  );

  const update = (patch: Partial<CalibracaoExecucaoTabelaInput>) =>
    onChange({ ...tabela, ...patch });
  const updatePonto = (index: number, patch: Partial<CalibracaoExecucaoTabelaInput["pontos"][number]>) =>
    update({ pontos: tabela.pontos.map((ponto, itemIndex) => itemIndex === index ? { ...ponto, ...patch } : ponto) });
  const adicionarMedicao = () =>
    update({
      quantidadeLeituras: tabela.quantidadeLeituras + 1,
      pontos: tabela.pontos.map((ponto) => ({
        ...ponto,
        leituras: [...ponto.leituras, { valor: null, valorTexto: "" }],
      })),
    });
  const removerMedicao = () => {
    if (tabela.quantidadeLeituras <= 1) return;
    const possuiValor = tabela.pontos.some(
      (ponto) => ponto.leituras.at(-1)?.valorTexto.trim()
    );
    if (
      possuiValor &&
      !window.confirm("Remover a ultima medicao preenchida de todos os pontos?")
    ) {
      return;
    }
    update({
      quantidadeLeituras: tabela.quantidadeLeituras - 1,
      pontos: tabela.pontos.map((ponto) => ({
        ...ponto,
        leituras: ponto.leituras.slice(0, -1),
      })),
    });
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configuracao da tabela</h4>
            <SelectField label="Padrao utilizado *" value={tabela.padraoId} disabled={disabled} options={padroes.map((item) => [item.id, `${item.nome_padrao} - ${item.numero_certificado}`])} onChange={(padraoId) => update({ padraoId, padraoTabelaId: "" })} />
            <SelectField label="Tabela do padrao *" value={tabela.padraoTabelaId} disabled={disabled || !padrao} options={(padrao?.tabelas || []).map((item) => [item.id, `${item.nome} - ${item.grandeza} (${item.unidade})`])} onChange={(padraoTabelaId) => update({ padraoTabelaId })} />
            <Info label="Validade do padrao" value={formatarDataPadrao(padrao?.data_validade)} />
            {padraoVinculadoSemValidade && (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Nao existe certificado de padrao valido para esta tabela na data da calibracao.
                  Renove o certificado do padrao ou selecione outro padrao valido.
                </span>
              </div>
            )}
            <DecimalTexto label="Resolucao do equipamento" value={tabela.resolucaoEquipamentoTexto || ""} disabled={disabled} onChange={(resolucaoEquipamentoTexto) => update({ resolucaoEquipamentoTexto, resolucaoEquipamento: normalizeDecimalInput(resolucaoEquipamentoTexto) })} />
            {tabela.fatorModo === "manual_execucao" && <Decimal label="Fator k da execucao *" value={tabela.fatorK} disabled={disabled} onChange={(fatorK) => update({ fatorK })} />}
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
            <div className="text-sm font-medium">
              {tabela.incluirCriterio
                ? "Criterio de aceitacao aplicado pelo cadastro do cliente"
                : "Cliente sem criterio de aceitacao para esta calibracao"}
            </div>
            {tabela.incluirCriterio && (
              <>
                <SelectField
                  label="Tipo de criterio *"
                  value={tabela.criterioTipo || ""}
                  disabled
                  options={[
                    ["absoluto", "Absoluto"],
                    ["percentual", "Percentual"],
                    ["faixa", "Faixa"],
                  ]}
                  onChange={(criterioTipo) =>
                    update({
                      criterioTipo: criterioTipo as CalibracaoExecucaoTabelaInput["criterioTipo"],
                    })
                  }
                />
                {tabela.criterioTipo === "faixa" && (
                  <Decimal
                    label="Valor minimo *"
                    value={tabela.criterioValorMinimo}
                    disabled
                    onChange={(criterioValorMinimo) => update({ criterioValorMinimo })}
                  />
                )}
                <Decimal
                  label="Valor maximo *"
                  value={tabela.criterioValorMaximo}
                  disabled
                  onChange={(criterioValorMaximo) => update({ criterioValorMaximo })}
                />
                <SelectField
                  label="Regra de decisao *"
                  value={tabela.regraDecisao || ""}
                  disabled
                  options={[
                    ["aceitacao_simples", "Aceitacao simples"],
                    ["considerando_incerteza", "Considerando incerteza"],
                  ]}
                  onChange={(regraDecisao) =>
                    update({ regraDecisao: regraDecisao as RegraDecisao })
                  }
                />
              </>
            )}
          </div>

          <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={onRemover} disabled={disabled}>
            <Trash2 className="mr-2 h-4 w-4" /> Remover tabela desta calibracao
          </Button>
        </aside>

        <section className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Leituras</h4>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={adicionarMedicao} disabled={disabled}>
                <Plus className="mr-2 h-4 w-4" /> Medicao
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={removerMedicao} disabled={disabled || tabela.quantidadeLeituras <= 1}>
                <Minus className="mr-2 h-4 w-4" /> Medicao
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[830px] text-sm">
              <thead><tr className="h-9 border-b bg-muted/50 text-xs">
                <th className="w-[90px] px-2 py-1.5 text-left">VN/VR</th>
                {Array.from({ length: tabela.quantidadeLeituras }, (_, index) => <th key={index} className="w-[100px] px-2 py-1.5 text-left">VM({index + 1})</th>)}
                <th className="w-[95px] px-2 py-1.5 text-left">Media</th><th className="w-[95px] px-2 py-1.5 text-left">Tendencia</th>
                <th className="w-[130px] px-2 py-1.5 text-left">Incerteza expandida</th><th className="w-[70px] px-2 py-1.5 text-left">k</th>
                {mostrarResultado && <th className="w-[100px] px-2 py-1.5 text-left">Resultado</th>}
              </tr></thead>
              <tbody>{tabela.pontos.map((ponto, pontoIndex) => {
                const calculo = calculos[pontoIndex];
                return <tr key={`${ponto.valorNominal}-${pontoIndex}`} className="h-10 border-b last:border-0">
                  <td className="px-2 py-1.5">{ponto.valorNominalTexto || tabelaPadrao?.pontos?.find((item) => Math.abs(item.valor_nominal - ponto.valorNominal) < 1e-10)?.valor_nominal_texto || formatDecimalPtBr(ponto.valorNominal)}</td>
                  {ponto.leituras.map((leitura, leituraIndex) => <td key={leituraIndex} className="px-2 py-1.5"><Input className="h-8 min-w-[90px] w-24" inputMode="decimal" disabled={disabled} value={leitura.valorTexto} onChange={(event) => { const valorTexto = event.target.value; updatePonto(pontoIndex, { leituras: ponto.leituras.map((item, index) => index === leituraIndex ? { valor: normalizeDecimalInput(valorTexto), valorTexto } : item) }); }} /></td>)}
                  <Value value={calculo?.media} casas={casasResolucaoEquipamento} /><Value value={calculo?.tendenciaCorrigida ?? calculo?.tendenciaBruta} casas={calculo?.casasDecimaisIncerteza ?? casasResolucaoEquipamento} />
                  <Value value={calculo?.incertezaExpandidaReportada} casas={calculo?.casasDecimaisIncerteza} />
                  <Value value={calculo?.fatorK} />
                  {mostrarResultado && <td className="px-2 py-1.5">{calculo ? resultadoLabel[calculo.resultadoConformidade] : "-"}</td>}
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value?: string | number | null }) => <div className="rounded-md border bg-muted/20 px-2 py-1.5 text-sm"><span className="block text-xs text-muted-foreground">{label}</span>{value || "-"}</div>;
const Value = ({ casas, value }: { casas?: number | null; value?: number | null }) => <td className="px-2 py-1.5">{casas == null ? formatDecimalPtBr(value) : formatarNumeroComCasas(value, casas)}</td>;
const Decimal = ({ disabled, label, onChange, value }: { disabled: boolean; label: string; onChange: (value: number | null) => void; value?: number | null }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Input className="h-8" inputMode="decimal" disabled={disabled} value={value ?? ""} onChange={(event) => onChange(normalizeDecimalInput(event.target.value))} /></div>;
const DecimalTexto = ({ disabled, label, onChange, value }: { disabled: boolean; label: string; onChange: (value: string) => void; value: string }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Input className="h-8" inputMode="decimal" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
const SelectField = ({ disabled, label, onChange, options, value }: { disabled: boolean; label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Select value={value} disabled={disabled} onValueChange={onChange}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select></div>;

export default CalibracaoExecucaoTabelaEditor;

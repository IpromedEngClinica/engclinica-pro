import { Calculator, ListTree } from "lucide-react";
import { useMemo, useState } from "react";
import CalibracaoOrcamentoIncertezaDialog from "@/components/CalibracaoOrcamentoIncertezaDialog";
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
  encontrarPontoPadraoExato,
  type RegraDecisao,
} from "@/utils/calibracaoCalculos";
import { formatDecimalPtBr, normalizeDecimalInput } from "@/utils/numberUtils";

interface Props {
  tabela: CalibracaoExecucaoTabelaInput;
  padroes: CalibracaoProcedimentoPadraoSelecionavel[];
  regraDecisao?: RegraDecisao | null;
  aplicarCriterio: boolean;
  disabled?: boolean;
  onChange: (tabela: CalibracaoExecucaoTabelaInput) => void;
}

const resultadoLabel = {
  conforme: "Conforme",
  nao_conforme: "Nao conforme",
  sem_criterio: "Sem criterio",
};

const CalibracaoExecucaoTabelaEditor = ({
  tabela,
  padroes,
  regraDecisao,
  aplicarCriterio,
  disabled = false,
  onChange,
}: Props) => {
  const [detalhado, setDetalhado] = useState(false);
  const [orcamentoIndex, setOrcamentoIndex] = useState<number | null>(null);
  const padrao = padroes.find((item) => item.id === tabela.padraoId);
  const tabelaPadrao = padrao?.tabelas?.find((item) => item.id === tabela.padraoTabelaId);

  const calculos = useMemo(
    () =>
      tabela.pontos.map((ponto) => {
        const leituras = ponto.leituras.filter((item): item is number => item !== null);
        if (leituras.length !== tabela.quantidadeLeituras || !tabelaPadrao) return null;
        const correspondente = encontrarPontoPadraoExato(
          ponto.valorNominal,
          (tabelaPadrao.pontos || []).map((item) => ({
            valorNominal: item.valor_nominal,
            tendencia: item.tendencia,
            incertezaExpandida: item.incerteza_expandida,
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
              aplicar: aplicarCriterio && tabela.incluirCriterio,
              tipo: tabela.criterioTipo,
              valorMaximo: tabela.criterioValorMaximo,
              valorMinimo: tabela.criterioValorMinimo,
              regraDecisao,
            },
            outrasComponentes: ponto.outrasComponentes,
          });
        } catch {
          return null;
        }
      }),
    [aplicarCriterio, regraDecisao, tabela, tabelaPadrao]
  );

  const update = (patch: Partial<CalibracaoExecucaoTabelaInput>) =>
    onChange({ ...tabela, ...patch });
  const updatePonto = (index: number, patch: Partial<CalibracaoExecucaoTabelaInput["pontos"][number]>) =>
    update({ pontos: tabela.pontos.map((ponto, itemIndex) => itemIndex === index ? { ...ponto, ...patch } : ponto) });

  return (
    <div className="grid gap-4 rounded-b-lg border border-t-0 p-4 xl:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">{tabela.nome}</h4>
        <SelectField label="Padrao utilizado *" value={tabela.padraoId} disabled={disabled} options={padroes.map((item) => [item.id, `${item.nome_padrao} - ${item.numero_certificado}`])} onChange={(padraoId) => update({ padraoId, padraoTabelaId: "" })} />
        <SelectField label="Tabela do padrao *" value={tabela.padraoTabelaId} disabled={disabled || !padrao} options={(padrao?.tabelas || []).map((item) => [item.id, `${item.nome} - ${item.grandeza} (${item.unidade})`])} onChange={(padraoTabelaId) => update({ padraoTabelaId })} />
        <div className="grid gap-2 text-sm">
          <Info label="Validade do padrao" value={padrao?.data_validade} />
          <Info label="Certificado" value={padrao?.numero_certificado} />
          <Info label="Laboratorio calibrador" value={padrao?.laboratorio_calibrador} />
        </div>
        <Decimal label="Resolucao do padrao" value={tabela.resolucaoPadrao} disabled={disabled} onChange={(resolucaoPadrao) => update({ resolucaoPadrao })} />
        <Decimal label="Resolucao do equipamento" value={tabela.resolucaoEquipamento} disabled={disabled} onChange={(resolucaoEquipamento) => update({ resolucaoEquipamento })} />
        {tabela.fatorModo === "manual_execucao" && <Decimal label="Fator k da execucao *" value={tabela.fatorK} disabled={disabled} onChange={(fatorK) => update({ fatorK })} />}
        {tabela.fatorModo === "k_fixo" && <Info label="Fator k fixo" value={formatDecimalPtBr(tabela.fatorK)} />}
        <Info label="Criterio de aceitacao" value={tabela.incluirCriterio ? `${tabela.criterioTipo || "-"}: ${formatDecimalPtBr(tabela.criterioValorMaximo)}` : "Nao aplicado"} />
        <Info label="Regra de decisao" value={aplicarCriterio ? regraDecisao || "-" : "Sem declaracao"} />
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => setDetalhado((current) => !current)}>{detalhado ? "Modo preenchimento" : "Modo detalhado"}</Button></div>
        <div className="overflow-x-auto rounded-lg border">
          <table className={`w-full text-sm ${detalhado ? "min-w-[1900px]" : "min-w-[1050px]"}`}>
            <thead><tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-left">VN/VR</th>
              {Array.from({ length: tabela.quantidadeLeituras }, (_, index) => <th key={index} className="px-2 py-2 text-left">VM({index + 1})</th>)}
              <th className="px-2 py-2 text-left">Media</th><th className="px-2 py-2 text-left">Tendencia</th>
              {detalhado && <><th className="px-2 py-2 text-left">uA</th><th className="px-2 py-2 text-left">uPadrao</th><th className="px-2 py-2 text-left">uRes. Equip.</th><th className="px-2 py-2 text-left">uRes. Padrao</th><th className="px-2 py-2 text-left">uc</th><th className="px-2 py-2 text-left">veff</th><th className="px-2 py-2 text-left">k</th></>}
              <th className="px-2 py-2 text-left">U</th><th className="px-2 py-2 text-left">Resultado</th><th className="px-2 py-2 text-left">Orcamento</th>
            </tr></thead>
            <tbody>{tabela.pontos.map((ponto, pontoIndex) => {
              const calculo = calculos[pontoIndex];
              return <tr key={`${ponto.valorNominal}-${pontoIndex}`} className="border-b last:border-0">
                <td className="px-2 py-2">{formatDecimalPtBr(ponto.valorNominal)}</td>
                {ponto.leituras.map((leitura, leituraIndex) => <td key={leituraIndex} className="px-2 py-2"><Input className="w-24" inputMode="decimal" disabled={disabled} value={leitura ?? ""} onChange={(event) => updatePonto(pontoIndex, { leituras: ponto.leituras.map((item, index) => index === leituraIndex ? normalizeDecimalInput(event.target.value) : item) })} /></td>)}
                <Value value={calculo?.media} /><Value value={calculo?.tendenciaCorrigida} />
                {detalhado && <><Value value={calculo?.uTipoA} /><Value value={calculo?.uPadrao} /><Value value={calculo?.uResolucaoEquipamento} /><Value value={calculo?.uResolucaoPadrao} /><Value value={calculo?.uc} /><td className="px-2 py-2">{calculo?.veffInfinito ? "INF" : formatDecimalPtBr(calculo?.veff)}</td><Value value={calculo?.fatorK} /></>}
                <Value value={calculo?.incertezaExpandida} /><td className="px-2 py-2">{calculo ? resultadoLabel[calculo.resultadoConformidade] : "-"}</td>
                <td className="px-2 py-2"><Button type="button" size="sm" variant="ghost" disabled={!calculo} onClick={() => setOrcamentoIndex(pontoIndex)}><ListTree className="mr-1 h-4 w-4" /> Ver</Button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Calculator className="h-4 w-4" /> Os resultados sao recalculados automaticamente ao preencher as leituras.</p>
      </div>

      {orcamentoIndex !== null && <CalibracaoOrcamentoIncertezaDialog open onOpenChange={(value) => !value && setOrcamentoIndex(null)} automaticas={calculos[orcamentoIndex]?.componentes.slice(0, 4) || []} adicionais={tabela.pontos[orcamentoIndex].outrasComponentes || []} disabled={disabled} onChange={(outrasComponentes) => updatePonto(orcamentoIndex, { outrasComponentes })} />}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value?: string | number | null }) => <div><span className="font-medium text-muted-foreground">{label}: </span>{value || "-"}</div>;
const Value = ({ value }: { value?: number | null }) => <td className="px-2 py-2">{formatDecimalPtBr(value)}</td>;
const Decimal = ({ disabled, label, onChange, value }: { disabled: boolean; label: string; onChange: (value: number | null) => void; value?: number | null }) => <div className="space-y-2"><Label>{label}</Label><Input inputMode="decimal" disabled={disabled} value={value ?? ""} onChange={(event) => onChange(normalizeDecimalInput(event.target.value))} /></div>;
const SelectField = ({ disabled, label, onChange, options, value }: { disabled: boolean; label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <div className="space-y-2"><Label>{label}</Label><Select value={value} disabled={disabled} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select></div>;

export default CalibracaoExecucaoTabelaEditor;

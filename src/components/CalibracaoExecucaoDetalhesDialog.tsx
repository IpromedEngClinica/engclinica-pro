import { Ban, Download, FileCheck2, FileText, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useFinalizarCalibracaoExecucao } from "@/hooks/useCalibracaoExecucoes";
import {
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
} from "@/services/calibracaoExecucoesService";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import { formatDecimalPtBr } from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao: CalibracaoExecucao | null;
  onEditar: (execucao: CalibracaoExecucao) => void;
  onCancelar: (execucao: CalibracaoExecucao) => void;
}

const date = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const decimal = (value?: number | null) => formatDecimalPtBr(value) || "-";
const Field = ({ label, value }: { label: string; value?: string | number | null }) => <div className="text-sm"><span className="font-medium text-muted-foreground">{label}: </span>{value || "-"}</div>;

const CalibracaoExecucaoDetalhesDialog = ({ open, onOpenChange, execucao, onEditar, onCancelar }: Props) => {
  const finalizar = useFinalizarCalibracaoExecucao();
  if (!execucao) return null;
  const editavel = ["rascunho", "em_execucao"].includes(execucao.status);

  const gerarPdf = () => gerarPdfCalibracaoCertificado(execucao);
  const abrirPdf = async (download = false) => {
    try { window.open(await calibracaoExecucoesService.criarUrlPdf(execucao, download), "_blank", "noopener,noreferrer"); }
    catch (error) { toast({ title: "Erro ao abrir certificado", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const fechar = async () => {
    if (!window.confirm("Finalizar a calibracao? Depois do fechamento o registro nao podera ser editado.")) return;
    try {
      const recalculada = await calibracaoExecucoesService.recalcularExecucao(execucao.id);
      const pdf = await gerarPdfCalibracaoCertificado(recalculada, false);
      await finalizar.mutateAsync({ id: execucao.id, pdf });
      toast({ title: "Calibracao finalizada e certificado armazenado." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao finalizar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[96vw]">
    <DialogHeader><DialogTitle>{formatNumeroCertificadoCalibracao(execucao.numero_certificado)} - {execucao.equipamento?.tipo_equipamento?.nome || execucao.equipamento?.tipo_texto || "Equipamento"}</DialogTitle></DialogHeader>
    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
      {editavel && <><Button size="sm" variant="outline" onClick={() => onEditar(execucao)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button><Button size="sm" onClick={fechar} disabled={finalizar.isPending}><FileCheck2 className="mr-2 h-4 w-4" /> Finalizar calibracao</Button><Button size="sm" variant="destructive" onClick={() => onCancelar(execucao)}><Ban className="mr-2 h-4 w-4" /> Cancelar</Button></>}
      <Button size="sm" variant="outline" onClick={gerarPdf}><FileText className="mr-2 h-4 w-4" /> Gerar PDF</Button>
      {execucao.pdf_storage_path && <><Button size="sm" variant="outline" onClick={() => abrirPdf()}><FileText className="mr-2 h-4 w-4" /> Visualizar PDF</Button><Button size="sm" variant="outline" onClick={() => abrirPdf(true)}><Download className="mr-2 h-4 w-4" /> Baixar PDF</Button></>}
      <Button size="sm" variant="outline" disabled><RotateCcw className="mr-2 h-4 w-4" /> Retificar (futuro)</Button>
    </div>
    <Tabs defaultValue="resumo"><TabsList><TabsTrigger value="resumo">Resumo</TabsTrigger><TabsTrigger value="resultados">Resultados</TabsTrigger><TabsTrigger value="orcamento">Orcamento de incerteza</TabsTrigger><TabsTrigger value="rastreabilidade">Rastreabilidade</TabsTrigger></TabsList>
      <TabsContent value="resumo" className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <Field label="Cliente" value={execucao.empresa?.nome_fantasia || execucao.empresa?.nome} /><Field label="Procedimento" value={execucao.procedimento_nome_snapshot} /><Field label="Status" value={execucao.status} />
        <Field label="Data da calibracao" value={date(execucao.data_calibracao)} /><Field label="Validade" value={date(execucao.data_validade)} /><Field label="Resultado geral" value={execucao.resultado_geral || "Pendente"} />
        <Field label="Tecnico executor" value={execucao.tecnico_executor_nome} /><Field label="Responsavel tecnico" value={execucao.responsavel_tecnico_nome} /><Field label="Regra de decisao" value={execucao.regra_decisao || "Sem declaracao de conformidade"} />
      </TabsContent>
      <TabsContent value="resultados" className="space-y-4">{(execucao.tabelas || []).map((tabela) => <section key={tabela.id} className="rounded-lg border p-3"><h3 className="mb-2 font-semibold">{tabela.nome_snapshot}</h3><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead><tr className="border-b bg-muted/50">{["VN/VR", "Media", "Tendencia", "uA", "uc", "veff", "k", "U", "Resultado"].map((item) => <th key={item} className="px-2 py-2 text-left">{item}</th>)}</tr></thead><tbody>{(tabela.pontos || []).map((ponto) => <tr key={ponto.id} className="border-b last:border-0"><td className="px-2 py-2">{decimal(ponto.valor_nominal)}</td><td className="px-2 py-2">{decimal(ponto.media_valores_medidos)}</td><td className="px-2 py-2">{decimal(ponto.tendencia_corrigida)}</td><td className="px-2 py-2">{decimal(ponto.incerteza_tipo_a)}</td><td className="px-2 py-2">{decimal(ponto.incerteza_combinada)}</td><td className="px-2 py-2">{ponto.veff_infinito ? "INF" : decimal(ponto.graus_liberdade_efetivos_veff)}</td><td className="px-2 py-2">{decimal(ponto.fator_abrangencia_k)}</td><td className="px-2 py-2">{decimal(ponto.incerteza_expandida)}</td><td className="px-2 py-2">{ponto.resultado_conformidade || "-"}</td></tr>)}</tbody></table></div></section>)}</TabsContent>
      <TabsContent value="orcamento" className="space-y-4">{(execucao.tabelas || []).flatMap((tabela) => (tabela.pontos || []).map((ponto) => <section key={ponto.id} className="rounded-lg border p-3"><h3 className="mb-2 font-semibold">{tabela.nome_snapshot} - {decimal(ponto.valor_nominal)} {tabela.unidade_snapshot}</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-2 py-2 text-left">Fonte</th><th className="px-2 py-2 text-left">Tipo</th><th className="px-2 py-2 text-left">Incerteza padrao</th><th className="px-2 py-2 text-left">Graus de liberdade</th></tr></thead><tbody>{(ponto.componentes || []).map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-2 py-2">{item.nome}</td><td className="px-2 py-2">{item.categoria}</td><td className="px-2 py-2">{decimal(item.incerteza_padrao)}</td><td className="px-2 py-2">{item.graus_liberdade_infinito ? "INF" : decimal(item.graus_liberdade)}</td></tr>)}</tbody></table></div></section>))}</TabsContent>
      <TabsContent value="rastreabilidade" className="space-y-3">{(execucao.tabelas || []).map((tabela) => <div key={tabela.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-3"><Field label="Tabela" value={tabela.nome_snapshot} /><Field label="Padrao" value={tabela.padrao_nome_snapshot} /><Field label="Certificado" value={tabela.padrao_numero_certificado_snapshot} /><Field label="Validade" value={date(tabela.padrao_validade_snapshot)} /><Field label="Identificacao" value={tabela.padrao_identificacao_snapshot} /><Field label="Laboratorio" value={tabela.padrao_laboratorio_snapshot} /></div>)}</TabsContent>
    </Tabs>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
  </DialogContent></Dialog>;
};

export default CalibracaoExecucaoDetalhesDialog;

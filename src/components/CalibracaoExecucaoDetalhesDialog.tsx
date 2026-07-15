import { Ban, Download, FileText, Pencil } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
  type CalibracaoExecucaoRevisao,
} from "@/services/calibracaoExecucoesService";
import {
  formatarDataPadrao,
  formatarLocalCalibracao,
  formatarMesAno,
} from "@/utils/calibracaoValidade";
import { formatarIdentificacaoCompletaEquipamento } from "@/utils/equipamentoFormatters";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import {
  formatarNumeroComCasas,
  formatDecimalPtBr,
  obterCasasResolucaoEquipamento,
} from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao: CalibracaoExecucao | null;
  onEditar?: (execucao: CalibracaoExecucao) => void;
  onCancelar?: (execucao: CalibracaoExecucao) => void;
}

const date = (value?: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
    : "-";
const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "-";
const decimal = (value?: number | null) => formatDecimalPtBr(value) || "-";
const incertezaReportada = (value?: number | null, casas?: number | null) =>
  formatDecimalPtBr(value, casas ?? 8, casas ?? 0) || "-";
const resultado = (value?: string | null) =>
  value?.replaceAll("_", " ") || "-";
const medida = (
  value?: number | null,
  incerteza?: number | null,
  unidade?: string | null
) =>
  value == null
    ? "-"
    : `${decimal(value)}${incerteza == null ? "" : ` +/- ${decimal(incerteza)}`} ${unidade || ""}`;

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) => (
  <div className="text-sm">
    <span className="font-medium text-muted-foreground">{label}: </span>
    <span>{value === null || value === undefined || value === "" ? "-" : value}</span>
  </div>
);

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section className="space-y-3 rounded-lg border p-4">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-x-5 gap-y-2 md:grid-cols-3">{children}</div>
);

const CalibracaoExecucaoDetalhesDialog = ({
  open,
  onOpenChange,
  execucao,
  onEditar,
  onCancelar,
}: Props) => {
  const [revisoes, setRevisoes] = useState<CalibracaoExecucaoRevisao[]>([]);
  const [carregandoRevisoes, setCarregandoRevisoes] = useState(false);

  useEffect(() => {
    if (!open || !execucao?.id) {
      setRevisoes([]);
      return;
    }

    let ativo = true;
    setCarregandoRevisoes(true);
    calibracaoExecucoesService
      .listarRevisoes(execucao.id)
      .then((data) => {
        if (ativo) setRevisoes(data);
      })
      .catch((error) => {
        if (!ativo) return;
        toast({
          title: "Erro ao carregar revisoes",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (ativo) setCarregandoRevisoes(false);
      });

    return () => {
      ativo = false;
    };
  }, [execucao?.id, open]);

  if (!execucao) return null;

  const editavel = execucao.status !== "cancelada";
  const gerarPdf = () => gerarPdfCalibracaoCertificado(execucao);
  const abrirPdf = async (download = false) => {
    try {
      window.open(
        await calibracaoExecucoesService.criarUrlPdf(execucao, download),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      toast({
        title: "Erro ao abrir certificado",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };
  const editar = () => {
    if (
      execucao.status === "fechada" &&
      !window.confirm(
        "Esta calibracao ja foi finalizada. As alteracoes gerarao uma nova revisao do certificado.\nDeseja continuar?"
      )
    ) {
      return;
    }
    onEditar?.(execucao);
  };
  const equipamento = execucao.equipamento;
  const empresa = execucao.empresa;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[96vw]">
        <DialogHeader>
          <DialogTitle>
            {formatNumeroCertificadoCalibracao(execucao.numero_certificado)} -{" "}
            {equipamento?.tipo_equipamento?.nome ||
              equipamento?.tipo_texto ||
              "Equipamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
          {editavel && onEditar && (
            <Button size="sm" variant="outline" onClick={editar}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
          {!execucao.pdf_storage_path ? (
            <Button size="sm" variant="outline" onClick={gerarPdf}>
              <FileText className="mr-2 h-4 w-4" /> Gerar PDF
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => abrirPdf()}>
                <FileText className="mr-2 h-4 w-4" /> Visualizar PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => abrirPdf(true)}>
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
              </Button>
              <Button size="sm" variant="outline" onClick={gerarPdf}>
                <FileText className="mr-2 h-4 w-4" /> Regenerar PDF
              </Button>
            </>
          )}
          {["rascunho", "em_execucao"].includes(execucao.status) &&
            onCancelar && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancelar(execucao)}
              >
                <Ban className="mr-2 h-4 w-4" /> Cancelar calibracao
              </Button>
            )}
        </div>

        <div className="space-y-4">
          <Section title="1. Identificacao da calibracao">
            <Grid>
              <Field label="Numero" value={formatNumeroCertificadoCalibracao(execucao.numero_certificado)} />
              <Field label="Revisao" value={execucao.numero_revisao || "Original"} />
              <Field label="Status" value={resultado(execucao.status)} />
              <Field label="Procedimento" value={execucao.procedimento_nome_snapshot} />
              <Field label="Versao do procedimento" value={execucao.procedimento_versao_snapshot} />
              <Field label="OS vinculada" value={execucao.os_id} />
            </Grid>
          </Section>

          <Section title="2. Cliente">
            <Grid>
              <Field label="Nome" value={empresa?.nome || empresa?.nome_fantasia} />
              <Field label="Razao social" value={empresa?.nome} />
              <Field label="CPF/CNPJ" value={empresa?.cpf_cnpj} />
              <Field label="Contato" value={empresa?.contato} />
              <Field label="Telefone" value={empresa?.telefone || empresa?.celular} />
              <Field label="E-mail" value={empresa?.email} />
            </Grid>
          </Section>

          <Section title="3. Equipamento">
            <Grid>
              <Field label="Identificacao" value={formatarIdentificacaoCompletaEquipamento(equipamento)} />
              <Field label="Tipo" value={equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto} />
              <Field label="Fabricante" value={equipamento?.fabricante} />
              <Field label="Modelo" value={equipamento?.modelo} />
              <Field label="Numero de serie" value={equipamento?.numero_serie} />
              <Field label="TAG" value={equipamento?.tag} />
            </Grid>
          </Section>

          <Section title="4. Condicoes ambientais">
            <Grid>
              <Field label="Local" value={formatarLocalCalibracao(execucao.local_calibracao)} />
              <Field label="Temperatura" value={medida(execucao.temperatura_ambiente, execucao.incerteza_temperatura, execucao.unidade_temperatura)} />
              <Field label="Umidade relativa" value={medida(execucao.umidade_relativa, execucao.incerteza_umidade, execucao.unidade_umidade)} />
              <Field label="Pressao atmosferica" value={medida(execucao.pressao_atmosferica, execucao.incerteza_pressao, execucao.unidade_pressao)} />
            </Grid>
          </Section>

          <Section title="5. Dados de finalizacao">
            <Grid>
              <Field label="Data da calibracao" value={date(execucao.data_calibracao)} />
              <Field label="Data de emissao" value={date(execucao.data_emissao)} />
              <Field label="Validade" value={formatarMesAno(execucao.validade_mes || execucao.data_validade)} />
              <Field label="Tecnico executor" value={execucao.tecnico_executor_nome} />
              <Field label="Registro do tecnico" value={execucao.tecnico_executor_registro} />
              <Field label="Responsavel solicitante" value={execucao.responsavel_solicitante} />
              <Field label="Resultado geral" value={resultado(execucao.resultado_geral || "Pendente")} />
              <Field label="Finalizada em" value={dateTime(execucao.fechado_em)} />
            </Grid>
          </Section>

          <Section title="6. Padroes utilizados">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="px-2 py-2 text-left">Tabela</th><th className="px-2 py-2 text-left">Padrao</th><th className="px-2 py-2 text-left">Certificado</th><th className="px-2 py-2 text-left">Validade</th><th className="px-2 py-2 text-left">Laboratorio</th></tr></thead>
                <tbody>{(execucao.tabelas || []).map((tabela) => <tr key={tabela.id} className="h-9 border-b last:border-0"><td className="px-2 py-1.5">{tabela.nome_snapshot}</td><td className="px-2 py-1.5">{tabela.padrao_nome_snapshot || "-"}</td><td className="px-2 py-1.5">{tabela.padrao_numero_certificado_snapshot || "-"}</td><td className="px-2 py-1.5">{formatarDataPadrao(tabela.padrao_validade_snapshot)}</td><td className="px-2 py-1.5">{tabela.padrao_laboratorio_snapshot || "-"}</td></tr>)}</tbody>
              </table>
            </div>
          </Section>

          <Section title="7. Resultados">
            <div className="space-y-4">{(execucao.tabelas || []).map((tabela) => {
              const casasResolucaoEquipamento = obterCasasResolucaoEquipamento(tabela.resolucao_equipamento_texto_snapshot, tabela.resolucao_equipamento_snapshot);
              return <div key={tabela.id} className="rounded-lg border p-3"><h4 className="mb-2 text-sm font-semibold">{tabela.nome_snapshot}</h4><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b bg-muted/50">{["VN/VR", "Media", "Tendencia", "U expandida", "k", ...(tabela.incluir_criterio_aceitacao_snapshot ? ["Resultado"] : [])].map((item) => <th key={item} className="px-2 py-2 text-left">{item}</th>)}</tr></thead><tbody>{(tabela.pontos || []).map((ponto) => <tr key={ponto.id} className="h-9 border-b last:border-0"><td className="px-2 py-1.5">{ponto.valor_nominal_texto_snapshot || decimal(ponto.valor_nominal)}</td><td className="px-2 py-1.5">{formatarNumeroComCasas(ponto.media_valores_medidos, casasResolucaoEquipamento)}</td><td className="px-2 py-1.5">{formatarNumeroComCasas(ponto.tendencia_corrigida ?? ponto.tendencia_bruta, ponto.casas_decimais_incerteza ?? casasResolucaoEquipamento)}</td><td className="px-2 py-1.5">{incertezaReportada(ponto.incerteza_expandida_reportada ?? ponto.incerteza_expandida, ponto.casas_decimais_incerteza)}</td><td className="px-2 py-1.5">{decimal(ponto.fator_abrangencia_k)}</td>{tabela.incluir_criterio_aceitacao_snapshot && <td className="px-2 py-1.5">{resultado(ponto.resultado_conformidade)}</td>}</tr>)}</tbody></table></div></div>;
            })}</div>
          </Section>

          <Section title="8. Criterio de aceitacao">
            <div className="space-y-2">{(execucao.tabelas || []).filter((tabela) => tabela.incluir_criterio_aceitacao_snapshot).map((tabela) => <div key={tabela.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-4"><Field label="Tabela" value={tabela.nome_snapshot} /><Field label="Tipo" value={tabela.criterio_aceitacao_tipo_snapshot} /><Field label="Valor minimo" value={tabela.criterio_aceitacao_valor_minimo_snapshot} /><Field label="Valor maximo" value={tabela.criterio_aceitacao_valor_maximo_snapshot} /><Field label="Regra de decisao" value={tabela.regra_decisao_snapshot} /></div>)}{!execucao.criterio_conformidade_aplicado && <p className="text-sm text-muted-foreground">Sem declaracao de conformidade nesta calibracao.</p>}</div>
          </Section>

          <Section title="9. Informacoes complementares">
            <Grid>
              <Field label="Norma utilizada" value={execucao.norma_utilizada_snapshot} />
              <Field label="Regra de decisao geral" value={execucao.regra_decisao || "Definida por tabela"} />
              <Field label="Atualizada apos finalizacao" value={execucao.atualizado_apos_finalizacao ? "Sim" : "Nao"} />
            </Grid>
          </Section>

          <Section title="10. Observacoes">
            <p className="whitespace-pre-wrap text-sm">{execucao.observacoes || "-"}</p>
          </Section>

          <Accordion type="multiple" className="rounded-lg border px-4">
            <AccordionItem value="rastreabilidade">
              <AccordionTrigger>Rastreabilidade</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">{(execucao.tabelas || []).map((tabela) => <div key={tabela.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-3"><Field label="Tabela" value={tabela.nome_snapshot} /><Field label="Padrao" value={tabela.padrao_nome_snapshot} /><Field label="Certificado" value={tabela.padrao_numero_certificado_snapshot} /><Field label="Validade" value={formatarDataPadrao(tabela.padrao_validade_snapshot)} /><Field label="Identificacao" value={tabela.padrao_identificacao_snapshot} /><Field label="Laboratorio" value={tabela.padrao_laboratorio_snapshot} /><Field label="Regra de decisao" value={tabela.regra_decisao_snapshot || "Nao aplicada"} /></div>)}</div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="revisoes">
              <AccordionTrigger>Historico de revisoes</AccordionTrigger>
              <AccordionContent>
                {carregandoRevisoes ? <p className="text-sm text-muted-foreground">Carregando revisoes...</p> : <div className="space-y-2">{revisoes.map((revisao) => <div key={revisao.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-3"><Field label="Revisao" value={revisao.numero_revisao} /><Field label="Criada em" value={dateTime(revisao.created_at)} /><Field label="Motivo" value={revisao.motivo} /></div>)}{!revisoes.length && <p className="text-sm text-muted-foreground">Nenhuma revisao registrada.</p>}</div>}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalibracaoExecucaoDetalhesDialog;

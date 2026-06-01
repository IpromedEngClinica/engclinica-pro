import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModalActionsBar from "@/components/ModalActionsBar";
import { toast } from "@/hooks/use-toast";
import {
  CalibracaoPadrao,
  calibracaoPadroesService,
  getStatusValidadePadrao,
} from "@/services/calibracaoPadroesService";
import { formatDecimalPtBr } from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  padrao: CalibracaoPadrao | null;
  onEditar: (padrao: CalibracaoPadrao) => void;
  onDocumentos: (padrao: CalibracaoPadrao) => void;
  onDesativar: (padrao: CalibracaoPadrao) => void;
}

const statusLabels = {
  vencido: "Vencido",
  ate_30_dias: "Vence em ate 30 dias",
  ate_60_dias: "Vence em ate 60 dias",
  valido: "Valido",
};

const statusClasses = {
  vencido: "bg-red-50 text-red-700 border-red-200",
  ate_30_dias: "bg-orange-50 text-orange-700 border-orange-200",
  ate_60_dias: "bg-yellow-50 text-yellow-700 border-yellow-200",
  valido: "bg-green-50 text-green-700 border-green-200",
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const formatNumber = (value?: number | null) =>
  formatDecimalPtBr(value) || "-";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="text-sm">
    <span className="font-medium text-muted-foreground">{label}: </span>
    <span>{children}</span>
  </div>
);

const CalibracaoPadraoDetalhesDialog = ({
  open,
  onOpenChange,
  padrao,
  onEditar,
  onDocumentos,
  onDesativar,
}: Props) => {
  if (!padrao) return null;

  const status = getStatusValidadePadrao(padrao.data_validade);
  const certificado = (padrao.documentos || []).find(
    (documento) => documento.tipo_documento === "Certificado"
  );

  const baixarCertificado = async () => {
    if (!certificado) {
      toast({ title: "Nenhum certificado anexado a este padrao." });
      return;
    }

    try {
      const url = await calibracaoPadroesService.baixarDocumento(certificado);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao baixar certificado",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{padrao.nome_padrao}</DialogTitle>
        </DialogHeader>

        <ModalActionsBar>
          <Button variant="outline" size="sm" onClick={() => onEditar(padrao)}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDocumentos(padrao)}
          >
            <FileText className="w-4 h-4 mr-2" /> Documentos
          </Button>
          <Button variant="outline" size="sm" onClick={baixarCertificado}>
            <Download className="w-4 h-4 mr-2" /> Baixar certificado
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDesativar(padrao)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Desativar
          </Button>
        </ModalActionsBar>

        <div className="space-y-4">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificacao</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Numero do certificado">
                {padrao.numero_certificado}
              </Field>
              <Field label="Padrao">{padrao.nome_padrao}</Field>
              <Field label="Laboratorio">
                {padrao.laboratorio_calibrador}
              </Field>
              <Field label="Fabricante">{padrao.fabricante || "-"}</Field>
              <Field label="Modelo">{padrao.modelo || "-"}</Field>
              <Field label="Numero de serie">{padrao.numero_serie || "-"}</Field>
              <Field label="Patrimonio">{padrao.patrimonio || "-"}</Field>
              <Field label="TAG">{padrao.tag || "-"}</Field>
              <Field label="Status">
                <Badge variant="outline" className={statusClasses[status]}>
                  {statusLabels[status]}
                </Badge>
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Validade</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Data da calibracao">
                {formatDate(padrao.data_calibracao)}
              </Field>
              <Field label="Data de validade">
                {formatDate(padrao.data_validade)}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Condicoes ambientais</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Temperatura">
                {formatNumber(padrao.temperatura_ambiente)}{" "}
                {padrao.unidade_temperatura || ""}
              </Field>
              <Field label="Incerteza da temperatura">
                {formatNumber(padrao.incerteza_temperatura)}{" "}
                {padrao.unidade_temperatura || ""}
              </Field>
              <Field label="Umidade relativa">
                {formatNumber(padrao.umidade_relativa)}{" "}
                {padrao.unidade_umidade || ""}
              </Field>
              <Field label="Incerteza da umidade">
                {formatNumber(padrao.incerteza_umidade)}{" "}
                {padrao.unidade_umidade || ""}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">
              Documentos ({padrao.documentos?.length || 0})
            </h3>
            {(padrao.documentos || []).map((documento) => (
              <p key={documento.id} className="text-sm">
                <span className="font-medium">{documento.tipo_documento}:</span>{" "}
                {documento.nome_arquivo}
              </p>
            ))}
            {!padrao.documentos?.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum documento anexado.
              </p>
            )}
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Tabelas metrologicas</h3>
            {!padrao.tabelas?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tabela cadastrada.
              </p>
            ) : (
              <Tabs defaultValue={padrao.tabelas[0].id}>
                <TabsList className="h-auto flex-wrap justify-start">
                  {padrao.tabelas.map((tabela) => (
                    <TabsTrigger key={tabela.id} value={tabela.id}>
                      {tabela.nome}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {padrao.tabelas.map((tabela) => (
                  <TabsContent key={tabela.id} value={tabela.id}>
                    <div className="mb-3 text-sm text-muted-foreground">
                      {tabela.grandeza} ({tabela.unidade})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left font-medium">Valor nominal</th>
                            <th className="px-3 py-2 text-left font-medium">Media medida</th>
                            <th className="px-3 py-2 text-left font-medium">Tendencia</th>
                            <th className="px-3 py-2 text-left font-medium">Incerteza expandida</th>
                            <th className="px-3 py-2 text-left font-medium">k</th>
                            <th className="px-3 py-2 text-left font-medium">veff</th>
                            <th className="px-3 py-2 text-left font-medium">Observacoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tabela.pontos || []).map((ponto) => (
                            <tr key={ponto.id} className="border-b last:border-0">
                              <td className="px-3 py-2">{formatNumber(ponto.valor_nominal)}</td>
                              <td className="px-3 py-2">{formatNumber(ponto.media_valores_medidos)}</td>
                              <td className="px-3 py-2">{formatNumber(ponto.tendencia)}</td>
                              <td className="px-3 py-2">{formatNumber(ponto.incerteza_expandida)}</td>
                              <td className="px-3 py-2">{formatNumber(ponto.fator_abrangencia_k)}</td>
                              <td className="px-3 py-2">
                                {ponto.veff_infinito
                                  ? "INF"
                                  : formatNumber(ponto.graus_liberdade_efetivos_veff)}
                              </td>
                              <td className="px-3 py-2">{ponto.observacoes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </section>

          {padrao.observacoes && (
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold">Observacoes</h3>
              <p className="text-sm whitespace-pre-wrap">{padrao.observacoes}</p>
            </section>
          )}
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

export default CalibracaoPadraoDetalhesDialog;

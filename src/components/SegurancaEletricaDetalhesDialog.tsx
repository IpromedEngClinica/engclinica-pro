import { FileText, Pencil } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ModalActionsBar from "@/components/ModalActionsBar";
import {
  formatNumeroCertificadoSegurancaEletrica,
  type SegurancaEletricaExecucao,
} from "@/services/segurancaEletricaService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfSegurancaEletrica } from "@/utils/gerarPdfSegurancaEletrica";
import { formatDecimalSeguranca } from "@/utils/segurancaEletricaTemplate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao: SegurancaEletricaExecucao | null;
  onEditar?: (execucao: SegurancaEletricaExecucao) => void;
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const getEmpresaNome = (execucao: SegurancaEletricaExecucao) =>
  execucao.empresa?.nome || execucao.empresa?.nome_fantasia ||
  "Nao informado";

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="text-sm">
    <span className="font-medium text-muted-foreground">{label}: </span>
    <span>{value || "-"}</span>
  </div>
);

const groupResults = (execucao: SegurancaEletricaExecucao) =>
  (execucao.resultados || []).reduce<
    Record<string, NonNullable<SegurancaEletricaExecucao["resultados"]>>
  >((acc, item) => {
    if (!acc[item.grupo]) acc[item.grupo] = [];
    acc[item.grupo].push(item);
    return acc;
  }, {});

const resultadoLabel = (value?: string | null) => {
  if (value === "aprovado") return "APROVADO";
  if (value === "reprovado") return "REPROVADO";
  return "N/A";
};

const SegurancaEletricaDetalhesDialog = ({
  open,
  onOpenChange,
  execucao,
  onEditar,
}: Props) => {
  if (!execucao) return null;

  const grouped = groupResults(execucao);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-xl">
            Segurança Elétrica{" "}
            {formatNumeroCertificadoSegurancaEletrica(execucao.numero_certificado)}
          </DialogTitle>
        </DialogHeader>

        <ModalActionsBar>
          {onEditar && (
            <Button size="sm" onClick={() => onEditar(execucao)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => gerarPdfSegurancaEletrica(execucao)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
        </ModalActionsBar>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Cliente" value={getEmpresaNome(execucao)} />
              <Field label="Equipamento" value={getEquipamentoLabel(execucao.equipamento)} />
              <Field label="Classe" value={execucao.classe_equipamento} />
              <Field label="Parte aplicada" value={execucao.tipo_parte_aplicada} />
              <Field label="Data do teste" value={formatDate(execucao.data_teste)} />
              <Field label="Próxima certificação" value={formatDate(execucao.data_validade)} />
              <Field label="Padrão" value={execucao.padrao?.nome_padrao} />
              <Field label="Certificado padrão" value={execucao.padrao?.numero_certificado} />
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Resultado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Resultado geral</p>
                <p className="font-semibold">{resultadoLabel(execucao.resultado_geral)}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Temperatura</p>
                <p className="font-semibold">{execucao.temperatura_ambiente_texto || "-"}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">U.R.</p>
                <p className="font-semibold">{execucao.umidade_relativa_texto || "-"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Leituras</h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Característica</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Esperado</th>
                    <th className="px-3 py-2 text-left">Registrado</th>
                    <th className="px-3 py-2 text-left">Desvio</th>
                    <th className="px-3 py-2 text-left">Aprovação</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([grupo, itens]) => (
                    <Fragment key={grupo}>
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-3 py-2 text-center font-semibold">
                          {grupo}
                        </td>
                      </tr>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.caracteristica}</td>
                          <td className="px-3 py-2">{item.unidade}</td>
                          <td className="px-3 py-2">{item.valor_esperado_texto}</td>
                          <td className="px-3 py-2">
                            {item.valor_registrado_texto ||
                              (item.valor_registrado == null
                                ? "-"
                                : formatDecimalSeguranca(item.valor_registrado))}
                          </td>
                          <td className="px-3 py-2">{item.desvio_texto || "N/A"}</td>
                          <td className="px-3 py-2 font-semibold">
                            {resultadoLabel(item.resultado)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SegurancaEletricaDetalhesDialog;

import { FileText, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import ModalActionsBar from "@/components/ModalActionsBar";
import ContratoFormDialog from "@/components/ContratoFormDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ContratoDocumentosDialog from "@/components/ContratoDocumentosDialog";
import { useState } from "react";
import {
  ContratoSupabase,
  calcularProximoMesFaturamentoContrato,
  formatarMesContrato,
  getDiasContratoTexto,
  getEmpresaContratoNome,
  getStatusVencimentoContrato,
  getTermosAditivosRestantes,
  getTermosAditivosTexto,
  isFaturamentoPrevistoNoMes,
} from "@/services/contratosService";

interface ContratoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoSupabase | null;
  onEditar?: (contrato: ContratoSupabase) => void;
  onDocumentos?: (contrato: ContratoSupabase) => void;
  onOpenEmpresa?: (contrato: ContratoSupabase) => void;
  onDesativar?: (contrato: ContratoSupabase) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value || 0));

const statusLabel: Record<string, string> = {
  vencido: "Vencido",
  critico: "Critico",
  atencao: "Atencao",
  ok: "Ok",
  sem_data: "Sem data",
};

const statusClass: Record<string, string> = {
  vencido: "bg-red-50 text-red-700 border-red-200",
  critico: "bg-orange-50 text-orange-700 border-orange-200",
  atencao: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ok: "bg-green-50 text-green-700 border-green-200",
  sem_data: "bg-muted text-muted-foreground",
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="text-sm">
    <span className="font-medium text-muted-foreground">{label}: </span>
    <span className="text-foreground">{children}</span>
  </div>
);

const ContratoDetalhesDialog = ({
  open,
  onOpenChange,
  contrato,
  onEditar,
  onDocumentos,
  onOpenEmpresa,
  onDesativar,
}: ContratoDetalhesDialogProps) => {
  const [documentosOpen, setDocumentosOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);

  if (!contrato) return null;

  const status = getStatusVencimentoContrato(contrato.data_proxima_renovacao);
  const termosRestantes = getTermosAditivosRestantes(contrato);
  const proximoMesFaturamento =
    calcularProximoMesFaturamentoContrato(contrato);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Contrato {contrato.numero_identificacao || ""}
            </DialogTitle>
          </DialogHeader>

          <ModalActionsBar>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (onEditar ? onEditar(contrato) : setEditarOpen(true))}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onDocumentos ? onDocumentos(contrato) : setDocumentosOpen(true)
              }
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </Button>
            {onDesativar && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDesativar(contrato)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Desativar
              </Button>
            )}
          </ModalActionsBar>

          <div className="space-y-4">
            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Identificacao</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Tipo">{contrato.tipo}</Field>
                <Field label="Empresa">
                  {onOpenEmpresa && contrato.empresa?.id ? (
                    <button
                      type="button"
                      className="text-left text-primary hover:underline"
                      onClick={() => onOpenEmpresa(contrato)}
                    >
                      {getEmpresaContratoNome(contrato)}
                    </button>
                  ) : (
                    getEmpresaContratoNome(contrato)
                  )}
                </Field>
                <Field label="Numero / ID">
                  {contrato.numero_identificacao || "-"}
                </Field>
                <Field label="Vendedor">{contrato.vendedor || "-"}</Field>
                <Field label="Visita">
                  {contrato.periodicidade_visita || "-"}
                </Field>
                <Field label="Contrato/T.A. na pasta">
                  {contrato.contrato_ou_ta_na_pasta ? "Sim" : "Nao"}
                </Field>
              </div>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Vencimento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Ultima renovacao">
                  {formatDate(contrato.data_ultima_renovacao)}
                </Field>
                <Field label="Proxima renovacao">
                  {formatDate(contrato.data_proxima_renovacao)}
                </Field>
                <Field label="Dias">
                  {getDiasContratoTexto(contrato.data_proxima_renovacao)}
                </Field>
                <Field label="Status">
                  <Badge
                    variant="outline"
                    className={statusClass[status] || statusClass.sem_data}
                  >
                    {statusLabel[status]}
                  </Badge>
                </Field>
              </div>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Termos aditivos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Termo atual">
                  {getTermosAditivosTexto(contrato)}
                </Field>
                <Field label="Restantes">
                  {termosRestantes === null ? "-" : termosRestantes}
                </Field>
              </div>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Faturamento previsto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Valor previsto">
                  {formatCurrency(contrato.valor_previsto)}
                </Field>
                <Field label="Mes da ultima visita">
                  {formatarMesContrato(contrato.mes_ultima_visita)}
                </Field>
                <Field label="Proximo faturamento">
                  {proximoMesFaturamento
                    ? formatarMesContrato(`${proximoMesFaturamento}-01`)
                    : "-"}
                </Field>
                <Field label="Situacao">
                  {isFaturamentoPrevistoNoMes(contrato)
                    ? "Previsto para este mes"
                    : "Sem previsao no mes atual"}
                </Field>
              </div>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Objeto</h3>
              <p className="text-sm whitespace-pre-wrap">
                {contrato.objeto || "-"}
              </p>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Documentos</h3>
              <p className="text-sm text-muted-foreground">
                {(contrato.documentos || []).length} documento(s) anexado(s).
              </p>
            </section>

            {contrato.observacoes && (
              <section className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Observacoes</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {contrato.observacoes}
                </p>
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

      <ContratoDocumentosDialog
        open={documentosOpen}
        onOpenChange={setDocumentosOpen}
        contrato={contrato}
      />
      <ContratoFormDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        mode="edit"
        contrato={contrato}
      />
    </>
  );
};

export default ContratoDetalhesDialog;

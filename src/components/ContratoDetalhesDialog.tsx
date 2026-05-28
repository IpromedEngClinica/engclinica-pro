import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  getDiasContratoTexto,
  getEmpresaContratoNome,
  getStatusVencimentoContrato,
  getTermosAditivosRestantes,
  getTermosAditivosTexto,
} from "@/services/contratosService";

interface ContratoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoSupabase | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

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
}: ContratoDetalhesDialogProps) => {
  const [documentosOpen, setDocumentosOpen] = useState(false);

  if (!contrato) return null;

  const status = getStatusVencimentoContrato(contrato.data_proxima_renovacao);
  const termosRestantes = getTermosAditivosRestantes(contrato);

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

          <div className="space-y-4">
            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Identificacao</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Tipo">{contrato.tipo}</Field>
                <Field label="Empresa">{getEmpresaContratoNome(contrato)}</Field>
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
              <h3 className="text-sm font-semibold">Objeto</h3>
              <p className="text-sm whitespace-pre-wrap">
                {contrato.objeto || "-"}
              </p>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Documentos</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentosOpen(true)}
                >
                  Gerenciar documentos
                </Button>
              </div>
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
    </>
  );
};

export default ContratoDetalhesDialog;

import { FileText, FileWarning } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import ModalActionsBar from "@/components/ModalActionsBar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LaudoObsolescenciaSupabase } from "@/services/laudosObsolescenciaService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfLaudoObsolescencia } from "@/utils/gerarPdfLaudoObsolescencia";

interface LaudoObsolescenciaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laudo: LaudoObsolescenciaSupabase | null;
  onOpenEmpresa?: (empresa: LaudoObsolescenciaSupabase["empresa"]) => void;
  onOpenEquipamento?: (equipamento: LaudoObsolescenciaSupabase["equipamento"]) => void;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getEmpresaNome = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.empresa?.nome_fantasia || laudo.empresa?.nome || "Nao informado";

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

const TextBlock = ({ value }: { value?: string | null }) => (
  <p className="text-sm whitespace-pre-wrap text-foreground">{value || "-"}</p>
);

const LaudoObsolescenciaDetalhesDialog = ({
  open,
  onOpenChange,
  laudo,
  onOpenEmpresa,
  onOpenEquipamento,
}: LaudoObsolescenciaDetalhesDialogProps) => {
  if (!laudo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-primary" />
            Laudo de Obsolescencia {laudo.numero}
          </DialogTitle>
        </DialogHeader>

        <ModalActionsBar>
          {laudo.empresa && onOpenEmpresa && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenEmpresa(laudo.empresa)}
            >
              Abrir empresa
            </Button>
          )}
          {laudo.equipamento && onOpenEquipamento && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenEquipamento(laudo.equipamento)}
            >
              Abrir equipamento
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await gerarPdfLaudoObsolescencia(laudo);
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </ModalActionsBar>

        <div className="space-y-4">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificacao</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Numero">{laudo.numero}</Field>
              <Field label="Data">{formatDate(laudo.data_criacao)}</Field>
              <Field label="Responsavel">
                {laudo.responsavel_nome || "-"}
              </Field>
              <Field label="Registro">
                {laudo.responsavel_registro || "-"}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Empresa e equipamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Empresa">
                {laudo.empresa && onOpenEmpresa ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEmpresa(laudo.empresa)}
                  >
                    {getEmpresaNome(laudo)}
                  </button>
                ) : (
                  getEmpresaNome(laudo)
                )}
              </Field>
              <Field label="Equipamento">
                {laudo.equipamento && onOpenEquipamento ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEquipamento(laudo.equipamento)}
                  >
                    {getEquipamentoLabel(laudo.equipamento)}
                  </button>
                ) : (
                  getEquipamentoLabel(laudo.equipamento)
                )}
              </Field>
              <Field label="Status do equipamento">
                {laudo.equipamento?.ativo === false
                  ? "Desativado"
                  : laudo.equipamento?.status || "-"}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Motivo</h3>
            <TextBlock value={laudo.motivo_texto} />
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Observacoes</h3>
            <TextBlock value={laudo.observacoes} />
          </section>
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

export default LaudoObsolescenciaDetalhesDialog;

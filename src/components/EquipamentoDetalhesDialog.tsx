import { Cpu } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EquipamentoHistoricoSection from "@/components/EquipamentoHistoricoSection";
import type { EquipamentoSupabase } from "@/services/equipamentosService";

interface EquipamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: EquipamentoSupabase | null;
}

const getTipoEquipamento = (equipamento: EquipamentoSupabase) =>
  equipamento.tipo_equipamento?.nome ||
  equipamento.tipo_texto ||
  "Equipamento";

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome_fantasia ||
  equipamento.empresa?.nome ||
  "Não informado";

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: string | boolean | null;
}) => {
  const display =
    typeof value === "boolean" ? (value ? "Sim" : "Não") : value || "-";

  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className="text-foreground">{display}</span>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg border p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {children}
    </div>
  </section>
);

const EquipamentoDetalhesDialog = ({
  open,
  onOpenChange,
  equipamento,
}: EquipamentoDetalhesDialogProps) => {
  if (!equipamento) return null;

  const tipo = getTipoEquipamento(equipamento);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            {tipo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="Dados do Equipamento">
            <Field label="Tipo" value={tipo} />
            <Field label="Estado" value={equipamento.status} />
            <Field label="Proprietário" value={getEmpresaNome(equipamento)} />
            <Field label="Fabricante" value={equipamento.fabricante} />
            <Field label="Modelo" value={equipamento.modelo} />
            <Field label="TAG" value={equipamento.tag} />
            <Field label="Número de Série" value={equipamento.numero_serie} />
            <Field label="Patrimonio" value={equipamento.patrimonio} />
            <Field label="Setor" value={equipamento.setor} />
          </Section>

          <Section title="Preventiva e Calibração">
            <Field
              label="Data de Aquisição"
              value={formatDate(equipamento.data_aquisicao)}
            />
            <Field
              label="Data de Instalação"
              value={formatDate(equipamento.data_instalacao)}
            />
            <Field
              label="Última Preventiva"
              value={formatDate(equipamento.data_ultima_preventiva)}
            />
            <Field
              label="Próxima Preventiva"
              value={formatDate(equipamento.data_proxima_preventiva)}
            />
            <Field
              label="Última Calibração"
              value={formatDate(equipamento.data_ultima_calibracao)}
            />
            <Field
              label="Próxima Calibração"
              value={formatDate(equipamento.data_proxima_calibracao)}
            />
          </Section>

          {equipamento.observacoes && (
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Observações
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {equipamento.observacoes}
              </p>
            </section>
          )}

          <EquipamentoHistoricoSection equipamentoId={equipamento.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipamentoDetalhesDialog;

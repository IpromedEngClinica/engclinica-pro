import { ClipboardList, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";

interface OrdemServicoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: OrdemServicoSupabase | null;
  onEdit?: (os: OrdemServicoSupabase) => void;
}

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome_fantasia || os.empresa?.nome || "Não informado";

const getEquipamentoTipo = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome ||
  os.equipamento?.tipo_texto ||
  "Equipamento não informado";

const getTipoServico = (os: OrdemServicoSupabase) =>
  os.tipo_os?.nome || "Não informado";

const getEstado = (os: OrdemServicoSupabase) =>
  os.estado_os?.nome || os.status_sistema || "Não informado";

const getTecnico = (os: OrdemServicoSupabase) => os.responsavel_texto || "—";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const statusColor = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("fechada") || normalized.includes("fechado")) {
    return "bg-success/10 text-success";
  }

  if (normalized.includes("cancelada") || normalized.includes("cancelado")) {
    return "bg-destructive/10 text-destructive";
  }

  if (
    normalized.includes("aguardando") ||
    normalized.includes("orçamento") ||
    normalized.includes("peca") ||
    normalized.includes("peça")
  ) {
    return "bg-warning/10 text-warning";
  }

  return "bg-primary/10 text-primary";
};

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg border p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

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
  <p className="text-sm whitespace-pre-wrap text-foreground">{value || "—"}</p>
);

const OrdemServicoDetalhesDialog = ({
  open,
  onOpenChange,
  os,
  onEdit,
}: OrdemServicoDetalhesDialogProps) => {
  if (!os) return null;

  const estado = getEstado(os);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pr-8">
            <div className="space-y-2">
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Ordem de Serviço {os.numero}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                    estado
                  )}`}
                >
                  {estado}
                </span>
                <span>Status: {os.status_sistema || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Field label="Abertura">{formatDate(os.data_abertura)}</Field>
              <Field label="Fechamento">{formatDate(os.data_fechamento)}</Field>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <InfoCard title="Solicitante">
              <Field label="Empresa">{getEmpresaNome(os)}</Field>
              <Field label="Razão social">{os.empresa?.nome || "—"}</Field>
              <Field label="Solicitante informado">
                {os.solicitante_texto || "—"}
              </Field>
            </InfoCard>

            <InfoCard title="Equipamento">
              <Field label="Tipo">{getEquipamentoTipo(os)}</Field>
              <Field label="Fabricante">{os.equipamento?.fabricante || "—"}</Field>
              <Field label="Modelo">{os.equipamento?.modelo || "—"}</Field>
              <Field label="Número de série">
                {os.equipamento?.numero_serie || "—"}
              </Field>
              <Field label="Patrimônio">{os.equipamento?.patrimonio || "—"}</Field>
              <Field label="TAG">{os.equipamento?.tag || "—"}</Field>
              <Field label="Setor">{os.equipamento?.setor || "—"}</Field>
            </InfoCard>
          </div>

          <InfoCard title="Serviço">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <Field label="Tipo de OS">{getTipoServico(os)}</Field>
              <Field label="Responsável técnico">{getTecnico(os)}</Field>
              <Field label="Estado">{estado}</Field>
              <Field label="Status interno">{os.status_sistema || "—"}</Field>
            </div>

            <div className="pt-2 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Origem do problema
                </h4>
                <TextBlock value={os.origem_problema} />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Descrição do serviço
                </h4>
                <TextBlock value={os.descricao_servico} />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Observações
                </h4>
                <TextBlock value={os.observacoes} />
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Acessórios">
            {os.acessorios && os.acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {os.acessorios.map((acessorio) => (
                  <li
                    key={acessorio.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {acessorio.descricao}
                      </p>
                      {acessorio.observacoes && (
                        <p className="text-muted-foreground">
                          {acessorio.observacoes}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      Qtd. {acessorio.quantidade}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum acessório informado.
              </p>
            )}
          </InfoCard>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(os)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar OS
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrdemServicoDetalhesDialog;

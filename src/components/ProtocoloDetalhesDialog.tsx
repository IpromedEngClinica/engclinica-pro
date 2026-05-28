import { FileText, PackageCheck, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProtocoloOSSupabase } from "@/services/protocolosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfProtocolo } from "@/utils/gerarPdfProtocolo";

interface ProtocoloDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: ProtocoloOSSupabase | null;
  onOpenEmpresa?: (empresa: ProtocoloOSSupabase["empresa"]) => void;
  onOpenEquipamento?: (equipamento: ProtocoloOSSupabase["equipamento"]) => void;
}

const getEmpresaNome = (p: ProtocoloOSSupabase) =>
  p.empresa?.nome_fantasia || p.empresa?.nome || "Não informado";

const formatTipo = (tipo: string) => {
  const map: Record<string, string> = {
    recolhimento: "Recolhimento",
    entrega: "Entrega",
  };

  return map[tipo] || tipo;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getDataPrincipal = (p: ProtocoloOSSupabase) => {
  if (p.tipo === "recolhimento") return p.data_recolhimento || p.data_protocolo;
  if (p.tipo === "entrega") return p.data_entrega || p.data_protocolo;
  return p.data_protocolo;
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

const TextBlock = ({ value }: { value?: string | null }) => (
  <p className="text-sm whitespace-pre-wrap text-foreground">{value || "-"}</p>
);

const ProtocoloDetalhesDialog = ({
  open,
  onOpenChange,
  protocolo,
  onOpenEmpresa,
  onOpenEquipamento,
}: ProtocoloDetalhesDialogProps) => {
  if (!protocolo) return null;

  const Icon = protocolo.tipo === "entrega" ? PackageCheck : PackageSearch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            Protocolo de {formatTipo(protocolo.tipo)} {protocolo.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Número">{protocolo.numero}</Field>
              <Field label="Tipo">{formatTipo(protocolo.tipo)}</Field>
              <Field label="Status">{protocolo.status || "-"}</Field>
              <Field label="Data do protocolo">
                {formatDate(protocolo.data_protocolo)}
              </Field>
              <Field label="Data principal">
                {formatDate(getDataPrincipal(protocolo))}
              </Field>
              <Field label="OS vinculada">
                {protocolo.ordem_servico?.numero || "-"}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Empresa e equipamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Empresa">
                {protocolo.empresa && onOpenEmpresa ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEmpresa(protocolo.empresa)}
                  >
                    {getEmpresaNome(protocolo)}
                  </button>
                ) : (
                  getEmpresaNome(protocolo)
                )}
              </Field>
              <Field label="Equipamento">
                {protocolo.equipamento && onOpenEquipamento ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEquipamento(protocolo.equipamento)}
                  >
                    {getEquipamentoLabel(protocolo.equipamento)}
                  </button>
                ) : (
                  getEquipamentoLabel(protocolo.equipamento)
                )}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Responsável</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome">{protocolo.responsavel_nome || "-"}</Field>
              <Field label="Documento">
                {protocolo.responsavel_documento || "-"}
              </Field>
              <Field label="Contato">
                {protocolo.responsavel_contato || "-"}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Descrição</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Problema relatado
                </p>
                <TextBlock value={protocolo.problema_relatado} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Observações
                </p>
                <TextBlock value={protocolo.observacoes} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Acessórios</h3>
            {protocolo.acessorios && protocolo.acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {protocolo.acessorios.map((acessorio) => (
                  <li
                    key={acessorio.id}
                    className="grid grid-cols-1 gap-2 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto]"
                  >
                    <div>
                      <p className="font-medium">{acessorio.descricao}</p>
                      {acessorio.observacoes && (
                        <p className="text-muted-foreground">
                          {acessorio.observacoes}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      Qtd. {acessorio.quantidade}
                    </span>
                    <span className="text-muted-foreground">
                      {acessorio.conferido ? "Conferido" : "Não conferido"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum acessório registrado.
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              await gerarPdfProtocolo(protocolo);
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocoloDetalhesDialog;

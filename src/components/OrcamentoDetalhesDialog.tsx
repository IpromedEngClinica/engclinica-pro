import { FileSignature, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrcamentoSupabase } from "@/services/orcamentosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfOrcamento } from "@/utils/gerarPdfOrcamento";

interface OrcamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoSupabase | null;
  onOpenEmpresa?: (empresa: OrcamentoSupabase["empresa"]) => void;
  onOpenEquipamento?: (equipamento: OrcamentoSupabase["equipamento"]) => void;
}

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

const labelMap: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
  servico: "Servico",
  pecas: "Pecas",
  pecas_servicos: "Pecas + Servicos",
  os: "OS",
  avulso: "Avulso",
  dinheiro: "Dinheiro",
  cartao: "Cartao",
  boleto: "Boleto",
  pix: "Pix",
  avista: "A vista",
  parcelado: "Parcelado",
  entrada_parcela: "Entrada + Parcela",
  cif: "CIF",
  fob: "FOB",
};

const label = (value?: string | null) => (value ? labelMap[value] || value : "-");

const getEmpresaNome = (orcamento: OrcamentoSupabase) =>
  orcamento.empresa?.nome_fantasia ||
  orcamento.empresa?.nome ||
  "Nao informado";

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

const OrcamentoDetalhesDialog = ({
  open,
  onOpenChange,
  orcamento,
  onOpenEmpresa,
  onOpenEquipamento,
}: OrcamentoDetalhesDialogProps) => {
  if (!orcamento) return null;

  const itens = [...(orcamento.itens || [])].sort((a, b) => a.ordem - b.ordem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            Orcamento {orcamento.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificacao</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Numero">{orcamento.numero}</Field>
              <Field label="Status">{label(orcamento.status)}</Field>
              <Field label="Tipo">{label(orcamento.tipo_orcamento)}</Field>
              <Field label="Origem">{label(orcamento.origem)}</Field>
              <Field label="Empresa">
                {orcamento.empresa && onOpenEmpresa ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEmpresa(orcamento.empresa)}
                  >
                    {getEmpresaNome(orcamento)}
                  </button>
                ) : (
                  getEmpresaNome(orcamento)
                )}
              </Field>
              <Field label="Equipamento">
                {orcamento.equipamento && onOpenEquipamento ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() => onOpenEquipamento(orcamento.equipamento)}
                  >
                    {getEquipamentoLabel(orcamento.equipamento)}
                  </button>
                ) : (
                  getEquipamentoLabel(orcamento.equipamento)
                )}
              </Field>
              <Field label="OS vinculada">
                {orcamento.ordem_servico?.numero || "-"}
              </Field>
              <Field label="Identificador">
                {orcamento.identificador || "-"}
              </Field>
              <Field label="Data">{formatDate(orcamento.data_orcamento)}</Field>
              <Field label="Validade">
                {formatDate(orcamento.data_validade)}
              </Field>
              <Field label="Responsavel">
                {orcamento.responsavel_orcamentista || "-"}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Financeiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total Pecas</p>
                <p className="font-semibold">
                  {formatCurrency(orcamento.valor_pecas)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total Servicos</p>
                <p className="font-semibold">
                  {formatCurrency(orcamento.valor_servicos)}
                </p>
              </div>
              <div className="rounded-md bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(orcamento.valor_total)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Forma">{label(orcamento.forma_pagamento)}</Field>
              <Field label="Modo">{label(orcamento.modo_pagamento)}</Field>
              <Field label="Parcelas">
                {orcamento.numero_parcelas || "-"}
              </Field>
              <Field label="Entrada">
                {formatCurrency(orcamento.valor_entrada)}
              </Field>
              <Field label="Valor parcela">
                {formatCurrency(orcamento.valor_parcela)}
              </Field>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Entrega e validade</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Prazo">{orcamento.prazo_entrega || "-"}</Field>
              <Field label="Frete">{label(orcamento.frete)}</Field>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Detalhes do Orcamento
              </p>
              <TextBlock value={orcamento.detalhes_orcamento} />
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Itens</h3>
              <span className="text-sm font-semibold">
                Total: {formatCurrency(orcamento.valor_total)}
              </span>
            </div>

            {itens.length > 0 ? (
              <div className="space-y-3">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border p-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.tipo === "peca"
                          ? item.peca_nome || item.descricao
                          : item.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.tipo === "peca"
                          ? "Peca"
                          : [
                              item.tipo_servico?.nome,
                              item.tipo_equipamento?.nome,
                            ]
                              .filter(Boolean)
                              .join(" - ") || "Servico"}
                      </p>
                      {item.garantia && (
                        <p className="text-xs text-muted-foreground">
                          Garantia: {item.garantia}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Qtd. {Number(item.quantidade).toLocaleString("pt-BR")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.valor_unitario)}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(item.valor_total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum item registrado.
              </p>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={async () => {
              if (orcamento) await gerarPdfOrcamento(orcamento);
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrcamentoDetalhesDialog;

import { BadgePercent, FileSignature, FileText, Pencil } from "lucide-react";
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
import {
  OrcamentoStatus,
  OrcamentoSupabase,
  orcamentosService,
} from "@/services/orcamentosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { formatDescricaoPecaOrcamento } from "@/utils/orcamentoItens";
import { gerarPdfOrcamento } from "@/utils/gerarPdfOrcamento";

interface OrcamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoSupabase | null;
  onOpenEmpresa?: (empresa: OrcamentoSupabase["empresa"]) => void;
  onOpenEquipamento?: (equipamento: OrcamentoSupabase["equipamento"]) => void;
  onOpenOrdemServico?: (ordemServicoId: string) => void;
  onEditar?: (orcamento: OrcamentoSupabase) => void;
  onAplicarDesconto?: (orcamento: OrcamentoSupabase) => void;
  onAlterarStatus?: (
    orcamento: OrcamentoSupabase,
    status: OrcamentoStatus
  ) => void;
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
  orcamento.empresa?.nome || orcamento.empresa?.nome_fantasia ||
  "Nao informado";

const getItemTipoLabel = (item: NonNullable<OrcamentoSupabase["itens"]>[number]) => {
  if (item.tipo === "peca") {
    const nome = (item.peca_nome || item.descricao || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return nome === "frete" ? "Frete" : "Peca";
  }

  if (item.tipo === "deslocamento") return "Deslocamento";
  if (item.tipo === "outro") return item.descricao || "Outro";

  return [
    item.tipo_servico?.nome,
    item.tipo_equipamento?.nome,
  ]
    .filter(Boolean)
    .join(" - ") || "Servico";
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

const OrcamentoDetalhesDialog = ({
  open,
  onOpenChange,
  orcamento,
  onOpenEmpresa,
  onOpenEquipamento,
  onOpenOrdemServico,
  onEditar,
  onAplicarDesconto,
  onAlterarStatus,
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

        <ModalActionsBar className="mt-0 px-6 py-3">
          {onEditar && (
            <>
              <Button size="sm" onClick={() => onEditar(orcamento)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </>
          )}
          {onAplicarDesconto && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAplicarDesconto(orcamento)}
            >
              <BadgePercent className="w-4 h-4 mr-2" />
              Aplicar desconto
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (orcamento) {
                const orcamentoCompleto = await orcamentosService.buscarPorId(
                  orcamento.id
                );
                await gerarPdfOrcamento(orcamentoCompleto);
              }
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
          {onAlterarStatus && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={orcamento.status === "aprovado"}
                onClick={() => onAlterarStatus(orcamento, "aprovado")}
              >
                Aprovar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={orcamento.status === "reprovado"}
                onClick={() => onAlterarStatus(orcamento, "reprovado")}
              >
                Reprovar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={orcamento.status === "faturado"}
                onClick={() => onAlterarStatus(orcamento, "faturado")}
              >
                Faturar
              </Button>
            </>
          )}
        </ModalActionsBar>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identificacao</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Numero">{orcamento.numero}</Field>
              <Field label="Status">{label(orcamento.status)}</Field>
              <Field label="Tipo">{label(orcamento.tipo_orcamento)}</Field>
              <Field label="Origem">
                {orcamento.arkmeds_ordem_servico_numero
                  ? `OS ${orcamento.arkmeds_ordem_servico_numero}`
                  : label(orcamento.origem)}
              </Field>
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
              <Field label="OS do sistema">
                {orcamento.ordem_servico?.numero && onOpenOrdemServico ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => onOpenOrdemServico(orcamento.ordem_servico!.id)}
                  >
                    OS {orcamento.ordem_servico.numero}
                  </button>
                ) : orcamento.ordem_servico?.numero ? (
                  `OS ${orcamento.ordem_servico.numero}`
                ) : (
                  "-"
                )}
              </Field>
              <Field label="Identificador">
                {orcamento.identificador || "-"}
              </Field>
              <Field label="Data">{formatDate(orcamento.data_orcamento)}</Field>
              <Field label="Validade">
                {formatDate(orcamento.data_validade)}
              </Field>
              {orcamento.data_aprovacao && (
                <Field label="Aprovacao">
                  {formatDate(orcamento.data_aprovacao)}
                </Field>
              )}
              {orcamento.data_reprovacao && (
                <Field label="Reprovacao">
                  {formatDate(orcamento.data_reprovacao)}
                </Field>
              )}
              {orcamento.data_faturamento && (
                <Field label="Faturamento">
                  {formatDate(orcamento.data_faturamento)}
                </Field>
              )}
              {orcamento.data_cancelamento && (
                <Field label="Cancelamento">
                  {formatDate(orcamento.data_cancelamento)}
                </Field>
              )}
              <Field label="Responsavel">
                {orcamento.responsavel_orcamentista || "-"}
              </Field>
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
                {itens.map((item) => {
                  const itemTitulo =
                    item.tipo === "peca"
                      ? formatDescricaoPecaOrcamento(item)
                      : getItemTipoLabel(item);

                  return (
                    <div
                      key={item.id}
                      className="rounded-md border p-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3"
                    >
                      <div>
                        <p className="font-medium">{itemTitulo}</p>
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
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum item registrado.
              </p>
            )}
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Financeiro</h3>
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
                orcamento.desconto_aplicado > 0
                  ? "xl:grid-cols-4"
                  : "xl:grid-cols-3"
              }`}
            >
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
              {orcamento.desconto_aplicado > 0 && (
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Valor antes do desconto
                  </p>
                  <p className="font-semibold">
                    {formatCurrency(
                      Number(orcamento.valor_pecas || 0) +
                        Number(orcamento.valor_servicos || 0)
                    )}
                  </p>
                </div>
              )}
              <div className="rounded-md bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(orcamento.valor_total)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Desconto aplicado">
                {orcamento.desconto_aplicado > 0
                  ? `${orcamento.desconto_tipo === "percentual" ? `${orcamento.desconto_valor}%` : formatCurrency(orcamento.desconto_valor)} (${formatCurrency(orcamento.desconto_aplicado)})`
                  : "-"}
              </Field>
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
                Detalhes do Orçamento
              </p>
              <TextBlock value={orcamento.detalhes_orcamento} />
            </div>
          </section>

        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrcamentoDetalhesDialog;

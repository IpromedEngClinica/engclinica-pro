import { Copy, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import ModalActionsBar from "@/components/ModalActionsBar";
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
import type {
  CalibracaoProcedimento,
  CalibracaoProcedimentoTabela,
} from "@/services/calibracaoProcedimentosService";
import { formatarDataPadrao } from "@/utils/calibracaoValidade";
import { formatDecimalPtBr } from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento: CalibracaoProcedimento | null;
  onEditar: (procedimento: CalibracaoProcedimento) => void;
  onDuplicar: (procedimento: CalibracaoProcedimento) => void;
  onDesativar: (procedimento: CalibracaoProcedimento) => void;
}

const formatNumber = (value?: number | null) => formatDecimalPtBr(value) || "-";
const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="text-sm"><span className="font-medium text-muted-foreground">{label}: </span><span>{children}</span></div>;

const fatorLabel = (tabela: CalibracaoProcedimentoTabela) => {
  if (tabela.fator_confiabilidade_modo === "calcular_95") return "Calcular k para 95%";
  if (tabela.fator_confiabilidade_modo === "manual_execucao") return "Informar na execucao";
  return `k fixo: ${formatNumber(tabela.fator_k_fixo)}`;
};

const criterioLabel = (tabela: CalibracaoProcedimentoTabela) => {
  if (!tabela.incluir_criterio_aceitacao) return "Nao incluir";
  if (tabela.criterio_aceitacao_tipo === "faixa") {
    return `Faixa: ${formatNumber(tabela.criterio_aceitacao_valor_minimo)} a ${formatNumber(tabela.criterio_aceitacao_valor_maximo)}`;
  }
  return `${tabela.criterio_aceitacao_tipo || "-"}: ${formatNumber(tabela.criterio_aceitacao_valor_maximo)}`;
};

const CalibracaoProcedimentoDetalhesDialog = ({
  open,
  onOpenChange,
  procedimento,
  onEditar,
  onDuplicar,
  onDesativar,
}: Props) => {
  if (!procedimento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>{procedimento.nome}</DialogTitle></DialogHeader>
        <ModalActionsBar>
          <Button variant="outline" size="sm" onClick={() => onEditar(procedimento)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicar(procedimento)}><Copy className="mr-2 h-4 w-4" /> Duplicar</Button>
          {procedimento.ativo && <Button variant="destructive" size="sm" onClick={() => onDesativar(procedimento)}><Trash2 className="mr-2 h-4 w-4" /> Desativar</Button>}
        </ModalActionsBar>

        <section className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Procedimento">{procedimento.nome}</Field>
            <Field label="Tipo de equipamento">{procedimento.tipo_equipamento?.nome || "-"}</Field>
            <Field label="Versao interna">{procedimento.versao}</Field>
            <Field label="Status"><Badge variant="outline" className={procedimento.ativo ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>{procedimento.ativo ? "Ativo" : "Desativado"}</Badge></Field>
            <Field label="Norma utilizada">{procedimento.metodo_referencia || "-"}</Field>
          </div>
          {procedimento.observacoes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{procedimento.observacoes}</p>}
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Tabelas de calibracao</h3>
          {!procedimento.tabelas?.length ? <p className="text-sm text-muted-foreground">Nenhuma tabela cadastrada.</p> : (
            <Tabs defaultValue={procedimento.tabelas[0].id}>
              <div className="overflow-x-auto"><TabsList className="h-auto justify-start whitespace-nowrap">{procedimento.tabelas.map((tabela) => <TabsTrigger className="shrink-0" key={tabela.id} value={tabela.id}>{tabela.nome}</TabsTrigger>)}</TabsList></div>
              {procedimento.tabelas.map((tabela) => (
                <TabsContent key={tabela.id} value={tabela.id} className="space-y-4">
                  <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
                    <Field label="Padrao utilizado">{tabela.padrao?.nome_padrao || "-"}</Field>
                    <Field label="Certificado">{tabela.padrao?.numero_certificado || "-"}</Field>
                    <Field label="Laboratorio">{tabela.padrao?.laboratorio_calibrador || "-"}</Field>
                    <Field label="Validade">{formatarDataPadrao(tabela.padrao?.data_validade)}</Field>
                    <Field label="Tabela metrologica">{tabela.padrao_tabela?.nome || "-"}</Field>
                    <Field label="TAG / serie">{tabela.padrao?.tag || tabela.padrao?.numero_serie || "-"}</Field>
                  </div>
                  <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
                    <Field label="Grandeza">{tabela.grandeza}</Field>
                    <Field label="Unidade">{tabela.unidade}</Field>
                    <Field label="Leituras">{tabela.quantidade_leituras}</Field>
                    <Field label="Tipo de medida">{tabela.tipo_medida || "-"}</Field>
                    <Field label="Fator de confiabilidade">{fatorLabel(tabela)}</Field>
                    <Field label="Resolucao padrao">{formatNumber(tabela.resolucao_padrao_default)}</Field>
                    <Field label="Resolucao equipamento">{formatNumber(tabela.resolucao_equipamento_default)}</Field>
                    <Field label="Criterio">{criterioLabel(tabela)}</Field>
                    <Field label="Faixa de uso">{formatNumber(tabela.faixa_uso_min)} a {formatNumber(tabela.faixa_uso_max)}</Field>
                    <Field label="Capacidade">{formatNumber(tabela.capacidade_min)} a {formatNumber(tabela.capacidade_max)}</Field>
                    <Field label="Corrigir erro sistematico">{tabela.corrigir_erro_sistematico ? "Sim" : "Nao"}</Field>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/50"><th className="px-3 py-2 text-left font-medium">VN/VR</th></tr></thead>
                      <tbody>{(tabela.pontos || []).map((ponto) => <tr key={ponto.id} className="border-b last:border-0"><td className="px-3 py-2">{formatNumber(ponto.valor_nominal)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalibracaoProcedimentoDetalhesDialog;

import { Download, Minus, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CalibracaoProcedimentoCriterioTipo,
  CalibracaoProcedimentoFatorModo,
  CalibracaoProcedimentoModoPreenchimento,
  CalibracaoProcedimentoPadraoSelecionavel,
} from "@/services/calibracaoProcedimentosService";
import { formatarDataPadrao } from "@/utils/calibracaoValidade";

export type CalibracaoProcedimentoPontoDraft = {
  key: string;
  id?: string;
  valorNominal: string;
};

export type CalibracaoProcedimentoTabelaDraft = {
  key: string;
  id?: string;
  nome: string;
  grandeza: string;
  unidade: string;
  padraoId: string;
  padraoTabelaId: string;
  modoPreenchimento: CalibracaoProcedimentoModoPreenchimento;
  quantidadeLeituras: number;
  tipoMedida: string;
  resolucaoPadraoDefault: string;
  resolucaoEquipamentoDefault: string;
  faixaUsoMin: string;
  faixaUsoMax: string;
  capacidadeMin: string;
  capacidadeMax: string;
  fatorConfiabilidadeModo: CalibracaoProcedimentoFatorModo;
  fatorKFixo: string;
  incluirCriterioAceitacao: boolean;
  criterioAceitacaoTipo: CalibracaoProcedimentoCriterioTipo;
  criterioAceitacaoValorMaximo: string;
  criterioAceitacaoValorMinimo: string;
  corrigirErroSistematico: boolean;
  pontos: CalibracaoProcedimentoPontoDraft[];
};

interface Props {
  tabela: CalibracaoProcedimentoTabelaDraft;
  padroes: CalibracaoProcedimentoPadraoSelecionavel[];
  disabled?: boolean;
  onAtualizar: (
    key: string,
    patch: Partial<CalibracaoProcedimentoTabelaDraft>
  ) => void;
  onExcluir: (key: string) => void;
  onSelecionarPadrao: (tabelaKey: string, padraoId: string) => void;
  onSelecionarTabelaPadrao: (tabelaKey: string, padraoTabelaId: string) => void;
  onImportarPontos: (tabelaKey: string) => void;
  onAdicionarPonto: (tabelaKey: string) => void;
  onRemoverPonto: (tabelaKey: string, pontoKey?: string) => void;
  onAtualizarPonto: (
    tabelaKey: string,
    pontoKey: string,
    patch: Partial<CalibracaoProcedimentoPontoDraft>
  ) => void;
}

const CalibracaoProcedimentoTabelaEditor = ({
  tabela,
  padroes,
  disabled = false,
  onAtualizar,
  onExcluir,
  onSelecionarPadrao,
  onSelecionarTabelaPadrao,
  onImportarPontos,
  onAdicionarPonto,
  onRemoverPonto,
  onAtualizarPonto,
}: Props) => {
  const padrao = padroes.find((item) => item.id === tabela.padraoId);
  const tabelaPadrao = padrao?.tabelas?.find(
    (item) => item.id === tabela.padraoTabelaId
  );

  const removerUltimaLinha = () => {
    if (tabela.pontos.length <= 1) return;
    if (window.confirm("Remover a ultima linha desta tabela?")) {
      onRemoverPonto(tabela.key);
    }
  };

  return (
    <div className="space-y-4 rounded-b-lg border border-t-0 bg-muted/10 p-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={() => onExcluir(tabela.key)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir tabela
        </Button>
      </div>

      <Section title="3.1 Identificacao da tabela">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField
            className="md:col-span-2"
            label="Titulo *"
            value={tabela.nome}
            disabled={disabled}
            onChange={(nome) => onAtualizar(tabela.key, { nome })}
          />
          <TextField
            label="Grandeza *"
            value={tabela.grandeza}
            disabled={disabled}
            onChange={(grandeza) => onAtualizar(tabela.key, { grandeza })}
          />
          <TextField
            label="Unidade *"
            value={tabela.unidade}
            disabled={disabled}
            onChange={(unidade) => onAtualizar(tabela.key, { unidade })}
          />
          <TextField
            className="md:col-span-2"
            label="Tipo de medida"
            value={tabela.tipoMedida}
            disabled={disabled}
            onChange={(tipoMedida) => onAtualizar(tabela.key, { tipoMedida })}
          />
          <div className="space-y-2">
            <Label>Quantidade de leituras *</Label>
            <Input
              type="number"
              min={1}
              value={tabela.quantidadeLeituras}
              disabled={disabled}
              onChange={(event) =>
                onAtualizar(tabela.key, {
                  quantidadeLeituras: Math.max(
                    1,
                    Number.parseInt(event.target.value, 10) || 1
                  ),
                })
              }
            />
          </div>
        </div>
      </Section>

      <Section title="3.2 Padrao utilizado">
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label="Padrao valido *"
            placeholder="Selecione o padrao"
            value={tabela.padraoId}
            disabled={disabled}
            onChange={(value) => onSelecionarPadrao(tabela.key, value)}
            options={padroes.map((item) => [
              item.id,
              `${item.nome_padrao} - Cert. ${item.numero_certificado}`,
            ])}
          />
          <SelectField
            label="Tabela metrologica *"
            placeholder="Selecione a tabela"
            value={tabela.padraoTabelaId}
            disabled={disabled || !padrao}
            onChange={(value) =>
              onSelecionarTabelaPadrao(tabela.key, value)
            }
            options={(padrao?.tabelas || []).map((item) => [
              item.id,
              `${item.nome} - ${item.grandeza} (${item.unidade})`,
            ])}
          />
        </div>
        {padrao && (
          <p className="mt-3 text-xs text-muted-foreground">
            Certificado {padrao.numero_certificado} | Laboratorio{" "}
            {padrao.laboratorio_calibrador} | Validade{" "}
            {formatarDataPadrao(padrao.data_validade)}
          </p>
        )}
      </Section>

      <Section title="3.3 Parametros tecnicos">
        <div className="grid gap-3 md:grid-cols-3">
          <DecimalField
            label="Resolucao do padrao"
            value={tabela.resolucaoPadraoDefault}
            disabled={disabled}
            onChange={(resolucaoPadraoDefault) =>
              onAtualizar(tabela.key, { resolucaoPadraoDefault })
            }
          />
          <DecimalField
            label="Resolucao do equipamento"
            value={tabela.resolucaoEquipamentoDefault}
            disabled={disabled}
            onChange={(resolucaoEquipamentoDefault) =>
              onAtualizar(tabela.key, { resolucaoEquipamentoDefault })
            }
          />
          <SelectField
            label="Fator de confiabilidade"
            value={tabela.fatorConfiabilidadeModo}
            disabled={disabled}
            onChange={(value) =>
              onAtualizar(tabela.key, {
                fatorConfiabilidadeModo:
                  value as CalibracaoProcedimentoFatorModo,
              })
            }
            options={[
              ["calcular_95", "Calcular k para 95%"],
              ["k_fixo", "Usar k fixo"],
              ["manual_execucao", "Informar na execucao"],
            ]}
          />
          {tabela.fatorConfiabilidadeModo === "k_fixo" && (
            <DecimalField
              label="Valor de k *"
              value={tabela.fatorKFixo}
              disabled={disabled}
              onChange={(fatorKFixo) =>
                onAtualizar(tabela.key, { fatorKFixo })
              }
            />
          )}
          <DecimalField
            label="Faixa de uso minima"
            value={tabela.faixaUsoMin}
            disabled={disabled}
            onChange={(faixaUsoMin) => onAtualizar(tabela.key, { faixaUsoMin })}
          />
          <DecimalField
            label="Faixa de uso maxima"
            value={tabela.faixaUsoMax}
            disabled={disabled}
            onChange={(faixaUsoMax) => onAtualizar(tabela.key, { faixaUsoMax })}
          />
          <DecimalField
            label="Capacidade minima"
            value={tabela.capacidadeMin}
            disabled={disabled}
            onChange={(capacidadeMin) =>
              onAtualizar(tabela.key, { capacidadeMin })
            }
          />
          <DecimalField
            label="Capacidade maxima"
            value={tabela.capacidadeMax}
            disabled={disabled}
            onChange={(capacidadeMax) =>
              onAtualizar(tabela.key, { capacidadeMax })
            }
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox
            checked={tabela.corrigirErroSistematico}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onAtualizar(tabela.key, {
                corrigirErroSistematico: Boolean(checked),
              })
            }
          />
          Corrigir erro sistematico
        </label>
      </Section>

      <Section title="3.4 Criterio de aceitacao">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={tabela.incluirCriterioAceitacao}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onAtualizar(tabela.key, {
                incluirCriterioAceitacao: Boolean(checked),
              })
            }
          />
          Incluir criterio de aceitacao
        </label>
        {tabela.incluirCriterioAceitacao && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <SelectField
              label="Tipo de criterio"
              value={tabela.criterioAceitacaoTipo}
              disabled={disabled}
              onChange={(value) =>
                onAtualizar(tabela.key, {
                  criterioAceitacaoTipo:
                    value as CalibracaoProcedimentoCriterioTipo,
                })
              }
              options={[
                ["absoluto", "Absoluto"],
                ["percentual", "Percentual"],
                ["faixa", "Faixa"],
              ]}
            />
            {tabela.criterioAceitacaoTipo === "faixa" && (
              <DecimalField
                label="Valor minimo *"
                value={tabela.criterioAceitacaoValorMinimo}
                disabled={disabled}
                onChange={(criterioAceitacaoValorMinimo) =>
                  onAtualizar(tabela.key, { criterioAceitacaoValorMinimo })
                }
              />
            )}
            <DecimalField
              label="Valor maximo *"
              value={tabela.criterioAceitacaoValorMaximo}
              disabled={disabled}
              onChange={(criterioAceitacaoValorMaximo) =>
                onAtualizar(tabela.key, { criterioAceitacaoValorMaximo })
              }
            />
          </div>
        )}
      </Section>

      <Section title="3.5 Pontos nominais">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !(tabelaPadrao?.pontos || []).length}
            onClick={() => onImportarPontos(tabela.key)}
          >
            <Download className="mr-2 h-4 w-4" /> Importar pontos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAdicionarPonto(tabela.key)}
          >
            <Plus className="mr-1 h-4 w-4" /> Linha
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || tabela.pontos.length <= 1}
            onClick={removerUltimaLinha}
          >
            <Minus className="mr-1 h-4 w-4" /> Linha
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">VN/VR *</th>
                <th className="w-[56px] px-3 py-2 text-right font-medium">
                  Acao
                </th>
              </tr>
            </thead>
            <tbody>
              {tabela.pontos.map((ponto) => (
                <tr key={ponto.key} className="border-b last:border-0">
                  <td className="px-2 py-2">
                    <Input
                      inputMode="decimal"
                      value={ponto.valorNominal}
                      disabled={disabled}
                      onChange={(event) =>
                        onAtualizarPonto(tabela.key, ponto.key, {
                          valorNominal: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || tabela.pontos.length <= 1}
                      title="Remover linha"
                      onClick={() => onRemoverPonto(tabela.key, ponto.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section className="rounded-lg border bg-background p-4">
    <h4 className="mb-3 text-sm font-semibold">{title}</h4>
    {children}
  </section>
);

const TextField = ({
  className,
  disabled,
  label,
  onChange,
  value,
}: {
  className?: string;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <div className={`space-y-2 ${className || ""}`}>
    <Label>{label}</Label>
    <Input
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const DecimalField = (props: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <div className="space-y-2">
    <Label>{props.label}</Label>
    <Input
      type="text"
      inputMode="decimal"
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    />
  </div>
);

const SelectField = ({
  disabled,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: [string, string][];
  placeholder?: string;
  value: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default CalibracaoProcedimentoTabelaEditor;

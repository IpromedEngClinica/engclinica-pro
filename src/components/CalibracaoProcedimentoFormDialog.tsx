import { Loader2, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CalibracaoProcedimentoTabelaEditor, {
  type CalibracaoProcedimentoPontoDraft,
  type CalibracaoProcedimentoTabelaDraft,
} from "@/components/CalibracaoProcedimentoTabelaEditor";
import SearchableSelect from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAtualizarCalibracaoProcedimento,
  useCalibracaoPadroesValidos,
  useCriarCalibracaoProcedimento,
  useSalvarCalibracaoProcedimentoTabelas,
} from "@/hooks/useCalibracaoProcedimentos";
import { toast } from "@/hooks/use-toast";
import { useTiposEquipamento } from "@/hooks/useTiposEquipamento";
import type {
  CalibracaoProcedimento,
  CalibracaoProcedimentoFormInput,
  CalibracaoProcedimentoTabelaInput,
} from "@/services/calibracaoProcedimentosService";
import {
  formatDecimalPtBr,
  normalizeDecimalInput,
  requireDecimal,
} from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento?: CalibracaoProcedimento | null;
}

type FormDraft = {
  nome: string;
  tipoEquipamentoId: string;
  metodoReferencia: string;
  observacoes: string;
};

const emptyForm: FormDraft = {
  nome: "",
  tipoEquipamentoId: "",
  metodoReferencia: "",
  observacoes: "",
};

const makeKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const novoPonto = (): CalibracaoProcedimentoPontoDraft => ({
  key: makeKey(),
  valorNominal: "",
});

const novaTabela = (): CalibracaoProcedimentoTabelaDraft => ({
  key: makeKey(),
  nome: "Nova tabela",
  grandeza: "",
  unidade: "",
  padraoId: "",
  padraoTabelaId: "",
  modoPreenchimento: "manual",
  quantidadeLeituras: 1,
  tipoMedida: "",
  resolucaoPadraoDefault: "",
  resolucaoEquipamentoDefault: "",
  faixaUsoMin: "",
  faixaUsoMax: "",
  capacidadeMin: "",
  capacidadeMax: "",
  fatorConfiabilidadeModo: "calcular_95",
  fatorKFixo: "",
  incluirCriterioAceitacao: false,
  criterioAceitacaoTipo: "absoluto",
  criterioAceitacaoValorMaximo: "",
  criterioAceitacaoValorMinimo: "",
  corrigirErroSistematico: false,
  pontos: [novoPonto()],
});

const CalibracaoProcedimentoFormDialog = ({
  open,
  onOpenChange,
  procedimento = null,
}: Props) => {
  const { data: tiposEquipamento = [] } = useTiposEquipamento();
  const { data: padroesValidos = [] } = useCalibracaoPadroesValidos();
  const criar = useCriarCalibracaoProcedimento();
  const atualizar = useAtualizarCalibracaoProcedimento();
  const salvarTabelas = useSalvarCalibracaoProcedimentoTabelas();
  const [form, setForm] = useState<FormDraft>(emptyForm);
  const [tabelas, setTabelas] = useState<CalibracaoProcedimentoTabelaDraft[]>(
    []
  );
  const [activeTabela, setActiveTabela] = useState("");
  const [saving, setSaving] = useState(false);

  const tipoOptions = useMemo(
    () => tiposEquipamento.map((tipo) => tipo.nome),
    [tiposEquipamento]
  );
  const tipoSelecionado =
    tiposEquipamento.find((tipo) => tipo.id === form.tipoEquipamentoId)?.nome ||
    "";

  useEffect(() => {
    if (!open) return;
    if (!procedimento) {
      const tabela = novaTabela();
      setForm(emptyForm);
      setTabelas([tabela]);
      setActiveTabela(tabela.key);
      return;
    }

    const tabelasDraft = (procedimento.tabelas || []).map((tabela) => ({
      key: tabela.id,
      id: tabela.id,
      nome: tabela.nome,
      grandeza: tabela.grandeza,
      unidade: tabela.unidade,
      padraoId: tabela.padrao_id || "",
      padraoTabelaId: tabela.padrao_tabela_id || "",
      modoPreenchimento: tabela.modo_preenchimento,
      quantidadeLeituras: tabela.quantidade_leituras,
      tipoMedida: tabela.tipo_medida || "",
      resolucaoPadraoDefault: formatDecimalPtBr(tabela.resolucao_padrao_default),
      resolucaoEquipamentoDefault: formatDecimalPtBr(
        tabela.resolucao_equipamento_default
      ),
      faixaUsoMin: formatDecimalPtBr(tabela.faixa_uso_min),
      faixaUsoMax: formatDecimalPtBr(tabela.faixa_uso_max),
      capacidadeMin: formatDecimalPtBr(tabela.capacidade_min),
      capacidadeMax: formatDecimalPtBr(tabela.capacidade_max),
      fatorConfiabilidadeModo: tabela.fator_confiabilidade_modo,
      fatorKFixo: formatDecimalPtBr(tabela.fator_k_fixo),
      incluirCriterioAceitacao: tabela.incluir_criterio_aceitacao,
      criterioAceitacaoTipo: tabela.criterio_aceitacao_tipo || "absoluto",
      criterioAceitacaoValorMaximo: formatDecimalPtBr(
        tabela.criterio_aceitacao_valor_maximo
      ),
      criterioAceitacaoValorMinimo: formatDecimalPtBr(
        tabela.criterio_aceitacao_valor_minimo
      ),
      corrigirErroSistematico: tabela.corrigir_erro_sistematico,
      pontos: (tabela.pontos || []).map((ponto) => ({
        key: ponto.id,
        id: ponto.id,
        valorNominal: formatDecimalPtBr(ponto.valor_nominal),
      })),
    }));

    setForm({
      nome: procedimento.nome,
      tipoEquipamentoId: procedimento.tipo_equipamento_id || "",
      metodoReferencia: procedimento.metodo_referencia || "",
      observacoes: procedimento.observacoes || "",
    });
    setTabelas(tabelasDraft);
    setActiveTabela(tabelasDraft[0]?.key || "");
  }, [open, procedimento]);

  const atualizarTabela = (
    key: string,
    patch: Partial<CalibracaoProcedimentoTabelaDraft>
  ) =>
    setTabelas((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );

  const adicionarTabela = () => {
    const tabela = novaTabela();
    setTabelas((current) => [...current, tabela]);
    setActiveTabela(tabela.key);
  };

  const removerTabela = (key: string) => {
    if (!window.confirm("Excluir esta tabela e seus pontos nominais?")) return;
    setTabelas((current) => {
      const index = current.findIndex((item) => item.key === key);
      const next = current.filter((item) => item.key !== key);
      if (activeTabela === key) {
        setActiveTabela(next[Math.min(index, next.length - 1)]?.key || "");
      }
      return next;
    });
  };

  const selecionarPadrao = (key: string, padraoId: string) => {
    atualizarTabela(key, { padraoId, padraoTabelaId: "" });
  };

  const selecionarTabelaPadrao = (key: string, padraoTabelaId: string) => {
    const draft = tabelas.find((item) => item.key === key);
    const padrao = padroesValidos.find((item) => item.id === draft?.padraoId);
    const tabelaPadrao = padrao?.tabelas?.find(
      (item) => item.id === padraoTabelaId
    );
    const importar =
      Boolean(tabelaPadrao?.pontos?.length) &&
      window.confirm(
        "A tabela metrologica possui pontos cadastrados.\n\nOK: Importar pontos\nCancelar: Manter pontos atuais"
      );
    atualizarTabela(key, {
      padraoTabelaId,
      grandeza: tabelaPadrao?.grandeza || "",
      unidade: tabelaPadrao?.unidade || "",
      ...(importar
        ? {
            pontos: tabelaPadrao?.pontos?.map((ponto) => ({
              key: makeKey(),
              valorNominal: formatDecimalPtBr(ponto.valor_nominal),
            })),
          }
        : {}),
    });
  };

  const importarPontos = (key: string) => {
    const draft = tabelas.find((item) => item.key === key);
    const padrao = padroesValidos.find((item) => item.id === draft?.padraoId);
    const tabelaPadrao = padrao?.tabelas?.find(
      (item) => item.id === draft?.padraoTabelaId
    );
    if (!tabelaPadrao?.pontos?.length) return;
    if (
      !window.confirm(
        "Importar os pontos da tabela metrologica e substituir os pontos nominais atuais?\n\nOK: Importar pontos\nCancelar: Manter pontos atuais"
      )
    ) {
      return;
    }
    atualizarTabela(key, {
      pontos: tabelaPadrao.pontos.map((ponto) => ({
        key: makeKey(),
        valorNominal: formatDecimalPtBr(ponto.valor_nominal),
      })),
    });
  };

  const parseOpcional = (value: string, tabela: string, field: string) => {
    if (!value.trim()) return null;
    const parsed = normalizeDecimalInput(value);
    if (parsed === null) {
      throw new Error(
        `Valor invalido na tabela "${tabela}", campo "${field}".`
      );
    }
    return parsed;
  };

  const buildTabelasInput = (): CalibracaoProcedimentoTabelaInput[] =>
    tabelas.map((tabela, ordem) => ({
      id: tabela.id,
      nome: tabela.nome,
      grandeza: tabela.grandeza,
      unidade: tabela.unidade,
      padraoId: tabela.padraoId,
      padraoTabelaId: tabela.padraoTabelaId,
      ordem,
      modoPreenchimento: tabela.modoPreenchimento,
      quantidadeLeituras: tabela.quantidadeLeituras,
      tipoMedida: tabela.tipoMedida,
      resolucaoPadraoDefault: parseOpcional(
        tabela.resolucaoPadraoDefault,
        tabela.nome,
        "Resolucao do padrao"
      ),
      resolucaoEquipamentoDefault: parseOpcional(
        tabela.resolucaoEquipamentoDefault,
        tabela.nome,
        "Resolucao do equipamento"
      ),
      faixaUsoMin: parseOpcional(
        tabela.faixaUsoMin,
        tabela.nome,
        "Faixa de uso minima"
      ),
      faixaUsoMax: parseOpcional(
        tabela.faixaUsoMax,
        tabela.nome,
        "Faixa de uso maxima"
      ),
      capacidadeMin: parseOpcional(
        tabela.capacidadeMin,
        tabela.nome,
        "Capacidade minima"
      ),
      capacidadeMax: parseOpcional(
        tabela.capacidadeMax,
        tabela.nome,
        "Capacidade maxima"
      ),
      fatorConfiabilidadeModo: tabela.fatorConfiabilidadeModo,
      fatorKFixo: parseOpcional(tabela.fatorKFixo, tabela.nome, "k fixo"),
      incluirCriterioAceitacao: tabela.incluirCriterioAceitacao,
      criterioAceitacaoTipo: tabela.incluirCriterioAceitacao
        ? tabela.criterioAceitacaoTipo
        : null,
      criterioAceitacaoValorMaximo: parseOpcional(
        tabela.criterioAceitacaoValorMaximo,
        tabela.nome,
        "Criterio maximo"
      ),
      criterioAceitacaoValorMinimo: parseOpcional(
        tabela.criterioAceitacaoValorMinimo,
        tabela.nome,
        "Criterio minimo"
      ),
      corrigirErroSistematico: tabela.corrigirErroSistematico,
      pontos: tabela.pontos.map((ponto, pontoOrdem) => ({
        id: ponto.id,
        ordem: pontoOrdem,
        valorNominal: requireDecimal(
          ponto.valorNominal,
          `"VN/VR" da tabela "${tabela.nome}", linha ${pontoOrdem + 1}`
        ),
      })),
    }));

  const validar = () => {
    if (!form.nome.trim() || !form.tipoEquipamentoId) {
      throw new Error("Preencha nome e tipo de equipamento.");
    }
    if (!tabelas.length) throw new Error("Adicione ao menos uma tabela.");

    for (const tabela of tabelas) {
      if (!tabela.nome.trim() || !tabela.grandeza.trim() || !tabela.unidade.trim()) {
        throw new Error("Informe titulo, grandeza e unidade de cada tabela.");
      }
      const padrao = padroesValidos.find((item) => item.id === tabela.padraoId);
      if (!padrao) {
        throw new Error(`Selecione um padrao valido na tabela "${tabela.nome}".`);
      }
      if (!padrao.tabelas?.some((item) => item.id === tabela.padraoTabelaId)) {
        throw new Error(
          `Selecione a tabela metrologica do padrao na tabela "${tabela.nome}".`
        );
      }
      if (tabela.quantidadeLeituras < 1) {
        throw new Error(
          `A tabela "${tabela.nome}" deve possuir ao menos uma leitura.`
        );
      }
      if (!tabela.pontos.length) {
        throw new Error(
          `A tabela "${tabela.nome}" deve possuir ao menos um ponto nominal.`
        );
      }
      tabela.pontos.forEach((ponto, index) => {
        if (normalizeDecimalInput(ponto.valorNominal) === null) {
          throw new Error(
            `Valor invalido na tabela "${tabela.nome}", linha ${index + 1}, campo "VN/VR".`
          );
        }
      });
      if (
        tabela.fatorConfiabilidadeModo === "k_fixo" &&
        normalizeDecimalInput(tabela.fatorKFixo) === null
      ) {
        throw new Error(
          `Informe o valor de k fixo na tabela "${tabela.nome}".`
        );
      }
      if (
        tabela.incluirCriterioAceitacao &&
        normalizeDecimalInput(tabela.criterioAceitacaoValorMaximo) === null
      ) {
        throw new Error(
          `Informe o valor maximo do criterio na tabela "${tabela.nome}".`
        );
      }
      if (
        tabela.incluirCriterioAceitacao &&
        tabela.criterioAceitacaoTipo === "faixa" &&
        normalizeDecimalInput(tabela.criterioAceitacaoValorMinimo) === null
      ) {
        throw new Error(
          `Informe o valor minimo do criterio na tabela "${tabela.nome}".`
        );
      }
    }
    buildTabelasInput();
  };

  const handleSave = async () => {
    try {
      validar();
      setSaving(true);
      const input: CalibracaoProcedimentoFormInput = {
        nome: form.nome,
        tipoEquipamentoId: form.tipoEquipamentoId,
        metodoReferencia: form.metodoReferencia,
        observacoes: form.observacoes,
      };
      const salvo = procedimento
        ? await atualizar.mutateAsync({ id: procedimento.id, input })
        : await criar.mutateAsync(input);
      await salvarTabelas.mutateAsync({
        procedimentoId: salvo.id,
        tabelas: buildTabelasInput(),
      });
      toast({
        title: procedimento
          ? "Procedimento atualizado."
          : "Procedimento cadastrado.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar procedimento",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[96vw]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {procedimento
              ? "Editar Procedimento de Calibracao"
              : "Novo Procedimento de Calibracao"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 sm:p-6">
          <Card>
            <CardHeader className="border-b bg-muted/40 px-4 py-3">
              <CardTitle className="text-sm">
                Identificacao do procedimento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-4">
              <Field
                className="md:col-span-2"
                label="Nome do procedimento *"
                value={form.nome}
                disabled={saving}
                onChange={(nome) => setForm((current) => ({ ...current, nome }))}
              />
              <div className="space-y-2 md:col-span-2">
                <Label>Tipo de equipamento *</Label>
                <SearchableSelect
                  value={tipoSelecionado}
                  options={tipoOptions}
                  placeholder="Selecione o tipo"
                  emptyText="Nenhum tipo encontrado."
                  onValueChange={(label) =>
                    setForm((current) => ({
                      ...current,
                      tipoEquipamentoId:
                        tiposEquipamento.find((tipo) => tipo.nome === label)
                          ?.id || "",
                    }))
                  }
                />
              </div>
              <Field
                className="md:col-span-2"
                label="Norma utilizada"
                value={form.metodoReferencia}
                disabled={saving}
                onChange={(metodoReferencia) =>
                  setForm((current) => ({ ...current, metodoReferencia }))
                }
              />
              <Area
                label="Observacoes"
                value={form.observacoes}
                disabled={saving}
                onChange={(observacoes) =>
                  setForm((current) => ({ ...current, observacoes }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/40 px-4 py-3">
              <CardTitle className="text-sm">Tabelas de calibracao</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!tabelas.length ? (
                <Button type="button" variant="outline" onClick={adicionarTabela}>
                  <Plus className="mr-2 h-4 w-4" /> Nova tabela
                </Button>
              ) : (
                <Tabs value={activeTabela} onValueChange={setActiveTabela}>
                  <div className="flex items-end gap-2 overflow-x-auto border-b whitespace-nowrap">
                    <TabsList className="h-auto shrink-0 justify-start rounded-none bg-transparent p-0">
                      {tabelas.map((tabela) => (
                        <TabsTrigger
                          key={tabela.key}
                          value={tabela.key}
                          className="shrink-0 rounded-b-none border border-b-0"
                        >
                          {tabela.nome || "Nova tabela"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-1 shrink-0"
                      onClick={adicionarTabela}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Nova tabela
                    </Button>
                  </div>
                  {tabelas.map((tabela) => (
                    <TabsContent
                      key={tabela.key}
                      value={tabela.key}
                      className="mt-0"
                    >
                      <CalibracaoProcedimentoTabelaEditor
                        tabela={tabela}
                        padroes={padroesValidos}
                        disabled={saving}
                        onAtualizar={atualizarTabela}
                        onExcluir={removerTabela}
                        onSelecionarPadrao={selecionarPadrao}
                        onSelecionarTabelaPadrao={selecionarTabelaPadrao}
                        onImportarPontos={importarPontos}
                        onAdicionarPonto={(key) =>
                          atualizarTabela(key, {
                            pontos: [
                              ...(tabelas.find((item) => item.key === key)
                                ?.pontos || []),
                              novoPonto(),
                            ],
                          })
                        }
                        onRemoverPonto={(key, pontoKey) =>
                          setTabelas((current) =>
                            current.map((item) =>
                              item.key !== key
                                ? item
                                : {
                                    ...item,
                                    pontos: pontoKey
                                      ? item.pontos.filter(
                                          (ponto) => ponto.key !== pontoKey
                                        )
                                      : item.pontos.slice(0, -1),
                                  }
                            )
                          )
                        }
                        onAtualizarPonto={(key, pontoKey, patch) =>
                          setTabelas((current) =>
                            current.map((item) =>
                              item.key !== key
                                ? item
                                : {
                                    ...item,
                                    pontos: item.pontos.map((ponto) =>
                                      ponto.key === pontoKey
                                        ? { ...ponto, ...patch }
                                        : ponto
                                    ),
                                  }
                            )
                          )
                        }
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar procedimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
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

const Area = ({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <div className="space-y-2 md:col-span-4">
    <Label>{label}</Label>
    <Textarea
      rows={3}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

export default CalibracaoProcedimentoFormDialog;

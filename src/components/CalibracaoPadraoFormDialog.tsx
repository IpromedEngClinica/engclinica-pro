import { Loader2, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import CalibracaoPadraoDocumentosSection, {
  type CalibracaoPadraoDocumentoDraft,
} from "@/components/CalibracaoPadraoDocumentosSection";
import CalibracaoPadraoTabelaEditor, {
  type CalibracaoPadraoPontoDraft,
  type CalibracaoPadraoTabelaDraft,
} from "@/components/CalibracaoPadraoTabelaEditor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  useAtualizarCalibracaoPadrao,
  useCriarCalibracaoPadrao,
  useSalvarCalibracaoPadraoTabelas,
  useUploadCalibracaoPadraoDocumento,
} from "@/hooks/useCalibracaoPadroes";
import { toast } from "@/hooks/use-toast";
import {
  CalibracaoPadrao,
  CalibracaoPadraoFormInput,
  CalibracaoPadraoPontoInput,
  CalibracaoPadraoTabelaInput,
} from "@/services/calibracaoPadroesService";
import {
  formatDecimalPtBr,
  isInfiniteInput,
  normalizeDecimalInput,
  parseVeffInput,
  requireDecimal,
} from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  padrao?: CalibracaoPadrao | null;
}

type FormDraft = {
  numeroCertificado: string;
  nomePadrao: string;
  descricao: string;
  fabricante: string;
  modelo: string;
  numeroSerie: string;
  patrimonio: string;
  tag: string;
  laboratorioCalibrador: string;
  dataCalibracao: string;
  dataValidade: string;
  observacoes: string;
  temperaturaAmbiente: string;
  incertezaTemperatura: string;
  unidadeTemperatura: string;
  umidadeRelativa: string;
  incertezaUmidade: string;
  unidadeUmidade: string;
};

const emptyForm: FormDraft = {
  numeroCertificado: "",
  nomePadrao: "",
  descricao: "",
  fabricante: "",
  modelo: "",
  numeroSerie: "",
  patrimonio: "",
  tag: "",
  laboratorioCalibrador: "",
  dataCalibracao: "",
  dataValidade: "",
  observacoes: "",
  temperaturaAmbiente: "",
  incertezaTemperatura: "",
  unidadeTemperatura: "°C",
  umidadeRelativa: "",
  incertezaUmidade: "",
  unidadeUmidade: "%",
};

const makeKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const novoPonto = (): CalibracaoPadraoPontoDraft => ({
  key: makeKey(),
  valorNominal: "",
  mediaValoresMedidos: "",
  tendencia: "",
  tendenciaManual: false,
  incertezaExpandida: "",
  fatorAbrangenciaK: "",
  grausLiberdadeEfetivosVeff: "",
  veffInfinito: false,
  observacoes: "",
});

const novaTabela = (): CalibracaoPadraoTabelaDraft => ({
  key: makeKey(),
  nome: "Nova Tabela",
  grandeza: "",
  unidade: "",
  pontos: [novoPonto()],
});

const CalibracaoPadraoFormDialog = ({
  open,
  onOpenChange,
  padrao = null,
}: Props) => {
  const [form, setForm] = useState<FormDraft>(emptyForm);
  const [tabelas, setTabelas] = useState<CalibracaoPadraoTabelaDraft[]>([]);
  const [documentos, setDocumentos] =
    useState<CalibracaoPadraoDocumentoDraft[]>([]);
  const [activeTabela, setActiveTabela] = useState("");
  const [saving, setSaving] = useState(false);
  const criarPadrao = useCriarCalibracaoPadrao();
  const atualizarPadrao = useAtualizarCalibracaoPadrao();
  const salvarTabelas = useSalvarCalibracaoPadraoTabelas();
  const uploadDocumento = useUploadCalibracaoPadraoDocumento();

  useEffect(() => {
    if (!open) return;

    if (!padrao) {
      setForm(emptyForm);
      setTabelas([]);
      setDocumentos([]);
      setActiveTabela("");
      return;
    }

    const tabelasDraft = (padrao.tabelas || []).map((tabela) => ({
      key: tabela.id,
      id: tabela.id,
      nome: tabela.nome,
      grandeza: tabela.grandeza,
      unidade: tabela.unidade,
      pontos: (tabela.pontos || []).map((ponto) => ({
        key: ponto.id,
        id: ponto.id,
        valorNominal:
          ponto.valor_nominal_texto ||
          formatDecimalPtBr(ponto.valor_nominal),
        mediaValoresMedidos: formatDecimalPtBr(ponto.media_valores_medidos),
        tendencia: formatDecimalPtBr(ponto.tendencia),
        tendenciaManual: false,
        incertezaExpandida:
          ponto.incerteza_expandida_texto ||
          formatDecimalPtBr(ponto.incerteza_expandida),
        fatorAbrangenciaK: formatDecimalPtBr(ponto.fator_abrangencia_k),
        grausLiberdadeEfetivosVeff: ponto.veff_infinito
          ? "INF"
          : formatDecimalPtBr(ponto.graus_liberdade_efetivos_veff),
        veffInfinito: ponto.veff_infinito,
        observacoes: ponto.observacoes || "",
      })),
    }));

    setForm({
      numeroCertificado: padrao.numero_certificado,
      nomePadrao: padrao.nome_padrao,
      descricao: padrao.descricao || "",
      fabricante: padrao.fabricante || "",
      modelo: padrao.modelo || "",
      numeroSerie: padrao.numero_serie || "",
      patrimonio: padrao.patrimonio || "",
      tag: padrao.tag || "",
      laboratorioCalibrador: padrao.laboratorio_calibrador,
      dataCalibracao: padrao.data_calibracao,
      dataValidade: padrao.data_validade,
      observacoes: padrao.observacoes || "",
      temperaturaAmbiente: formatDecimalPtBr(padrao.temperatura_ambiente),
      incertezaTemperatura: formatDecimalPtBr(padrao.incerteza_temperatura),
      unidadeTemperatura: padrao.unidade_temperatura || "°C",
      umidadeRelativa: formatDecimalPtBr(padrao.umidade_relativa),
      incertezaUmidade: formatDecimalPtBr(padrao.incerteza_umidade),
      unidadeUmidade: padrao.unidade_umidade || "%",
    });
    setTabelas(tabelasDraft);
    setDocumentos([]);
    setActiveTabela(tabelasDraft[0]?.key || "");
  }, [open, padrao]);

  const updateForm = (field: keyof FormDraft, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const adicionarTabela = () => {
    const tabela = novaTabela();
    setTabelas((current) => [...current, tabela]);
    setActiveTabela(tabela.key);
  };

  const removerTabela = (key: string) => {
    const tabela = tabelas.find((item) => item.key === key);
    if (
      !window.confirm(
        `Excluir a tabela "${tabela?.nome || "Nova tabela"}" e seus pontos?`
      )
    ) {
      return;
    }

    setTabelas((current) => {
      const removedIndex = current.findIndex((item) => item.key === key);
      const next = current.filter((tabela) => tabela.key !== key);
      if (activeTabela === key) {
        setActiveTabela(
          next[Math.min(removedIndex, next.length - 1)]?.key || ""
        );
      }
      return next;
    });
  };

  const updateTabela = (
    key: string,
    field: keyof Pick<
      CalibracaoPadraoTabelaDraft,
      "nome" | "grandeza" | "unidade"
    >,
    value: string
  ) =>
    setTabelas((current) =>
      current.map((tabela) =>
        tabela.key === key ? { ...tabela, [field]: value } : tabela
      )
    );

  const adicionarPonto = (tabelaKey: string) =>
    setTabelas((current) =>
      current.map((tabela) =>
        tabela.key === tabelaKey
          ? { ...tabela, pontos: [...tabela.pontos, novoPonto()] }
          : tabela
      )
    );

  const removerPonto = (tabelaKey: string, pontoKey?: string) =>
    setTabelas((current) =>
      current.map((tabela) => {
        if (tabela.key !== tabelaKey) return tabela;
        const pontos = pontoKey
          ? tabela.pontos.filter((ponto) => ponto.key !== pontoKey)
          : tabela.pontos.slice(0, -1);
        return { ...tabela, pontos };
      })
    );

  const updatePonto = (
    tabelaKey: string,
    pontoKey: string,
    field: Exclude<
      keyof CalibracaoPadraoPontoDraft,
      "key" | "id" | "tendenciaManual" | "veffInfinito"
    >,
    value: string
  ) =>
    setTabelas((current) =>
      current.map((tabela) => {
        if (tabela.key !== tabelaKey) return tabela;
        return {
          ...tabela,
          pontos: tabela.pontos.map((ponto) => {
            if (ponto.key !== pontoKey) return ponto;
            const next = { ...ponto, [field]: value };
            if (
              field === "valorNominal" ||
              field === "mediaValoresMedidos"
            ) {
              const nominal = normalizeDecimalInput(next.valorNominal);
              const media = normalizeDecimalInput(next.mediaValoresMedidos);
              next.tendencia =
                nominal === null || media === null
                  ? ""
                  : formatDecimalPtBr(media - nominal);
              next.tendenciaManual = false;
            } else if (field === "tendencia") {
              next.tendenciaManual = true;
            } else if (field === "grausLiberdadeEfetivosVeff") {
              next.veffInfinito = isInfiniteInput(value);
            }
            return next;
          }),
        };
      })
    );

  const adicionarDocumento = () =>
    setDocumentos((current) => [
      ...current,
      {
        key: makeKey(),
        file: null,
        tipoDocumento: "Certificado",
        observacoes: "",
      },
    ]);

  const updateDocumento = (
    key: string,
    patch: Partial<CalibracaoPadraoDocumentoDraft>
  ) =>
    setDocumentos((current) =>
      current.map((documento) =>
        documento.key === key ? { ...documento, ...patch } : documento
      )
    );

  const buildPadraoInput = (): CalibracaoPadraoFormInput => ({
    numeroCertificado: form.numeroCertificado,
    nomePadrao: form.nomePadrao,
    descricao: form.descricao,
    fabricante: form.fabricante,
    modelo: form.modelo,
    numeroSerie: form.numeroSerie,
    patrimonio: form.patrimonio,
    tag: form.tag,
    laboratorioCalibrador: form.laboratorioCalibrador,
    dataCalibracao: form.dataCalibracao,
    dataValidade: form.dataValidade,
    observacoes: form.observacoes,
    temperaturaAmbiente: normalizeDecimalInput(form.temperaturaAmbiente),
    incertezaTemperatura: normalizeDecimalInput(form.incertezaTemperatura),
    unidadeTemperatura: form.unidadeTemperatura,
    umidadeRelativa: normalizeDecimalInput(form.umidadeRelativa),
    incertezaUmidade: normalizeDecimalInput(form.incertezaUmidade),
    unidadeUmidade: form.unidadeUmidade,
  });

  const buildTabelasInput = (): CalibracaoPadraoTabelaInput[] =>
    tabelas.map((tabela, ordem) => ({
      id: tabela.id,
      nome: tabela.nome,
      grandeza: tabela.grandeza,
      unidade: tabela.unidade,
      ordem,
      pontos: tabela.pontos.map((ponto, pontoOrdem): CalibracaoPadraoPontoInput => {
        const veff = parseVeffInput(ponto.grausLiberdadeEfetivosVeff);

        return {
          id: ponto.id,
          ordem: pontoOrdem,
          valorNominal: requireDecimal(ponto.valorNominal, '"Valor nominal"'),
          valorNominalTexto: ponto.valorNominal.trim() || null,
          mediaValoresMedidos: normalizeDecimalInput(ponto.mediaValoresMedidos),
          tendencia: normalizeDecimalInput(ponto.tendencia),
          incertezaExpandida: normalizeDecimalInput(ponto.incertezaExpandida),
          incertezaExpandidaTexto: ponto.incertezaExpandida.trim() || null,
          fatorAbrangenciaK: normalizeDecimalInput(ponto.fatorAbrangenciaK),
          grausLiberdadeEfetivosVeff: veff.value,
          veffInfinito: veff.infinito,
          observacoes: ponto.observacoes,
        };
      }),
    }));

  const validarDecimalOpcional = (value: string, fieldName: string) => {
    if (value.trim() && normalizeDecimalInput(value) === null) {
      throw new Error(`Valor inválido em "${fieldName}".`);
    }
  };

  const validarDecimalPonto = (
    value: string,
    tabelaNome: string,
    linha: number,
    fieldName: string,
    obrigatorio = false
  ) => {
    if ((!value.trim() && obrigatorio) || normalizeDecimalInput(value) === null) {
      if (!value.trim() && !obrigatorio) return;
      throw new Error(
        `Valor inválido na tabela "${tabelaNome}", linha ${linha}, campo "${fieldName}".`
      );
    }
  };

  const validarVeff = (value: string, tabelaNome: string, linha: number) => {
    if (!value.trim()) return;

    const veff = parseVeffInput(value);
    if (!veff.infinito && veff.value === null) {
      throw new Error(
        `Valor invalido na tabela "${tabelaNome}", linha ${linha}, campo "veff". Use um numero ou digite inf para infinito.`
      );
    }
  };

  const validar = () => {
    if (
      !form.numeroCertificado.trim() ||
      !form.nomePadrao.trim() ||
      !form.laboratorioCalibrador.trim() ||
      !form.dataCalibracao ||
      !form.dataValidade
    ) {
      throw new Error("Preencha os campos obrigatorios do padrao.");
    }
    if (form.dataValidade < form.dataCalibracao) {
      throw new Error("A validade nao pode ser anterior a data de calibracao.");
    }
    validarDecimalOpcional(form.temperaturaAmbiente, "Temperatura ambiente");
    validarDecimalOpcional(
      form.incertezaTemperatura,
      "Incerteza da temperatura"
    );
    validarDecimalOpcional(form.umidadeRelativa, "Umidade relativa");
    validarDecimalOpcional(form.incertezaUmidade, "Incerteza da umidade");

    for (const tabela of tabelas) {
      if (!tabela.nome.trim() || !tabela.grandeza.trim() || !tabela.unidade.trim()) {
        throw new Error("Informe nome, grandeza e unidade de cada tabela.");
      }

      tabela.pontos.forEach((ponto, index) => {
        const linha = index + 1;
        validarDecimalPonto(
          ponto.valorNominal,
          tabela.nome,
          linha,
          "Valor nominal",
          true
        );
        validarDecimalPonto(
          ponto.mediaValoresMedidos,
          tabela.nome,
          linha,
          "Média dos valores medidos"
        );
        validarDecimalPonto(ponto.tendencia, tabela.nome, linha, "Tendência");
        validarDecimalPonto(
          ponto.incertezaExpandida,
          tabela.nome,
          linha,
          "Incerteza expandida"
        );
        validarDecimalPonto(ponto.fatorAbrangenciaK, tabela.nome, linha, "k");
        validarVeff(ponto.grausLiberdadeEfetivosVeff, tabela.nome, linha);
      });
    }
    if (documentos.some((documento) => !documento.file)) {
      throw new Error("Selecione um arquivo ou remova o documento pendente.");
    }
  };

  const handleSave = async () => {
    try {
      validar();
      setSaving(true);
      const input = buildPadraoInput();
      const padraoSalvo = padrao
        ? await atualizarPadrao.mutateAsync({ id: padrao.id, input })
        : await criarPadrao.mutateAsync(input);

      await salvarTabelas.mutateAsync({
        padraoId: padraoSalvo.id,
        tabelas: buildTabelasInput(),
      });

      for (const documento of documentos) {
        await uploadDocumento.mutateAsync({
          padraoId: padraoSalvo.id,
          tipoDocumento: documento.tipoDocumento,
          file: documento.file as File,
          observacoes: documento.observacoes,
        });
      }

      toast({
        title: padrao
          ? "Padrao de calibracao atualizado."
          : "Padrao de calibracao cadastrado.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar padrao de calibracao",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[96vw] xl:max-w-[1500px]">
        <DialogHeader className="border-b bg-background px-6 py-4">
          <DialogTitle>
            {padrao ? "Editar Padrao de Calibracao" : "Novo Padrao de Calibracao"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="border-b bg-muted/40 px-4 py-3">
                <CardTitle className="text-sm font-semibold">
                  1. Identificacao do padrao
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                <Field label="Numero do certificado *" value={form.numeroCertificado} onChange={(value) => updateForm("numeroCertificado", value)} disabled={saving} />
                <Field label="Nome do padrao *" value={form.nomePadrao} onChange={(value) => updateForm("nomePadrao", value)} disabled={saving} />
                <Field label="Fabricante" value={form.fabricante} onChange={(value) => updateForm("fabricante", value)} disabled={saving} />
                <Field label="Modelo" value={form.modelo} onChange={(value) => updateForm("modelo", value)} disabled={saving} />
                <Field label="Numero de serie" value={form.numeroSerie} onChange={(value) => updateForm("numeroSerie", value)} disabled={saving} />
                <Field label="Patrimonio" value={form.patrimonio} onChange={(value) => updateForm("patrimonio", value)} disabled={saving} />
                <Field label="TAG" value={form.tag} onChange={(value) => updateForm("tag", value)} disabled={saving} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b bg-muted/40 px-4 py-3">
                <CardTitle className="text-sm font-semibold">
                  2. Finalizacao do registro
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                <Field type="date" label="Data da calibracao *" value={form.dataCalibracao} onChange={(value) => updateForm("dataCalibracao", value)} disabled={saving} />
                <Field type="date" label="Data de validade *" value={form.dataValidade} onChange={(value) => updateForm("dataValidade", value)} disabled={saving} />
                <Field className="md:col-span-2" label="Laboratorio calibrador *" value={form.laboratorioCalibrador} onChange={(value) => updateForm("laboratorioCalibrador", value)} disabled={saving} />
                <div className="space-y-2 md:col-span-2">
                  <Label>Observacoes</Label>
                  <Textarea value={form.observacoes} onChange={(event) => updateForm("observacoes", event.target.value)} rows={5} disabled={saving} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b bg-muted/40 px-4 py-3">
              <CardTitle className="text-sm font-semibold">
                3. Condicoes ambientais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Field inputMode="decimal" label="Temperatura ambiente" value={form.temperaturaAmbiente} onChange={(value) => updateForm("temperaturaAmbiente", value)} disabled={saving} />
              <Field inputMode="decimal" label="Inc. temperatura" value={form.incertezaTemperatura} onChange={(value) => updateForm("incertezaTemperatura", value)} disabled={saving} />
              <Field label="Unidade" value={form.unidadeTemperatura} onChange={(value) => updateForm("unidadeTemperatura", value)} disabled={saving} />
              <Field inputMode="decimal" label="Umidade relativa" value={form.umidadeRelativa} onChange={(value) => updateForm("umidadeRelativa", value)} disabled={saving} />
              <Field inputMode="decimal" label="Inc. umidade" value={form.incertezaUmidade} onChange={(value) => updateForm("incertezaUmidade", value)} disabled={saving} />
              <Field label="Unidade" value={form.unidadeUmidade} onChange={(value) => updateForm("unidadeUmidade", value)} disabled={saving} />
            </CardContent>
          </Card>

          <CalibracaoPadraoDocumentosSection
            documentos={documentos}
            disabled={saving}
            onAdicionar={adicionarDocumento}
            onAtualizar={updateDocumento}
            onRemover={(key) =>
              setDocumentos((current) =>
                current.filter((documento) => documento.key !== key)
              )
            }
          />

          <Card>
            <CardHeader className="border-b bg-muted/40 px-4 py-3">
              <CardTitle className="text-sm font-semibold">
                5. Tabelas metrologicas
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                A tendencia e calculada automaticamente e pode ser ajustada conforme o certificado.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              {tabelas.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tabela metrologica adicionada.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarTabela} disabled={saving}>
                    <Plus className="mr-2 h-4 w-4" /> Nova tabela
                  </Button>
                </div>
              ) : (
                <Tabs value={activeTabela} onValueChange={setActiveTabela}>
                  <div className="flex items-end gap-2 overflow-x-auto border-b">
                    <TabsList className="h-auto shrink-0 justify-start rounded-none bg-transparent p-0">
                      {tabelas.map((tabela) => (
                        <TabsTrigger
                          key={tabela.key}
                          value={tabela.key}
                          className="shrink-0 rounded-t-md rounded-b-none border border-b-0 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {tabela.nome || "Nova tabela"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <Button type="button" variant="outline" size="sm" className="mb-1 shrink-0" onClick={adicionarTabela} disabled={saving}>
                      <Plus className="mr-2 h-4 w-4" /> Nova tabela
                    </Button>
                  </div>
                  {tabelas.map((tabela) => (
                    <TabsContent key={tabela.key} value={tabela.key} className="mt-0">
                      <CalibracaoPadraoTabelaEditor
                        tabela={tabela}
                        disabled={saving}
                        onAtualizarTabela={updateTabela}
                        onExcluirTabela={removerTabela}
                        onAdicionarPonto={adicionarPonto}
                        onRemoverPonto={removerPonto}
                        onAtualizarPonto={updatePonto}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Padrao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ className, disabled, inputMode, label, value, onChange, type = "text" }: { className?: string; disabled?: boolean; inputMode?: "decimal"; label: string; value: string; onChange: (value: string) => void; type?: string }) => (
  <div className={`space-y-2 ${className || ""}`}>
    <Label>{label}</Label>
    <Input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
  </div>
);

export default CalibracaoPadraoFormDialog;

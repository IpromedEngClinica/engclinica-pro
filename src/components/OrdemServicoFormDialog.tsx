import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { FileText, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  OrdemServicoFormInput,
  OrdemServicoSupabase,
} from "@/services/ordensServicoService";
import {
  useAtualizarOrdemServico,
  useCriarOrdemServico,
} from "@/hooks/useOrdensServico";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useEstadosOS, useTiposOS } from "@/hooks/useCamposOS";
import { useTecnicosExecutores } from "@/hooks/useTecnicosExecutores";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import { ordenarNomesEstadosOS } from "@/utils/ordemEstadosOS";
import {
  localDateTimeToIso,
  toLocalDateTimeInput,
} from "@/utils/planoDatas";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  os?: OrdemServicoSupabase | null;
  fromEquipamento?: { id: string; empresaId?: string; empresa?: string } | null;
  initialTipoServico?: string;
}

const createEmptyForm = (): OrdemServicoFormInput => ({
  empresaId: "",
  equipamentoId: "",
  tipoOsId: "",
  estadoOsId: "",
  tecnicoResponsavelId: "",
  dataAbertura: toLocalDateTimeInput(new Date().toISOString()),
  dataFechamento: null,
  solicitanteTexto: "",
  responsavelTexto: "Ícaro Rezende",
  problemaRelatado: "",
  origemProblema: "",
  descricaoServico: "",
  observacoes: "",
  statusSistema: "aberta",
});

const getEmpresaLabel = (empresa: {
  nome: string;
  nome_fantasia: string | null;
}) => {
  return empresa.nome_fantasia
    ? `${empresa.nome} — ${empresa.nome_fantasia}`
    : empresa.nome;
};

const getEquipamentoLabel = (equipamento: {
  tipo_equipamento?: { nome: string } | null;
  tipo_texto: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
}) => {
  const tipo =
    equipamento.tipo_equipamento?.nome ||
    equipamento.tipo_texto ||
    "Equipamento";

  const identificador =
    equipamento.tag ||
    equipamento.patrimonio ||
    equipamento.numero_serie ||
    "sem identificação";

  return [tipo, equipamento.fabricante, equipamento.modelo, identificador]
    .filter(Boolean)
    .join(" - ");
};

const getUsuarioLabel = (usuario: { nome: string }) => usuario.nome;

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizarChaveAcessorio = (descricao: string) =>
  descricao.trim().toLowerCase().replace(/\s+/g, " ");

type AcessorioFormItem = {
  descricao: string;
  quantidade: number | "";
  observacoes: string;
};

const dedupeAcessoriosForm = (
  acessorios?: Array<{
    descricao?: string | null;
    quantidade?: number | string | null;
    observacoes?: string | null;
  }>
) => {
  const map = new Map<string, AcessorioFormItem>();

  (acessorios || []).forEach((item) => {
    const descricao = item.descricao?.trim();
    if (!descricao) return;

    const chave = normalizarChaveAcessorio(descricao);

    if (!map.has(chave)) {
      const quantidade = Number(item.quantidade || 1);

      map.set(chave, {
        descricao,
        quantidade:
          Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
        observacoes: item.observacoes || "",
      });
    }
  });

  return Array.from(map.values());
};

const OrdemServicoFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  os = null,
  fromEquipamento = null,
  initialTipoServico = "",
}: Props) => {
  const criarOS = useCriarOrdemServico();
  const atualizarOS = useAtualizarOrdemServico();

  const { data: empresas = [] } = useEmpresas({ statusFiltro: "ativas" });
  const { data: tiposOS = [] } = useTiposOS();
  const { data: estadosOS = [] } = useEstadosOS();
  const { data: usuariosTecnicoExecutor = [] } = useTecnicosExecutores();

  const [form, setForm] = useState<OrdemServicoFormInput>(createEmptyForm);
  const [acessorios, setAcessorios] = useState<AcessorioFormItem[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");
  const [checklistEditOpen, setChecklistEditOpen] = useState(false);
  const [gerandoPdfAposSalvar, setGerandoPdfAposSalvar] = useState(false);
  const {
    data: equipamentos = [],
    isFetching: isFetchingEquipamentos,
  } = useEquipamentos(
    { empresaId: form.empresaId, statusFiltro: "ativos" },
    { enabled: open && Boolean(form.empresaId) }
  );

  const readOnly = mode === "view";
  const saving = criarOS.isPending || atualizarOS.isPending;
  const busy = saving || gerandoPdfAposSalvar;
  const fromEquipamentoId = fromEquipamento?.id || "";
  const fromEquipamentoEmpresaId = fromEquipamento?.empresaId || "";
  const hasChecklistPreventiva = Boolean(
    Array.isArray(os?.checklist_preventiva)
      ? os?.checklist_preventiva?.length
      : os?.checklist_preventiva
  );
  const isPreventiva = Boolean(
    os?.tipo_os?.nome?.toLowerCase().includes("preventiva") ||
    os?.descricao_servico?.toLowerCase().includes("preventiva") ||
    hasChecklistPreventiva
  );

  const empresaOptions = useMemo(
    () => empresas.map((empresa) => getEmpresaLabel(empresa)),
    [empresas]
  );

  const selectedEmpresaLabel = useMemo(() => {
    const empresa = empresas.find((item) => item.id === form.empresaId);
    return empresa ? getEmpresaLabel(empresa) : "";
  }, [empresas, form.empresaId]);

  const equipamentoOptions = useMemo(
    () => equipamentos.map((equipamento) => getEquipamentoLabel(equipamento)),
    [equipamentos]
  );

  const selectedEquipamentoLabel = useMemo(() => {
    const equipamento = equipamentos.find((item) => item.id === form.equipamentoId);
    return equipamento ? getEquipamentoLabel(equipamento) : "";
  }, [equipamentos, form.equipamentoId]);

  const tipoOptions = useMemo(() => tiposOS.map((tipo) => tipo.nome), [tiposOS]);

  const estadoOptions = useMemo(
    () => ordenarNomesEstadosOS(estadosOS.map((estado) => estado.nome)),
    [estadosOS]
  );

  const tecnicoExecutorOptions = useMemo(
    () => usuariosTecnicoExecutor.map((usuario) => getUsuarioLabel(usuario)),
    [usuariosTecnicoExecutor]
  );

  const selectedTecnicoExecutor = useMemo(
    () =>
      usuariosTecnicoExecutor.find(
        (usuario) => usuario.id === form.tecnicoResponsavelId
      ) ||
      usuariosTecnicoExecutor.find(
        (usuario) =>
          normalizeText(usuario.nome) === normalizeText(form.responsavelTexto)
      ) ||
      null,
    [form.responsavelTexto, form.tecnicoResponsavelId, usuariosTecnicoExecutor]
  );

  const selectedTecnicoExecutorLabel = selectedTecnicoExecutor
    ? getUsuarioLabel(selectedTecnicoExecutor)
    : "";

  const selectedTipoLabel = useMemo(() => {
    const tipo = tiposOS.find((item) => item.id === form.tipoOsId);
    return tipo?.nome || "";
  }, [tiposOS, form.tipoOsId]);

  const selectedEstadoLabel = useMemo(() => {
    const estado = estadosOS.find((item) => item.id === form.estadoOsId);
    return estado?.nome || "";
  }, [estadosOS, form.estadoOsId]);

  const selectedEstado = useMemo(
    () => estadosOS.find((item) => item.id === form.estadoOsId) || null,
    [estadosOS, form.estadoOsId]
  );

  useEffect(() => {
    if (open) return;

    setForm(createEmptyForm());
    setAcessorios([]);
    setNovoAcessorio("");
    setChecklistEditOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (os && (mode === "edit" || mode === "view")) {
      setForm({
        empresaId: os.empresa_id,
        equipamentoId: os.equipamento_id || "",
        tipoOsId: os.tipo_os_id || "",
        estadoOsId: os.estado_os_id || "",
        tecnicoResponsavelId: os.tecnico_responsavel_id || "",
        dataAbertura: toLocalDateTimeInput(os.data_abertura),
        dataFechamento: toLocalDateTimeInput(os.data_fechamento) || null,
        solicitanteTexto: os.solicitante_texto || "",
        responsavelTexto: os.responsavel_texto || "",
        problemaRelatado: os.problema_relatado || "",
        origemProblema: os.origem_problema || "",
        descricaoServico: os.descricao_servico || "",
        observacoes: os.observacoes || "",
        statusSistema: os.status_sistema || "aberta",
      });

      setAcessorios(dedupeAcessoriosForm(os.acessorios));
      setNovoAcessorio("");
      return;
    }

    const estadoAberta =
      estadosOS.find((estado) => estado.nome.toLowerCase() === "aberta") ||
      estadosOS[0];

    const tipoInicial = initialTipoServico
      ? tiposOS.find((tipo) => tipo.nome === initialTipoServico)
      : null;

    setForm({
      ...createEmptyForm(),
      empresaId: fromEquipamentoEmpresaId || "",
      equipamentoId: fromEquipamentoId || "",
      tipoOsId: tipoInicial?.id || "",
      estadoOsId: estadoAberta?.id || "",
      solicitanteTexto: "",
      responsavelTexto: "Ícaro Rezende",
    });

    setAcessorios([]);
    setNovoAcessorio("");
  }, [
    open,
    os,
    mode,
    estadosOS,
    tiposOS,
    fromEquipamentoEmpresaId,
    fromEquipamentoId,
    initialTipoServico,
  ]);

  const update = (field: keyof OrdemServicoFormInput, value: string) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmpresaChange = (label: string) => {
    const empresa = empresas.find((item) => getEmpresaLabel(item) === label);

    setForm((prev) => ({
      ...prev,
      empresaId: empresa?.id || "",
      equipamentoId: "",
    }));
  };

  const handleEquipamentoChange = (label: string) => {
    const equipamento = equipamentos.find(
      (item) => getEquipamentoLabel(item) === label
    );

    update("equipamentoId", equipamento?.id || "");
  };

  const handleTipoChange = (label: string) => {
    const tipo = tiposOS.find((item) => item.nome === label);
    update("tipoOsId", tipo?.id || "");
  };

  const handleEstadoChange = (label: string) => {
    const estado = estadosOS.find((item) => item.nome === label);
    if (readOnly) return;

    setForm((prev) => {
      const encerraOs = Boolean(estado?.finaliza_os || estado?.cancela_os);

      return {
        ...prev,
        estadoOsId: estado?.id || "",
        dataFechamento: encerraOs
          ? prev.dataFechamento || prev.dataAbertura || toLocalDateTimeInput(new Date().toISOString())
          : null,
      };
    });
  };

  const handleDataAberturaChange = (value: string) => {
    if (readOnly) return;

    setForm((prev) => ({
      ...prev,
      dataAbertura: value,
      dataFechamento:
        (selectedEstado?.finaliza_os || selectedEstado?.cancela_os) &&
        (!prev.dataFechamento || prev.dataFechamento === prev.dataAbertura)
          ? value
          : prev.dataFechamento,
    }));
  };

  const handleTecnicoExecutorChange = (label: string) => {
    const tecnico = usuariosTecnicoExecutor.find(
      (item) => getUsuarioLabel(item) === label
    );

    setForm((prev) => ({
      ...prev,
      tecnicoResponsavelId: tecnico?.id || "",
      responsavelTexto: tecnico?.nome || "",
    }));
  };

  useEffect(() => {
    if (!open || form.tecnicoResponsavelId || !selectedTecnicoExecutor) return;

    setForm((prev) => ({
      ...prev,
      tecnicoResponsavelId: selectedTecnicoExecutor.id,
      responsavelTexto: selectedTecnicoExecutor.nome,
    }));
  }, [form.tecnicoResponsavelId, open, selectedTecnicoExecutor]);

  const handleAddAcessorio = () => {
    const v = novoAcessorio.trim();
    if (!v) return;

    const chaveNova = normalizarChaveAcessorio(v);
    const jaExiste = acessorios.some(
      (item) => normalizarChaveAcessorio(item.descricao) === chaveNova
    );

    if (jaExiste) {
      toast({
        title: "Acessório já adicionado.",
        variant: "destructive",
      });
      return;
    }

    setAcessorios((prev) => [
      ...prev,
      { descricao: v, quantidade: 1, observacoes: "" },
    ]);
    setNovoAcessorio("");
  };

  const handleRemoveAcessorio = (i: number) => {
    setAcessorios((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleQuantidadeAcessorio = (i: number, value: string) => {
    if (value === "") {
      setAcessorios((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, quantidade: "" } : item
        )
      );
      return;
    }

    const parsed = Number.parseInt(value, 10);
    const quantidade = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    setAcessorios((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, quantidade } : item
      )
    );
  };

  const handleSave = async (gerarPdfDepois = false) => {
    if (!form.empresaId) {
      toast({
        title: "Selecione o solicitante.",
        variant: "destructive",
      });
      return;
    }

    if (!form.equipamentoId) {
      toast({
        title: "Selecione o equipamento.",
        variant: "destructive",
      });
      return;
    }

    if (!form.tipoOsId) {
      toast({
        title: "Selecione o tipo de serviço.",
        variant: "destructive",
      });
      return;
    }

    if (!form.estadoOsId) {
      toast({
        title: "Selecione o estado da OS.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTecnicoExecutor) {
      toast({
        title: "Selecione o técnico executor.",
        variant: "destructive",
      });
      return;
    }

    if (!form.dataAbertura) {
      toast({
        title: "Informe a data e hora de abertura.",
        variant: "destructive",
      });
      return;
    }

    const encerraOs = Boolean(
      selectedEstado?.finaliza_os || selectedEstado?.cancela_os
    );

    if (form.dataFechamento && !encerraOs) {
      toast({
        title: "Selecione um estado final para informar o fechamento.",
        variant: "destructive",
      });
      return;
    }

    const dataFechamentoLocal = encerraOs
      ? form.dataFechamento || form.dataAbertura
      : null;

    if (
      dataFechamentoLocal &&
      new Date(dataFechamentoLocal).getTime() < new Date(form.dataAbertura).getTime()
    ) {
      toast({
        title: "A data de fechamento não pode ser anterior à abertura.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: OrdemServicoFormInput = {
        ...form,
        dataAbertura: localDateTimeToIso(form.dataAbertura),
        dataFechamento: dataFechamentoLocal
          ? localDateTimeToIso(dataFechamentoLocal)
          : null,
        tecnicoResponsavelId: selectedTecnicoExecutor.id,
        responsavelTexto: selectedTecnicoExecutor.nome,
        solicitanteTexto: selectedEmpresaLabel,
        problemaRelatado: form.problemaRelatado?.trim(),
        origemProblema: form.origemProblema?.trim(),
        descricaoServico: form.descricaoServico?.trim(),
        observacoes: form.observacoes?.trim(),
        acessorios: dedupeAcessoriosForm(acessorios),
      };

      if (mode === "edit" && os) {
        await atualizarOS.mutateAsync({
          id: os.id,
          input: payload,
        });

        toast({ title: "Ordem de Serviço atualizada com sucesso!" });
      } else {
        const osCriada = await criarOS.mutateAsync(payload);

        toast({ title: "Ordem de Serviço criada com sucesso!" });

        if (gerarPdfDepois) {
          setGerandoPdfAposSalvar(true);

          try {
            await gerarPdfOrdemServico(osCriada);
          } catch (pdfError) {
            toast({
              title: "OS salva, mas o PDF não foi gerado",
              description:
                pdfError instanceof Error
                  ? pdfError.message
                  : "Tente gerar o PDF pela visualização da OS.",
              variant: "destructive",
            });
          } finally {
            setGerandoPdfAposSalvar(false);
          }
        }
      }

      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar OS.";

      toast({
        title: "Erro ao salvar OS",
        description: message,
        variant: "destructive",
      });
    }
  };

  const title =
    mode === "view"
      ? `Visualizar OS ${os?.numero || ""}`
      : mode === "edit"
        ? `Editar OS ${os?.numero || ""}`
        : "Nova Ordem de Serviço";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">
              Identificação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm">Número</Label>
                <Input
                  value={os?.numero || "Gerado automaticamente"}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Estado *</Label>
                {readOnly ? (
                  <Input value={selectedEstadoLabel} disabled />
                ) : (
                  <SearchableSelect
                    value={selectedEstadoLabel}
                    onValueChange={handleEstadoChange}
                    options={estadoOptions}
                    placeholder="Selecione o estado"
                    emptyText="Nenhum estado encontrado."
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data e hora de abertura *</Label>
                <Input
                  type="datetime-local"
                  value={form.dataAbertura || ""}
                  onChange={(event) => handleDataAberturaChange(event.target.value)}
                  disabled={readOnly || busy}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data e hora de fechamento</Label>
                <Input
                  type="datetime-local"
                  value={form.dataFechamento || ""}
                  onChange={(event) => update("dataFechamento", event.target.value)}
                  disabled={readOnly || busy}
                />
                {!readOnly && !selectedEstado?.finaliza_os && !selectedEstado?.cancela_os && (
                  <p className="text-xs text-muted-foreground">
                    Selecione um estado final para preencher o fechamento.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">
              Pessoas e Equipamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm">Técnico Executor</Label>
                {readOnly ? (
                  <Input
                    value={selectedTecnicoExecutorLabel || form.responsavelTexto || ""}
                    disabled
                  />
                ) : (
                  <SearchableSelect
                    value={selectedTecnicoExecutorLabel}
                    onValueChange={handleTecnicoExecutorChange}
                    options={tecnicoExecutorOptions}
                    placeholder="Selecione o técnico executor"
                    emptyText="Nenhum técnico executor cadastrado."
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Solicitante *</Label>
                {readOnly ? (
                  <Input value={selectedEmpresaLabel} disabled />
                ) : (
                  <SearchableSelect
                    value={selectedEmpresaLabel}
                    onValueChange={handleEmpresaChange}
                    options={empresaOptions}
                    placeholder="Selecione a empresa"
                    emptyText="Nenhuma empresa encontrada."
                  />
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm">Equipamento *</Label>
                {readOnly ? (
                  <Input value={selectedEquipamentoLabel} disabled />
                ) : (
                  <SearchableSelect
                    value={selectedEquipamentoLabel}
                    onValueChange={handleEquipamentoChange}
                    options={equipamentoOptions}
                    placeholder={
                      form.empresaId
                        ? isFetchingEquipamentos && equipamentos.length === 0
                          ? "Carregando equipamentos..."
                          : "Selecione o equipamento do cliente"
                        : "Selecione um solicitante primeiro"
                    }
                    emptyText={
                      form.empresaId
                        ? "Nenhum equipamento cadastrado para este cliente."
                        : "Selecione um solicitante primeiro."
                    }
                    disabled={
                      !form.empresaId ||
                      (isFetchingEquipamentos && equipamentos.length === 0)
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">
              Detalhes do Serviço
            </h3>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <Label className="text-sm">Tipo de Serviço *</Label>
                {readOnly ? (
                  <Input value={selectedTipoLabel} disabled />
                ) : (
                  <SearchableSelect
                    value={selectedTipoLabel}
                    onValueChange={handleTipoChange}
                    options={tipoOptions}
                    placeholder="Selecione o tipo de serviço"
                    emptyText="Nenhum tipo encontrado."
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Problema Relatado</Label>
                <Textarea
                  placeholder="Descreva o problema informado pelo cliente ou operador..."
                  rows={3}
                  value={form.problemaRelatado}
                  onChange={(e) => update("problemaRelatado", e.target.value)}
                  disabled={readOnly || busy}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Origem do Problema</Label>
                <Input
                  placeholder="Ex: Relato do operador, alarme, falha observada..."
                  value={form.origemProblema}
                  onChange={(e) => update("origemProblema", e.target.value)}
                  disabled={readOnly || busy}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Descrição do Serviço</Label>
                <Textarea
                  placeholder="Detalhe o serviço a ser executado..."
                  rows={5}
                  value={form.descricaoServico}
                  onChange={(e) => update("descricaoServico", e.target.value)}
                  disabled={readOnly || busy}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Acessórios</h3>

            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  placeholder="Novo acessório..."
                  value={novoAcessorio}
                  onChange={(e) => setNovoAcessorio(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAcessorio();
                    }
                  }}
                  disabled={busy}
                />

                <Button type="button" onClick={handleAddAcessorio} disabled={busy}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
            )}

            {acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {acessorios.map((a, i) => (
                  <li
                    key={`${a.descricao}-${i}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {a.descricao}
                    </span>

                    {readOnly ? (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        Qtd. {a.quantidade}
                      </span>
                    ) : (
                      <>
                        <div className="flex shrink-0 items-center gap-2">
                          <Label
                            htmlFor={`acessorio-quantidade-${i}`}
                            className="text-xs text-muted-foreground"
                          >
                            Quantidade
                          </Label>
                          <Input
                            id={`acessorio-quantidade-${i}`}
                            type="number"
                            min={1}
                            step={1}
                            value={a.quantidade}
                            onChange={(e) =>
                              handleQuantidadeAcessorio(i, e.target.value)
                            }
                            onBlur={(e) => {
                              if (!e.currentTarget.value) {
                                handleQuantidadeAcessorio(i, "1");
                              }
                            }}
                            onFocus={(e) => e.currentTarget.select()}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={busy}
                            className="h-8 w-20 px-2 text-center"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAcessorio(i)}
                          disabled={busy}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remover acessório ${a.descricao}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum acessório adicionado.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-5 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Observações Gerais
            </h3>

            <Textarea
              placeholder="Informações gerais..."
              rows={5}
              value={form.observacoes}
              onChange={(e) => update("observacoes", e.target.value)}
              disabled={readOnly || busy}
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          {(mode === "edit" || mode === "view") && isPreventiva && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setChecklistEditOpen(true)}
              disabled={busy}
            >
              {hasChecklistPreventiva ? "Editar checklist" : "Acessar checklist"}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>

          {mode === "create" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={busy}
            >
              <FileText className="mr-2 h-4 w-4" />
              {gerandoPdfAposSalvar
                ? "Gerando PDF..."
                : saving
                  ? "Salvando..."
                  : "Salvar e gerar PDF"}
            </Button>
          )}

          {!readOnly && (
            <Button
              type="button"
              onClick={() => handleSave(false)}
              disabled={busy}
            >
              {saving ? "Salvando..." : "Salvar OS"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PreventivaChecklistDialog
      open={checklistEditOpen}
      onOpenChange={setChecklistEditOpen}
      osExistenteId={os?.id || null}
      modo="usar_os_existente"
    />
    </>
  );
};

export default OrdemServicoFormDialog;

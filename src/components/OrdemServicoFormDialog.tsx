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
import { Plus, X } from "lucide-react";
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

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DialogMode;
  os?: OrdemServicoSupabase | null;
  fromEquipamento?: { id: string; empresaId?: string; empresa?: string } | null;
  initialTipoServico?: string;
}

const emptyForm: OrdemServicoFormInput = {
  empresaId: "",
  equipamentoId: "",
  tipoOsId: "",
  estadoOsId: "",
  tecnicoResponsavelId: "",
  solicitanteTexto: "",
  responsavelTexto: "Ícaro Rezende",
  problemaRelatado: "",
  origemProblema: "",
  descricaoServico: "",
  observacoes: "",
  statusSistema: "aberta",
};

const getEmpresaLabel = (empresa: {
  nome: string;
  nome_fantasia: string | null;
}) => {
  return empresa.nome_fantasia
    ? `${empresa.nome_fantasia} — ${empresa.nome}`
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

const normalizarChaveAcessorio = (descricao: string) =>
  descricao.trim().toLowerCase().replace(/\s+/g, " ");

const normalizarAcessoriosFormulario = (
  acessorios: OrdemServicoSupabase["acessorios"]
) => {
  return Array.from(
    new Map(
      (acessorios || [])
        .map((item) => item.descricao?.trim())
        .filter((descricao): descricao is string => Boolean(descricao))
        .map((descricao) => [normalizarChaveAcessorio(descricao), descricao])
    ).values()
  );
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

  const { data: empresas = [] } = useEmpresas("ativas");
  const { data: equipamentos = [] } = useEquipamentos();
  const { data: tiposOS = [] } = useTiposOS();
  const { data: estadosOS = [] } = useEstadosOS();

  const [form, setForm] = useState<OrdemServicoFormInput>(emptyForm);
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");

  const readOnly = mode === "view";
  const saving = criarOS.isPending || atualizarOS.isPending;

  const empresaOptions = useMemo(
    () => empresas.map((empresa) => getEmpresaLabel(empresa)),
    [empresas]
  );

  const selectedEmpresaLabel = useMemo(() => {
    const empresa = empresas.find((item) => item.id === form.empresaId);
    return empresa ? getEmpresaLabel(empresa) : "";
  }, [empresas, form.empresaId]);

  const equipamentosFiltrados = useMemo(() => {
    if (!form.empresaId) return [];
    return equipamentos.filter((equipamento) => equipamento.empresa_id === form.empresaId);
  }, [equipamentos, form.empresaId]);

  const equipamentoOptions = useMemo(
    () => equipamentosFiltrados.map((equipamento) => getEquipamentoLabel(equipamento)),
    [equipamentosFiltrados]
  );

  const selectedEquipamentoLabel = useMemo(() => {
    const equipamento = equipamentos.find((item) => item.id === form.equipamentoId);
    return equipamento ? getEquipamentoLabel(equipamento) : "";
  }, [equipamentos, form.equipamentoId]);

  const tipoOptions = useMemo(() => tiposOS.map((tipo) => tipo.nome), [tiposOS]);

  const estadoOptions = useMemo(
    () => estadosOS.map((estado) => estado.nome),
    [estadosOS]
  );

  const selectedTipoLabel = useMemo(() => {
    const tipo = tiposOS.find((item) => item.id === form.tipoOsId);
    return tipo?.nome || "";
  }, [tiposOS, form.tipoOsId]);

  const selectedEstadoLabel = useMemo(() => {
    const estado = estadosOS.find((item) => item.id === form.estadoOsId);
    return estado?.nome || "";
  }, [estadosOS, form.estadoOsId]);

  useEffect(() => {
    if (!open) return;

    if (os && (mode === "edit" || mode === "view")) {
      setForm({
        empresaId: os.empresa_id,
        equipamentoId: os.equipamento_id || "",
        tipoOsId: os.tipo_os_id || "",
        estadoOsId: os.estado_os_id || "",
        tecnicoResponsavelId: os.tecnico_responsavel_id || "",
        solicitanteTexto: os.solicitante_texto || "",
        responsavelTexto: os.responsavel_texto || "",
        problemaRelatado: os.problema_relatado || "",
        origemProblema: os.origem_problema || "",
        descricaoServico: os.descricao_servico || "",
        observacoes: os.observacoes || "",
        statusSistema: os.status_sistema || "aberta",
      });

      setAcessorios(normalizarAcessoriosFormulario(os.acessorios));
      setNovoAcessorio("");
      return;
    }

    const estadoAberta =
      estadosOS.find((estado) => estado.nome.toLowerCase() === "aberta") ||
      estadosOS[0];

    const tipoInicial = initialTipoServico
      ? tiposOS.find((tipo) => tipo.nome === initialTipoServico)
      : null;

    const equipamentoInicial = fromEquipamento?.id
      ? equipamentos.find((equipamento) => equipamento.id === fromEquipamento.id)
      : null;

    setForm({
      ...emptyForm,
      empresaId:
        equipamentoInicial?.empresa_id ||
        fromEquipamento?.empresaId ||
        "",
      equipamentoId: equipamentoInicial?.id || fromEquipamento?.id || "",
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
    equipamentos,
    fromEquipamento,
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
    const equipamento = equipamentosFiltrados.find(
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
    update("estadoOsId", estado?.id || "");
  };

  const handleAddAcessorio = () => {
    const v = novoAcessorio.trim();
    if (!v) return;

    const chaveNova = normalizarChaveAcessorio(v);
    const jaExiste = acessorios.some(
      (item) => normalizarChaveAcessorio(item) === chaveNova
    );

    if (jaExiste) {
      toast({
        title: "Acessório já adicionado.",
        variant: "destructive",
      });
      return;
    }

    setAcessorios((prev) => [...prev, v]);
    setNovoAcessorio("");
  };

  const handleRemoveAcessorio = (i: number) => {
    setAcessorios((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
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

    try {
      const payload: OrdemServicoFormInput = {
        ...form,
        responsavelTexto: form.responsavelTexto?.trim(),
        solicitanteTexto: selectedEmpresaLabel,
        problemaRelatado: form.problemaRelatado?.trim(),
        origemProblema: form.origemProblema?.trim(),
        descricaoServico: form.descricaoServico?.trim(),
        observacoes: form.observacoes?.trim(),
        statusSistema: "aberta",
        acessorios,
      };

      if (mode === "edit" && os) {
        await atualizarOS.mutateAsync({
          id: os.id,
          input: payload,
        });

        toast({ title: "Ordem de Serviço atualizada com sucesso!" });
      } else {
        await criarOS.mutateAsync(payload);

        toast({ title: "Ordem de Serviço criada com sucesso!" });
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
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">
              Pessoas e Equipamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm">Responsável Técnico</Label>
                <Input
                  value={form.responsavelTexto}
                  onChange={(e) => update("responsavelTexto", e.target.value)}
                  disabled={readOnly || saving}
                  placeholder="Nome do técnico executor"
                />
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
                        ? "Selecione o equipamento do cliente"
                        : "Selecione um solicitante primeiro"
                    }
                    emptyText={
                      form.empresaId
                        ? "Nenhum equipamento cadastrado para este cliente."
                        : "Selecione um solicitante primeiro."
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
                  disabled={readOnly || saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Origem do Problema</Label>
                <Input
                  placeholder="Ex: Relato do operador, alarme, falha observada..."
                  value={form.origemProblema}
                  onChange={(e) => update("origemProblema", e.target.value)}
                  disabled={readOnly || saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Descrição do Serviço</Label>
                <Textarea
                  placeholder="Detalhe o serviço a ser executado..."
                  rows={5}
                  value={form.descricaoServico}
                  onChange={(e) => update("descricaoServico", e.target.value)}
                  disabled={readOnly || saving}
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
                  disabled={saving}
                />

                <Button type="button" onClick={handleAddAcessorio} disabled={saving}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
            )}

            {acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {acessorios.map((a, i) => (
                  <li
                    key={`${a}-${i}`}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{a}</span>

                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAcessorio(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
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
              disabled={readOnly || saving}
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>

          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar OS"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrdemServicoFormDialog;

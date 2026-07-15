import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  useAtualizarContrato,
  useCriarContrato,
  useUploadContratoDocumento,
} from "@/hooks/useContratos";
import { toast } from "@/hooks/use-toast";
import { CONTRATO_VENDEDORES } from "@/services/contratosService";
import type {
  ContratoFormInput,
  ContratoSupabase,
  ContratoTipo,
  PeriodicidadeVisita,
} from "@/services/contratosService";

export type ContratoDialogMode = "create" | "edit";

type DocumentoContratoForm = {
  id: string;
  file: File | null;
  tipoDocumento: string;
  observacoes: string;
};

interface ContratoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: ContratoDialogMode;
  contrato?: ContratoSupabase | null;
}

const NONE = "__none__";

const periodicidades: PeriodicidadeVisita[] = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
  "Sob demanda",
  "Nao se aplica",
];

const tiposDocumento = [
  "Contrato",
  "Termo Aditivo",
  "Publicacao",
  "Empenho",
  "Outro",
];

const emptyForm = {
  tipo: "Privado" as ContratoTipo,
  empresaId: "",
  empresaNomeSnapshot: "",
  numeroIdentificacao: "",
  dataUltimaRenovacao: "",
  dataProximaRenovacao: "",
  contratoOuTaNaPasta: false,
  termosAditivosRealizados: "0",
  termosAditivosLimite: "",
  periodicidadeVisita: "",
  vendedor: "",
  valorPrevisto: "",
  mesUltimaVisita: "",
  objeto: "",
  observacoes: "",
};

const parseCurrency = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getEmpresaLabel = (empresa: {
  nome: string;
  nome_fantasia: string | null;
}) =>
  empresa.nome_fantasia ? `${empresa.nome} - ${empresa.nome_fantasia}` : empresa.nome;

const createDocumentoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const ContratoFormDialog = ({
  open,
  onOpenChange,
  mode = "create",
  contrato = null,
}: ContratoFormDialogProps) => {
  const { data: empresas = [] } = useEmpresas();
  const criarContrato = useCriarContrato();
  const atualizarContrato = useAtualizarContrato();
  const uploadDocumentoContrato = useUploadContratoDocumento();
  const [form, setForm] = useState(emptyForm);
  const [documentos, setDocumentos] = useState<DocumentoContratoForm[]>([]);
  const [salvando, setSalvando] = useState(false);

  const saving =
    salvando ||
    criarContrato.isPending ||
    atualizarContrato.isPending ||
    uploadDocumentoContrato.isPending;
  const isEdit = mode === "edit" && contrato;

  const empresaSelecionada = useMemo(
    () => empresas.find((empresa) => empresa.id === form.empresaId),
    [empresas, form.empresaId]
  );

  useEffect(() => {
    if (!open) return;
    setDocumentos([]);

    if (contrato && mode === "edit") {
      setForm({
        tipo: contrato.tipo,
        empresaId: contrato.empresa_id || "",
        empresaNomeSnapshot: contrato.empresa_nome_snapshot || "",
        numeroIdentificacao: contrato.numero_identificacao || "",
        dataUltimaRenovacao: contrato.data_ultima_renovacao || "",
        dataProximaRenovacao: contrato.data_proxima_renovacao || "",
        contratoOuTaNaPasta: contrato.contrato_ou_ta_na_pasta,
        termosAditivosRealizados: String(contrato.termos_aditivos_realizados),
        termosAditivosLimite:
          contrato.termos_aditivos_limite === null
            ? ""
            : String(contrato.termos_aditivos_limite),
        periodicidadeVisita: contrato.periodicidade_visita || "",
        vendedor: contrato.vendedor || "",
        valorPrevisto:
          contrato.valor_previsto === null || contrato.valor_previsto === undefined
            ? ""
            : String(contrato.valor_previsto).replace(".", ","),
        mesUltimaVisita: contrato.mes_ultima_visita
          ? contrato.mes_ultima_visita.slice(0, 7)
          : "",
        objeto: contrato.objeto || "",
        observacoes: contrato.observacoes || "",
      });
      return;
    }

    setForm(emptyForm);
  }, [contrato, mode, open]);

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEmpresaChange = (empresaId: string) => {
    const empresa = empresas.find((item) => item.id === empresaId);
    setForm((current) => ({
      ...current,
      empresaId,
      empresaNomeSnapshot: empresa ? empresa.nome || empresa.nome_fantasia : "",
    }));
  };

  const buildPayload = (): ContratoFormInput => ({
    tipo: form.tipo,
    empresaId: form.empresaId,
    empresaNomeSnapshot:
      empresaSelecionada?.nome || empresaSelecionada?.nome_fantasia || null,
    numeroIdentificacao: form.numeroIdentificacao,
    dataUltimaRenovacao: form.dataUltimaRenovacao || null,
    dataProximaRenovacao: form.dataProximaRenovacao,
    contratoOuTaNaPasta: form.contratoOuTaNaPasta,
    termosAditivosRealizados: Number(form.termosAditivosRealizados || 0),
    termosAditivosLimite: form.termosAditivosLimite
      ? Number(form.termosAditivosLimite)
      : null,
    periodicidadeVisita: form.periodicidadeVisita || null,
    vendedor: form.vendedor,
    valorPrevisto: parseCurrency(form.valorPrevisto),
    mesUltimaVisita: form.mesUltimaVisita || null,
    objeto: form.objeto,
    observacoes: form.observacoes,
  });

  const adicionarDocumento = () => {
    setDocumentos((current) => [
      ...current,
      {
        id: createDocumentoId(),
        file: null,
        tipoDocumento: "Contrato",
        observacoes: "",
      },
    ]);
  };

  const removerDocumento = (id: string) => {
    setDocumentos((current) => current.filter((doc) => doc.id !== id));
  };

  const atualizarDocumento = (
    id: string,
    patch: Partial<DocumentoContratoForm>
  ) => {
    setDocumentos((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
    );
  };

  const handleSubmit = async () => {
    if (!form.dataProximaRenovacao) {
      toast({
        title: "Informe a proxima renovacao.",
        variant: "destructive",
      });
      return;
    }

    if (!form.empresaId) {
      toast({
        title: "Empresa obrigatória",
        description: "Selecione uma empresa cadastrada para vincular ao contrato.",
        variant: "destructive",
      });
      return;
    }

    if (documentos.some((documento) => !documento.file)) {
      toast({
        title: "Documento incompleto",
        description: "Remova o documento vazio ou selecione um arquivo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvando(true);
      const payload = buildPayload();

      if (isEdit) {
        await atualizarContrato.mutateAsync({ id: contrato.id, input: payload });
        for (const documento of documentos) {
          await uploadDocumentoContrato.mutateAsync({
            contratoId: contrato.id,
            file: documento.file as File,
            tipoDocumento: documento.tipoDocumento,
            observacoes: documento.observacoes || null,
          });
        }
        toast({
          title:
            documentos.length > 0
              ? "Contrato e documentos atualizados com sucesso."
              : "Contrato atualizado com sucesso.",
        });
      } else {
        const contratoCriado = await criarContrato.mutateAsync(payload);
        for (const documento of documentos) {
          await uploadDocumentoContrato.mutateAsync({
            contratoId: contratoCriado.id,
            file: documento.file as File,
            tipoDocumento: documento.tipoDocumento,
            observacoes: documento.observacoes || null,
          });
        }
        toast({
          title:
            documentos.length > 0
              ? "Contrato e documentos criados com sucesso."
              : "Contrato criado com sucesso.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar contrato",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Contrato" : "Novo Contrato"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(value) => update("tipo", value as ContratoTipo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Privado">Privado</SelectItem>
                  <SelectItem value="Publico">Publico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Empresa *</Label>
              <Select
                value={form.empresaId || undefined}
                onValueChange={handleEmpresaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {getEmpresaLabel(empresa)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Numero / ID</Label>
              <Input
                value={form.numeroIdentificacao}
                onChange={(event) =>
                  update("numeroIdentificacao", event.target.value)
                }
                placeholder="Ex: 001/2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Ultima Renovacao</Label>
              <Input
                type="date"
                value={form.dataUltimaRenovacao}
                onChange={(event) =>
                  update("dataUltimaRenovacao", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Proxima Renovacao *</Label>
              <Input
                type="date"
                value={form.dataProximaRenovacao}
                onChange={(event) =>
                  update("dataProximaRenovacao", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Termos realizados</Label>
              <Input
                type="number"
                min={0}
                value={form.termosAditivosRealizados}
                onChange={(event) =>
                  update("termosAditivosRealizados", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Limite de termos</Label>
              <Input
                type="number"
                min={0}
                value={form.termosAditivosLimite}
                onChange={(event) =>
                  update("termosAditivosLimite", event.target.value)
                }
                placeholder="Vazio = sem limite"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Periodicidade de visita</Label>
              <Select
                value={form.periodicidadeVisita || NONE}
                onValueChange={(value) =>
                  update("periodicidadeVisita", value === NONE ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nao informado</SelectItem>
                  {periodicidades.map((periodicidade) => (
                    <SelectItem key={periodicidade} value={periodicidade}>
                      {periodicidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select
                value={form.vendedor || NONE}
                onValueChange={(value) =>
                  update("vendedor", value === NONE ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nao informado</SelectItem>
                  {CONTRATO_VENDEDORES.map((vendedor) => (
                    <SelectItem key={vendedor} value={vendedor}>
                      {vendedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor previsto</Label>
              <Input
                value={form.valorPrevisto}
                onChange={(event) => update("valorPrevisto", event.target.value)}
                placeholder="Ex: 1.500,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Mes da ultima visita</Label>
              <Input
                type="month"
                value={form.mesUltimaVisita}
                onChange={(event) =>
                  update("mesUltimaVisita", event.target.value)
                }
              />
            </div>

            <div className="flex items-end md:col-span-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={form.contratoOuTaNaPasta}
                  onCheckedChange={(checked) =>
                    update("contratoOuTaNaPasta", checked === true)
                  }
                />
                Contrato/T.A. na pasta
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Objeto</Label>
            <Textarea
              value={form.objeto}
              onChange={(event) => update("objeto", event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Textarea
              value={form.observacoes}
              onChange={(event) => update("observacoes", event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Documentos</h3>
                <p className="text-xs text-muted-foreground">
                  Anexe contrato, termos aditivos e documentos relacionados.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={adicionarDocumento}
                disabled={saving}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar documento
              </Button>
            </div>

            {documentos.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Nenhum documento adicionado.
              </p>
            ) : (
              <div className="space-y-3">
                {documentos.map((documento, index) => (
                  <div
                    key={documento.id}
                    className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(220px,1.3fr)_180px_minmax(180px,1fr)_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Arquivo {index + 1}</Label>
                      <Input
                        type="file"
                        disabled={saving}
                        onChange={(event) =>
                          atualizarDocumento(documento.id, {
                            file: event.target.files?.[0] || null,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={documento.tipoDocumento}
                        onValueChange={(value) =>
                          atualizarDocumento(documento.id, {
                            tipoDocumento: value,
                          })
                        }
                        disabled={saving}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDocumento.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Observacoes</Label>
                      <Input
                        value={documento.observacoes}
                        disabled={saving}
                        onChange={(event) =>
                          atualizarDocumento(documento.id, {
                            observacoes: event.target.value,
                          })
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerDocumento(documento.id)}
                        disabled={saving}
                        title="Remover documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContratoFormDialog;

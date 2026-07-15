import { useEffect, useMemo, useState } from "react";
import { CopyPlus, Plus, Trash2 } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
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
import { useEmpresas } from "@/hooks/useEmpresas";
import { useCriarEquipamentosEmLote } from "@/hooks/useEquipamentos";
import { useTiposEquipamento } from "@/hooks/useTiposEquipamento";
import { toast } from "@/hooks/use-toast";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoFormInput } from "@/services/equipamentosService";
import TipoEquipamentoQuickAddDialog from "@/components/TipoEquipamentoQuickAddDialog";

interface EquipamentosLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CampoLote =
  | "empresa"
  | "tipo"
  | "fabricante"
  | "modelo"
  | "tag"
  | "numeroSerie"
  | "patrimonio"
  | "setor"
  | "status"
  | "dataUltimaPreventiva"
  | "dataProximaPreventiva"
  | "dataUltimaCalibracao"
  | "dataProximaCalibracao"
  | "observacoes";

type LinhaLote = EquipamentoFormInput & { rowId: string };

const campos: Array<{
  key: CampoLote;
  label: string;
  width: string;
}> = [
  { key: "empresa", label: "Proprietário *", width: "min-w-[250px]" },
  { key: "tipo", label: "Tipo *", width: "min-w-[210px]" },
  { key: "fabricante", label: "Fabricante", width: "min-w-[180px]" },
  { key: "modelo", label: "Modelo", width: "min-w-[170px]" },
  { key: "tag", label: "TAG", width: "min-w-[150px]" },
  { key: "numeroSerie", label: "Nº de série", width: "min-w-[170px]" },
  { key: "patrimonio", label: "Patrimônio", width: "min-w-[150px]" },
  { key: "setor", label: "Setor", width: "min-w-[190px]" },
  { key: "status", label: "Estado", width: "min-w-[170px]" },
  {
    key: "dataUltimaPreventiva",
    label: "Última preventiva",
    width: "min-w-[165px]",
  },
  {
    key: "dataProximaPreventiva",
    label: "Próxima preventiva",
    width: "min-w-[165px]",
  },
  {
    key: "dataUltimaCalibracao",
    label: "Última calibração",
    width: "min-w-[165px]",
  },
  {
    key: "dataProximaCalibracao",
    label: "Próxima calibração",
    width: "min-w-[165px]",
  },
  { key: "observacoes", label: "Observações", width: "min-w-[260px]" },
];

const camposComunsIniciais: CampoLote[] = [];

const statusOptions = ["Ativo", "Em manutenção", "Desativado"];

const emptyForm = (): EquipamentoFormInput => ({
  empresaId: "",
  empresaSetorId: "",
  tipoEquipamentoId: "",
  tipoTexto: "",
  fabricante: "",
  modelo: "",
  numeroSerie: "",
  patrimonio: "",
  setor: "",
  tag: "",
  status: "Ativo",
  dataUltimaPreventiva: "",
  dataProximaPreventiva: "",
  dataUltimaCalibracao: "",
  dataProximaCalibracao: "",
  observacoes: "",
});

const newRow = (): LinhaLote => ({
  ...emptyForm(),
  rowId: crypto.randomUUID(),
});

const getEmpresaLabel = (empresa: EmpresaSupabase) =>
  empresa.nome_fantasia
    ? `${empresa.nome} — ${empresa.nome_fantasia}`
    : empresa.nome;

const getSetoresEmpresa = (empresa?: EmpresaSupabase | null) =>
  [...new Set((empresa?.setores || []).map((setor) => setor.nome).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

const getSetorEmpresaId = (empresa: EmpresaSupabase | null, setorNome?: string) =>
  empresa?.setores?.find((setor) => setor.nome === setorNome)?.id || "";

const trimInput = (input: EquipamentoFormInput): EquipamentoFormInput => ({
  ...input,
  tipoTexto: input.tipoTexto?.trim(),
  fabricante: input.fabricante?.trim(),
  modelo: input.modelo?.trim(),
  numeroSerie: input.numeroSerie?.trim(),
  patrimonio: input.patrimonio?.trim(),
  tag: input.tag?.trim(),
  setor: input.setor?.trim(),
  observacoes: input.observacoes?.trim(),
});

const EquipamentosLoteDialog = ({
  open,
  onOpenChange,
}: EquipamentosLoteDialogProps) => {
  const { data: empresas = [] } = useEmpresas({ statusFiltro: "ativas" });
  const { data: tiposEquipamento = [] } = useTiposEquipamento();
  const criarEmLote = useCriarEquipamentosEmLote();

  const [camposComuns, setCamposComuns] = useState<Set<CampoLote>>(
    () => new Set(camposComunsIniciais)
  );
  const [comum, setComum] = useState<EquipamentoFormInput>(emptyForm);
  const [linhas, setLinhas] = useState<LinhaLote[]>([newRow()]);
  const [novoTipoTarget, setNovoTipoTarget] = useState<string | null>(null);

  const saving = criarEmLote.isPending;

  const empresaOptions = useMemo(
    () => empresas.map(getEmpresaLabel),
    [empresas]
  );
  const tipoOptions = useMemo(
    () => tiposEquipamento.map((tipo) => tipo.nome),
    [tiposEquipamento]
  );
  const camposPorLinha = useMemo(
    () => campos.filter((campo) => !camposComuns.has(campo.key)),
    [camposComuns]
  );

  useEffect(() => {
    if (!open) return;
    setCamposComuns(new Set(camposComunsIniciais));
    setComum(emptyForm());
    setLinhas([newRow()]);
    setNovoTipoTarget(null);
  }, [open]);

  const empresaPorId = (id?: string) =>
    empresas.find((empresa) => empresa.id === id) || null;

  const empresaLabelPorId = (id?: string) => {
    const empresa = empresaPorId(id);
    return empresa ? getEmpresaLabel(empresa) : "";
  };

  const tipoLabel = (form: EquipamentoFormInput) =>
    tiposEquipamento.find((tipo) => tipo.id === form.tipoEquipamentoId)?.nome ||
    form.tipoTexto ||
    "";

  const updateComum = (
    field: keyof EquipamentoFormInput,
    value: string
  ) => {
    setComum((current) => ({ ...current, [field]: value }));
  };

  const updateLinha = (
    rowId: string,
    field: keyof EquipamentoFormInput,
    value: string
  ) => {
    setLinhas((current) =>
      current.map((linha) =>
        linha.rowId === rowId ? { ...linha, [field]: value } : linha
      )
    );
  };

  const handleEmpresaChange = (label: string, rowId?: string) => {
    const empresa = empresas.find((item) => getEmpresaLabel(item) === label);
    const setores = getSetoresEmpresa(empresa);

    if (!rowId) {
      setComum((current) => ({
        ...current,
        empresaId: empresa?.id || "",
        empresaSetorId:
          setores.length === 1 ? getSetorEmpresaId(empresa || null, setores[0]) : "",
        setor:
          setores.length === 1
            ? setores[0]
            : setores.includes(current.setor || "")
              ? current.setor
              : "",
      }));
      return;
    }

    setLinhas((current) =>
      current.map((linha) =>
        linha.rowId === rowId
          ? {
              ...linha,
              empresaId: empresa?.id || "",
              empresaSetorId:
                setores.length === 1
                  ? getSetorEmpresaId(empresa || null, setores[0])
                  : "",
              setor:
                setores.length === 1
                  ? setores[0]
                  : setores.includes(linha.setor || "")
                    ? linha.setor
                    : "",
            }
          : linha
      )
    );
  };

  const handleTipoChange = (label: string, rowId?: string) => {
    const tipo = tiposEquipamento.find((item) => item.nome === label);
    const patch = {
      tipoEquipamentoId: tipo?.id || "",
      tipoTexto: tipo ? "" : label,
    };

    if (!rowId) {
      setComum((current) => ({ ...current, ...patch }));
      return;
    }

    setLinhas((current) =>
      current.map((linha) =>
        linha.rowId === rowId ? { ...linha, ...patch } : linha
      )
    );
  };

  const toggleCampoComum = (campo: CampoLote, checked: boolean) => {
    if (!checked && camposComuns.has(campo)) {
      setLinhas((current) =>
        current.map((linha) => {
          if (campo === "empresa") {
            return {
              ...linha,
              empresaId: comum.empresaId,
              empresaSetorId: comum.empresaSetorId,
              setor: camposComuns.has("setor") ? comum.setor : linha.setor,
            };
          }

          if (campo === "tipo") {
            return {
              ...linha,
              tipoEquipamentoId: comum.tipoEquipamentoId,
              tipoTexto: comum.tipoTexto,
            };
          }

          const key = campo as keyof EquipamentoFormInput;
          return { ...linha, [key]: comum[key] };
        })
      );
    }

    setCamposComuns((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(campo);
        if (campo === "setor") next.add("empresa");
      } else {
        next.delete(campo);
        if (campo === "empresa") next.delete("setor");
      }

      return next;
    });
  };

  const adicionarLinha = () => setLinhas((current) => [...current, newRow()]);

  const duplicarLinha = (linha: LinhaLote) =>
    setLinhas((current) => [
      ...current,
      { ...linha, rowId: crypto.randomUUID() },
    ]);

  const removerLinha = (rowId: string) =>
    setLinhas((current) =>
      current.length === 1
        ? [newRow()]
        : current.filter((linha) => linha.rowId !== rowId)
    );

  const montarPayload = (linha: LinhaLote): EquipamentoFormInput => {
    const payload = { ...linha } as EquipamentoFormInput & { rowId?: string };
    delete payload.rowId;

    camposComuns.forEach((campo) => {
      if (campo === "empresa") {
        payload.empresaId = comum.empresaId;
        payload.empresaSetorId = comum.empresaSetorId;
      }
      else if (campo === "tipo") {
        payload.tipoEquipamentoId = comum.tipoEquipamentoId;
        payload.tipoTexto = comum.tipoTexto;
      } else {
        const key = campo as keyof EquipamentoFormInput;
        payload[key] = comum[key] as never;
      }
    });

    const empresa = empresaPorId(payload.empresaId);
    payload.empresaSetorId = getSetorEmpresaId(empresa, payload.setor);

    return trimInput(payload);
  };

  const validarDuplicados = (
    payloads: EquipamentoFormInput[],
    field: "tag" | "numeroSerie" | "patrimonio",
    label: string
  ) => {
    const vistos = new Map<string, number>();

    for (let index = 0; index < payloads.length; index += 1) {
      const value = payloads[index][field]?.trim().toLocaleLowerCase("pt-BR");
      if (!value) continue;

      const anterior = vistos.get(value);
      if (anterior !== undefined) {
        return `${label} repetido nas linhas ${anterior + 1} e ${index + 1}.`;
      }

      vistos.set(value, index);
    }

    return null;
  };

  const handleSave = async () => {
    const payloads = linhas.map(montarPayload);

    for (let index = 0; index < payloads.length; index += 1) {
      const equipamento = payloads[index];
      const linha = index + 1;

      if (!equipamento.empresaId) {
        toast({
          title: `Informe o proprietário na linha ${linha}.`,
          variant: "destructive",
        });
        return;
      }

      if (!equipamento.tipoEquipamentoId && !equipamento.tipoTexto?.trim()) {
        toast({
          title: `Informe o tipo na linha ${linha}.`,
          variant: "destructive",
        });
        return;
      }

    }

    const duplicado =
      validarDuplicados(payloads, "tag", "TAG") ||
      validarDuplicados(payloads, "numeroSerie", "Número de série") ||
      validarDuplicados(payloads, "patrimonio", "Patrimônio");

    if (duplicado) {
      toast({ title: duplicado, variant: "destructive" });
      return;
    }

    try {
      const cadastrados = await criarEmLote.mutateAsync(payloads);
      toast({
        title: `${cadastrados.length} equipamento(s) cadastrado(s) com sucesso!`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao cadastrar equipamentos",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const renderControl = (
    campo: CampoLote,
    form: EquipamentoFormInput,
    rowId?: string
  ) => {
    const setValue = (field: keyof EquipamentoFormInput, value: string) =>
      rowId ? updateLinha(rowId, field, value) : updateComum(field, value);

    if (campo === "empresa") {
      return (
        <SearchableSelect
          value={empresaLabelPorId(form.empresaId)}
          onValueChange={(value) => handleEmpresaChange(value, rowId)}
          options={empresaOptions}
          placeholder="Selecione a empresa"
          emptyText="Nenhuma empresa encontrada."
          disabled={saving}
        />
      );
    }

    if (campo === "tipo") {
      return (
        <SearchableSelect
          value={tipoLabel(form)}
          onValueChange={(value) => handleTipoChange(value, rowId)}
          options={tipoOptions}
          placeholder="Selecione o tipo"
          emptyText="Nenhum tipo encontrado."
          onAddNew={() => setNovoTipoTarget(rowId || "comum")}
          addNewLabel="Cadastrar novo tipo"
          disabled={saving}
        />
      );
    }

    if (campo === "setor") {
      const empresaId = camposComuns.has("empresa")
        ? comum.empresaId
        : form.empresaId;
      const empresa = empresaPorId(empresaId);
      const setores = getSetoresEmpresa(empresa);
      const setSetor = (value: string) => {
        setValue("setor", value);
        setValue("empresaSetorId", getSetorEmpresaId(empresa, value));
      };

      return setores.length ? (
        <SearchableSelect
          value={form.setor || ""}
          onValueChange={setSetor}
          options={setores}
          placeholder="Selecione o setor"
          emptyText="Nenhum setor encontrado."
          disabled={saving}
        />
      ) : (
        <Input
          value={form.setor || ""}
          onChange={(event) => setValue("setor", event.target.value)}
          placeholder="Setor"
          disabled={saving}
        />
      );
    }

    if (campo === "status") {
      return (
        <Select
          value={form.status || "Ativo"}
          onValueChange={(value) => setValue("status", value)}
          disabled={saving}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const dateFields: CampoLote[] = [
      "dataUltimaPreventiva",
      "dataProximaPreventiva",
      "dataUltimaCalibracao",
      "dataProximaCalibracao",
    ];
    const key = campo as keyof EquipamentoFormInput;

    return (
      <Input
        type={dateFields.includes(campo) ? "date" : "text"}
        value={(form[key] as string) || ""}
        onChange={(event) => setValue(key, event.target.value)}
        placeholder={campo === "observacoes" ? "Observações" : undefined}
        disabled={saving}
      />
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[1500px] overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CopyPlus className="h-5 w-5 text-primary" />
            Adicionar múltiplos equipamentos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione os campos iguais para o lote e preencha uma linha para cada equipamento.
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-4 rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">Campos comuns</h3>
              <p className="text-sm text-muted-foreground">
                Os campos marcados serão preenchidos uma única vez e aplicados a todas as linhas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
              {campos.map((campo) => (
                <label
                  key={campo.key}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={camposComuns.has(campo.key)}
                    onCheckedChange={(checked) =>
                      toggleCampoComum(campo.key, checked === true)
                    }
                    disabled={saving}
                  />
                  <span>{campo.label.replace(" *", "")}</span>
                </label>
              ))}
            </div>

            {camposComuns.size > 0 && (
              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {campos
                  .filter((campo) => camposComuns.has(campo.key))
                  .map((campo) => (
                    <div key={campo.key} className="space-y-2">
                      <Label>{campo.label}</Label>
                      {renderControl(campo.key, comum)}
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h3 className="font-semibold">Equipamentos do lote</h3>
                <p className="text-sm text-muted-foreground">
                  {linhas.length} equipamento(s) preparado(s) para cadastro.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={adicionarLinha} disabled={saving}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar linha
              </Button>
            </div>

            <div className="max-h-[42vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <tr className="border-b">
                    <th className="w-14 px-3 py-3 text-center font-medium text-muted-foreground">#</th>
                    {camposPorLinha.map((campo) => (
                      <th
                        key={campo.key}
                        className={`${campo.width} px-2 py-3 text-left font-medium text-muted-foreground`}
                      >
                        {campo.label}
                      </th>
                    ))}
                    <th className="sticky right-0 min-w-[92px] bg-muted/95 px-3 py-3 text-right font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, index) => {
                    return (
                      <tr key={linha.rowId} className="border-b last:border-0">
                        <td className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        {camposPorLinha.map((campo) => (
                          <td key={campo.key} className={`${campo.width} px-2 py-2 align-top`}>
                            {renderControl(campo.key, linha, linha.rowId)}
                          </td>
                        ))}
                        <td className="sticky right-0 bg-background px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Duplicar linha"
                              onClick={() => duplicarLinha(linha)}
                              disabled={saving}
                            >
                              <CopyPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Remover linha"
                              onClick={() => removerLinha(linha.rowId)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? "Cadastrando..."
              : `Cadastrar ${linhas.length} equipamento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <TipoEquipamentoQuickAddDialog
      open={Boolean(novoTipoTarget)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setNovoTipoTarget(null);
      }}
      onCreated={(tipo) => {
        if (novoTipoTarget === "comum") {
          setComum((current) => ({
            ...current,
            tipoEquipamentoId: tipo.id,
            tipoTexto: "",
          }));
        } else if (novoTipoTarget) {
          setLinhas((current) =>
            current.map((linha) =>
              linha.rowId === novoTipoTarget
                ? {
                    ...linha,
                    tipoEquipamentoId: tipo.id,
                    tipoTexto: "",
                  }
                : linha
            )
          );
        }
      }}
    />
    </>
  );
};

export default EquipamentosLoteDialog;

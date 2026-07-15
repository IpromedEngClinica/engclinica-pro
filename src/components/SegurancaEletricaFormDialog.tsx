import { Fragment, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
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
import { useCalibracaoPadroes } from "@/hooks/useCalibracaoPadroes";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import type { CalibracaoPadrao } from "@/services/calibracaoPadroesService";
import {
  useAtualizarSegurancaEletrica,
  useCriarSegurancaEletrica,
} from "@/hooks/useSegurancaEletrica";
import { toast } from "@/hooks/use-toast";
import type {
  SegurancaEletricaExecucao,
  SegurancaEletricaFormInput,
} from "@/services/segurancaEletricaService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import {
  avaliarResultadoSegurancaEletrica,
  criarResultadosSegurancaEletricaVazios,
  formatDecimalSeguranca,
  type SegurancaEletricaResultadoInput,
} from "@/utils/segurancaEletricaTemplate";
import { useAuth } from "@/contexts/AuthContext";

type DialogMode = "create" | "edit";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao?: SegurancaEletricaExecucao | null;
  mode?: DialogMode;
};

type FormState = {
  empresaId: string;
  equipamentoId: string;
  padraoId: string;
  classeEquipamento: string;
  tipoParteAplicada: string;
  temperaturaAmbienteTexto: string;
  umidadeRelativaTexto: string;
  localEnsaio: string;
  dataTeste: string;
  dataEmissao: string;
  dataValidade: string;
  tecnicoExecutorNome: string;
  responsavelTecnicoNome: string;
  responsavelSolicitante: string;
  observacoes: string;
};

const RESPONSAVEL_PADRAO = "Ícaro Heitor Piris Rezende";

const LOCAL_ENSAIO_OPTIONS = [
  "Dependências da Contratada",
  "Dependências da Contratante",
];

const today = () => new Date().toISOString().slice(0, 10);

const addOneYear = (date: string) => {
  const base = date ? new Date(`${date}T00:00:00`) : new Date();
  base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().slice(0, 10);
};

const emptyForm = (tecnicoExecutorNome = ""): FormState => {
  const data = today();

  return {
    empresaId: "",
    equipamentoId: "",
    padraoId: "",
    classeEquipamento: "Classe I",
    tipoParteAplicada: "Tipo BF",
    temperaturaAmbienteTexto: "21 a 25",
    umidadeRelativaTexto: "45 a 75",
    localEnsaio: LOCAL_ENSAIO_OPTIONS[0],
    dataTeste: data,
    dataEmissao: data,
    dataValidade: addOneYear(data),
    tecnicoExecutorNome,
    responsavelTecnicoNome: RESPONSAVEL_PADRAO,
    responsavelSolicitante: "",
    observacoes: "",
  };
};

const getEmpresaLabel = (empresa?: { nome?: string; nome_fantasia?: string | null }) =>
  empresa?.nome || empresa?.nome_fantasia || "";

const getEmpresaSearchText = (empresa: {
  nome?: string | null;
  nome_fantasia?: string | null;
  cpf_cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  contato?: string | null;
  email?: string | null;
  celular?: string | null;
  telefone?: string | null;
}) =>
  [
    empresa.nome,
    empresa.nome_fantasia,
    empresa.cpf_cnpj,
    empresa.cidade,
    empresa.estado,
    empresa.contato,
    empresa.email,
    empresa.celular,
    empresa.telefone,
  ]
    .filter(Boolean)
    .join(" ");

const normalizeSearchText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const findAnalisadorSegurancaEletrica = (padroes: CalibracaoPadrao[]) =>
  padroes.find((padrao) => {
    const searchText = normalizeSearchText(
      [padrao.nome_padrao, padrao.descricao, padrao.fabricante, padrao.modelo]
        .filter(Boolean)
        .join(" ")
    );

    return (
      searchText.includes("analisador") &&
      searchText.includes("seguranca") &&
      searchText.includes("eletrica")
    );
  }) || null;

const normalizeLocalEnsaio = (value?: string | null) => {
  const normalizedValue = normalizeSearchText(value);
  return (
    LOCAL_ENSAIO_OPTIONS.find(
      (option) => normalizeSearchText(option) === normalizedValue
    ) || LOCAL_ENSAIO_OPTIONS[0]
  );
};

const groupResults = (resultados: SegurancaEletricaResultadoInput[]) =>
  resultados.reduce<Record<string, SegurancaEletricaResultadoInput[]>>(
    (acc, item) => {
      if (!acc[item.grupo]) acc[item.grupo] = [];
      acc[item.grupo].push(item);
      return acc;
    },
    {}
  );

const SegurancaEletricaFormDialog = ({
  open,
  onOpenChange,
  execucao = null,
  mode = "create",
}: Props) => {
  const { usuario } = useAuth();
  const { data: empresas = [] } = useEmpresas();
  const { data: padroes = [] } = useCalibracaoPadroes();
  const criar = useCriarSegurancaEletrica();
  const atualizar = useAtualizarSegurancaEletrica();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [resultados, setResultados] = useState<SegurancaEletricaResultadoInput[]>(
    criarResultadosSegurancaEletricaVazios()
  );
  const {
    data: equipamentos = [],
    isFetching: isFetchingEquipamentos,
  } = useEquipamentos(
    { empresaId: form.empresaId, statusFiltro: "ativos" },
    { enabled: open && Boolean(form.empresaId) }
  );

  const isSubmitting = criar.isPending || atualizar.isPending;
  const equipamentoSelecionado = equipamentos.find(
    (equipamento) => equipamento.id === form.equipamentoId
  );
  const analisadorSegurancaEletrica = useMemo(
    () => findAnalisadorSegurancaEletrica(padroes),
    [padroes]
  );

  const empresasOptions = empresas.map((empresa) => ({
    value: empresa.id,
    label: getEmpresaLabel(empresa),
    searchText: getEmpresaSearchText(empresa),
  }));
  const equipamentosOptions = equipamentos.map((equipamento) =>
    getEquipamentoLabel(equipamento)
  );

  const grouped = useMemo(() => groupResults(resultados), [resultados]);

  useEffect(() => {
    if (!open) return;

    if (execucao && mode === "edit") {
      setForm({
        empresaId: execucao.empresa_id,
        equipamentoId: execucao.equipamento_id,
        padraoId: execucao.padrao_id || "",
        classeEquipamento: execucao.classe_equipamento || "Classe I",
        tipoParteAplicada: execucao.tipo_parte_aplicada || "Tipo BF",
        temperaturaAmbienteTexto: execucao.temperatura_ambiente_texto || "21 a 25",
        umidadeRelativaTexto: execucao.umidade_relativa_texto || "45 a 75",
        localEnsaio: normalizeLocalEnsaio(execucao.local_ensaio),
        dataTeste: execucao.data_teste,
        dataEmissao: execucao.data_emissao,
        dataValidade: execucao.data_validade || addOneYear(execucao.data_teste),
        tecnicoExecutorNome: execucao.tecnico_executor_nome,
        responsavelTecnicoNome:
          execucao.responsavel_tecnico_nome || RESPONSAVEL_PADRAO,
        responsavelSolicitante: execucao.responsavel_solicitante || "",
        observacoes: execucao.observacoes || "",
      });
      setResultados(
        (execucao.resultados || []).map((resultado) => ({
          grupo: resultado.grupo,
          caracteristica: resultado.caracteristica,
          unidade: resultado.unidade,
          valorEsperadoTexto: resultado.valor_esperado_texto,
          valorEsperadoNumero: resultado.valor_esperado_numero,
          operadorLimite: resultado.operador_limite,
          valorRegistrado: resultado.valor_registrado,
          valorRegistradoTexto: resultado.valor_registrado_texto,
          desvio: resultado.desvio,
          desvioTexto: resultado.desvio_texto,
          resultado: resultado.resultado,
        }))
      );
      return;
    }

    setForm(emptyForm(usuario?.nome || ""));
    setResultados(criarResultadosSegurancaEletricaVazios());
  }, [execucao, mode, open, usuario?.nome]);

  useEffect(() => {
    if (!open || form.padraoId || !analisadorSegurancaEletrica?.id) return;

    setForm((current) => ({
      ...current,
      padraoId: current.padraoId || analisadorSegurancaEletrica.id,
    }));
  }, [analisadorSegurancaEletrica?.id, form.padraoId, open]);

  const updateResultado = (index: number, valor: string) => {
    setResultados((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const parsed = valor === "" ? null : Number(valor);
        const calculado = avaliarResultadoSegurancaEletrica({
          ...item,
          valorRegistrado: parsed,
          valorRegistradoTexto: valor,
        });

        return {
          ...item,
          valorRegistrado: parsed,
          valorRegistradoTexto: valor,
          ...calculado,
        };
      })
    );
  };

  const buildPayload = (): SegurancaEletricaFormInput => ({
    empresaId: form.empresaId,
    equipamentoId: form.equipamentoId,
    padraoId: form.padraoId || analisadorSegurancaEletrica?.id || null,
    classeEquipamento: form.classeEquipamento,
    tipoParteAplicada: form.tipoParteAplicada,
    temperaturaAmbienteTexto: form.temperaturaAmbienteTexto,
    umidadeRelativaTexto: form.umidadeRelativaTexto,
    localEnsaio: form.localEnsaio,
    dataTeste: form.dataTeste,
    dataEmissao: form.dataEmissao,
    dataValidade: form.dataValidade,
    tecnicoExecutorNome: form.tecnicoExecutorNome,
    responsavelTecnicoNome: form.responsavelTecnicoNome,
    responsavelSolicitante: form.responsavelSolicitante,
    observacoes: form.observacoes,
    status: "fechada",
    resultados,
  });

  const handleSubmit = async () => {
    try {
      if (mode === "edit" && execucao) {
        await atualizar.mutateAsync({ id: execucao.id, input: buildPayload() });
        toast({ title: "Certificado de segurança elétrica atualizado." });
      } else {
        await criar.mutateAsync(buildPayload());
        toast({ title: "Certificado de segurança elétrica criado." });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar segurança elétrica",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {mode === "edit" ? "Editar Segurança Elétrica" : "Nova Segurança Elétrica"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <section className="rounded-lg border border-l-4 border-l-primary/70 p-5 space-y-4">
            <h3 className="text-base font-bold">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchableSelect
                  value={form.empresaId}
                  onValueChange={(value) => {
                    setForm((current) => ({
                      ...current,
                      empresaId: value,
                      equipamentoId: "",
                    }));
                  }}
                  options={empresasOptions}
                  placeholder="Selecione o cliente"
                  emptyText="Nenhum cliente encontrado."
                />
              </div>
              <div className="space-y-2">
                <Label>Equipamento *</Label>
                <SearchableSelect
                  value={getEquipamentoLabel(equipamentoSelecionado)}
                  onValueChange={(value) => {
                    const equipamento = equipamentos.find(
                      (item) => getEquipamentoLabel(item) === value
                    );
                    setForm((current) => ({
                      ...current,
                      equipamentoId: equipamento?.id || "",
                      empresaId: equipamento?.empresa_id || current.empresaId,
                    }));
                  }}
                  options={equipamentosOptions}
                  placeholder={
                    form.empresaId
                      ? isFetchingEquipamentos && equipamentos.length === 0
                        ? "Carregando equipamentos..."
                        : "Selecione o equipamento"
                      : "Selecione um cliente primeiro"
                  }
                  emptyText={
                    form.empresaId
                      ? "Nenhum equipamento encontrado."
                      : "Selecione um cliente primeiro."
                  }
                  disabled={
                    !form.empresaId ||
                    (isFetchingEquipamentos && equipamentos.length === 0)
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-l-4 border-l-primary/70 p-5 space-y-4">
            <h3 className="text-base font-bold">Dados do ensaio</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select
                  value={form.classeEquipamento}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, classeEquipamento: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classe I">Classe I</SelectItem>
                    <SelectItem value="Classe II">Classe II</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo da parte aplicada</Label>
                <Select
                  value={form.tipoParteAplicada}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, tipoParteAplicada: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tipo B">Tipo B</SelectItem>
                    <SelectItem value="Tipo BF">Tipo BF</SelectItem>
                    <SelectItem value="Tipo CF">Tipo CF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura (ºC)</Label>
                <Input
                  value={form.temperaturaAmbienteTexto}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      temperaturaAmbienteTexto: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>U.R. (%)</Label>
                <Input
                  value={form.umidadeRelativaTexto}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      umidadeRelativaTexto: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data do teste *</Label>
                <Input
                  type="date"
                  value={form.dataTeste}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      dataTeste: value,
                      dataValidade: addOneYear(value),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de emissão *</Label>
                <Input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dataEmissao: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Próxima certificação</Label>
                <Input
                  type="date"
                  value={form.dataValidade}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dataValidade: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Local do ensaio</Label>
                <Select
                  value={form.localEnsaio}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, localEnsaio: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCAL_ENSAIO_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-l-4 border-l-primary/70 p-5 space-y-4">
            <h3 className="text-base font-bold">Responsáveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Técnico executor *</Label>
                <Input
                  value={form.tecnicoExecutorNome}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tecnicoExecutorNome: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável técnico *</Label>
                <Input
                  value={form.responsavelTecnicoNome}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsavelTecnicoNome: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável solicitante</Label>
                <Input
                  value={form.responsavelSolicitante}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsavelSolicitante: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-l-4 border-l-primary/70 p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold">Leituras do ensaio</h3>
              <p className="text-sm text-muted-foreground">
                Template fixo conforme NBR IEC 60601-1. Informe os valores registrados.
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Característica</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Esperado</th>
                    <th className="px-3 py-2 text-left">Registrado</th>
                    <th className="px-3 py-2 text-left">Desvio</th>
                    <th className="px-3 py-2 text-left">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([grupo, itens]) => (
                    <Fragment key={grupo}>
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-3 py-2 text-center font-semibold">
                          {grupo}
                        </td>
                      </tr>
                      {itens.map((item) => {
                        const index = resultados.findIndex(
                          (resultado) =>
                            resultado.grupo === item.grupo &&
                            resultado.caracteristica === item.caracteristica
                        );
                        return (
                          <tr key={`${item.grupo}-${item.caracteristica}`} className="border-t">
                            <td className="px-3 py-2">{item.caracteristica}</td>
                            <td className="px-3 py-2">{item.unidade}</td>
                            <td className="px-3 py-2">{item.valorEsperadoTexto}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.valorRegistradoTexto || ""}
                                onChange={(event) =>
                                  updateResultado(index, event.target.value)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              {item.desvioTexto ||
                                (item.desvio == null
                                  ? "N/A"
                                  : formatDecimalSeguranca(item.desvio))}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {item.resultado === "aprovado"
                                ? "APROVADO"
                                : item.resultado === "reprovado"
                                  ? "REPROVADO"
                                  : "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-l-4 border-l-primary/70 p-5 space-y-2">
            <Label>Observações</Label>
            <Textarea
              rows={4}
              value={form.observacoes}
              onChange={(event) =>
                setForm((current) => ({ ...current, observacoes: event.target.value }))
              }
            />
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Salvar certificado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SegurancaEletricaFormDialog;

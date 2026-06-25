import { AlertCircle, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CalibracaoExecucaoTabelaEditor from "@/components/CalibracaoExecucaoTabelaEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAtualizarCalibracaoExecucao,
  useCriarCalibracaoExecucao,
  useEditarCalibracaoFinalizada,
  useSalvarCalibracaoFinalizada,
} from "@/hooks/useCalibracaoExecucoes";
import { useCalibracaoPadroesValidos, useCalibracaoProcedimentos } from "@/hooks/useCalibracaoProcedimentos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { toast } from "@/hooks/use-toast";
import {
  criarTabelasExecucaoDoProcedimento,
  criarTabelasInputDaExecucao,
  type CalibracaoExecucao,
  type CalibracaoExecucaoFormInput,
  type CalibracaoExecucaoTabelaInput,
} from "@/services/calibracaoExecucoesService";
import { equipamentosService } from "@/services/equipamentosService";
import { mesValidadeAposMeses } from "@/utils/calibracaoValidade";
import { formatDecimalPtBr, normalizeDecimalInput } from "@/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao?: CalibracaoExecucao | null;
  empresaInicialId?: string | null;
  equipamentoInicialId?: string | null;
  procedimentoInicialId?: string | null;
  dataRealizacaoInicial?: string | null;
  dataEmissaoInicial?: string | null;
  planoCicloItemId?: string | null;
  onSaved?: (execucao: CalibracaoExecucao) => void;
  onFinalizada?: (execucao: CalibracaoExecucao) => void | Promise<void>;
}

const RESPONSAVEL_TECNICO = "Ícaro Heitor Piris Rezende";
const REGISTRO_RESPONSAVEL = "142085302-3";
const LOCAL_OPTIONS: [string, string][] = [
  ["dependencias_contratada", "Dependências da Contratada"],
  ["dependencias_contratante", "Dependências da Contratante"],
];

const procedimentoAtendeTipoEquipamento = (
  procedimento: {
    tipo_equipamento_id: string | null;
    tipos_equipamento?: { id: string }[];
  },
  tipoEquipamentoId?: string | null
) => {
  if (!tipoEquipamentoId) return false;
  if (procedimento.tipos_equipamento?.length) {
    return procedimento.tipos_equipamento.some(
      (tipo) => tipo.id === tipoEquipamentoId
    );
  }
  return procedimento.tipo_equipamento_id === tipoEquipamentoId;
};

const hoje = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const vazio = (tecnico = "") => ({
  empresaId: "", equipamentoId: "", procedimentoId: "",
  local: "dependencias_contratada", temperatura: "21,0", incertezaTemperatura: "0,5",
  umidade: "50", incertezaUmidade: "5", pressao: "", incertezaPressao: "",
  observacoes: "", dataCalibracao: hoje(), dataEmissao: hoje(),
  validadeMes: mesValidadeAposMeses(new Date()), tecnico, registroTecnico: "",
  solicitante: "", criterioPadraoCliente: false,
});

const CalibracaoExecucaoFormDialog = ({
  open,
  onOpenChange,
  execucao = null,
  empresaInicialId,
  equipamentoInicialId,
  procedimentoInicialId,
  dataRealizacaoInicial,
  dataEmissaoInicial,
  planoCicloItemId,
  onSaved,
  onFinalizada,
}: Props) => {
  const { usuario } = useAuth();
  const [form, setForm] = useState(vazio);
  const [tabelas, setTabelas] = useState<CalibracaoExecucaoTabelaInput[]>([]);
  const [activeTabela, setActiveTabela] = useState("0");
  const { data: empresas = [] } = useEmpresas();
  const { data: equipamentos = [] } = useEquipamentos({ empresaId: form.empresaId });
  const { data: procedimentos = [] } = useCalibracaoProcedimentos();
  const { data: padroes = [] } = useCalibracaoPadroesValidos(form.dataCalibracao);
  const criar = useSalvarCalibracaoFinalizada();
  const atualizar = useEditarCalibracaoFinalizada();
  const criarRascunho = useCriarCalibracaoExecucao();
  const atualizarRascunho = useAtualizarCalibracaoExecucao();
  const saving = criar.isPending || atualizar.isPending || criarRascunho.isPending || atualizarRascunho.isPending;
  const navigate = useNavigate();
  const equipamento = equipamentos.find((item) => item.id === form.equipamentoId);
  const empresa = empresas.find((item) => item.id === form.empresaId);
  const possuiCriterio = tabelas.some((tabela) => tabela.incluirCriterio);
  const possuiPadraoSemValidade = tabelas.some(
    (tabela) =>
      Boolean(tabela.padraoId) &&
      !padroes.some((padrao) => padrao.id === tabela.padraoId)
  );

  const procedimentosCompativeis = useMemo(() =>
    [...procedimentos]
      .filter((item) =>
        item.ativo &&
        procedimentoAtendeTipoEquipamento(item, equipamento?.tipo_equipamento_id)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [equipamento?.tipo_equipamento_id, procedimentos]
  );

  useEffect(() => {
    if (!open) return;
    if (!execucao) {
      const procedimentoInicial = procedimentoInicialId
        ? procedimentos.find((item) => item.id === procedimentoInicialId)
        : null;
      setForm({
        ...vazio(usuario?.nome || ""),
        empresaId: empresaInicialId || "",
        equipamentoId: equipamentoInicialId || "",
        procedimentoId: procedimentoInicial?.id || "",
        dataCalibracao: dataRealizacaoInicial || hoje(),
        dataEmissao: dataEmissaoInicial || dataRealizacaoInicial || hoje(),
      });
      setTabelas(procedimentoInicial ? criarTabelasExecucaoDoProcedimento(procedimentoInicial, false) : []);
      setActiveTabela("0");
      return;
    }
    setForm({
      empresaId: execucao.empresa_id, equipamentoId: execucao.equipamento_id, procedimentoId: execucao.procedimento_id,
      local: execucao.local_calibracao || "dependencias_contratada", temperatura: formatDecimalPtBr(execucao.temperatura_ambiente),
      incertezaTemperatura: formatDecimalPtBr(execucao.incerteza_temperatura), umidade: formatDecimalPtBr(execucao.umidade_relativa),
      incertezaUmidade: formatDecimalPtBr(execucao.incerteza_umidade), pressao: formatDecimalPtBr(execucao.pressao_atmosferica),
      incertezaPressao: formatDecimalPtBr(execucao.incerteza_pressao), observacoes: execucao.observacoes || "",
      dataCalibracao: execucao.data_calibracao, dataEmissao: execucao.data_emissao,
      validadeMes: (execucao.validade_mes || execucao.data_validade || "").slice(0, 7),
      tecnico: execucao.tecnico_executor_nome, registroTecnico: execucao.tecnico_executor_registro || "",
      solicitante: execucao.responsavel_solicitante || "",
      criterioPadraoCliente: execucao.criterio_conformidade_aplicado,
    });
    setTabelas(criarTabelasInputDaExecucao(execucao));
    setActiveTabela("0");
  }, [dataEmissaoInicial, dataRealizacaoInicial, empresaInicialId, equipamentoInicialId, execucao, open, procedimentoInicialId, procedimentos, usuario?.nome]);

  useEffect(() => {
    if (!open || execucao || !equipamentoInicialId) return;

    let ativo = true;

    equipamentosService.buscarPorId(equipamentoInicialId)
      .then((equipamentoInicial) => {
        if (!ativo) return;
        setForm((current) => ({
          ...current,
          empresaId: equipamentoInicial.empresa_id || empresaInicialId || "",
          equipamentoId: equipamentoInicial.id,
          procedimentoId: "",
        }));
        setTabelas([]);
        setActiveTabela("0");
      })
      .catch((error) => {
        if (!ativo) return;
        toast({
          title: "Erro ao carregar equipamento",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      });

    return () => {
      ativo = false;
    };
  }, [empresaInicialId, equipamentoInicialId, execucao, open]);

  useEffect(() => {
    if (!open || execucao || !form.empresaId) return;
    const selecionada = empresas.find((item) => item.id === form.empresaId);
    if (!selecionada) return;

    setForm((current) =>
      current.criterioPadraoCliente ===
      selecionada.incluir_criterio_aceitacao_calibracao
        ? current
        : {
            ...current,
            criterioPadraoCliente:
              selecionada.incluir_criterio_aceitacao_calibracao,
          }
    );
  }, [empresas, execucao, form.empresaId, open]);

  const update = (field: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [field]: value }));
  const optional = (value: string) => value.trim() ? normalizeDecimalInput(value) : null;
  const selecionarProcedimento = (procedimentoId: string) => {
    update("procedimentoId", procedimentoId);
    const procedimento = procedimentos.find((item) => item.id === procedimentoId);
    setTabelas(procedimento ? criarTabelasExecucaoDoProcedimento(procedimento, form.criterioPadraoCliente) : []);
    setActiveTabela("0");
  };
  const selecionarEmpresa = (empresaId: string) => {
    const selecionada = empresas.find((item) => item.id === empresaId);
    setForm((current) => ({
      ...current,
      empresaId,
      equipamentoId: "",
      procedimentoId: "",
      criterioPadraoCliente:
        selecionada?.incluir_criterio_aceitacao_calibracao ?? false,
    }));
    setTabelas([]);
  };
  const selecionarEquipamento = (equipamentoId: string) => {
    setForm((current) => ({ ...current, equipamentoId, procedimentoId: "" }));
    setTabelas([]);
  };

  useEffect(() => {
    if (
      form.equipamentoId &&
      procedimentosCompativeis.length === 1 &&
      form.procedimentoId !== procedimentosCompativeis[0].id
    ) {
      const procedimento = procedimentosCompativeis[0];
      setForm((current) => ({ ...current, procedimentoId: procedimento.id }));
      setTabelas(criarTabelasExecucaoDoProcedimento(procedimento, form.criterioPadraoCliente));
      setActiveTabela("0");
    }
  }, [form.criterioPadraoCliente, form.equipamentoId, form.procedimentoId, procedimentosCompativeis]);

  const buildInput = (): CalibracaoExecucaoFormInput => ({
    empresaId: form.empresaId, equipamentoId: form.equipamentoId, procedimentoId: form.procedimentoId,
    localCalibracao: form.local, temperaturaAmbiente: optional(form.temperatura), incertezaTemperatura: optional(form.incertezaTemperatura),
    umidadeRelativa: optional(form.umidade), incertezaUmidade: optional(form.incertezaUmidade),
    pressaoAtmosferica: optional(form.pressao), incertezaPressao: optional(form.incertezaPressao), observacoes: form.observacoes,
    dataCalibracao: form.dataCalibracao, dataEmissao: form.dataEmissao, validadeMes: form.validadeMes,
    tecnicoExecutorNome: form.tecnico, tecnicoExecutorRegistro: form.registroTecnico,
    responsavelTecnicoNome: RESPONSAVEL_TECNICO, responsavelTecnicoRegistro: REGISTRO_RESPONSAVEL,
    responsavelSolicitante: form.solicitante, criterioConformidadeAplicado: possuiCriterio,
    tabelas,
  });

  const removerTabela = (index: number) => {
    if (tabelas.length <= 1) {
      toast({
        title: "A calibracao deve possuir ao menos uma tabela.",
        variant: "destructive",
      });
      return;
    }
    const tabela = tabelas[index];
    if (
      !window.confirm(
        `Deseja remover a tabela "${tabela.nome}" somente desta calibracao?\nEssa acao nao altera o procedimento original.`
      )
    ) {
      return;
    }
    setTabelas((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveTabela(String(Math.max(0, Math.min(index, tabelas.length - 2))));
  };

  const salvar = async () => {
    try {
      const input = buildInput();
      const salva = execucao
        ? await atualizar.mutateAsync({ id: execucao.id, input })
        : await criar.mutateAsync(input);
      toast(
        equipamentoInicialId && !execucao
          ? {
              title: "Calibracao salva",
              description:
                "A calibracao foi vinculada ao equipamento com sucesso.",
            }
          : {
              title: execucao
                ? "Calibracao revisada e certificado atualizado."
                : "Calibracao salva e certificado gerado.",
            }
      );
      onSaved?.(salva);
      await onFinalizada?.(salva);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  const salvarRascunho = async () => {
    try {
      const input = buildInput();
      const salva = execucao
        ? await atualizarRascunho.mutateAsync({ id: execucao.id, input })
        : await criarRascunho.mutateAsync(input);
      toast({
        title: planoCicloItemId
          ? "Rascunho de calibracao salvo. O item permanece em aberto."
          : "Rascunho de calibracao salvo.",
      });
      onSaved?.(salva);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar rascunho", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[97vw]">
      <DialogHeader className="border-b px-5 py-3"><DialogTitle>{execucao ? "Editar Calibracao" : "Nova Calibracao"}</DialogTitle></DialogHeader>
      <div className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-3 xl:grid-cols-2">
          <Card><Header title="1. Identificacao" /><CardContent className="grid gap-3 p-3 md:grid-cols-2">
            <SelectField label="Empresa *" value={form.empresaId} onChange={selecionarEmpresa} options={empresas.map((item) => [item.id, item.nome_fantasia || item.nome])} />
            <SelectField label="Equipamento *" value={form.equipamentoId} onChange={selecionarEquipamento} options={equipamentos.map((item) => [item.id, [item.tipo_equipamento?.nome || item.tipo_texto, item.modelo, item.numero_serie || item.tag || item.patrimonio].filter(Boolean).join(" - ")])} />
            <SelectField label="Procedimento *" value={form.procedimentoId} onChange={selecionarProcedimento} options={procedimentosCompativeis.map((item) => [item.id, item.nome])} />
            {form.equipamentoId && procedimentosCompativeis.length === 0 && <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2"><AlertCircle className="h-4 w-4 shrink-0" /><div><p>Nenhum procedimento de calibração cadastrado para este tipo de equipamento.</p><Button type="button" variant="link" className="h-auto p-0 text-amber-900" onClick={() => navigate("/calibracao/procedimentos")}>Cadastrar procedimento</Button></div></div>}
            <Area label="Observacoes" value={form.observacoes} onChange={(value) => update("observacoes", value)} />
          </CardContent></Card>
          <Card><Header title="2. Condicoes ambientais" /><CardContent className="grid gap-3 p-3 md:grid-cols-2">
            <SelectField label="Local *" value={form.local} onChange={(value) => update("local", value)} options={LOCAL_OPTIONS} />
            <NumericField label="Temperatura ambiente (°C)" value={form.temperatura} onChange={(value) => update("temperatura", value)} />
            <NumericField label="Incerteza temperatura (°C)" value={form.incertezaTemperatura} onChange={(value) => update("incertezaTemperatura", value)} />
            <NumericField label="Umidade relativa (%)" value={form.umidade} onChange={(value) => update("umidade", value)} />
            <NumericField label="Incerteza umidade (%)" value={form.incertezaUmidade} onChange={(value) => update("incertezaUmidade", value)} />
          </CardContent></Card>
        </div>
        <Card><Header title="3. Finalizacao" /><CardContent className="grid gap-3 p-3 md:grid-cols-3 xl:grid-cols-5">
          <Field type="date" label="Data da calibracao *" value={form.dataCalibracao} onChange={(value) => update("dataCalibracao", value)} />
          <Field type="date" label="Data de emissao *" value={form.dataEmissao} onChange={(value) => update("dataEmissao", value)} />
          <Field type="month" label="Validade *" value={form.validadeMes} onChange={(value) => update("validadeMes", value)} />
          <Field label="Tecnico executor *" value={form.tecnico} onChange={(value) => update("tecnico", value)} />
          <Field label="Responsavel solicitante" value={form.solicitante} onChange={(value) => update("solicitante", value)} />
          {empresa && <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm"><span className="block text-xs text-muted-foreground">Declaração de conformidade</span>{possuiCriterio ? "Aplicada nas tabelas marcadas" : "Não aplicada nesta calibração"}</div>}
        </CardContent></Card>
        <Card><Header title="4. Leituras da calibracao" /><CardContent className="p-2">
          {possuiPadraoSemValidade && (
            <div className="mb-3 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Existe tabela vinculada a um padrao sem certificado valido para a data da calibracao.
                Renove o certificado do padrao ou selecione um padrao valido antes de executar.
              </span>
            </div>
          )}
          {!tabelas.length ? <p className="text-sm text-muted-foreground">Selecione um procedimento para carregar as tabelas.</p> :
          <Tabs value={activeTabela} onValueChange={setActiveTabela}><TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 pb-1">{tabelas.map((item, index) => <TabsTrigger className="bg-muted px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" key={`${item.nome}-${index}`} value={String(index)}>{item.nome}</TabsTrigger>)}</TabsList>
            {tabelas.map((item, index) => <TabsContent className="mt-2" key={`${item.nome}-${index}`} value={String(index)}><CalibracaoExecucaoTabelaEditor tabela={item} padroes={padroes} onRemover={() => removerTabela(index)} onChange={(tabela) => setTabelas((current) => current.map((currentItem, itemIndex) => itemIndex === index ? tabela : currentItem))} /></TabsContent>)}
          </Tabs>}
        </CardContent></Card>
      </div>
      <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-5 py-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button variant="outline" disabled={saving} onClick={salvarRascunho}>Salvar rascunho</Button>
        <Button disabled={saving || possuiPadraoSemValidade} onClick={salvar}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar calibracao</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Header = ({ title }: { title: string }) => <CardHeader className="border-b bg-muted/30 px-3 py-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>;
const Field = ({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Input className="h-8" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
const NumericField = ({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Input className="h-8" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
const Area = ({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) => <div className="space-y-1 md:col-span-2"><Label className="text-xs">{label}</Label><Textarea className="min-h-14" value={value} rows={1} onChange={(event) => onChange(event.target.value)} /></div>;
const SelectField = ({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <div className="space-y-1"><Label className="text-xs">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select></div>;

export default CalibracaoExecucaoFormDialog;

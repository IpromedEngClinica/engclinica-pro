import { Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CalibracaoExecucaoTabelaEditor from "@/components/CalibracaoExecucaoTabelaEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAtualizarCalibracaoExecucao, useCriarCalibracaoExecucao } from "@/hooks/useCalibracaoExecucoes";
import { useCalibracaoPadroesValidos, useCalibracaoProcedimentos } from "@/hooks/useCalibracaoProcedimentos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { toast } from "@/hooks/use-toast";
import {
  criarTabelasExecucaoDoProcedimento,
  criarTabelasInputDaExecucao,
  formatNumeroCertificadoCalibracao,
  type CalibracaoExecucao,
  type CalibracaoExecucaoFormInput,
  type CalibracaoExecucaoTabelaInput,
} from "@/services/calibracaoExecucoesService";
import type { RegraDecisao } from "@/utils/calibracaoCalculos";
import { formatDecimalPtBr, normalizeDecimalInput } from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao?: CalibracaoExecucao | null;
}

const hoje = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};
const vazio = {
  empresaId: "", equipamentoId: "", procedimentoId: "", local: "",
  temperatura: "", incertezaTemperatura: "", umidade: "", incertezaUmidade: "",
  pressao: "", incertezaPressao: "", observacoes: "", dataCalibracao: hoje(),
  dataEmissao: hoje(), dataValidade: "", tecnico: "", registroTecnico: "",
  responsavelTecnico: "Ícaro Heitor Piris Rezende", registroResponsavel: "142085302-3",
  solicitante: "", criterio: false, regra: "considerando_incerteza" as RegraDecisao,
};

const CalibracaoExecucaoFormDialog = ({ open, onOpenChange, execucao = null }: Props) => {
  const [form, setForm] = useState(vazio);
  const [tabelas, setTabelas] = useState<CalibracaoExecucaoTabelaInput[]>([]);
  const [activeTabela, setActiveTabela] = useState("0");
  const { data: empresas = [] } = useEmpresas();
  const { data: equipamentos = [] } = useEquipamentos({ empresaId: form.empresaId });
  const { data: procedimentos = [] } = useCalibracaoProcedimentos();
  const { data: padroes = [] } = useCalibracaoPadroesValidos(form.dataCalibracao);
  const criar = useCriarCalibracaoExecucao();
  const atualizar = useAtualizarCalibracaoExecucao();
  const saving = criar.isPending || atualizar.isPending;
  const equipamento = equipamentos.find((item) => item.id === form.equipamentoId);

  const procedimentosOrdenados = useMemo(() =>
    [...procedimentos].filter((item) => item.ativo).sort((a, b) => {
      const aMatch = a.tipo_equipamento_id === equipamento?.tipo_equipamento_id ? 0 : 1;
      const bMatch = b.tipo_equipamento_id === equipamento?.tipo_equipamento_id ? 0 : 1;
      return aMatch - bMatch || a.nome.localeCompare(b.nome, "pt-BR");
    }), [equipamento?.tipo_equipamento_id, procedimentos]);

  useEffect(() => {
    if (!open) return;
    if (!execucao) {
      setForm({ ...vazio, dataCalibracao: hoje(), dataEmissao: hoje() });
      setTabelas([]);
      setActiveTabela("0");
      return;
    }
    setForm({
      empresaId: execucao.empresa_id, equipamentoId: execucao.equipamento_id, procedimentoId: execucao.procedimento_id,
      local: execucao.local_calibracao || "", temperatura: formatDecimalPtBr(execucao.temperatura_ambiente),
      incertezaTemperatura: formatDecimalPtBr(execucao.incerteza_temperatura), umidade: formatDecimalPtBr(execucao.umidade_relativa),
      incertezaUmidade: formatDecimalPtBr(execucao.incerteza_umidade), pressao: formatDecimalPtBr(execucao.pressao_atmosferica),
      incertezaPressao: formatDecimalPtBr(execucao.incerteza_pressao), observacoes: execucao.observacoes || "",
      dataCalibracao: execucao.data_calibracao, dataEmissao: execucao.data_emissao, dataValidade: execucao.data_validade || "",
      tecnico: execucao.tecnico_executor_nome, registroTecnico: execucao.tecnico_executor_registro || "",
      responsavelTecnico: execucao.responsavel_tecnico_nome, registroResponsavel: execucao.responsavel_tecnico_registro || "",
      solicitante: execucao.responsavel_solicitante || "", criterio: execucao.criterio_conformidade_aplicado,
      regra: execucao.regra_decisao || "considerando_incerteza",
    });
    setTabelas(criarTabelasInputDaExecucao(execucao));
    setActiveTabela("0");
  }, [execucao, open]);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const optional = (value: string) => value.trim() ? normalizeDecimalInput(value) : null;
  const selecionarProcedimento = (procedimentoId: string) => {
    update("procedimentoId", procedimentoId);
    const procedimento = procedimentos.find((item) => item.id === procedimentoId);
    setTabelas(procedimento ? criarTabelasExecucaoDoProcedimento(procedimento) : []);
    setActiveTabela("0");
  };

  const buildInput = (): CalibracaoExecucaoFormInput => ({
    empresaId: form.empresaId, equipamentoId: form.equipamentoId, procedimentoId: form.procedimentoId,
    localCalibracao: form.local, temperaturaAmbiente: optional(form.temperatura), incertezaTemperatura: optional(form.incertezaTemperatura),
    umidadeRelativa: optional(form.umidade), incertezaUmidade: optional(form.incertezaUmidade),
    pressaoAtmosferica: optional(form.pressao), incertezaPressao: optional(form.incertezaPressao), observacoes: form.observacoes,
    dataCalibracao: form.dataCalibracao, dataEmissao: form.dataEmissao, dataValidade: form.dataValidade,
    tecnicoExecutorNome: form.tecnico, tecnicoExecutorRegistro: form.registroTecnico,
    responsavelTecnicoNome: form.responsavelTecnico, responsavelTecnicoRegistro: form.registroResponsavel,
    responsavelSolicitante: form.solicitante, criterioConformidadeAplicado: form.criterio,
    regraDecisao: form.criterio ? form.regra : null, tabelas,
  });

  const salvar = async () => {
    try {
      const input = buildInput();
      if (execucao) await atualizar.mutateAsync({ id: execucao.id, input });
      else await criar.mutateAsync(input);
      toast({ title: execucao ? "Calibracao atualizada." : "Calibracao cadastrada." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[98vw]">
      <DialogHeader className="border-b px-6 py-4"><DialogTitle>{execucao ? "Editar Calibracao" : "Nova Calibracao"}</DialogTitle></DialogHeader>
      <div className="space-y-4 p-4 sm:p-6">
        <Card><Header title="1. Identificacao" /><CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Read label="Numero do certificado" value={formatNumeroCertificadoCalibracao(execucao?.numero_certificado)} />
          <SelectField label="Empresa *" value={form.empresaId} onChange={(empresaId) => setForm((current) => ({ ...current, empresaId, equipamentoId: "" }))} options={empresas.map((item) => [item.id, item.nome_fantasia || item.nome])} />
          <SelectField label="Equipamento *" value={form.equipamentoId} onChange={(value) => update("equipamentoId", value)} options={equipamentos.map((item) => [item.id, [item.tipo_equipamento?.nome || item.tipo_texto, item.modelo, item.numero_serie || item.tag || item.patrimonio].filter(Boolean).join(" - ")])} />
          <SelectField label="Procedimento *" value={form.procedimentoId} onChange={selecionarProcedimento} options={procedimentosOrdenados.map((item) => [item.id, item.nome])} />
          <Area label="Observacoes" value={form.observacoes} onChange={(value) => update("observacoes", value)} />
        </CardContent></Card>
        <Card><Header title="2. Condicoes ambientais" /><CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="Local" value={form.local} onChange={(value) => update("local", value)} />
          <Field label="Temperatura ambiente" value={form.temperatura} onChange={(value) => update("temperatura", value)} />
          <Field label="Incerteza da temperatura" value={form.incertezaTemperatura} onChange={(value) => update("incertezaTemperatura", value)} />
          <Field label="Umidade relativa" value={form.umidade} onChange={(value) => update("umidade", value)} />
          <Field label="Incerteza da umidade" value={form.incertezaUmidade} onChange={(value) => update("incertezaUmidade", value)} />
          <Field label="Pressao atmosferica" value={form.pressao} onChange={(value) => update("pressao", value)} />
          <Field label="Incerteza da pressao" value={form.incertezaPressao} onChange={(value) => update("incertezaPressao", value)} />
        </CardContent></Card>
        <Card><Header title="3. Finalizacao" /><CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Field type="date" label="Data da calibracao *" value={form.dataCalibracao} onChange={(value) => update("dataCalibracao", value)} />
          <Field type="date" label="Data de emissao *" value={form.dataEmissao} onChange={(value) => update("dataEmissao", value)} />
          <Field type="date" label="Validade" value={form.dataValidade} onChange={(value) => update("dataValidade", value)} />
          <Field label="Tecnico executor *" value={form.tecnico} onChange={(value) => update("tecnico", value)} />
          <Field label="Registro do tecnico executor" value={form.registroTecnico} onChange={(value) => update("registroTecnico", value)} />
          <Field label="Responsavel tecnico *" value={form.responsavelTecnico} onChange={(value) => update("responsavelTecnico", value)} />
          <Field label="Registro do responsavel tecnico" value={form.registroResponsavel} onChange={(value) => update("registroResponsavel", value)} />
          <Field label="Responsavel solicitante" value={form.solicitante} onChange={(value) => update("solicitante", value)} />
          <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox checked={form.criterio} onCheckedChange={(value) => update("criterio", Boolean(value))} /> Emitir declaracao de conformidade</label>
          {form.criterio && <SelectField label="Regra de decisao *" value={form.regra} onChange={(value) => update("regra", value)} options={[["considerando_incerteza", "Aceitacao considerando incerteza: |erro| + U <= limite"], ["aceitacao_simples", "Aceitacao simples: |erro| <= limite"]]} />}
        </CardContent></Card>
        <Card><Header title="4. Procedimento e tabelas" /><CardContent className="p-4">
          {!tabelas.length ? <p className="text-sm text-muted-foreground">Selecione um procedimento para carregar as tabelas.</p> :
          <Tabs value={activeTabela} onValueChange={setActiveTabela}><TabsList className="h-auto max-w-full justify-start overflow-x-auto">{tabelas.map((item, index) => <TabsTrigger key={`${item.nome}-${index}`} value={String(index)}>{item.nome}</TabsTrigger>)}</TabsList>
            {tabelas.map((item, index) => <TabsContent key={`${item.nome}-${index}`} value={String(index)}><CalibracaoExecucaoTabelaEditor tabela={item} padroes={padroes} regraDecisao={form.criterio ? form.regra : null} aplicarCriterio={form.criterio} onChange={(tabela) => setTabelas((current) => current.map((currentItem, itemIndex) => itemIndex === index ? tabela : currentItem))} /></TabsContent>)}
          </Tabs>}
        </CardContent></Card>
      </div>
      <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={saving} onClick={salvar}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar rascunho</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Header = ({ title }: { title: string }) => <CardHeader className="border-b bg-muted/40 px-4 py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>;
const Read = ({ label, value }: { label: string; value: string }) => <div className="space-y-2"><Label>{label}</Label><Input value={value} disabled /></div>;
const Field = ({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) => <div className="space-y-2"><Label>{label}</Label><Input type={type} inputMode={type === "text" ? "decimal" : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
const Area = ({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) => <div className="space-y-2 md:col-span-4"><Label>{label}</Label><Textarea value={value} rows={2} onChange={(event) => onChange(event.target.value)} /></div>;
const SelectField = ({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string, string][]; value: string }) => <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select></div>;

export default CalibracaoExecucaoFormDialog;

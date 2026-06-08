import { supabase } from "@/lib/supabaseClient";
import {
  calibracaoExecucoesService,
  criarTabelasExecucaoDoProcedimento,
  type CalibracaoExecucao,
} from "@/services/calibracaoExecucoesService";
import { calibracaoProcedimentosService } from "@/services/calibracaoProcedimentosService";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { ordensServicoService } from "@/services/ordensServicoService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { preventivasService } from "@/services/preventivasService";
import type { ChecklistPreventivaOsRespostaInput } from "@/services/preventivasService";
import { marcarChecklistCompletoComoConforme } from "@/utils/checklistPreventiva";
import { gerarDatasPrevistasNoPeriodo, type PlanoFrequencia } from "@/utils/planoFrequencia";

export type PlanoStatusCiclo = "aberto" | "concluido" | "cancelado";
export type PlanoTipoServico = "preventiva" | "calibracao" | "seguranca_eletrica";
export type PlanoStatusItemCiclo = "pendente" | "aberto" | "concluido" | "cancelado" | "nao_localizado";

export type PlanoUsuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

export type PlanoSetor = {
  id: string;
  organizacao_id: string;
  plano_id: string;
  nome: string;
  unidade: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanoEquipamento = {
  id: string;
  organizacao_id: string;
  plano_id: string;
  setor_id: string | null;
  equipamento_id: string;
  executar_preventiva: boolean;
  executar_calibracao: boolean;
  executar_seguranca_eletrica: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  setor?: PlanoSetor | null;
  equipamento?: EquipamentoSupabase | null;
};

export type PlanoCicloResumo = {
  id: string;
  titulo: string;
  data_prevista: string;
  data_abertura: string;
  data_fechamento_prevista: string;
  data_fechamento_real: string | null;
  relatorio_emitido_em?: string | null;
  relatorio_validade_ate?: string | null;
  relatorio_validade_meses?: number;
  status: PlanoStatusCiclo;
};

export type PlanoCicloSetor = {
  id: string;
  organizacao_id: string;
  ciclo_id: string;
  setor_origem_id: string | null;
  nome_snapshot: string;
  unidade_snapshot: string | null;
  ordem: number;
  created_at: string;
};

export type PlanoCicloItem = {
  id: string;
  organizacao_id: string;
  ciclo_id: string;
  ciclo_setor_id: string | null;
  plano_equipamento_id: string | null;
  equipamento_id: string;
  tipo_servico: PlanoTipoServico;
  status: PlanoStatusItemCiclo;
  os_id: string | null;
  calibracao_execucao_id: string | null;
  motivo_nao_localizado?: string | null;
  motivo_cancelamento?: string | null;
  observacoes?: string | null;
  aberto_em: string | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  nao_localizado_em?: string | null;
  created_at: string;
  updated_at: string;
  setor?: PlanoCicloSetor | null;
  equipamento?: EquipamentoSupabase | null;
};

export type PlanoCiclo = PlanoCicloResumo & {
  organizacao_id: string;
  plano_id: string;
  data_realizacao_calibracao: string | null;
  data_emissao_calibracao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  setores?: PlanoCicloSetor[];
  itens?: PlanoCicloItem[];
};

export type Plano = {
  id: string;
  organizacao_id: string;
  titulo: string;
  empresa_id: string;
  responsavel_id: string | null;
  data_inicial: string;
  frequencia: PlanoFrequencia;
  prazo_execucao_dias: number;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  responsavel?: PlanoUsuario | null;
  setores?: PlanoSetor[];
  equipamentos?: PlanoEquipamento[];
  ciclos?: PlanoCicloResumo[];
};

export type PlanoInput = {
  titulo: string;
  empresaId: string;
  responsavelId?: string | null;
  dataInicial: string;
  frequencia: PlanoFrequencia;
  prazoExecucaoDias: number;
  descricao?: string | null;
};

export type PlanoSetorInput = {
  nome: string;
  unidade?: string | null;
  ordem?: number;
  ativo?: boolean;
};

export type PlanoEquipamentoInput = {
  equipamentoId: string;
  setorId?: string | null;
  executarPreventiva: boolean;
  executarCalibracao: boolean;
  executarSegurancaEletrica: boolean;
  ordem?: number;
};

export type PlanoAdicionarEquipamentosInput = {
  equipamentos: EquipamentoSelecionadoPlano[];
};

export type EquipamentoSelecionadoPlano = {
  equipamentoId: string;
  setorPlanoId: string | null;
  preventiva: boolean;
  calibracao: boolean;
  segurancaEletrica: boolean;
};

export type PlanoCicloInput = {
  titulo: string;
  dataPrevista: string;
  dataAbertura: string;
  dataFechamentoPrevista: string;
  dataRealizacaoCalibracao?: string | null;
  dataEmissaoCalibracao?: string | null;
  observacoes?: string | null;
};

export type AbrirPreventivaItemResultado = {
  item: PlanoCicloItem;
  os: OrdemServicoSupabase;
};

export type AbrirCalibracaoItemResultado = {
  item: PlanoCicloItem;
  execucao: CalibracaoExecucao;
};

export type ResultadoFinalizacaoPreventivasLote = {
  totalSelecionados: number;
  totalFinalizados: number;
  totalIgnorados: number;
  finalizados: Array<{
    itemId: string;
    equipamentoId: string;
    equipamentoDescricao: string;
    osId: string;
    numeroOs?: string | number | null;
  }>;
  ignorados: Array<{
    itemId: string;
    equipamentoId?: string | null;
    equipamentoDescricao?: string | null;
    motivo: string;
  }>;
};

export type ResultadoNaoLocalizados = {
  totalSelecionados: number;
  totalAtualizados: number;
  totalIgnorados: number;
  atualizados: Array<{
    equipamentoId: string;
    equipamentoDescricao: string;
  }>;
  ignorados: Array<{
    equipamentoId: string;
    equipamentoDescricao: string;
    motivo: string;
  }>;
};

export type PlanoCicloDetalhes = {
  plano: Plano;
  ciclo: PlanoCiclo;
  ordensPreventivas: OrdemServicoSupabase[];
  ordensCorretivas: OrdemServicoSupabase[];
  calibracoes: CalibracaoExecucao[];
  segurancasEletricas: [];
};

export type PlanoCicloItemCompleto = PlanoCicloItem;

export type DadosCompletosDoCiclo = {
  ciclo: PlanoCiclo;
  plano: Plano;
  setores: PlanoCicloSetor[];
  itens: PlanoCicloItemCompleto[];
  preventivas: PlanoCicloItemCompleto[];
  calibracoes: PlanoCicloItemCompleto[];
  segurancasEletricas: PlanoCicloItemCompleto[];
  naoLocalizados: PlanoCicloItemCompleto[];
  ordensServico: OrdemServicoSupabase[];
  certificadosCalibracao: CalibracaoExecucao[];
};

export type PlanoRelatorioCicloOpcoes = {
  validadeMeses: number;
  emitidoEm?: string;
  validadeAte?: string;
  incluirOsPreventivas?: boolean;
  incluirOsCorretivas?: boolean;
  incluirCertificadosCalibracao?: boolean;
  incluirCertificadosSegurancaEletrica?: boolean;
};

export type PlanoRelatorioCicloValidadeInput = {
  cicloId: string;
  meses: number;
  emitidoEm: string;
  validadeAte: string;
};

export type PlanoRelatorioAnualModoPeriodo = "ano_civil" | "periodo_movel";
export type PlanoRelatorioAnualTipoSaida = "cronograma" | "cronograma_completo";

export type PlanoRelatorioAnual = {
  id: string;
  organizacao_id: string;
  plano_id: string;
  modo_periodo: PlanoRelatorioAnualModoPeriodo;
  data_inicio: string;
  data_fim: string;
  ano_referencia: number | null;
  mes_inicial: number;
  revisao: number;
  validade_meses: number;
  emitido_em: string;
  validade_ate: string;
  incluir_preventiva: boolean;
  incluir_calibracao: boolean;
  incluir_seguranca_eletrica: boolean;
  incluir_inativos: boolean;
  agrupar_por_setor: boolean;
  tipo_saida: PlanoRelatorioAnualTipoSaida;
  arquivo_url: string | null;
  created_at: string;
};

export type PlanoRelatorioAnualInput = {
  planoId: string;
  modoPeriodo: PlanoRelatorioAnualModoPeriodo;
  dataInicio: string;
  dataFim: string;
  anoReferencia?: number | null;
  mesInicial: number;
  validadeMeses: number;
  emitidoEm: string;
  validadeAte: string;
  incluirPreventiva: boolean;
  incluirCalibracao: boolean;
  incluirSegurancaEletrica: boolean;
  incluirInativos: boolean;
  agruparPorSetor: boolean;
  tipoSaida: PlanoRelatorioAnualTipoSaida;
};

export type PlanoRelatorioAnualDados = {
  plano: Plano;
  ciclos: PlanoCiclo[];
  detalhesCiclos: PlanoCicloDetalhes[];
  equipamentos: PlanoEquipamento[];
  datasPrevistas: string[];
  dataInicio: string;
  dataFim: string;
  meses: Array<{ key: string; label: string; inicio: string; fim: string }>;
  revisao: number;
};

const selectPlanoEquipamento = `
  id, organizacao_id, plano_id, setor_id, equipamento_id,
  executar_preventiva, executar_calibracao, executar_seguranca_eletrica,
  ordem, ativo, created_at, updated_at,
  setor:plano_setores (id, organizacao_id, plano_id, nome, unidade, ordem, ativo, created_at, updated_at),
  equipamento:equipamentos (
    id, organizacao_id, empresa_id, tipo_equipamento_id, tipo_texto, fabricante,
    modelo, numero_serie, patrimonio, tag, setor, status, ativo, created_at, updated_at,
    tipo_equipamento:tipos_equipamento (id, nome)
  )
`;

const selectPlano = `
  id, organizacao_id, titulo, empresa_id, responsavel_id, data_inicial,
  frequencia, prazo_execucao_dias, descricao, ativo, created_at, updated_at,
  empresa:empresas!planos_empresa_id_fkey (*),
  responsavel:usuarios!planos_responsavel_id_fkey (id, nome, email, perfil, ativo),
  setores:plano_setores (id, organizacao_id, plano_id, nome, unidade, ordem, ativo, created_at, updated_at),
  equipamentos:plano_equipamentos (${selectPlanoEquipamento}),
  ciclos:plano_ciclos (id, titulo, data_prevista, data_abertura, data_fechamento_prevista, data_fechamento_real, relatorio_emitido_em, relatorio_validade_ate, relatorio_validade_meses, status)
`;

const selectPlanoCicloSetor = `
  id, organizacao_id, ciclo_id, setor_origem_id, nome_snapshot, unidade_snapshot, ordem, created_at
`;

const selectPlanoCicloItem = `
  id, organizacao_id, ciclo_id, ciclo_setor_id, plano_equipamento_id, equipamento_id,
  tipo_servico, status, os_id, calibracao_execucao_id, motivo_nao_localizado,
  motivo_cancelamento, observacoes, aberto_em, concluido_em, cancelado_em, nao_localizado_em,
  created_at, updated_at,
  setor:plano_ciclo_setores (${selectPlanoCicloSetor}),
  equipamento:equipamentos (
    id, organizacao_id, empresa_id, tipo_equipamento_id, tipo_texto, fabricante,
    modelo, numero_serie, patrimonio, tag, setor, status, ativo, created_at, updated_at,
    tipo_equipamento:tipos_equipamento (id, nome)
  )
`;

const selectPlanoCiclo = `
  id, organizacao_id, plano_id, titulo, data_prevista, data_abertura,
  data_fechamento_prevista, data_fechamento_real, data_realizacao_calibracao,
  data_emissao_calibracao, relatorio_emitido_em, relatorio_validade_ate,
  relatorio_validade_meses, observacoes, status, created_at, updated_at,
  setores:plano_ciclo_setores (${selectPlanoCicloSetor}),
  itens:plano_ciclo_itens (${selectPlanoCicloItem})
`;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  return data as string;
};

const assertPlano = (input: PlanoInput) => {
  if (!input.titulo.trim()) throw new Error("Informe o titulo do plano.");
  if (!input.empresaId) throw new Error("Selecione o cliente.");
  if (!input.dataInicial) throw new Error("Informe a data inicial.");
  if (!input.frequencia) throw new Error("Selecione a frequencia.");
  if (!Number(input.prazoExecucaoDias) || Number(input.prazoExecucaoDias) <= 0) {
    throw new Error("Informe um prazo de execucao valido.");
  }
};

const assertEquipamentoPlano = (input: Pick<PlanoEquipamentoInput, "executarPreventiva" | "executarCalibracao" | "executarSegurancaEletrica">) => {
  if (!input.executarPreventiva && !input.executarCalibracao && !input.executarSegurancaEletrica) {
    throw new Error("Marque ao menos um servico P, C ou E.");
  }
};

const assertCicloPlano = (input: PlanoCicloInput) => {
  if (!input.titulo.trim()) throw new Error("Informe o titulo do ciclo.");
  if (!input.dataPrevista) throw new Error("Informe a data prevista.");
  if (!input.dataAbertura) throw new Error("Informe a data de abertura.");
  if (!input.dataFechamentoPrevista) throw new Error("Informe a data de fechamento prevista.");
};

const planoPayload = (input: PlanoInput) => ({
  titulo: input.titulo.trim(),
  empresa_id: input.empresaId,
  responsavel_id: input.responsavelId || null,
  data_inicial: input.dataInicial,
  frequencia: input.frequencia,
  prazo_execucao_dias: Number(input.prazoExecucaoDias),
  descricao: input.descricao?.trim() || null,
});

const equipamentoPayload = (input: PlanoEquipamentoInput) => ({
  setor_id: input.setorId || null,
  equipamento_id: input.equipamentoId,
  executar_preventiva: Boolean(input.executarPreventiva),
  executar_calibracao: Boolean(input.executarCalibracao),
  executar_seguranca_eletrica: Boolean(input.executarSegurancaEletrica),
  ordem: input.ordem || 0,
  ativo: true,
});

const ordenarPlano = (plano: Plano): Plano => ({
  ...plano,
  setores: [...(plano.setores || [])].filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem),
  equipamentos: [...(plano.equipamentos || [])].filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem),
  ciclos: [...(plano.ciclos || [])].sort((a, b) => b.data_prevista.localeCompare(a.data_prevista)),
});

const ordenarCiclo = (ciclo: PlanoCiclo): PlanoCiclo => ({
  ...ciclo,
  setores: [...(ciclo.setores || [])].sort((a, b) => a.ordem - b.ordem),
  itens: [...(ciclo.itens || [])].sort((a, b) => {
    const setorA = a.setor?.ordem ?? 999999;
    const setorB = b.setor?.ordem ?? 999999;
    if (setorA !== setorB) return setorA - setorB;
    return (a.equipamento?.tipo_equipamento?.nome || a.equipamento?.tipo_texto || "")
      .localeCompare(b.equipamento?.tipo_equipamento?.nome || b.equipamento?.tipo_texto || "");
  }),
});

const cicloPayload = (input: PlanoCicloInput) => ({
  titulo: input.titulo.trim(),
  data_prevista: input.dataPrevista,
  data_abertura: input.dataAbertura,
  data_fechamento_prevista: input.dataFechamentoPrevista,
  data_realizacao_calibracao: input.dataRealizacaoCalibracao || null,
  data_emissao_calibracao: input.dataEmissaoCalibracao || null,
  observacoes: input.observacoes?.trim() || null,
  status: "aberto",
});

const tiposServicoPlanoEquipamento = (equipamento: PlanoEquipamento): PlanoTipoServico[] => {
  const tipos: PlanoTipoServico[] = [];
  if (equipamento.executar_preventiva) tipos.push("preventiva");
  if (equipamento.executar_calibracao) tipos.push("calibracao");
  if (equipamento.executar_seguranca_eletrica) tipos.push("seguranca_eletrica");
  return tipos;
};

const buscarTipoOSPreventiva = async () => {
  const nomes = ["Manutencao preventiva", "Manutenção preventiva", "Preventiva"];

  for (const nome of nomes) {
    const { data, error } = await supabase
      .from("tipos_os")
      .select("id, nome")
      .ilike("nome", nome)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data as { id: string; nome: string };
  }

  throw new Error("Tipo de OS para manutencao preventiva nao encontrado.");
};

const buscarEstadoOSAberto = async () => {
  const { data: aberta, error: abertaError } = await supabase
    .from("estados_os")
    .select("id, nome")
    .ilike("nome", "Aberta")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!abertaError && aberta?.id) return aberta as { id: string; nome: string };

  const { data, error } = await supabase
    .from("estados_os")
    .select("id, nome")
    .eq("ativo", true)
    .eq("finaliza_os", false)
    .eq("cancela_os", false)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("Estado aberto da OS nao encontrado.");
  }

  return data as { id: string; nome: string };
};

const mesAposData = (data: string, meses = 12) => {
  const date = new Date(`${data}T00:00:00`);
  date.setMonth(date.getMonth() + meses);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const equipamentoDescricao = (item: Pick<PlanoCicloItem, "equipamento_id" | "equipamento">) =>
  [
    item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento",
    item.equipamento?.fabricante,
    item.equipamento?.modelo,
    item.equipamento?.numero_serie ? `NS ${item.equipamento.numero_serie}` : null,
    item.equipamento?.patrimonio ? `Pat. ${item.equipamento.patrimonio}` : null,
  ].filter(Boolean).join(" - ") || item.equipamento_id;

const isItemResolvido = (item: PlanoCicloItem) =>
  item.status === "concluido" || item.status === "cancelado" || item.status === "nao_localizado";

const montarRespostasConformesPreventiva = (procedimento: {
  itens?: Array<{
    id: string;
    descricao: string;
    tipo_resposta: string;
    ordem: number;
  }>;
}) =>
  marcarChecklistCompletoComoConforme(
    [...(procedimento.itens || [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item, index) => ({
        procedimentoItemId: item.id,
        descricao: item.descricao,
        tipoResposta: item.tipo_resposta,
        resposta: "",
        observacao: "",
        ordem: item.ordem || index + 1,
      }))
  ) as ChecklistPreventivaOsRespostaInput[];

const addMonthsDateOnly = (dateIso: string, months: number) => {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

const endOfMonthDateOnly = (dateIso: string) => {
  const date = new Date(`${dateIso}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const montarMesesPeriodo = (dataInicio: string) =>
  Array.from({ length: 12 }, (_, index) => {
    const inicio = addMonthsDateOnly(dataInicio, index);
    const date = new Date(`${inicio}T00:00:00`);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
      inicio,
      fim: endOfMonthDateOnly(inicio),
    };
  });

export const planosService = {
  async listarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data as PlanoUsuario[];
  },

  async listarPlanos() {
    const { data, error } = await supabase
      .from("planos")
      .select(selectPlano)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Plano[]).map(ordenarPlano);
  },

  async buscarPlanoPorId(id: string) {
    const { data, error } = await supabase
      .from("planos")
      .select(selectPlano)
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return ordenarPlano(data as unknown as Plano);
  },

  async criarPlano(input: PlanoInput) {
    assertPlano(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("planos")
      .insert({
        organizacao_id: organizacaoId,
        ...planoPayload(input),
        ativo: true,
      })
      .select(selectPlano)
      .single();
    if (error) throw new Error(error.message);
    return ordenarPlano(data as unknown as Plano);
  },

  async atualizarPlano(id: string, input: PlanoInput) {
    assertPlano(input);
    const { data, error } = await supabase
      .from("planos")
      .update(planoPayload(input))
      .eq("id", id)
      .select(selectPlano)
      .single();
    if (error) throw new Error(error.message);
    return ordenarPlano(data as unknown as Plano);
  },

  async desativarPlano(id: string) {
    const { error } = await supabase.from("planos").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async criarSetorPlano(planoId: string, input: PlanoSetorInput) {
    if (!input.nome.trim()) throw new Error("Informe o nome do setor.");
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("plano_setores")
      .insert({
        organizacao_id: organizacaoId,
        plano_id: planoId,
        nome: input.nome.trim(),
        unidade: input.unidade?.trim() || null,
        ordem: input.ordem || 0,
        ativo: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as PlanoSetor;
  },

  async atualizarSetorPlano(id: string, input: PlanoSetorInput) {
    if (!input.nome.trim()) throw new Error("Informe o nome do setor.");
    const { data, error } = await supabase
      .from("plano_setores")
      .update({
        nome: input.nome.trim(),
        unidade: input.unidade?.trim() || null,
        ordem: input.ordem || 0,
        ativo: input.ativo ?? true,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as PlanoSetor;
  },

  async removerSetorPlano(id: string) {
    const { error: equipamentosError } = await supabase
      .from("plano_equipamentos")
      .update({ setor_id: null })
      .eq("setor_id", id);
    if (equipamentosError) throw new Error(equipamentosError.message);
    const { error } = await supabase.from("plano_setores").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async adicionarEquipamentosPlano(planoId: string, input: PlanoAdicionarEquipamentosInput) {
    if (!input.equipamentos.length) throw new Error("Selecione ao menos um equipamento.");
    input.equipamentos.forEach((item) => {
      assertEquipamentoPlano({
        executarPreventiva: item.preventiva,
        executarCalibracao: item.calibracao,
        executarSegurancaEletrica: item.segurancaEletrica,
      });
    });
    const organizacaoId = await buscarOrganizacaoAtual();
    const payloads = input.equipamentos.map((item, index) => ({
      organizacao_id: organizacaoId,
      plano_id: planoId,
      ...equipamentoPayload({
        equipamentoId: item.equipamentoId,
        setorId: item.setorPlanoId,
        executarPreventiva: item.preventiva,
        executarCalibracao: item.calibracao,
        executarSegurancaEletrica: item.segurancaEletrica,
        ordem: index,
      }),
    }));
    const { error } = await supabase.from("plano_equipamentos").insert(payloads);
    if (error) throw new Error(error.message);
  },

  async atualizarEquipamentoPlano(id: string, input: PlanoEquipamentoInput) {
    if (!input.equipamentoId) throw new Error("Equipamento invalido.");
    assertEquipamentoPlano(input);
    const { data, error } = await supabase
      .from("plano_equipamentos")
      .update(equipamentoPayload(input))
      .eq("id", id)
      .select(selectPlanoEquipamento)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as PlanoEquipamento;
  },

  async removerEquipamentoPlano(id: string) {
    const { error } = await supabase.from("plano_equipamentos").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async criarCicloPlano(planoId: string, input: PlanoCicloInput) {
    assertCicloPlano(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const cicloAberto = await this.buscarCicloAtualPlano(planoId);
    if (cicloAberto) {
      throw new Error("Ja existe um ciclo aberto para este plano.");
    }

    const plano = await this.buscarPlanoPorId(planoId);
    const setoresAtivos = plano.setores || [];
    const equipamentosAtivos = plano.equipamentos || [];

    if (!equipamentosAtivos.length) {
      throw new Error("Adicione equipamentos ao plano antes de abrir um ciclo.");
    }

    if (!equipamentosAtivos.some((equipamento) => tiposServicoPlanoEquipamento(equipamento).length > 0)) {
      throw new Error("O plano nao possui servicos P/C/E configurados para gerar itens do ciclo.");
    }

    const { data: ciclo, error: cicloError } = await supabase
      .from("plano_ciclos")
      .insert({
        organizacao_id: organizacaoId,
        plano_id: planoId,
        ...cicloPayload(input),
      })
      .select(selectPlanoCiclo)
      .single();
    if (cicloError) throw new Error(cicloError.message);

    const setorSnapshotPorOrigem = new Map<string, string>();
    if (setoresAtivos.length) {
      const { data: setoresCriados, error: setoresError } = await supabase
        .from("plano_ciclo_setores")
        .insert(setoresAtivos.map((setor) => ({
          organizacao_id: organizacaoId,
          ciclo_id: ciclo.id,
          setor_origem_id: setor.id,
          nome_snapshot: setor.nome,
          unidade_snapshot: setor.unidade,
          ordem: setor.ordem,
        })))
        .select(selectPlanoCicloSetor);
      if (setoresError) throw new Error(setoresError.message);
      (setoresCriados || []).forEach((setor) => {
        if (setor.setor_origem_id) setorSnapshotPorOrigem.set(setor.setor_origem_id, setor.id);
      });
    }

    const itens = equipamentosAtivos.flatMap((equipamentoPlano) =>
      tiposServicoPlanoEquipamento(equipamentoPlano).map((tipoServico) => ({
        organizacao_id: organizacaoId,
        ciclo_id: ciclo.id,
        ciclo_setor_id: equipamentoPlano.setor_id ? setorSnapshotPorOrigem.get(equipamentoPlano.setor_id) || null : null,
        plano_equipamento_id: equipamentoPlano.id,
        equipamento_id: equipamentoPlano.equipamento_id,
        tipo_servico: tipoServico,
        status: "pendente",
      }))
    );

    const { error: itensError } = await supabase.from("plano_ciclo_itens").insert(itens);
    if (itensError) throw new Error(itensError.message);

    return this.buscarCicloPlano(ciclo.id);
  },

  async listarCiclosPlano(planoId: string) {
    const { data, error } = await supabase
      .from("plano_ciclos")
      .select(selectPlanoCiclo)
      .eq("plano_id", planoId)
      .order("data_prevista", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as PlanoCiclo[]).map(ordenarCiclo);
  },

  async buscarCicloAtualPlano(planoId: string) {
    const { data, error } = await supabase
      .from("plano_ciclos")
      .select(selectPlanoCiclo)
      .eq("plano_id", planoId)
      .eq("status", "aberto")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if ((data || []).length > 1) {
      console.warn(`Plano ${planoId} possui mais de um ciclo aberto. Usando o mais recente.`);
    }
    const ciclo = data?.[0];
    return ciclo ? ordenarCiclo(ciclo as unknown as PlanoCiclo) : null;
  },

  async buscarCicloPlano(cicloId: string) {
    const { data, error } = await supabase
      .from("plano_ciclos")
      .select(selectPlanoCiclo)
      .eq("id", cicloId)
      .single();
    if (error) throw new Error(error.message);
    return ordenarCiclo(data as unknown as PlanoCiclo);
  },

  async listarItensCiclo(cicloId: string) {
    const { data, error } = await supabase
      .from("plano_ciclo_itens")
      .select(selectPlanoCicloItem)
      .eq("ciclo_id", cicloId);
    if (error) throw new Error(error.message);
    return (data || []) as unknown as PlanoCicloItem[];
  },

  async abrirPreventivaItem(itemId: string) {
    const { data: itemData, error: itemError } = await supabase
      .from("plano_ciclo_itens")
      .select(selectPlanoCicloItem)
      .eq("id", itemId)
      .single();
    if (itemError) throw new Error(itemError.message);

    const item = itemData as unknown as PlanoCicloItem;
    if (item.tipo_servico !== "preventiva") throw new Error("Item nao e uma preventiva.");
    if (item.status === "concluido") throw new Error("Esta preventiva ja foi concluida neste ciclo.");
    if (item.status === "cancelado") throw new Error("Item cancelado nao pode ser aberto.");
    if (item.status === "nao_localizado") throw new Error("Item marcado como nao localizado nao pode ser aberto.");
    if (!item.equipamento) throw new Error("Equipamento do item nao encontrado.");

    if (item.os_id) {
      return {
        item,
        os: await ordensServicoService.buscarPorId(item.os_id),
      } as AbrirPreventivaItemResultado;
    }

    const ciclo = await this.buscarCicloPlano(item.ciclo_id);
    const tipoOS = await buscarTipoOSPreventiva();
    const estadoAberto = await buscarEstadoOSAberto();
    const os = await ordensServicoService.criar({
      empresaId: item.equipamento.empresa_id,
      equipamentoId: item.equipamento_id,
      tipoOsId: tipoOS.id,
      estadoOsId: estadoAberto.id,
      solicitanteTexto: ciclo.titulo,
      origemProblema: "Manutencao preventiva",
      descricaoServico: "Manutencao preventiva aberta pelo ciclo do plano.",
      observacoes: `Plano: ${ciclo.plano_id}. Ciclo: ${ciclo.titulo}.`,
      statusSistema: "aberta",
    });

    await supabase
      .from("ordens_servico")
      .update({
        data_abertura: `${ciclo.data_abertura}T00:00:00`,
        plano_ciclo_id: ciclo.id,
      })
      .eq("id", os.id);

    const { data: atualizado, error: updateError } = await supabase
      .from("plano_ciclo_itens")
      .update({
        os_id: os.id,
        status: "aberto",
        aberto_em: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select(selectPlanoCicloItem)
      .single();
    if (updateError) throw new Error(updateError.message);

    return {
      item: atualizado as unknown as PlanoCicloItem,
      os,
    } as AbrirPreventivaItemResultado;
  },

  async criarOuBuscarOsPreventivaParaItem(itemId: string) {
    return this.abrirPreventivaItem(itemId);
  },

  async finalizarPreventivasConformesEmLote({
    itemIds,
    dataFechamento,
  }: {
    itemIds: string[];
    dataFechamento?: string | null;
  }) {
    const resultado: ResultadoFinalizacaoPreventivasLote = {
      totalSelecionados: itemIds.length,
      totalFinalizados: 0,
      totalIgnorados: 0,
      finalizados: [],
      ignorados: [],
    };

    for (const itemId of itemIds) {
      try {
        const { data: itemData, error: itemError } = await supabase
          .from("plano_ciclo_itens")
          .select(selectPlanoCicloItem)
          .eq("id", itemId)
          .maybeSingle();

        if (itemError) throw new Error(itemError.message);
        if (!itemData) throw new Error("Item nao encontrado");

        const item = itemData as unknown as PlanoCicloItem;
        const descricao = equipamentoDescricao(item);

        if (item.tipo_servico !== "preventiva") throw new Error("Item nao e preventiva");
        if (item.status === "concluido") throw new Error("Item ja concluido");
        if (item.status === "cancelado") throw new Error("Item cancelado");
        if (item.status === "nao_localizado") throw new Error("Item marcado como nao localizado");
        if (!item.equipamento) throw new Error("Equipamento nao encontrado");
        if (item.equipamento.ativo === false) throw new Error("Equipamento desativado");

        const procedimento = await preventivasService.buscarProcedimentoPorEquipamentoId(item.equipamento_id);
        if (!procedimento) throw new Error("Procedimento preventivo nao cadastrado");

        const { item: itemComOs, os } = await this.abrirPreventivaItem(item.id);
        const respostas = montarRespostasConformesPreventiva(procedimento);

        const osConcluida = await preventivasService.concluirChecklistPreventiva({
          osId: os.id,
          respostas,
          resultadoGeral: "aprovado",
          observacoes: "Manutencao preventiva realizada conforme checklist.",
          dataFechamento,
          planoCicloItemId: itemComOs.id,
        });

        resultado.finalizados.push({
          itemId: item.id,
          equipamentoId: item.equipamento_id,
          equipamentoDescricao: descricao,
          osId: osConcluida.id,
          numeroOs: osConcluida.numero,
        });
        resultado.totalFinalizados += 1;
      } catch (error) {
        const motivo = error instanceof Error ? error.message : "Erro inesperado";
        const item = await supabase
          .from("plano_ciclo_itens")
          .select(selectPlanoCicloItem)
          .eq("id", itemId)
          .maybeSingle()
          .then(({ data }) => data as unknown as PlanoCicloItem | null)
          .catch(() => null);

        resultado.ignorados.push({
          itemId,
          equipamentoId: item?.equipamento_id || null,
          equipamentoDescricao: item ? equipamentoDescricao(item) : null,
          motivo,
        });
        resultado.totalIgnorados += 1;
      }
    }

    return resultado;
  },

  async marcarEquipamentosNaoLocalizados({
    cicloId,
    equipamentoIds,
    observacao,
  }: {
    cicloId: string;
    equipamentoIds: string[];
    observacao?: string | null;
  }) {
    const idsUnicos = Array.from(new Set(equipamentoIds.filter(Boolean)));
    const resultado: ResultadoNaoLocalizados = {
      totalSelecionados: idsUnicos.length,
      totalAtualizados: 0,
      totalIgnorados: 0,
      atualizados: [],
      ignorados: [],
    };

    if (!idsUnicos.length) return resultado;

    const { data, error } = await supabase
      .from("plano_ciclo_itens")
      .select(selectPlanoCicloItem)
      .eq("ciclo_id", cicloId)
      .in("equipamento_id", idsUnicos);

    if (error) throw new Error(error.message);

    const itens = (data || []) as unknown as PlanoCicloItem[];

    for (const equipamentoId of idsUnicos) {
      const itensEquipamento = itens.filter((item) => item.equipamento_id === equipamentoId);
      const itemReferencia = itensEquipamento[0];
      const descricao = itemReferencia
        ? equipamentoDescricao(itemReferencia)
        : equipamentoId;

      if (!itensEquipamento.length) {
        resultado.ignorados.push({
          equipamentoId,
          equipamentoDescricao: descricao,
          motivo: "Equipamento nao encontrado no ciclo",
        });
        resultado.totalIgnorados += 1;
        continue;
      }

      const bloqueado = itensEquipamento.find((item) =>
        item.os_id ||
        item.calibracao_execucao_id ||
        item.status === "aberto" ||
        item.status === "concluido"
      );

      if (bloqueado) {
        resultado.ignorados.push({
          equipamentoId,
          equipamentoDescricao: descricao,
          motivo: "O equipamento possui servico ja iniciado ou concluido neste ciclo.",
        });
        resultado.totalIgnorados += 1;
        continue;
      }

      const pendentes = itensEquipamento.filter((item) => item.status === "pendente");
      if (!pendentes.length) {
        resultado.ignorados.push({
          equipamentoId,
          equipamentoDescricao: descricao,
          motivo: "Nao ha itens pendentes para marcar como nao localizado.",
        });
        resultado.totalIgnorados += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("plano_ciclo_itens")
        .update({
          status: "nao_localizado",
          motivo_nao_localizado: observacao?.trim() || "Equipamento nao localizado",
          nao_localizado_em: new Date().toISOString(),
        })
        .eq("ciclo_id", cicloId)
        .eq("equipamento_id", equipamentoId)
        .eq("status", "pendente")
        .is("os_id", null)
        .is("calibracao_execucao_id", null);

      if (updateError) {
        resultado.ignorados.push({
          equipamentoId,
          equipamentoDescricao: descricao,
          motivo: updateError.message,
        });
        resultado.totalIgnorados += 1;
        continue;
      }

      resultado.atualizados.push({
        equipamentoId,
        equipamentoDescricao: descricao,
      });
      resultado.totalAtualizados += 1;
    }

    return resultado;
  },

  async criarOuBuscarCalibracaoParaItem(itemId: string) {
    const { data: itemData, error: itemError } = await supabase
      .from("plano_ciclo_itens")
      .select(selectPlanoCicloItem)
      .eq("id", itemId)
      .single();
    if (itemError) throw new Error(itemError.message);

    const item = itemData as unknown as PlanoCicloItem;
    if (item.tipo_servico !== "calibracao") throw new Error("Item nao e uma calibracao.");
    if (item.status === "concluido") throw new Error("Esta calibracao ja foi concluida neste ciclo.");
    if (item.status === "cancelado") throw new Error("Item cancelado nao pode ser aberto.");
    if (item.status === "nao_localizado") throw new Error("Item marcado como nao localizado nao pode ser aberto.");
    if (!item.equipamento) throw new Error("Equipamento do item nao encontrado.");

    if (item.calibracao_execucao_id) {
      return {
        item,
        execucao: await calibracaoExecucoesService.buscarExecucaoPorId(item.calibracao_execucao_id),
      } as AbrirCalibracaoItemResultado;
    }

    const ciclo = await this.buscarCicloPlano(item.ciclo_id);
    const procedimentos = await calibracaoProcedimentosService.listarProcedimentos();
    const procedimento = procedimentos.find((proc) =>
      proc.ativo &&
      Boolean(item.equipamento?.tipo_equipamento_id) &&
      proc.tipo_equipamento_id === item.equipamento?.tipo_equipamento_id
    );

    if (!procedimento) {
      throw new Error("Nenhum procedimento de calibracao cadastrado para este tipo de equipamento.");
    }

    const dataCalibracao = ciclo.data_realizacao_calibracao || ciclo.data_abertura;
    const dataEmissao = ciclo.data_emissao_calibracao || dataCalibracao;
    const execucao = await calibracaoExecucoesService.criarExecucao({
      empresaId: item.equipamento.empresa_id,
      equipamentoId: item.equipamento_id,
      procedimentoId: procedimento.id,
      localCalibracao: "dependencias_contratada",
      temperaturaAmbiente: 21,
      incertezaTemperatura: 0.5,
      umidadeRelativa: 50,
      incertezaUmidade: 5,
      pressaoAtmosferica: null,
      incertezaPressao: null,
      observacoes: `Criada pelo ciclo ${ciclo.titulo}.`,
      dataCalibracao,
      dataEmissao,
      validadeMes: mesAposData(dataCalibracao),
      tecnicoExecutorNome: "Icaro Heitor Piris Rezende",
      tecnicoExecutorRegistro: null,
      responsavelTecnicoNome: "Icaro Heitor Piris Rezende",
      responsavelTecnicoRegistro: "142085302-3",
      responsavelSolicitante: ciclo.titulo,
      criterioConformidadeAplicado: false,
      tabelas: criarTabelasExecucaoDoProcedimento(procedimento, false),
    });

    const { data: atualizado, error: updateError } = await supabase
      .from("plano_ciclo_itens")
      .update({
        calibracao_execucao_id: execucao.id,
        status: "aberto",
        aberto_em: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select(selectPlanoCicloItem)
      .single();
    if (updateError) throw new Error(updateError.message);

    return {
      item: atualizado as unknown as PlanoCicloItem,
      execucao,
    } as AbrirCalibracaoItemResultado;
  },

  async concluirItemCicloCalibracao(itemId: string, execucaoId: string) {
    const { data, error } = await supabase
      .from("plano_ciclo_itens")
      .update({
        calibracao_execucao_id: execucaoId,
        status: "concluido",
        concluido_em: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select(selectPlanoCicloItem)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as PlanoCicloItem;
  },

  async concluirCicloPlano(cicloId: string) {
    const ciclo = await this.buscarCicloPlano(cicloId);
    const pendentes = (ciclo.itens || []).filter((item) => !isItemResolvido(item));

    if (pendentes.length) {
      throw new Error("Resolva todos os itens do ciclo antes de concluir.");
    }

    const { data, error } = await supabase
      .from("plano_ciclos")
      .update({
        status: "concluido",
        data_fechamento_real: new Date().toISOString().slice(0, 10),
      })
      .eq("id", cicloId)
      .select(selectPlanoCiclo)
      .single();

    if (error) throw new Error(error.message);
    return ordenarCiclo(data as unknown as PlanoCiclo);
  },

  async buscarDadosCompletosDoCiclo(cicloId: string) {
    const { data: cicloData, error: cicloError } = await supabase
      .from("plano_ciclos")
      .select("*")
      .eq("id", cicloId)
      .single();
    if (cicloError) throw new Error(cicloError.message);

    const [plano, setoresResult, itensResult] = await Promise.all([
      this.buscarPlanoPorId(cicloData.plano_id),
      supabase
        .from("plano_ciclo_setores")
        .select(selectPlanoCicloSetor)
        .eq("ciclo_id", cicloId)
        .order("ordem", { ascending: true }),
      supabase
        .from("plano_ciclo_itens")
        .select(selectPlanoCicloItem)
        .eq("ciclo_id", cicloId),
    ]);

    if (setoresResult.error) throw new Error(setoresResult.error.message);
    if (itensResult.error) throw new Error(itensResult.error.message);

    const setores = (setoresResult.data || []) as unknown as PlanoCicloSetor[];
    const itens = ((itensResult.data || []) as unknown as PlanoCicloItemCompleto[]).sort((a, b) => {
      const setorA = a.setor?.ordem ?? 999999;
      const setorB = b.setor?.ordem ?? 999999;
      if (setorA !== setorB) return setorA - setorB;
      return (a.equipamento?.tipo_equipamento?.nome || a.equipamento?.tipo_texto || "")
        .localeCompare(b.equipamento?.tipo_equipamento?.nome || b.equipamento?.tipo_texto || "");
    });
    const ciclo = ordenarCiclo({
      ...(cicloData as PlanoCiclo),
      setores,
      itens,
    });
    const osIds = Array.from(new Set(itens
      .map((item) => item.os_id)
      .filter((id): id is string => Boolean(id))));
    const calibracaoIds = Array.from(new Set(itens
      .map((item) => item.calibracao_execucao_id)
      .filter((id): id is string => Boolean(id))));
    const ordensServico = await Promise.all(osIds.map((id) => ordensServicoService.buscarPorId(id)));
    const certificadosCalibracao = await Promise.all(
      calibracaoIds.map((id) => calibracaoExecucoesService.buscarExecucaoPorId(id))
    );

    return {
      ciclo,
      plano,
      setores,
      itens,
      preventivas: itens.filter((item) => item.tipo_servico === "preventiva"),
      calibracoes: itens.filter((item) => item.tipo_servico === "calibracao"),
      segurancasEletricas: itens.filter((item) => item.tipo_servico === "seguranca_eletrica"),
      naoLocalizados: itens.filter((item) => item.status === "nao_localizado"),
      ordensServico,
      certificadosCalibracao,
    } as DadosCompletosDoCiclo;
  },

  async buscarDetalhesCicloPlano(cicloId: string) {
    const dados = await this.buscarDadosCompletosDoCiclo(cicloId);
    const isPreventiva = (os: OrdemServicoSupabase) =>
      /preventiva/i.test(os.tipo_os?.nome || "") ||
      /preventiva/i.test(os.descricao_servico || "");

    return {
      plano: dados.plano,
      ciclo: dados.ciclo,
      ordensPreventivas: dados.ordensServico.filter(isPreventiva),
      ordensCorretivas: dados.ordensServico.filter((os) => !isPreventiva(os)),
      calibracoes: dados.certificadosCalibracao,
      segurancasEletricas: [],
    } as PlanoCicloDetalhes;
  },

  async buscarDadosRelatorioCiclo(cicloId: string) {
    return this.buscarDetalhesCicloPlano(cicloId);
  },

  async listarOsPreventivasDoCiclo(cicloId: string) {
    const ciclo = await this.buscarCicloPlano(cicloId);
    const osIds = Array.from(new Set((ciclo.itens || [])
      .filter((item) => item.tipo_servico === "preventiva" && item.status === "concluido")
      .map((item) => item.os_id)
      .filter((id): id is string => Boolean(id))));
    return Promise.all(osIds.map((id) => ordensServicoService.buscarPorId(id)));
  },

  async listarOsCorretivasDoCiclo(cicloId: string) {
    const ordens = await ordensServicoService.listar();
    return ordens.filter((os) =>
      os.plano_ciclo_id === cicloId &&
      os.status_sistema === "fechada" &&
      !/preventiva/i.test(os.tipo_os?.nome || "") &&
      !/calibra/i.test(os.tipo_os?.nome || "")
    );
  },

  async listarCalibracoesDoCiclo(cicloId: string) {
    const ciclo = await this.buscarCicloPlano(cicloId);
    const ids = Array.from(new Set((ciclo.itens || [])
      .filter((item) => item.tipo_servico === "calibracao" && item.status === "concluido")
      .map((item) => item.calibracao_execucao_id)
      .filter((id): id is string => Boolean(id))));
    return Promise.all(ids.map((id) => calibracaoExecucoesService.buscarExecucaoPorId(id)));
  },

  async listarSegurancasEletricasDoCiclo() {
    return [];
  },

  async listarNaoLocalizadosDoCiclo(cicloId: string) {
    const ciclo = await this.buscarCicloPlano(cicloId);
    return (ciclo.itens || []).filter((item) => item.status === "nao_localizado");
  },

  async listarNaoConformesDoCiclo(cicloId: string) {
    const detalhes = await this.buscarDetalhesCicloPlano(cicloId);
    const ordens = [...detalhes.ordensPreventivas, ...detalhes.ordensCorretivas];
    return ordens.filter((os) => {
      const checklist = Array.isArray(os.checklist_preventiva)
        ? os.checklist_preventiva[0]
        : os.checklist_preventiva;
      const itens = checklist?.itens || [];
      return itens.some((item) => item.resposta === "nao_conforme" || item.resposta === "nao_aprovado");
    });
  },

  async salvarValidadeRelatorioCiclo({
    cicloId,
    meses,
    emitidoEm,
    validadeAte,
  }: PlanoRelatorioCicloValidadeInput) {
    const { data, error } = await supabase
      .from("plano_ciclos")
      .update({
        relatorio_emitido_em: emitidoEm,
        relatorio_validade_ate: validadeAte,
        relatorio_validade_meses: meses,
      })
      .eq("id", cicloId)
      .select(selectPlanoCiclo)
      .single();
    if (error) throw new Error(error.message);
    return ordenarCiclo(data as unknown as PlanoCiclo);
  },

  async buscarDadosRelatorioAnualPlano({
    planoId,
    dataInicio,
    dataFim,
    setoresIds,
    incluirPreventiva,
    incluirCalibracao,
    incluirSegurancaEletrica,
    incluirInativos,
  }: {
    planoId: string;
    dataInicio: string;
    dataFim: string;
    setoresIds?: string[];
    incluirPreventiva: boolean;
    incluirCalibracao: boolean;
    incluirSegurancaEletrica: boolean;
    incluirInativos: boolean;
  }) {
    const plano = await this.buscarPlanoPorId(planoId);
    const ciclos = (await this.listarCiclosPlano(planoId)).filter((ciclo) =>
      ciclo.data_prevista >= dataInicio && ciclo.data_prevista <= dataFim
    );
    const detalhesCiclos = await Promise.all(ciclos.map((ciclo) => this.buscarDetalhesCicloPlano(ciclo.id)));
    const servicoAtivo = (equipamento: PlanoEquipamento) =>
      (incluirPreventiva && equipamento.executar_preventiva) ||
      (incluirCalibracao && equipamento.executar_calibracao) ||
      (incluirSegurancaEletrica && equipamento.executar_seguranca_eletrica);
    const equipamentos = (plano.equipamentos || [])
      .filter((item) => incluirInativos || item.ativo)
      .filter(servicoAtivo)
      .filter((item) => !setoresIds?.length || (item.setor_id && setoresIds.includes(item.setor_id)));
    const revisao = await this.calcularProximaRevisaoRelatorioAnual({ planoId, dataInicio, dataFim });

    return {
      plano,
      ciclos,
      detalhesCiclos,
      equipamentos,
      datasPrevistas: gerarDatasPrevistasNoPeriodo({
        dataInicial: plano.data_inicial,
        frequencia: plano.frequencia,
        inicioPeriodo: dataInicio,
        fimPeriodo: dataFim,
      }),
      dataInicio,
      dataFim,
      meses: montarMesesPeriodo(dataInicio),
      revisao,
    } as PlanoRelatorioAnualDados;
  },

  async calcularProximaRevisaoRelatorioAnual({
    planoId,
    dataInicio,
    dataFim,
  }: {
    planoId: string;
    dataInicio: string;
    dataFim: string;
  }) {
    const { data, error } = await supabase
      .from("plano_relatorios_anuais")
      .select("revisao")
      .eq("plano_id", planoId)
      .eq("data_inicio", dataInicio)
      .eq("data_fim", dataFim)
      .order("revisao", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return Number(data?.[0]?.revisao || 0) + 1;
  },

  async salvarRegistroRelatorioAnual(input: PlanoRelatorioAnualInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const revisao = await this.calcularProximaRevisaoRelatorioAnual({
      planoId: input.planoId,
      dataInicio: input.dataInicio,
      dataFim: input.dataFim,
    });
    const { data, error } = await supabase
      .from("plano_relatorios_anuais")
      .insert({
        organizacao_id: organizacaoId,
        plano_id: input.planoId,
        modo_periodo: input.modoPeriodo,
        data_inicio: input.dataInicio,
        data_fim: input.dataFim,
        ano_referencia: input.anoReferencia || null,
        mes_inicial: input.mesInicial,
        revisao,
        validade_meses: input.validadeMeses,
        emitido_em: input.emitidoEm,
        validade_ate: input.validadeAte,
        incluir_preventiva: input.incluirPreventiva,
        incluir_calibracao: input.incluirCalibracao,
        incluir_seguranca_eletrica: input.incluirSegurancaEletrica,
        incluir_inativos: input.incluirInativos,
        agrupar_por_setor: input.agruparPorSetor,
        tipo_saida: input.tipoSaida,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as PlanoRelatorioAnual;
  },

  async listarRelatoriosAnuaisPlano(planoId: string) {
    const { data, error } = await supabase
      .from("plano_relatorios_anuais")
      .select("*")
      .eq("plano_id", planoId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as PlanoRelatorioAnual[];
  },

  async listarDocumentosDosCiclosNoPeriodo({
    planoId,
    dataInicio,
    dataFim,
  }: {
    planoId: string;
    dataInicio: string;
    dataFim: string;
  }) {
    const ciclos = (await this.listarCiclosPlano(planoId)).filter((ciclo) =>
      ciclo.data_prevista >= dataInicio && ciclo.data_prevista <= dataFim
    );
    return Promise.all(ciclos.map((ciclo) => this.buscarDetalhesCicloPlano(ciclo.id)));
  },
};

import { supabase } from "@/lib/supabaseClient";
import {
  calcularProximaExecucao,
  type PlanoFrequencia,
} from "@/utils/planoFrequencia";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { calibracaoExecucoesService } from "@/services/calibracaoExecucoesService";
import { preventivasService } from "@/services/preventivasService";
import { procedimentosPreventivaService } from "@/services/procedimentosPreventivaService";

export type PlanoStatusExecucao = "aberta" | "em_execucao" | "concluida" | "cancelada";
export type PlanoItemStatus = "pendente" | "aberto" | "em_execucao" | "concluido" | "cancelado";
export type PlanoTipoServico = "preventiva" | "calibracao" | "seguranca_eletrica";
export type PlanoModoOrganizacao = "por_setor" | "unidade_inteira";

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

export type Plano = {
  id: string;
  organizacao_id: string;
  titulo: string;
  empresa_id: string;
  data_inicio: string;
  frequencia: PlanoFrequencia;
  modo_organizacao: PlanoModoOrganizacao;
  proxima_execucao: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  empresa?: { id: string; nome: string; nome_fantasia: string | null } | null;
  setores?: PlanoSetor[];
  equipamentos?: PlanoEquipamento[];
  execucoes?: Array<{
    id: string;
    nome_visita: string | null;
    data_prevista: string;
    status: PlanoStatusExecucao;
    iniciado_em: string | null;
    encerrado_em: string | null;
    created_at: string;
    itens?: Array<{ id: string; status: PlanoItemStatus }>;
  }>;
};

export type PlanoExecucaoItem = {
  id: string;
  organizacao_id: string;
  execucao_id: string;
  plano_equipamento_id: string;
  equipamento_id: string;
  setor_id: string | null;
  tipo_servico: PlanoTipoServico;
  status: PlanoItemStatus;
  os_id: string | null;
  calibracao_execucao_id: string | null;
  ordem_setor: number;
  motivo_cancelamento: string | null;
  aberto_em: string | null;
  finalizado_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  equipamento?: EquipamentoSupabase | null;
  setor?: PlanoSetor | null;
};

export type PlanoExecucao = {
  id: string;
  organizacao_id: string;
  plano_id: string;
  nome_visita: string | null;
  data_prevista: string;
  data_abertura: string | null;
  data_fechamento: string | null;
  data_abertura_preventiva: string | null;
  data_fechamento_preventiva: string | null;
  data_realizacao_calibracao: string | null;
  data_emissao_calibracao: string | null;
  observacoes: string | null;
  status: PlanoStatusExecucao;
  iniciado_em: string | null;
  encerrado_em: string | null;
  created_at: string;
  updated_at: string;
  plano?: Plano | null;
  itens?: PlanoExecucaoItem[];
};

export type PlanoInput = {
  titulo: string;
  empresaId: string;
  dataInicio: string;
  frequencia: PlanoFrequencia;
  modoOrganizacao: PlanoModoOrganizacao;
  observacoes?: string | null;
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
  executarPreventiva?: boolean;
  executarCalibracao?: boolean;
  executarSegurancaEletrica?: boolean;
  ordem?: number;
};

export type PlanoExecucaoInput = {
  dataPrevista: string;
  dataAbertura?: string | null;
  dataFechamento?: string | null;
  nomeVisita?: string | null;
  dataAberturaPreventiva?: string | null;
  dataFechamentoPreventiva?: string | null;
  dataRealizacaoCalibracao?: string | null;
  dataEmissaoCalibracao?: string | null;
  observacoes?: string | null;
};

export type ResultadoFinalizacaoPreventivasLote = {
  totalSelecionados: number;
  totalFinalizados: number;
  totalIgnorados: number;
  finalizados: Array<{
    itemId: string;
    equipamentoId: string;
    osId: string;
  }>;
  ignorados: Array<{
    itemId: string;
    equipamentoId: string;
    motivo: string;
  }>;
};

const selectPlano = `
  id, organizacao_id, titulo, empresa_id, data_inicio, frequencia, modo_organizacao, proxima_execucao,
  ativo, observacoes, created_at, updated_at,
  empresa:empresas (id, nome, nome_fantasia),
  setores:plano_setores (id, organizacao_id, plano_id, nome, unidade, ordem, ativo, created_at, updated_at),
  equipamentos:plano_equipamentos (
    id, organizacao_id, plano_id, setor_id, equipamento_id,
    executar_preventiva, executar_calibracao, executar_seguranca_eletrica,
    ordem, ativo, created_at, updated_at,
    setor:plano_setores (id, organizacao_id, plano_id, nome, unidade, ordem, ativo, created_at, updated_at),
    equipamento:equipamentos (
      id, organizacao_id, empresa_id, tipo_equipamento_id, tipo_texto, fabricante,
      modelo, numero_serie, patrimonio, tag, setor, status, ativo, created_at, updated_at,
      tipo_equipamento:tipos_equipamento (id, nome)
    )
  ),
  execucoes:plano_execucoes (
    id, nome_visita, data_prevista, status, iniciado_em, encerrado_em, created_at,
    itens:plano_execucao_itens (id, status)
  )
`;

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

const selectExecucao = `
  id, organizacao_id, plano_id, nome_visita, data_prevista, data_abertura, data_fechamento,
  data_abertura_preventiva,
  data_fechamento_preventiva, data_realizacao_calibracao, data_emissao_calibracao,
  observacoes, status, iniciado_em, encerrado_em, created_at, updated_at,
  plano:planos (
    id, organizacao_id, titulo, empresa_id, data_inicio, frequencia, modo_organizacao, proxima_execucao,
    ativo, observacoes, created_at, updated_at,
    empresa:empresas (id, nome, nome_fantasia)
  ),
  itens:plano_execucao_itens (
    id, organizacao_id, execucao_id, plano_equipamento_id, equipamento_id, setor_id,
    tipo_servico, status, os_id, calibracao_execucao_id, ordem_setor, motivo_cancelamento,
    aberto_em, finalizado_em, iniciado_em, concluido_em,
    observacoes, created_at, updated_at,
    setor:plano_setores (id, organizacao_id, plano_id, nome, unidade, ordem, ativo, created_at, updated_at),
    equipamento:equipamentos (
      id, organizacao_id, empresa_id, tipo_equipamento_id, tipo_texto, fabricante,
      modelo, numero_serie, patrimonio, tag, setor, status, ativo, created_at, updated_at,
      tipo_equipamento:tipos_equipamento (id, nome)
    )
  )
`;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  return data as string;
};

const ordenarPlano = (plano: Plano): Plano => ({
  ...plano,
  setores: [...(plano.setores || [])].filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem),
  equipamentos: [...(plano.equipamentos || [])].filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem),
  execucoes: [...(plano.execucoes || [])].sort((a, b) => b.data_prevista.localeCompare(a.data_prevista)),
});

const ordenarExecucao = (execucao: PlanoExecucao): PlanoExecucao => ({
  ...execucao,
  itens: [...(execucao.itens || [])].sort((a, b) => {
    const setor = a.ordem_setor - b.ordem_setor;
    return setor || a.created_at.localeCompare(b.created_at);
  }),
});

const assertPlanoInput = (input: PlanoInput) => {
  if (!input.titulo.trim()) throw new Error("Informe o titulo do plano.");
  if (!input.empresaId) throw new Error("Selecione o cliente do plano.");
  if (!input.dataInicio) throw new Error("Informe a data inicial do plano.");
  if (!input.frequencia) throw new Error("Selecione a frequencia do plano.");
  if (!input.modoOrganizacao) throw new Error("Selecione o modo de organizacao do plano.");
};

const assertEquipamentoInput = (input: PlanoEquipamentoInput) => {
  if (!input.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!input.executarPreventiva && !input.executarCalibracao && !input.executarSegurancaEletrica) {
    throw new Error("Marque ao menos um servico P, C ou S para o equipamento.");
  }
};

const planoPayload = (input: PlanoInput) => ({
  titulo: input.titulo.trim(),
  empresa_id: input.empresaId,
  data_inicio: input.dataInicio,
  frequencia: input.frequencia,
  modo_organizacao: input.modoOrganizacao,
  observacoes: input.observacoes?.trim() || null,
});

const execucaoPayload = (input: PlanoExecucaoInput) => ({
  nome_visita: input.nomeVisita?.trim() || null,
  data_prevista: input.dataPrevista,
  data_abertura: input.dataAbertura || null,
  data_fechamento: input.dataFechamento || null,
  data_abertura_preventiva: input.dataAberturaPreventiva || null,
  data_fechamento_preventiva: input.dataFechamentoPreventiva || null,
  data_realizacao_calibracao: input.dataRealizacaoCalibracao || null,
  data_emissao_calibracao: input.dataEmissaoCalibracao || null,
  observacoes: input.observacoes?.trim() || null,
});

const buscarVisitaDosItens = async (itemIds: string[], visitaId?: string) => {
  if (!itemIds.length) throw new Error("Selecione ao menos um item da visita.");
  if (visitaId) return planosService.buscarExecucaoPlanoPorId(visitaId);
  const { data, error } = await supabase
    .from("plano_execucao_itens")
    .select("execucao_id")
    .in("id", itemIds);
  if (error) throw new Error(error.message);
  const execucaoIds = Array.from(new Set((data || []).map((item) => item.execucao_id)));
  if (execucaoIds.length !== 1) {
    throw new Error("Selecione itens de uma unica visita.");
  }
  return planosService.buscarExecucaoPlanoPorId(execucaoIds[0]);
};

const marcarVisitaEmExecucao = async (id: string) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("plano_execucoes")
    .update({ status: "em_execucao", iniciado_em: now, data_abertura: now.slice(0, 10) })
    .eq("id", id)
    .eq("status", "aberta");
  if (error) throw new Error(error.message);
};

export const planosService = {
  async listarPlanos(ativo?: boolean) {
    let query = supabase.from("planos").select(selectPlano).order("data_inicio", { ascending: false });
    if (ativo !== undefined) query = query.eq("ativo", ativo);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Plano[]).map(ordenarPlano);
  },

  async buscarPlanoPorId(id: string) {
    const { data, error } = await supabase.from("planos").select(selectPlano).eq("id", id).single();
    if (error) throw new Error(error.message);
    return ordenarPlano(data as unknown as Plano);
  },

  async criarPlano(input: PlanoInput) {
    assertPlanoInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase.from("planos").insert({
      organizacao_id: organizacaoId,
      ...planoPayload(input),
      proxima_execucao: input.dataInicio,
      ativo: true,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return planosService.buscarPlanoPorId(data.id);
  },

  async atualizarPlano(id: string, input: PlanoInput) {
    assertPlanoInput(input);
    const { error } = await supabase.from("planos").update(planoPayload(input)).eq("id", id);
    if (error) throw new Error(error.message);
    return planosService.buscarPlanoPorId(id);
  },

  async desativarPlano(id: string) {
    const { error } = await supabase.from("planos").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listarSetoresPlano(planoId: string) {
    const { data, error } = await supabase.from("plano_setores").select("*").eq("plano_id", planoId).eq("ativo", true).order("ordem");
    if (error) throw new Error(error.message);
    return data as PlanoSetor[];
  },

  async criarSetorPlano(planoId: string, input: PlanoSetorInput) {
    if (!input.nome.trim()) throw new Error("Informe o nome do setor.");
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase.from("plano_setores").insert({
      organizacao_id: organizacaoId, plano_id: planoId, nome: input.nome.trim(),
      unidade: input.unidade?.trim() || null, ordem: input.ordem || 0, ativo: true,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return data as PlanoSetor;
  },

  async atualizarSetorPlano(id: string, input: PlanoSetorInput) {
    if (!input.nome.trim()) throw new Error("Informe o nome do setor.");
    const { data, error } = await supabase.from("plano_setores").update({
      nome: input.nome.trim(), unidade: input.unidade?.trim() || null,
      ordem: input.ordem || 0, ativo: input.ativo ?? true,
    }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return data as PlanoSetor;
  },

  async removerSetorPlano(id: string) {
    const { error: equipamentosError } = await supabase.from("plano_equipamentos").update({ setor_id: null }).eq("setor_id", id);
    if (equipamentosError) throw new Error(equipamentosError.message);
    const { error } = await supabase.from("plano_setores").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listarEquipamentosPlano(planoId: string) {
    const { data, error } = await supabase.from("plano_equipamentos").select(selectPlanoEquipamento).eq("plano_id", planoId).eq("ativo", true).order("ordem");
    if (error) throw new Error(error.message);
    return data as unknown as PlanoEquipamento[];
  },

  async adicionarEquipamentoPlano(planoId: string, input: PlanoEquipamentoInput) {
    assertEquipamentoInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase.from("plano_equipamentos").insert({
      organizacao_id: organizacaoId, plano_id: planoId, setor_id: input.setorId || null,
      equipamento_id: input.equipamentoId, executar_preventiva: Boolean(input.executarPreventiva),
      executar_calibracao: Boolean(input.executarCalibracao),
      executar_seguranca_eletrica: Boolean(input.executarSegurancaEletrica),
      ordem: input.ordem || 0, ativo: true,
    }).select(selectPlanoEquipamento).single();
    if (error) throw new Error(error.message);
    return data as unknown as PlanoEquipamento;
  },

  async atualizarEquipamentoPlano(id: string, input: PlanoEquipamentoInput) {
    assertEquipamentoInput(input);
    const { data, error } = await supabase.from("plano_equipamentos").update({
      setor_id: input.setorId || null, executar_preventiva: Boolean(input.executarPreventiva),
      executar_calibracao: Boolean(input.executarCalibracao),
      executar_seguranca_eletrica: Boolean(input.executarSegurancaEletrica),
      ordem: input.ordem || 0,
    }).eq("id", id).select(selectPlanoEquipamento).single();
    if (error) throw new Error(error.message);
    return data as unknown as PlanoEquipamento;
  },

  async removerEquipamentoPlano(id: string) {
    const { error } = await supabase.from("plano_equipamentos").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listarExecucoesPlano() {
    const { data, error } = await supabase.from("plano_execucoes").select(selectExecucao).order("data_prevista", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as PlanoExecucao[]).map(ordenarExecucao);
  },

  async listarVisitasPlano(planoId: string) {
    const { data, error } = await supabase.from("plano_execucoes").select(selectExecucao).eq("plano_id", planoId).order("data_prevista", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as PlanoExecucao[]).map(ordenarExecucao);
  },

  async buscarExecucaoPlanoPorId(id: string) {
    const { data, error } = await supabase.from("plano_execucoes").select(selectExecucao).eq("id", id).single();
    if (error) throw new Error(error.message);
    return ordenarExecucao(data as unknown as PlanoExecucao);
  },

  async buscarVisitaPlano(id: string) {
    return planosService.buscarExecucaoPlanoPorId(id);
  },

  async criarExecucaoPlano(planoId: string, input: PlanoExecucaoInput) {
    if (!planoId) throw new Error("Selecione o plano.");
    if (!input.dataPrevista) throw new Error("Informe a data prevista da visita.");
    const { data: visitaAberta, error: visitaAbertaError } = await supabase.from("plano_execucoes").select("id").eq("plano_id", planoId).in("status", ["aberta", "em_execucao"]).limit(1).maybeSingle();
    if (visitaAbertaError) throw new Error(visitaAbertaError.message);
    if (visitaAberta) throw new Error("Conclua ou cancele a visita atual antes de iniciar uma nova visita.");
    const [organizacaoId, equipamentos] = await Promise.all([
      buscarOrganizacaoAtual(), planosService.listarEquipamentosPlano(planoId),
    ]);
    const itens = equipamentos.flatMap((item) => {
      const tipos: PlanoTipoServico[] = [];
      if (item.executar_preventiva) tipos.push("preventiva");
      if (item.executar_calibracao) tipos.push("calibracao");
      if (item.executar_seguranca_eletrica) tipos.push("seguranca_eletrica");
      return tipos.map((tipo) => ({ item, tipo }));
    });
    if (!itens.length) throw new Error("Adicione ao menos um equipamento com servico ao plano.");
    const { data, error } = await supabase.from("plano_execucoes").insert({
      organizacao_id: organizacaoId, plano_id: planoId, ...execucaoPayload(input), status: "aberta",
    }).select("id").single();
    if (error) throw new Error(error.message);
    const { error: itensError } = await supabase.from("plano_execucao_itens").insert(itens.map(({ item, tipo }) => ({
      organizacao_id: organizacaoId, execucao_id: data.id, plano_equipamento_id: item.id,
      equipamento_id: item.equipamento_id, setor_id: item.setor_id, ordem_setor: item.setor?.ordem || 0,
      tipo_servico: tipo, status: "pendente",
    })));
    if (itensError) {
      await supabase.from("plano_execucoes").delete().eq("id", data.id);
      throw new Error(itensError.message);
    }
    return planosService.buscarExecucaoPlanoPorId(data.id);
  },

  async atualizarExecucaoPlano(id: string, input: PlanoExecucaoInput) {
    if (!input.dataPrevista) throw new Error("Informe a data prevista da visita.");
    const { error } = await supabase.from("plano_execucoes").update(execucaoPayload(input)).eq("id", id);
    if (error) throw new Error(error.message);
    return planosService.buscarExecucaoPlanoPorId(id);
  },

  async criarVisitaPlano(planoId: string, input: PlanoExecucaoInput) {
    return planosService.criarExecucaoPlano(planoId, input);
  },

  async atualizarVisitaPlano(id: string, input: PlanoExecucaoInput) {
    return planosService.atualizarExecucaoPlano(id, input);
  },

  async listarItensVisita(visitaId: string) {
    return (await planosService.buscarExecucaoPlanoPorId(visitaId)).itens || [];
  },

  async listarItensVisitaPorSetor(visitaId: string, setorId?: string | null) {
    const itens = await planosService.listarItensVisita(visitaId);
    return setorId ? itens.filter((item) => item.setor_id === setorId) : itens;
  },

  async listarItensVisitaPorSetorETipo(
    visitaId: string,
    setorId: string | null,
    tipoServico: PlanoTipoServico
  ) {
    const itens = await planosService.listarItensVisitaPorSetor(visitaId, setorId);
    return itens.filter((item) => item.tipo_servico === tipoServico);
  },

  async criarOuAbrirOsPreventivaItem(itemId: string) {
    const visita = await buscarVisitaDosItens([itemId]);
    const item = (visita.itens || []).find((current) => current.id === itemId);
    if (!item) throw new Error("Item nao encontrado na visita.");
    if (item.tipo_servico !== "preventiva") throw new Error("O item selecionado nao e uma preventiva.");
    if (["concluido", "cancelado"].includes(item.status)) throw new Error("O item nao pode mais ser executado.");

    const os = item.os_id
      ? { id: item.os_id }
      : await preventivasService.abrirPreventivaPlano({
          equipamentoId: item.equipamento_id,
          empresaId: visita.plano?.empresa_id || item.equipamento?.empresa_id || "",
          planoId: visita.plano_id,
          planoExecucaoId: visita.id,
          planoExecucaoItemId: item.id,
          dataAbertura: visita.data_abertura_preventiva || visita.data_abertura || visita.data_prevista,
        });
    const now = new Date().toISOString();
    const { error } = await supabase.from("plano_execucao_itens").update({
      status: item.status === "pendente" ? "aberto" : item.status,
      os_id: os.id,
      aberto_em: item.aberto_em || now,
      iniciado_em: item.iniciado_em || now,
    }).eq("id", item.id);
    if (error) throw new Error(error.message);
    await marcarVisitaEmExecucao(visita.id);
    const atualizada = await planosService.buscarExecucaoPlanoPorId(visita.id);
    return (atualizada.itens || []).find((current) => current.id === item.id) as PlanoExecucaoItem;
  },

  async criarOuAbrirCalibracaoItem(itemId: string) {
    const visita = await buscarVisitaDosItens([itemId]);
    const item = (visita.itens || []).find((current) => current.id === itemId);
    if (!item) throw new Error("Item nao encontrado na visita.");
    if (item.tipo_servico !== "calibracao") throw new Error("O item selecionado nao e uma calibracao.");
    if (["concluido", "cancelado"].includes(item.status)) throw new Error("O item nao pode mais ser executado.");

    let calibracaoId = item.calibracao_execucao_id;
    if (!calibracaoId) {
      const empresaId = visita.plano?.empresa_id || item.equipamento?.empresa_id || "";
      const tipoEquipamentoId = item.equipamento?.tipo_equipamento_id;
      if (!tipoEquipamentoId) throw new Error("O equipamento nao possui tipo cadastrado.");
      const { data: empresa, error: empresaError } = await supabase
        .from("empresas")
        .select("incluir_criterio_aceitacao_calibracao")
        .eq("id", empresaId)
        .single();
      if (empresaError) throw new Error(empresaError.message);
      const calibracao = await calibracaoExecucoesService.abrirCalibracaoPlano({
        empresaId,
        equipamentoId: item.equipamento_id,
        tipoEquipamentoId,
        planoId: visita.plano_id,
        planoExecucaoId: visita.id,
        planoExecucaoItemId: item.id,
        dataCalibracao: visita.data_realizacao_calibracao || visita.data_prevista,
        dataEmissao: visita.data_emissao_calibracao || visita.data_prevista,
        clienteUsaCriterio: Boolean(empresa.incluir_criterio_aceitacao_calibracao),
      });
      calibracaoId = calibracao.id;
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("plano_execucao_itens").update({
      status: item.status === "pendente" ? "aberto" : item.status,
      calibracao_execucao_id: calibracaoId,
      aberto_em: item.aberto_em || now,
      iniciado_em: item.iniciado_em || now,
    }).eq("id", item.id);
    if (error) throw new Error(error.message);
    await marcarVisitaEmExecucao(visita.id);
    const atualizada = await planosService.buscarExecucaoPlanoPorId(visita.id);
    return (atualizada.itens || []).find((current) => current.id === item.id) as PlanoExecucaoItem;
  },

  async iniciarItemExecucao(itemId: string) {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("plano_execucao_itens").update({ status: "em_execucao", iniciado_em: now }).eq("id", itemId).select("execucao_id").single();
    if (error) throw new Error(error.message);
    await supabase.from("plano_execucoes").update({ status: "em_execucao", iniciado_em: now }).eq("id", data.execucao_id).eq("status", "aberta");
  },

  async concluirItemExecucao(itemId: string, payload?: { osId?: string | null; calibracaoExecucaoId?: string | null; observacoes?: string | null }) {
    const { error } = await supabase.from("plano_execucao_itens").update({
      status: "concluido", concluido_em: new Date().toISOString(), finalizado_em: new Date().toISOString(),
      os_id: payload?.osId || null, calibracao_execucao_id: payload?.calibracaoExecucaoId || null,
      observacoes: payload?.observacoes?.trim() || null,
    }).eq("id", itemId);
    if (error) throw new Error(error.message);
  },

  async cancelarItemExecucao(itemId: string, motivo = "Cancelado pelo usuario.") {
    return planosService.cancelarItensEmLote([itemId], motivo);
  },

  async iniciarItemVisita(itemId: string) {
    return planosService.iniciarItemExecucao(itemId);
  },

  async concluirItemVisita(itemId: string, payload?: { osId?: string | null; calibracaoExecucaoId?: string | null; observacoes?: string | null }) {
    return planosService.concluirItemExecucao(itemId, payload);
  },

  async cancelarItemVisita(itemId: string, motivo?: string) {
    return planosService.cancelarItemExecucao(itemId, motivo);
  },

  async abrirPreventivasEmLote(itemIds: string[]) {
    const visita = await buscarVisitaDosItens(itemIds);
    const itens = (visita.itens || []).filter((item) => itemIds.includes(item.id));
    let processados = 0;
    const ignorados: string[] = [];
    for (const item of itens) {
      if (item.tipo_servico !== "preventiva" || item.status !== "pendente") {
        ignorados.push(item.id);
        continue;
      }
      const os = await preventivasService.abrirPreventivaPlano({
        equipamentoId: item.equipamento_id,
        empresaId: visita.plano?.empresa_id || item.equipamento?.empresa_id || "",
        planoId: visita.plano_id,
        planoExecucaoId: visita.id,
        planoExecucaoItemId: item.id,
        dataAbertura: visita.data_abertura_preventiva || visita.data_abertura || visita.data_prevista,
      });
      const now = new Date().toISOString();
      const { error } = await supabase.from("plano_execucao_itens").update({
        status: "aberto", os_id: os.id, aberto_em: now, iniciado_em: now,
      }).eq("id", item.id);
      if (error) throw new Error(error.message);
      processados += 1;
    }
    if (processados) await marcarVisitaEmExecucao(visita.id);
    return { processados, ignorados };
  },

  async finalizarPreventivasConformesEmLote(
    itemIds: string[],
    visitaId?: string
  ): Promise<ResultadoFinalizacaoPreventivasLote> {
    const visita = await buscarVisitaDosItens(itemIds, visitaId);
    const itens = new Map((visita.itens || []).map((item) => [item.id, item]));
    const resultado: ResultadoFinalizacaoPreventivasLote = {
      totalSelecionados: itemIds.length,
      totalFinalizados: 0,
      totalIgnorados: 0,
      finalizados: [],
      ignorados: [],
    };
    const ignorar = (itemId: string, equipamentoId: string, motivo: string) => {
      resultado.ignorados.push({ itemId, equipamentoId, motivo });
    };

    for (const itemId of itemIds) {
      const item = itens.get(itemId);
      if (!item) {
        ignorar(itemId, "", "Item nao encontrado na visita.");
        continue;
      }
      if (item.tipo_servico !== "preventiva") {
        ignorar(item.id, item.equipamento_id, "Item nao e uma preventiva.");
        continue;
      }
      if (item.status === "concluido") {
        ignorar(item.id, item.equipamento_id, "Item ja concluido.");
        continue;
      }
      if (item.status === "cancelado") {
        ignorar(item.id, item.equipamento_id, "Item cancelado.");
        continue;
      }
      if (!item.equipamento?.ativo) {
        ignorar(item.id, item.equipamento_id, "Equipamento desativado.");
        continue;
      }
      const tipoEquipamentoId = item.equipamento.tipo_equipamento_id;
      if (!tipoEquipamentoId) {
        ignorar(item.id, item.equipamento_id, "O equipamento nao possui tipo cadastrado.");
        continue;
      }

      try {
        const procedimento = await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(tipoEquipamentoId);
        if (!procedimento) {
          ignorar(item.id, item.equipamento_id, "Checklist de preventiva nao cadastrado para o tipo de equipamento.");
          continue;
        }

        let osId = item.os_id;
        if (!osId) {
          const os = await preventivasService.abrirPreventivaPlano({
            equipamentoId: item.equipamento_id,
            empresaId: visita.plano?.empresa_id || item.equipamento.empresa_id || "",
            planoId: visita.plano_id,
            planoExecucaoId: visita.id,
            planoExecucaoItemId: item.id,
            dataAbertura: visita.data_abertura_preventiva || visita.data_prevista,
          });
          osId = os.id;
          const now = new Date().toISOString();
          const { error } = await supabase.from("plano_execucao_itens").update({
            status: "aberto", os_id: osId, aberto_em: now, iniciado_em: now,
          }).eq("id", item.id);
          if (error) throw new Error(error.message);
        }

        await preventivasService.finalizarPreventivaConformePlano({
          ordemServicoId: osId,
          equipamentoId: item.equipamento_id,
          empresaId: visita.plano?.empresa_id || item.equipamento.empresa_id || "",
          procedimentoId: procedimento.id,
          dataAbertura: visita.data_abertura_preventiva || visita.data_prevista,
          dataFechamento: visita.data_fechamento_preventiva || null,
        });
        await planosService.concluirItemExecucao(item.id, { osId });
        resultado.finalizados.push({
          itemId: item.id,
          equipamentoId: item.equipamento_id,
          osId,
        });
      } catch (error) {
        ignorar(
          item.id,
          item.equipamento_id,
          error instanceof Error ? error.message : "Erro inesperado ao finalizar preventiva."
        );
      }
    }

    resultado.totalFinalizados = resultado.finalizados.length;
    resultado.totalIgnorados = resultado.ignorados.length;
    if (resultado.totalFinalizados) await marcarVisitaEmExecucao(visita.id);
    return resultado;
  },

  async abrirCalibracoesEmLote(itemIds: string[]) {
    const visita = await buscarVisitaDosItens(itemIds);
    const itens = (visita.itens || []).filter((item) => itemIds.includes(item.id));
    const empresaId = visita.plano?.empresa_id || "";
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("incluir_criterio_aceitacao_calibracao")
      .eq("id", empresaId)
      .single();
    if (empresaError) throw new Error(empresaError.message);
    let processados = 0;
    const ignorados: string[] = [];
    for (const item of itens) {
      if (item.tipo_servico !== "calibracao" || item.status !== "pendente") {
        ignorados.push(item.id);
        continue;
      }
      const tipoEquipamentoId = item.equipamento?.tipo_equipamento_id;
      if (!tipoEquipamentoId) throw new Error("O equipamento nao possui tipo cadastrado.");
      const calibracao = await calibracaoExecucoesService.abrirCalibracaoPlano({
        empresaId,
        equipamentoId: item.equipamento_id,
        tipoEquipamentoId,
        planoId: visita.plano_id,
        planoExecucaoId: visita.id,
        planoExecucaoItemId: item.id,
        dataCalibracao: visita.data_realizacao_calibracao || visita.data_prevista,
        dataEmissao: visita.data_emissao_calibracao || visita.data_prevista,
        clienteUsaCriterio: Boolean(empresa.incluir_criterio_aceitacao_calibracao),
      });
      const now = new Date().toISOString();
      const { error } = await supabase.from("plano_execucao_itens").update({
        status: "aberto", calibracao_execucao_id: calibracao.id, aberto_em: now, iniciado_em: now,
      }).eq("id", item.id);
      if (error) throw new Error(error.message);
      processados += 1;
    }
    if (processados) await marcarVisitaEmExecucao(visita.id);
    return { processados, ignorados };
  },

  async executarPreventivasEmLote(itemIds: string[]) {
    return planosService.abrirPreventivasEmLote(itemIds);
  },

  async executarCalibracoesEmLote(itemIds: string[]) {
    return planosService.abrirCalibracoesEmLote(itemIds);
  },

  async cancelarItensEmLote(itemIds: string[], motivo: string) {
    if (!motivo.trim()) throw new Error("Informe o motivo do cancelamento.");
    const visita = await buscarVisitaDosItens(itemIds);
    const itens = (visita.itens || []).filter((item) => itemIds.includes(item.id));
    let processados = 0;
    const ignorados: string[] = [];
    for (const item of itens) {
      if (["concluido", "cancelado"].includes(item.status)) {
        ignorados.push(item.id);
        continue;
      }
      if (item.os_id) await preventivasService.cancelarPreventivaPlano(item.os_id, motivo);
      if (item.calibracao_execucao_id) await calibracaoExecucoesService.cancelarExecucao(item.calibracao_execucao_id);
      const now = new Date().toISOString();
      const { error } = await supabase.from("plano_execucao_itens").update({
        status: "cancelado", motivo_cancelamento: motivo.trim(),
        finalizado_em: now, concluido_em: now,
      }).eq("id", item.id);
      if (error) throw new Error(error.message);
      processados += 1;
    }
    return { processados, ignorados };
  },

  async concluirExecucaoPlano(id: string) {
    const execucao = await planosService.buscarExecucaoPlanoPorId(id);
    if ((execucao.itens || []).some((item) => !["concluido", "cancelado"].includes(item.status))) {
      throw new Error("Conclua ou cancele todos os itens antes de encerrar a execucao.");
    }
    const encerradoEm = new Date().toISOString();
    const { error } = await supabase.from("plano_execucoes").update({
      status: "concluida", encerrado_em: encerradoEm, data_fechamento: encerradoEm.slice(0, 10),
    }).eq("id", id);
    if (error) throw new Error(error.message);
    const plano = execucao.plano || await planosService.buscarPlanoPorId(execucao.plano_id);
    const { error: planoError } = await supabase.from("planos").update({
      proxima_execucao: calcularProximaExecucao(execucao.data_prevista, plano.frequencia),
    }).eq("id", execucao.plano_id);
    if (planoError) throw new Error(planoError.message);
  },

  async cancelarExecucaoPlano(id: string) {
    const execucao = await planosService.buscarExecucaoPlanoPorId(id);
    const cancelaveis = (execucao.itens || [])
      .filter((item) => !["concluido", "cancelado"].includes(item.status))
      .map((item) => item.id);
    if (cancelaveis.length) {
      await planosService.cancelarItensEmLote(cancelaveis, "Visita cancelada.");
    }
    const { error } = await supabase.from("plano_execucoes").update({
      status: "cancelada", encerrado_em: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async concluirVisitaPlano(id: string) {
    return planosService.concluirExecucaoPlano(id);
  },
};

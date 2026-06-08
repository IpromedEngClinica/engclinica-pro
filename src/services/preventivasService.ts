import { supabase } from "@/lib/supabaseClient";
import { ordensServicoService } from "@/services/ordensServicoService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { procedimentosPreventivaService } from "@/services/procedimentosPreventivaService";
import type {
  AprovacaoUsoResposta,
  ChecklistResposta,
  ProcedimentoPreventivaTipoResposta,
} from "@/services/procedimentosPreventivaService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";

export type PreventivaRespostaInput = {
  procedimentoItemId?: string | null;
  descricao: string;
  tipoResposta: ProcedimentoPreventivaTipoResposta;
  resposta: ChecklistResposta | AprovacaoUsoResposta;
  observacao?: string;
  ordem: number;
};

export type ExecutarPreventivaInput = {
  equipamentoId: string;
  empresaId: string;
  procedimentoId: string;
  respostas: PreventivaRespostaInput[];
  observacoes?: string;
};

export type AtualizarChecklistPreventivaInput = {
  checklistId: string;
  ordemServicoId: string;
  resultadoGeral: AprovacaoUsoResposta;
  observacoes?: string;
  itens: Array<{
    id?: string;
    procedimentoItemId?: string | null;
    descricao: string;
    tipoResposta: ProcedimentoPreventivaTipoResposta;
    resposta: ChecklistResposta | AprovacaoUsoResposta;
    observacao?: string;
    ordem: number;
  }>;
};

export type ChecklistPreventivaOsRespostaInput = {
  procedimentoItemId?: string | null;
  descricao: string;
  tipoResposta: ProcedimentoPreventivaTipoResposta;
  resposta?: ChecklistResposta | AprovacaoUsoResposta | "";
  observacao?: string;
  ordem: number;
};

export type SalvarChecklistPreventivaOsInput = {
  osId: string;
  respostas: ChecklistPreventivaOsRespostaInput[];
  resultadoGeral?: AprovacaoUsoResposta | "";
  observacoes?: string;
};

export type ConcluirChecklistPreventivaInput = SalvarChecklistPreventivaOsInput & {
  dataFechamento?: string | null;
  planoCicloItemId?: string | null;
};

const selectEquipamento = `
  id,
  organizacao_id,
  empresa_id,
  tipo_equipamento_id,
  tipo_texto,
  fabricante,
  modelo,
  numero_serie,
  patrimonio,
  tag,
  setor,
  status,
  data_aquisicao,
  data_instalacao,
  data_ultima_preventiva,
  data_proxima_preventiva,
  data_ultima_calibracao,
  data_proxima_calibracao,
  observacoes,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    organizacao_id,
    nome,
    nome_fantasia,
    tipo_cliente,
    tipo_relacao,
    cpf_cnpj,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    contato,
    email,
    celular,
    telefone,
    observacoes,
    ativo,
    created_at,
    updated_at
  ),
  tipo_equipamento:tipos_equipamento (
    id,
    nome
  )
`;

const getOrganizacaoId = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  }

  return data as string;
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

  const { data, error } = await supabase
    .from("tipos_os")
    .select("id, nome")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("Tipo de OS para manutencao preventiva nao encontrado.");
  }

  return data as { id: string; nome: string };
};

const buscarEstadoFechado = async () => {
  const { data: fechado, error: fechadoError } = await supabase
    .from("estados_os")
    .select("id, nome")
    .ilike("nome", "Fechada")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!fechadoError && fechado?.id) {
    return fechado as { id: string; nome: string };
  }

  const { data, error } = await supabase
    .from("estados_os")
    .select("id, nome")
    .eq("ativo", true)
    .eq("finaliza_os", true)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("Estado fechado da OS nao encontrado.");
  }

  return data as { id: string; nome: string };
};

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const resultadoGeral = (respostas: PreventivaRespostaInput[]) => {
  const aprovacao = respostas.find(
    (resposta) => resposta.tipoResposta === "aprovacao_uso"
  )?.resposta;

  if (
    aprovacao === "nao_aprovado" ||
    aprovacao === "aprovado_com_restricao"
  ) {
    return aprovacao;
  }

  return "aprovado";
};

const getChecklistPreventiva = (os: OrdemServicoSupabase | null) => {
  const checklist = os?.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const chaveResposta = (item: {
  procedimento_item_id?: string | null;
  procedimentoItemId?: string | null;
  descricao: string;
  tipo_resposta?: string;
  tipoResposta?: string;
}) =>
  item.procedimento_item_id ||
  item.procedimentoItemId ||
  `${item.tipo_resposta || item.tipoResposta || "conformidade"}:${item.descricao.trim().toLowerCase().replace(/\s+/g, " ")}`;

const buscarOsCompleta = async (osId: string) => ordensServicoService.buscarPorId(osId);

const garantirChecklistPreventiva = async (osId: string) => {
  const os = await buscarOsCompleta(osId);
  const existente = getChecklistPreventiva(os);
  if (existente) return { os, checklist: existente };

  if (!os.equipamento_id || !os.equipamento) {
    throw new Error("OS sem equipamento vinculado.");
  }

  const tipoEquipamentoId = os.equipamento.tipo_equipamento_id;
  if (!tipoEquipamentoId) {
    throw new Error("Equipamento sem tipo cadastrado para localizar procedimento preventivo.");
  }

  const procedimento = await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(tipoEquipamentoId);
  if (!procedimento) {
    throw new Error("Nenhum procedimento preventivo cadastrado para este tipo de equipamento.");
  }

  const { data: checklist, error } = await supabase
    .from("os_checklists_preventiva")
    .insert({
      ordem_servico_id: osId,
      procedimento_id: procedimento.id,
      titulo_procedimento: procedimento.titulo,
      tipo_equipamento_nome:
        procedimento.tipo_equipamento?.nome ||
        os.equipamento.tipo_equipamento?.nome ||
        os.equipamento.tipo_texto ||
        null,
      validade_meses: Number(procedimento.validade_meses || 12),
      data_validade: toDateOnly(addMonths(new Date(), Number(procedimento.validade_meses || 12))),
      resultado_geral: "aprovado",
      observacoes: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return {
    os,
    checklist: {
      id: checklist.id,
      ordem_servico_id: osId,
      procedimento_id: procedimento.id,
      titulo_procedimento: procedimento.titulo,
      tipo_equipamento_nome:
        procedimento.tipo_equipamento?.nome ||
        os.equipamento.tipo_equipamento?.nome ||
        os.equipamento.tipo_texto ||
        null,
      validade_meses: Number(procedimento.validade_meses || 12),
      data_validade: toDateOnly(addMonths(new Date(), Number(procedimento.validade_meses || 12))),
      resultado_geral: "aprovado" as const,
      observacoes: null,
      created_at: new Date().toISOString(),
      itens: [],
    },
  };
};

const salvarRespostasChecklist = async (
  checklistId: string,
  respostas: ChecklistPreventivaOsRespostaInput[]
) => {
  const respostasValidas = respostas.filter((item) => item.descricao.trim() && item.resposta);
  const { data: existentes, error: existentesError } = await supabase
    .from("os_checklist_preventiva_itens")
    .select("id, procedimento_item_id, descricao, tipo_resposta")
    .eq("checklist_id", checklistId);

  if (existentesError) throw new Error(existentesError.message);

  const porChave = new Map<string, Array<{ id: string; procedimento_item_id: string | null; descricao: string; tipo_resposta: string }>>();
  (existentes || []).forEach((item) => {
    const chave = chaveResposta(item);
    porChave.set(chave, [...(porChave.get(chave) || []), item]);
  });

  for (const resposta of respostasValidas) {
    const chave = chaveResposta(resposta);
    const matches = porChave.get(chave) || [];
    const payload = {
      checklist_id: checklistId,
      procedimento_item_id: resposta.procedimentoItemId || null,
      descricao: resposta.descricao.trim(),
      tipo_resposta: resposta.tipoResposta,
      resposta: resposta.resposta,
      observacao: resposta.observacao?.trim() || null,
      ordem: resposta.ordem,
    };

    if (matches[0]) {
      const { error } = await supabase
        .from("os_checklist_preventiva_itens")
        .update(payload)
        .eq("id", matches[0].id);
      if (error) throw new Error(error.message);

      const duplicados = matches.slice(1).map((item) => item.id);
      if (duplicados.length) {
        const { error: deleteError } = await supabase
          .from("os_checklist_preventiva_itens")
          .delete()
          .in("id", duplicados);
        if (deleteError) throw new Error(deleteError.message);
      }
    } else {
      const { error } = await supabase
        .from("os_checklist_preventiva_itens")
        .insert(payload);
      if (error) throw new Error(error.message);
    }
  }
};

const calcularResultadoGeral = (respostas: ChecklistPreventivaOsRespostaInput[]) => {
  const aprovacao = respostas.find((item) => item.tipoResposta === "aprovacao_uso")?.resposta;
  if (aprovacao === "nao_aprovado" || aprovacao === "aprovado_com_restricao") return aprovacao;
  return "aprovado";
};

export const preventivasService = {
  async buscarChecklistPorOsId(osId: string) {
    return buscarOsCompleta(osId);
  },

  async buscarProcedimentoPorEquipamentoId(equipamentoId: string) {
    const { data: equipamento, error } = await supabase
      .from("equipamentos")
      .select(selectEquipamento)
      .eq("id", equipamentoId)
      .single();

    if (error) throw new Error(error.message);

    const equipamentoData = equipamento as unknown as EquipamentoSupabase;
    if (!equipamentoData.tipo_equipamento_id) return null;
    return procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(equipamentoData.tipo_equipamento_id);
  },

  async salvarChecklistRascunho(input: SalvarChecklistPreventivaOsInput) {
    const { checklist } = await garantirChecklistPreventiva(input.osId);
    const resultado = input.resultadoGeral || calcularResultadoGeral(input.respostas);

    const { error: checklistError } = await supabase
      .from("os_checklists_preventiva")
      .update({
        resultado_geral: resultado,
        observacoes: input.observacoes?.trim() || null,
      })
      .eq("id", checklist.id)
      .eq("ordem_servico_id", input.osId);

    if (checklistError) throw new Error(checklistError.message);
    await salvarRespostasChecklist(checklist.id, input.respostas);

    await supabase.from("ordem_servico_historico").insert({
      ordem_servico_id: input.osId,
      usuario_id: null,
      estado_anterior_id: null,
      estado_novo_id: null,
      acao: "checklist_preventiva_rascunho",
      observacao: "Rascunho do checklist de preventiva salvo.",
    });

    return buscarOsCompleta(input.osId);
  },

  async concluirChecklistPreventiva(input: ConcluirChecklistPreventivaInput) {
    const osAtualizada = await this.salvarChecklistRascunho({
      osId: input.osId,
      respostas: input.respostas,
      resultadoGeral: input.resultadoGeral || calcularResultadoGeral(input.respostas),
      observacoes: input.observacoes,
    });
    const estadoFechado = await buscarEstadoFechado();
    const dataFechamento = input.dataFechamento
      ? `${input.dataFechamento.slice(0, 10)}T00:00:00`
      : new Date().toISOString();

    const { error: osError } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoFechado.id,
        status_sistema: "fechada",
        data_fechamento: dataFechamento,
        descricao_servico: "Manutencao preventiva realizada conforme checklist.",
      })
      .eq("id", input.osId);

    if (osError) throw new Error(osError.message);

    await supabase.from("ordem_servico_historico").insert({
      ordem_servico_id: input.osId,
      usuario_id: null,
      estado_anterior_id: osAtualizada.estado_os_id,
      estado_novo_id: estadoFechado.id,
      acao: "preventiva_concluida",
      observacao: "Manutencao preventiva concluida pelo checklist.",
    });

    if (osAtualizada.equipamento_id) {
      const checklist = getChecklistPreventiva(osAtualizada);
      const data = new Date(dataFechamento);
      const validadeMeses = Number(checklist?.validade_meses || 12);
      await supabase
        .from("equipamentos")
        .update({
          data_ultima_preventiva: toDateOnly(data),
          data_proxima_preventiva: toDateOnly(addMonths(data, validadeMeses)),
        })
        .eq("id", osAtualizada.equipamento_id);
    }

    if (input.planoCicloItemId) {
      const { error: itemError } = await supabase
        .from("plano_ciclo_itens")
        .update({
          os_id: input.osId,
          status: "concluido",
          concluido_em: new Date().toISOString(),
        })
        .eq("id", input.planoCicloItemId);
      if (itemError) throw new Error(itemError.message);
    }

    return buscarOsCompleta(input.osId);
  },

  async editarChecklistPreventiva(input: SalvarChecklistPreventivaOsInput) {
    return this.salvarChecklistRascunho(input);
  },

  async atualizarChecklistPreventiva(input: AtualizarChecklistPreventivaInput) {
    const { error: checklistError } = await supabase
      .from("os_checklists_preventiva")
      .update({
        resultado_geral: input.resultadoGeral,
        observacoes: input.observacoes?.trim() || null,
      })
      .eq("id", input.checklistId)
      .eq("ordem_servico_id", input.ordemServicoId);

    if (checklistError) {
      throw new Error(checklistError.message);
    }

    const { error: deleteError } = await supabase
      .from("os_checklist_preventiva_itens")
      .delete()
      .eq("checklist_id", input.checklistId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const itens = input.itens
      .map((item, index) => ({
        checklist_id: input.checklistId,
        procedimento_item_id: item.procedimentoItemId || null,
        descricao: item.descricao.trim(),
        tipo_resposta: item.tipoResposta,
        resposta: item.resposta,
        observacao: item.observacao?.trim() || null,
        ordem: item.ordem || index + 1,
      }))
      .filter((item) => item.descricao);

    if (itens.length > 0) {
      const { error: itensError } = await supabase
        .from("os_checklist_preventiva_itens")
        .insert(itens);

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    const { error: historicoError } = await supabase
      .from("ordem_servico_historico")
      .insert({
        ordem_servico_id: input.ordemServicoId,
        usuario_id: null,
        estado_anterior_id: null,
        estado_novo_id: null,
        acao: "checklist_preventiva_editado",
        observacao: "Checklist de manutencao preventiva atualizado.",
      });

    if (historicoError) {
      console.warn("Erro ao registrar historico da OS:", historicoError.message);
    }

    return ordensServicoService.buscarPorId(input.ordemServicoId);
  },

  async executarPreventiva(input: ExecutarPreventivaInput) {
    const organizacaoId = await getOrganizacaoId();
    const procedimento = await procedimentosPreventivaService.buscarPorId(
      input.procedimentoId
    );

    const { data: equipamento, error: equipamentoError } = await supabase
      .from("equipamentos")
      .select(selectEquipamento)
      .eq("id", input.equipamentoId)
      .single();

    if (equipamentoError) {
      throw new Error(equipamentoError.message);
    }

    const equipamentoData = equipamento as unknown as EquipamentoSupabase;
    const tipoOS = await buscarTipoOSPreventiva();
    const estadoFechado = await buscarEstadoFechado();
    const dataFechamento = new Date();
    const validadeMeses = Number(procedimento.validade_meses || 12);
    const dataValidade = addMonths(dataFechamento, validadeMeses);

    const { data: osCriada, error: osError } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: input.empresaId || equipamentoData.empresa_id,
        equipamento_id: equipamentoData.id,
        tipo_os_id: tipoOS.id,
        estado_os_id: estadoFechado.id,
        solicitante_texto:
          equipamentoData.empresa?.nome_fantasia ||
          equipamentoData.empresa?.nome ||
          null,
        responsavel_texto: "Icaro Rezende",
        data_fechamento: dataFechamento.toISOString(),
        problema_relatado: null,
        origem_problema: "Manutencao preventiva",
        descricao_servico:
          "Manutencao preventiva realizada conforme checklist.",
        observacoes: input.observacoes?.trim() || null,
        prioridade: "normal",
        status_sistema: "fechada",
        ativo: true,
      })
      .select("id")
      .single();

    if (osError) {
      throw new Error(osError.message);
    }

    const { data: checklist, error: checklistError } = await supabase
      .from("os_checklists_preventiva")
      .insert({
        ordem_servico_id: osCriada.id,
        procedimento_id: procedimento.id,
        titulo_procedimento: procedimento.titulo,
        tipo_equipamento_nome:
          procedimento.tipo_equipamento?.nome ||
          equipamentoData.tipo_equipamento?.nome ||
          equipamentoData.tipo_texto ||
          null,
        validade_meses: validadeMeses,
        data_validade: toDateOnly(dataValidade),
        resultado_geral: resultadoGeral(input.respostas),
        observacoes: input.observacoes?.trim() || null,
      })
      .select("id")
      .single();

    if (checklistError) {
      throw new Error(checklistError.message);
    }

    const respostas = [...input.respostas].sort((a, b) => a.ordem - b.ordem);

    if (respostas.length > 0) {
      const { error: itensError } = await supabase
        .from("os_checklist_preventiva_itens")
        .insert(
          respostas.map((resposta, index) => ({
            checklist_id: checklist.id,
            procedimento_item_id: resposta.procedimentoItemId || null,
            descricao: resposta.descricao,
            tipo_resposta: resposta.tipoResposta,
            resposta: resposta.resposta,
            observacao: resposta.observacao?.trim() || null,
            ordem: resposta.ordem || index + 1,
          }))
        );

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    await supabase.from("ordem_servico_historico").insert({
      ordem_servico_id: osCriada.id,
      usuario_id: null,
      estado_anterior_id: null,
      estado_novo_id: estadoFechado.id,
      acao: "preventiva_executada",
      observacao: `Manutencao preventiva criada a partir do procedimento ${procedimento.titulo}.`,
    });

    await supabase
      .from("equipamentos")
      .update({
        data_ultima_preventiva: toDateOnly(dataFechamento),
        data_proxima_preventiva: toDateOnly(dataValidade),
      })
      .eq("id", equipamentoData.id);

    return ordensServicoService.buscarPorId(osCriada.id);
  },
};

import { supabase } from "@/lib/supabaseClient";
import { ordensServicoService } from "@/services/ordensServicoService";
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
  ordemServicoId?: string | null;
  respostas: PreventivaRespostaInput[];
  observacoes?: string;
  dataAbertura?: string | null;
  dataFechamento?: string | null;
};

export type AbrirPreventivaPlanoInput = {
  equipamentoId: string;
  empresaId: string;
  planoId: string;
  planoExecucaoId: string;
  planoExecucaoItemId: string;
  dataAbertura?: string | null;
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

const buscarEstadoAberto = async () => {
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

const buscarEstadoCancelado = async () => {
  const { data, error } = await supabase
    .from("estados_os")
    .select("id, nome")
    .eq("ativo", true)
    .eq("cancela_os", true)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("Estado cancelado da OS nao encontrado.");
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

export const preventivasService = {
  async abrirPreventivaPlano(input: AbrirPreventivaPlanoInput) {
    const organizacaoId = await getOrganizacaoId();
    const { data: existente, error: existenteError } = await supabase
      .from("ordens_servico")
      .select("id")
      .eq("plano_execucao_item_id", input.planoExecucaoItemId)
      .eq("status_sistema", "aberta")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    if (existenteError) throw new Error(existenteError.message);
    if (existente?.id) return ordensServicoService.buscarPorId(existente.id);

    const [tipoOS, estadoAberto] = await Promise.all([
      buscarTipoOSPreventiva(),
      buscarEstadoAberto(),
    ]);
    const dataAbertura = input.dataAbertura
      ? new Date(`${input.dataAbertura}T12:00:00`).toISOString()
      : new Date().toISOString();
    const { data, error } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: input.empresaId,
        equipamento_id: input.equipamentoId,
        tipo_os_id: tipoOS.id,
        estado_os_id: estadoAberto.id,
        data_abertura: dataAbertura,
        origem_fluxo: "plano",
        origem_problema: "Manutencao preventiva",
        descricao_servico: "Manutencao preventiva aberta a partir de visita recorrente.",
        observacoes: "OS gerada automaticamente pela execucao do plano.",
        prioridade: "normal",
        status_sistema: "aberta",
        plano_id: input.planoId,
        plano_execucao_id: input.planoExecucaoId,
        plano_execucao_item_id: input.planoExecucaoItemId,
        ativo: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("ordem_servico_historico").insert({
      ordem_servico_id: data.id,
      estado_novo_id: estadoAberto.id,
      acao: "criada_plano_preventiva",
      observacao: "OS preventiva aberta a partir de visita recorrente do plano.",
    });

    await supabase
      .from("equipamentos")
      .update({ status: "Em manutenção" })
      .eq("id", input.equipamentoId);

    return ordensServicoService.buscarPorId(data.id);
  },

  async cancelarPreventivaPlano(ordemServicoId: string, motivo: string) {
    const estadoCancelado = await buscarEstadoCancelado();
    await ordensServicoService.alterarEstado(ordemServicoId, estadoCancelado.id);
    const { error } = await supabase
      .from("ordens_servico")
      .update({
        observacoes: motivo.trim() || null,
      })
      .eq("id", ordemServicoId);
    if (error) throw new Error(error.message);
    await supabase.from("ordem_servico_historico").insert({
      ordem_servico_id: ordemServicoId,
      estado_novo_id: estadoCancelado.id,
      acao: "cancelada_plano",
      observacao: motivo.trim() || "Item cancelado na visita do plano.",
    });
  },

  async finalizarPreventivaConformePlano(input: {
    ordemServicoId: string;
    equipamentoId: string;
    empresaId: string;
    procedimentoId: string;
    dataAbertura?: string | null;
    dataFechamento?: string | null;
  }) {
    const procedimento = await procedimentosPreventivaService.buscarPorId(
      input.procedimentoId
    );
    return preventivasService.executarPreventiva({
      ...input,
      observacoes: "OS gerada automaticamente pela execucao do plano.",
      respostas: (procedimento.itens || []).map((item, index) => ({
        procedimentoItemId: item.id,
        descricao: item.descricao,
        tipoResposta: item.tipo_resposta,
        resposta: item.tipo_resposta === "aprovacao_uso" ? "aprovado" : "conforme",
        observacao: item.tipo_resposta === "aprovacao_uso" ? "Aprovado para uso" : undefined,
        ordem: item.ordem || index + 1,
      })),
    });
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
    const estadoFechado = await buscarEstadoFechado();
    const dataAbertura = input.dataAbertura
      ? new Date(`${input.dataAbertura}T12:00:00`)
      : new Date();
    const dataFechamento = input.dataFechamento
      ? new Date(`${input.dataFechamento}T12:00:00`)
      : new Date();
    const validadeMeses = Number(procedimento.validade_meses || 12);
    const dataValidade = addMonths(dataFechamento, validadeMeses);

    let osCriada: { id: string };
    const finalizarOrdemServicoExistente = Boolean(input.ordemServicoId);
    if (input.ordemServicoId) {
      osCriada = { id: input.ordemServicoId };
    } else {
      const tipoOS = await buscarTipoOSPreventiva();
      const { data, error } = await supabase
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
          data_abertura: dataAbertura.toISOString(),
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
      osCriada = data as { id: string };
      if (error) throw new Error(error.message);
    }

    const checklistPayload = {
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
    };
    const { data: checklistExistente, error: checklistExistenteError } = await supabase
      .from("os_checklists_preventiva")
      .select("id")
      .eq("ordem_servico_id", osCriada.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (checklistExistenteError) throw new Error(checklistExistenteError.message);

    let checklist: { id: string };
    if (checklistExistente) {
      const { data, error } = await supabase
        .from("os_checklists_preventiva")
        .update(checklistPayload)
        .eq("id", checklistExistente.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      checklist = data;
      const { error: deleteError } = await supabase
        .from("os_checklist_preventiva_itens")
        .delete()
        .eq("checklist_id", checklist.id);
      if (deleteError) throw new Error(deleteError.message);
    } else {
      const { data, error } = await supabase
        .from("os_checklists_preventiva")
        .insert(checklistPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      checklist = data;
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

    if (finalizarOrdemServicoExistente) {
      const { error: osError } = await supabase
        .from("ordens_servico")
        .update({
          descricao_servico: "Manutencao preventiva realizada conforme checklist.",
          observacoes: input.observacoes?.trim() || null,
        })
        .eq("id", osCriada.id);
      if (osError) throw new Error(osError.message);
      await ordensServicoService.alterarEstado(osCriada.id, estadoFechado.id);
      const { error: dataFechamentoError } = await supabase
        .from("ordens_servico")
        .update({ data_fechamento: dataFechamento.toISOString() })
        .eq("id", osCriada.id);
      if (dataFechamentoError) throw new Error(dataFechamentoError.message);
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

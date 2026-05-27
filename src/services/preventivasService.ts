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

export const preventivasService = {
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

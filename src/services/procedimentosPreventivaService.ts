import { supabase } from "@/lib/supabaseClient";

export type ChecklistResposta = "conforme" | "nao_conforme" | "nao_aplica";

export type AprovacaoUsoResposta =
  | "aprovado"
  | "nao_aprovado"
  | "aprovado_com_restricao";

export type ProcedimentoPreventivaTipoResposta =
  | "conformidade"
  | "aprovacao_uso";

export type ProcedimentoPreventivaItem = {
  id: string;
  procedimento_id: string;
  descricao: string;
  tipo_resposta: ProcedimentoPreventivaTipoResposta;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
};

export type ProcedimentoPreventiva = {
  id: string;
  organizacao_id: string;
  tipo_equipamento_id: string;
  titulo: string;
  descricao: string | null;
  validade_meses: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  tipo_equipamento?: {
    id: string;
    nome: string;
  } | null;
  itens?: ProcedimentoPreventivaItem[];
};

export type ProcedimentoPreventivaItemInput = {
  id?: string;
  descricao?: string;
  tipoResposta?: ProcedimentoPreventivaTipoResposta;
  obrigatorio?: boolean;
  ordem?: number;
};

export type ProcedimentoPreventivaInput = {
  tipoEquipamentoId: string;
  titulo: string;
  descricao?: string;
  validadeMeses?: number;
  itens?: ProcedimentoPreventivaItemInput[];
};

const selectProcedimentos = `
  id,
  organizacao_id,
  tipo_equipamento_id,
  titulo,
  descricao,
  validade_meses,
  ativo,
  created_at,
  updated_at,
  tipo_equipamento:tipos_equipamento (
    id,
    nome
  ),
  itens:procedimento_preventiva_itens (
    id,
    procedimento_id,
    descricao,
    tipo_resposta,
    ordem,
    obrigatorio,
    ativo
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

const ordenarItens = (procedimento: ProcedimentoPreventiva) => ({
  ...procedimento,
  itens: [...(procedimento.itens || [])]
    .filter((item) => item.ativo)
    .sort((a, b) => a.ordem - b.ordem),
});

const normalizarItens = (itens?: ProcedimentoPreventivaItemInput[]) => {
  const normalizados = (itens || [])
    .map((item, index) => ({
      descricao: item.descricao?.trim() || "",
      tipo_resposta: item.tipoResposta || "conformidade",
      obrigatorio: item.obrigatorio ?? true,
      ordem: item.ordem || index + 1,
      ativo: true,
    }))
    .filter((item) => item.descricao);

  const temAprovacao = normalizados.some(
    (item) => item.tipo_resposta === "aprovacao_uso"
  );

  if (!temAprovacao) {
    normalizados.push({
      descricao: "Aprovacao para Uso",
      tipo_resposta: "aprovacao_uso",
      obrigatorio: true,
      ordem: normalizados.length + 1,
      ativo: true,
    });
  }

  return normalizados.map((item, index) => ({
    ...item,
    ordem: index + 1,
  }));
};

const toPayload = (input: ProcedimentoPreventivaInput) => ({
  tipo_equipamento_id: input.tipoEquipamentoId,
  titulo: input.titulo.trim(),
  descricao: input.descricao?.trim() || null,
  validade_meses: Number(input.validadeMeses || 12),
});

export const procedimentosPreventivaService = {
  async listar() {
    const { data, error } = await supabase
      .from("procedimentos_preventiva")
      .select(selectProcedimentos)
      .eq("ativo", true)
      .order("titulo", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data || []) as unknown as ProcedimentoPreventiva[]).map(ordenarItens);
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("procedimentos_preventiva")
      .select(selectProcedimentos)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return ordenarItens(data as unknown as ProcedimentoPreventiva);
  },

  async buscarAtivoPorTipoEquipamento(tipoEquipamentoId: string) {
    const { data, error } = await supabase
      .from("procedimentos_preventiva")
      .select(selectProcedimentos)
      .eq("tipo_equipamento_id", tipoEquipamentoId)
      .eq("ativo", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? ordenarItens(data as unknown as ProcedimentoPreventiva)
      : null;
  },

  async criar(input: ProcedimentoPreventivaInput) {
    const organizacaoId = await getOrganizacaoId();

    const { data, error } = await supabase
      .from("procedimentos_preventiva")
      .insert({
        organizacao_id: organizacaoId,
        ...toPayload(input),
        ativo: true,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const itens = normalizarItens(input.itens);

    if (itens.length > 0) {
      const { error: itensError } = await supabase
        .from("procedimento_preventiva_itens")
        .insert(
          itens.map((item) => ({
            procedimento_id: data.id,
            ...item,
          }))
        );

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    return procedimentosPreventivaService.buscarPorId(data.id);
  },

  async atualizar(id: string, input: ProcedimentoPreventivaInput) {
    const { error } = await supabase
      .from("procedimentos_preventiva")
      .update(toPayload(input))
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("procedimento_preventiva_itens")
      .delete()
      .eq("procedimento_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const itens = normalizarItens(input.itens);

    if (itens.length > 0) {
      const { error: itensError } = await supabase
        .from("procedimento_preventiva_itens")
        .insert(
          itens.map((item) => ({
            procedimento_id: id,
            ...item,
          }))
        );

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    return procedimentosPreventivaService.buscarPorId(id);
  },

  async desativar(id: string) {
    const { error } = await supabase
      .from("procedimentos_preventiva")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  },
};

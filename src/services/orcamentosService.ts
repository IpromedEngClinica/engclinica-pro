import { supabase } from "@/lib/supabaseClient";

export type OrcamentoStatus =
  | "rascunho"
  | "emitido"
  | "aprovado"
  | "reprovado"
  | "cancelado";

export type OrcamentoItemTipo = "servico" | "peca" | "deslocamento" | "outro";

export type OrcamentoItemSupabase = {
  id: string;
  orcamento_id: string;
  tipo: OrcamentoItemTipo;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacoes: string | null;
  ordem: number;
  created_at: string;
};

export type OrcamentoSupabase = {
  id: string;
  organizacao_id: string;
  numero: string;

  empresa_id: string;
  equipamento_id: string | null;
  ordem_servico_id: string | null;

  data_orcamento: string;
  data_validade: string | null;

  status: OrcamentoStatus;

  observacoes: string | null;
  condicoes_pagamento: string | null;
  prazo_execucao: string | null;
  garantia: string | null;

  valor_total: number;

  aprovado_por: string | null;
  data_aprovacao: string | null;
  motivo_reprovacao: string | null;

  ativo: boolean;

  created_at: string;
  updated_at: string;

  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    ativo: boolean;
  } | null;

  equipamento?: {
    id: string;
    tipo_texto: string | null;
    fabricante: string | null;
    modelo: string | null;
    numero_serie: string | null;
    patrimonio: string | null;
    tag: string | null;
    setor: string | null;
    ativo: boolean;
    tipo_equipamento?: {
      id: string;
      nome: string;
    } | null;
  } | null;

  ordem_servico?: {
    id: string;
    numero: string;
    status_sistema: string;
    ativo: boolean;
  } | null;

  itens?: OrcamentoItemSupabase[];
};

export type OrcamentoItemInput = {
  tipo: OrcamentoItemTipo;
  descricao: string;
  quantidade?: number;
  valorUnitario?: number;
  observacoes?: string;
};

export type OrcamentoFormInput = {
  empresaId: string;
  equipamentoId?: string;
  ordemServicoId?: string;

  dataValidade?: string;

  status?: OrcamentoStatus;

  observacoes?: string;
  condicoesPagamento?: string;
  prazoExecucao?: string;
  garantia?: string;

  aprovadoPor?: string;
  dataAprovacao?: string;
  motivoReprovacao?: string;

  itens?: OrcamentoItemInput[];
};

const selectOrcamentos = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  data_orcamento,
  data_validade,
  status,
  observacoes,
  condicoes_pagamento,
  prazo_execucao,
  garantia,
  valor_total,
  aprovado_por,
  data_aprovacao,
  motivo_reprovacao,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    ativo
  ),
  equipamento:equipamentos (
    id,
    tipo_texto,
    fabricante,
    modelo,
    numero_serie,
    patrimonio,
    tag,
    setor,
    ativo,
    tipo_equipamento:tipos_equipamento (
      id,
      nome
    )
  ),
  ordem_servico:ordens_servico (
    id,
    numero,
    status_sistema,
    ativo
  ),
  itens:orcamento_itens (
    id,
    orcamento_id,
    tipo,
    descricao,
    quantidade,
    valor_unitario,
    valor_total,
    observacoes,
    ordem,
    created_at
  )
`;

const toDatabasePayload = (input: OrcamentoFormInput) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId || null,
  ordem_servico_id: input.ordemServicoId || null,
  data_validade: input.dataValidade || null,
  status: input.status || "rascunho",
  observacoes: input.observacoes || null,
  condicoes_pagamento: input.condicoesPagamento || null,
  prazo_execucao: input.prazoExecucao || null,
  garantia: input.garantia || null,
  aprovado_por: input.aprovadoPor || null,
  data_aprovacao: input.dataAprovacao || null,
  motivo_reprovacao: input.motivoReprovacao || null,
});

const normalizarItens = (itens?: OrcamentoItemInput[]) => {
  return (itens || [])
    .map((item, index) => {
      const quantidade = Number(item.quantidade || 1);
      const valorUnitario = Number(item.valorUnitario || 0);

      return {
        tipo: item.tipo || "servico",
        descricao: item.descricao.trim(),
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: quantidade * valorUnitario,
        observacoes: item.observacoes?.trim() || null,
        ordem: index + 1,
      };
    })
    .filter((item) => item.descricao);
};

export const orcamentosService = {
  async listar() {
    const { data, error } = await supabase
      .from("orcamentos")
      .select(selectOrcamentos)
      .eq("ativo", true)
      .order("data_orcamento", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrcamentoSupabase[];
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("orcamentos")
      .select(selectOrcamentos)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrcamentoSupabase;
  },

  async criar(input: OrcamentoFormInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Nao foi possivel identificar a organizacao do usuario.");
    }

    const { data: orcamentoCriado, error } = await supabase
      .from("orcamentos")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
        ativo: true,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const itens = normalizarItens(input.itens);

    if (itens.length > 0) {
      const { error: itensError } = await supabase.from("orcamento_itens").insert(
        itens.map((item) => ({
          orcamento_id: orcamentoCriado.id,
          ...item,
        }))
      );

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    await supabase.rpc("recalcular_total_orcamento", {
      p_orcamento_id: orcamentoCriado.id,
    });

    return orcamentosService.buscarPorId(orcamentoCriado.id);
  },

  async atualizar(id: string, input: OrcamentoFormInput) {
    const { error } = await supabase
      .from("orcamentos")
      .update(toDatabasePayload(input))
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("orcamento_itens")
      .delete()
      .eq("orcamento_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const itens = normalizarItens(input.itens);

    if (itens.length > 0) {
      const { error: itensError } = await supabase.from("orcamento_itens").insert(
        itens.map((item) => ({
          orcamento_id: id,
          ...item,
        }))
      );

      if (itensError) {
        throw new Error(itensError.message);
      }
    }

    await supabase.rpc("recalcular_total_orcamento", {
      p_orcamento_id: id,
    });

    return orcamentosService.buscarPorId(id);
  },

  async alterarStatus(
    id: string,
    status: OrcamentoStatus,
    extra?: {
      aprovadoPor?: string;
      motivoReprovacao?: string;
    }
  ) {
    const payload: Record<string, unknown> = {
      status,
    };

    if (status === "aprovado") {
      payload.aprovado_por = extra?.aprovadoPor || null;
      payload.data_aprovacao = new Date().toISOString();
      payload.motivo_reprovacao = null;
    }

    if (status === "reprovado") {
      payload.motivo_reprovacao = extra?.motivoReprovacao || null;
      payload.data_aprovacao = new Date().toISOString();
    }

    if (status === "cancelado") {
      payload.ativo = false;
    }

    const { error } = await supabase
      .from("orcamentos")
      .update(payload)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return orcamentosService.buscarPorId(id);
  },

  async cancelar(id: string) {
    return orcamentosService.alterarStatus(id, "cancelado");
  },
};

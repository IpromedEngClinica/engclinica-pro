import { supabase } from "@/lib/supabaseClient";

export type OrcamentoStatus =
  | "pendente"
  | "aprovado"
  | "reprovado"
  | "faturado"
  | "cancelado";

export type OrcamentoItemTipo = "servico" | "peca" | "deslocamento" | "outro";
export type OrcamentoTipo = "servico" | "pecas" | "pecas_servicos";
export type OrcamentoOrigem = "os" | "avulso";
export type FormaPagamento = "dinheiro" | "cartao" | "boleto" | "pix";
export type ModoPagamento = "avista" | "parcelado" | "entrada_parcela";
export type FreteTipo = "cif" | "fob";

export type OrcamentoItemSupabase = {
  id: string;
  orcamento_id: string;
  tipo: OrcamentoItemTipo;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacoes: string | null;
  garantia: string | null;
  tipo_servico_id: string | null;
  tipo_equipamento_id: string | null;
  peca_id: string | null;
  peca_nome: string | null;
  ordem: number;
  created_at: string;
  tipo_servico?: {
    id: string;
    nome: string;
  } | null;
  tipo_equipamento?: {
    id: string;
    nome: string;
  } | null;
  peca?: {
    id: string;
    nome: string;
  } | null;
};

export type OrcamentoSupabase = {
  id: string;
  organizacao_id: string;
  numero: string;
  identificador: string | null;

  empresa_id: string;
  equipamento_id: string | null;
  ordem_servico_id: string | null;

  data_orcamento: string;
  data_validade: string | null;

  status: OrcamentoStatus;
  tipo_orcamento: OrcamentoTipo;
  origem: OrcamentoOrigem;

  observacoes: string | null;
  condicoes_pagamento: string | null;
  prazo_execucao: string | null;
  garantia: string | null;

  forma_pagamento: FormaPagamento | null;
  modo_pagamento: ModoPagamento | null;
  numero_parcelas: number | null;
  dias_entre_parcelas: number | null;
  valor_entrada: number | null;
  valor_parcela: number | null;
  valor_pecas: number;
  valor_servicos: number;
  valor_total: number;
  prazo_entrega: string | null;
  frete: FreteTipo | null;
  detalhes_orcamento: string | null;
  responsavel_orcamentista: string | null;

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
  garantia?: string;
  tipoServicoId?: string;
  tipoEquipamentoId?: string;
  pecaId?: string;
  pecaNome?: string;
};

export type OrcamentoFormInput = {
  empresaId: string;
  equipamentoId?: string;
  ordemServicoId?: string;

  identificador?: string;
  dataOrcamento?: string;
  dataValidade?: string;

  status?: OrcamentoStatus;
  tipoOrcamento?: OrcamentoTipo;
  origem?: OrcamentoOrigem;

  observacoes?: string;
  condicoesPagamento?: string;
  prazoExecucao?: string;
  garantia?: string;

  formaPagamento?: FormaPagamento;
  modoPagamento?: ModoPagamento;
  numeroParcelas?: number;
  diasEntreParcelas?: number;
  valorEntrada?: number;
  valorParcela?: number;
  prazoEntrega?: string;
  frete?: FreteTipo;
  detalhesOrcamento?: string;
  responsavelOrcamentista?: string;

  aprovadoPor?: string;
  dataAprovacao?: string;
  motivoReprovacao?: string;

  itens?: OrcamentoItemInput[];
};

const selectOrcamentos = `
  id,
  organizacao_id,
  numero,
  identificador,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  data_orcamento,
  data_validade,
  status,
  tipo_orcamento,
  origem,
  observacoes,
  condicoes_pagamento,
  prazo_execucao,
  garantia,
  forma_pagamento,
  modo_pagamento,
  numero_parcelas,
  dias_entre_parcelas,
  valor_entrada,
  valor_parcela,
  valor_pecas,
  valor_servicos,
  valor_total,
  prazo_entrega,
  frete,
  detalhes_orcamento,
  responsavel_orcamentista,
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
    garantia,
    tipo_servico_id,
    tipo_equipamento_id,
    peca_id,
    peca_nome,
    ordem,
    created_at,
    tipo_servico:tipos_os (
      id,
      nome
    ),
    tipo_equipamento:tipos_equipamento (
      id,
      nome
    ),
    peca:pecas (
      id,
      nome
    )
  )
`;

const toDatabasePayload = (input: OrcamentoFormInput) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId || null,
  ordem_servico_id: input.ordemServicoId || null,
  identificador: input.identificador || null,
  data_orcamento: input.dataOrcamento || undefined,
  data_validade: input.dataValidade || null,
  status: input.status || "pendente",
  tipo_orcamento: input.tipoOrcamento || "servico",
  origem: input.origem || "avulso",
  observacoes: input.observacoes || null,
  condicoes_pagamento: input.condicoesPagamento || null,
  prazo_execucao: input.prazoExecucao || null,
  garantia: input.garantia || null,
  forma_pagamento: input.formaPagamento || null,
  modo_pagamento: input.modoPagamento || null,
  numero_parcelas: input.numeroParcelas || null,
  dias_entre_parcelas: input.diasEntreParcelas || null,
  valor_entrada: input.valorEntrada ?? null,
  valor_parcela: input.valorParcela ?? null,
  prazo_entrega: input.prazoEntrega || null,
  frete: input.frete || null,
  detalhes_orcamento: input.detalhesOrcamento || null,
  responsavel_orcamentista: input.responsavelOrcamentista || "Icaro Rezende",
  aprovado_por: input.aprovadoPor || null,
  data_aprovacao: input.dataAprovacao || null,
  motivo_reprovacao: input.motivoReprovacao || null,
});

const normalizarItens = (itens?: OrcamentoItemInput[]) => {
  return (itens || [])
    .map((item, index) => {
      const quantidade = Number(item.quantidade || 1);
      const valorUnitario = Number(item.valorUnitario || 0);
      const descricao =
        item.descricao?.trim() ||
        item.pecaNome?.trim() ||
        item.observacoes?.trim() ||
        "";

      return {
        tipo: item.tipo || "servico",
        descricao,
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: quantidade * valorUnitario,
        observacoes: item.observacoes?.trim() || null,
        garantia: item.garantia?.trim() || null,
        tipo_servico_id: item.tipoServicoId || null,
        tipo_equipamento_id: item.tipoEquipamentoId || null,
        peca_id: item.pecaId || null,
        peca_nome: item.pecaNome?.trim() || null,
        ordem: index + 1,
      };
    })
    .filter((item) => item.descricao);
};

const registrarHistoricoOS = async ({
  ordemServicoId,
  acao,
  observacao,
  estadoAnteriorId = null,
  estadoNovoId = null,
}: {
  ordemServicoId: string;
  acao: string;
  observacao?: string;
  estadoAnteriorId?: string | null;
  estadoNovoId?: string | null;
}) => {
  const { error } = await supabase.from("ordem_servico_historico").insert({
    ordem_servico_id: ordemServicoId,
    usuario_id: null,
    estado_anterior_id: estadoAnteriorId,
    estado_novo_id: estadoNovoId,
    acao,
    observacao: observacao || null,
  });

  if (error) {
    console.warn("Erro ao registrar historico da OS:", error.message);
  }
};

const buscarEstadoOSPorNomes = async (nomes: string[]) => {
  for (const nome of nomes) {
    const { data, error } = await supabase
      .from("estados_os")
      .select("id, nome")
      .ilike("nome", nome)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data as { id: string; nome: string };
  }

  return null;
};

const aplicarReflexoNaOS = async ({
  orcamentoNumero,
  ordemServicoId,
  estadoAnteriorId,
  status,
  aprovadoPor,
  motivoReprovacao,
}: {
  orcamentoNumero: string;
  ordemServicoId: string;
  estadoAnteriorId: string | null;
  status: OrcamentoStatus;
  aprovadoPor?: string;
  motivoReprovacao?: string;
}) => {
  let estadoNovoId: string | null = estadoAnteriorId;
  let acao = "";
  let observacao = "";

  if (status === "aprovado") {
    const estado = await buscarEstadoOSPorNomes([
      "Orçamento aprovado",
      "Orcamento aprovado",
      "Aprovado",
      "Orçamento Aprovado",
    ]);

    estadoNovoId = estado?.id || estadoAnteriorId;
    acao = "orcamento_aprovado";
    observacao = aprovadoPor
      ? `Orçamento nº ${orcamentoNumero} aprovado por ${aprovadoPor}.`
      : `Orçamento nº ${orcamentoNumero} aprovado.`;

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoNovoId,
        status_sistema: "aberta",
        data_fechamento: null,
      })
      .eq("id", ordemServicoId);

    if (error) throw new Error(error.message);
  }

  if (status === "reprovado") {
    const estado = await buscarEstadoOSPorNomes([
      "Orçamento não aprovado",
      "Orcamento nao aprovado",
      "Orçamento reprovado",
      "Reprovado",
    ]);

    estadoNovoId = estado?.id || estadoAnteriorId;
    acao = "orcamento_reprovado";
    observacao = motivoReprovacao
      ? `Orçamento nº ${orcamentoNumero} reprovado. Motivo: ${motivoReprovacao}.`
      : `Orçamento nº ${orcamentoNumero} reprovado.`;

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoNovoId,
        status_sistema: "aberta",
        data_fechamento: null,
      })
      .eq("id", ordemServicoId);

    if (error) throw new Error(error.message);
  }

  if (status === "faturado") {
    acao = "orcamento_faturado";
    observacao = `Orçamento nº ${orcamentoNumero} marcado como faturado.`;
  }

  if (status === "cancelado") {
    acao = "orcamento_cancelado";
    observacao = `Orçamento nº ${orcamentoNumero} cancelado.`;
  }

  if (status === "pendente") {
    acao = "orcamento_pendente";
    observacao = `Orçamento nº ${orcamentoNumero} marcado como pendente.`;
  }

  if (acao) {
    await registrarHistoricoOS({
      ordemServicoId,
      acao,
      observacao,
      estadoAnteriorId,
      estadoNovoId,
    });
  }
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
    const { data: orcamentoAtual, error: orcamentoError } = await supabase
      .from("orcamentos")
      .select(
        `
          id,
          numero,
          status,
          ordem_servico_id,
          valor_total,
          aprovado_por,
          motivo_reprovacao
        `
      )
      .eq("id", id)
      .single();

    if (orcamentoError) {
      throw new Error(orcamentoError.message);
    }

    let osAtual: { id: string; estado_os_id: string | null } | null = null;

    if (orcamentoAtual.ordem_servico_id) {
      const { data: osData, error: osError } = await supabase
        .from("ordens_servico")
        .select("id, estado_os_id")
        .eq("id", orcamentoAtual.ordem_servico_id)
        .single();

      if (osError) {
        throw new Error(osError.message);
      }

      osAtual = osData;
    }

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

    if (status === "pendente") {
      payload.aprovado_por = null;
      payload.data_aprovacao = null;
      payload.motivo_reprovacao = null;
    }

    const { error } = await supabase
      .from("orcamentos")
      .update(payload)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (orcamentoAtual.ordem_servico_id && osAtual) {
      await aplicarReflexoNaOS({
        orcamentoNumero: orcamentoAtual.numero,
        ordemServicoId: orcamentoAtual.ordem_servico_id,
        estadoAnteriorId: osAtual.estado_os_id,
        status,
        aprovadoPor: extra?.aprovadoPor,
        motivoReprovacao: extra?.motivoReprovacao,
      });
    }

    return orcamentosService.buscarPorId(id);
  },

  async cancelar(id: string) {
    return orcamentosService.alterarStatus(id, "cancelado");
  },
};

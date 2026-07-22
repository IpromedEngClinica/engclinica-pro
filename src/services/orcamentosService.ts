import { supabase } from "@/lib/supabaseClient";

export type OrcamentoStatus =
  | "pendente"
  | "aprovado"
  | "reprovado"
  | "faturado"
  | "cancelado";

export type OrcamentosContagemPorStatus = Record<OrcamentoStatus, number>;

export type OrcamentosSortField =
  | "numero"
  | "data"
  | "cliente"
  | "equipamento"
  | "status"
  | "tipo"
  | "origem"
  | "os"
  | "valor_pecas"
  | "valor_servicos"
  | "valor_total"
  | "forma_pagamento"
  | "orcamentista"
  | "validade";

export type ListarOrcamentosPaginadoFiltros = {
  termo?: string;
  status?: OrcamentoStatus;
  tipo?: string;
  clienteNome?: string;
  formaPagamento?: string;
  modoPagamento?: string;
  frete?: string;
  orcamentista?: string;
  dataInicio?: string;
  dataFim?: string;
  valorMinimo?: number;
  valorMaximo?: number;
  origem?: "com_os" | "avulso";
  page: number;
  limit: number;
  sortBy: OrcamentosSortField;
  ascending: boolean;
};

export type OrcamentosFilterOptions = {
  clientes: string[];
  formasPagamento: string[];
  modosPagamento: string[];
  fretes: string[];
  orcamentistas: string[];
};

export type OrcamentosPaginadoResult = {
  items: OrcamentoSupabase[];
  total: number;
  statusCounts: OrcamentosContagemPorStatus;
  filterOptions: OrcamentosFilterOptions;
};

export type OrcamentoItemTipo = "servico" | "peca" | "deslocamento" | "outro";
export type OrcamentoTipo = "servico" | "pecas" | "pecas_servicos";
export type OrcamentoOrigem = "os" | "avulso";
export type FormaPagamento = "dinheiro" | "cartao" | "boleto" | "pix";
export type ModoPagamento = "avista" | "parcelado" | "entrada_parcela";
export type FreteTipo = "cif" | "fob";
export type DescontoTipo = "valor" | "percentual";

export type AplicarDescontoOrcamentoInput = {
  descontoTipo: DescontoTipo;
  descontoValor: number;
  situacao: "pendente" | "aprovado";
};

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
  peca_variacao_id: string | null;
  peca_fabricante_id: string | null;
  peca_modelo_id: string | null;
  fabricante_texto: string | null;
  modelo_texto: string | null;
  mostrar_fabricante: boolean;
  mostrar_modelo: boolean;
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
  peca_variacao?: {
    id: string;
    peca_fabricante_id: string | null;
    peca_modelo_id: string | null;
    fabricante_texto: string | null;
    modelo_texto: string | null;
    preco_padrao: number | null;
  } | null;
  peca_fabricante?: {
    id: string;
    nome: string;
  } | null;
  peca_modelo?: {
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
  desconto_tipo: DescontoTipo;
  desconto_valor: number;
  desconto_aplicado: number;
  valor_total: number;
  prazo_entrega: string | null;
  frete: FreteTipo | null;
  detalhes_orcamento: string | null;
  responsavel_orcamentista: string | null;
  origem_migracao: string | null;
  arkmeds_orcamento_id: number | null;
  arkmeds_ordem_servico_numero: string | null;
  classificacao_vinculo_os: string | null;

  aprovado_por: string | null;
  data_aprovacao: string | null;
  data_reprovacao: string | null;
  data_faturamento: string | null;
  data_cancelamento: string | null;
  motivo_reprovacao: string | null;

  ativo: boolean;

  created_at: string;
  updated_at: string;

  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    cpf_cnpj: string | null;
    cep: string | null;
    rua: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    contato: string | null;
    email: string | null;
    celular: string | null;
    telefone: string | null;
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
    tipo_os?: {
      id: string;
      nome: string;
    } | null;
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
  pecaVariacaoId?: string;
  pecaFabricanteId?: string;
  pecaModeloId?: string;
  fabricanteTexto?: string;
  modeloTexto?: string;
  mostrarFabricante?: boolean;
  mostrarModelo?: boolean;
};

export type OrcamentoFormInput = {
  numero?: string;
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
  descontoTipo?: DescontoTipo;
  descontoValor?: number;
  prazoEntrega?: string;
  frete?: FreteTipo;
  detalhesOrcamento?: string;
  responsavelOrcamentista?: string;

  aprovadoPor?: string;
  dataAprovacao?: string;
  dataReprovacao?: string;
  dataFaturamento?: string;
  dataCancelamento?: string;
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
  desconto_tipo,
  desconto_valor,
  desconto_aplicado,
  valor_total,
  prazo_entrega,
  frete,
  detalhes_orcamento,
  responsavel_orcamentista,
  origem_migracao,
  arkmeds_orcamento_id,
  arkmeds_ordem_servico_numero,
  classificacao_vinculo_os,
  aprovado_por,
  data_aprovacao,
  data_reprovacao,
  data_faturamento,
  data_cancelamento,
  motivo_reprovacao,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
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
    ativo,
    tipo_os:tipos_os (
      id,
      nome
    )
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
    peca_variacao_id,
    peca_fabricante_id,
    peca_modelo_id,
    fabricante_texto,
    modelo_texto,
    mostrar_fabricante,
    mostrar_modelo,
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
    ),
    peca_variacao:peca_variacoes (
      id,
      peca_fabricante_id,
      peca_modelo_id,
      fabricante_texto,
      modelo_texto,
      preco_padrao
    ),
    peca_fabricante:peca_fabricantes (
      id,
      nome
    ),
    peca_modelo:peca_modelos (
      id,
      nome
    )
  )
`;

const ORCAMENTOS_RESUMO_PAGE_SIZE = 1000;
const ITENS_SELECT_MARKER = ",\n  itens:orcamento_itens";
const selectOrcamentosResumo = selectOrcamentos.slice(
  0,
  selectOrcamentos.indexOf(ITENS_SELECT_MARKER)
);

const toDatabasePayload = (input: OrcamentoFormInput) => ({
  ...(input.numero ? { numero: input.numero } : {}),
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
  desconto_tipo: input.descontoTipo || "valor",
  desconto_valor: input.descontoValor ?? 0,
  prazo_entrega: input.prazoEntrega || null,
  frete: input.frete || null,
  detalhes_orcamento: input.detalhesOrcamento || null,
  responsavel_orcamentista: input.responsavelOrcamentista || "Icaro Rezende",
  aprovado_por: input.aprovadoPor || null,
  data_aprovacao: input.dataAprovacao || null,
  data_reprovacao: input.dataReprovacao || null,
  data_faturamento: input.dataFaturamento || null,
  data_cancelamento: input.dataCancelamento || null,
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
        peca_variacao_id: item.pecaVariacaoId || null,
        peca_fabricante_id: item.pecaFabricanteId || null,
        peca_modelo_id: item.pecaModeloId || null,
        fabricante_texto: item.fabricanteTexto?.trim() || null,
        modelo_texto: item.modeloTexto?.trim() || null,
        mostrar_fabricante: Boolean(item.mostrarFabricante),
        mostrar_modelo: Boolean(item.mostrarModelo),
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
  async listarPaginado(
    filtros: ListarOrcamentosPaginadoFiltros
  ): Promise<OrcamentosPaginadoResult> {
    const { data, error } = await supabase.rpc("listar_orcamentos_resumo", {
      p_termo: filtros.termo || null,
      p_status: filtros.status || null,
      p_tipo: filtros.tipo || null,
      p_cliente_nome: filtros.clienteNome || null,
      p_forma_pagamento: filtros.formaPagamento || null,
      p_modo_pagamento: filtros.modoPagamento || null,
      p_frete: filtros.frete || null,
      p_orcamentista: filtros.orcamentista || null,
      p_data_inicio: filtros.dataInicio || null,
      p_data_fim: filtros.dataFim || null,
      p_valor_minimo: filtros.valorMinimo ?? null,
      p_valor_maximo: filtros.valorMaximo ?? null,
      p_origem: filtros.origem || null,
      p_offset: Math.max(0, (filtros.page - 1) * filtros.limit),
      p_limit: filtros.limit,
      p_sort_by: filtros.sortBy,
      p_ascending: filtros.ascending,
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = (data || {}) as unknown as {
      items?: OrcamentoSupabase[];
      total?: number;
      status_counts?: Partial<OrcamentosContagemPorStatus>;
      filter_options?: {
        clientes?: string[];
        formas_pagamento?: string[];
        modos_pagamento?: string[];
        fretes?: string[];
        orcamentistas?: string[];
      };
    };

    return {
      items: result.items || [],
      total: Number(result.total || 0),
      statusCounts: {
        pendente: Number(result.status_counts?.pendente || 0),
        aprovado: Number(result.status_counts?.aprovado || 0),
        reprovado: Number(result.status_counts?.reprovado || 0),
        faturado: Number(result.status_counts?.faturado || 0),
        cancelado: Number(result.status_counts?.cancelado || 0),
      },
      filterOptions: {
        clientes: result.filter_options?.clientes || [],
        formasPagamento: result.filter_options?.formas_pagamento || [],
        modosPagamento: result.filter_options?.modos_pagamento || [],
        fretes: result.filter_options?.fretes || [],
        orcamentistas: result.filter_options?.orcamentistas || [],
      },
    };
  },

  async listarResumo() {
    const primeiraPagina = await supabase
      .from("orcamentos")
      .select(selectOrcamentosResumo, { count: "exact" })
      .eq("ativo", true)
      .order("numero", { ascending: false })
      .order("created_at", { ascending: false })
      .range(0, ORCAMENTOS_RESUMO_PAGE_SIZE - 1);

    if (primeiraPagina.error) {
      throw new Error(primeiraPagina.error.message);
    }

    const total = primeiraPagina.count || primeiraPagina.data?.length || 0;
    const paginasRestantes = Math.max(
      0,
      Math.ceil(total / ORCAMENTOS_RESUMO_PAGE_SIZE) - 1
    );
    const resultadosRestantes = await Promise.all(
      Array.from({ length: paginasRestantes }, (_, index) => {
        const from = (index + 1) * ORCAMENTOS_RESUMO_PAGE_SIZE;
        return supabase
          .from("orcamentos")
          .select(selectOrcamentosResumo)
          .eq("ativo", true)
          .order("numero", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, from + ORCAMENTOS_RESUMO_PAGE_SIZE - 1);
      })
    );

    const orcamentos = [...(primeiraPagina.data || [])];
    for (const resultado of resultadosRestantes) {
      if (resultado.error) {
        throw new Error(resultado.error.message);
      }
      orcamentos.push(...(resultado.data || []));
    }

    return orcamentos as unknown as OrcamentoSupabase[];
  },

  async contarPorStatus(): Promise<OrcamentosContagemPorStatus> {
    const statuses: OrcamentoStatus[] = [
      "pendente",
      "aprovado",
      "reprovado",
      "faturado",
      "cancelado",
    ];
    const resultados = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true)
          .eq("status", status);

        if (error) {
          throw new Error(error.message);
        }

        return [status, count || 0] as const;
      })
    );

    return Object.fromEntries(resultados) as OrcamentosContagemPorStatus;
  },

  async listar() {
    const { data, error } = await supabase
      .from("orcamentos")
      .select(selectOrcamentos)
      .eq("ativo", true)
      .order("numero", { ascending: false })
      .order("created_at", { ascending: false });

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

  async preverProximoNumero() {
    const { data, error } = await supabase.rpc(
      "prever_proximo_numero_orcamento"
    );

    if (error) {
      throw new Error(error.message);
    }

    return String(data || "");
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
          data_aprovacao,
          data_reprovacao,
          data_faturamento,
          data_cancelamento,
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
      payload.data_reprovacao = new Date().toISOString();
    }

    if (status === "faturado") {
      payload.data_faturamento = new Date().toISOString();
    }

    if (status === "cancelado") {
      payload.data_cancelamento = new Date().toISOString();
    }

    if (status === "pendente") {
      payload.aprovado_por = null;
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

  async aplicarDesconto(
    id: string,
    input: AplicarDescontoOrcamentoInput
  ) {
    const descontoValor = Number(input.descontoValor || 0);

    if (descontoValor < 0) {
      throw new Error("Desconto nao pode ser negativo.");
    }

    if (input.descontoTipo === "percentual" && descontoValor > 100) {
      throw new Error("Desconto percentual nao pode ser maior que 100%.");
    }

    const { error } = await supabase
      .from("orcamentos")
      .update({
        desconto_tipo: input.descontoTipo,
        desconto_valor: descontoValor,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (input.situacao === "aprovado") {
      return orcamentosService.alterarStatus(id, "aprovado");
    }

    const { data: atual, error: atualError } = await supabase
      .from("orcamentos")
      .select("status")
      .eq("id", id)
      .single();

    if (atualError) {
      throw new Error(atualError.message);
    }

    if (atual.status !== "pendente") {
      return orcamentosService.alterarStatus(id, "pendente");
    }

    return orcamentosService.buscarPorId(id);
  },

  async cancelar(id: string) {
    return orcamentosService.alterarStatus(id, "cancelado");
  },
};

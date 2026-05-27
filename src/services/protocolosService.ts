import { supabase } from "@/lib/supabaseClient";

export type TipoProtocoloOS = "recolhimento" | "entrega";

export type ProtocoloOSAcessorioSupabase = {
  id: string;
  protocolo_id: string;
  descricao: string;
  quantidade: number;
  conferido: boolean;
  observacoes: string | null;
  created_at: string;
};

export type ProtocoloOSSupabase = {
  id: string;
  organizacao_id: string;
  numero: string;
  tipo: TipoProtocoloOS;
  empresa_id: string;
  equipamento_id: string;
  ordem_servico_id: string | null;
  data_protocolo: string;
  data_recolhimento: string | null;
  data_entrega: string | null;
  responsavel_nome: string | null;
  responsavel_documento: string | null;
  responsavel_contato: string | null;
  problema_relatado: string | null;
  observacoes: string | null;
  status: string;
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
  acessorios?: ProtocoloOSAcessorioSupabase[];
};

export type ProtocoloOSFormInput = {
  tipo: TipoProtocoloOS;
  empresaId: string;
  equipamentoId: string;
  ordemServicoId?: string;
  dataRecolhimento?: string;
  dataEntrega?: string;
  responsavelNome?: string;
  responsavelDocumento?: string;
  responsavelContato?: string;
  problemaRelatado?: string;
  observacoes?: string;
  status?: string;
  acessorios?: Array<{
    descricao: string;
    quantidade?: number;
    conferido?: boolean;
    observacoes?: string;
  }>;
};

export type ProtocoloRecolhimentoInput = {
  equipamentoId: string;
  empresaId: string;
  dataRecolhimento?: string;
  responsavelNome?: string;
  responsavelDocumento?: string;
  responsavelContato?: string;
  problemaRelatado?: string;
  observacoes?: string;
  acessorios?: Array<{
    descricao: string;
    quantidade?: number;
    conferido?: boolean;
    observacoes?: string;
  }>;
};

export type ProtocoloEntregaInput = {
  ordemServicoId: string;
  empresaId: string;
  equipamentoId: string;
  dataEntrega?: string;
  responsavelNome?: string;
  responsavelDocumento?: string;
  responsavelContato?: string;
  observacoes?: string;
  acessorios?: Array<{
    descricao: string;
    quantidade?: number;
    conferido?: boolean;
    observacoes?: string;
  }>;
};

const selectProtocolos = `
  id,
  organizacao_id,
  numero,
  tipo,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  data_protocolo,
  data_recolhimento,
  data_entrega,
  responsavel_nome,
  responsavel_documento,
  responsavel_contato,
  problema_relatado,
  observacoes,
  status,
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
  acessorios:protocolo_os_acessorios (
    id,
    protocolo_id,
    descricao,
    quantidade,
    conferido,
    observacoes,
    created_at
  )
`;

const toDatabasePayload = (input: ProtocoloOSFormInput) => ({
  tipo: input.tipo,
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId,
  ordem_servico_id: input.ordemServicoId || null,
  data_recolhimento: input.dataRecolhimento || null,
  data_entrega: input.dataEntrega || null,
  responsavel_nome: input.responsavelNome || null,
  responsavel_documento: input.responsavelDocumento || null,
  responsavel_contato: input.responsavelContato || null,
  problema_relatado: input.problemaRelatado || null,
  observacoes: input.observacoes || null,
  status: input.status || "emitido",
});

const normalizarAcessorios = (
  acessorios?: ProtocoloOSFormInput["acessorios"]
) => {
  const map = new Map<
    string,
    {
      descricao: string;
      quantidade: number;
      conferido: boolean;
      observacoes: string | null;
    }
  >();

  (acessorios || []).forEach((item) => {
    const descricao = item.descricao.trim();
    if (!descricao) return;

    const chave = descricao.toLowerCase().replace(/\s+/g, " ");

    if (!map.has(chave)) {
      map.set(chave, {
        descricao,
        quantidade: item.quantidade || 1,
        conferido: item.conferido ?? true,
        observacoes: item.observacoes?.trim() || null,
      });
    }
  });

  return Array.from(map.values());
};

const normalizarNome = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const buscarEstadoEntradaOrcamento = async () => {
  const nomesPreferidos = [
    "Entrada de Equipamento para Orçamento",
    "Entrada de equipamentos para orçamento",
    "Entrada de equipamento para orçamento",
    "Entrada de equipamentos",
    "Entrada para orçamento",
    "Orçamentar",
  ];

  for (const nome of nomesPreferidos) {
    const { data, error } = await supabase
      .from("estados_os")
      .select("id, nome, finaliza_os, cancela_os")
      .ilike("nome", nome)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) return data;
  }

  const { data, error } = await supabase
    .from("estados_os")
    .select("id, nome, finaliza_os, cancela_os")
    .eq("finaliza_os", false)
    .eq("cancela_os", false)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    console.warn(
      'Estado de entrada para orçamento não encontrado. Usando primeiro estado não finalizador e não cancelador.'
    );
    return data;
  }

  console.warn(
    "Nenhum estado compatível encontrado para OS criada por protocolo de recolhimento."
  );
  return null;
};

const buscarTipoEntradaEquipamento = async () => {
  const { data, error } = await supabase
    .from("tipos_os")
    .select("id, nome, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const nomesPreferidos = [
    "Entrada de equipamentos",
    "Orçamentar",
    "Manutenção corretiva",
  ].map(normalizarNome);

  const tipo = (data || []).find((item) =>
    nomesPreferidos.includes(normalizarNome(item.nome))
  );

  return (tipo?.id as string | undefined) || null;
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
    console.warn("Erro ao registrar histórico da OS:", error.message);
  }
};

const buscarEstadoFechamentoOS = async () => {
  const nomes = [
    "Fechada",
    "Equipamento Entregue",
    "Entregue",
    "Serviço finalizado",
    "Servico finalizado",
  ];

  for (const nome of nomes) {
    const { data, error } = await supabase
      .from("estados_os")
      .select("id, nome, finaliza_os")
      .ilike("nome", nome)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) return data;
  }

  const { data, error } = await supabase
    .from("estados_os")
    .select("id, nome, finaliza_os")
    .eq("finaliza_os", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
};

export const protocolosService = {
  async listar(tipo?: TipoProtocoloOS) {
    let query = supabase
      .from("protocolos_os")
      .select(selectProtocolos)
      .eq("ativo", true)
      .order("data_protocolo", { ascending: false });

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ProtocoloOSSupabase[];
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("protocolos_os")
      .select(selectProtocolos)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ProtocoloOSSupabase;
  },

  async criar(input: ProtocoloOSFormInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const { data: protocoloCriado, error } = await supabase
      .from("protocolos_os")
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

    const acessorios = normalizarAcessorios(input.acessorios);

    if (acessorios.length > 0) {
      const { error: acessoriosError } = await supabase
        .from("protocolo_os_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            protocolo_id: protocoloCriado.id,
            ...acessorio,
          }))
        );

      if (acessoriosError) {
        throw new Error(acessoriosError.message);
      }
    }

    return protocolosService.buscarPorId(protocoloCriado.id);
  },

  async atualizar(id: string, input: ProtocoloOSFormInput) {
    const { error } = await supabase
      .from("protocolos_os")
      .update(toDatabasePayload(input))
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("protocolo_os_acessorios")
      .delete()
      .eq("protocolo_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const acessorios = normalizarAcessorios(input.acessorios);

    if (acessorios.length > 0) {
      const { error: insertError } = await supabase
        .from("protocolo_os_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            protocolo_id: id,
            ...acessorio,
          }))
        );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return protocolosService.buscarPorId(id);
  },

  async cancelar(id: string) {
    const { error } = await supabase
      .from("protocolos_os")
      .update({
        status: "cancelado",
        ativo: false,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return protocolosService.buscarPorId(id);
  },

  async criarRecolhimentoComOS(input: ProtocoloRecolhimentoInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const estadoEntrada = await buscarEstadoEntradaOrcamento();
    const tipoOsId = await buscarTipoEntradaEquipamento();
    const acessorios = normalizarAcessorios(input.acessorios);

    const { data: osCriada, error: osError } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: input.empresaId,
        equipamento_id: input.equipamentoId,
        tipo_os_id: tipoOsId,
        estado_os_id: estadoEntrada?.id || null,
        solicitante_texto: null,
        responsavel_texto: input.responsavelNome || null,
        problema_relatado: input.problemaRelatado || null,
        origem_problema: "Protocolo de recolhimento",
        descricao_servico: "Entrada de equipamento para orçamento.",
        observacoes: input.observacoes || null,
        prioridade: "normal",
        status_sistema: "aberta",
        data_fechamento: null,
        ativo: true,
      })
      .select("id")
      .single();

    if (osError) {
      throw new Error(`Erro ao criar OS do protocolo: ${osError.message}`);
    }

    const { data: protocoloCriado, error: protocoloError } = await supabase
      .from("protocolos_os")
      .insert({
        organizacao_id: organizacaoId,
        tipo: "recolhimento",
        empresa_id: input.empresaId,
        equipamento_id: input.equipamentoId,
        ordem_servico_id: osCriada.id,
        data_recolhimento: input.dataRecolhimento || new Date().toISOString(),
        responsavel_nome: input.responsavelNome || null,
        responsavel_documento: input.responsavelDocumento || null,
        responsavel_contato: input.responsavelContato || null,
        problema_relatado: input.problemaRelatado || null,
        observacoes: input.observacoes || null,
        status: "emitido",
        ativo: true,
      })
      .select("id, numero")
      .single();

    if (protocoloError) {
      throw new Error(
        `OS criada, mas houve erro ao criar o protocolo: ${protocoloError.message}`
      );
    }

    if (acessorios.length > 0) {
      const { error: protocoloAcessoriosError } = await supabase
        .from("protocolo_os_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            protocolo_id: protocoloCriado.id,
            ...acessorio,
          }))
        );

      if (protocoloAcessoriosError) {
        throw new Error(
          `Protocolo criado, mas houve erro ao salvar acessórios do protocolo: ${protocoloAcessoriosError.message}`
        );
      }

      const { error: osAcessoriosError } = await supabase
        .from("ordem_servico_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            ordem_servico_id: osCriada.id,
            descricao: acessorio.descricao,
            quantidade: acessorio.quantidade,
            observacoes: acessorio.observacoes,
          }))
        );

      if (osAcessoriosError) {
        throw new Error(
          `Protocolo criado, mas houve erro ao salvar acessórios da OS: ${osAcessoriosError.message}`
        );
      }
    }

    await registrarHistoricoOS({
      ordemServicoId: osCriada.id,
      acao: "protocolo_recolhimento",
      observacao: `Ordem de Serviço criada automaticamente a partir do Protocolo de Recolhimento nº ${protocoloCriado.numero}.`,
      estadoNovoId: estadoEntrada?.id || null,
    });

    return protocolosService.buscarPorId(protocoloCriado.id);
  },

  async criarEntregaComFechamentoOS(input: ProtocoloEntregaInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const dataEntrega = input.dataEntrega || new Date().toISOString();

    const { data: osAtual, error: osAtualError } = await supabase
      .from("ordens_servico")
      .select("id, estado_os_id, status_sistema")
      .eq("id", input.ordemServicoId)
      .single();

    if (osAtualError) {
      throw new Error(osAtualError.message);
    }

    const { data: protocoloCriado, error: protocoloError } = await supabase
      .from("protocolos_os")
      .insert({
        organizacao_id: organizacaoId,
        tipo: "entrega",
        empresa_id: input.empresaId,
        equipamento_id: input.equipamentoId,
        ordem_servico_id: input.ordemServicoId,
        data_entrega: dataEntrega,
        responsavel_nome: input.responsavelNome || null,
        responsavel_documento: input.responsavelDocumento || null,
        responsavel_contato: input.responsavelContato || null,
        observacoes: input.observacoes || null,
        status: "emitido",
        ativo: true,
      })
      .select("id, numero")
      .single();

    if (protocoloError) {
      throw new Error(protocoloError.message);
    }

    const acessorios = normalizarAcessorios(input.acessorios);

    if (acessorios.length > 0) {
      const { error: acessoriosError } = await supabase
        .from("protocolo_os_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            protocolo_id: protocoloCriado.id,
            ...acessorio,
          }))
        );

      if (acessoriosError) {
        throw new Error(acessoriosError.message);
      }
    }

    const estadoFechamento = await buscarEstadoFechamentoOS();

    const { error: osUpdateError } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoFechamento?.id || osAtual.estado_os_id,
        status_sistema: "fechada",
        data_fechamento: dataEntrega,
      })
      .eq("id", input.ordemServicoId);

    if (osUpdateError) {
      throw new Error(osUpdateError.message);
    }

    const dataEntregaFormatada = new Date(dataEntrega).toLocaleDateString(
      "pt-BR"
    );

    await registrarHistoricoOS({
      ordemServicoId: input.ordemServicoId,
      acao: "protocolo_entrega",
      observacao: `Protocolo de entrega nº ${protocoloCriado.numero} criado. Entrega realizada em ${dataEntregaFormatada}. Ordem de Serviço fechada automaticamente.`,
      estadoAnteriorId: osAtual.estado_os_id,
      estadoNovoId: estadoFechamento?.id || osAtual.estado_os_id,
    });

    return protocolosService.buscarPorId(protocoloCriado.id);
  },
};

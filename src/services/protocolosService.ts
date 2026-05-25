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
};

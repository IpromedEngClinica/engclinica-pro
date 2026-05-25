import { supabase } from "@/lib/supabaseClient";

export type OrdemServicoAcessorioSupabase = {
  id: string;
  ordem_servico_id: string;
  descricao: string;
  quantidade: number;
  observacoes: string | null;
  created_at: string;
};

export type OrdemServicoSupabase = {
  id: string;
  organizacao_id: string;
  numero: string;
  empresa_id: string;
  equipamento_id: string | null;
  tipo_os_id: string | null;
  estado_os_id: string | null;
  tecnico_responsavel_id: string | null;
  solicitante_texto: string | null;
  responsavel_texto: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  origem_problema: string | null;
  descricao_servico: string | null;
  observacoes: string | null;
  prioridade: string;
  status_sistema: string;
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
  tipo_os?: {
    id: string;
    nome: string;
  } | null;
  estado_os?: {
    id: string;
    nome: string;
    finaliza_os: boolean;
    cancela_os: boolean;
  } | null;
  acessorios?: OrdemServicoAcessorioSupabase[];
};

export type OrdemServicoFormInput = {
  empresaId: string;
  equipamentoId?: string;
  tipoOsId?: string;
  estadoOsId?: string;
  tecnicoResponsavelId?: string;
  solicitanteTexto?: string;
  responsavelTexto?: string;
  origemProblema?: string;
  descricaoServico?: string;
  observacoes?: string;
  statusSistema?: string;
  acessorios?: string[];
};

const selectOrdensServico = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  tipo_os_id,
  estado_os_id,
  tecnico_responsavel_id,
  solicitante_texto,
  responsavel_texto,
  data_abertura,
  data_fechamento,
  origem_problema,
  descricao_servico,
  observacoes,
  prioridade,
  status_sistema,
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
  tipo_os:tipos_os (
    id,
    nome
  ),
  estado_os:estados_os (
    id,
    nome,
    finaliza_os,
    cancela_os
  ),
  acessorios:ordem_servico_acessorios (
    id,
    ordem_servico_id,
    descricao,
    quantidade,
    observacoes,
    created_at
  )
`;

const toDatabasePayload = (input: OrdemServicoFormInput) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId || null,
  tipo_os_id: input.tipoOsId || null,
  estado_os_id: input.estadoOsId || null,
  tecnico_responsavel_id: input.tecnicoResponsavelId || null,
  solicitante_texto: input.solicitanteTexto || null,
  responsavel_texto: input.responsavelTexto || null,
  origem_problema: input.origemProblema || null,
  descricao_servico: input.descricaoServico || null,
  observacoes: input.observacoes || null,
  status_sistema: input.statusSistema || "aberta",
});

const normalizarAcessorios = (acessorios?: string[]) => {
  return (acessorios || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .map((descricao) => ({
      descricao,
      quantidade: 1,
      observacoes: null,
    }));
};

export const ordensServicoService = {
  async listar() {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(selectOrdensServico)
      .eq("ativo", true)
      .order("data_abertura", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrdemServicoSupabase[];
  },

  async criar(input: OrdemServicoFormInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const { data: osCriada, error } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
        prioridade: "normal",
        ativo: true,
      })
      .select("id")
      .single();

    if (error) {
      if (
        error.message.toLowerCase().includes("numero") ||
        error.message.toLowerCase().includes("not-null")
      ) {
        throw new Error(
          "Erro ao gerar número da OS. Execute a migration 006_fix_numero_os_default.sql no Supabase e tente novamente."
        );
      }

      throw new Error(error.message);
    }

    const acessorios = normalizarAcessorios(input.acessorios);

    if (acessorios.length > 0) {
      const { error: acessoriosError } = await supabase
        .from("ordem_servico_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            ordem_servico_id: osCriada.id,
            ...acessorio,
          }))
        );

      if (acessoriosError) {
        throw new Error(acessoriosError.message);
      }
    }

    const { data, error: selectError } = await supabase
      .from("ordens_servico")
      .select(selectOrdensServico)
      .eq("id", osCriada.id)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },

  async atualizar(id: string, input: OrdemServicoFormInput) {
    const { error } = await supabase
      .from("ordens_servico")
      .update(toDatabasePayload(input))
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("ordem_servico_acessorios")
      .delete()
      .eq("ordem_servico_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const acessorios = normalizarAcessorios(input.acessorios);

    if (acessorios.length > 0) {
      const { error: insertError } = await supabase
        .from("ordem_servico_acessorios")
        .insert(
          acessorios.map((acessorio) => ({
            ordem_servico_id: id,
            ...acessorio,
          }))
        );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    const { data, error: selectError } = await supabase
      .from("ordens_servico")
      .select(selectOrdensServico)
      .eq("id", id)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },

  async alterarEstado(id: string, estadoOsId: string) {
    const { data: estado, error: estadoError } = await supabase
      .from("estados_os")
      .select("id, nome, finaliza_os, cancela_os")
      .eq("id", estadoOsId)
      .single();

    if (estadoError) {
      throw new Error(estadoError.message);
    }

    const statusSistema = estado.finaliza_os
      ? "fechada"
      : estado.cancela_os
        ? "cancelada"
        : "aberta";

    const dataFechamento =
      estado.finaliza_os || estado.cancela_os ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoOsId,
        status_sistema: statusSistema,
        data_fechamento: dataFechamento,
      })
      .eq("id", id)
      .select(selectOrdensServico)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },
};

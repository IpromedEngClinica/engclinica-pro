import { supabase } from "@/lib/supabaseClient";

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
  prioridade?: string;
  statusSistema?: string;
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
  prioridade: input.prioridade || "normal",
  status_sistema: input.statusSistema || "aberta",
});

const gerarNumeroTemporario = () => {
  const now = new Date();
  const ano = now.getFullYear();
  const timestamp = now.getTime();

  return `OS-${ano}-${timestamp}`;
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

    const { data, error } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        numero: gerarNumeroTemporario(),
        ...toDatabasePayload(input),
        ativo: true,
      })
      .select(selectOrdensServico)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },

  async atualizar(id: string, input: OrdemServicoFormInput) {
    const { data, error } = await supabase
      .from("ordens_servico")
      .update(toDatabasePayload(input))
      .eq("id", id)
      .select(selectOrdensServico)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },
};
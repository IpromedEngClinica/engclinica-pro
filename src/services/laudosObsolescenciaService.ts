import { supabase } from "@/lib/supabaseClient";

export type MotivoObsolescenciaSupabase = {
  id: string;
  organizacao_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type LaudoObsolescenciaSupabase = {
  id: string;
  organizacao_id: string;
  numero: number;
  empresa_id: string;
  equipamento_id: string;
  motivo_id: string | null;
  motivo_texto: string;
  data_criacao: string;
  observacoes: string | null;
  responsavel_nome: string | null;
  responsavel_registro: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    cpf_cnpj?: string | null;
    telefone?: string | null;
    celular?: string | null;
    contato?: string | null;
    email?: string | null;
    cep?: string | null;
    rua?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
  equipamento?: {
    id: string;
    tipo_equipamento_id?: string | null;
    tipo_texto?: string | null;
    modelo?: string | null;
    fabricante?: string | null;
    numero_serie?: string | null;
    patrimonio?: string | null;
    tag?: string | null;
    setor?: string | null;
    status?: string | null;
    ativo?: boolean | null;
    tipo_equipamento?: {
      id: string;
      nome: string;
    } | null;
  } | null;
  motivo?: MotivoObsolescenciaSupabase | null;
};

export type CriarLaudoObsolescenciaInput = {
  empresaId: string;
  equipamentoId: string;
  motivoId?: string | null;
  motivoTexto: string;
  observacoes?: string | null;
};

export type CriarMotivoObsolescenciaInput = {
  nome: string;
  descricao?: string | null;
};

const MOTIVOS_PADRAO = [
  "Custo de manutencao elevado, tornando o reparo inviavel economicamente.",
  "Equipamento fora de linha, sem disponibilidade de pecas para manutencao.",
  "Equipamento sem condicoes tecnicas seguras para uso.",
  "Equipamento com danos estruturais ou funcionais irreversiveis.",
  "Obsolescencia tecnologica, nao atendendo mais as necessidades operacionais.",
  "Ausencia de suporte tecnico ou pecas pelo fabricante.",
];

const selectLaudoObsolescencia = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  motivo_id,
  motivo_texto,
  data_criacao,
  observacoes,
  responsavel_nome,
  responsavel_registro,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    cpf_cnpj,
    telefone,
    celular,
    contato,
    email,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado
  ),
  equipamento:equipamentos (
    id,
    tipo_equipamento_id,
    tipo_texto,
    modelo,
    fabricante,
    numero_serie,
    patrimonio,
    tag,
    setor,
    status,
    ativo,
    tipo_equipamento:tipos_equipamento (
      id,
      nome
    )
  ),
  motivo:motivos_obsolescencia (
    id,
    organizacao_id,
    nome,
    descricao,
    ativo,
    created_at,
    updated_at
  )
`;

const selectMotivosObsolescencia = `
  id,
  organizacao_id,
  nome,
  descricao,
  ativo,
  created_at,
  updated_at
`;

const buscarOrganizacaoAtual = async () => {
  const { data: organizacaoId, error } = await supabase.rpc(
    "current_organizacao_id"
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!organizacaoId) {
    throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  }

  return organizacaoId as string;
};

export const laudosObsolescenciaService = {
  async listar() {
    const { data, error } = await supabase
      .from("laudos_obsolescencia")
      .select(selectLaudoObsolescencia)
      .eq("ativo", true)
      .order("data_criacao", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as LaudoObsolescenciaSupabase[];
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("laudos_obsolescencia")
      .select(selectLaudoObsolescencia)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as LaudoObsolescenciaSupabase;
  },

  async criar(input: CriarLaudoObsolescenciaInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const motivoTexto = input.motivoTexto.trim();

    if (!input.empresaId) {
      throw new Error("Selecione uma empresa.");
    }

    if (!input.equipamentoId) {
      throw new Error("Selecione um equipamento.");
    }

    if (!motivoTexto) {
      throw new Error("Informe o motivo da obsolescencia.");
    }

    const { data: laudoCriado, error: laudoError } = await supabase
      .from("laudos_obsolescencia")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: input.empresaId,
        equipamento_id: input.equipamentoId,
        motivo_id: input.motivoId || null,
        motivo_texto: motivoTexto,
        observacoes: input.observacoes || null,
        responsavel_nome: "Icaro Heitor Piris Rezende",
        responsavel_registro: "CREA - 142085302-3",
        ativo: true,
      })
      .select("id, numero")
      .single();

    if (laudoError) {
      throw new Error(laudoError.message);
    }

    const { error: equipamentoError } = await supabase
      .from("equipamentos")
      .update({
        ativo: false,
        status: "Desativado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.equipamentoId);

    if (equipamentoError) {
      throw new Error(equipamentoError.message);
    }

    return laudosObsolescenciaService.buscarPorId(
      (laudoCriado as { id: string }).id
    );
  },

  async cancelar(id: string) {
    const { data, error } = await supabase
      .from("laudos_obsolescencia")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(selectLaudoObsolescencia)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as LaudoObsolescenciaSupabase;
  },

  async listarMotivos() {
    const { data, error } = await supabase
      .from("motivos_obsolescencia")
      .select(selectMotivosObsolescencia)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as MotivoObsolescenciaSupabase[];
  },

  async criarMotivo(input: CriarMotivoObsolescenciaInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const nome = input.nome.trim();

    if (!nome) {
      throw new Error("Informe o motivo.");
    }

    const { data, error } = await supabase
      .from("motivos_obsolescencia")
      .insert({
        organizacao_id: organizacaoId,
        nome,
        descricao: input.descricao || null,
        ativo: true,
      })
      .select(selectMotivosObsolescencia)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as MotivoObsolescenciaSupabase;
  },

  async desativarMotivo(id: string) {
    const { data, error } = await supabase
      .from("motivos_obsolescencia")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(selectMotivosObsolescencia)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as MotivoObsolescenciaSupabase;
  },

  async garantirMotivosPadrao() {
    const organizacaoId = await buscarOrganizacaoAtual();

    const { data: existentes, error: listarError } = await supabase
      .from("motivos_obsolescencia")
      .select("nome")
      .eq("organizacao_id", organizacaoId);

    if (listarError) {
      throw new Error(listarError.message);
    }

    const nomesExistentes = new Set(
      ((existentes || []) as Array<{ nome: string }>).map((item) =>
        item.nome.trim().toLowerCase()
      )
    );

    const faltantes = MOTIVOS_PADRAO.filter(
      (nome) => !nomesExistentes.has(nome.trim().toLowerCase())
    );

    if (faltantes.length > 0) {
      const { error: inserirError } = await supabase
        .from("motivos_obsolescencia")
        .insert(
          faltantes.map((nome) => ({
            organizacao_id: organizacaoId,
            nome,
            ativo: true,
          }))
        );

      if (inserirError) {
        throw new Error(inserirError.message);
      }
    }

    return laudosObsolescenciaService.listarMotivos();
  },
};

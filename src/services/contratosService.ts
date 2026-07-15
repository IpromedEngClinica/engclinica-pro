import { supabase } from "@/lib/supabaseClient";

const DOCUMENTOS_BUCKET = "contratos-documentos";

export type ContratoTipo = "Publico" | "Privado";

export type ContratoStatusVencimento =
  | "vencido"
  | "critico"
  | "atencao"
  | "ok"
  | "sem_data";

export type PeriodicidadeVisita =
  | "Semanal"
  | "Quinzenal"
  | "Mensal"
  | "Bimestral"
  | "Trimestral"
  | "Semestral"
  | "Anual"
  | "Sob demanda"
  | "Nao se aplica";

export const CONTRATO_VENDEDORES = ["Dayvid", "Lauro", "ACI"] as const;

export type ContratoDocumentoSupabase = {
  id: string;
  organizacao_id: string;
  contrato_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  caminho_storage: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  observacoes: string | null;
  created_at: string;
};

export type ContratoSupabase = {
  id: string;
  organizacao_id: string;
  empresa_id: string | null;
  tipo: ContratoTipo;
  empresa_nome_snapshot: string | null;
  numero_identificacao: string | null;
  data_ultima_renovacao: string | null;
  data_proxima_renovacao: string;
  contrato_ou_ta_na_pasta: boolean;
  termos_aditivos_realizados: number;
  termos_aditivos_limite: number | null;
  periodicidade_visita: string | null;
  vendedor: string | null;
  valor_previsto: number | null;
  mes_ultima_visita: string | null;
  objeto: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    cpf_cnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
  } | null;
  documentos?: ContratoDocumentoSupabase[];
};

export type ContratoFormInput = {
  empresaId?: string | null;
  tipo: ContratoTipo;
  empresaNomeSnapshot?: string | null;
  numeroIdentificacao?: string | null;
  dataUltimaRenovacao?: string | null;
  dataProximaRenovacao: string;
  contratoOuTaNaPasta: boolean;
  termosAditivosRealizados: number;
  termosAditivosLimite?: number | null;
  periodicidadeVisita?: string | null;
  vendedor?: string | null;
  valorPrevisto?: number | null;
  mesUltimaVisita?: string | null;
  objeto?: string | null;
  observacoes?: string | null;
};

export type ListarContratosFiltros = {
  termo?: string;
  tipo?: ContratoTipo | "todos";
  vendedor?: string;
  periodicidadeVisita?: string;
  ativo?: boolean;
};

export type UploadContratoDocumentoInput = {
  contratoId: string;
  tipoDocumento: string;
  file: File;
  observacoes?: string | null;
};

const selectContrato = `
  id,
  organizacao_id,
  empresa_id,
  tipo,
  empresa_nome_snapshot,
  numero_identificacao,
  data_ultima_renovacao,
  data_proxima_renovacao,
  contrato_ou_ta_na_pasta,
  termos_aditivos_realizados,
  termos_aditivos_limite,
  periodicidade_visita,
  vendedor,
  valor_previsto,
  mes_ultima_visita,
  objeto,
  observacoes,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    cpf_cnpj,
    telefone,
    email
  ),
  documentos:contrato_documentos (
    id,
    organizacao_id,
    contrato_id,
    tipo_documento,
    nome_arquivo,
    caminho_storage,
    mime_type,
    tamanho_bytes,
    observacoes,
    created_at
  )
`;

const selectDocumento = `
  id,
  organizacao_id,
  contrato_id,
  tipo_documento,
  nome_arquivo,
  caminho_storage,
  mime_type,
  tamanho_bytes,
  observacoes,
  created_at
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

const toDatabasePayload = (input: ContratoFormInput) => ({
  empresa_id: input.empresaId || null,
  tipo: input.tipo || "Privado",
  empresa_nome_snapshot: input.empresaNomeSnapshot?.trim() || null,
  numero_identificacao: input.numeroIdentificacao?.trim() || null,
  data_ultima_renovacao: input.dataUltimaRenovacao || null,
  data_proxima_renovacao: input.dataProximaRenovacao,
  contrato_ou_ta_na_pasta: input.contratoOuTaNaPasta,
  termos_aditivos_realizados: Number(input.termosAditivosRealizados || 0),
  termos_aditivos_limite:
    input.termosAditivosLimite === null ||
    input.termosAditivosLimite === undefined ||
    Number.isNaN(Number(input.termosAditivosLimite))
      ? null
      : Number(input.termosAditivosLimite),
  periodicidade_visita: input.periodicidadeVisita || null,
  vendedor: input.vendedor?.trim() || null,
  valor_previsto:
    input.valorPrevisto === null ||
    input.valorPrevisto === undefined ||
    Number.isNaN(Number(input.valorPrevisto))
      ? null
      : Number(input.valorPrevisto),
  mes_ultima_visita: input.mesUltimaVisita
    ? `${input.mesUltimaVisita.slice(0, 7)}-01`
    : null,
  objeto: input.objeto?.trim() || null,
  observacoes: input.observacoes?.trim() || null,
});

const assertEmpresaObrigatoria = (input: ContratoFormInput) => {
  if (!input.empresaId) {
    throw new Error("Empresa é obrigatória para cadastrar contrato.");
  }
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");

export const calcularDiasParaVencer = (
  dataProximaRenovacao?: string | null
) => {
  if (!dataProximaRenovacao) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(`${dataProximaRenovacao}T00:00:00`);
  vencimento.setHours(0, 0, 0, 0);

  const diffMs = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const getStatusVencimentoContrato = (
  dataProximaRenovacao?: string | null
): ContratoStatusVencimento => {
  const dias = calcularDiasParaVencer(dataProximaRenovacao);

  if (dias === null) return "sem_data";
  if (dias < 0) return "vencido";
  if (dias <= 30) return "critico";
  if (dias <= 60) return "atencao";
  return "ok";
};

export const getTermosAditivosTexto = (contrato: ContratoSupabase) => {
  if (
    contrato.termos_aditivos_limite === null ||
    contrato.termos_aditivos_limite === undefined
  ) {
    return `${contrato.termos_aditivos_realizados}/-`;
  }

  return `${contrato.termos_aditivos_realizados}/${contrato.termos_aditivos_limite}`;
};

export const getTermosAditivosRestantes = (contrato: ContratoSupabase) => {
  if (
    contrato.termos_aditivos_limite === null ||
    contrato.termos_aditivos_limite === undefined
  ) {
    return null;
  }

  return Math.max(
    contrato.termos_aditivos_limite - contrato.termos_aditivos_realizados,
    0
  );
};

export const getEmpresaContratoNome = (contrato: ContratoSupabase) =>
  contrato.empresa?.nome ||
  contrato.empresa?.nome_fantasia ||
  contrato.empresa_nome_snapshot ||
  "Nao informado";

export const getDiasContratoTexto = (dataProximaRenovacao?: string | null) => {
  const dias = calcularDiasParaVencer(dataProximaRenovacao);

  if (dias === null) return "-";
  if (dias < 0) return `Vencido ha ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  return `Faltam ${dias} dia(s)`;
};

const periodicidadeMeses: Record<string, number> = {
  Semanal: 1,
  Quinzenal: 1,
  Mensal: 1,
  Bimestral: 2,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const getMesReferenciaAtual = () => toMonthKey(new Date());

export const formatarMesContrato = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";

  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const calcularProximoMesFaturamentoContrato = (
  contrato: Pick<ContratoSupabase, "periodicidade_visita" | "mes_ultima_visita">
) => {
  const meses = contrato.periodicidade_visita
    ? periodicidadeMeses[contrato.periodicidade_visita]
    : undefined;

  if (!meses || !contrato.mes_ultima_visita) return null;

  const date = new Date(`${contrato.mes_ultima_visita.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  date.setMonth(date.getMonth() + meses);
  return toMonthKey(date);
};

export const isFaturamentoPrevistoNoMes = (
  contrato: Pick<
    ContratoSupabase,
    "periodicidade_visita" | "mes_ultima_visita" | "valor_previsto"
  >,
  mesReferencia = getMesReferenciaAtual()
) => {
  if (!contrato.valor_previsto || contrato.valor_previsto <= 0) return false;

  const proximoMes = calcularProximoMesFaturamentoContrato(contrato);
  return Boolean(proximoMes && proximoMes <= mesReferencia);
};

export const contratosService = {
  async listar(filtros?: ListarContratosFiltros) {
    let query = supabase
      .from("contratos")
      .select(selectContrato)
      .eq("ativo", filtros?.ativo ?? true)
      .order("data_proxima_renovacao", { ascending: true });

    if (filtros?.tipo && filtros.tipo !== "todos") {
      query = query.eq("tipo", filtros.tipo);
    }

    if (filtros?.vendedor) {
      query = query.eq("vendedor", filtros.vendedor);
    }

    if (filtros?.periodicidadeVisita) {
      query = query.eq("periodicidade_visita", filtros.periodicidadeVisita);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoSupabase[];
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("contratos")
      .select(selectContrato)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoSupabase;
  },

  async criar(input: ContratoFormInput) {
    assertEmpresaObrigatoria(input);
    const organizacaoId = await buscarOrganizacaoAtual();

    const { data, error } = await supabase
      .from("contratos")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
        ativo: true,
      })
      .select(selectContrato)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoSupabase;
  },

  async atualizar(id: string, input: ContratoFormInput) {
    assertEmpresaObrigatoria(input);
    const { data, error } = await supabase
      .from("contratos")
      .update(toDatabasePayload(input))
      .eq("id", id)
      .select(selectContrato)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoSupabase;
  },

  async desativar(id: string) {
    const { data, error } = await supabase
      .from("contratos")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(selectContrato)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoSupabase;
  },

  async uploadDocumento(input: UploadContratoDocumentoInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const fileName = sanitizeFileName(input.file.name);
    const path = `${organizacaoId}/${input.contratoId}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .upload(path, input.file, {
        contentType: input.file.type || undefined,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data, error } = await supabase
      .from("contrato_documentos")
      .insert({
        organizacao_id: organizacaoId,
        contrato_id: input.contratoId,
        tipo_documento: input.tipoDocumento || "Contrato",
        nome_arquivo: input.file.name,
        caminho_storage: path,
        mime_type: input.file.type || null,
        tamanho_bytes: input.file.size,
        observacoes: input.observacoes?.trim() || null,
      })
      .select(selectDocumento)
      .single();

    if (error) {
      await supabase.storage.from(DOCUMENTOS_BUCKET).remove([path]);
      throw new Error(error.message);
    }

    return data as unknown as ContratoDocumentoSupabase;
  },

  async listarDocumentos(contratoId: string) {
    const { data, error } = await supabase
      .from("contrato_documentos")
      .select(selectDocumento)
      .eq("contrato_id", contratoId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as ContratoDocumentoSupabase[];
  },

  async criarUrlDocumento(documento: ContratoDocumentoSupabase) {
    const { data, error } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .createSignedUrl(documento.caminho_storage, 60 * 5, {
        download: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data.signedUrl;
  },

  async baixarDocumento(documento: ContratoDocumentoSupabase) {
    const { data, error } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .createSignedUrl(documento.caminho_storage, 60 * 5, {
        download: documento.nome_arquivo,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data.signedUrl;
  },

  async removerDocumento(documento: ContratoDocumentoSupabase) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .remove([documento.caminho_storage]);

    if (storageError) {
      throw new Error(storageError.message);
    }

    const { error } = await supabase
      .from("contrato_documentos")
      .delete()
      .eq("id", documento.id);

    if (error) {
      throw new Error(error.message);
    }
  },
};

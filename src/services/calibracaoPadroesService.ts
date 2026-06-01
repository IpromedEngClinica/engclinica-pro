import { supabase } from "@/lib/supabaseClient";

const DOCUMENTOS_BUCKET = "calibracao-padroes-documentos";

export type CalibracaoPadraoTipoDocumento =
  | "Certificado"
  | "Rastreabilidade"
  | "Outro";

export type CalibracaoPadraoDocumento = {
  id: string;
  organizacao_id: string;
  padrao_id: string;
  tipo_documento: CalibracaoPadraoTipoDocumento;
  nome_arquivo: string;
  caminho_storage: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  observacoes: string | null;
  created_at: string;
};

export type CalibracaoPadraoPonto = {
  id: string;
  organizacao_id: string;
  tabela_id: string;
  ordem: number;
  valor_nominal: number;
  media_valores_medidos: number | null;
  tendencia: number | null;
  incerteza_expandida: number | null;
  fator_abrangencia_k: number | null;
  graus_liberdade_efetivos_veff: number | null;
  veff_infinito: boolean;
  observacoes: string | null;
};

export type CalibracaoPadraoTabela = {
  id: string;
  organizacao_id: string;
  padrao_id: string;
  nome: string;
  grandeza: string;
  unidade: string;
  ordem: number;
  ativo: boolean;
  pontos?: CalibracaoPadraoPonto[];
};

export type CalibracaoPadrao = {
  id: string;
  organizacao_id: string;
  numero_certificado: string;
  nome_padrao: string;
  descricao: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
  laboratorio_calibrador: string;
  data_calibracao: string;
  data_validade: string;
  observacoes: string | null;
  temperatura_ambiente: number | null;
  incerteza_temperatura: number | null;
  unidade_temperatura: string | null;
  umidade_relativa: number | null;
  incerteza_umidade: number | null;
  unidade_umidade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  documentos?: CalibracaoPadraoDocumento[];
  tabelas?: CalibracaoPadraoTabela[];
};

export type CalibracaoPadraoFormInput = {
  numeroCertificado: string;
  nomePadrao: string;
  descricao?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  patrimonio?: string | null;
  tag?: string | null;
  laboratorioCalibrador: string;
  dataCalibracao: string;
  dataValidade: string;
  observacoes?: string | null;
  temperaturaAmbiente?: number | null;
  incertezaTemperatura?: number | null;
  unidadeTemperatura?: string | null;
  umidadeRelativa?: number | null;
  incertezaUmidade?: number | null;
  unidadeUmidade?: string | null;
};

export type CalibracaoPadraoTabelaInput = {
  id?: string;
  nome: string;
  grandeza: string;
  unidade: string;
  ordem?: number;
  ativo?: boolean;
  pontos?: CalibracaoPadraoPontoInput[];
};

export type CalibracaoPadraoPontoInput = {
  id?: string;
  ordem?: number;
  valorNominal: number;
  mediaValoresMedidos?: number | null;
  tendencia?: number | null;
  incertezaExpandida?: number | null;
  fatorAbrangenciaK?: number | null;
  grausLiberdadeEfetivosVeff?: number | null;
  veffInfinito?: boolean;
  observacoes?: string | null;
};

export type UploadCalibracaoPadraoDocumentoInput = {
  padraoId: string;
  tipoDocumento: CalibracaoPadraoTipoDocumento;
  file: File;
  observacoes?: string | null;
};

export type CalibracaoPadraoStatusValidade =
  | "vencido"
  | "ate_30_dias"
  | "ate_60_dias"
  | "valido";

const selectDocumento = `
  id,
  organizacao_id,
  padrao_id,
  tipo_documento,
  nome_arquivo,
  caminho_storage,
  mime_type,
  tamanho_bytes,
  observacoes,
  created_at
`;

const selectPonto = `
  id,
  organizacao_id,
  tabela_id,
  ordem,
  valor_nominal,
  media_valores_medidos,
  tendencia,
  incerteza_expandida,
  fator_abrangencia_k,
  graus_liberdade_efetivos_veff,
  veff_infinito,
  observacoes
`;

const selectTabela = `
  id,
  organizacao_id,
  padrao_id,
  nome,
  grandeza,
  unidade,
  ordem,
  ativo,
  pontos:calibracao_padrao_pontos (
    ${selectPonto}
  )
`;

const selectPadrao = `
  id,
  organizacao_id,
  numero_certificado,
  nome_padrao,
  descricao,
  fabricante,
  modelo,
  numero_serie,
  patrimonio,
  tag,
  laboratorio_calibrador,
  data_calibracao,
  data_validade,
  observacoes,
  temperatura_ambiente,
  incerteza_temperatura,
  unidade_temperatura,
  umidade_relativa,
  incerteza_umidade,
  unidade_umidade,
  ativo,
  created_at,
  updated_at,
  documentos:calibracao_padrao_documentos (
    ${selectDocumento}
  ),
  tabelas:calibracao_padrao_tabelas (
    ${selectTabela}
  )
`;

const trimOrNull = (value?: string | null) => value?.trim() || null;

const buscarOrganizacaoAtual = async () => {
  const { data: organizacaoId, error } = await supabase.rpc(
    "current_organizacao_id"
  );

  if (error) throw new Error(error.message);
  if (!organizacaoId) {
    throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  }

  return organizacaoId as string;
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");

const sanitizePathSegment = (value: string) =>
  sanitizeFileName(value).toLowerCase() || "outro";

const normalizePadrao = (padrao: CalibracaoPadrao) => ({
  ...padrao,
  documentos: [...(padrao.documentos || [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  ),
  tabelas: [...(padrao.tabelas || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((tabela) => ({
      ...tabela,
      pontos: [...(tabela.pontos || [])].sort((a, b) => a.ordem - b.ordem),
    })),
});

const toPadraoPayload = (input: CalibracaoPadraoFormInput) => ({
  numero_certificado: input.numeroCertificado.trim(),
  nome_padrao: input.nomePadrao.trim(),
  descricao: trimOrNull(input.descricao),
  fabricante: trimOrNull(input.fabricante),
  modelo: trimOrNull(input.modelo),
  numero_serie: trimOrNull(input.numeroSerie),
  patrimonio: trimOrNull(input.patrimonio),
  tag: trimOrNull(input.tag),
  laboratorio_calibrador: input.laboratorioCalibrador.trim(),
  data_calibracao: input.dataCalibracao,
  data_validade: input.dataValidade,
  observacoes: trimOrNull(input.observacoes),
  temperatura_ambiente: input.temperaturaAmbiente ?? null,
  incerteza_temperatura: input.incertezaTemperatura ?? null,
  unidade_temperatura: trimOrNull(input.unidadeTemperatura) || "°C",
  umidade_relativa: input.umidadeRelativa ?? null,
  incerteza_umidade: input.incertezaUmidade ?? null,
  unidade_umidade: trimOrNull(input.unidadeUmidade) || "%",
});

const toTabelaPayload = (input: CalibracaoPadraoTabelaInput) => ({
  nome: input.nome.trim(),
  grandeza: input.grandeza.trim(),
  unidade: input.unidade.trim(),
  ordem: input.ordem ?? 0,
  ativo: input.ativo ?? true,
});

const toPontoPayload = (input: CalibracaoPadraoPontoInput) => ({
  ordem: input.ordem ?? 0,
  valor_nominal: input.valorNominal,
  media_valores_medidos: input.mediaValoresMedidos ?? null,
  tendencia: input.tendencia ?? null,
  incerteza_expandida: input.incertezaExpandida ?? null,
  fator_abrangencia_k: input.fatorAbrangenciaK ?? null,
  graus_liberdade_efetivos_veff:
    input.grausLiberdadeEfetivosVeff ?? null,
  veff_infinito: input.veffInfinito ?? false,
  observacoes: trimOrNull(input.observacoes),
});

const validarPadrao = (input: CalibracaoPadraoFormInput) => {
  if (!input.numeroCertificado.trim()) {
    throw new Error("Informe o numero do certificado.");
  }
  if (!input.nomePadrao.trim()) {
    throw new Error("Informe o nome do padrao.");
  }
  if (!input.laboratorioCalibrador.trim()) {
    throw new Error("Informe o laboratorio calibrador.");
  }
  if (!input.dataCalibracao || !input.dataValidade) {
    throw new Error("Informe as datas de calibracao e validade.");
  }
  if (input.dataValidade < input.dataCalibracao) {
    throw new Error("A validade nao pode ser anterior a data de calibracao.");
  }
};

const validarTabela = (input: CalibracaoPadraoTabelaInput) => {
  if (!input.nome.trim() || !input.grandeza.trim() || !input.unidade.trim()) {
    throw new Error("Informe nome, grandeza e unidade de cada tabela.");
  }
};

export const calcularDiasParaVencerPadrao = (dataValidade: string) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(`${dataValidade}T00:00:00`);
  validade.setHours(0, 0, 0, 0);
  return Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
};

export const getStatusValidadePadrao = (
  dataValidade: string
): CalibracaoPadraoStatusValidade => {
  const dias = calcularDiasParaVencerPadrao(dataValidade);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "ate_30_dias";
  if (dias <= 60) return "ate_60_dias";
  return "valido";
};

export const calibracaoPadroesService = {
  async listarPadroes() {
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .select(selectPadrao)
      .eq("ativo", true)
      .order("data_validade", { ascending: true });

    if (error) throw new Error(error.message);
    return (data as unknown as CalibracaoPadrao[]).map(normalizePadrao);
  },

  async buscarPadraoPorId(id: string) {
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .select(selectPadrao)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return normalizePadrao(data as unknown as CalibracaoPadrao);
  },

  async criarPadrao(input: CalibracaoPadraoFormInput) {
    validarPadrao(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .insert({
        organizacao_id: organizacaoId,
        ...toPadraoPayload(input),
        ativo: true,
      })
      .select(selectPadrao)
      .single();

    if (error) throw new Error(error.message);
    return normalizePadrao(data as unknown as CalibracaoPadrao);
  },

  async atualizarPadrao(id: string, input: CalibracaoPadraoFormInput) {
    validarPadrao(input);
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .update(toPadraoPayload(input))
      .eq("id", id)
      .select(selectPadrao)
      .single();

    if (error) throw new Error(error.message);
    return normalizePadrao(data as unknown as CalibracaoPadrao);
  },

  async desativarPadrao(id: string) {
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .update({ ativo: false })
      .eq("id", id)
      .select(selectPadrao)
      .single();

    if (error) throw new Error(error.message);
    return normalizePadrao(data as unknown as CalibracaoPadrao);
  },

  async criarTabela(padraoId: string, input: CalibracaoPadraoTabelaInput) {
    validarTabela(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_padrao_tabelas")
      .insert({
        organizacao_id: organizacaoId,
        padrao_id: padraoId,
        ...toTabelaPayload(input),
      })
      .select(selectTabela)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoPadraoTabela;
  },

  async atualizarTabela(id: string, input: CalibracaoPadraoTabelaInput) {
    validarTabela(input);
    const { data, error } = await supabase
      .from("calibracao_padrao_tabelas")
      .update(toTabelaPayload(input))
      .eq("id", id)
      .select(selectTabela)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoPadraoTabela;
  },

  async removerTabela(id: string) {
    const { error } = await supabase
      .from("calibracao_padrao_tabelas")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async criarPonto(tabelaId: string, input: CalibracaoPadraoPontoInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_padrao_pontos")
      .insert({
        organizacao_id: organizacaoId,
        tabela_id: tabelaId,
        ...toPontoPayload(input),
      })
      .select(selectPonto)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoPadraoPonto;
  },

  async atualizarPonto(id: string, input: CalibracaoPadraoPontoInput) {
    const { data, error } = await supabase
      .from("calibracao_padrao_pontos")
      .update(toPontoPayload(input))
      .eq("id", id)
      .select(selectPonto)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoPadraoPonto;
  },

  async removerPonto(id: string) {
    const { error } = await supabase
      .from("calibracao_padrao_pontos")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async salvarTabelasPadrao(
    padraoId: string,
    tabelas: CalibracaoPadraoTabelaInput[]
  ) {
    const atual = await this.buscarPadraoPorId(padraoId);
    const idsTabelasMantidas = new Set(
      tabelas.map((tabela) => tabela.id).filter(Boolean)
    );

    for (const tabelaAtual of atual.tabelas || []) {
      if (!idsTabelasMantidas.has(tabelaAtual.id)) {
        await this.removerTabela(tabelaAtual.id);
      }
    }

    for (const [tabelaIndex, tabelaInput] of tabelas.entries()) {
      validarTabela(tabelaInput);
      const tabelaAtual = (atual.tabelas || []).find(
        (tabela) => tabela.id === tabelaInput.id
      );
      const tabelaSalva = tabelaAtual
        ? await this.atualizarTabela(tabelaAtual.id, {
            ...tabelaInput,
            ordem: tabelaIndex,
          })
        : await this.criarTabela(padraoId, {
            ...tabelaInput,
            ordem: tabelaIndex,
          });

      const idsPontosMantidos = new Set(
        (tabelaInput.pontos || []).map((ponto) => ponto.id).filter(Boolean)
      );

      for (const pontoAtual of tabelaAtual?.pontos || []) {
        if (!idsPontosMantidos.has(pontoAtual.id)) {
          await this.removerPonto(pontoAtual.id);
        }
      }

      for (const [pontoIndex, pontoInput] of (
        tabelaInput.pontos || []
      ).entries()) {
        const pontoAtual = tabelaAtual?.pontos?.find(
          (ponto) => ponto.id === pontoInput.id
        );
        if (pontoAtual) {
          await this.atualizarPonto(pontoAtual.id, {
            ...pontoInput,
            ordem: pontoIndex,
          });
        } else {
          await this.criarPonto(tabelaSalva.id, {
            ...pontoInput,
            ordem: pontoIndex,
          });
        }
      }
    }
  },

  async uploadDocumento(input: UploadCalibracaoPadraoDocumentoInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const fileName = sanitizeFileName(input.file.name);
    const tipo = sanitizePathSegment(input.tipoDocumento);
    const path = `${organizacaoId}/${input.padraoId}/${tipo}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .upload(path, input.file, {
        contentType: input.file.type || undefined,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await supabase
      .from("calibracao_padrao_documentos")
      .insert({
        organizacao_id: organizacaoId,
        padrao_id: input.padraoId,
        tipo_documento: input.tipoDocumento,
        nome_arquivo: input.file.name,
        caminho_storage: path,
        mime_type: input.file.type || null,
        tamanho_bytes: input.file.size,
        observacoes: trimOrNull(input.observacoes),
      })
      .select(selectDocumento)
      .single();

    if (error) {
      await supabase.storage.from(DOCUMENTOS_BUCKET).remove([path]);
      throw new Error(error.message);
    }

    return data as unknown as CalibracaoPadraoDocumento;
  },

  async listarDocumentos(padraoId: string) {
    const { data, error } = await supabase
      .from("calibracao_padrao_documentos")
      .select(selectDocumento)
      .eq("padrao_id", padraoId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoPadraoDocumento[];
  },

  async visualizarDocumento(documento: CalibracaoPadraoDocumento) {
    const { data, error } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .createSignedUrl(documento.caminho_storage, 60 * 5, {
        download: false,
      });

    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async baixarDocumento(documento: CalibracaoPadraoDocumento) {
    const { data, error } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .createSignedUrl(documento.caminho_storage, 60 * 5, {
        download: documento.nome_arquivo,
      });

    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async removerDocumento(documento: CalibracaoPadraoDocumento) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .remove([documento.caminho_storage]);

    if (storageError) throw new Error(storageError.message);

    const { error } = await supabase
      .from("calibracao_padrao_documentos")
      .delete()
      .eq("id", documento.id);

    if (error) throw new Error(error.message);
  },
};

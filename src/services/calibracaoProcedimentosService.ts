import { supabase } from "@/lib/supabaseClient";
import type {
  CalibracaoPadrao,
  CalibracaoPadraoTabela,
} from "@/services/calibracaoPadroesService";

export type CalibracaoProcedimentoModoPreenchimento = "manual" | "automatico";
export type CalibracaoProcedimentoFatorModo =
  | "calcular_95"
  | "k_fixo"
  | "manual_execucao";
export type CalibracaoProcedimentoCriterioTipo =
  | "absoluto"
  | "percentual"
  | "faixa";

export type CalibracaoProcedimentoPonto = {
  id: string;
  organizacao_id: string;
  tabela_id: string;
  ordem: number;
  valor_nominal: number;
  descricao: string | null;
  ativo: boolean;
};

export type CalibracaoProcedimentoTabela = {
  id: string;
  organizacao_id: string;
  procedimento_id: string;
  nome: string;
  grandeza: string;
  unidade: string;
  ordem: number;
  modo_preenchimento: CalibracaoProcedimentoModoPreenchimento;
  quantidade_leituras: number;
  tipo_medida: string | null;
  resolucao_padrao_default: number | null;
  resolucao_equipamento_default: number | null;
  faixa_uso_min: number | null;
  faixa_uso_max: number | null;
  capacidade_min: number | null;
  capacidade_max: number | null;
  fator_confiabilidade_modo: CalibracaoProcedimentoFatorModo;
  fator_k_fixo: number | null;
  incluir_criterio_aceitacao: boolean;
  criterio_aceitacao_tipo: CalibracaoProcedimentoCriterioTipo | null;
  criterio_aceitacao_valor_maximo: number | null;
  criterio_aceitacao_valor_minimo: number | null;
  corrigir_erro_sistematico: boolean;
  padrao_id: string | null;
  padrao_tabela_id: string | null;
  ativo: boolean;
  pontos?: CalibracaoProcedimentoPonto[];
  padrao?: CalibracaoProcedimentoPadraoSelecionavel | null;
  padrao_tabela?: CalibracaoPadraoTabela | null;
};

export type CalibracaoProcedimentoPadraoSelecionavel = Pick<
  CalibracaoPadrao,
  | "id"
  | "numero_certificado"
  | "nome_padrao"
  | "tag"
  | "numero_serie"
  | "laboratorio_calibrador"
  | "data_validade"
  | "ativo"
> & {
  tabelas?: CalibracaoPadraoTabela[];
};

export type CalibracaoProcedimento = {
  id: string;
  organizacao_id: string;
  codigo: string;
  nome: string;
  tipo_equipamento_id: string | null;
  descricao: string | null;
  metodo_referencia: string | null;
  observacoes: string | null;
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  tipo_equipamento?: { id: string; nome: string } | null;
  tabelas?: CalibracaoProcedimentoTabela[];
};

// A execucao futura deve persistir uma copia destes dados, sem depender do template editavel.
export type CalibracaoProcedimentoSnapshot = Pick<
  CalibracaoProcedimento,
  "codigo" | "nome" | "versao" | "metodo_referencia"
> & {
  tabelas: CalibracaoProcedimentoTabela[];
};

export type CalibracaoProcedimentoFormInput = {
  codigo?: string;
  nome: string;
  tipoEquipamentoId: string;
  metodoReferencia?: string | null;
  observacoes?: string | null;
  versao?: number;
};

export type CalibracaoProcedimentoPontoInput = {
  id?: string;
  ordem?: number;
  valorNominal: number;
  descricao?: string | null;
};

export type CalibracaoProcedimentoTabelaInput = {
  id?: string;
  nome: string;
  grandeza: string;
  unidade: string;
  ordem?: number;
  modoPreenchimento: CalibracaoProcedimentoModoPreenchimento;
  quantidadeLeituras: number;
  tipoMedida?: string | null;
  resolucaoPadraoDefault?: number | null;
  resolucaoEquipamentoDefault?: number | null;
  faixaUsoMin?: number | null;
  faixaUsoMax?: number | null;
  capacidadeMin?: number | null;
  capacidadeMax?: number | null;
  fatorConfiabilidadeModo: CalibracaoProcedimentoFatorModo;
  fatorKFixo?: number | null;
  incluirCriterioAceitacao: boolean;
  criterioAceitacaoTipo?: CalibracaoProcedimentoCriterioTipo | null;
  criterioAceitacaoValorMaximo?: number | null;
  criterioAceitacaoValorMinimo?: number | null;
  corrigirErroSistematico: boolean;
  padraoId: string;
  padraoTabelaId: string;
  pontos?: CalibracaoProcedimentoPontoInput[];
};

export type CalibracaoProcedimentoPadraoCompativel = {
  id: string;
  organizacao_id: string;
  procedimento_tabela_id: string;
  padrao_id: string | null;
  padrao_tabela_id: string | null;
  ativo: boolean;
  created_at: string;
};

export type VincularCalibracaoProcedimentoPadraoInput = {
  procedimentoTabelaId: string;
  padraoId?: string | null;
  padraoTabelaId?: string | null;
};

const selectPonto = `
  id,
  organizacao_id,
  tabela_id,
  ordem,
  valor_nominal,
  descricao,
  ativo
`;

const selectPadraoPonto = `
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

const selectPadraoTabela = `
  id,
  organizacao_id,
  padrao_id,
  nome,
  grandeza,
  unidade,
  ordem,
  ativo,
  pontos:calibracao_padrao_pontos (${selectPadraoPonto})
`;

const selectPadraoSelecionavel = `
  id,
  numero_certificado,
  nome_padrao,
  tag,
  numero_serie,
  laboratorio_calibrador,
  data_validade,
  ativo,
  tabelas:calibracao_padrao_tabelas (${selectPadraoTabela})
`;

const selectTabela = `
  id,
  organizacao_id,
  procedimento_id,
  nome,
  grandeza,
  unidade,
  ordem,
  modo_preenchimento,
  quantidade_leituras,
  tipo_medida,
  resolucao_padrao_default,
  resolucao_equipamento_default,
  faixa_uso_min,
  faixa_uso_max,
  capacidade_min,
  capacidade_max,
  fator_confiabilidade_modo,
  fator_k_fixo,
  incluir_criterio_aceitacao,
  criterio_aceitacao_tipo,
  criterio_aceitacao_valor_maximo,
  criterio_aceitacao_valor_minimo,
  corrigir_erro_sistematico,
  padrao_id,
  padrao_tabela_id,
  ativo,
  pontos:calibracao_procedimento_pontos (${selectPonto}),
  padrao:calibracao_padroes (${selectPadraoSelecionavel}),
  padrao_tabela:calibracao_padrao_tabelas (${selectPadraoTabela})
`;

const selectProcedimento = `
  id,
  organizacao_id,
  codigo,
  nome,
  tipo_equipamento_id,
  descricao,
  metodo_referencia,
  observacoes,
  versao,
  ativo,
  created_at,
  updated_at,
  tipo_equipamento:tipos_equipamento (id, nome),
  tabelas:calibracao_procedimento_tabelas (${selectTabela})
`;

const trimOrNull = (value?: string | null) => value?.trim() || null;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao.");
  return data as string;
};

const normalizeProcedimento = (procedimento: CalibracaoProcedimento) => ({
  ...procedimento,
  tabelas: [...(procedimento.tabelas || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((tabela) => ({
      ...tabela,
      pontos: [...(tabela.pontos || [])].sort((a, b) => a.ordem - b.ordem),
      padrao: tabela.padrao
        ? normalizePadraoSelecionavel(tabela.padrao)
        : null,
      padrao_tabela: tabela.padrao_tabela
        ? {
            ...tabela.padrao_tabela,
            pontos: [...(tabela.padrao_tabela.pontos || [])].sort(
              (a, b) => a.ordem - b.ordem
            ),
          }
        : null,
    })),
});

const normalizePadraoSelecionavel = (
  padrao: CalibracaoProcedimentoPadraoSelecionavel
) => ({
  ...padrao,
  tabelas: [...(padrao.tabelas || [])]
    .filter((tabela) => tabela.ativo)
    .sort((a, b) => a.ordem - b.ordem)
    .map((tabela) => ({
      ...tabela,
      pontos: [...(tabela.pontos || [])].sort((a, b) => a.ordem - b.ordem),
    })),
});

const validarProcedimento = (input: CalibracaoProcedimentoFormInput) => {
  if (!input.nome.trim()) throw new Error("Informe o nome do procedimento.");
  if (!input.tipoEquipamentoId) throw new Error("Selecione o tipo de equipamento.");
};

const validarTabela = (input: CalibracaoProcedimentoTabelaInput) => {
  if (!input.nome.trim() || !input.grandeza.trim() || !input.unidade.trim()) {
    throw new Error("Informe titulo, grandeza e unidade de cada tabela.");
  }
  if (!input.padraoId || !input.padraoTabelaId) {
    throw new Error(`Selecione o padrao e a tabela metrologica da tabela "${input.nome}".`);
  }
  if (input.quantidadeLeituras < 1) {
    throw new Error(`A tabela "${input.nome}" deve possuir ao menos uma leitura.`);
  }
  if (!input.pontos?.length) {
    throw new Error(`A tabela "${input.nome}" deve possuir ao menos um ponto nominal.`);
  }
  if (input.fatorConfiabilidadeModo === "k_fixo" && input.fatorKFixo == null) {
    throw new Error(`Informe o valor de k fixo na tabela "${input.nome}".`);
  }
  if (
    input.incluirCriterioAceitacao &&
    (!input.criterioAceitacaoTipo || input.criterioAceitacaoValorMaximo == null)
  ) {
    throw new Error(`Informe o criterio de aceitacao da tabela "${input.nome}".`);
  }
  if (
    input.incluirCriterioAceitacao &&
    input.criterioAceitacaoTipo === "faixa" &&
    input.criterioAceitacaoValorMinimo == null
  ) {
    throw new Error(`Informe o valor minimo do criterio da tabela "${input.nome}".`);
  }
};

const toProcedimentoPayload = (input: CalibracaoProcedimentoFormInput) => {
  const payload: Record<string, unknown> = {
    nome: input.nome.trim(),
    tipo_equipamento_id: input.tipoEquipamentoId,
    metodo_referencia: trimOrNull(input.metodoReferencia),
    observacoes: trimOrNull(input.observacoes),
  };

  if (input.codigo?.trim()) payload.codigo = input.codigo.trim();
  if (input.versao != null) payload.versao = input.versao;

  return payload;
};

const toTabelaPayload = (input: CalibracaoProcedimentoTabelaInput) => ({
  nome: input.nome.trim(),
  grandeza: input.grandeza.trim(),
  unidade: input.unidade.trim(),
  ordem: input.ordem ?? 0,
  modo_preenchimento: input.modoPreenchimento,
  quantidade_leituras: input.quantidadeLeituras,
  tipo_medida: trimOrNull(input.tipoMedida),
  resolucao_padrao_default: input.resolucaoPadraoDefault ?? null,
  resolucao_equipamento_default: input.resolucaoEquipamentoDefault ?? null,
  faixa_uso_min: input.faixaUsoMin ?? null,
  faixa_uso_max: input.faixaUsoMax ?? null,
  capacidade_min: input.capacidadeMin ?? null,
  capacidade_max: input.capacidadeMax ?? null,
  fator_confiabilidade_modo: input.fatorConfiabilidadeModo,
  fator_k_fixo: input.fatorConfiabilidadeModo === "k_fixo" ? input.fatorKFixo ?? null : null,
  incluir_criterio_aceitacao: input.incluirCriterioAceitacao,
  criterio_aceitacao_tipo: input.incluirCriterioAceitacao ? input.criterioAceitacaoTipo ?? null : null,
  criterio_aceitacao_valor_maximo: input.incluirCriterioAceitacao ? input.criterioAceitacaoValorMaximo ?? null : null,
  criterio_aceitacao_valor_minimo:
    input.incluirCriterioAceitacao && input.criterioAceitacaoTipo === "faixa"
      ? input.criterioAceitacaoValorMinimo ?? null
      : null,
  corrigir_erro_sistematico: input.corrigirErroSistematico,
  padrao_id: input.padraoId,
  padrao_tabela_id: input.padraoTabelaId,
  ativo: true,
});

const toPontoPayload = (input: CalibracaoProcedimentoPontoInput) => ({
  ordem: input.ordem ?? 0,
  valor_nominal: input.valorNominal,
  descricao: trimOrNull(input.descricao),
  ativo: true,
});

const getHojeIso = () => {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
};

export const calibracaoProcedimentosService = {
  async listarPadroesValidos(dataReferencia = getHojeIso()) {
    const { data, error } = await supabase
      .from("calibracao_padroes")
      .select(selectPadraoSelecionavel)
      .eq("ativo", true)
      .gte("data_validade", dataReferencia)
      .order("nome_padrao", { ascending: true });
    if (error) throw new Error(error.message);
    return (
      data as unknown as CalibracaoProcedimentoPadraoSelecionavel[]
    ).map(normalizePadraoSelecionavel);
  },

  async listarTabelasDoPadrao(padraoId: string) {
    const { data, error } = await supabase
      .from("calibracao_padrao_tabelas")
      .select(selectPadraoTabela)
      .eq("padrao_id", padraoId)
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as unknown as CalibracaoPadraoTabela[]).map((tabela) => ({
      ...tabela,
      pontos: [...(tabela.pontos || [])].sort((a, b) => a.ordem - b.ordem),
    }));
  },

  async buscarTabelaPadraoPorId(tabelaId: string) {
    const { data, error } = await supabase
      .from("calibracao_padrao_tabelas")
      .select(selectPadraoTabela)
      .eq("id", tabelaId)
      .single();
    if (error) throw new Error(error.message);
    const tabela = data as unknown as CalibracaoPadraoTabela;
    return {
      ...tabela,
      pontos: [...(tabela.pontos || [])].sort((a, b) => a.ordem - b.ordem),
    };
  },

  async listarProcedimentos() {
    const { data, error } = await supabase
      .from("calibracao_procedimentos")
      .select(selectProcedimento)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as unknown as CalibracaoProcedimento[]).map(normalizeProcedimento);
  },

  async buscarProcedimentoPorId(id: string) {
    const { data, error } = await supabase
      .from("calibracao_procedimentos")
      .select(selectProcedimento)
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return normalizeProcedimento(data as unknown as CalibracaoProcedimento);
  },

  async criarProcedimento(input: CalibracaoProcedimentoFormInput) {
    validarProcedimento(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_procedimentos")
      .insert({ organizacao_id: organizacaoId, ...toProcedimentoPayload(input), ativo: true })
      .select(selectProcedimento)
      .single();
    if (error) throw new Error(error.message);
    return normalizeProcedimento(data as unknown as CalibracaoProcedimento);
  },

  async atualizarProcedimento(id: string, input: CalibracaoProcedimentoFormInput) {
    validarProcedimento(input);
    const { data, error } = await supabase
      .from("calibracao_procedimentos")
      .update(toProcedimentoPayload(input))
      .eq("id", id)
      .select(selectProcedimento)
      .single();
    if (error) throw new Error(error.message);
    return normalizeProcedimento(data as unknown as CalibracaoProcedimento);
  },

  async desativarProcedimento(id: string) {
    const { error } = await supabase.from("calibracao_procedimentos").update({ ativo: false }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async criarTabela(procedimentoId: string, input: CalibracaoProcedimentoTabelaInput) {
    validarTabela(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_procedimento_tabelas")
      .insert({ organizacao_id: organizacaoId, procedimento_id: procedimentoId, ...toTabelaPayload(input) })
      .select(selectTabela)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoProcedimentoTabela;
  },

  async atualizarTabela(id: string, input: CalibracaoProcedimentoTabelaInput) {
    validarTabela(input);
    const { data, error } = await supabase
      .from("calibracao_procedimento_tabelas")
      .update(toTabelaPayload(input))
      .eq("id", id)
      .select(selectTabela)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoProcedimentoTabela;
  },

  async removerTabela(id: string) {
    const { error } = await supabase.from("calibracao_procedimento_tabelas").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async criarPonto(tabelaId: string, input: CalibracaoProcedimentoPontoInput) {
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_procedimento_pontos")
      .insert({ organizacao_id: organizacaoId, tabela_id: tabelaId, ...toPontoPayload(input) })
      .select(selectPonto)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoProcedimentoPonto;
  },

  async atualizarPonto(id: string, input: CalibracaoProcedimentoPontoInput) {
    const { data, error } = await supabase
      .from("calibracao_procedimento_pontos")
      .update(toPontoPayload(input))
      .eq("id", id)
      .select(selectPonto)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoProcedimentoPonto;
  },

  async removerPonto(id: string) {
    const { error } = await supabase.from("calibracao_procedimento_pontos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async salvarTabelasProcedimento(procedimentoId: string, tabelas: CalibracaoProcedimentoTabelaInput[]) {
    if (!tabelas.length) throw new Error("Adicione ao menos uma tabela ao procedimento.");
    const atual = await this.buscarProcedimentoPorId(procedimentoId);
    const tabelasMantidas = new Set(tabelas.map((item) => item.id).filter(Boolean));

    for (const tabelaAtual of atual.tabelas || []) {
      if (!tabelasMantidas.has(tabelaAtual.id)) await this.removerTabela(tabelaAtual.id);
    }

    for (const [tabelaIndex, tabela] of tabelas.entries()) {
      validarTabela(tabela);
      const existente = (atual.tabelas || []).find((item) => item.id === tabela.id);
      const salva = existente
        ? await this.atualizarTabela(existente.id, { ...tabela, ordem: tabelaIndex })
        : await this.criarTabela(procedimentoId, { ...tabela, ordem: tabelaIndex });
      const pontosMantidos = new Set((tabela.pontos || []).map((item) => item.id).filter(Boolean));

      for (const pontoAtual of existente?.pontos || []) {
        if (!pontosMantidos.has(pontoAtual.id)) await this.removerPonto(pontoAtual.id);
      }
      for (const [pontoIndex, ponto] of (tabela.pontos || []).entries()) {
        const pontoExistente = existente?.pontos?.find((item) => item.id === ponto.id);
        if (pontoExistente) await this.atualizarPonto(pontoExistente.id, { ...ponto, ordem: pontoIndex });
        else await this.criarPonto(salva.id, { ...ponto, ordem: pontoIndex });
      }
    }
  },

  async duplicarProcedimento(id: string) {
    const original = await this.buscarProcedimentoPorId(id);
    const padroesValidos = await this.listarPadroesValidos();
    for (const tabela of original.tabelas || []) {
      const padrao = padroesValidos.find((item) => item.id === tabela.padrao_id);
      if (!padrao?.tabelas?.some((item) => item.id === tabela.padrao_tabela_id)) {
        throw new Error(
          `Atualize o padrao utilizado na tabela "${tabela.nome}" antes de duplicar o procedimento.`
        );
      }
    }
    const { data: versoes, error } = await supabase
      .from("calibracao_procedimentos")
      .select("versao")
      .eq("codigo", original.codigo)
      .order("versao", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const versao = ((versoes?.[0]?.versao as number | undefined) ?? original.versao) + 1;
    const copia = await this.criarProcedimento({
      codigo: original.codigo,
      nome: original.nome,
      tipoEquipamentoId: original.tipo_equipamento_id || "",
      metodoReferencia: original.metodo_referencia,
      observacoes: original.observacoes,
      versao,
    });
    await this.salvarTabelasProcedimento(
      copia.id,
      (original.tabelas || []).map((tabela) => ({
        nome: tabela.nome,
        grandeza: tabela.grandeza,
        unidade: tabela.unidade,
        modoPreenchimento: tabela.modo_preenchimento,
        quantidadeLeituras: tabela.quantidade_leituras,
        tipoMedida: tabela.tipo_medida,
        resolucaoPadraoDefault: tabela.resolucao_padrao_default,
        resolucaoEquipamentoDefault: tabela.resolucao_equipamento_default,
        faixaUsoMin: tabela.faixa_uso_min,
        faixaUsoMax: tabela.faixa_uso_max,
        capacidadeMin: tabela.capacidade_min,
        capacidadeMax: tabela.capacidade_max,
        fatorConfiabilidadeModo: tabela.fator_confiabilidade_modo,
        fatorKFixo: tabela.fator_k_fixo,
        incluirCriterioAceitacao: tabela.incluir_criterio_aceitacao,
        criterioAceitacaoTipo: tabela.criterio_aceitacao_tipo,
        criterioAceitacaoValorMaximo: tabela.criterio_aceitacao_valor_maximo,
        criterioAceitacaoValorMinimo: tabela.criterio_aceitacao_valor_minimo,
        corrigirErroSistematico: tabela.corrigir_erro_sistematico,
        padraoId: tabela.padrao_id || "",
        padraoTabelaId: tabela.padrao_tabela_id || "",
        pontos: (tabela.pontos || []).map((ponto) => ({
          valorNominal: ponto.valor_nominal,
        })),
      }))
    );
    return this.buscarProcedimentoPorId(copia.id);
  },

  async listarPadroesCompativeis(tabelaProcedimentoId: string) {
    const { data, error } = await supabase
      .from("calibracao_procedimento_padrao_compativel")
      .select("*")
      .eq("procedimento_tabela_id", tabelaProcedimentoId)
      .eq("ativo", true);
    if (error) throw new Error(error.message);
    return data as CalibracaoProcedimentoPadraoCompativel[];
  },

  async vincularPadraoCompativel(input: VincularCalibracaoProcedimentoPadraoInput) {
    if (!input.padraoId && !input.padraoTabelaId) throw new Error("Informe um padrao compativel.");
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("calibracao_procedimento_padrao_compativel")
      .insert({
        organizacao_id: organizacaoId,
        procedimento_tabela_id: input.procedimentoTabelaId,
        padrao_id: input.padraoId ?? null,
        padrao_tabela_id: input.padraoTabelaId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as CalibracaoProcedimentoPadraoCompativel;
  },

  async removerPadraoCompativel(id: string) {
    const { error } = await supabase.from("calibracao_procedimento_padrao_compativel").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

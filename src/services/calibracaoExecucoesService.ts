import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { calibracaoPadroesService } from "@/services/calibracaoPadroesService";
import type { CalibracaoProcedimento } from "@/services/calibracaoProcedimentosService";
import { calibracaoProcedimentosService } from "@/services/calibracaoProcedimentosService";
import {
  calcularResultadoGeralCalibracao,
  calcularPontoCalibracao,
  selecionarPontoPadraoReferencia,
  type ComponenteIncerteza,
  type RegraDecisao,
  type ResultadoConformidade,
} from "@/utils/calibracaoCalculos";
import {
  fimDoMesValidade,
  primeiroDiaMesValidade,
} from "@/utils/calibracaoValidade";
import {
  contarCasasDecimaisTexto,
  formatDecimalPtBr,
  maiorQuantidadeCasas,
} from "@/utils/numberUtils";
import { buildPdfFileName } from "@/utils/pdfFileNames";

const CERTIFICADOS_BUCKET = "calibracao-certificados";

export type CalibracaoExecucaoStatus =
  | "rascunho"
  | "em_execucao"
  | "fechada"
  | "cancelada";
export type CalibracaoExecucaoResultado =
  | "conforme"
  | "nao_conforme"
  | "sem_declaracao_conformidade";

export type CalibracaoExecucaoLeitura = {
  id: string;
  execucao_ponto_id: string;
  ordem: number;
  valor_medido: number;
  valor_medido_texto: string | null;
  casas_decimais: number | null;
};

export type CalibracaoExecucaoComponente = {
  id: string;
  execucao_ponto_id: string;
  nome: string;
  categoria: "tipo_a" | "tipo_b";
  distribuicao: string | null;
  valor_origem: number | null;
  divisor: number | null;
  coeficiente_sensibilidade: number;
  incerteza_padrao: number;
  graus_liberdade: number | null;
  graus_liberdade_infinito: boolean;
  origem: string | null;
  ordem: number;
};

export type CalibracaoExecucaoPonto = {
  id: string;
  execucao_tabela_id: string;
  procedimento_ponto_id: string | null;
  ordem: number;
  valor_nominal: number;
  valor_nominal_texto_snapshot: string | null;
  casas_decimais_valor_medido: number | null;
  media_valores_medidos: number | null;
  desvio_padrao_amostral: number | null;
  incerteza_tipo_a: number | null;
  tendencia_bruta: number | null;
  correcao_padrao: number | null;
  tendencia_corrigida: number | null;
  incerteza_padrao_certificado: number | null;
  incerteza_padrao_certificado_texto: string | null;
  incerteza_padrao_convertida: number | null;
  incerteza_resolucao_equipamento: number | null;
  incerteza_resolucao_padrao: number | null;
  incerteza_combinada: number | null;
  graus_liberdade_efetivos_veff: number | null;
  veff_infinito: boolean;
  fator_abrangencia_k: number | null;
  incerteza_expandida: number | null;
  incerteza_expandida_calculada: number | null;
  incerteza_expandida_reportada: number | null;
  casas_decimais_incerteza: number | null;
  criterio_aceitacao_valor: number | null;
  resultado_conformidade: ResultadoConformidade | null;
  observacoes: string | null;
  calculado_em: string | null;
  leituras?: CalibracaoExecucaoLeitura[];
  componentes?: CalibracaoExecucaoComponente[];
};

export type CalibracaoExecucaoTabela = {
  id: string;
  execucao_id: string;
  procedimento_tabela_id: string | null;
  nome_snapshot: string;
  grandeza_snapshot: string;
  unidade_snapshot: string;
  quantidade_leituras_snapshot: number;
  padrao_id: string | null;
  padrao_tabela_id: string | null;
  padrao_nome_snapshot: string | null;
  padrao_numero_certificado_snapshot: string | null;
  padrao_validade_snapshot: string | null;
  padrao_identificacao_snapshot: string | null;
  padrao_laboratorio_snapshot: string | null;
  resolucao_padrao_snapshot: number | null;
  resolucao_equipamento_snapshot: number | null;
  resolucao_equipamento_texto_snapshot: string | null;
  fator_confiabilidade_modo_snapshot:
    | "calcular_95"
    | "k_fixo"
    | "manual_execucao";
  fator_k_fixo_snapshot: number | null;
  incluir_criterio_aceitacao_snapshot: boolean;
  criterio_aceitacao_tipo_snapshot: "absoluto" | "percentual" | "faixa" | null;
  criterio_aceitacao_valor_maximo_snapshot: number | null;
  criterio_aceitacao_valor_minimo_snapshot: number | null;
  regra_decisao_snapshot: RegraDecisao | null;
  corrigir_erro_sistematico_snapshot: boolean;
  ordem: number;
  pontos?: CalibracaoExecucaoPonto[];
};

export type CalibracaoExecucao = {
  id: string;
  organizacao_id: string;
  numero_certificado: number;
  empresa_id: string;
  equipamento_id: string;
  procedimento_id: string;
  procedimento_nome_snapshot: string;
  procedimento_versao_snapshot: number;
  norma_utilizada_snapshot: string | null;
  local_calibracao: string | null;
  temperatura_ambiente: number | null;
  incerteza_temperatura: number | null;
  unidade_temperatura: string | null;
  umidade_relativa: number | null;
  incerteza_umidade: number | null;
  unidade_umidade: string | null;
  pressao_atmosferica: number | null;
  incerteza_pressao: number | null;
  unidade_pressao: string | null;
  observacoes: string | null;
  data_calibracao: string;
  data_emissao: string;
  data_validade: string | null;
  validade_mes: string | null;
  validade_meses: number;
  tecnico_executor_nome: string;
  tecnico_executor_registro: string | null;
  responsavel_tecnico_nome: string;
  responsavel_tecnico_registro: string | null;
  responsavel_solicitante: string | null;
  status: CalibracaoExecucaoStatus;
  numero_revisao: number;
  atualizado_apos_finalizacao: boolean;
  criterio_conformidade_aplicado: boolean;
  regra_decisao: RegraDecisao | null;
  resultado_geral: CalibracaoExecucaoResultado | null;
  os_id: string | null;
  pdf_storage_path: string | null;
  pdf_hash: string | null;
  fechado_em: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  equipamento?: EquipamentoSupabase | null;
  tabelas?: CalibracaoExecucaoTabela[];
};

export type CalibracaoExecucoesSortField =
  | "numero_certificado"
  | "cliente"
  | "equipamento"
  | "data_calibracao"
  | "vencimento";

export type ListarCalibracaoExecucoesFiltros = {
  termo?: string;
  empresaId?: string;
  tipoEquipamentoId?: string;
  resultado?: string;
  dataDe?: string;
  dataAte?: string;
  validadeDe?: string;
  validadeAte?: string;
  page: number;
  limit: number;
  sortBy?: CalibracaoExecucoesSortField;
  ascending?: boolean;
};

export type CalibracaoExecucoesPaginadoResult = {
  items: CalibracaoExecucao[];
  total: number;
};

export type CalibracaoExecucoesFiltrosOpcoes = {
  empresas: Array<{ id: string; nome: string }>;
  tiposEquipamento: Array<{ id: string; nome: string }>;
};

type CalibracaoExecucaoResumoRpcRow = {
  item: CalibracaoExecucao;
  total_count: number | string;
};

export type CalibracaoExecucaoPontoInput = {
  procedimentoPontoId?: string | null;
  valorNominal: number;
  valorNominalTexto?: string | null;
  leituras: Array<{
    valor: number | null;
    valorTexto: string;
  }>;
  observacoes?: string | null;
  outrasComponentes?: ComponenteIncerteza[];
};

export type CalibracaoExecucaoTabelaInput = {
  procedimentoTabelaId?: string | null;
  nome: string;
  grandeza: string;
  unidade: string;
  quantidadeLeituras: number;
  padraoId: string;
  padraoTabelaId: string;
  resolucaoPadrao?: number | null;
  resolucaoEquipamento?: number | null;
  resolucaoEquipamentoTexto?: string | null;
  fatorModo: "calcular_95" | "k_fixo" | "manual_execucao";
  fatorK?: number | null;
  incluirCriterio: boolean;
  criterioTipo?: "absoluto" | "percentual" | "faixa" | null;
  criterioValorMaximo?: number | null;
  criterioValorMinimo?: number | null;
  regraDecisao?: RegraDecisao | null;
  corrigirErroSistematico: boolean;
  pontos: CalibracaoExecucaoPontoInput[];
};

export type CalibracaoExecucaoFormInput = {
  empresaId: string;
  equipamentoId: string;
  procedimentoId: string;
  localCalibracao?: string | null;
  temperaturaAmbiente?: number | null;
  incertezaTemperatura?: number | null;
  umidadeRelativa?: number | null;
  incertezaUmidade?: number | null;
  pressaoAtmosferica?: number | null;
  incertezaPressao?: number | null;
  observacoes?: string | null;
  dataCalibracao: string;
  dataEmissao: string;
  validadeMes: string;
  tecnicoExecutorNome: string;
  tecnicoExecutorRegistro?: string | null;
  responsavelTecnicoNome: string;
  responsavelTecnicoRegistro?: string | null;
  responsavelSolicitante?: string | null;
  criterioConformidadeAplicado: boolean;
  tabelas: CalibracaoExecucaoTabelaInput[];
};

export type CalibracaoExecucaoRevisao = {
  id: string;
  organizacao_id: string;
  execucao_id: string;
  numero_revisao: number;
  motivo: string | null;
  snapshot_json: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
};

type GerarPdfCalibracao = (execucao: CalibracaoExecucao) => Promise<Blob>;

const selectLeitura = `
  id, execucao_ponto_id, ordem, valor_medido, valor_medido_texto, casas_decimais
`;
const selectComponente = `
  id, execucao_ponto_id, nome, categoria, distribuicao, valor_origem, divisor,
  coeficiente_sensibilidade, incerteza_padrao, graus_liberdade,
  graus_liberdade_infinito, origem, ordem
`;
const selectPonto = `
  id, execucao_tabela_id, procedimento_ponto_id, ordem, valor_nominal,
  valor_nominal_texto_snapshot, casas_decimais_valor_medido,
  media_valores_medidos, desvio_padrao_amostral, incerteza_tipo_a,
  tendencia_bruta, correcao_padrao, tendencia_corrigida,
  incerteza_padrao_certificado, incerteza_padrao_certificado_texto,
  incerteza_padrao_convertida,
  incerteza_resolucao_equipamento, incerteza_resolucao_padrao,
  incerteza_combinada, graus_liberdade_efetivos_veff, veff_infinito,
  fator_abrangencia_k, incerteza_expandida, incerteza_expandida_calculada,
  incerteza_expandida_reportada, casas_decimais_incerteza, criterio_aceitacao_valor,
  resultado_conformidade, observacoes, calculado_em,
  leituras:calibracao_execucao_leituras (${selectLeitura}),
  componentes:calibracao_execucao_componentes_incerteza (${selectComponente})
`;
const selectTabela = `
  id, execucao_id, procedimento_tabela_id, nome_snapshot, grandeza_snapshot,
  unidade_snapshot, quantidade_leituras_snapshot, padrao_id, padrao_tabela_id,
  padrao_nome_snapshot, padrao_numero_certificado_snapshot, padrao_validade_snapshot,
  padrao_identificacao_snapshot, padrao_laboratorio_snapshot, resolucao_padrao_snapshot,
  resolucao_equipamento_snapshot, resolucao_equipamento_texto_snapshot,
  fator_confiabilidade_modo_snapshot,
  fator_k_fixo_snapshot, incluir_criterio_aceitacao_snapshot,
  criterio_aceitacao_tipo_snapshot, criterio_aceitacao_valor_maximo_snapshot,
  criterio_aceitacao_valor_minimo_snapshot, regra_decisao_snapshot,
  corrigir_erro_sistematico_snapshot,
  ordem, pontos:calibracao_execucao_pontos (${selectPonto})
`;
const selectExecucao = `
  id, organizacao_id, numero_certificado, empresa_id, equipamento_id, procedimento_id,
  procedimento_nome_snapshot, procedimento_versao_snapshot, norma_utilizada_snapshot,
  local_calibracao, temperatura_ambiente, incerteza_temperatura, unidade_temperatura,
  umidade_relativa, incerteza_umidade, unidade_umidade, pressao_atmosferica,
  incerteza_pressao, unidade_pressao, observacoes, data_calibracao, data_emissao,
  data_validade, validade_mes, validade_meses, tecnico_executor_nome, tecnico_executor_registro,
  responsavel_tecnico_nome, responsavel_tecnico_registro, responsavel_solicitante,
  status, numero_revisao, atualizado_apos_finalizacao,
  criterio_conformidade_aplicado, regra_decisao, resultado_geral, os_id,
  pdf_storage_path, pdf_hash, fechado_em, ativo, created_at, updated_at,
  empresa:empresas (*),
  equipamento:equipamentos (*, tipo_equipamento:tipos_equipamento (id, nome)),
  tabelas:calibracao_execucao_tabelas (${selectTabela})
`;

const trimOrNull = (value?: string | null) => value?.trim() || null;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao.");
  return data as string;
};

const normalizeExecucao = (execucao: CalibracaoExecucao) => ({
  ...execucao,
  tabelas: [...(execucao.tabelas || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((tabela) => ({
      ...tabela,
      pontos: [...(tabela.pontos || [])]
        .sort((a, b) => a.ordem - b.ordem)
        .map((ponto) => ({
          ...ponto,
          leituras: [...(ponto.leituras || [])].sort((a, b) => a.ordem - b.ordem),
          componentes: [...(ponto.componentes || [])].sort((a, b) => a.ordem - b.ordem),
        })),
    })),
});

const validarCabecalho = (input: CalibracaoExecucaoFormInput) => {
  if (!input.empresaId) throw new Error("Selecione a empresa.");
  if (!input.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!input.procedimentoId) throw new Error("Selecione o procedimento.");
  if (!input.dataCalibracao) throw new Error("Informe a data da calibracao.");
  if (!input.dataEmissao) throw new Error("Informe a data de emissao.");
  if (!input.validadeMes) throw new Error("Informe a validade.");
  if (!input.tecnicoExecutorNome.trim()) throw new Error("Informe o tecnico executor.");
  if (!input.responsavelTecnicoNome.trim()) throw new Error("Informe o responsavel tecnico.");
  if ((fimDoMesValidade(input.validadeMes) || "") < input.dataCalibracao) {
    throw new Error("A validade nao pode ser anterior a data da calibracao.");
  }
  if (!input.tabelas.length) throw new Error("Adicione ao menos uma tabela.");
};

const possuiCriterioAceitacao = (input: CalibracaoExecucaoFormInput) =>
  input.tabelas.some((tabela) => tabela.incluirCriterio);

const obterRegraDecisaoGeral = (input: CalibracaoExecucaoFormInput) => {
  if (!possuiCriterioAceitacao(input)) return null;
  return input.tabelas.find((tabela) => tabela.incluirCriterio)?.regraDecisao ?? null;
};

const getPadraoIdentificacao = (padrao: {
  tag?: string | null;
  numero_serie?: string | null;
  patrimonio?: string | null;
}) => padrao.tag || padrao.numero_serie || padrao.patrimonio || null;

const criarPayloadExecucao = (
  input: CalibracaoExecucaoFormInput,
  procedimento: CalibracaoProcedimento
) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId,
  procedimento_id: procedimento.id,
  procedimento_nome_snapshot: procedimento.nome,
  procedimento_versao_snapshot: procedimento.versao,
  norma_utilizada_snapshot: trimOrNull(procedimento.metodo_referencia),
  local_calibracao: trimOrNull(input.localCalibracao),
  temperatura_ambiente: input.temperaturaAmbiente ?? null,
  incerteza_temperatura: input.incertezaTemperatura ?? null,
  unidade_temperatura: "°C",
  umidade_relativa: input.umidadeRelativa ?? null,
  incerteza_umidade: input.incertezaUmidade ?? null,
  unidade_umidade: "%",
  pressao_atmosferica: input.pressaoAtmosferica ?? null,
  incerteza_pressao: input.incertezaPressao ?? null,
  unidade_pressao: "kPa",
  observacoes: trimOrNull(input.observacoes),
  data_calibracao: input.dataCalibracao,
  data_emissao: input.dataEmissao,
  data_validade: fimDoMesValidade(input.validadeMes),
  validade_mes: primeiroDiaMesValidade(input.validadeMes),
  validade_meses: 12,
  tecnico_executor_nome: input.tecnicoExecutorNome.trim(),
  tecnico_executor_registro: trimOrNull(input.tecnicoExecutorRegistro),
  responsavel_tecnico_nome: input.responsavelTecnicoNome.trim(),
  responsavel_tecnico_registro: trimOrNull(input.responsavelTecnicoRegistro),
  responsavel_solicitante: trimOrNull(input.responsavelSolicitante),
  criterio_conformidade_aplicado: possuiCriterioAceitacao(input),
  regra_decisao: obterRegraDecisaoGeral(input),
});

export const criarTabelasExecucaoDoProcedimento = (
  procedimento: CalibracaoProcedimento,
  clienteUsaCriterio: boolean
): CalibracaoExecucaoTabelaInput[] =>
  (procedimento.tabelas || []).map((tabela) => ({
    procedimentoTabelaId: tabela.id,
    nome: tabela.nome,
    grandeza: tabela.grandeza,
    unidade: tabela.unidade,
    quantidadeLeituras: tabela.quantidade_leituras,
    padraoId: tabela.padrao_id || "",
    padraoTabelaId: tabela.padrao_tabela_id || "",
    resolucaoPadrao: tabela.resolucao_padrao_default,
    resolucaoEquipamento: tabela.resolucao_equipamento_default,
    resolucaoEquipamentoTexto:
      tabela.resolucao_equipamento_default == null
        ? null
        : formatDecimalPtBr(tabela.resolucao_equipamento_default),
    fatorModo: tabela.fator_confiabilidade_modo,
    fatorK: tabela.fator_k_fixo,
    incluirCriterio: clienteUsaCriterio,
    criterioTipo: tabela.criterio_aceitacao_tipo,
    criterioValorMaximo: tabela.criterio_aceitacao_valor_maximo,
    criterioValorMinimo: tabela.criterio_aceitacao_valor_minimo,
    regraDecisao: "considerando_incerteza",
    corrigirErroSistematico: tabela.corrigir_erro_sistematico,
    pontos: (tabela.pontos || []).map((ponto) => ({
      procedimentoPontoId: ponto.id,
      valorNominal: ponto.valor_nominal,
      valorNominalTexto:
        ponto.valor_nominal_texto || formatDecimalPtBr(ponto.valor_nominal),
      leituras: Array.from({ length: tabela.quantidade_leituras }, () => ({
        valor: null,
        valorTexto: "",
      })),
    })),
  }));

export const criarTabelasInputDaExecucao = (
  execucao: CalibracaoExecucao
): CalibracaoExecucaoTabelaInput[] =>
  (execucao.tabelas || []).map((tabela) => ({
    procedimentoTabelaId: tabela.procedimento_tabela_id,
    nome: tabela.nome_snapshot,
    grandeza: tabela.grandeza_snapshot,
    unidade: tabela.unidade_snapshot,
    quantidadeLeituras: tabela.quantidade_leituras_snapshot,
    padraoId: tabela.padrao_id || "",
    padraoTabelaId: tabela.padrao_tabela_id || "",
    resolucaoPadrao: tabela.resolucao_padrao_snapshot,
    resolucaoEquipamento: tabela.resolucao_equipamento_snapshot,
    resolucaoEquipamentoTexto:
      tabela.resolucao_equipamento_texto_snapshot ||
      (tabela.resolucao_equipamento_snapshot == null
        ? null
        : formatDecimalPtBr(tabela.resolucao_equipamento_snapshot)),
    fatorModo: tabela.fator_confiabilidade_modo_snapshot,
    fatorK: tabela.fator_k_fixo_snapshot,
    incluirCriterio: tabela.incluir_criterio_aceitacao_snapshot,
    criterioTipo: tabela.criterio_aceitacao_tipo_snapshot,
    criterioValorMaximo: tabela.criterio_aceitacao_valor_maximo_snapshot,
    criterioValorMinimo: tabela.criterio_aceitacao_valor_minimo_snapshot,
    regraDecisao: tabela.regra_decisao_snapshot || "considerando_incerteza",
    corrigirErroSistematico: tabela.corrigir_erro_sistematico_snapshot,
    pontos: (tabela.pontos || []).map((ponto) => ({
      procedimentoPontoId: ponto.procedimento_ponto_id,
      valorNominal: ponto.valor_nominal,
      valorNominalTexto:
        ponto.valor_nominal_texto_snapshot || formatDecimalPtBr(ponto.valor_nominal),
      leituras: Array.from({ length: tabela.quantidade_leituras_snapshot }, (_, index) => {
        const leitura = ponto.leituras?.find((item) => item.ordem === index + 1);
        return {
          valor: leitura?.valor_medido ?? null,
          valorTexto:
            leitura?.valor_medido_texto ??
            formatDecimalPtBr(leitura?.valor_medido),
        };
      }),
      observacoes: ponto.observacoes,
      outrasComponentes: (ponto.componentes || [])
        .filter((componente) => !["Repetibilidade", "Certificado do padrao", "Resolucao do equipamento", "Resolucao do padrao"].includes(componente.nome))
        .map((componente) => ({
          nome: componente.nome,
          categoria: componente.categoria,
          distribuicao: componente.distribuicao as ComponenteIncerteza["distribuicao"],
          valorOrigem: componente.valor_origem,
          divisor: componente.divisor,
          coeficienteSensibilidade: componente.coeficiente_sensibilidade,
          incertezaPadrao: componente.incerteza_padrao,
          grausLiberdade: componente.graus_liberdade,
          infinito: componente.graus_liberdade_infinito,
          origem: componente.origem,
        })),
    })),
  }));

const criarInputDaExecucao = (
  execucao: CalibracaoExecucao
): CalibracaoExecucaoFormInput => ({
  empresaId: execucao.empresa_id,
  equipamentoId: execucao.equipamento_id,
  procedimentoId: execucao.procedimento_id,
  localCalibracao: execucao.local_calibracao,
  temperaturaAmbiente: execucao.temperatura_ambiente,
  incertezaTemperatura: execucao.incerteza_temperatura,
  umidadeRelativa: execucao.umidade_relativa,
  incertezaUmidade: execucao.incerteza_umidade,
  pressaoAtmosferica: execucao.pressao_atmosferica,
  incertezaPressao: execucao.incerteza_pressao,
  observacoes: execucao.observacoes,
  dataCalibracao: execucao.data_calibracao,
  dataEmissao: execucao.data_emissao,
  validadeMes: (execucao.validade_mes || execucao.data_validade || "").slice(0, 7),
  tecnicoExecutorNome: execucao.tecnico_executor_nome,
  tecnicoExecutorRegistro: execucao.tecnico_executor_registro,
  responsavelTecnicoNome: execucao.responsavel_tecnico_nome,
  responsavelTecnicoRegistro: execucao.responsavel_tecnico_registro,
  responsavelSolicitante: execucao.responsavel_solicitante,
  criterioConformidadeAplicado: execucao.criterio_conformidade_aplicado,
  tabelas: criarTabelasInputDaExecucao(execucao),
});

const sincronizarMetadadosProcedimentoNoInput = (
  input: CalibracaoExecucaoFormInput,
  procedimento: CalibracaoProcedimento
): CalibracaoExecucaoFormInput => {
  const tabelasProcedimento = new Map(
    (procedimento.tabelas || []).map((tabela) => [tabela.id, tabela])
  );

  return {
    ...input,
    tabelas: input.tabelas.map((tabela) => {
      const tabelaAtual = tabela.procedimentoTabelaId
        ? tabelasProcedimento.get(tabela.procedimentoTabelaId)
        : undefined;

      if (!tabelaAtual) return tabela;

      const pontosAtuais = new Map(
        (tabelaAtual.pontos || []).map((ponto) => [ponto.id, ponto])
      );

      return {
        ...tabela,
        nome: tabelaAtual.nome,
        grandeza: tabelaAtual.grandeza,
        unidade: tabelaAtual.unidade,
        pontos: tabela.pontos.map((ponto) => {
          const pontoAtual = ponto.procedimentoPontoId
            ? pontosAtuais.get(ponto.procedimentoPontoId)
            : undefined;

          if (!pontoAtual) return ponto;

          return {
            ...ponto,
            valorNominal: pontoAtual.valor_nominal,
            valorNominalTexto:
              pontoAtual.valor_nominal_texto ||
              formatDecimalPtBr(pontoAtual.valor_nominal),
          };
        }),
      };
    }),
  };
};

const montarSnapshot = async (
  input: CalibracaoExecucaoFormInput,
  organizacaoId: string
) => {
  const padroes = new Map<string, Awaited<ReturnType<typeof calibracaoPadroesService.buscarPadraoPorId>>>();
  const tabelas = [];
  const resultados: Array<ResultadoConformidade | null> = [];

  for (const [tabelaIndex, tabela] of input.tabelas.entries()) {
    if (tabela.incluirCriterio && !tabela.criterioTipo) {
      throw new Error(`Selecione o tipo de criterio da tabela "${tabela.nome}".`);
    }
    if (tabela.incluirCriterio && tabela.criterioValorMaximo == null) {
      throw new Error(`Informe o valor maximo do criterio da tabela "${tabela.nome}".`);
    }
    if (
      tabela.incluirCriterio &&
      tabela.criterioTipo === "faixa" &&
      tabela.criterioValorMinimo == null
    ) {
      throw new Error(`Informe o valor minimo do criterio da tabela "${tabela.nome}".`);
    }
    if (tabela.incluirCriterio && !tabela.regraDecisao) {
      throw new Error(`Selecione a regra de decisao da tabela "${tabela.nome}".`);
    }
    if (!tabela.padraoId || !tabela.padraoTabelaId) {
      throw new Error(`Selecione o padrao utilizado na tabela "${tabela.nome}".`);
    }
    let padrao = padroes.get(tabela.padraoId);
    if (!padrao) {
      padrao = await calibracaoPadroesService.buscarPadraoPorId(tabela.padraoId);
      padroes.set(tabela.padraoId, padrao);
    }
    if (!padrao.ativo || padrao.data_validade < input.dataCalibracao) {
      throw new Error(`O padrao "${padrao.nome_padrao}" nao esta valido na data da calibracao.`);
    }
    const tabelaPadrao = padrao.tabelas?.find((item) => item.id === tabela.padraoTabelaId && item.ativo);
    if (!tabelaPadrao) throw new Error(`Tabela metrologica invalida em "${tabela.nome}".`);
    if (!tabela.pontos.length) throw new Error(`Adicione pontos na tabela "${tabela.nome}".`);

    const pontos = tabela.pontos.map((ponto, pontoIndex) => {
      const pontoPadrao = selecionarPontoPadraoReferencia(
        ponto.valorNominal,
        (tabelaPadrao.pontos || []).map((item) => ({
          valorNominal: item.valor_nominal,
          valorNominalTexto: item.valor_nominal_texto,
          tendencia: item.tendencia,
          incertezaExpandida: item.incerteza_expandida,
          incertezaExpandidaTexto: item.incerteza_expandida_texto,
          fatorAbrangenciaK: item.fator_abrangencia_k,
          grausLiberdade: item.graus_liberdade_efetivos_veff,
          veffInfinito: item.veff_infinito,
        }))
      );
      if (!pontoPadrao) {
        throw new Error(`Nao foi encontrado ponto de referencia no padrao para a tabela "${tabela.nome}".`);
      }

      const leiturasPreenchidas = ponto.leituras.flatMap((leitura) =>
        leitura.valor === null ? [] : [leitura.valor]
      );
      const completo =
        ponto.leituras.length === tabela.quantidadeLeituras &&
        leiturasPreenchidas.length === tabela.quantidadeLeituras;
      const calculo = completo
        ? calcularPontoCalibracao({
            valorNominal: ponto.valorNominal,
            leituras: leiturasPreenchidas,
            pontoPadrao,
            resolucaoEquipamento: tabela.resolucaoEquipamento,
            resolucaoPadrao: tabela.resolucaoPadrao,
            corrigirErroSistematico: tabela.corrigirErroSistematico,
            fatorModo: tabela.fatorModo,
            fatorK: tabela.fatorK,
            criterio: {
              aplicar: tabela.incluirCriterio,
              tipo: tabela.criterioTipo,
              valorMaximo: tabela.criterioValorMaximo,
              valorMinimo: tabela.criterioValorMinimo,
              regraDecisao: tabela.regraDecisao,
            },
            outrasComponentes: ponto.outrasComponentes,
          })
        : null;
      resultados.push(calculo?.resultadoConformidade ?? null);

      return {
        organizacao_id: organizacaoId,
        procedimento_ponto_id: ponto.procedimentoPontoId || null,
        ordem: pontoIndex,
        valor_nominal: ponto.valorNominal,
        valor_nominal_texto_snapshot:
          ponto.valorNominalTexto ??
          pontoPadrao.valorNominalTexto ??
          formatDecimalPtBr(pontoPadrao.valorNominal),
        casas_decimais_valor_medido: maiorQuantidadeCasas(
          ponto.leituras.map((leitura) => leitura.valorTexto)
        ),
        media_valores_medidos: calculo?.media ?? null,
        desvio_padrao_amostral: calculo?.desvioPadrao ?? null,
        incerteza_tipo_a: calculo?.uTipoA ?? null,
        tendencia_bruta: calculo?.tendenciaBruta ?? null,
        correcao_padrao: calculo?.correcaoPadrao ?? null,
        tendencia_corrigida: calculo?.tendenciaCorrigida ?? null,
        incerteza_padrao_certificado: pontoPadrao.incertezaExpandida ?? null,
        incerteza_padrao_certificado_texto: pontoPadrao.incertezaExpandidaTexto ?? null,
        incerteza_padrao_convertida: calculo?.uPadrao ?? null,
        incerteza_resolucao_equipamento: calculo?.uResolucaoEquipamento ?? null,
        incerteza_resolucao_padrao: calculo?.uResolucaoPadrao ?? null,
        incerteza_combinada: calculo?.uc ?? null,
        graus_liberdade_efetivos_veff: calculo?.veffInfinito ? null : calculo?.veff ?? null,
        veff_infinito: calculo?.veffInfinito ?? false,
        fator_abrangencia_k: calculo?.fatorK ?? null,
        incerteza_expandida: calculo?.incertezaExpandidaReportada ?? null,
        incerteza_expandida_calculada: calculo?.incertezaExpandidaCalculada ?? null,
        incerteza_expandida_reportada: calculo?.incertezaExpandidaReportada ?? null,
        casas_decimais_incerteza: calculo?.casasDecimaisIncerteza ?? null,
        criterio_aceitacao_valor: calculo?.criterioAceitacaoValor ?? null,
        resultado_conformidade: calculo?.resultadoConformidade ?? null,
        observacoes: trimOrNull(ponto.observacoes),
        calculado_em: calculo ? new Date().toISOString() : null,
        leituras: ponto.leituras.flatMap((leitura, index) =>
          leitura.valor === null
            ? []
            : [{
                organizacao_id: organizacaoId,
                ordem: index + 1,
                valor_medido: leitura.valor,
                valor_medido_texto: leitura.valorTexto.trim(),
                casas_decimais: contarCasasDecimaisTexto(leitura.valorTexto),
              }]
        ),
        componentes: (calculo?.componentes || ponto.outrasComponentes || []).map((componente, index) => ({
          organizacao_id: organizacaoId,
          nome: componente.nome,
          categoria: componente.categoria,
          distribuicao: componente.distribuicao ?? null,
          valor_origem: componente.valorOrigem ?? null,
          divisor: componente.divisor ?? null,
          coeficiente_sensibilidade: componente.coeficienteSensibilidade ?? 1,
          incerteza_padrao: componente.incertezaPadrao,
          graus_liberdade: componente.grausLiberdade ?? null,
          graus_liberdade_infinito: componente.infinito ?? false,
          origem: componente.origem ?? null,
          ordem: index,
        })),
      };
    });

    tabelas.push({
      organizacao_id: organizacaoId,
      procedimento_tabela_id: tabela.procedimentoTabelaId || null,
      nome_snapshot: tabela.nome.trim(),
      grandeza_snapshot: tabela.grandeza.trim(),
      unidade_snapshot: tabela.unidade.trim(),
      quantidade_leituras_snapshot: tabela.quantidadeLeituras,
      padrao_id: padrao.id,
      padrao_tabela_id: tabelaPadrao.id,
      padrao_nome_snapshot: padrao.nome_padrao,
      padrao_numero_certificado_snapshot: padrao.numero_certificado,
      padrao_validade_snapshot: padrao.data_validade,
      padrao_identificacao_snapshot: getPadraoIdentificacao(padrao),
      padrao_laboratorio_snapshot: padrao.laboratorio_calibrador,
      resolucao_padrao_snapshot: tabela.resolucaoPadrao ?? null,
      resolucao_equipamento_snapshot: tabela.resolucaoEquipamento ?? null,
      resolucao_equipamento_texto_snapshot:
        trimOrNull(tabela.resolucaoEquipamentoTexto) ??
        (tabela.resolucaoEquipamento == null
          ? null
          : formatDecimalPtBr(tabela.resolucaoEquipamento)),
      fator_confiabilidade_modo_snapshot: tabela.fatorModo,
      fator_k_fixo_snapshot: tabela.fatorK ?? null,
      incluir_criterio_aceitacao_snapshot: tabela.incluirCriterio,
      criterio_aceitacao_tipo_snapshot: tabela.incluirCriterio ? tabela.criterioTipo ?? null : null,
      criterio_aceitacao_valor_maximo_snapshot: tabela.incluirCriterio ? tabela.criterioValorMaximo ?? null : null,
      criterio_aceitacao_valor_minimo_snapshot: tabela.incluirCriterio ? tabela.criterioValorMinimo ?? null : null,
      regra_decisao_snapshot: tabela.incluirCriterio ? tabela.regraDecisao ?? null : null,
      corrigir_erro_sistematico_snapshot: tabela.corrigirErroSistematico,
      ordem: tabelaIndex,
      pontos,
    });
  }

  return { tabelas, resultadoGeral: calcularResultadoGeralCalibracao(resultados) };
};

const salvarSnapshot = async (
  execucaoId: string,
  tabelas: Awaited<ReturnType<typeof montarSnapshot>>["tabelas"]
) => {
  const { error: deleteError } = await supabase
    .from("calibracao_execucao_tabelas")
    .delete()
    .eq("execucao_id", execucaoId);
  if (deleteError) throw new Error(deleteError.message);

  for (const tabela of tabelas) {
    const { pontos, ...payloadTabela } = tabela;
    const { data: tabelaSalva, error: tabelaError } = await supabase
      .from("calibracao_execucao_tabelas")
      .insert({ execucao_id: execucaoId, ...payloadTabela })
      .select("id")
      .single();
    if (tabelaError) throw new Error(tabelaError.message);

    for (const ponto of pontos) {
      const { leituras, componentes, ...payloadPonto } = ponto;
      const { data: pontoSalvo, error: pontoError } = await supabase
        .from("calibracao_execucao_pontos")
        .insert({ execucao_tabela_id: tabelaSalva.id, ...payloadPonto })
        .select("id")
        .single();
      if (pontoError) throw new Error(pontoError.message);

      if (leituras.length) {
        const { error } = await supabase
          .from("calibracao_execucao_leituras")
          .insert(leituras.map((leitura) => ({ execucao_ponto_id: pontoSalvo.id, ...leitura })));
        if (error) throw new Error(error.message);
      }
      if (componentes.length) {
        const { error } = await supabase
          .from("calibracao_execucao_componentes_incerteza")
          .insert(componentes.map((componente) => ({ execucao_ponto_id: pontoSalvo.id, ...componente })));
        if (error) throw new Error(error.message);
      }
    }
  }
};

const gerarHashSha256 = async (blob: Blob) => {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const validarFechamento = (execucao: CalibracaoExecucao) => {
  if (["fechada", "cancelada"].includes(execucao.status)) {
    throw new Error("Execucoes fechadas ou canceladas nao podem ser finalizadas.");
  }
  if (!execucao.tabelas?.length) throw new Error("A calibracao nao possui tabelas.");
  for (const tabela of execucao.tabelas) {
    if (!tabela.padrao_id || !tabela.padrao_tabela_id) throw new Error(`Selecione o padrao da tabela "${tabela.nome_snapshot}".`);
    if (!tabela.padrao_validade_snapshot || tabela.padrao_validade_snapshot < execucao.data_calibracao) {
      throw new Error(`O padrao da tabela "${tabela.nome_snapshot}" nao estava valido na data da calibracao.`);
    }
    if (!tabela.pontos?.length) throw new Error(`A tabela "${tabela.nome_snapshot}" nao possui pontos.`);
    if (
      tabela.incluir_criterio_aceitacao_snapshot &&
      (!tabela.criterio_aceitacao_tipo_snapshot ||
        tabela.criterio_aceitacao_valor_maximo_snapshot == null ||
        !tabela.regra_decisao_snapshot ||
        (tabela.criterio_aceitacao_tipo_snapshot === "faixa" &&
          tabela.criterio_aceitacao_valor_minimo_snapshot == null))
    ) {
      throw new Error(`Complete o criterio de aceitacao da tabela "${tabela.nome_snapshot}".`);
    }
    for (const ponto of tabela.pontos) {
      if ((ponto.leituras || []).length !== tabela.quantidade_leituras_snapshot) {
        throw new Error(`Preencha todas as leituras do ponto ${ponto.valor_nominal} ${tabela.unidade_snapshot}.`);
      }
      if (ponto.incerteza_expandida == null || ponto.fator_abrangencia_k == null) {
        throw new Error(`Calcule o ponto ${ponto.valor_nominal} ${tabela.unidade_snapshot}.`);
      }
      if (
        tabela.incluir_criterio_aceitacao_snapshot &&
        !["conforme", "nao_conforme"].includes(ponto.resultado_conformidade || "")
      ) {
        throw new Error(`Avalie a conformidade do ponto ${ponto.valor_nominal} ${tabela.unidade_snapshot}.`);
      }
    }
  }
  if (!execucao.resultado_geral) throw new Error("Calcule o resultado geral antes de finalizar.");
};

export const formatNumeroCertificadoCalibracao = (numero?: number | null) =>
  numero ? `CAL-${String(numero).padStart(6, "0")}` : "CAL-PENDENTE";

export const formatNomeArquivoCertificadoCalibracao = (
  execucao: Pick<CalibracaoExecucao, "numero_certificado" | "numero_revisao">
) => {
  const revisao = execucao.numero_revisao > 0
    ? `-R${String(execucao.numero_revisao).padStart(3, "0")}`
    : "";
  return `${formatNumeroCertificadoCalibracao(execucao.numero_certificado)}${revisao}.pdf`;
};

export const formatNomeDownloadCertificadoCalibracao = (
  execucao: Pick<
    CalibracaoExecucao,
    "numero_certificado" | "numero_revisao" | "empresa" | "equipamento"
  >
) => {
  const numero = formatNomeArquivoCertificadoCalibracao(execucao)
    .replace(/\.pdf$/i, "")
    .replace(/^CAL-?/i, "");
  const cliente = execucao.empresa?.nome || execucao.empresa?.nome_fantasia;
  const equipamento =
    execucao.equipamento?.tipo_equipamento?.nome ||
    execucao.equipamento?.tipo_texto ||
    execucao.equipamento?.modelo;

  return buildPdfFileName("CAL", [
    { value: numero, fallback: "sem-numero" },
    { value: cliente, fallback: "cliente" },
    { value: equipamento, fallback: "equipamento" },
    { value: execucao.equipamento?.numero_serie, fallback: "sem-ns" },
  ]);
};

export const calibracaoExecucoesService = {
  async listarExecucoes() {
    const { data, error } = await supabase
      .from("calibracao_execucoes")
      .select(selectExecucao)
      .eq("ativo", true)
      .order("data_calibracao", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as unknown as CalibracaoExecucao[]).map(normalizeExecucao);
  },

  async listarExecucoesPaginadas(
    filtros: ListarCalibracaoExecucoesFiltros
  ): Promise<CalibracaoExecucoesPaginadoResult> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.max(1, filtros.limit || 25);
    const { data, error } = await supabase.rpc(
      "listar_calibracoes_execucoes_resumo",
      {
        p_termo: filtros.termo || null,
        p_empresa_id: filtros.empresaId || null,
        p_tipo_equipamento_id: filtros.tipoEquipamentoId || null,
        p_resultado: filtros.resultado || null,
        p_data_de: filtros.dataDe || null,
        p_data_ate: filtros.dataAte || null,
        p_validade_de: filtros.validadeDe
          ? `${filtros.validadeDe}-01`
          : null,
        p_validade_ate: filtros.validadeAte
          ? `${filtros.validadeAte}-01`
          : null,
        p_offset: (page - 1) * limit,
        p_limit: limit,
        p_sort_by: filtros.sortBy || "numero_certificado",
        p_ascending: filtros.ascending ?? false,
      }
    );

    if (error) throw new Error(error.message);

    const rows = (data || []) as CalibracaoExecucaoResumoRpcRow[];
    const items = rows.map((row) => row.item);
    const rawTotal = rows[0]?.total_count;
    const total =
      typeof rawTotal === "number"
        ? rawTotal
        : typeof rawTotal === "string"
          ? Number(rawTotal)
          : (page - 1) * limit + items.length;

    return {
      items,
      total: Number.isFinite(total) ? total : items.length,
    };
  },

  async listarExecucoesFiltros(): Promise<CalibracaoExecucoesFiltrosOpcoes> {
    const { data, error } = await supabase.rpc(
      "listar_calibracoes_execucoes_filtros"
    );

    if (error) throw new Error(error.message);

    const result = (data || {}) as {
      empresas?: Array<{ id: string; nome: string }>;
      tipos_equipamento?: Array<{ id: string; nome: string }>;
    };

    return {
      empresas: result.empresas || [],
      tiposEquipamento: result.tipos_equipamento || [],
    };
  },

  async buscarExecucaoPorId(id: string) {
    const { data, error } = await supabase
      .from("calibracao_execucoes")
      .select(selectExecucao)
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return normalizeExecucao(data as unknown as CalibracaoExecucao);
  },

  async criarExecucao(input: CalibracaoExecucaoFormInput) {
    validarCabecalho(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const procedimento = await calibracaoProcedimentosService.buscarProcedimentoPorId(input.procedimentoId);
    const snapshot = await montarSnapshot(input, organizacaoId);
    const { data, error } = await supabase
      .from("calibracao_execucoes")
      .insert({
        organizacao_id: organizacaoId,
        ...criarPayloadExecucao(input, procedimento),
        resultado_geral: snapshot.resultadoGeral,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await salvarSnapshot(data.id, snapshot.tabelas);
    return this.buscarExecucaoPorId(data.id);
  },

  async atualizarExecucao(id: string, input: CalibracaoExecucaoFormInput) {
    validarCabecalho(input);
    const atual = await this.buscarExecucaoPorId(id);
    if (atual.status === "cancelada") {
      throw new Error("Execucoes canceladas nao podem ser editadas.");
    }
    if (atual.status === "fechada") {
      throw new Error("Inicie uma revisao antes de editar a calibracao finalizada.");
    }
    const procedimento = await calibracaoProcedimentosService.buscarProcedimentoPorId(input.procedimentoId);
    const inputSincronizado = sincronizarMetadadosProcedimentoNoInput(
      input,
      procedimento
    );
    const snapshot = await montarSnapshot(inputSincronizado, atual.organizacao_id);
    const { error } = await supabase
      .from("calibracao_execucoes")
      .update({
        ...criarPayloadExecucao(inputSincronizado, procedimento),
        resultado_geral: snapshot.resultadoGeral,
        status: "em_execucao",
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await salvarSnapshot(id, snapshot.tabelas);
    return this.buscarExecucaoPorId(id);
  },

  async cancelarExecucao(id: string) {
    const atual = await this.buscarExecucaoPorId(id);
    if (["fechada", "cancelada"].includes(atual.status)) {
      throw new Error("Execucoes fechadas ou canceladas nao podem ser canceladas.");
    }
    const { error } = await supabase
      .from("calibracao_execucoes")
      .update({ status: "cancelada" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async recalcularExecucao(id: string) {
    const atual = await this.buscarExecucaoPorId(id);
    if (["fechada", "cancelada"].includes(atual.status)) {
      throw new Error("Execucoes fechadas ou canceladas nao podem ser recalculadas.");
    }
    const input = criarInputDaExecucao(atual);
    validarCabecalho(input);
    const snapshot = await montarSnapshot(input, atual.organizacao_id);
    await salvarSnapshot(id, snapshot.tabelas);
    const { error } = await supabase
      .from("calibracao_execucoes")
      .update({ resultado_geral: snapshot.resultadoGeral })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return this.buscarExecucaoPorId(id);
  },

  async criarSnapshotRevisao(execucaoId: string, motivo?: string | null) {
    const { data, error } = await supabase.rpc(
      "iniciar_revisao_calibracao_execucao",
      {
        p_execucao_id: execucaoId,
        p_motivo: trimOrNull(motivo),
      }
    );
    if (error) throw new Error(error.message);
    return data as number;
  },

  async listarRevisoes(execucaoId: string) {
    const { data, error } = await supabase
      .from("calibracao_execucao_revisoes")
      .select("*")
      .eq("execucao_id", execucaoId)
      .order("numero_revisao", { ascending: false });
    if (error) throw new Error(error.message);
    return data as CalibracaoExecucaoRevisao[];
  },

  async salvarCalibracaoFinalizada(
    input: CalibracaoExecucaoFormInput,
    gerarPdf: GerarPdfCalibracao
  ) {
    const criada = await this.criarExecucao(input);
    const pdf = await gerarPdf(criada);
    return this.finalizarExecucao(criada.id, pdf);
  },

  async editarCalibracaoFinalizada(
    id: string,
    input: CalibracaoExecucaoFormInput,
    gerarPdf: GerarPdfCalibracao,
    motivo?: string | null
  ) {
    const atual = await this.buscarExecucaoPorId(id);
    if (atual.status === "cancelada") {
      throw new Error("Execucoes canceladas nao podem ser editadas.");
    }
    if (atual.status === "fechada") {
      await this.criarSnapshotRevisao(id, motivo);
    }
    const atualizada = await this.atualizarExecucao(id, input);
    const pdf = await gerarPdf(atualizada);
    return this.finalizarExecucao(id, pdf);
  },

  async finalizarExecucao(id: string, pdf: Blob) {
    const execucao = await this.buscarExecucaoPorId(id);
    validarFechamento(execucao);
    const path = `${execucao.organizacao_id}/${execucao.id}/${formatNomeArquivoCertificadoCalibracao(execucao)}`;
    const hash = await gerarHashSha256(pdf);
    const { error: uploadError } = await supabase.storage
      .from(CERTIFICADOS_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { error } = await supabase.rpc("finalizar_calibracao_execucao", {
      p_execucao_id: id,
      p_pdf_storage_path: path,
      p_pdf_hash: hash,
    });
    if (error) {
      await supabase.storage.from(CERTIFICADOS_BUCKET).remove([path]);
      throw new Error(error.message);
    }
    return this.buscarExecucaoPorId(id);
  },

  async buscarOrcamentoIncertezaInterno(execucaoPontoId: string) {
    const { data, error } = await supabase
      .from("calibracao_execucao_componentes_incerteza")
      .select(selectComponente)
      .eq("execucao_ponto_id", execucaoPontoId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return data as unknown as CalibracaoExecucaoComponente[];
  },

  async criarUrlPdf(execucao: CalibracaoExecucao, download = false) {
    if (!execucao.pdf_storage_path) throw new Error("Certificado PDF nao gerado.");
    const { data, error } = await supabase.storage
      .from(CERTIFICADOS_BUCKET)
      .createSignedUrl(execucao.pdf_storage_path, 60 * 5, {
        download: download ? formatNomeDownloadCertificadoCalibracao(execucao) : false,
      });
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};

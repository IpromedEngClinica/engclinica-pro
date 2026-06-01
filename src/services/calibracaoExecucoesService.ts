import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { calibracaoPadroesService } from "@/services/calibracaoPadroesService";
import type { CalibracaoProcedimento } from "@/services/calibracaoProcedimentosService";
import { calibracaoProcedimentosService } from "@/services/calibracaoProcedimentosService";
import {
  calcularPontoCalibracao,
  encontrarPontoPadraoExato,
  type ComponenteIncerteza,
  type RegraDecisao,
  type ResultadoConformidade,
} from "@/utils/calibracaoCalculos";

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
  media_valores_medidos: number | null;
  desvio_padrao_amostral: number | null;
  incerteza_tipo_a: number | null;
  tendencia_bruta: number | null;
  correcao_padrao: number | null;
  tendencia_corrigida: number | null;
  incerteza_padrao_certificado: number | null;
  incerteza_padrao_convertida: number | null;
  incerteza_resolucao_equipamento: number | null;
  incerteza_resolucao_padrao: number | null;
  incerteza_combinada: number | null;
  graus_liberdade_efetivos_veff: number | null;
  veff_infinito: boolean;
  fator_abrangencia_k: number | null;
  incerteza_expandida: number | null;
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
  fator_confiabilidade_modo_snapshot:
    | "calcular_95"
    | "k_fixo"
    | "manual_execucao";
  fator_k_fixo_snapshot: number | null;
  incluir_criterio_aceitacao_snapshot: boolean;
  criterio_aceitacao_tipo_snapshot: "absoluto" | "percentual" | "faixa" | null;
  criterio_aceitacao_valor_maximo_snapshot: number | null;
  criterio_aceitacao_valor_minimo_snapshot: number | null;
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
  tecnico_executor_nome: string;
  tecnico_executor_registro: string | null;
  responsavel_tecnico_nome: string;
  responsavel_tecnico_registro: string | null;
  responsavel_solicitante: string | null;
  status: CalibracaoExecucaoStatus;
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

export type CalibracaoExecucaoPontoInput = {
  procedimentoPontoId?: string | null;
  valorNominal: number;
  leituras: Array<number | null>;
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
  fatorModo: "calcular_95" | "k_fixo" | "manual_execucao";
  fatorK?: number | null;
  incluirCriterio: boolean;
  criterioTipo?: "absoluto" | "percentual" | "faixa" | null;
  criterioValorMaximo?: number | null;
  criterioValorMinimo?: number | null;
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
  dataValidade?: string | null;
  tecnicoExecutorNome: string;
  tecnicoExecutorRegistro?: string | null;
  responsavelTecnicoNome: string;
  responsavelTecnicoRegistro?: string | null;
  responsavelSolicitante?: string | null;
  criterioConformidadeAplicado: boolean;
  regraDecisao?: RegraDecisao | null;
  tabelas: CalibracaoExecucaoTabelaInput[];
};

const selectLeitura = `id, execucao_ponto_id, ordem, valor_medido`;
const selectComponente = `
  id, execucao_ponto_id, nome, categoria, distribuicao, valor_origem, divisor,
  coeficiente_sensibilidade, incerteza_padrao, graus_liberdade,
  graus_liberdade_infinito, origem, ordem
`;
const selectPonto = `
  id, execucao_tabela_id, procedimento_ponto_id, ordem, valor_nominal,
  media_valores_medidos, desvio_padrao_amostral, incerteza_tipo_a,
  tendencia_bruta, correcao_padrao, tendencia_corrigida,
  incerteza_padrao_certificado, incerteza_padrao_convertida,
  incerteza_resolucao_equipamento, incerteza_resolucao_padrao,
  incerteza_combinada, graus_liberdade_efetivos_veff, veff_infinito,
  fator_abrangencia_k, incerteza_expandida, criterio_aceitacao_valor,
  resultado_conformidade, observacoes, calculado_em,
  leituras:calibracao_execucao_leituras (${selectLeitura}),
  componentes:calibracao_execucao_componentes_incerteza (${selectComponente})
`;
const selectTabela = `
  id, execucao_id, procedimento_tabela_id, nome_snapshot, grandeza_snapshot,
  unidade_snapshot, quantidade_leituras_snapshot, padrao_id, padrao_tabela_id,
  padrao_nome_snapshot, padrao_numero_certificado_snapshot, padrao_validade_snapshot,
  padrao_identificacao_snapshot, padrao_laboratorio_snapshot, resolucao_padrao_snapshot,
  resolucao_equipamento_snapshot, fator_confiabilidade_modo_snapshot,
  fator_k_fixo_snapshot, incluir_criterio_aceitacao_snapshot,
  criterio_aceitacao_tipo_snapshot, criterio_aceitacao_valor_maximo_snapshot,
  criterio_aceitacao_valor_minimo_snapshot, corrigir_erro_sistematico_snapshot,
  ordem, pontos:calibracao_execucao_pontos (${selectPonto})
`;
const selectExecucao = `
  id, organizacao_id, numero_certificado, empresa_id, equipamento_id, procedimento_id,
  procedimento_nome_snapshot, procedimento_versao_snapshot, norma_utilizada_snapshot,
  local_calibracao, temperatura_ambiente, incerteza_temperatura, unidade_temperatura,
  umidade_relativa, incerteza_umidade, unidade_umidade, pressao_atmosferica,
  incerteza_pressao, unidade_pressao, observacoes, data_calibracao, data_emissao,
  data_validade, tecnico_executor_nome, tecnico_executor_registro,
  responsavel_tecnico_nome, responsavel_tecnico_registro, responsavel_solicitante,
  status, criterio_conformidade_aplicado, regra_decisao, resultado_geral, os_id,
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
  if (!input.tecnicoExecutorNome.trim()) throw new Error("Informe o tecnico executor.");
  if (!input.responsavelTecnicoNome.trim()) throw new Error("Informe o responsavel tecnico.");
  if (input.dataValidade && input.dataValidade < input.dataCalibracao) {
    throw new Error("A validade nao pode ser anterior a data da calibracao.");
  }
  if (input.criterioConformidadeAplicado && !input.regraDecisao) {
    throw new Error("Informe a regra de decisao.");
  }
  if (!input.tabelas.length) throw new Error("Adicione ao menos uma tabela.");
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
  data_validade: input.dataValidade || null,
  tecnico_executor_nome: input.tecnicoExecutorNome.trim(),
  tecnico_executor_registro: trimOrNull(input.tecnicoExecutorRegistro),
  responsavel_tecnico_nome: input.responsavelTecnicoNome.trim(),
  responsavel_tecnico_registro: trimOrNull(input.responsavelTecnicoRegistro),
  responsavel_solicitante: trimOrNull(input.responsavelSolicitante),
  criterio_conformidade_aplicado: input.criterioConformidadeAplicado,
  regra_decisao: input.criterioConformidadeAplicado ? input.regraDecisao ?? null : null,
});

export const criarTabelasExecucaoDoProcedimento = (
  procedimento: CalibracaoProcedimento
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
    fatorModo: tabela.fator_confiabilidade_modo,
    fatorK: tabela.fator_k_fixo,
    incluirCriterio: tabela.incluir_criterio_aceitacao,
    criterioTipo: tabela.criterio_aceitacao_tipo,
    criterioValorMaximo: tabela.criterio_aceitacao_valor_maximo,
    criterioValorMinimo: tabela.criterio_aceitacao_valor_minimo,
    corrigirErroSistematico: tabela.corrigir_erro_sistematico,
    pontos: (tabela.pontos || []).map((ponto) => ({
      procedimentoPontoId: ponto.id,
      valorNominal: ponto.valor_nominal,
      leituras: Array.from({ length: tabela.quantidade_leituras }, () => null),
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
    fatorModo: tabela.fator_confiabilidade_modo_snapshot,
    fatorK: tabela.fator_k_fixo_snapshot,
    incluirCriterio: tabela.incluir_criterio_aceitacao_snapshot,
    criterioTipo: tabela.criterio_aceitacao_tipo_snapshot,
    criterioValorMaximo: tabela.criterio_aceitacao_valor_maximo_snapshot,
    criterioValorMinimo: tabela.criterio_aceitacao_valor_minimo_snapshot,
    corrigirErroSistematico: tabela.corrigir_erro_sistematico_snapshot,
    pontos: (tabela.pontos || []).map((ponto) => ({
      procedimentoPontoId: ponto.procedimento_ponto_id,
      valorNominal: ponto.valor_nominal,
      leituras: Array.from({ length: tabela.quantidade_leituras_snapshot }, (_, index) => {
        return ponto.leituras?.find((leitura) => leitura.ordem === index + 1)?.valor_medido ?? null;
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
  dataValidade: execucao.data_validade,
  tecnicoExecutorNome: execucao.tecnico_executor_nome,
  tecnicoExecutorRegistro: execucao.tecnico_executor_registro,
  responsavelTecnicoNome: execucao.responsavel_tecnico_nome,
  responsavelTecnicoRegistro: execucao.responsavel_tecnico_registro,
  responsavelSolicitante: execucao.responsavel_solicitante,
  criterioConformidadeAplicado: execucao.criterio_conformidade_aplicado,
  regraDecisao: execucao.regra_decisao,
  tabelas: criarTabelasInputDaExecucao(execucao),
});

const calcularResultadoGeral = (
  aplicarCriterio: boolean,
  resultados: Array<ResultadoConformidade | null>
): CalibracaoExecucaoResultado | null => {
  if (!resultados.length || resultados.some((resultado) => !resultado)) return null;
  if (!aplicarCriterio) return "sem_declaracao_conformidade";
  return resultados.some((resultado) => resultado === "nao_conforme")
    ? "nao_conforme"
    : "conforme";
};

const montarSnapshot = async (
  input: CalibracaoExecucaoFormInput,
  organizacaoId: string
) => {
  const padroes = new Map<string, Awaited<ReturnType<typeof calibracaoPadroesService.buscarPadraoPorId>>>();
  const tabelas = [];
  const resultados: Array<ResultadoConformidade | null> = [];

  for (const [tabelaIndex, tabela] of input.tabelas.entries()) {
    if (input.criterioConformidadeAplicado && !tabela.incluirCriterio) {
      throw new Error(`Configure o criterio de aceitacao da tabela "${tabela.nome}" antes de emitir a declaracao de conformidade.`);
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
      const pontoPadrao = encontrarPontoPadraoExato(
        ponto.valorNominal,
        (tabelaPadrao.pontos || []).map((item) => ({
          valorNominal: item.valor_nominal,
          tendencia: item.tendencia,
          incertezaExpandida: item.incerteza_expandida,
          fatorAbrangenciaK: item.fator_abrangencia_k,
          grausLiberdade: item.graus_liberdade_efetivos_veff,
          veffInfinito: item.veff_infinito,
        }))
      );
      if (!pontoPadrao) {
        throw new Error(`Nao foi encontrado ponto correspondente no padrao para ${ponto.valorNominal} ${tabela.unidade}.`);
      }

      const leiturasPreenchidas = ponto.leituras.filter(
        (leitura): leitura is number => leitura !== null
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
              aplicar: input.criterioConformidadeAplicado && tabela.incluirCriterio,
              tipo: tabela.criterioTipo,
              valorMaximo: tabela.criterioValorMaximo,
              valorMinimo: tabela.criterioValorMinimo,
              regraDecisao: input.regraDecisao,
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
        media_valores_medidos: calculo?.media ?? null,
        desvio_padrao_amostral: calculo?.desvioPadrao ?? null,
        incerteza_tipo_a: calculo?.uTipoA ?? null,
        tendencia_bruta: calculo?.tendenciaBruta ?? null,
        correcao_padrao: calculo?.correcaoPadrao ?? null,
        tendencia_corrigida: calculo?.tendenciaCorrigida ?? null,
        incerteza_padrao_certificado: pontoPadrao.incertezaExpandida ?? null,
        incerteza_padrao_convertida: calculo?.uPadrao ?? null,
        incerteza_resolucao_equipamento: calculo?.uResolucaoEquipamento ?? null,
        incerteza_resolucao_padrao: calculo?.uResolucaoPadrao ?? null,
        incerteza_combinada: calculo?.uc ?? null,
        graus_liberdade_efetivos_veff: calculo?.veffInfinito ? null : calculo?.veff ?? null,
        veff_infinito: calculo?.veffInfinito ?? false,
        fator_abrangencia_k: calculo?.fatorK ?? null,
        incerteza_expandida: calculo?.incertezaExpandida ?? null,
        criterio_aceitacao_valor: calculo?.criterioAceitacaoValor ?? null,
        resultado_conformidade: calculo?.resultadoConformidade ?? null,
        observacoes: trimOrNull(ponto.observacoes),
        calculado_em: calculo ? new Date().toISOString() : null,
        leituras: ponto.leituras.flatMap((valor_medido, index) =>
          valor_medido === null
            ? []
            : [{ organizacao_id: organizacaoId, ordem: index + 1, valor_medido }]
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
      fator_confiabilidade_modo_snapshot: tabela.fatorModo,
      fator_k_fixo_snapshot: tabela.fatorK ?? null,
      incluir_criterio_aceitacao_snapshot: tabela.incluirCriterio,
      criterio_aceitacao_tipo_snapshot: tabela.criterioTipo ?? null,
      criterio_aceitacao_valor_maximo_snapshot: tabela.criterioValorMaximo ?? null,
      criterio_aceitacao_valor_minimo_snapshot: tabela.criterioValorMinimo ?? null,
      corrigir_erro_sistematico_snapshot: tabela.corrigirErroSistematico,
      ordem: tabelaIndex,
      pontos,
    });
  }

  return { tabelas, resultadoGeral: calcularResultadoGeral(input.criterioConformidadeAplicado, resultados) };
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
    for (const ponto of tabela.pontos) {
      if ((ponto.leituras || []).length !== tabela.quantidade_leituras_snapshot) {
        throw new Error(`Preencha todas as leituras do ponto ${ponto.valor_nominal} ${tabela.unidade_snapshot}.`);
      }
      if (ponto.incerteza_expandida == null || ponto.fator_abrangencia_k == null) {
        throw new Error(`Calcule o ponto ${ponto.valor_nominal} ${tabela.unidade_snapshot}.`);
      }
    }
  }
  if (!execucao.resultado_geral) throw new Error("Calcule o resultado geral antes de finalizar.");
};

export const formatNumeroCertificadoCalibracao = (numero?: number | null) =>
  numero ? `CAL-${String(numero).padStart(6, "0")}` : "CAL-PENDENTE";

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
    if (["fechada", "cancelada"].includes(atual.status)) {
      throw new Error("Execucoes fechadas ou canceladas nao podem ser editadas.");
    }
    const procedimento = await calibracaoProcedimentosService.buscarProcedimentoPorId(input.procedimentoId);
    const snapshot = await montarSnapshot(input, atual.organizacao_id);
    const { error } = await supabase
      .from("calibracao_execucoes")
      .update({
        ...criarPayloadExecucao(input, procedimento),
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

  async finalizarExecucao(id: string, pdf: Blob) {
    const execucao = await this.buscarExecucaoPorId(id);
    validarFechamento(execucao);
    const path = `${execucao.organizacao_id}/${execucao.id}/${formatNumeroCertificadoCalibracao(execucao.numero_certificado)}.pdf`;
    const hash = await gerarHashSha256(pdf);
    const { error: uploadError } = await supabase.storage
      .from(CERTIFICADOS_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: false });
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

  async criarUrlPdf(execucao: CalibracaoExecucao, download = false) {
    if (!execucao.pdf_storage_path) throw new Error("Certificado PDF nao gerado.");
    const { data, error } = await supabase.storage
      .from(CERTIFICADOS_BUCKET)
      .createSignedUrl(execucao.pdf_storage_path, 60 * 5, {
        download: download ? `${formatNumeroCertificadoCalibracao(execucao.numero_certificado)}.pdf` : false,
      });
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};

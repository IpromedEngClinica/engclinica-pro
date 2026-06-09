import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { CalibracaoPadrao } from "@/services/calibracaoPadroesService";
import {
  calcularResultadoGeralSegurancaEletrica,
  avaliarResultadoSegurancaEletrica,
  type SegurancaEletricaResultadoStatus,
} from "@/utils/segurancaEletricaTemplate";

export type SegurancaEletricaStatus = "rascunho" | "fechada" | "cancelada";
export type SegurancaEletricaResultadoGeral = "aprovado" | "reprovado";

export type SegurancaEletricaResultado = {
  id: string;
  organizacao_id: string;
  execucao_id: string;
  grupo: string;
  caracteristica: string;
  unidade: "V" | "A" | "Ω" | "µA";
  valor_esperado_texto: string;
  valor_esperado_numero: number | null;
  operador_limite: "<=" | null;
  valor_registrado: number | null;
  valor_registrado_texto: string | null;
  desvio: number | null;
  desvio_texto: string | null;
  resultado: SegurancaEletricaResultadoStatus;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type SegurancaEletricaExecucao = {
  id: string;
  organizacao_id: string;
  numero_certificado: number;
  empresa_id: string;
  equipamento_id: string;
  padrao_id: string | null;
  classe_equipamento: string;
  tipo_parte_aplicada: string;
  temperatura_ambiente_texto: string | null;
  umidade_relativa_texto: string | null;
  local_ensaio: string | null;
  data_teste: string;
  data_emissao: string;
  data_validade: string | null;
  tecnico_executor_nome: string;
  responsavel_tecnico_nome: string;
  responsavel_solicitante: string | null;
  resultado_geral: SegurancaEletricaResultadoGeral;
  observacoes: string | null;
  status: SegurancaEletricaStatus;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  equipamento?: EquipamentoSupabase | null;
  padrao?: CalibracaoPadrao | null;
  resultados?: SegurancaEletricaResultado[];
};

export type SegurancaEletricaResultadoInput = {
  grupo: string;
  caracteristica: string;
  unidade: "V" | "A" | "Ω" | "µA";
  valorEsperadoTexto: string;
  valorEsperadoNumero?: number | null;
  operadorLimite?: "<=" | null;
  valorRegistrado?: number | null;
  valorRegistradoTexto?: string | null;
  desvio?: number | null;
  desvioTexto?: string | null;
  resultado?: SegurancaEletricaResultadoStatus;
};

export type SegurancaEletricaFormInput = {
  empresaId: string;
  equipamentoId: string;
  padraoId?: string | null;
  classeEquipamento: string;
  tipoParteAplicada: string;
  temperaturaAmbienteTexto?: string | null;
  umidadeRelativaTexto?: string | null;
  localEnsaio?: string | null;
  dataTeste: string;
  dataEmissao: string;
  dataValidade?: string | null;
  tecnicoExecutorNome: string;
  responsavelTecnicoNome: string;
  responsavelSolicitante?: string | null;
  observacoes?: string | null;
  status?: SegurancaEletricaStatus;
  resultados: SegurancaEletricaResultadoInput[];
};

const selectResultados = `
  id,
  organizacao_id,
  execucao_id,
  grupo,
  caracteristica,
  unidade,
  valor_esperado_texto,
  valor_esperado_numero,
  operador_limite,
  valor_registrado,
  valor_registrado_texto,
  desvio,
  desvio_texto,
  resultado,
  ordem,
  created_at,
  updated_at
`;

const selectExecucoes = `
  id,
  organizacao_id,
  numero_certificado,
  empresa_id,
  equipamento_id,
  padrao_id,
  classe_equipamento,
  tipo_parte_aplicada,
  temperatura_ambiente_texto,
  umidade_relativa_texto,
  local_ensaio,
  data_teste,
  data_emissao,
  data_validade,
  tecnico_executor_nome,
  responsavel_tecnico_nome,
  responsavel_solicitante,
  resultado_geral,
  observacoes,
  status,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    cpf_cnpj,
    rua,
    numero,
    bairro,
    cidade,
    estado,
    cep,
    telefone,
    celular,
    contato,
    email,
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
  padrao:calibracao_padroes (
    id,
    numero_certificado,
    nome_padrao,
    fabricante,
    modelo,
    numero_serie,
    patrimonio,
    tag,
    laboratorio_calibrador,
    data_calibracao,
    data_validade,
    observacoes,
    ativo
  ),
  resultados:seguranca_eletrica_resultados (
    ${selectResultados}
  )
`;

const trimOrNull = (value?: string | null) => value?.trim() || null;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  }

  return data as string;
};

const normalizarExecucao = (execucao: SegurancaEletricaExecucao) => ({
  ...execucao,
  resultados: [...(execucao.resultados || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  ),
});

const normalizarResultados = (
  resultados: SegurancaEletricaResultadoInput[],
  organizacaoId: string
) =>
  resultados.map((item, index) => {
    const calculado = avaliarResultadoSegurancaEletrica({
      grupo: item.grupo,
      caracteristica: item.caracteristica,
      unidade: item.unidade,
      valorEsperadoTexto: item.valorEsperadoTexto,
      valorEsperadoNumero: item.valorEsperadoNumero,
      operadorLimite: item.operadorLimite,
      valorRegistrado: item.valorRegistrado,
      valorRegistradoTexto: item.valorRegistradoTexto,
    });
    const valorRegistrado =
      item.valorRegistrado === undefined || item.valorRegistrado === null
        ? null
        : Number(item.valorRegistrado);

    return {
      organizacao_id: organizacaoId,
      grupo: item.grupo.trim(),
      caracteristica: item.caracteristica.trim(),
      unidade: item.unidade,
      valor_esperado_texto: item.valorEsperadoTexto.trim(),
      valor_esperado_numero: item.valorEsperadoNumero ?? null,
      operador_limite: item.operadorLimite || null,
      valor_registrado: valorRegistrado,
      valor_registrado_texto:
        item.valorRegistradoTexto?.trim() ||
        (valorRegistrado === null ? null : String(valorRegistrado)),
      desvio: calculado.desvio,
      desvio_texto: calculado.desvioTexto,
      resultado: calculado.resultado,
      ordem: index + 1,
    };
  });

const toPayload = (
  input: SegurancaEletricaFormInput,
  resultadoGeral: SegurancaEletricaResultadoGeral
) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId,
  padrao_id: input.padraoId || null,
  classe_equipamento: input.classeEquipamento.trim() || "Classe I",
  tipo_parte_aplicada: input.tipoParteAplicada.trim() || "Tipo BF",
  temperatura_ambiente_texto:
    trimOrNull(input.temperaturaAmbienteTexto) || "21 a 25",
  umidade_relativa_texto: trimOrNull(input.umidadeRelativaTexto) || "45 a 75",
  local_ensaio: trimOrNull(input.localEnsaio),
  data_teste: input.dataTeste,
  data_emissao: input.dataEmissao,
  data_validade: input.dataValidade || null,
  tecnico_executor_nome: input.tecnicoExecutorNome.trim(),
  responsavel_tecnico_nome: input.responsavelTecnicoNome.trim(),
  responsavel_solicitante: trimOrNull(input.responsavelSolicitante),
  resultado_geral: resultadoGeral,
  observacoes: trimOrNull(input.observacoes),
  status: input.status || "fechada",
});

const validarInput = (input: SegurancaEletricaFormInput) => {
  if (!input.empresaId) throw new Error("Selecione o cliente.");
  if (!input.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!input.dataTeste || !input.dataEmissao) {
    throw new Error("Informe as datas do teste e da emissao.");
  }
  if (!input.tecnicoExecutorNome.trim()) {
    throw new Error("Informe o tecnico executor.");
  }
  if (!input.responsavelTecnicoNome.trim()) {
    throw new Error("Informe o responsavel tecnico.");
  }
  if (!input.resultados.length) {
    throw new Error("O ensaio deve possuir resultados.");
  }
};

export const formatNumeroCertificadoSegurancaEletrica = (numero?: number | null) =>
  numero ? String(numero).padStart(6, "0") : "-";

export const segurancaEletricaService = {
  async listar() {
    const { data, error } = await supabase
      .from("seguranca_eletrica_execucoes")
      .select(selectExecucoes)
      .eq("ativo", true)
      .order("data_teste", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data || []) as unknown as SegurancaEletricaExecucao[]).map(
      normalizarExecucao
    );
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("seguranca_eletrica_execucoes")
      .select(selectExecucoes)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return normalizarExecucao(data as unknown as SegurancaEletricaExecucao);
  },

  async criar(input: SegurancaEletricaFormInput) {
    validarInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const resultados = normalizarResultados(input.resultados, organizacaoId);
    const resultadoGeral = calcularResultadoGeralSegurancaEletrica(resultados);

    const { data, error } = await supabase
      .from("seguranca_eletrica_execucoes")
      .insert({
        organizacao_id: organizacaoId,
        ...toPayload(input, resultadoGeral),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const { error: resultadosError } = await supabase
      .from("seguranca_eletrica_resultados")
      .insert(
        resultados.map((resultado) => ({
          ...resultado,
          execucao_id: data.id,
        }))
      );

    if (resultadosError) throw new Error(resultadosError.message);

    return segurancaEletricaService.buscarPorId(data.id);
  },

  async atualizar(id: string, input: SegurancaEletricaFormInput) {
    validarInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const resultados = normalizarResultados(input.resultados, organizacaoId);
    const resultadoGeral = calcularResultadoGeralSegurancaEletrica(resultados);

    const { error } = await supabase
      .from("seguranca_eletrica_execucoes")
      .update(toPayload(input, resultadoGeral))
      .eq("id", id);

    if (error) throw new Error(error.message);

    const { error: deleteError } = await supabase
      .from("seguranca_eletrica_resultados")
      .delete()
      .eq("execucao_id", id);

    if (deleteError) throw new Error(deleteError.message);

    const { error: resultadosError } = await supabase
      .from("seguranca_eletrica_resultados")
      .insert(
        resultados.map((resultado) => ({
          ...resultado,
          execucao_id: id,
        }))
      );

    if (resultadosError) throw new Error(resultadosError.message);

    return segurancaEletricaService.buscarPorId(id);
  },

  async cancelar(id: string) {
    const { error } = await supabase
      .from("seguranca_eletrica_execucoes")
      .update({ status: "cancelada", ativo: false })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },
};

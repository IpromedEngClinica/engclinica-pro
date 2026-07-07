import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { OrcamentoSupabase } from "@/services/orcamentosService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";

export type TermoLocacaoTipo = "locacao" | "emprestimo";
export type TermoLocacaoModalidade = "valor_unico" | "valor_mensal";
export type TermoLocacaoStatus = "ativo" | "encerrado" | "cancelado";

export type TermoLocacaoMensalidade = {
  id: string;
  organizacao_id: string;
  termo_id: string;
  numero_parcela: number;
  data_vencimento: string;
  valor: number;
  pago: boolean;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type TermoLocacao = {
  id: string;
  organizacao_id: string;
  numero: number;
  tipo: TermoLocacaoTipo;
  modalidade_cobranca: TermoLocacaoModalidade;
  status: TermoLocacaoStatus;
  empresa_locadora_id: string | null;
  empresa_locataria_id: string;
  equipamento_id: string;
  responsavel_entrega: string | null;
  responsavel_recebimento: string | null;
  local_entrega: string | null;
  data_inicio: string;
  data_prevista_devolucao: string | null;
  data_devolucao: string | null;
  valor_unico: number | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa_locadora?: EmpresaSupabase | null;
  empresa_locataria?: EmpresaSupabase | null;
  equipamento?: EquipamentoSupabase | null;
  mensalidades?: TermoLocacaoMensalidade[];
};

export type TermoLocacaoInput = {
  tipo: TermoLocacaoTipo;
  modalidadeCobranca: TermoLocacaoModalidade;
  empresaLocadoraId?: string | null;
  empresaLocatariaId: string;
  equipamentoId: string;
  responsavelEntrega?: string | null;
  responsavelRecebimento?: string | null;
  localEntrega?: string | null;
  dataInicio: string;
  dataPrevistaDevolucao?: string | null;
  valorUnico?: number | null;
  valorMensal?: number | null;
  diaVencimento?: number | null;
  quantidadeMensalidades?: number;
  primeiroVencimento?: string | null;
  observacoes?: string | null;
};

export type AtualizarMensalidadeInput = {
  id: string;
  pago: boolean;
  dataPagamento?: string | null;
  observacoes?: string | null;
};

export type Recibo = {
  id: string;
  organizacao_id: string;
  numero: number;
  empresa_id: string;
  equipamento_id: string;
  ordem_servico_id: string | null;
  orcamento_id: string | null;
  data_recibo: string;
  valor: number;
  forma_pagamento: string | null;
  recebido_de: string | null;
  referente: string;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  empresa?: EmpresaSupabase | null;
  equipamento?: EquipamentoSupabase | null;
  ordem_servico?: Pick<
    OrdemServicoSupabase,
    "id" | "numero" | "status_sistema" | "ativo"
  > | null;
  orcamento?: Pick<
    OrcamentoSupabase,
    "id" | "numero" | "identificador" | "valor_total" | "status" | "ativo"
  > | null;
  criado_por?: {
    id: string;
    nome: string;
    email: string;
    assinatura_storage_path: string | null;
  } | null;
};

export type ReciboInput = {
  empresaId: string;
  equipamentoId: string;
  ordemServicoId?: string | null;
  orcamentoId?: string | null;
  dataRecibo: string;
  valor: number;
  formaPagamento?: string | null;
  recebidoDe?: string | null;
  referente: string;
  observacoes?: string | null;
};

export type VencimentoTipoServico = "calibracao" | "preventiva";

export type VencimentosFiltro = {
  ano: number;
  incluirCalibracao: boolean;
  incluirPreventiva: boolean;
};

export type VencimentoEquipamentoItem = {
  equipamentoId: string;
  empresaId: string;
  clienteNome: string;
  clienteCidade: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  tipoServico: VencimentoTipoServico;
  dataVencimento: string;
  dataUltimoServico: string | null;
  tipoEquipamento: string;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  patrimonio: string | null;
  tag: string | null;
  setor: string | null;
};

export type VencimentoClienteGrupo = {
  empresaId: string;
  clienteNome: string;
  cidade: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  itens: VencimentoEquipamentoItem[];
};

export type VencimentoMesGrupo = {
  mes: string;
  label: string;
  clientes: VencimentoClienteGrupo[];
  total: number;
};

export type VencimentosRelatorio = {
  ano: number;
  tipos: VencimentoTipoServico[];
  meses: VencimentoMesGrupo[];
  total: number;
};

const selectEmpresa = `
  id,
  organizacao_id,
  nome,
  nome_fantasia,
  tipo_cliente,
  tipo_relacao,
  representante_comercial_setor,
  cpf_cnpj,
  cep,
  rua,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  contato,
  email,
  celular,
  telefone,
  observacoes,
  incluir_criterio_aceitacao_calibracao,
  ativo,
  created_at,
  updated_at
`;

const selectEquipamento = `
  id,
  numero_cadastro,
  organizacao_id,
  empresa_id,
  tipo_equipamento_id,
  tipo_texto,
  fabricante,
  modelo,
  numero_serie,
  patrimonio,
  tag,
  setor,
  status,
  data_aquisicao,
  data_instalacao,
  data_ultima_preventiva,
  data_proxima_preventiva,
  data_ultima_calibracao,
  data_proxima_calibracao,
  observacoes,
  ativo,
  created_at,
  updated_at,
  tipo_equipamento:tipos_equipamento (
    id,
    nome
  )
`;

const selectMensalidade = `
  id,
  organizacao_id,
  termo_id,
  numero_parcela,
  data_vencimento,
  valor,
  pago,
  data_pagamento,
  observacoes,
  created_at,
  updated_at
`;

const selectTermo = `
  id,
  organizacao_id,
  numero,
  tipo,
  modalidade_cobranca,
  status,
  empresa_locadora_id,
  empresa_locataria_id,
  equipamento_id,
  responsavel_entrega,
  responsavel_recebimento,
  local_entrega,
  data_inicio,
  data_prevista_devolucao,
  data_devolucao,
  valor_unico,
  valor_mensal,
  dia_vencimento,
  observacoes,
  ativo,
  created_at,
  updated_at,
  empresa_locadora:empresas!utilitario_termos_locacao_empresa_locadora_id_fkey (${selectEmpresa}),
  empresa_locataria:empresas!utilitario_termos_locacao_empresa_locataria_id_fkey (${selectEmpresa}),
  equipamento:equipamentos (${selectEquipamento}),
  mensalidades:utilitario_termo_mensalidades (${selectMensalidade})
`;

const selectRecibo = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  orcamento_id,
  data_recibo,
  valor,
  forma_pagamento,
  recebido_de,
  referente,
  observacoes,
  ativo,
  created_at,
  updated_at,
  created_by,
  updated_by,
  empresa:empresas (${selectEmpresa}),
  equipamento:equipamentos (${selectEquipamento}),
  ordem_servico:ordens_servico (
    id,
    numero,
    status_sistema,
    ativo
  ),
  orcamento:orcamentos (
    id,
    numero,
    identificador,
    valor_total,
    status,
    ativo
  ),
  criado_por:usuarios!utilitario_recibos_created_by_fkey (
    id,
    nome,
    email,
    assinatura_storage_path
  )
`;

const trimOrNull = (value?: string | null) => value?.trim() || null;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao.");

  return data as string;
};

const buscarUsuarioAtualId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id || null;
};

const normalizeTermo = (termo: TermoLocacao): TermoLocacao => ({
  ...termo,
  mensalidades: [...(termo.mensalidades || [])].sort(
    (a, b) => a.numero_parcela - b.numero_parcela
  ),
});

const addMeses = (dateIso: string, meses: number) => {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setMonth(date.getMonth() + meses);
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mes}-${dia}`;
};

const getMonthKey = (dateIso: string) => dateIso.slice(0, 7);

const getMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const isDateInYear = (dateIso: string | null | undefined, year: number) =>
  Boolean(dateIso && dateIso.startsWith(`${year}-`));

const maxDateIso = (...dates: Array<string | null | undefined>) =>
  dates.filter(Boolean).sort().at(-1) || null;

const PAGE_SIZE = 1000;

const fetchAllPages = async <T>(
  buildQuery: () => any
): Promise<T[]> => {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(
      from,
      from + PAGE_SIZE - 1
    );

    if (error) throw new Error(error.message);

    const page = (data || []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getEmpresaContato = (empresa?: EmpresaSupabase | null) => ({
  contato: empresa?.contato || null,
  telefone: empresa?.celular || empresa?.telefone || null,
  email: empresa?.email || null,
});

const getVencimentoTipoEquipamento = (
  equipamento: EquipamentoSupabase
) =>
  equipamento.tipo_equipamento?.nome ||
  equipamento.tipo_texto ||
  "Equipamento";

type CalibracaoExecucaoResumo = {
  equipamento_id: string | null;
  data_calibracao: string | null;
  data_validade: string | null;
  status: string | null;
  ativo?: boolean | null;
};

type OrdemPreventivaResumo = {
  equipamento_id: string | null;
  data_fechamento: string | null;
  status_sistema: string | null;
  ativo: boolean | null;
  checklist_preventiva?: Array<{
    data_validade: string | null;
    created_at: string | null;
  }> | null;
};

type ChecklistPreventivaVencimentoResumo = {
  data_validade: string | null;
  created_at: string | null;
  ordem_servico?: {
    equipamento_id: string | null;
    data_fechamento: string | null;
    status_sistema: string | null;
    ativo: boolean | null;
  } | null;
};

type EquipamentoVencimentoResumo = {
  id: string;
  data_ultima_preventiva: string | null;
  data_proxima_preventiva: string | null;
  data_ultima_calibracao: string | null;
  data_proxima_calibracao: string | null;
};

type UltimoServicoResumo = {
  dataServico: string | null;
  dataValidade: string | null;
};

const toTermoPayload = (
  input: TermoLocacaoInput,
  organizacaoId: string
) => ({
  organizacao_id: organizacaoId,
  tipo: input.tipo,
  modalidade_cobranca: input.modalidadeCobranca,
  empresa_locadora_id: input.empresaLocadoraId || null,
  empresa_locataria_id: input.empresaLocatariaId,
  equipamento_id: input.equipamentoId,
  responsavel_entrega: trimOrNull(input.responsavelEntrega),
  responsavel_recebimento: trimOrNull(input.responsavelRecebimento),
  local_entrega: trimOrNull(input.localEntrega),
  data_inicio: input.dataInicio,
  data_prevista_devolucao: input.dataPrevistaDevolucao || null,
  valor_unico:
    input.modalidadeCobranca === "valor_unico" ? input.valorUnico ?? 0 : null,
  valor_mensal:
    input.modalidadeCobranca === "valor_mensal" ? input.valorMensal ?? 0 : null,
  dia_vencimento:
    input.modalidadeCobranca === "valor_mensal"
      ? input.diaVencimento ?? null
      : null,
  observacoes: trimOrNull(input.observacoes),
  status: "ativo" as TermoLocacaoStatus,
  ativo: true,
});

const validarTermo = (input: TermoLocacaoInput) => {
  if (!input.empresaLocatariaId) throw new Error("Selecione o cliente.");
  if (!input.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!input.dataInicio) throw new Error("Informe a data de inicio.");

  if (input.modalidadeCobranca === "valor_mensal") {
    if (!input.primeiroVencimento) {
      throw new Error("Informe o primeiro vencimento.");
    }
    if (!Number(input.quantidadeMensalidades || 0)) {
      throw new Error("Informe a quantidade de mensalidades.");
    }
  }
};

const validarRecibo = (input: ReciboInput) => {
  if (!input.empresaId) throw new Error("Selecione o cliente.");
  if (!input.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!input.dataRecibo) throw new Error("Informe a data do recibo.");
  if (!Number.isFinite(input.valor) || input.valor <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }
  if (!input.referente?.trim()) {
    throw new Error("Informe o referente do recibo.");
  }
};

const toReciboPayload = async (input: ReciboInput, organizacaoId: string) => {
  const usuarioId = await buscarUsuarioAtualId();

  return {
    organizacao_id: organizacaoId,
    empresa_id: input.empresaId,
    equipamento_id: input.equipamentoId,
    ordem_servico_id: input.ordemServicoId || null,
    orcamento_id: input.orcamentoId || null,
    data_recibo: input.dataRecibo,
    valor: input.valor,
    forma_pagamento: trimOrNull(input.formaPagamento),
    recebido_de: trimOrNull(input.recebidoDe),
    referente: input.referente.trim(),
    observacoes: trimOrNull(input.observacoes),
    ativo: true,
    created_by: usuarioId,
    updated_by: usuarioId,
  };
};

export const utilitariosService = {
  async listarTermosLocacao() {
    const { data, error } = await supabase
      .from("utilitario_termos_locacao")
      .select(selectTermo)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data || []) as unknown as TermoLocacao[]).map(normalizeTermo);
  },

  async criarTermoLocacao(input: TermoLocacaoInput) {
    validarTermo(input);
    const organizacaoId = await buscarOrganizacaoAtual();

    const { data, error } = await supabase
      .from("utilitario_termos_locacao")
      .insert(toTermoPayload(input, organizacaoId))
      .select(selectTermo)
      .single();

    if (error) throw new Error(error.message);

    const termo = normalizeTermo(data as unknown as TermoLocacao);

    if (input.modalidadeCobranca === "valor_mensal") {
      const quantidade = Number(input.quantidadeMensalidades || 0);
      const primeiroVencimento = input.primeiroVencimento as string;
      const parcelas = Array.from({ length: quantidade }, (_, index) => ({
        organizacao_id: organizacaoId,
        termo_id: termo.id,
        numero_parcela: index + 1,
        data_vencimento: addMeses(primeiroVencimento, index),
        valor: input.valorMensal ?? 0,
        pago: false,
      }));

      const { error: parcelasError } = await supabase
        .from("utilitario_termo_mensalidades")
        .insert(parcelas);

      if (parcelasError) throw new Error(parcelasError.message);
    }

    return this.buscarTermoLocacaoPorId(termo.id);
  },

  async buscarTermoLocacaoPorId(id: string) {
    const { data, error } = await supabase
      .from("utilitario_termos_locacao")
      .select(selectTermo)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return normalizeTermo(data as unknown as TermoLocacao);
  },

  async atualizarStatusTermoLocacao(
    id: string,
    status: TermoLocacaoStatus,
    dataDevolucao?: string | null
  ) {
    const { data, error } = await supabase
      .from("utilitario_termos_locacao")
      .update({
        status,
        data_devolucao: status === "encerrado" ? dataDevolucao || null : null,
      })
      .eq("id", id)
      .select(selectTermo)
      .single();

    if (error) throw new Error(error.message);

    return normalizeTermo(data as unknown as TermoLocacao);
  },

  async atualizarMensalidade(input: AtualizarMensalidadeInput) {
    const { data, error } = await supabase
      .from("utilitario_termo_mensalidades")
      .update({
        pago: input.pago,
        data_pagamento: input.pago
          ? input.dataPagamento || new Date().toISOString().slice(0, 10)
          : null,
        observacoes: trimOrNull(input.observacoes),
      })
      .eq("id", input.id)
      .select(selectMensalidade)
      .single();

    if (error) throw new Error(error.message);

    return data as unknown as TermoLocacaoMensalidade;
  },

  async listarRecibos() {
    const { data, error } = await supabase
      .from("utilitario_recibos")
      .select(selectRecibo)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as unknown as Recibo[];
  },

  async criarRecibo(input: ReciboInput) {
    validarRecibo(input);
    const organizacaoId = await buscarOrganizacaoAtual();

    const { data, error } = await supabase
      .from("utilitario_recibos")
      .insert(await toReciboPayload(input, organizacaoId))
      .select(selectRecibo)
      .single();

    if (error) throw new Error(error.message);

    return data as unknown as Recibo;
  },

  async buscarReciboPorId(id: string) {
    const { data, error } = await supabase
      .from("utilitario_recibos")
      .select(selectRecibo)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return data as unknown as Recibo;
  },

  async gerarRelatorioVencimentos(
    filtro: VencimentosFiltro
  ): Promise<VencimentosRelatorio> {
    const ano = Number(filtro.ano);
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      throw new Error("Informe um ano valido.");
    }

    const tipos: VencimentoTipoServico[] = [
      ...(filtro.incluirCalibracao ? (["calibracao"] as const) : []),
      ...(filtro.incluirPreventiva ? (["preventiva"] as const) : []),
    ];

    if (!tipos.length) {
      return { ano, tipos, meses: [], total: 0 };
    }

    const anoInicio = `${ano}-01-01`;
    const anoFim = `${ano}-12-31`;
    const camposDataEquipamento = [
      ...(filtro.incluirCalibracao
        ? [
            `and(data_proxima_calibracao.gte.${anoInicio},data_proxima_calibracao.lte.${anoFim})`,
          ]
        : []),
      ...(filtro.incluirPreventiva
        ? [
            `and(data_proxima_preventiva.gte.${anoInicio},data_proxima_preventiva.lte.${anoFim})`,
          ]
        : []),
    ];

    const [
      calibracoesNoAno,
      preventivasNoAno,
      equipamentosComDataNoAno,
    ] = await Promise.all([
      filtro.incluirCalibracao
        ? fetchAllPages<CalibracaoExecucaoResumo>(() =>
            supabase
              .from("calibracao_execucoes")
              .select(
                "equipamento_id, data_calibracao, data_validade, status, ativo"
              )
              .eq("status", "fechada")
              .eq("ativo", true)
              .not("equipamento_id", "is", null)
              .not("data_validade", "is", null)
              .gte("data_validade", anoInicio)
              .lte("data_validade", anoFim)
          )
        : Promise.resolve([]),
      filtro.incluirPreventiva
        ? fetchAllPages<ChecklistPreventivaVencimentoResumo>(() =>
            supabase
              .from("os_checklists_preventiva")
              .select(
                `
                  data_validade,
                  created_at,
                  ordem_servico:ordens_servico!inner (
                    equipamento_id,
                    data_fechamento,
                    status_sistema,
                    ativo
                  )
                `
              )
              .gte("data_validade", anoInicio)
              .lte("data_validade", anoFim)
              .eq("ordem_servico.ativo", true)
              .eq("ordem_servico.status_sistema", "fechada")
              .not("ordem_servico.equipamento_id", "is", null)
          )
        : Promise.resolve([]),
      camposDataEquipamento.length
        ? fetchAllPages<EquipamentoVencimentoResumo>(() =>
            supabase
              .from("equipamentos")
              .select(
                `
                  id,
                  data_ultima_preventiva,
                  data_proxima_preventiva,
                  data_ultima_calibracao,
                  data_proxima_calibracao
                `
              )
              .eq("ativo", true)
              .or(camposDataEquipamento.join(","))
          )
        : Promise.resolve([]),
    ]);

    const equipamentoIds = new Set<string>();

    calibracoesNoAno.forEach((calibracao) => {
      if (calibracao.equipamento_id) equipamentoIds.add(calibracao.equipamento_id);
    });

    preventivasNoAno.forEach((checklist) => {
      const equipamentoId = checklist.ordem_servico?.equipamento_id;
      if (equipamentoId) equipamentoIds.add(equipamentoId);
    });

    equipamentosComDataNoAno.forEach((equipamento) => {
      equipamentoIds.add(equipamento.id);
    });

    const equipamentoIdsList = Array.from(equipamentoIds);

    const [calibracoes, preventivas] = equipamentoIdsList.length
      ? await Promise.all([
          filtro.incluirCalibracao
            ? (
                await Promise.all(
                  chunkArray(equipamentoIdsList, 200).map((ids) =>
                    fetchAllPages<CalibracaoExecucaoResumo>(() =>
                      supabase
                        .from("calibracao_execucoes")
                        .select(
                          "equipamento_id, data_calibracao, data_validade, status, ativo"
                        )
                        .eq("status", "fechada")
                        .eq("ativo", true)
                        .not("equipamento_id", "is", null)
                        .not("data_validade", "is", null)
                        .in("equipamento_id", ids)
                    )
                  )
                )
              ).flat()
            : Promise.resolve([]),
          filtro.incluirPreventiva
            ? (
                await Promise.all(
                  chunkArray(equipamentoIdsList, 200).map((ids) =>
                    fetchAllPages<OrdemPreventivaResumo>(() =>
                      supabase
                        .from("ordens_servico")
                        .select(
                          `
                            equipamento_id,
                            data_fechamento,
                            status_sistema,
                            ativo,
                            checklist_preventiva:os_checklists_preventiva (
                              data_validade,
                              created_at
                            )
                          `
                        )
                        .eq("ativo", true)
                        .eq("status_sistema", "fechada")
                        .not("equipamento_id", "is", null)
                        .in("equipamento_id", ids)
                    )
                  )
                )
              ).flat()
            : Promise.resolve([]),
        ])
      : [[], []];

    const ultimasCalibracoes = new Map<string, UltimoServicoResumo>();
    calibracoes.forEach((calibracao) => {
      if (!calibracao.equipamento_id || !calibracao.data_validade) return;
      const atual = ultimasCalibracoes.get(calibracao.equipamento_id);
      if (
        !atual?.dataValidade ||
        calibracao.data_validade > atual.dataValidade
      ) {
        ultimasCalibracoes.set(calibracao.equipamento_id, {
          dataServico: calibracao.data_calibracao,
          dataValidade: calibracao.data_validade,
        });
      }
    });

    const ultimasPreventivas = new Map<string, UltimoServicoResumo>();
    preventivas.forEach((os) => {
      if (!os.equipamento_id || !os.checklist_preventiva?.length) return;

      os.checklist_preventiva.forEach((checklist) => {
        if (!checklist.data_validade) return;
        const atual = ultimasPreventivas.get(os.equipamento_id as string);
        if (
          !atual?.dataValidade ||
          checklist.data_validade > atual.dataValidade
        ) {
          ultimasPreventivas.set(os.equipamento_id as string, {
            dataServico: os.data_fechamento
              ? os.data_fechamento.slice(0, 10)
              : checklist.created_at?.slice(0, 10) || null,
            dataValidade: checklist.data_validade,
          });
        }
      });
    });

    const equipamentos =
      equipamentoIds.size > 0
        ? (
            await Promise.all(
              chunkArray(Array.from(equipamentoIds), 200).map((ids) =>
                supabase
                  .from("equipamentos")
                  .select(
                    `${selectEquipamento}, empresa:empresas (${selectEmpresa})`
                  )
                  .eq("ativo", true)
                  .eq("empresa.ativo", true)
                  .in("id", ids)
              )
            )
          ).flatMap((result) => {
            if (result.error) throw new Error(result.error.message);
            return (result.data || []) as unknown as EquipamentoSupabase[];
          })
        : [];

    const itens: VencimentoEquipamentoItem[] = [];

    equipamentos
      .filter((equipamento) => equipamento.empresa)
      .forEach((equipamento) => {
        const empresa = equipamento.empresa as EmpresaSupabase;
        const clienteNome = empresa.nome_fantasia || empresa.nome || "-";
        const clienteCidade = [empresa.cidade, empresa.estado]
          .filter(Boolean)
          .join(" - ") || null;
        const contato = getEmpresaContato(empresa);
        const tipoEquipamento = getVencimentoTipoEquipamento(equipamento);

        if (filtro.incluirCalibracao) {
          const ultimaCalibracao = ultimasCalibracoes.get(equipamento.id);
          const dataVencimento = maxDateIso(
            equipamento.data_proxima_calibracao,
            ultimaCalibracao?.dataValidade
          );

          if (dataVencimento && isDateInYear(dataVencimento, ano)) {
            itens.push({
              equipamentoId: equipamento.id,
              empresaId: empresa.id,
              clienteNome,
              clienteCidade,
              ...contato,
              tipoServico: "calibracao",
              dataVencimento,
              dataUltimoServico:
                ultimaCalibracao?.dataServico ||
                equipamento.data_ultima_calibracao ||
                null,
              tipoEquipamento,
              fabricante: equipamento.fabricante,
              modelo: equipamento.modelo,
              numeroSerie: equipamento.numero_serie,
              patrimonio: equipamento.patrimonio,
              tag: equipamento.tag,
              setor: equipamento.setor,
            });
          }
        }

        if (filtro.incluirPreventiva) {
          const ultimaPreventiva = ultimasPreventivas.get(equipamento.id);
          const dataVencimento = maxDateIso(
            equipamento.data_proxima_preventiva,
            ultimaPreventiva?.dataValidade
          );

          if (dataVencimento && isDateInYear(dataVencimento, ano)) {
            itens.push({
              equipamentoId: equipamento.id,
              empresaId: empresa.id,
              clienteNome,
              clienteCidade,
              ...contato,
              tipoServico: "preventiva",
              dataVencimento,
              dataUltimoServico:
                ultimaPreventiva?.dataServico ||
                equipamento.data_ultima_preventiva ||
                null,
              tipoEquipamento,
              fabricante: equipamento.fabricante,
              modelo: equipamento.modelo,
              numeroSerie: equipamento.numero_serie,
              patrimonio: equipamento.patrimonio,
              tag: equipamento.tag,
              setor: equipamento.setor,
            });
          }
        }
      });

    const mesesMap = new Map<string, VencimentoMesGrupo>();

    itens
      .sort((a, b) =>
        [
          a.dataVencimento.localeCompare(b.dataVencimento),
          a.clienteNome.localeCompare(b.clienteNome, "pt-BR"),
          a.tipoEquipamento.localeCompare(b.tipoEquipamento, "pt-BR"),
        ].find((result) => result !== 0) || 0
      )
      .forEach((item) => {
        const mes = getMonthKey(item.dataVencimento);
        if (!mesesMap.has(mes)) {
          mesesMap.set(mes, {
            mes,
            label: getMonthLabel(mes),
            clientes: [],
            total: 0,
          });
        }

        const mesGrupo = mesesMap.get(mes) as VencimentoMesGrupo;
        let clienteGrupo = mesGrupo.clientes.find(
          (cliente) => cliente.empresaId === item.empresaId
        );

        if (!clienteGrupo) {
          clienteGrupo = {
            empresaId: item.empresaId,
            clienteNome: item.clienteNome,
            cidade: item.clienteCidade,
            contato: item.contato,
            telefone: item.telefone,
            email: item.email,
            itens: [],
          };
          mesGrupo.clientes.push(clienteGrupo);
        }

        clienteGrupo.itens.push(item);
        mesGrupo.total += 1;
      });

    const meses = Array.from(mesesMap.values()).map((mes) => ({
      ...mes,
      clientes: mes.clientes
        .map((cliente) => ({
          ...cliente,
          itens: cliente.itens.sort(
            (a, b) =>
              a.dataVencimento.localeCompare(b.dataVencimento) ||
              a.tipoEquipamento.localeCompare(b.tipoEquipamento, "pt-BR")
          ),
        }))
        .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR")),
    }));

    return {
      ano,
      tipos,
      meses,
      total: itens.length,
    };
  },
};

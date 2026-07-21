import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";

export type OrdemServicoAcessorioSupabase = {
  id: string;
  ordem_servico_id: string;
  descricao: string;
  quantidade: number;
  observacoes: string | null;
  created_at: string;
};

export type OrdemServicoHistoricoSupabase = {
  id: string;
  ordem_servico_id: string;
  usuario_id: string | null;
  estado_anterior_id: string | null;
  estado_novo_id: string | null;
  acao: string;
  observacao: string | null;
  created_at: string;
};

export type OrdemServicoChecklistPreventivaItemSupabase = {
  id: string;
  checklist_id: string;
  procedimento_item_id: string | null;
  descricao: string;
  tipo_resposta: "conformidade" | "aprovacao_uso";
  resposta:
    | "conforme"
    | "nao_conforme"
    | "nao_aplica"
    | "aprovado"
    | "nao_aprovado"
    | "aprovado_com_restricao";
  observacao: string | null;
  ordem: number;
  created_at: string;
};

export type OrdemServicoChecklistPreventivaSupabase = {
  id: string;
  ordem_servico_id: string;
  procedimento_id: string;
  titulo_procedimento: string;
  tipo_equipamento_nome: string | null;
  validade_meses: number;
  data_validade: string | null;
  resultado_geral: "aprovado" | "nao_aprovado" | "aprovado_com_restricao";
  observacoes: string | null;
  created_at: string;
  itens?: OrdemServicoChecklistPreventivaItemSupabase[];
};

export type OrdemServicoAcessorioFormInput =
  | string
  | {
      descricao?: string | null;
      quantidade?: number | string | null;
      observacoes?: string | null;
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
  problema_relatado: string | null;
  origem_problema: string | null;
  descricao_servico: string | null;
  observacoes: string | null;
  prioridade: string;
  status_sistema: string;
  plano_ciclo_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  equipamento?: EquipamentoSupabase | null;
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
  historico?: OrdemServicoHistoricoSupabase[];
  checklist_preventiva?: OrdemServicoChecklistPreventivaSupabase[];
};

export type OrdemServicoFormInput = {
  empresaId: string;
  equipamentoId?: string;
  tipoOsId?: string;
  estadoOsId?: string;
  tecnicoResponsavelId?: string;
  dataAbertura?: string;
  dataFechamento?: string | null;
  solicitanteTexto?: string;
  responsavelTexto?: string;
  problemaRelatado?: string;
  origemProblema?: string;
  descricaoServico?: string;
  observacoes?: string;
  statusSistema?: string;
  acessorios?: OrdemServicoAcessorioFormInput[];
};

export type OrdensServicoSortField =
  | "numero"
  | "numero_ordem"
  | "data_abertura"
  | "created_at"
  | "responsavel_texto";

export type ListarOrdensServicoFiltros = {
  termo?: string;
  ocultarFechadas?: boolean;
  estadoNome?: string;
  solicitanteNome?: string;
  tipoServicoNome?: string;
  responsavelTecnico?: string;
  numero?: string;
};

export type ListarOrdensServicoPaginadoFiltros = ListarOrdensServicoFiltros & {
  page: number;
  limit: number;
  sortBy?: OrdensServicoSortField;
  ascending?: boolean;
};

export type OrdensServicoPaginadoResult = {
  items: OrdemServicoSupabase[];
  total: number;
};

export type OrdensServicoFilterOptions = {
  estados: string[];
  solicitantes: string[];
  tiposServico: string[];
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
  problema_relatado,
  origem_problema,
  descricao_servico,
  observacoes,
  prioridade,
  status_sistema,
  plano_ciclo_id,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    organizacao_id,
    nome,
    nome_fantasia,
    tipo_cliente,
    tipo_relacao,
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
    ativo,
    created_at,
    updated_at
  ),
  equipamento:equipamentos (
    id,
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
    empresa:empresas (
      id,
      organizacao_id,
      nome,
      nome_fantasia,
      tipo_cliente,
      tipo_relacao,
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
      ativo,
      created_at,
      updated_at
    ),
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
  ),
  checklist_preventiva:os_checklists_preventiva (
    id,
    ordem_servico_id,
    procedimento_id,
    titulo_procedimento,
    tipo_equipamento_nome,
    validade_meses,
    data_validade,
    resultado_geral,
    observacoes,
    created_at,
    itens:os_checklist_preventiva_itens (
      id,
      checklist_id,
      procedimento_item_id,
      descricao,
      tipo_resposta,
      resposta,
      observacao,
      ordem,
      created_at
    )
  ),
  historico:ordem_servico_historico (
    id,
    ordem_servico_id,
    usuario_id,
    estado_anterior_id,
    estado_novo_id,
    acao,
    observacao,
    created_at
  )
`;

const getSelectOrdensServico = async () => {
  const { data, error } = await supabase.rpc("current_user_perfil");

  if (error) throw new Error(error.message);

  return data === "solicitante"
    ? selectOrdensServico.replace("  descricao_servico,\n", "")
    : selectOrdensServico;
};

const selectOrdensServicoListagem = `
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
  problema_relatado,
  origem_problema,
  prioridade,
  status_sistema,
  plano_ciclo_id,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    organizacao_id,
    nome,
    nome_fantasia,
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
    ativo
  ),
  equipamento:equipamentos (
    id,
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

type OrdemServicoResumoRpcRow = {
  total_count?: number | string | null;
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
  problema_relatado: string | null;
  origem_problema: string | null;
  prioridade: string;
  status_sistema: string;
  plano_ciclo_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa_nome: string | null;
  empresa_nome_fantasia: string | null;
  empresa_cpf_cnpj: string | null;
  empresa_cep: string | null;
  empresa_rua: string | null;
  empresa_numero: string | null;
  empresa_complemento: string | null;
  empresa_bairro: string | null;
  empresa_cidade: string | null;
  empresa_estado: string | null;
  empresa_contato: string | null;
  empresa_email: string | null;
  empresa_celular: string | null;
  empresa_telefone: string | null;
  empresa_ativo: boolean | null;
  equipamento_organizacao_id: string | null;
  equipamento_empresa_id: string | null;
  equipamento_tipo_equipamento_id: string | null;
  equipamento_tipo_texto: string | null;
  equipamento_fabricante: string | null;
  equipamento_modelo: string | null;
  equipamento_numero_serie: string | null;
  equipamento_patrimonio: string | null;
  equipamento_tag: string | null;
  equipamento_setor: string | null;
  equipamento_status: string | null;
  equipamento_ativo: boolean | null;
  tipo_equipamento_nome: string | null;
  tipo_os_nome: string | null;
  estado_os_nome: string | null;
  estado_os_finaliza_os: boolean | null;
  estado_os_cancela_os: boolean | null;
};

const mapOrdemServicoResumo = (
  row: OrdemServicoResumoRpcRow
): OrdemServicoSupabase => ({
  id: row.id,
  organizacao_id: row.organizacao_id,
  numero: row.numero,
  empresa_id: row.empresa_id,
  equipamento_id: row.equipamento_id,
  tipo_os_id: row.tipo_os_id,
  estado_os_id: row.estado_os_id,
  tecnico_responsavel_id: row.tecnico_responsavel_id,
  solicitante_texto: row.solicitante_texto,
  responsavel_texto: row.responsavel_texto,
  data_abertura: row.data_abertura,
  data_fechamento: row.data_fechamento,
  problema_relatado: row.problema_relatado,
  origem_problema: row.origem_problema,
  descricao_servico: null,
  observacoes: null,
  prioridade: row.prioridade,
  status_sistema: row.status_sistema,
  plano_ciclo_id: row.plano_ciclo_id,
  ativo: row.ativo,
  created_at: row.created_at,
  updated_at: row.updated_at,
  empresa: row.empresa_id
    ? ({
        id: row.empresa_id,
        organizacao_id: row.organizacao_id,
        nome: row.empresa_nome || "",
        nome_fantasia: row.empresa_nome_fantasia,
        cpf_cnpj: row.empresa_cpf_cnpj,
        cep: row.empresa_cep,
        rua: row.empresa_rua,
        numero: row.empresa_numero,
        complemento: row.empresa_complemento,
        bairro: row.empresa_bairro,
        cidade: row.empresa_cidade,
        estado: row.empresa_estado,
        contato: row.empresa_contato,
        email: row.empresa_email,
        celular: row.empresa_celular,
        telefone: row.empresa_telefone,
        ativo: row.empresa_ativo ?? true,
      } as EmpresaSupabase)
    : null,
  equipamento: row.equipamento_id
    ? ({
        id: row.equipamento_id,
        organizacao_id: row.equipamento_organizacao_id || row.organizacao_id,
        empresa_id: row.equipamento_empresa_id || row.empresa_id,
        tipo_equipamento_id: row.equipamento_tipo_equipamento_id,
        tipo_texto: row.equipamento_tipo_texto,
        fabricante: row.equipamento_fabricante,
        modelo: row.equipamento_modelo,
        numero_serie: row.equipamento_numero_serie,
        patrimonio: row.equipamento_patrimonio,
        tag: row.equipamento_tag,
        setor: row.equipamento_setor,
        status: row.equipamento_status,
        ativo: row.equipamento_ativo ?? true,
        tipo_equipamento: row.equipamento_tipo_equipamento_id
          ? {
              id: row.equipamento_tipo_equipamento_id,
              nome: row.tipo_equipamento_nome || "",
            }
          : null,
      } as EquipamentoSupabase)
    : null,
  tipo_os: row.tipo_os_id
    ? {
        id: row.tipo_os_id,
        nome: row.tipo_os_nome || "",
      }
    : null,
  estado_os: row.estado_os_id
    ? {
        id: row.estado_os_id,
        nome: row.estado_os_nome || "",
        finaliza_os: row.estado_os_finaliza_os ?? false,
        cancela_os: row.estado_os_cancela_os ?? false,
      }
    : null,
});

type OrdemServicoDatabasePayload = {
  empresa_id: string;
  equipamento_id: string | null;
  tipo_os_id: string | null;
  estado_os_id: string | null;
  tecnico_responsavel_id: string | null;
  data_abertura?: string;
  data_fechamento?: string | null;
  solicitante_texto: string | null;
  responsavel_texto: string | null;
  problema_relatado: string | null;
  origem_problema: string | null;
  descricao_servico: string | null;
  observacoes: string | null;
  status_sistema: string;
};

const buscarEstadoOperacional = async (estadoOsId?: string | null) => {
  if (!estadoOsId) return null;

  const { data, error } = await supabase
    .from("estados_os")
    .select("id, finaliza_os, cancela_os")
    .eq("id", estadoOsId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const toDatabasePayload = async (
  input: OrdemServicoFormInput,
  options: {
    dataAberturaFallback?: string | null;
    dataFechamentoFallback?: string | null;
  } = {}
): Promise<OrdemServicoDatabasePayload> => {
  const estado = await buscarEstadoOperacional(input.estadoOsId);
  const dataAbertura = input.dataAbertura || options.dataAberturaFallback || null;
  const payload: OrdemServicoDatabasePayload = {
    empresa_id: input.empresaId,
    equipamento_id: input.equipamentoId || null,
    tipo_os_id: input.tipoOsId || null,
    estado_os_id: input.estadoOsId || null,
    tecnico_responsavel_id: input.tecnicoResponsavelId || null,
    ...(input.dataAbertura ? { data_abertura: input.dataAbertura } : {}),
    solicitante_texto: input.solicitanteTexto || null,
    responsavel_texto: input.responsavelTexto || null,
    problema_relatado: input.problemaRelatado || null,
    origem_problema: input.origemProblema || null,
    descricao_servico: input.descricaoServico || null,
    observacoes: input.observacoes || null,
    status_sistema: input.statusSistema || "aberta",
  };

  if (estado?.finaliza_os || estado?.cancela_os) {
    const fechamento =
      input.dataFechamento ||
      options.dataFechamentoFallback ||
      dataAbertura ||
      new Date().toISOString();

    if (!input.dataAbertura && !options.dataAberturaFallback) {
      payload.data_abertura = fechamento;
    }

    payload.data_fechamento = fechamento;
    payload.status_sistema = estado.finaliza_os ? "fechada" : "cancelada";
    return payload;
  }

  payload.status_sistema = "aberta";
  payload.data_fechamento = null;
  return payload;
};

type AcessorioNormalizado = {
  descricao: string;
  quantidade: number;
  observacoes: string | null;
};

const normalizarQuantidade = (
  quantidade?: number | string | null
) => {
  const value = Number(quantidade || 1);

  return Number.isFinite(value) && value > 0 ? value : 1;
};

const normalizarAcessorios = (
  acessorios?: OrdemServicoAcessorioFormInput[]
) => {
  const map = new Map<string, AcessorioNormalizado>();

  (acessorios || []).forEach((item) => {
    const descricao =
      typeof item === "string" ? item.trim() : item.descricao?.trim();

    if (!descricao) return;

    const chave = descricao.toLowerCase().replace(/\s+/g, " ");
    const quantidade =
      typeof item === "string" ? 1 : normalizarQuantidade(item.quantidade);
    const observacoes =
      typeof item === "string" ? null : item.observacoes?.trim() || null;

    if (!map.has(chave)) {
      map.set(chave, {
        descricao,
        quantidade,
        observacoes,
      });
    }
  });

  return Array.from(map.values());
};

const texto = (value?: string | null) => value?.trim() || "";

const chaveAcessorio = (descricao: string) =>
  descricao.trim().toLowerCase().replace(/\s+/g, " ");

const normalizarListaAcessoriosParaComparacao = (
  acessorios: Array<{
    descricao?: string | null;
    quantidade?: number | string | null;
  }> = []
) =>
  acessorios
    .map((item) => ({
      descricao: item.descricao?.trim()
        ? chaveAcessorio(item.descricao)
        : "",
      quantidade: normalizarQuantidade(item.quantidade),
    }))
    .filter((item) => item.descricao)
    .sort((a, b) => a.descricao.localeCompare(b.descricao));

const buscarNomeEstado = async (estadoId?: string | null) => {
  if (!estadoId) return "não informado";

  const { data, error } = await supabase
    .from("estados_os")
    .select("nome")
    .eq("id", estadoId)
    .single();

  if (error || !data?.nome) {
    return "não informado";
  }

  return data.nome;
};

const montarDescricaoAlteracoes = async ({
  osAnterior,
  input,
  acessoriosAnteriores,
  acessoriosNovos,
}: {
  osAnterior: {
    empresa_id: string | null;
    equipamento_id: string | null;
    tipo_os_id: string | null;
    estado_os_id: string | null;
    responsavel_texto: string | null;
    problema_relatado: string | null;
    origem_problema: string | null;
    descricao_servico: string | null;
    observacoes: string | null;
  };
  input: OrdemServicoFormInput;
  acessoriosAnteriores: {
    descricao: string | null;
    quantidade?: number | string | null;
  }[] | null;
  acessoriosNovos: AcessorioNormalizado[];
}) => {
  const alteracoes: string[] = [];

  if (texto(osAnterior.empresa_id) !== texto(input.empresaId)) {
    alteracoes.push("Solicitante alterado.");
  }

  if (texto(osAnterior.equipamento_id) !== texto(input.equipamentoId)) {
    alteracoes.push("Equipamento alterado.");
  }

  if (texto(osAnterior.tipo_os_id) !== texto(input.tipoOsId)) {
    alteracoes.push("Tipo de serviço alterado.");
  }

  if (texto(osAnterior.estado_os_id) !== texto(input.estadoOsId)) {
    const estadoAnteriorNome = await buscarNomeEstado(osAnterior.estado_os_id);
    const estadoNovoNome = await buscarNomeEstado(input.estadoOsId);

    alteracoes.push(
      `Estado alterado: De "${estadoAnteriorNome}" para "${estadoNovoNome}".`
    );
  }

  if (texto(osAnterior.responsavel_texto) !== texto(input.responsavelTexto)) {
    alteracoes.push("Técnico executor alterado.");
  }

  if (texto(osAnterior.problema_relatado) !== texto(input.problemaRelatado)) {
    alteracoes.push("Problema relatado alterado.");
  }

  if (texto(osAnterior.origem_problema) !== texto(input.origemProblema)) {
    alteracoes.push("Origem do problema alterada.");
  }

  if (texto(osAnterior.descricao_servico) !== texto(input.descricaoServico)) {
    alteracoes.push("Descrição do serviço alterada.");
  }

  if (texto(osAnterior.observacoes) !== texto(input.observacoes)) {
    alteracoes.push("Observações alteradas.");
  }

  const anterioresNormalizados = normalizarListaAcessoriosParaComparacao(
    acessoriosAnteriores || []
  );
  const novosNormalizados =
    normalizarListaAcessoriosParaComparacao(acessoriosNovos);
  const anteriores = new Set(
    anterioresNormalizados.map((item) => item.descricao)
  );
  const novos = new Set(novosNormalizados.map((item) => item.descricao));

  const adicionados = acessoriosNovos
    .filter((item) => !anteriores.has(chaveAcessorio(item.descricao)))
    .map((item) => item.descricao);

  const removidos = (acessoriosAnteriores || [])
    .map((item) => item.descricao?.trim())
    .filter((descricao): descricao is string => Boolean(descricao))
    .filter((descricao) => !novos.has(chaveAcessorio(descricao)));

  if (adicionados.length > 0) {
    alteracoes.push(`Acessórios adicionados: ${adicionados.join(", ")}.`);
  }

  if (removidos.length > 0) {
    alteracoes.push(`Acessórios removidos: ${removidos.join(", ")}.`);
  }

  return alteracoes.length > 0
    ? alteracoes.join("\n")
    : "Salvo sem alterações relevantes identificadas.";
};

const registrarHistorico = async ({
  ordemServicoId,
  acao,
  observacao,
  estadoAnteriorId = null,
  estadoNovoId = null,
}: {
  ordemServicoId: string;
  acao: string;
  observacao?: string;
  estadoAnteriorId?: string | null;
  estadoNovoId?: string | null;
}) => {
  const { error } = await supabase.from("ordem_servico_historico").insert({
    ordem_servico_id: ordemServicoId,
    usuario_id: null,
    estado_anterior_id: estadoAnteriorId,
    estado_novo_id: estadoNovoId,
    acao,
    observacao: observacao || null,
  });

  if (error) {
    console.warn("Erro ao registrar histórico da OS:", error.message);
  }
};

const atualizarStatusEquipamento = async (
  equipamentoId: string | null | undefined,
  status: "Ativo" | "Em manutenção"
) => {
  if (!equipamentoId) return;

  const { data: equipamento, error: equipamentoError } = await supabase
    .from("equipamentos")
    .select("id, ativo, status")
    .eq("id", equipamentoId)
    .maybeSingle();

  if (equipamentoError) {
    throw new Error(equipamentoError.message);
  }

  if (!equipamento || equipamento.ativo === false) return;
  if (equipamento.status === "Locado") return;

  const { error } = await supabase
    .from("equipamentos")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", equipamentoId);

  if (error) {
    throw new Error(error.message);
  }
};

type OrdemAbertaParaStatusEquipamento = {
  id: string;
  tipo_os:
    | {
        nome: string | null;
      }
    | {
        nome: string | null;
      }[]
    | null;
};

const normalizarTexto = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getNomeTipoOs = (tipoOs: OrdemAbertaParaStatusEquipamento["tipo_os"]) =>
  Array.isArray(tipoOs) ? tipoOs[0]?.nome : tipoOs?.nome;

const isTipoOsPreventiva = (tipoOs: OrdemAbertaParaStatusEquipamento["tipo_os"]) =>
  normalizarTexto(getNomeTipoOs(tipoOs)).includes("preventiva");

const recalcularStatusEquipamentoPorOS = async (
  equipamentoId: string | null | undefined,
  ignorarOrdemServicoId?: string
) => {
  if (!equipamentoId) return;

  const { data, error } = await supabase
    .from("ordens_servico")
    .select(
      `
        id,
        tipo_os:tipos_os (
          nome
        )
      `
    )
    .eq("equipamento_id", equipamentoId)
    .eq("ativo", true)
    .eq("oculta_operacao", false)
    .eq("status_sistema", "aberta");

  if (error) {
    throw new Error(error.message);
  }

  const temOsAbertaNaoPreventiva = (
    (data || []) as unknown as OrdemAbertaParaStatusEquipamento[]
  ).some(
    (os) =>
      os.id !== ignorarOrdemServicoId && !isTipoOsPreventiva(os.tipo_os)
  );

  await atualizarStatusEquipamento(
    equipamentoId,
    temOsAbertaNaoPreventiva ? "Em manutenção" : "Ativo"
  );
};

const buscarOrdemServicoPorId = async (id: string) => {
  const select = await getSelectOrdensServico();
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(select)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as OrdemServicoSupabase;
};

const buscarEmpresaIdsPorTermo = async (termo: string) => {
  const value = `%${termo.trim()}%`;
  const { data, error } = await supabase
    .from("empresas")
    .select("id")
    .or(`nome.ilike.${value},nome_fantasia.ilike.${value},cpf_cnpj.ilike.${value}`)
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const buscarEmpresaIdsPorNome = async (nome: string) => {
  const [porNome, porFantasia] = await Promise.all([
    supabase.from("empresas").select("id").eq("nome", nome).limit(300),
    supabase.from("empresas").select("id").eq("nome_fantasia", nome).limit(300),
  ]);

  if (porNome.error) throw new Error(porNome.error.message);
  if (porFantasia.error) throw new Error(porFantasia.error.message);

  return Array.from(
    new Set([
      ...(porNome.data || []).map((item) => item.id as string),
      ...(porFantasia.data || []).map((item) => item.id as string),
    ])
  );
};

const buscarEquipamentoIdsPorTermo = async (termo: string) => {
  const rawTerm = termo.trim();
  const value = `%${rawTerm}%`;
  const valueNormalizado = `%${normalizarTexto(rawTerm)}%`;
  const filters = [
    `tipo_texto.ilike.${value}`,
    `fabricante.ilike.${value}`,
    `modelo.ilike.${value}`,
    `numero_serie.ilike.${value}`,
    `patrimonio.ilike.${value}`,
    `tag.ilike.${value}`,
    `setor.ilike.${value}`,
  ];

  if (valueNormalizado !== value) {
    filters.push(
      `tipo_texto.ilike.${valueNormalizado}`,
      `fabricante.ilike.${valueNormalizado}`,
      `modelo.ilike.${valueNormalizado}`,
      `setor.ilike.${valueNormalizado}`
    );
  }

  const { data, error } = await supabase
    .from("equipamentos")
    .select("id")
    .or(filters.join(","))
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const buscarTipoOsIdsPorNome = async (nome: string) => {
  const { data, error } = await supabase
    .from("tipos_os")
    .select("id")
    .eq("nome", nome)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const buscarEstadoOsIdsPorNome = async (nome: string) => {
  const { data, error } = await supabase
    .from("estados_os")
    .select("id")
    .eq("nome", nome)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const aplicarFiltrosOrdensServico = async <T>(
  query: T,
  filtros?: ListarOrdensServicoFiltros
) => {
  let nextQuery = query as any;

  if (filtros?.ocultarFechadas) {
    nextQuery = nextQuery.not("status_sistema", "in", "(fechada,cancelada)");
  }

  if (filtros?.estadoNome) {
    const estadoIds = await buscarEstadoOsIdsPorNome(filtros.estadoNome);
    nextQuery = estadoIds.length
      ? nextQuery.in("estado_os_id", estadoIds)
      : nextQuery.eq("estado_os_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filtros?.solicitanteNome) {
    const empresaIds = await buscarEmpresaIdsPorNome(filtros.solicitanteNome);
    nextQuery = empresaIds.length
      ? nextQuery.in("empresa_id", empresaIds)
      : nextQuery.eq("empresa_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filtros?.tipoServicoNome) {
    const tipoIds = await buscarTipoOsIdsPorNome(filtros.tipoServicoNome);
    nextQuery = tipoIds.length
      ? nextQuery.in("tipo_os_id", tipoIds)
      : nextQuery.eq("tipo_os_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filtros?.responsavelTecnico?.trim()) {
    nextQuery = nextQuery.ilike(
      "responsavel_texto",
      `%${filtros.responsavelTecnico.trim()}%`
    );
  }

  if (filtros?.numero?.trim()) {
    nextQuery = nextQuery.ilike("numero", `%${filtros.numero.trim()}%`);
  }

  if (filtros?.termo?.trim()) {
    const rawTerm = filtros.termo.trim();
    const termo = `%${rawTerm}%`;
    const empresaIds = await buscarEmpresaIdsPorTermo(rawTerm);
    const equipamentoIds = await buscarEquipamentoIdsPorTermo(rawTerm);

    const orFilters = [
      `numero.ilike.${termo}`,
      `solicitante_texto.ilike.${termo}`,
      `responsavel_texto.ilike.${termo}`,
      `problema_relatado.ilike.${termo}`,
      `origem_problema.ilike.${termo}`,
    ];

    if (empresaIds.length) {
      orFilters.push(`empresa_id.in.(${empresaIds.join(",")})`);
    }

    if (equipamentoIds.length) {
      orFilters.push(`equipamento_id.in.(${equipamentoIds.join(",")})`);
    }

    nextQuery = nextQuery.or(orFilters.join(","));
  }

  return nextQuery as T;
};

export const ordensServicoService = {
  async listarOpcoesFiltros(): Promise<OrdensServicoFilterOptions> {
    const { data, error } = await supabase.rpc(
      "listar_opcoes_filtros_ordens_servico"
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = (data || {}) as {
      estados?: string[];
      solicitantes?: string[];
      tipos_servico?: string[];
    };

    return {
      estados: result.estados || [],
      solicitantes: result.solicitantes || [],
      tiposServico: result.tipos_servico || [],
    };
  },

  async buscarPorId(id: string) {
    return buscarOrdemServicoPorId(id);
  },

  async listar() {
    const select = await getSelectOrdensServico();
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(select)
      .eq("ativo", true)
      .eq("oculta_operacao", false)
      .order("numero_ordem", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as OrdemServicoSupabase[];
  },

  async listarPaginado(
    filtros: ListarOrdensServicoPaginadoFiltros
  ): Promise<OrdensServicoPaginadoResult> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.max(1, filtros.limit || 25);
    const from = (page - 1) * limit;
    const sortBy = filtros.sortBy || "numero_ordem";

    const { data, error } = await supabase.rpc("listar_ordens_servico_resumo", {
      p_termo: filtros.termo || null,
      p_ocultar_fechadas: filtros.ocultarFechadas || false,
      p_estado_nome: filtros.estadoNome || null,
      p_solicitante_nome: filtros.solicitanteNome || null,
      p_tipo_servico_nome: filtros.tipoServicoNome || null,
      p_responsavel_tecnico: filtros.responsavelTecnico || null,
      p_numero: filtros.numero || null,
      p_offset: from,
      p_limit: limit,
      p_sort_by: sortBy,
      p_ascending: filtros.ascending ?? false,
    });

    if (error) {
      throw new Error(error.message);
    }

    const items = ((data || []) as OrdemServicoResumoRpcRow[])
      .map(mapOrdemServicoResumo);
    const totalCount = data?.[0]?.total_count;
    const total =
      typeof totalCount === "number"
        ? totalCount
        : typeof totalCount === "string"
          ? Number(totalCount)
          : from + items.length;

    return {
      items,
      total: Number.isFinite(total) ? total : from + items.length,
    };
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

    const payload = await toDatabasePayload(input);

    const { data: osCriada, error } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        ...payload,
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

    await registrarHistorico({
      ordemServicoId: osCriada.id,
      acao: "criada",
      observacao: "Ordem de Serviço criada.",
      estadoNovoId: input.estadoOsId || null,
    });

    await recalcularStatusEquipamentoPorOS(input.equipamentoId);

    return buscarOrdemServicoPorId(osCriada.id);
  },

  async atualizar(id: string, input: OrdemServicoFormInput) {
    const { data: osAnterior, error: osAnteriorError } = await supabase
      .from("ordens_servico")
      .select(
        `
          id,
          empresa_id,
          equipamento_id,
          tipo_os_id,
          estado_os_id,
          data_abertura,
          data_fechamento,
          responsavel_texto,
          problema_relatado,
          origem_problema,
          descricao_servico,
          observacoes,
          status_sistema
        `
      )
      .eq("id", id)
      .single();

    if (osAnteriorError) {
      throw new Error(osAnteriorError.message);
    }

    const { data: acessoriosAnteriores } = await supabase
      .from("ordem_servico_acessorios")
      .select("descricao, quantidade")
      .eq("ordem_servico_id", id);

    const acessorios = normalizarAcessorios(input.acessorios);
    const payload = await toDatabasePayload(input, {
      dataAberturaFallback: osAnterior.data_abertura,
      dataFechamentoFallback: osAnterior.data_fechamento,
    });

    const { error } = await supabase
      .from("ordens_servico")
      .update(payload)
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

    const observacaoHistorico = await montarDescricaoAlteracoes({
      osAnterior,
      input,
      acessoriosAnteriores: acessoriosAnteriores || [],
      acessoriosNovos: acessorios,
    });

    await registrarHistorico({
      ordemServicoId: id,
      acao: "editada",
      observacao: observacaoHistorico,
      estadoAnteriorId: osAnterior.estado_os_id,
      estadoNovoId: input.estadoOsId || null,
    });

    const equipamentoAtualId = input.equipamentoId || null;

    await recalcularStatusEquipamentoPorOS(equipamentoAtualId);

    if (
      osAnterior.equipamento_id &&
      osAnterior.equipamento_id !== equipamentoAtualId
    ) {
      await recalcularStatusEquipamentoPorOS(osAnterior.equipamento_id);
    }

    return buscarOrdemServicoPorId(id);
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

    const { data: osAtual, error: osAtualError } = await supabase
      .from("ordens_servico")
      .select("id, estado_os_id")
      .eq("id", id)
      .single();

    if (osAtualError) {
      throw new Error(osAtualError.message);
    }

    const estadoAnteriorNome = await buscarNomeEstado(osAtual.estado_os_id);
    const estadoNovoNome = estado.nome || (await buscarNomeEstado(estadoOsId));

    const statusSistema = estado.finaliza_os
      ? "fechada"
      : estado.cancela_os
        ? "cancelada"
        : "aberta";

    const dataFechamento =
      estado.finaliza_os || estado.cancela_os ? new Date().toISOString() : null;

    const select = await getSelectOrdensServico();
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoOsId,
        status_sistema: statusSistema,
        data_fechamento: dataFechamento,
      })
      .eq("id", id)
      .select(select)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let observacaoHistorico = `Estado alterado: De "${estadoAnteriorNome}" para "${estadoNovoNome}".`;

    if (estado.finaliza_os) {
      observacaoHistorico += " Ordem de Serviço fechada.";
    }

    if (estado.cancela_os) {
      observacaoHistorico += " Ordem de Serviço cancelada.";
    }

    await registrarHistorico({
      ordemServicoId: id,
      acao: "estado_alterado",
      observacao: observacaoHistorico,
      estadoAnteriorId: osAtual.estado_os_id,
      estadoNovoId: estado.id,
    });

    await recalcularStatusEquipamentoPorOS(data.equipamento_id);

    return data as unknown as OrdemServicoSupabase;
  },

  async excluir(id: string) {
    const { data: osAtual, error: osAtualError } = await supabase
      .from("ordens_servico")
      .select("id, estado_os_id, status_sistema, equipamento_id")
      .eq("id", id)
      .single();

    if (osAtualError) {
      throw new Error(osAtualError.message);
    }

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        ativo: false,
        status_sistema: "cancelada",
        data_fechamento: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    await registrarHistorico({
      ordemServicoId: id,
      acao: "excluida",
      observacao: "Ordem de Serviço excluída logicamente.",
      estadoAnteriorId: osAtual.estado_os_id,
      estadoNovoId: osAtual.estado_os_id,
    });

    await recalcularStatusEquipamentoPorOS(osAtual.equipamento_id);

    const select = await getSelectOrdensServico();
    const { data, error: selectError } = await supabase
      .from("ordens_servico")
      .select(select)
      .eq("id", id)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },
};

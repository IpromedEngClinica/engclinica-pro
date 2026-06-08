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
  solicitanteTexto?: string;
  responsavelTexto?: string;
  problemaRelatado?: string;
  origemProblema?: string;
  descricaoServico?: string;
  observacoes?: string;
  statusSistema?: string;
  acessorios?: OrdemServicoAcessorioFormInput[];
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

const toDatabasePayload = (input: OrdemServicoFormInput) => ({
  empresa_id: input.empresaId,
  equipamento_id: input.equipamentoId || null,
  tipo_os_id: input.tipoOsId || null,
  estado_os_id: input.estadoOsId || null,
  tecnico_responsavel_id: input.tecnicoResponsavelId || null,
  solicitante_texto: input.solicitanteTexto || null,
  responsavel_texto: input.responsavelTexto || null,
  problema_relatado: input.problemaRelatado || null,
  origem_problema: input.origemProblema || null,
  descricao_servico: input.descricaoServico || null,
  observacoes: input.observacoes || null,
  status_sistema: input.statusSistema || "aberta",
});

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
    alteracoes.push("Responsável técnico alterado.");
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
    .select("id, ativo")
    .eq("id", equipamentoId)
    .maybeSingle();

  if (equipamentoError) {
    throw new Error(equipamentoError.message);
  }

  if (!equipamento || equipamento.ativo === false) return;

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

const atualizarEquipamentoParaAtivoSeSemOSAberta = async (
  equipamentoId: string | null | undefined,
  ordemServicoIdAtual: string
) => {
  if (!equipamentoId) return;

  const { count, error } = await supabase
    .from("ordens_servico")
    .select("id", { count: "exact", head: true })
    .eq("equipamento_id", equipamentoId)
    .eq("ativo", true)
    .eq("status_sistema", "aberta")
    .neq("id", ordemServicoIdAtual);

  if (error) {
    throw new Error(error.message);
  }

  if ((count || 0) === 0) {
    await atualizarStatusEquipamento(equipamentoId, "Ativo");
  }
};

const buscarOrdemServicoPorId = async (id: string) => {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(selectOrdensServico)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as OrdemServicoSupabase;
};

export const ordensServicoService = {
  async buscarPorId(id: string) {
    return buscarOrdemServicoPorId(id);
  },

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

    const { data: osCriada, error } = await supabase
      .from("ordens_servico")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
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

    await atualizarStatusEquipamento(input.equipamentoId, "Em manutenção");

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

    const { error } = await supabase
      .from("ordens_servico")
      .update(toDatabasePayload(input))
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

    if (input.statusSistema === "fechada" || input.statusSistema === "cancelada") {
      await atualizarEquipamentoParaAtivoSeSemOSAberta(
        input.equipamentoId || osAnterior.equipamento_id,
        id
      );
    } else if (input.equipamentoId) {
      await atualizarStatusEquipamento(input.equipamentoId, "Em manutenção");
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

    const { data, error } = await supabase
      .from("ordens_servico")
      .update({
        estado_os_id: estadoOsId,
        status_sistema: statusSistema,
        data_fechamento: dataFechamento,
      })
      .eq("id", id)
      .select(selectOrdensServico)
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

    if (estado.finaliza_os || estado.cancela_os) {
      await atualizarEquipamentoParaAtivoSeSemOSAberta(data.equipamento_id, id);
    } else {
      await atualizarStatusEquipamento(data.equipamento_id, "Em manutenção");
    }

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

    await atualizarEquipamentoParaAtivoSeSemOSAberta(osAtual.equipamento_id, id);

    const { data, error: selectError } = await supabase
      .from("ordens_servico")
      .select(selectOrdensServico)
      .eq("id", id)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    return data as unknown as OrdemServicoSupabase;
  },
};

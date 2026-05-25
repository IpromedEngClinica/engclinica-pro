import { supabase } from "@/lib/supabaseClient";

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
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    ativo: boolean;
  } | null;
  equipamento?: {
    id: string;
    tipo_texto: string | null;
    fabricante: string | null;
    modelo: string | null;
    numero_serie: string | null;
    patrimonio: string | null;
    tag: string | null;
    setor: string | null;
    ativo: boolean;
    tipo_equipamento?: {
      id: string;
      nome: string;
    } | null;
  } | null;
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
  acessorios?: string[];
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
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
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

const normalizarAcessorios = (acessorios?: string[]) => {
  const map = new Map<string, string>();

  (acessorios || []).forEach((item) => {
    const descricao = item.trim();

    if (!descricao) return;

    const chave = descricao.toLowerCase().replace(/\s+/g, " ");

    if (!map.has(chave)) {
      map.set(chave, descricao);
    }
  });

  return Array.from(map.values()).map((descricao) => ({
    descricao,
    quantidade: 1,
    observacoes: null,
  }));
};

const texto = (value?: string | null) => value?.trim() || "";

const chaveAcessorio = (descricao: string) =>
  descricao.trim().toLowerCase().replace(/\s+/g, " ");

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
  acessoriosAnteriores: { descricao: string | null }[] | null;
  acessoriosNovos: {
    descricao: string;
    quantidade: number;
    observacoes: null;
  }[];
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

  const anteriores = new Set(
    (acessoriosAnteriores || [])
      .map((item) => item.descricao?.trim())
      .filter((descricao): descricao is string => Boolean(descricao))
      .map(chaveAcessorio)
  );

  const novos = new Set(
    acessoriosNovos
      .map((item) => item.descricao?.trim())
      .filter((descricao): descricao is string => Boolean(descricao))
      .map(chaveAcessorio)
  );

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

export const ordensServicoService = {
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

    const { data, error: selectError } = await supabase
      .from("ordens_servico")
      .select(selectOrdensServico)
      .eq("id", osCriada.id)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    return data as unknown as OrdemServicoSupabase;
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
      .select("descricao")
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

    return data as unknown as OrdemServicoSupabase;
  },

  async excluir(id: string) {
    const { data: osAtual, error: osAtualError } = await supabase
      .from("ordens_servico")
      .select("id, estado_os_id, status_sistema")
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

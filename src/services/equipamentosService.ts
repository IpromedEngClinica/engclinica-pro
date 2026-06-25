import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";

export type EquipamentoSupabase = {
  id: string;
  numero_cadastro: number;
  organizacao_id: string;
  empresa_id: string;
  tipo_equipamento_id: string | null;
  tipo_texto: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
  setor: string | null;
  empresa_setor_id: string | null;
  local_instalacao: string | null;
  status: string;
  data_aquisicao: string | null;
  data_instalacao: string | null;
  data_ultima_preventiva: string | null;
  data_proxima_preventiva: string | null;
  data_ultima_calibracao: string | null;
  data_proxima_calibracao: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  tipo_equipamento?: {
    id: string;
    nome: string;
  } | null;
};

export type EquipamentoFormInput = {
  empresaId: string;
  tipoEquipamentoId?: string;
  tipoTexto?: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  patrimonio?: string;
  tag?: string;
  setor?: string;
  status?: string;
  dataUltimaPreventiva?: string;
  dataProximaPreventiva?: string;
  dataUltimaCalibracao?: string;
  dataProximaCalibracao?: string;
  observacoes?: string;
};

export type StatusEquipamentoFiltro = "ativos" | "todos" | "desativados";

export type ListarEquipamentosFiltros = {
  statusFiltro?: StatusEquipamentoFiltro;
  empresaId?: string;
  termo?: string;
  estado?: string;
  empresaNome?: string;
  tipoEquipamentoNome?: string;
  fabricante?: string;
  modelo?: string;
  tag?: string;
  serie?: string;
  patrimonio?: string;
  setor?: string;
};

export type EquipamentosSortField =
  | "numero_cadastro"
  | "status"
  | "modelo"
  | "fabricante"
  | "tag"
  | "numero_serie"
  | "patrimonio"
  | "setor"
  | "created_at";

export type ListarEquipamentosPaginadoFiltros = ListarEquipamentosFiltros & {
  page: number;
  limit: number;
  sortBy?: EquipamentosSortField;
  ascending?: boolean;
};

export type EquipamentosPaginadoResult = {
  items: EquipamentoSupabase[];
  total: number;
};

const selectEquipamentos = `
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
  empresa_setor_id,
  local_instalacao,
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
`;

const selectEquipamentosListagem = `
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
  empresa_setor_id,
  local_instalacao,
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

const selectEmpresasEquipamentoListagem = `
  id,
  numero_cadastro,
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

const toDatabasePayload = (input: EquipamentoFormInput) => ({
  empresa_id: input.empresaId,
  tipo_equipamento_id: input.tipoEquipamentoId || null,
  tipo_texto: input.tipoTexto || null,
  fabricante: input.fabricante || null,
  modelo: input.modelo || null,
  numero_serie: input.numeroSerie || null,
  patrimonio: input.patrimonio || null,
  tag: input.tag || null,
  setor: input.setor || null,
  status: input.status || "Ativo",
  data_ultima_preventiva: input.dataUltimaPreventiva || null,
  data_proxima_preventiva: input.dataProximaPreventiva || null,
  data_ultima_calibracao: input.dataUltimaCalibracao || null,
  data_proxima_calibracao: input.dataProximaCalibracao || null,
  observacoes: input.observacoes || null,
});

const EQUIPAMENTOS_PAGE_SIZE = 1000;

const normalizarTextoBusca = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const aplicarFiltrosEquipamentos = async <T>(
  query: T,
  filtros?: ListarEquipamentosFiltros
) => {
  let nextQuery = query as any;
  const statusFiltro = filtros?.statusFiltro || "ativos";

  if (statusFiltro === "ativos") {
    nextQuery = nextQuery.eq("ativo", true);
  }

  if (statusFiltro === "desativados") {
    nextQuery = nextQuery.eq("ativo", false);
  }

  if (filtros?.empresaId) {
    nextQuery = nextQuery.eq("empresa_id", filtros.empresaId);
  }

  if (filtros?.empresaNome) {
    const empresaIds = await buscarEmpresaIdsPorNome(filtros.empresaNome);
    nextQuery = empresaIds.length
      ? nextQuery.in("empresa_id", empresaIds)
      : nextQuery.eq("empresa_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filtros?.tipoEquipamentoNome) {
    const tipoIds = await buscarTipoEquipamentoIdsPorNome(
      filtros.tipoEquipamentoNome
    );
    nextQuery = tipoIds.length
      ? nextQuery.in("tipo_equipamento_id", tipoIds)
      : nextQuery.eq(
          "tipo_equipamento_id",
          "00000000-0000-0000-0000-000000000000"
        );
  }

  if (filtros?.estado) {
    nextQuery = nextQuery.eq("status", filtros.estado);
  }

  if (filtros?.fabricante) {
    nextQuery = nextQuery.eq("fabricante", filtros.fabricante);
  }

  if (filtros?.setor) {
    nextQuery = nextQuery.eq("setor", filtros.setor);
  }

  if (filtros?.modelo?.trim()) {
    nextQuery = nextQuery.ilike("modelo", `%${filtros.modelo.trim()}%`);
  }

  if (filtros?.tag?.trim()) {
    nextQuery = nextQuery.ilike("tag", `%${filtros.tag.trim()}%`);
  }

  if (filtros?.serie?.trim()) {
    nextQuery = nextQuery.ilike("numero_serie", `%${filtros.serie.trim()}%`);
  }

  if (filtros?.patrimonio?.trim()) {
    nextQuery = nextQuery.ilike("patrimonio", `%${filtros.patrimonio.trim()}%`);
  }

  if (filtros?.termo?.trim()) {
    const rawTerm = filtros.termo.trim();
    const termo = `%${rawTerm}%`;
    const termoNormalizado = `%${normalizarTextoBusca(rawTerm)}%`;
    const empresaIds = await buscarEmpresaIdsPorTermo(rawTerm);

    const orFilters = [
      `tipo_texto.ilike.${termo}`,
      `fabricante.ilike.${termo}`,
      `modelo.ilike.${termo}`,
      `numero_serie.ilike.${termo}`,
      `patrimonio.ilike.${termo}`,
      `tag.ilike.${termo}`,
      `setor.ilike.${termo}`,
    ];

    if (termoNormalizado !== termo) {
      orFilters.push(
        `tipo_texto.ilike.${termoNormalizado}`,
        `fabricante.ilike.${termoNormalizado}`,
        `modelo.ilike.${termoNormalizado}`,
        `setor.ilike.${termoNormalizado}`
      );
    }

    if (empresaIds.length) {
      orFilters.push(`empresa_id.in.(${empresaIds.join(",")})`);
    }

    nextQuery = nextQuery.or(orFilters.join(","));
  }

  return nextQuery as T;
};

const buscarEmpresaIdsPorTermo = async (termo: string) => {
  const value = `%${termo.trim()}%`;
  const { data, error } = await supabase
    .from("empresas")
    .select("id")
    .or(`nome.ilike.${value},nome_fantasia.ilike.${value},cpf_cnpj.ilike.${value}`)
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const buscarEmpresaIdsPorNome = async (nome: string) => {
  const [porNome, porFantasia] = await Promise.all([
    supabase
      .from("empresas")
      .select("id")
      .eq("nome", nome)
      .limit(500),
    supabase
      .from("empresas")
      .select("id")
      .eq("nome_fantasia", nome)
      .limit(500),
  ]);

  if (porNome.error) {
    throw new Error(porNome.error.message);
  }

  if (porFantasia.error) {
    throw new Error(porFantasia.error.message);
  }

  return Array.from(
    new Set([
      ...(porNome.data || []).map((item) => item.id as string),
      ...(porFantasia.data || []).map((item) => item.id as string),
    ])
  );
};

const buscarTipoEquipamentoIdsPorNome = async (nome: string) => {
  const { data, error } = await supabase
    .from("tipos_equipamento")
    .select("id")
    .eq("nome", nome)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id as string);
};

const carregarEmpresasDaPagina = async (
  equipamentos: EquipamentoSupabase[]
) => {
  const empresaIds = Array.from(
    new Set(equipamentos.map((item) => item.empresa_id).filter(Boolean))
  );

  if (empresaIds.length === 0) {
    return equipamentos;
  }

  const { data, error } = await supabase
    .from("empresas")
    .select(selectEmpresasEquipamentoListagem)
    .in("id", empresaIds);

  if (error) {
    throw new Error(error.message);
  }

  const empresasPorId = new Map(
    ((data || []) as unknown as EmpresaSupabase[]).map((empresa) => [
      empresa.id,
      empresa,
    ])
  );

  return equipamentos.map((equipamento) => ({
    ...equipamento,
    empresa: empresasPorId.get(equipamento.empresa_id) || null,
  }));
};

export const equipamentosService = {
  async listar(filtros?: ListarEquipamentosFiltros) {
    const equipamentos: EquipamentoSupabase[] = [];

    for (let from = 0; ; from += EQUIPAMENTOS_PAGE_SIZE) {
      const baseQuery = supabase
        .from("equipamentos")
        .select(selectEquipamentos)
        .eq("empresa.ativo", true)
        .order("created_at", { ascending: false })
        .range(from, from + EQUIPAMENTOS_PAGE_SIZE - 1);
      const query = await aplicarFiltrosEquipamentos(baseQuery, filtros);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const pagina = (data || []) as unknown as EquipamentoSupabase[];
      equipamentos.push(...pagina);

      if (pagina.length < EQUIPAMENTOS_PAGE_SIZE) {
        break;
      }
    }

    return equipamentos;
  },

  async listarPaginado(
    filtros: ListarEquipamentosPaginadoFiltros
  ): Promise<EquipamentosPaginadoResult> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.max(1, filtros.limit || 25);
    const from = (page - 1) * limit;
    const to = from + limit;
    const sortBy = filtros.sortBy || "numero_cadastro";

    const baseQuery = supabase
      .from("equipamentos")
      .select(selectEquipamentosListagem)
      .order(sortBy, { ascending: filtros.ascending ?? false })
      .range(from, to);

    const query = await aplicarFiltrosEquipamentos(baseQuery, filtros);
    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const linhas = ((data || []) as unknown as EquipamentoSupabase[]).slice(
      0,
      limit
    );
    const hasNextPage = (data || []).length > limit;
    const items = await carregarEmpresasDaPagina(linhas);

    return {
      items,
      total: hasNextPage ? from + limit + 1 : from + items.length,
    };
  },

  async contar(filtros?: ListarEquipamentosFiltros) {
    const baseQuery = supabase
      .from("equipamentos")
      .select("id", { count: "exact", head: true });

    const query = await aplicarFiltrosEquipamentos(baseQuery, filtros);
    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("equipamentos")
      .select(selectEquipamentos)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase;
  },

  async criar(input: EquipamentoFormInput) {
    if (!input.empresaId) {
      throw new Error("Selecione a empresa vinculada ao equipamento.");
    }

    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const { data, error } = await supabase
      .from("equipamentos")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
        ativo: true,
      })
      .select(selectEquipamentos)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase;
  },

  async criarEmLote(inputs: EquipamentoFormInput[]) {
    if (inputs.length === 0) {
      throw new Error("Adicione ao menos um equipamento ao cadastro em lote.");
    }

    if (inputs.some((input) => !input.empresaId)) {
      throw new Error("Todos os equipamentos devem possuir uma empresa vinculada.");
    }

    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const payload = inputs.map((input) => ({
      organizacao_id: organizacaoId,
      ...toDatabasePayload(input),
      ativo: input.status !== "Desativado",
    }));

    const { data, error } = await supabase
      .from("equipamentos")
      .insert(payload)
      .select(selectEquipamentos);

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase[];
  },

  async atualizar(id: string, input: EquipamentoFormInput) {
    const { data: equipamentoAtual, error: equipamentoAtualError } = await supabase
      .from("equipamentos")
      .select("empresa_id")
      .eq("id", id)
      .single();

    if (equipamentoAtualError) {
      throw new Error(equipamentoAtualError.message);
    }

    const payload = {
      ...toDatabasePayload(input),
      ...(equipamentoAtual?.empresa_id !== input.empresaId
        ? { empresa_setor_id: null, local_instalacao: null }
        : {}),
    };

    const { data, error } = await supabase
      .from("equipamentos")
      .update(payload)
      .eq("id", id)
      .select(selectEquipamentos)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase;
  },

  async excluir(id: string) {
    const { data, error } = await supabase
      .from("equipamentos")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23503") {
        throw new Error(
          "Este equipamento possui registros vinculados e não pode ser excluído. Desative-o para preservar o histórico."
        );
      }

      throw new Error(error.message);
    }

    if (!data?.id) {
      throw new Error("Equipamento não encontrado ou usuário sem permissão para excluí-lo.");
    }
  },
};

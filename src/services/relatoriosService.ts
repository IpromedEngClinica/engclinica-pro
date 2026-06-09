import { supabase } from "@/lib/supabaseClient";
import type { EquipamentoSupabase } from "@/services/equipamentosService";

export type RelatorioTipo = "controle_patrimonial" | "visita_externa";

export type RelatorioControlePatrimonialFiltros = {
  incluirResumo: boolean;
  empresaIds: string[];
  tipoEquipamentoLabels: string[];
  status: string[];
};

export type RelatorioVisitaExternaFiltros = {
  empresaIds: string[];
  tipoEquipamentoLabels: string[];
  setorLabels: string[];
};

export type RelatorioFiltros =
  | RelatorioControlePatrimonialFiltros
  | RelatorioVisitaExternaFiltros;

export type RelatorioRegistro = {
  id: string;
  organizacao_id: string;
  tipo: RelatorioTipo;
  titulo: string;
  filtros: RelatorioFiltros;
  arquivo_url: string | null;
  emitido_em: string;
  revisao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type RelatorioControlePatrimonialDados = {
  relatorio: RelatorioRegistro & {
    filtros: RelatorioControlePatrimonialFiltros;
  };
  equipamentos: EquipamentoSupabase[];
};

export type RelatorioVisitaExternaDados = {
  relatorio: RelatorioRegistro & {
    filtros: RelatorioVisitaExternaFiltros;
  };
  equipamentos: EquipamentoSupabase[];
};

export type RelatorioControlePatrimonialInput = {
  titulo: string;
  filtros: RelatorioControlePatrimonialFiltros;
};

export type RelatorioVisitaExternaInput = {
  titulo: string;
  filtros: RelatorioVisitaExternaFiltros;
};

const selectRelatorios = `
  id,
  organizacao_id,
  tipo,
  titulo,
  filtros,
  arquivo_url,
  emitido_em,
  revisao,
  ativo,
  created_at,
  updated_at
`;

const selectEquipamentosRelatorio = `
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
`;

export const FILTROS_CONTROLE_PATRIMONIAL_PADRAO: RelatorioControlePatrimonialFiltros =
  {
    incluirResumo: true,
    empresaIds: [],
    tipoEquipamentoLabels: [],
    status: [],
  };

export const FILTROS_VISITA_EXTERNA_PADRAO: RelatorioVisitaExternaFiltros = {
  empresaIds: [],
  tipoEquipamentoLabels: [],
  setorLabels: [],
};

export const getTipoEquipamentoRelatorio = (
  equipamento: Pick<EquipamentoSupabase, "tipo_texto" | "tipo_equipamento">
) =>
  equipamento.tipo_equipamento?.nome ||
  equipamento.tipo_texto ||
  "Equipamento sem tipo";

export const getStatusEquipamentoRelatorio = (
  equipamento: Pick<EquipamentoSupabase, "ativo" | "status">
) => (equipamento.ativo === false ? "Desativado" : equipamento.status || "Ativo");

const normalizarFiltrosControlePatrimonial = (
  filtros?: Partial<RelatorioControlePatrimonialFiltros> | null
): RelatorioControlePatrimonialFiltros => ({
  incluirResumo:
    filtros?.incluirResumo ??
    FILTROS_CONTROLE_PATRIMONIAL_PADRAO.incluirResumo,
  empresaIds: Array.isArray(filtros?.empresaIds) ? filtros.empresaIds : [],
  tipoEquipamentoLabels: Array.isArray(filtros?.tipoEquipamentoLabels)
    ? filtros.tipoEquipamentoLabels
    : [],
  status: Array.isArray(filtros?.status) ? filtros.status : [],
});

const normalizarFiltrosVisitaExterna = (
  filtros?: Partial<RelatorioVisitaExternaFiltros> | null
): RelatorioVisitaExternaFiltros => ({
  empresaIds: Array.isArray(filtros?.empresaIds) ? filtros.empresaIds : [],
  tipoEquipamentoLabels: Array.isArray(filtros?.tipoEquipamentoLabels)
    ? filtros.tipoEquipamentoLabels
    : [],
  setorLabels: Array.isArray(filtros?.setorLabels) ? filtros.setorLabels : [],
});

const normalizarRelatorio = (relatorio: RelatorioRegistro): RelatorioRegistro => ({
  ...relatorio,
  tipo: relatorio.tipo as RelatorioTipo,
  filtros:
    relatorio.tipo === "visita_externa"
      ? normalizarFiltrosVisitaExterna(
          relatorio.filtros as RelatorioVisitaExternaFiltros
        )
      : normalizarFiltrosControlePatrimonial(
          relatorio.filtros as RelatorioControlePatrimonialFiltros
        ),
});

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Nao foi possivel identificar a organizacao do usuario.");
  }

  return data as string;
};

const assertInput = (
  input: RelatorioControlePatrimonialInput | RelatorioVisitaExternaInput
) => {
  if (!input.titulo.trim()) {
    throw new Error("Informe um titulo para o relatorio.");
  }
};

export const relatoriosService = {
  async listar() {
    const { data, error } = await supabase
      .from("relatorios")
      .select(selectRelatorios)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data || []) as unknown as RelatorioRegistro[]).map(
      normalizarRelatorio
    );
  },

  async criarVisitaExterna(input: RelatorioVisitaExternaInput) {
    assertInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("relatorios")
      .insert({
        organizacao_id: organizacaoId,
        tipo: "visita_externa",
        titulo: input.titulo.trim(),
        filtros: normalizarFiltrosVisitaExterna(input.filtros),
        ativo: true,
      })
      .select(selectRelatorios)
      .single();

    if (error) throw new Error(error.message);

    return normalizarRelatorio(data as unknown as RelatorioRegistro);
  },

  async criarControlePatrimonial(input: RelatorioControlePatrimonialInput) {
    assertInput(input);
    const organizacaoId = await buscarOrganizacaoAtual();
    const { data, error } = await supabase
      .from("relatorios")
      .insert({
        organizacao_id: organizacaoId,
        tipo: "controle_patrimonial",
        titulo: input.titulo.trim(),
        filtros: normalizarFiltrosControlePatrimonial(input.filtros),
        ativo: true,
      })
      .select(selectRelatorios)
      .single();

    if (error) throw new Error(error.message);

    return normalizarRelatorio(data as unknown as RelatorioRegistro);
  },

  async atualizarControlePatrimonial(
    id: string,
    input: RelatorioControlePatrimonialInput
  ) {
    assertInput(input);

    const { data: atual, error: atualError } = await supabase
      .from("relatorios")
      .select("revisao")
      .eq("id", id)
      .single();

    if (atualError) throw new Error(atualError.message);

    const { data, error } = await supabase
      .from("relatorios")
      .update({
        titulo: input.titulo.trim(),
        filtros: normalizarFiltrosControlePatrimonial(input.filtros),
        emitido_em: new Date().toISOString().slice(0, 10),
        revisao: Number(atual?.revisao || 1) + 1,
      })
      .eq("id", id)
      .select(selectRelatorios)
      .single();

    if (error) throw new Error(error.message);

    return normalizarRelatorio(data as unknown as RelatorioRegistro);
  },

  async atualizarVisitaExterna(id: string, input: RelatorioVisitaExternaInput) {
    assertInput(input);

    const { data: atual, error: atualError } = await supabase
      .from("relatorios")
      .select("revisao")
      .eq("id", id)
      .single();

    if (atualError) throw new Error(atualError.message);

    const { data, error } = await supabase
      .from("relatorios")
      .update({
        titulo: input.titulo.trim(),
        filtros: normalizarFiltrosVisitaExterna(input.filtros),
        emitido_em: new Date().toISOString().slice(0, 10),
        revisao: Number(atual?.revisao || 1) + 1,
      })
      .eq("id", id)
      .select(selectRelatorios)
      .single();

    if (error) throw new Error(error.message);

    return normalizarRelatorio(data as unknown as RelatorioRegistro);
  },

  async buscarDadosControlePatrimonial(
    relatorio: RelatorioRegistro
  ): Promise<RelatorioControlePatrimonialDados> {
    const filtros = normalizarFiltrosControlePatrimonial(relatorio.filtros);

    let query = supabase
      .from("equipamentos")
      .select(selectEquipamentosRelatorio)
      .eq("empresa.ativo", true)
      .order("created_at", { ascending: false });

    if (filtros.empresaIds.length) {
      query = query.in("empresa_id", filtros.empresaIds);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const tipoSet = new Set(filtros.tipoEquipamentoLabels);
    const statusSet = new Set(filtros.status);
    const equipamentos = ((data || []) as unknown as EquipamentoSupabase[])
      .filter((equipamento) =>
        tipoSet.size ? tipoSet.has(getTipoEquipamentoRelatorio(equipamento)) : true
      )
      .filter((equipamento) =>
        statusSet.size
          ? statusSet.has(getStatusEquipamentoRelatorio(equipamento))
          : true
      )
      .sort((a, b) => {
        const empresaA = a.empresa?.nome_fantasia || a.empresa?.nome || "";
        const empresaB = b.empresa?.nome_fantasia || b.empresa?.nome || "";
        const empresaCompare = empresaA.localeCompare(empresaB, "pt-BR");
        if (empresaCompare !== 0) return empresaCompare;
        return getTipoEquipamentoRelatorio(a).localeCompare(
          getTipoEquipamentoRelatorio(b),
          "pt-BR"
        );
      });

    return {
      relatorio: {
        ...relatorio,
        filtros,
      },
      equipamentos,
    };
  },

  async buscarDadosVisitaExterna(
    relatorio: RelatorioRegistro
  ): Promise<RelatorioVisitaExternaDados> {
    const filtros = normalizarFiltrosVisitaExterna(
      relatorio.filtros as RelatorioVisitaExternaFiltros
    );

    let query = supabase
      .from("equipamentos")
      .select(selectEquipamentosRelatorio)
      .eq("empresa.ativo", true)
      .order("created_at", { ascending: false });

    if (filtros.empresaIds.length) {
      query = query.in("empresa_id", filtros.empresaIds);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const tipoSet = new Set(filtros.tipoEquipamentoLabels);
    const setorSet = new Set(filtros.setorLabels);
    const equipamentos = ((data || []) as unknown as EquipamentoSupabase[])
      .filter((equipamento) =>
        tipoSet.size ? tipoSet.has(getTipoEquipamentoRelatorio(equipamento)) : true
      )
      .filter((equipamento) =>
        setorSet.size ? setorSet.has(equipamento.setor || "Sem setor") : true
      )
      .sort((a, b) => {
        const empresaA = a.empresa?.nome_fantasia || a.empresa?.nome || "";
        const empresaB = b.empresa?.nome_fantasia || b.empresa?.nome || "";
        const empresaCompare = empresaA.localeCompare(empresaB, "pt-BR");
        if (empresaCompare !== 0) return empresaCompare;
        const setorCompare = (a.setor || "Sem setor").localeCompare(
          b.setor || "Sem setor",
          "pt-BR"
        );
        if (setorCompare !== 0) return setorCompare;
        return getTipoEquipamentoRelatorio(a).localeCompare(
          getTipoEquipamentoRelatorio(b),
          "pt-BR"
        );
      });

    return {
      relatorio: {
        ...relatorio,
        filtros,
      },
      equipamentos,
    };
  },
};

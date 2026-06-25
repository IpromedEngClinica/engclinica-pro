import { supabase } from "@/lib/supabaseClient";

export type AuditoriaAcao = "criou" | "alterou" | "excluiu";

export type AuditoriaLog = {
  id: string;
  organizacao_id: string;
  usuario_id: string | null;
  usuario_nome_snapshot: string | null;
  usuario_email_snapshot: string | null;
  usuario_perfil_snapshot: string | null;
  acao: AuditoriaAcao;
  modulo: string;
  tabela: string;
  registro_id: string | null;
  registro_descricao: string | null;
  campos_alterados: string[];
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  detalhes: Record<string, unknown>;
  criado_em: string;
};

export type AuditoriaFiltro = {
  modulo?: string;
  acao?: AuditoriaAcao | "todas";
  search?: string;
  limit?: number;
  page?: number;
};

export type AuditoriaListResult = {
  items: AuditoriaLog[];
  total: number;
};

const listSelect = `
  id,
  organizacao_id,
  usuario_id,
  usuario_nome_snapshot,
  usuario_email_snapshot,
  usuario_perfil_snapshot,
  acao,
  modulo,
  tabela,
  registro_id,
  registro_descricao,
  campos_alterados,
  criado_em
`;

const normalizeSearch = (value?: string) => value?.trim().toLowerCase() || "";

const sanitizeOrSearch = (value: string) => value.replace(/[%(),]/g, " ").trim();

export const auditoriaService = {
  async listar(filtro: AuditoriaFiltro = {}): Promise<AuditoriaListResult> {
    const limit = filtro.limit ?? 200;
    const page = Math.max(1, filtro.page ?? 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const search = sanitizeOrSearch(normalizeSearch(filtro.search));

    let query = supabase
      .from("auditoria_logs")
      .select(listSelect, { count: "exact" })
      .order("criado_em", { ascending: false })
      .range(from, to);

    if (filtro.modulo && filtro.modulo !== "todos") {
      query = query.eq("modulo", filtro.modulo);
    }

    if (filtro.acao && filtro.acao !== "todas") {
      query = query.eq("acao", filtro.acao);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        [
          `modulo.ilike.${pattern}`,
          `tabela.ilike.${pattern}`,
          `registro_descricao.ilike.${pattern}`,
          `usuario_nome_snapshot.ilike.${pattern}`,
          `usuario_email_snapshot.ilike.${pattern}`,
          `acao.ilike.${pattern}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      items: (data || []) as AuditoriaLog[],
      total: count ?? data?.length ?? 0,
    };
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("auditoria_logs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as AuditoriaLog;
  },
};

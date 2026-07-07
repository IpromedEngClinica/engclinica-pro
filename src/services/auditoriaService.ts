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

const normalizeSearch = (value?: string) => value?.trim().toLowerCase() || "";

const sanitizeSearch = (value: string) => value.replace(/[%]/g, " ").trim();

type AuditoriaResumoRpcRow = Omit<
  AuditoriaLog,
  "dados_anteriores" | "dados_novos" | "detalhes"
> & {
  total_count?: number | string | null;
};

const mapResumoRpcRow = (row: AuditoriaResumoRpcRow): AuditoriaLog => ({
  id: row.id,
  organizacao_id: row.organizacao_id,
  usuario_id: row.usuario_id,
  usuario_nome_snapshot: row.usuario_nome_snapshot,
  usuario_email_snapshot: row.usuario_email_snapshot,
  usuario_perfil_snapshot: row.usuario_perfil_snapshot,
  acao: row.acao,
  modulo: row.modulo,
  tabela: row.tabela,
  registro_id: row.registro_id,
  registro_descricao: row.registro_descricao,
  campos_alterados: row.campos_alterados || [],
  dados_anteriores: null,
  dados_novos: null,
  detalhes: {},
  criado_em: row.criado_em,
});

export const auditoriaService = {
  async listar(filtro: AuditoriaFiltro = {}): Promise<AuditoriaListResult> {
    const limit = filtro.limit ?? 25;
    const page = Math.max(1, filtro.page ?? 1);
    const offset = (page - 1) * limit;
    const search = sanitizeSearch(normalizeSearch(filtro.search));

    const { data, error } = await supabase.rpc("listar_auditoria_logs_resumo", {
      p_termo: search || null,
      p_modulo: filtro.modulo && filtro.modulo !== "todos" ? filtro.modulo : null,
      p_acao: filtro.acao && filtro.acao !== "todas" ? filtro.acao : null,
      p_offset: offset,
      p_limit: limit,
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as AuditoriaResumoRpcRow[];
    const total = rows.length ? Number(rows[0].total_count || 0) : 0;

    return {
      items: rows.map(mapResumoRpcRow),
      total,
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

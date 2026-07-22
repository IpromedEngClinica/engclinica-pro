import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSetorSupabase } from "@/services/empresasService";

export type EquipamentoSetorResumo = {
  id: string;
  numero_cadastro: number;
  tipo_texto: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
  setor: string | null;
  empresa_setor_id: string | null;
  local_instalacao: string | null;
  ativo: boolean;
  tipo_equipamento?: {
    nome: string;
  } | null;
};

export type SetorEquipamentoGrupo = {
  key: string;
  setorAtual: string;
  setorAtualOriginal: string | null;
  quantidade: number;
  equipamentos: EquipamentoSetorResumo[];
  setorOficialId: string | null;
  setorOficialNome: string | null;
  localInstalacao: string | null;
  normalizado: boolean;
};

export type OrganizacaoSetoresEmpresa = {
  setores: EmpresaSetorSupabase[];
  equipamentos: EquipamentoSetorResumo[];
  grupos: SetorEquipamentoGrupo[];
  totalEquipamentos: number;
  totalPendentes: number;
};

export type LimpezaSetoresVaziosResultado = {
  quantidade: number;
  nomes: string[];
};

const SEM_SETOR_LABEL = "Sem setor";

const normalizarBusca = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(setor|sala|unidade|area)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const montarDescricaoEquipamento = (equipamento: EquipamentoSetorResumo) => {
  const tipo = equipamento.tipo_equipamento?.nome || equipamento.tipo_texto || "Equipamento";
  const detalhes = [equipamento.fabricante, equipamento.modelo, equipamento.numero_serie]
    .filter(Boolean)
    .join(" | ");

  return detalhes ? `${tipo} - ${detalhes}` : tipo;
};

const sugerirSetorOficial = (
  setorAtual: string,
  setores: EmpresaSetorSupabase[]
) => {
  const atual = normalizarBusca(setorAtual);
  if (!atual) return null;

  return (
    setores.find((setor) => {
      const oficial = normalizarBusca(setor.nome);
      return oficial && (atual.includes(oficial) || oficial.includes(atual));
    }) || null
  );
};

const agruparEquipamentos = (
  equipamentos: EquipamentoSetorResumo[],
  setores: EmpresaSetorSupabase[]
) => {
  const grupos = new Map<string, EquipamentoSetorResumo[]>();

  equipamentos.forEach((equipamento) => {
    const setorAtual = equipamento.setor?.trim() || "";
    const key = setorAtual || "__sem_setor__";
    grupos.set(key, [...(grupos.get(key) || []), equipamento]);
  });

  return Array.from(grupos.entries())
    .map(([key, itens]) => {
      const primeiro = itens[0];
      const setorAtualOriginal = primeiro?.setor?.trim() || null;
      const setorAtual = setorAtualOriginal || SEM_SETOR_LABEL;
      const idsSetorOficial = new Set(
        itens.map((item) => item.empresa_setor_id).filter(Boolean)
      );
      const locais = new Set(
        itens
          .map((item) => item.local_instalacao?.trim())
          .filter((value): value is string => Boolean(value))
      );
      const setorOficial =
        setores.find((setor) => setor.id === primeiro?.empresa_setor_id) ||
        sugerirSetorOficial(setorAtualOriginal || "", setores);

      const normalizado =
        idsSetorOficial.size === 1 &&
        itens.every((item) => Boolean(item.empresa_setor_id)) &&
        itens.every((item) => item.setor?.trim() === setorOficial?.nome);

      return {
        key,
        setorAtual,
        setorAtualOriginal,
        quantidade: itens.length,
        equipamentos: itens,
        setorOficialId: setorOficial?.id || null,
        setorOficialNome: setorOficial?.nome || null,
        localInstalacao: locais.size === 1 ? Array.from(locais)[0] : null,
        normalizado,
      } satisfies SetorEquipamentoGrupo;
    })
    .sort((a, b) => {
      if (a.normalizado !== b.normalizado) return a.normalizado ? 1 : -1;
      return a.setorAtual.localeCompare(b.setorAtual, "pt-BR");
    });
};

export const setoresOrganizacaoService = {
  async carregarEmpresa(empresaId: string): Promise<OrganizacaoSetoresEmpresa> {
    const [setoresResult, equipamentosResult] = await Promise.all([
      supabase
        .from("empresa_setores")
        .select(
          "id, organizacao_id, empresa_id, nome, cep, rua, numero, complemento, bairro, cidade, estado, observacoes, mesmo_endereco_cliente, ativo, created_at, updated_at"
        )
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("equipamentos")
        .select(
          `
            id,
            numero_cadastro,
            tipo_texto,
            fabricante,
            modelo,
            numero_serie,
            patrimonio,
            tag,
            setor,
            empresa_setor_id,
            local_instalacao,
            ativo,
            tipo_equipamento:tipos_equipamento (
              nome
            )
          `
        )
        .eq("empresa_id", empresaId)
        .order("setor", { ascending: true })
        .order("numero_cadastro", { ascending: false }),
    ]);

    if (setoresResult.error) {
      throw new Error(setoresResult.error.message);
    }

    if (equipamentosResult.error) {
      throw new Error(equipamentosResult.error.message);
    }

    const setores = (setoresResult.data || []) as EmpresaSetorSupabase[];
    const equipamentos = (equipamentosResult.data || []) as unknown as EquipamentoSetorResumo[];
    const grupos = agruparEquipamentos(equipamentos, setores);

    return {
      setores,
      equipamentos,
      grupos,
      totalEquipamentos: equipamentos.length,
      totalPendentes: grupos.filter((grupo) => !grupo.normalizado).length,
    };
  },

  async criarSetor(empresaId: string, nome: string) {
    const trimmed = nome.trim();
    if (!trimmed) {
      throw new Error("Informe o nome do setor oficial.");
    }

    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    const { data, error } = await supabase
      .from("empresa_setores")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: empresaId,
        nome: trimmed,
        ativo: true,
      })
      .select(
        "id, organizacao_id, empresa_id, nome, cep, rua, numero, complemento, bairro, cidade, estado, observacoes, mesmo_endereco_cliente, ativo, created_at, updated_at"
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as EmpresaSetorSupabase;
  },

  async aplicarMapeamento(input: {
    empresaId: string;
    setorAtualOriginal: string | null;
    setorOficialId: string;
    localInstalacao?: string;
    equipamentoIds?: string[];
  }) {
    const { data: setorOficial, error: setorError } = await supabase
      .from("empresa_setores")
      .select("id, nome")
      .eq("id", input.setorOficialId)
      .eq("empresa_id", input.empresaId)
      .eq("ativo", true)
      .single();

    if (setorError) {
      throw new Error(setorError.message);
    }

    const payload = {
      empresa_setor_id: setorOficial.id,
      setor: setorOficial.nome,
      local_instalacao: input.localInstalacao?.trim() || null,
    };

    const updateEquipamentos = async (queryValue: string | null) => {
      let query = supabase
        .from("equipamentos")
        .update(payload)
        .eq("empresa_id", input.empresaId)
        .select("id");

      if (input.equipamentoIds?.length) {
        query = query.in("id", input.equipamentoIds);
      } else {
        query =
          queryValue === null ? query.is("setor", null) : query.eq("setor", queryValue);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data?.length || 0;
    };

    if (input.equipamentoIds?.length) {
      return updateEquipamentos(input.setorAtualOriginal);
    }

    if (input.setorAtualOriginal === null) {
      const [nullCount, emptyCount] = await Promise.all([
        updateEquipamentos(null),
        updateEquipamentos(""),
      ]);
      return nullCount + emptyCount;
    }

    return updateEquipamentos(input.setorAtualOriginal);
  },

  async removerEquipamentosDoSetor(empresaId: string, equipamentoIds: string[]) {
    const ids = Array.from(new Set(equipamentoIds.filter(Boolean)));

    if (ids.length === 0) {
      throw new Error("Selecione ao menos um equipamento.");
    }

    const { data, error } = await supabase
      .from("equipamentos")
      .update({
        empresa_setor_id: null,
        setor: null,
        local_instalacao: null,
      })
      .eq("empresa_id", empresaId)
      .in("id", ids)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  },

  async limparSetoresVazios(
    empresaId: string
  ): Promise<LimpezaSetoresVaziosResultado> {
    const [setoresResult, equipamentosResult] = await Promise.all([
      supabase
        .from("empresa_setores")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .eq("ativo", true),
      supabase
        .from("equipamentos")
        .select("empresa_setor_id")
        .eq("empresa_id", empresaId)
        .not("empresa_setor_id", "is", null),
    ]);

    if (setoresResult.error) {
      throw new Error(setoresResult.error.message);
    }

    if (equipamentosResult.error) {
      throw new Error(equipamentosResult.error.message);
    }

    const setores = (setoresResult.data || []) as Pick<
      EmpresaSetorSupabase,
      "id" | "nome"
    >[];
    const setoresUsados = new Set(
      (equipamentosResult.data || [])
        .map((item) => item.empresa_setor_id as string | null)
        .filter((id): id is string => Boolean(id))
    );
    const setoresVazios = setores.filter((setor) => !setoresUsados.has(setor.id));

    if (setoresVazios.length === 0) {
      return { quantidade: 0, nomes: [] };
    }

    const { error } = await supabase
      .from("empresa_setores")
      .delete()
      .eq("empresa_id", empresaId)
      .in(
        "id",
        setoresVazios.map((setor) => setor.id)
      );

    if (error) {
      throw new Error(error.message);
    }

    return {
      quantidade: setoresVazios.length,
      nomes: setoresVazios.map((setor) => setor.nome),
    };
  },

  montarDescricaoEquipamento,
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type PecaFabricanteSupabase = {
  id: string;
  organizacao_id?: string;
  peca_id?: string;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PecaModeloSupabase = {
  id: string;
  organizacao_id?: string;
  peca_id?: string;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PecaVariacaoSupabase = {
  id: string;
  organizacao_id?: string;
  peca_id: string;
  peca_fabricante_id: string | null;
  peca_modelo_id: string | null;
  fabricante_texto: string | null;
  modelo_texto: string | null;
  preco_padrao: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  fabricante?: {
    id: string;
    nome: string;
  } | null;
  modelo?: {
    id: string;
    nome: string;
  } | null;
};

export type PecaSupabase = {
  id: string;
  organizacao_id?: string;
  nome: string;
  descricao: string | null;
  fabricante: string | null;
  codigo_interno: string | null;
  unidade: string;
  custo_referencia: number | null;
  valor_venda_referencia: number | null;
  preco_padrao: number | null;
  estoque_minimo: number | null;
  ativo: boolean;
  fabricantes?: PecaFabricanteSupabase[];
  modelos?: PecaModeloSupabase[];
  variacoes?: PecaVariacaoSupabase[];
};

export const PECAS_QUERY_KEY = ["pecas"];

type PecaInput = {
  nome: string;
  descricao?: string | null;
  precoPadrao?: number | null;
};

type PecaVariacaoInput = {
  pecaId: string;
  pecaFabricanteId?: string | null;
  pecaModeloId?: string | null;
  fabricanteTexto?: string | null;
  modeloTexto?: string | null;
  precoPadrao?: number | null;
};

const selectPecas = `
  id,
  organizacao_id,
  nome,
  descricao,
  fabricante,
  codigo_interno,
  unidade,
  custo_referencia,
  valor_venda_referencia,
  preco_padrao,
  estoque_minimo,
  ativo,
  fabricantes:peca_fabricantes (
    id,
    organizacao_id,
    peca_id,
    nome,
    ativo,
    created_at,
    updated_at
  ),
  modelos:peca_modelos (
    id,
    organizacao_id,
    peca_id,
    nome,
    ativo,
    created_at,
    updated_at
  ),
  variacoes:peca_variacoes (
    id,
    organizacao_id,
    peca_id,
    peca_fabricante_id,
    peca_modelo_id,
    fabricante_texto,
    modelo_texto,
    preco_padrao,
    ativo,
    created_at,
    updated_at,
    fabricante:peca_fabricantes (
      id,
      nome
    ),
    modelo:peca_modelos (
      id,
      nome
    )
  )
`;

const getOrganizacaoId = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Não foi possível identificar a organização do usuário.");
  }

  return data as string;
};

const assertNomeDisponivel = async (nome: string, ignoreId?: string) => {
  const { data, error } = await supabase
    .from("pecas")
    .select("id")
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id && data.id !== ignoreId) {
    throw new Error("Já existe uma peça com este nome.");
  }
};

const invalidatePecas = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: PECAS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["peca"] });
  queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
};

const normalizePecaInput = (input: string | PecaInput) => {
  if (typeof input === "string") {
    return {
      nome: input.trim(),
      descricao: null,
      precoPadrao: null,
    };
  }

  return {
    nome: input.nome.trim(),
    descricao: input.descricao?.trim() || null,
    precoPadrao:
      input.precoPadrao === null || input.precoPadrao === undefined
        ? null
        : Number(input.precoPadrao),
  };
};

const normalizeVariacaoInput = (input: PecaVariacaoInput) => ({
  pecaId: input.pecaId,
  pecaFabricanteId: input.pecaFabricanteId || null,
  pecaModeloId: input.pecaModeloId || null,
  fabricanteTexto: input.fabricanteTexto?.trim() || null,
  modeloTexto: input.modeloTexto?.trim() || null,
  precoPadrao:
    input.precoPadrao === null || input.precoPadrao === undefined
      ? null
      : Number(input.precoPadrao),
});

export const encontrarVariacaoPeca = (
  peca: PecaSupabase | null | undefined,
  fabricanteId?: string | null,
  modeloId?: string | null
) => {
  const variacoes = (peca?.variacoes || []).filter(
    (variacao) => variacao.ativo !== false
  );

  return (
    variacoes.find(
      (variacao) =>
        (variacao.peca_fabricante_id || null) === (fabricanteId || null) &&
        (variacao.peca_modelo_id || null) === (modeloId || null)
    ) || null
  );
};

export const getPrecoSugeridoPeca = (
  peca: PecaSupabase | null | undefined,
  fabricanteId?: string | null,
  modeloId?: string | null
) => {
  if (!peca) return null;

  const variacao = encontrarVariacaoPeca(peca, fabricanteId, modeloId);

  if (variacao?.preco_padrao !== null && variacao?.preco_padrao !== undefined) {
    return Number(variacao.preco_padrao);
  }

  if (peca.preco_padrao !== null && peca.preco_padrao !== undefined) {
    return Number(peca.preco_padrao);
  }

  return null;
};

export const usePecas = () => {
  return useQuery<PecaSupabase[]>({
    queryKey: PECAS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pecas")
        .select(selectPecas)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaSupabase[];
    },
  });
};

export const useCriarPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | PecaInput) => {
      const payload = normalizePecaInput(input);
      await assertNomeDisponivel(payload.nome);
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("pecas")
        .insert({
          organizacao_id: organizacaoId,
          nome: payload.nome,
          descricao: payload.descricao,
          preco_padrao: payload.precoPadrao,
          unidade: "un",
          ativo: true,
        })
        .select(selectPecas)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useAtualizarPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<PecaInput> & { nome: string }) => {
      const payload = normalizePecaInput(input);
      await assertNomeDisponivel(payload.nome, id);
      const { data, error } = await supabase
        .from("pecas")
        .update({
          nome: payload.nome,
          descricao: payload.descricao,
          preco_padrao: payload.precoPadrao,
        })
        .eq("id", id)
        .select(selectPecas)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useDesativarPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pecas")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useCriarFabricantePeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pecaId, nome }: { pecaId: string; nome: string }) => {
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("peca_fabricantes")
        .insert({
          organizacao_id: organizacaoId,
          peca_id: pecaId,
          nome: nome.trim(),
          ativo: true,
        })
        .select("id, organizacao_id, peca_id, nome, ativo, created_at, updated_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaFabricanteSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useCriarModeloPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pecaId, nome }: { pecaId: string; nome: string }) => {
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("peca_modelos")
        .insert({
          organizacao_id: organizacaoId,
          peca_id: pecaId,
          nome: nome.trim(),
          ativo: true,
        })
        .select("id, organizacao_id, peca_id, nome, ativo, created_at, updated_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaModeloSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useDesativarFabricantePeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("peca_fabricantes")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useDesativarModeloPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("peca_modelos")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useCriarVariacaoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PecaVariacaoInput) => {
      const payload = normalizeVariacaoInput(input);
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("peca_variacoes")
        .insert({
          organizacao_id: organizacaoId,
          peca_id: payload.pecaId,
          peca_fabricante_id: payload.pecaFabricanteId,
          peca_modelo_id: payload.pecaModeloId,
          fabricante_texto: payload.fabricanteTexto,
          modelo_texto: payload.modeloTexto,
          preco_padrao: payload.precoPadrao,
          ativo: true,
        })
        .select(
          "id, organizacao_id, peca_id, peca_fabricante_id, peca_modelo_id, fabricante_texto, modelo_texto, preco_padrao, ativo, created_at, updated_at"
        )
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaVariacaoSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useAtualizarVariacaoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & PecaVariacaoInput) => {
      const payload = normalizeVariacaoInput(input);
      const { data, error } = await supabase
        .from("peca_variacoes")
        .update({
          peca_fabricante_id: payload.pecaFabricanteId,
          peca_modelo_id: payload.pecaModeloId,
          fabricante_texto: payload.fabricanteTexto,
          modelo_texto: payload.modeloTexto,
          preco_padrao: payload.precoPadrao,
        })
        .eq("id", id)
        .select(
          "id, organizacao_id, peca_id, peca_fabricante_id, peca_modelo_id, fabricante_texto, modelo_texto, preco_padrao, ativo, created_at, updated_at"
        )
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as PecaVariacaoSupabase;
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

export const useDesativarVariacaoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("peca_variacoes")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidatePecas(queryClient),
  });
};

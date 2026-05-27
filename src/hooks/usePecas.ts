import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type PecaSupabase = {
  id: string;
  nome: string;
  descricao: string | null;
  fabricante: string | null;
  codigo_interno: string | null;
  unidade: string;
  custo_referencia: number | null;
  valor_venda_referencia: number | null;
  estoque_minimo: number | null;
  ativo: boolean;
};

export const PECAS_QUERY_KEY = ["pecas"];

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
  queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
};

export const usePecas = () => {
  return useQuery<PecaSupabase[]>({
    queryKey: PECAS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pecas")
        .select(
          "id, nome, descricao, fabricante, codigo_interno, unidade, custo_referencia, valor_venda_referencia, estoque_minimo, ativo"
        )
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
    mutationFn: async (nome: string) => {
      await assertNomeDisponivel(nome);
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("pecas")
        .insert({
          organizacao_id: organizacaoId,
          nome,
          unidade: "un",
          ativo: true,
        })
        .select(
          "id, nome, descricao, fabricante, codigo_interno, unidade, custo_referencia, valor_venda_referencia, estoque_minimo, ativo"
        )
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
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await assertNomeDisponivel(nome, id);
      const { data, error } = await supabase
        .from("pecas")
        .update({ nome })
        .eq("id", id)
        .select(
          "id, nome, descricao, fabricante, codigo_interno, unidade, custo_referencia, valor_venda_referencia, estoque_minimo, ativo"
        )
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

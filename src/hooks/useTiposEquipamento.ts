import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type TipoEquipamentoSupabase = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

export const TIPOS_EQUIPAMENTO_QUERY_KEY = ["tipos-equipamento"];

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

const assertNomeDisponivel = async (
  nome: string,
  ignoreId?: string
) => {
  const { data, error } = await supabase
    .from("tipos_equipamento")
    .select("id")
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id && data.id !== ignoreId) {
    throw new Error("Já existe um tipo de equipamento com este nome.");
  }
};

const invalidateTiposEquipamento = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: TIPOS_EQUIPAMENTO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
  queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
  queryClient.invalidateQueries({ queryKey: ["protocolos-os"] });
};

export const useTiposEquipamento = () => {
  return useQuery<TipoEquipamentoSupabase[]>({
    queryKey: TIPOS_EQUIPAMENTO_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_equipamento")
        .select("id, nome, descricao, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoEquipamentoSupabase[];
    },
  });
};

export const useCriarTipoEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string) => {
      await assertNomeDisponivel(nome);
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("tipos_equipamento")
        .insert({
          organizacao_id: organizacaoId,
          nome,
          ativo: true,
        })
        .select("id, nome, descricao, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoEquipamentoSupabase;
    },
    onSuccess: (novoTipo) => {
      queryClient.setQueryData<TipoEquipamentoSupabase[]>(
        TIPOS_EQUIPAMENTO_QUERY_KEY,
        (tipos = []) =>
          [...tipos.filter((tipo) => tipo.id !== novoTipo.id), novoTipo].sort(
            (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
          )
      );
      invalidateTiposEquipamento(queryClient);
    },
  });
};

export const useAtualizarTipoEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await assertNomeDisponivel(nome, id);
      const { data, error } = await supabase
        .from("tipos_equipamento")
        .update({ nome })
        .eq("id", id)
        .select("id, nome, descricao, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoEquipamentoSupabase;
    },
    onSuccess: () => invalidateTiposEquipamento(queryClient),
  });
};

export const useDesativarTipoEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tipos_equipamento")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidateTiposEquipamento(queryClient),
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type TipoOSSupabase = {
  id: string;
  nome: string;
  descricao: string | null;
  exige_equipamento: boolean;
  gera_orcamento: boolean;
  ativo: boolean;
};

export type EstadoOSSupabase = {
  id: string;
  nome: string;
  descricao: string | null;
  finaliza_os: boolean;
  cancela_os: boolean;
  ordem: number;
  ativo: boolean;
};

export const TIPOS_OS_QUERY_KEY = ["tipos-os"];
export const ESTADOS_OS_QUERY_KEY = ["estados-os"];

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
  tabela: "tipos_os" | "estados_os",
  nome: string,
  ignoreId?: string
) => {
  const { data, error } = await supabase
    .from(tabela)
    .select("id")
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id && data.id !== ignoreId) {
    throw new Error("Já existe um cadastro com este nome.");
  }
};

const invalidateTiposOS = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: TIPOS_OS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
  queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
};

const invalidateEstadosOS = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ESTADOS_OS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
};

export const useTiposOS = () => {
  return useQuery<TipoOSSupabase[]>({
    queryKey: TIPOS_OS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_os")
        .select("id, nome, descricao, exige_equipamento, gera_orcamento, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoOSSupabase[];
    },
  });
};

export const useEstadosOS = () => {
  return useQuery<EstadoOSSupabase[]>({
    queryKey: ESTADOS_OS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estados_os")
        .select("id, nome, descricao, finaliza_os, cancela_os, ordem, ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as EstadoOSSupabase[];
    },
  });
};

export const useCriarTipoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string) => {
      await assertNomeDisponivel("tipos_os", nome);
      const organizacaoId = await getOrganizacaoId();
      const { data, error } = await supabase
        .from("tipos_os")
        .insert({
          organizacao_id: organizacaoId,
          nome,
          exige_equipamento: true,
          gera_orcamento: true,
          ativo: true,
        })
        .select("id, nome, descricao, exige_equipamento, gera_orcamento, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoOSSupabase;
    },
    onSuccess: () => invalidateTiposOS(queryClient),
  });
};

export const useAtualizarTipoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await assertNomeDisponivel("tipos_os", nome, id);
      const { data, error } = await supabase
        .from("tipos_os")
        .update({ nome })
        .eq("id", id)
        .select("id, nome, descricao, exige_equipamento, gera_orcamento, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as TipoOSSupabase;
    },
    onSuccess: () => invalidateTiposOS(queryClient),
  });
};

export const useDesativarTipoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tipos_os")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidateTiposOS(queryClient),
  });
};

export const useCriarEstadoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string) => {
      await assertNomeDisponivel("estados_os", nome);
      const organizacaoId = await getOrganizacaoId();
      const { data: maiorOrdem, error: ordemError } = await supabase
        .from("estados_os")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ordemError) {
        throw new Error(ordemError.message);
      }

      const { data, error } = await supabase
        .from("estados_os")
        .insert({
          organizacao_id: organizacaoId,
          nome,
          finaliza_os: false,
          cancela_os: false,
          ordem: Number(maiorOrdem?.ordem || 0) + 10,
          ativo: true,
        })
        .select("id, nome, descricao, finaliza_os, cancela_os, ordem, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as EstadoOSSupabase;
    },
    onSuccess: () => invalidateEstadosOS(queryClient),
  });
};

export const useAtualizarEstadoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await assertNomeDisponivel("estados_os", nome, id);
      const { data, error } = await supabase
        .from("estados_os")
        .update({ nome })
        .eq("id", id)
        .select("id, nome, descricao, finaliza_os, cancela_os, ordem, ativo")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as EstadoOSSupabase;
    },
    onSuccess: () => invalidateEstadosOS(queryClient),
  });
};

export const useDesativarEstadoOS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estados_os")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidateEstadosOS(queryClient),
  });
};

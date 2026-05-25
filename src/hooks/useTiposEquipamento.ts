import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type TipoEquipamentoSupabase = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

export const TIPOS_EQUIPAMENTO_QUERY_KEY = ["tipos-equipamento"];

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
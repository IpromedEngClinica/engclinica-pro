import { useQuery } from "@tanstack/react-query";
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
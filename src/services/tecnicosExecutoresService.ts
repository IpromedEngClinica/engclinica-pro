import { supabase } from "@/lib/supabaseClient";

export type TecnicoExecutor = {
  id: string;
  nome: string;
  perfil: "admin" | "gestor" | "tecnico";
  ativo: boolean;
};

export const tecnicosExecutoresService = {
  async listar(): Promise<TecnicoExecutor[]> {
    const { data, error } = await supabase.rpc("listar_tecnicos_executores");

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as TecnicoExecutor[];
  },
};

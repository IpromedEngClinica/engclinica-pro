import { useQuery } from "@tanstack/react-query";
import { tecnicosExecutoresService } from "@/services/tecnicosExecutoresService";

export const TECNICOS_EXECUTORES_QUERY_KEY = ["tecnicos-executores"];

export const useTecnicosExecutores = () =>
  useQuery({
    queryKey: TECNICOS_EXECUTORES_QUERY_KEY,
    queryFn: () => tecnicosExecutoresService.listar(),
    staleTime: 5 * 60 * 1000,
  });

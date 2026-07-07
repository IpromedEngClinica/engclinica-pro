import { useQuery } from "@tanstack/react-query";
import {
  auditoriaService,
  type AuditoriaFiltro,
} from "@/services/auditoriaService";

export const AUDITORIA_QUERY_KEY = ["auditoria"];

export const useAuditoriaLogs = (filtro: AuditoriaFiltro = {}) =>
  useQuery({
    queryKey: [...AUDITORIA_QUERY_KEY, filtro],
    queryFn: () => auditoriaService.listar(filtro),
    retry: false,
    staleTime: 30_000,
  });

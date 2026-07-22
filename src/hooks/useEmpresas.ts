import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExcluirEmpresaInput,
  EmpresaFormInput,
  empresasService,
  EmpresaSupabase,
  ListarEmpresasFiltros,
} from "@/services/empresasService";
import {
  SESSION_CACHE_GC_TIME,
  SESSION_CACHE_STALE_TIME,
} from "@/lib/queryClient";

export const EMPRESAS_QUERY_KEY = ["empresas"];
const DASHBOARD_QUERY_KEY = ["dashboard-operacional"];

type UseEmpresasOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export const EMPRESAS_STALE_TIME = SESSION_CACHE_STALE_TIME;
export const EMPRESAS_GC_TIME = SESSION_CACHE_GC_TIME;

export const useEmpresas = (
  filtros?: ListarEmpresasFiltros,
  options?: UseEmpresasOptions
) => {
  const statusFiltro = filtros?.statusFiltro || "ativas";

  return useQuery<EmpresaSupabase[]>({
    queryKey: [...EMPRESAS_QUERY_KEY, "lista", statusFiltro],
    queryFn: () => empresasService.listar({ statusFiltro }),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? EMPRESAS_STALE_TIME,
    gcTime: options?.gcTime ?? EMPRESAS_GC_TIME,
  });
};

export const useCriarEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmpresaFormInput) => empresasService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

export const useAtualizarEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmpresaFormInput }) =>
      empresasService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

export const useExcluirEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ExcluirEmpresaInput;
    }) => empresasService.excluir(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

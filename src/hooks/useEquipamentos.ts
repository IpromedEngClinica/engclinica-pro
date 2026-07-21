import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EquipamentosPaginadoResult,
  EquipamentosFilterOptions,
  EquipamentoFormInput,
  equipamentosService,
  EquipamentoSupabase,
  ListarEquipamentosFiltros,
  ListarEquipamentosPaginadoFiltros,
} from "@/services/equipamentosService";

export const EQUIPAMENTOS_QUERY_KEY = ["equipamentos"];
const DASHBOARD_QUERY_KEY = ["dashboard-operacional"];
const ORGANIZACAO_SETORES_QUERY_KEY = ["organizacao-setores"];
const PLANOS_QUERY_KEY = ["planos"];

type UseEquipamentosOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export const EQUIPAMENTOS_STALE_TIME = 5 * 60 * 1000;
export const EQUIPAMENTOS_GC_TIME = 20 * 60 * 1000;
export const EQUIPAMENTOS_DEFAULT_PAGINADO_FILTROS: ListarEquipamentosPaginadoFiltros =
  {
    statusFiltro: "ativos",
    termo: "",
    page: 1,
    limit: 25,
    sortBy: "numero_cadastro",
    ascending: false,
  };

export const useEquipamentos = (
  filtros?: ListarEquipamentosFiltros,
  options?: UseEquipamentosOptions
) => {
  return useQuery<EquipamentoSupabase[]>({
    queryKey: [...EQUIPAMENTOS_QUERY_KEY, filtros],
    queryFn: () => equipamentosService.listar(filtros),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? EQUIPAMENTOS_STALE_TIME,
    gcTime: options?.gcTime ?? EQUIPAMENTOS_GC_TIME,
  });
};

export const useEquipamentosPaginados = (
  filtros: ListarEquipamentosPaginadoFiltros
) => {
  return useQuery<EquipamentosPaginadoResult>({
    queryKey: [...EQUIPAMENTOS_QUERY_KEY, "paginado", filtros],
    queryFn: () => equipamentosService.listarPaginado(filtros),
    placeholderData: (previousData) => previousData,
    staleTime: EQUIPAMENTOS_STALE_TIME,
    gcTime: EQUIPAMENTOS_GC_TIME,
  });
};

export const useEquipamentosFilterOptions = (
  statusFiltro: ListarEquipamentosFiltros["statusFiltro"] = "ativos"
) => {
  return useQuery<EquipamentosFilterOptions>({
    queryKey: [...EQUIPAMENTOS_QUERY_KEY, "opcoes-filtros", statusFiltro],
    queryFn: () => equipamentosService.listarOpcoesFiltros(statusFiltro),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useEquipamentosTotal = (filtros?: ListarEquipamentosFiltros) => {
  return useQuery<number>({
    queryKey: [...EQUIPAMENTOS_QUERY_KEY, "total", filtros],
    queryFn: () => equipamentosService.contar(filtros),
    retry: false,
    staleTime: 30_000,
  });
};

export const useCriarEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EquipamentoFormInput) =>
      equipamentosService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORGANIZACAO_SETORES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

export const useAtualizarEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EquipamentoFormInput }) =>
      equipamentosService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORGANIZACAO_SETORES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

export const useCriarEquipamentosEmLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: EquipamentoFormInput[]) =>
      equipamentosService.criarEmLote(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORGANIZACAO_SETORES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

export const useExcluirEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipamentosService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORGANIZACAO_SETORES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EquipamentosPaginadoResult,
  EquipamentoFormInput,
  equipamentosService,
  EquipamentoSupabase,
  ListarEquipamentosFiltros,
  ListarEquipamentosPaginadoFiltros,
} from "@/services/equipamentosService";

export const EQUIPAMENTOS_QUERY_KEY = ["equipamentos"];

type UseEquipamentosOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

const EQUIPAMENTOS_STALE_TIME = 5 * 60 * 1000;
const EQUIPAMENTOS_GC_TIME = 15 * 60 * 1000;

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
    },
  });
};

export const useExcluirEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipamentosService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

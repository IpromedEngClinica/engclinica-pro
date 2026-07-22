import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AplicarDescontoOrcamentoInput,
  OrcamentoFormInput,
  OrcamentoStatus,
  OrcamentoSupabase,
  OrcamentosContagemPorStatus,
  ListarOrcamentosPaginadoFiltros,
  OrcamentosPaginadoResult,
  orcamentosService,
} from "@/services/orcamentosService";
import {
  SESSION_CACHE_GC_TIME,
  SESSION_CACHE_STALE_TIME,
} from "@/lib/queryClient";

export const ORCAMENTOS_QUERY_KEY = ["orcamentos"];

type UseOrcamentosOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export const ORCAMENTOS_STALE_TIME = SESSION_CACHE_STALE_TIME;
export const ORCAMENTOS_GC_TIME = SESSION_CACHE_GC_TIME;
export const ORCAMENTOS_DEFAULT_PAGINADO_FILTROS: ListarOrcamentosPaginadoFiltros = {
  termo: undefined,
  status: "pendente",
  tipo: undefined,
  clienteNome: undefined,
  formaPagamento: undefined,
  modoPagamento: undefined,
  frete: undefined,
  orcamentista: undefined,
  dataInicio: undefined,
  dataFim: undefined,
  valorMinimo: undefined,
  valorMaximo: undefined,
  origem: undefined,
  page: 1,
  limit: 25,
  sortBy: "data",
  ascending: false,
};

export const useOrcamentos = (options?: UseOrcamentosOptions) => {
  return useQuery<OrcamentoSupabase[]>({
    queryKey: ORCAMENTOS_QUERY_KEY,
    queryFn: orcamentosService.listar,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? ORCAMENTOS_STALE_TIME,
    gcTime: options?.gcTime ?? ORCAMENTOS_GC_TIME,
  });
};

export const useOrcamentosResumo = (options?: UseOrcamentosOptions) => {
  return useQuery<OrcamentoSupabase[]>({
    queryKey: [...ORCAMENTOS_QUERY_KEY, "resumo"],
    queryFn: orcamentosService.listarResumo,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? ORCAMENTOS_STALE_TIME,
    gcTime: options?.gcTime ?? ORCAMENTOS_GC_TIME,
  });
};

export const useOrcamentosPaginados = (
  filtros: ListarOrcamentosPaginadoFiltros,
  options?: UseOrcamentosOptions
) => {
  return useQuery<OrcamentosPaginadoResult>({
    queryKey: [...ORCAMENTOS_QUERY_KEY, "paginado", filtros],
    queryFn: () => orcamentosService.listarPaginado(filtros),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? ORCAMENTOS_STALE_TIME,
    gcTime: options?.gcTime ?? ORCAMENTOS_GC_TIME,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
};

export const useOrcamentosContagemPorStatus = () => {
  return useQuery<OrcamentosContagemPorStatus>({
    queryKey: [...ORCAMENTOS_QUERY_KEY, "contagem-por-status"],
    queryFn: orcamentosService.contarPorStatus,
    staleTime: ORCAMENTOS_STALE_TIME,
    gcTime: ORCAMENTOS_GC_TIME,
  });
};

export const useOrcamento = (id?: string) => {
  return useQuery<OrcamentoSupabase>({
    queryKey: [...ORCAMENTOS_QUERY_KEY, "detalhe", id],
    queryFn: () => orcamentosService.buscarPorId(id as string),
    enabled: Boolean(id),
  });
};

export const useCriarOrcamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OrcamentoFormInput) => orcamentosService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

export const useAtualizarOrcamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrcamentoFormInput }) =>
      orcamentosService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

export const useAlterarStatusOrcamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      extra,
    }: {
      id: string;
      status: OrcamentoStatus;
      extra?: {
        aprovadoPor?: string;
        motivoReprovacao?: string;
      };
    }) => orcamentosService.alterarStatus(id, status, extra),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

export const useAplicarDescontoOrcamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AplicarDescontoOrcamentoInput;
    }) => orcamentosService.aplicarDesconto(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

export const useCancelarOrcamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orcamentosService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

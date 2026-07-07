import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListarOrdensServicoPaginadoFiltros,
  OrdemServicoFormInput,
  OrdensServicoPaginadoResult,
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";

export const ORDENS_SERVICO_QUERY_KEY = ["ordens-servico"];
const DASHBOARD_QUERY_KEY = ["dashboard-operacional"];
export const ORDENS_SERVICO_STALE_TIME = 5 * 60 * 1000;
export const ORDENS_SERVICO_GC_TIME = 20 * 60 * 1000;
export const ORDENS_SERVICO_DEFAULT_PAGINADO_FILTROS: ListarOrdensServicoPaginadoFiltros =
  {
    termo: "",
    ocultarFechadas: false,
    estadoNome: undefined,
    solicitanteNome: undefined,
    tipoServicoNome: undefined,
    responsavelTecnico: "",
    numero: "",
    page: 1,
    limit: 25,
    sortBy: "numero_ordem",
    ascending: false,
  };

type UseOrdensServicoOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

const ORDENS_SERVICO_DETALHE_QUERY_KEY = [
  ...ORDENS_SERVICO_QUERY_KEY,
  "detalhe",
];

const invalidateOrdensServico = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_DETALHE_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
};

export const useOrdensServico = (options?: UseOrdensServicoOptions) => {
  return useQuery<OrdemServicoSupabase[]>({
    queryKey: ORDENS_SERVICO_QUERY_KEY,
    queryFn: ordensServicoService.listar,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? ORDENS_SERVICO_STALE_TIME,
    gcTime: options?.gcTime ?? ORDENS_SERVICO_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useOrdensServicoPaginadas = (
  filtros: ListarOrdensServicoPaginadoFiltros
) => {
  return useQuery<OrdensServicoPaginadoResult>({
    queryKey: [...ORDENS_SERVICO_QUERY_KEY, "paginado", filtros],
    queryFn: () => ordensServicoService.listarPaginado(filtros),
    placeholderData: (previousData) => previousData,
    staleTime: ORDENS_SERVICO_STALE_TIME,
    gcTime: ORDENS_SERVICO_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useCriarOrdemServico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OrdemServicoFormInput) =>
      ordensServicoService.criar(input),
    onSuccess: () => {
      invalidateOrdensServico(queryClient);
    },
  });
};

export const useAtualizarOrdemServico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: OrdemServicoFormInput;
    }) => ordensServicoService.atualizar(id, input),
    onSuccess: () => {
      invalidateOrdensServico(queryClient);
    },
  });
};

export const useAlterarEstadoOrdemServico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estadoOsId }: { id: string; estadoOsId: string }) =>
      ordensServicoService.alterarEstado(id, estadoOsId),
    onSuccess: () => {
      invalidateOrdensServico(queryClient);
    },
  });
};

export const useExcluirOrdemServico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordensServicoService.excluir(id),
    onSuccess: () => {
      invalidateOrdensServico(queryClient);
    },
  });
};

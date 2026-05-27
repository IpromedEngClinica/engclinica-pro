import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrdemServicoFormInput,
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";

export const ORDENS_SERVICO_QUERY_KEY = ["ordens-servico"];
const ORDENS_SERVICO_DETALHE_QUERY_KEY = [
  ...ORDENS_SERVICO_QUERY_KEY,
  "detalhe",
];

const invalidateOrdensServico = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_DETALHE_QUERY_KEY });
};

export const useOrdensServico = () => {
  return useQuery<OrdemServicoSupabase[]>({
    queryKey: ORDENS_SERVICO_QUERY_KEY,
    queryFn: ordensServicoService.listar,
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

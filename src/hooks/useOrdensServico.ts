import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrdemServicoFormInput,
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";

export const ORDENS_SERVICO_QUERY_KEY = ["ordens-servico"];

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
      queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: ORDENS_SERVICO_QUERY_KEY });
    },
  });
};
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrcamentoFormInput,
  OrcamentoStatus,
  OrcamentoSupabase,
  orcamentosService,
} from "@/services/orcamentosService";

export const ORCAMENTOS_QUERY_KEY = ["orcamentos"];

export const useOrcamentos = () => {
  return useQuery<OrcamentoSupabase[]>({
    queryKey: ORCAMENTOS_QUERY_KEY,
    queryFn: orcamentosService.listar,
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

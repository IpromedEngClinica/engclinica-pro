import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calibracaoExecucoesService,
  type CalibracaoExecucaoFormInput,
} from "@/services/calibracaoExecucoesService";
import { EQUIPAMENTO_HISTORICO_QUERY_KEY } from "@/hooks/useEquipamentoHistorico";

export const CALIBRACAO_EXECUCOES_QUERY_KEY = ["calibracao-execucoes"];
export const CALIBRACAO_EXECUCAO_QUERY_KEY = ["calibracao-execucao"];

const invalidateExecucoes = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_EXECUCOES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_EXECUCAO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: EQUIPAMENTO_HISTORICO_QUERY_KEY });
};

export const useCalibracaoExecucoes = () =>
  useQuery({
    queryKey: CALIBRACAO_EXECUCOES_QUERY_KEY,
    queryFn: () => calibracaoExecucoesService.listarExecucoes(),
  });

export const useCalibracaoExecucao = (id?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_EXECUCAO_QUERY_KEY, id],
    queryFn: () => calibracaoExecucoesService.buscarExecucaoPorId(id as string),
    enabled: Boolean(id),
  });

export const useCriarCalibracaoExecucao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalibracaoExecucaoFormInput) =>
      calibracaoExecucoesService.criarExecucao(input),
    onSuccess: () => invalidateExecucoes(queryClient),
  });
};

export const useAtualizarCalibracaoExecucao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CalibracaoExecucaoFormInput }) =>
      calibracaoExecucoesService.atualizarExecucao(id, input),
    onSuccess: () => invalidateExecucoes(queryClient),
  });
};

export const useCancelarCalibracaoExecucao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoExecucoesService.cancelarExecucao(id),
    onSuccess: () => invalidateExecucoes(queryClient),
  });
};

export const useFinalizarCalibracaoExecucao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pdf }: { id: string; pdf: Blob }) =>
      calibracaoExecucoesService.finalizarExecucao(id, pdf),
    onSuccess: () => invalidateExecucoes(queryClient),
  });
};

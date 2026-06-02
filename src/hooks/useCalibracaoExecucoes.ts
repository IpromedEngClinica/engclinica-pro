import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calibracaoExecucoesService,
  type CalibracaoExecucaoFormInput,
} from "@/services/calibracaoExecucoesService";
import { EQUIPAMENTO_HISTORICO_QUERY_KEY } from "@/hooks/useEquipamentoHistorico";
import { EQUIPAMENTOS_QUERY_KEY } from "@/hooks/useEquipamentos";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";

export const CALIBRACAO_EXECUCOES_QUERY_KEY = ["calibracao-execucoes"];
export const CALIBRACAO_EXECUCAO_QUERY_KEY = ["calibracao-execucao"];

const invalidateExecucoes = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_EXECUCOES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_EXECUCAO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: EQUIPAMENTO_HISTORICO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
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
    onSettled: () => invalidateExecucoes(queryClient),
  });
};

export const useAtualizarCalibracaoExecucao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CalibracaoExecucaoFormInput }) =>
      calibracaoExecucoesService.atualizarExecucao(id, input),
    onSettled: () => invalidateExecucoes(queryClient),
  });
};

export const useSalvarCalibracaoFinalizada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalibracaoExecucaoFormInput) =>
      calibracaoExecucoesService.salvarCalibracaoFinalizada(
        input,
        (execucao) => gerarPdfCalibracaoCertificado(execucao, false)
      ),
    onSettled: () => invalidateExecucoes(queryClient),
  });
};

export const useEditarCalibracaoFinalizada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      motivo,
    }: {
      id: string;
      input: CalibracaoExecucaoFormInput;
      motivo?: string | null;
    }) =>
      calibracaoExecucoesService.editarCalibracaoFinalizada(
        id,
        input,
        (execucao) => gerarPdfCalibracaoCertificado(execucao, false),
        motivo
      ),
    onSettled: () => invalidateExecucoes(queryClient),
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

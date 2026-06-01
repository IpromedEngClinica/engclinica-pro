import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalibracaoProcedimentoFormInput,
  CalibracaoProcedimentoPontoInput,
  CalibracaoProcedimentoTabelaInput,
  calibracaoProcedimentosService,
} from "@/services/calibracaoProcedimentosService";

export const CALIBRACAO_PROCEDIMENTOS_QUERY_KEY = ["calibracao-procedimentos"];
export const CALIBRACAO_PROCEDIMENTO_QUERY_KEY = ["calibracao-procedimento"];
export const CALIBRACAO_PADROES_VALIDOS_QUERY_KEY = ["calibracao-padroes-validos"];
export const CALIBRACAO_PADRAO_TABELAS_QUERY_KEY = ["calibracao-padrao-tabelas"];

const invalidateProcedimentos = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_PROCEDIMENTOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_PROCEDIMENTO_QUERY_KEY });
};

export const useCalibracaoProcedimentos = () =>
  useQuery({
    queryKey: CALIBRACAO_PROCEDIMENTOS_QUERY_KEY,
    queryFn: () => calibracaoProcedimentosService.listarProcedimentos(),
  });

export const useCalibracaoProcedimento = (id?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PROCEDIMENTO_QUERY_KEY, id],
    queryFn: () => calibracaoProcedimentosService.buscarProcedimentoPorId(id as string),
    enabled: Boolean(id),
  });

export const useCalibracaoPadroesValidos = (dataReferencia?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PADROES_VALIDOS_QUERY_KEY, dataReferencia],
    queryFn: () => calibracaoProcedimentosService.listarPadroesValidos(dataReferencia),
  });

export const useCalibracaoPadraoTabelas = (padraoId?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PADRAO_TABELAS_QUERY_KEY, padraoId],
    queryFn: () =>
      calibracaoProcedimentosService.listarTabelasDoPadrao(padraoId as string),
    enabled: Boolean(padraoId),
  });

export const useCriarCalibracaoProcedimento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalibracaoProcedimentoFormInput) =>
      calibracaoProcedimentosService.criarProcedimento(input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useAtualizarCalibracaoProcedimento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CalibracaoProcedimentoFormInput }) =>
      calibracaoProcedimentosService.atualizarProcedimento(id, input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useDuplicarCalibracaoProcedimento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoProcedimentosService.duplicarProcedimento(id),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useDesativarCalibracaoProcedimento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoProcedimentosService.desativarProcedimento(id),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useCriarCalibracaoProcedimentoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ procedimentoId, input }: { procedimentoId: string; input: CalibracaoProcedimentoTabelaInput }) =>
      calibracaoProcedimentosService.criarTabela(procedimentoId, input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useAtualizarCalibracaoProcedimentoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CalibracaoProcedimentoTabelaInput }) =>
      calibracaoProcedimentosService.atualizarTabela(id, input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useRemoverCalibracaoProcedimentoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoProcedimentosService.removerTabela(id),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useCriarCalibracaoProcedimentoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tabelaId, input }: { tabelaId: string; input: CalibracaoProcedimentoPontoInput }) =>
      calibracaoProcedimentosService.criarPonto(tabelaId, input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useAtualizarCalibracaoProcedimentoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CalibracaoProcedimentoPontoInput }) =>
      calibracaoProcedimentosService.atualizarPonto(id, input),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useRemoverCalibracaoProcedimentoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoProcedimentosService.removerPonto(id),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

export const useSalvarCalibracaoProcedimentoTabelas = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ procedimentoId, tabelas }: { procedimentoId: string; tabelas: CalibracaoProcedimentoTabelaInput[] }) =>
      calibracaoProcedimentosService.salvarTabelasProcedimento(procedimentoId, tabelas),
    onSuccess: () => invalidateProcedimentos(queryClient),
  });
};

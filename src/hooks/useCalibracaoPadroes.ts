import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalibracaoPadraoDocumento,
  CalibracaoPadraoFormInput,
  CalibracaoPadraoPontoInput,
  CalibracaoPadraoTabelaInput,
  RenovarCalibracaoPadraoInput,
  UploadCalibracaoPadraoDocumentoInput,
  calibracaoPadroesService,
} from "@/services/calibracaoPadroesService";

export const CALIBRACAO_PADROES_QUERY_KEY = ["calibracao-padroes"];
export const CALIBRACAO_PADRAO_QUERY_KEY = ["calibracao-padrao"];
export const CALIBRACAO_PADRAO_DOCUMENTOS_QUERY_KEY = [
  "calibracao-padrao-documentos",
];

const invalidatePadroes = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_PADROES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CALIBRACAO_PADRAO_QUERY_KEY });
  queryClient.invalidateQueries({
    queryKey: CALIBRACAO_PADRAO_DOCUMENTOS_QUERY_KEY,
  });
};

export const useCalibracaoPadroes = () =>
  useQuery({
    queryKey: CALIBRACAO_PADROES_QUERY_KEY,
    queryFn: () => calibracaoPadroesService.listarPadroes(),
  });

export const useCalibracaoPadrao = (id?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PADRAO_QUERY_KEY, id],
    queryFn: () => calibracaoPadroesService.buscarPadraoPorId(id as string),
    enabled: Boolean(id),
  });

export const useCalibracaoPadraoHistorico = (id?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PADRAO_QUERY_KEY, "historico", id],
    queryFn: () => calibracaoPadroesService.listarHistoricoPadrao(id as string),
    enabled: Boolean(id),
  });

export const useCriarCalibracaoPadrao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalibracaoPadraoFormInput) =>
      calibracaoPadroesService.criarPadrao(input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useAtualizarCalibracaoPadrao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CalibracaoPadraoFormInput;
    }) => calibracaoPadroesService.atualizarPadrao(id, input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useRenovarCalibracaoPadrao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RenovarCalibracaoPadraoInput) =>
      calibracaoPadroesService.renovarPadrao(input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useDesativarCalibracaoPadrao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoPadroesService.desativarPadrao(id),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useCriarCalibracaoPadraoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      padraoId,
      input,
    }: {
      padraoId: string;
      input: CalibracaoPadraoTabelaInput;
    }) => calibracaoPadroesService.criarTabela(padraoId, input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useAtualizarCalibracaoPadraoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CalibracaoPadraoTabelaInput;
    }) => calibracaoPadroesService.atualizarTabela(id, input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useRemoverCalibracaoPadraoTabela = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoPadroesService.removerTabela(id),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useCriarCalibracaoPadraoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tabelaId,
      input,
    }: {
      tabelaId: string;
      input: CalibracaoPadraoPontoInput;
    }) => calibracaoPadroesService.criarPonto(tabelaId, input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useAtualizarCalibracaoPadraoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CalibracaoPadraoPontoInput;
    }) => calibracaoPadroesService.atualizarPonto(id, input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useRemoverCalibracaoPadraoPonto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calibracaoPadroesService.removerPonto(id),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useSalvarCalibracaoPadraoTabelas = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      padraoId,
      tabelas,
    }: {
      padraoId: string;
      tabelas: CalibracaoPadraoTabelaInput[];
    }) => calibracaoPadroesService.salvarTabelasPadrao(padraoId, tabelas),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useCalibracaoPadraoDocumentos = (padraoId?: string) =>
  useQuery({
    queryKey: [...CALIBRACAO_PADRAO_DOCUMENTOS_QUERY_KEY, padraoId],
    queryFn: () => calibracaoPadroesService.listarDocumentos(padraoId as string),
    enabled: Boolean(padraoId),
  });

export const useUploadCalibracaoPadraoDocumento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadCalibracaoPadraoDocumentoInput) =>
      calibracaoPadroesService.uploadDocumento(input),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};

export const useRemoverCalibracaoPadraoDocumento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documento: CalibracaoPadraoDocumento) =>
      calibracaoPadroesService.removerDocumento(documento),
    onSuccess: () => invalidatePadroes(queryClient),
  });
};


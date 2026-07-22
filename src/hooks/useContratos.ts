import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ContratoFormInput,
  ContratoSupabase,
  ContratoDocumentoSupabase,
  ListarContratosFiltros,
  UploadContratoDocumentoInput,
  contratosService,
} from "@/services/contratosService";
import {
  SESSION_CACHE_GC_TIME,
  SESSION_CACHE_STALE_TIME,
} from "@/lib/queryClient";

export const CONTRATOS_QUERY_KEY = ["contratos"];
export const CONTRATO_DOCUMENTOS_QUERY_KEY = ["contrato-documentos"];

const invalidateContratos = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: CONTRATOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CONTRATO_DOCUMENTOS_QUERY_KEY });
};

export const useContratos = (filtros?: ListarContratosFiltros) => {
  return useQuery<ContratoSupabase[]>({
    queryKey: [...CONTRATOS_QUERY_KEY, filtros],
    queryFn: () => contratosService.listar(filtros),
    staleTime: SESSION_CACHE_STALE_TIME,
    gcTime: SESSION_CACHE_GC_TIME,
  });
};

export const useContrato = (id?: string) => {
  return useQuery<ContratoSupabase>({
    queryKey: [...CONTRATOS_QUERY_KEY, id],
    queryFn: () => contratosService.buscarPorId(id as string),
    enabled: Boolean(id),
  });
};

export const useCriarContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContratoFormInput) => contratosService.criar(input),
    onSuccess: () => invalidateContratos(queryClient),
  });
};

export const useAtualizarContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContratoFormInput }) =>
      contratosService.atualizar(id, input),
    onSuccess: () => invalidateContratos(queryClient),
  });
};

export const useDesativarContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contratosService.desativar(id),
    onSuccess: () => invalidateContratos(queryClient),
  });
};

export const useContratoDocumentos = (contratoId?: string) => {
  return useQuery<ContratoDocumentoSupabase[]>({
    queryKey: [...CONTRATO_DOCUMENTOS_QUERY_KEY, contratoId],
    queryFn: () => contratosService.listarDocumentos(contratoId as string),
    enabled: Boolean(contratoId),
  });
};

export const useUploadContratoDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadContratoDocumentoInput) =>
      contratosService.uploadDocumento(input),
    onSuccess: () => invalidateContratos(queryClient),
  });
};

export const useRemoverContratoDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documento: ContratoDocumentoSupabase) =>
      contratosService.removerDocumento(documento),
    onSuccess: () => invalidateContratos(queryClient),
  });
};

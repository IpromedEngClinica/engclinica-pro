import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExcluirEmpresaInput,
  EmpresaFormInput,
  empresasService,
  EmpresaSupabase,
  ListarEmpresasFiltros,
} from "@/services/empresasService";

export const EMPRESAS_QUERY_KEY = ["empresas"];

export const useEmpresas = (filtros?: ListarEmpresasFiltros) => {
  return useQuery<EmpresaSupabase[]>({
    queryKey: [...EMPRESAS_QUERY_KEY, filtros],
    queryFn: () => empresasService.listar(filtros),
  });
};

export const useCriarEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmpresaFormInput) => empresasService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
    },
  });
};

export const useAtualizarEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmpresaFormInput }) =>
      empresasService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
    },
  });
};

export const useExcluirEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ExcluirEmpresaInput;
    }) => empresasService.excluir(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPRESAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

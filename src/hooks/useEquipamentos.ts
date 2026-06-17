import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EquipamentoFormInput,
  equipamentosService,
  EquipamentoSupabase,
  ListarEquipamentosFiltros,
} from "@/services/equipamentosService";

export const EQUIPAMENTOS_QUERY_KEY = ["equipamentos"];

export const useEquipamentos = (filtros?: ListarEquipamentosFiltros) => {
  return useQuery<EquipamentoSupabase[]>({
    queryKey: [...EQUIPAMENTOS_QUERY_KEY, filtros],
    queryFn: () => equipamentosService.listar(filtros),
  });
};

export const useCriarEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EquipamentoFormInput) =>
      equipamentosService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
    },
  });
};

export const useAtualizarEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EquipamentoFormInput }) =>
      equipamentosService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
    },
  });
};

export const useCriarEquipamentosEmLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: EquipamentoFormInput[]) =>
      equipamentosService.criarEmLote(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
    },
  });
};

export const useExcluirEquipamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipamentosService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

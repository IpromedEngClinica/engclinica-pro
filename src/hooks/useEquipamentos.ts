import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EquipamentoFormInput,
  equipamentosService,
  EquipamentoSupabase,
} from "@/services/equipamentosService";

export const EQUIPAMENTOS_QUERY_KEY = ["equipamentos"];

export const useEquipamentos = () => {
  return useQuery<EquipamentoSupabase[]>({
    queryKey: EQUIPAMENTOS_QUERY_KEY,
    queryFn: equipamentosService.listar,
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
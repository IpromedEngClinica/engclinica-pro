import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AtualizarChecklistPreventivaInput,
  ExecutarPreventivaInput,
  preventivasService,
} from "@/services/preventivasService";

export const useExecutarPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExecutarPreventivaInput) =>
      preventivasService.executarPreventiva(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["procedimentos-preventiva"] });
    },
  });
};

export const useAtualizarChecklistPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AtualizarChecklistPreventivaInput) =>
      preventivasService.atualizarChecklistPreventiva(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
    },
  });
};

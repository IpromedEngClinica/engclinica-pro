import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtualizarChecklistPreventivaInput,
  ConcluirChecklistPreventivaInput,
  ExecutarPreventivaInput,
  SalvarChecklistPreventivaOsInput,
  preventivasService,
} from "@/services/preventivasService";

export const CHECKLIST_PREVENTIVA_QUERY_KEY = ["checklist-preventiva"];

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

export const useChecklistPreventivaPorOs = (osId?: string | null) =>
  useQuery({
    queryKey: [...CHECKLIST_PREVENTIVA_QUERY_KEY, osId],
    queryFn: () => preventivasService.buscarChecklistPorOsId(osId as string),
    enabled: Boolean(osId),
  });

export const useSalvarChecklistRascunho = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SalvarChecklistPreventivaOsInput) =>
      preventivasService.salvarChecklistRascunho(input),
    onSuccess: (os) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: [...CHECKLIST_PREVENTIVA_QUERY_KEY, os.id] });
    },
  });
};

export const useConcluirChecklistPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConcluirChecklistPreventivaInput) =>
      preventivasService.concluirChecklistPreventiva(input),
    onSuccess: (os) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["plano-ciclo-atual"] });
      queryClient.invalidateQueries({ queryKey: ["plano-ciclo-itens"] });
      queryClient.invalidateQueries({ queryKey: [...CHECKLIST_PREVENTIVA_QUERY_KEY, os.id] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  relatoriosService,
  type RelatorioControlePatrimonialInput,
  type RelatorioVisitaExternaInput,
} from "@/services/relatoriosService";

export const RELATORIOS_QUERY_KEY = ["relatorios"];
export const RELATORIOS_EQUIPAMENTOS_OPCOES_QUERY_KEY = [
  ...RELATORIOS_QUERY_KEY,
  "equipamentos-opcoes",
];
export const RELATORIOS_EQUIPAMENTOS_STALE_TIME = 5 * 60 * 1000;
export const RELATORIOS_EQUIPAMENTOS_GC_TIME = 20 * 60 * 1000;

export const useRelatorios = () =>
  useQuery({
    queryKey: RELATORIOS_QUERY_KEY,
    queryFn: () => relatoriosService.listar(),
  });

export const useRelatoriosEquipamentosOpcoes = (empresaIds: string[] = []) =>
  useQuery({
    queryKey: [...RELATORIOS_EQUIPAMENTOS_OPCOES_QUERY_KEY, empresaIds],
    queryFn: () => relatoriosService.listarOpcoesEquipamentos(empresaIds),
    staleTime: RELATORIOS_EQUIPAMENTOS_STALE_TIME,
    gcTime: RELATORIOS_EQUIPAMENTOS_GC_TIME,
  });

export const useCriarRelatorioControlePatrimonial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RelatorioControlePatrimonialInput) =>
      relatoriosService.criarControlePatrimonial(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATORIOS_QUERY_KEY });
    },
  });
};

export const useAtualizarRelatorioControlePatrimonial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RelatorioControlePatrimonialInput;
    }) => relatoriosService.atualizarControlePatrimonial(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATORIOS_QUERY_KEY });
    },
  });
};

export const useCriarRelatorioVisitaExterna = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RelatorioVisitaExternaInput) =>
      relatoriosService.criarVisitaExterna(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATORIOS_QUERY_KEY });
    },
  });
};

export const useAtualizarRelatorioVisitaExterna = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RelatorioVisitaExternaInput;
    }) => relatoriosService.atualizarVisitaExterna(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATORIOS_QUERY_KEY });
    },
  });
};

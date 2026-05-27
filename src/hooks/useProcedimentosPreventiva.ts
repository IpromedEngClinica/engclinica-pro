import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProcedimentoPreventiva,
  ProcedimentoPreventivaInput,
  procedimentosPreventivaService,
} from "@/services/procedimentosPreventivaService";

export const PROCEDIMENTOS_PREVENTIVA_QUERY_KEY = [
  "procedimentos-preventiva",
];

const invalidateProcedimentosPreventiva = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  queryClient.invalidateQueries({
    queryKey: PROCEDIMENTOS_PREVENTIVA_QUERY_KEY,
  });
  queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
};

export const useProcedimentosPreventiva = () => {
  return useQuery<ProcedimentoPreventiva[]>({
    queryKey: PROCEDIMENTOS_PREVENTIVA_QUERY_KEY,
    queryFn: procedimentosPreventivaService.listar,
  });
};

export const useProcedimentoPreventiva = (id?: string) => {
  return useQuery<ProcedimentoPreventiva>({
    queryKey: [...PROCEDIMENTOS_PREVENTIVA_QUERY_KEY, "detalhe", id],
    queryFn: () => procedimentosPreventivaService.buscarPorId(id as string),
    enabled: Boolean(id),
  });
};

export const useProcedimentoPreventivaPorTipoEquipamento = (
  tipoEquipamentoId?: string | null
) => {
  return useQuery<ProcedimentoPreventiva | null>({
    queryKey: [
      ...PROCEDIMENTOS_PREVENTIVA_QUERY_KEY,
      "tipo-equipamento",
      tipoEquipamentoId,
    ],
    queryFn: () =>
      procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(
        tipoEquipamentoId as string
      ),
    enabled: Boolean(tipoEquipamentoId),
  });
};

export const useCriarProcedimentoPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProcedimentoPreventivaInput) =>
      procedimentosPreventivaService.criar(input),
    onSuccess: () => invalidateProcedimentosPreventiva(queryClient),
  });
};

export const useAtualizarProcedimentoPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ProcedimentoPreventivaInput;
    }) => procedimentosPreventivaService.atualizar(id, input),
    onSuccess: () => invalidateProcedimentosPreventiva(queryClient),
  });
};

export const useDesativarProcedimentoPreventiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => procedimentosPreventivaService.desativar(id),
    onSuccess: () => invalidateProcedimentosPreventiva(queryClient),
  });
};

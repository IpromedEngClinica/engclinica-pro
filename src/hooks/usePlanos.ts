import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  planosService,
  type PlanoEquipamentoInput,
  type PlanoExecucaoInput,
  type PlanoInput,
  type PlanoSetorInput,
} from "@/services/planosService";

export const PLANOS_QUERY_KEY = ["planos"];
export const PLANO_EXECUCOES_QUERY_KEY = ["plano-execucoes"];

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PLANO_EXECUCOES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
  queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
  queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
};

export const usePlanos = (ativo?: boolean) => useQuery({
  queryKey: [...PLANOS_QUERY_KEY, ativo],
  queryFn: () => planosService.listarPlanos(ativo),
});
export const usePlano = (id?: string) => useQuery({
  queryKey: [...PLANOS_QUERY_KEY, id],
  queryFn: () => planosService.buscarPlanoPorId(id as string),
  enabled: Boolean(id),
});
export const usePlanoExecucoes = () => useQuery({
  queryKey: PLANO_EXECUCOES_QUERY_KEY,
  queryFn: () => planosService.listarExecucoesPlano(),
});
export const usePlanoExecucao = (id?: string) => useQuery({
  queryKey: [...PLANO_EXECUCOES_QUERY_KEY, id],
  queryFn: () => planosService.buscarExecucaoPlanoPorId(id as string),
  enabled: Boolean(id),
});
export const useVisitasPlano = (planoId?: string) => useQuery({
  queryKey: [...PLANO_EXECUCOES_QUERY_KEY, "plano", planoId],
  queryFn: () => planosService.listarVisitasPlano(planoId as string),
  enabled: Boolean(planoId),
});
export const useVisitaPlano = (id?: string) => useQuery({
  queryKey: [...PLANO_EXECUCOES_QUERY_KEY, "visita", id],
  queryFn: () => planosService.buscarVisitaPlano(id as string),
  enabled: Boolean(id),
});
export const useItensVisita = (id?: string) => useQuery({
  queryKey: [...PLANO_EXECUCOES_QUERY_KEY, "visita", id, "itens"],
  queryFn: () => planosService.listarItensVisita(id as string),
  enabled: Boolean(id),
});

const usePlanMutation = <T, TResult>(fn: (input: T) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(queryClient) });
};

export const useCriarPlano = () => usePlanMutation((input: PlanoInput) => planosService.criarPlano(input));
export const useAtualizarPlano = () => usePlanMutation(({ id, input }: { id: string; input: PlanoInput }) => planosService.atualizarPlano(id, input));
export const useDesativarPlano = () => usePlanMutation((id: string) => planosService.desativarPlano(id));
export const useCriarSetorPlano = () => usePlanMutation(({ planoId, input }: { planoId: string; input: PlanoSetorInput }) => planosService.criarSetorPlano(planoId, input));
export const useAtualizarSetorPlano = () => usePlanMutation(({ id, input }: { id: string; input: PlanoSetorInput }) => planosService.atualizarSetorPlano(id, input));
export const useRemoverSetorPlano = () => usePlanMutation((id: string) => planosService.removerSetorPlano(id));
export const useAdicionarEquipamentoPlano = () => usePlanMutation(({ planoId, input }: { planoId: string; input: PlanoEquipamentoInput }) => planosService.adicionarEquipamentoPlano(planoId, input));
export const useAtualizarEquipamentoPlano = () => usePlanMutation(({ id, input }: { id: string; input: PlanoEquipamentoInput }) => planosService.atualizarEquipamentoPlano(id, input));
export const useRemoverEquipamentoPlano = () => usePlanMutation((id: string) => planosService.removerEquipamentoPlano(id));
export const useCriarExecucaoPlano = () => usePlanMutation(({ planoId, input }: { planoId: string; input: PlanoExecucaoInput }) => planosService.criarExecucaoPlano(planoId, input));
export const useAtualizarExecucaoPlano = () => usePlanMutation(({ id, input }: { id: string; input: PlanoExecucaoInput }) => planosService.atualizarExecucaoPlano(id, input));
export const useIniciarItemExecucao = () => usePlanMutation((id: string) => planosService.iniciarItemExecucao(id));
export const useConcluirItemExecucao = () => usePlanMutation(({ id, payload }: { id: string; payload?: { osId?: string | null; calibracaoExecucaoId?: string | null; observacoes?: string | null } }) => planosService.concluirItemExecucao(id, payload));
export const useCancelarItemExecucao = () => usePlanMutation(({ id, motivo }: { id: string; motivo?: string }) => planosService.cancelarItemExecucao(id, motivo));
export const useAbrirPreventivasEmLote = () => usePlanMutation((ids: string[]) => planosService.abrirPreventivasEmLote(ids));
export const useCriarOuAbrirOsPreventivaItem = () => usePlanMutation((id: string) => planosService.criarOuAbrirOsPreventivaItem(id));
export const useFinalizarPreventivasConformesEmLote = () => usePlanMutation(({ ids, visitaId }: { ids: string[]; visitaId: string }) => planosService.finalizarPreventivasConformesEmLote(ids, visitaId));
export const useAbrirCalibracoesEmLote = () => usePlanMutation((ids: string[]) => planosService.abrirCalibracoesEmLote(ids));
export const useCriarOuAbrirCalibracaoItem = () => usePlanMutation((id: string) => planosService.criarOuAbrirCalibracaoItem(id));
export const useCancelarItensVisitaEmLote = () => usePlanMutation(({ ids, motivo }: { ids: string[]; motivo: string }) => planosService.cancelarItensEmLote(ids, motivo));
export const useConcluirExecucaoPlano = () => usePlanMutation((id: string) => planosService.concluirExecucaoPlano(id));
export const useCancelarExecucaoPlano = () => usePlanMutation((id: string) => planosService.cancelarExecucaoPlano(id));
export const useCriarVisitaPlano = useCriarExecucaoPlano;
export const useAtualizarVisitaPlano = useAtualizarExecucaoPlano;
export const useConcluirVisitaPlano = useConcluirExecucaoPlano;
export const useAtualizarItemVisita = useConcluirItemExecucao;

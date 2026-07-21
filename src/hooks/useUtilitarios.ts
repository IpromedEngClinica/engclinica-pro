import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EQUIPAMENTOS_QUERY_KEY } from "@/hooks/useEquipamentos";
import {
  AtualizarMensalidadeInput,
  ReciboInput,
  TermoLocacaoInput,
  TermoLocacaoStatus,
  VencimentosFiltro,
  utilitariosService,
} from "@/services/utilitariosService";

export const TERMOS_LOCACAO_QUERY_KEY = ["utilitarios", "termos-locacao"];
export const RECIBOS_QUERY_KEY = ["utilitarios", "recibos"];
export const RECIBO_VINCULOS_QUERY_KEY = ["utilitarios", "recibo-vinculos"];
export const VENCIMENTOS_QUERY_KEY = ["utilitarios", "vencimentos"];
export const UTILITARIOS_STALE_TIME = 5 * 60 * 1000;
export const UTILITARIOS_GC_TIME = 20 * 60 * 1000;

type UseUtilitariosQueryOptions = {
  enabled?: boolean;
};

export const useTermosLocacao = (options?: UseUtilitariosQueryOptions) => {
  return useQuery({
    queryKey: TERMOS_LOCACAO_QUERY_KEY,
    queryFn: () => utilitariosService.listarTermosLocacao(),
    enabled: options?.enabled ?? true,
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
  });
};

export const useVencimentosUtilitarios = (
  filtro: VencimentosFiltro,
  options?: UseUtilitariosQueryOptions
) => {
  return useQuery({
    queryKey: [...VENCIMENTOS_QUERY_KEY, filtro],
    queryFn: () => utilitariosService.gerarRelatorioVencimentos(filtro),
    enabled:
      (options?.enabled ?? true) &&
      (filtro.incluirCalibracao || filtro.incluirPreventiva),
    placeholderData: (previousData) => previousData,
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useRecibos = (options?: UseUtilitariosQueryOptions) => {
  return useQuery({
    queryKey: RECIBOS_QUERY_KEY,
    queryFn: () => utilitariosService.listarRecibos(),
    enabled: options?.enabled ?? true,
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
  });
};

export const useReciboEquipamentos = (
  empresaId: string,
  options?: UseUtilitariosQueryOptions
) => {
  return useQuery({
    queryKey: [
      ...RECIBO_VINCULOS_QUERY_KEY,
      "equipamentos",
      empresaId,
    ],
    queryFn: () => utilitariosService.listarEquipamentosParaRecibo(empresaId),
    enabled: (options?.enabled ?? true) && Boolean(empresaId),
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useReciboOrdensServico = (
  empresaId: string,
  equipamentoId: string,
  options?: UseUtilitariosQueryOptions
) => {
  return useQuery({
    queryKey: [
      ...RECIBO_VINCULOS_QUERY_KEY,
      "ordens-servico",
      empresaId,
      equipamentoId,
    ],
    queryFn: () =>
      utilitariosService.listarOrdensServicoParaRecibo(
        empresaId,
        equipamentoId
      ),
    enabled:
      (options?.enabled ?? true) && Boolean(empresaId && equipamentoId),
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useReciboOrcamentos = (
  empresaId: string,
  equipamentoId: string,
  ordemServicoId: string,
  options?: UseUtilitariosQueryOptions
) => {
  return useQuery({
    queryKey: [
      ...RECIBO_VINCULOS_QUERY_KEY,
      "orcamentos",
      empresaId,
      equipamentoId,
      ordemServicoId || "todos",
    ],
    queryFn: () =>
      utilitariosService.listarOrcamentosParaRecibo(
        empresaId,
        equipamentoId,
        ordemServicoId || undefined
      ),
    enabled:
      (options?.enabled ?? true) && Boolean(empresaId && equipamentoId),
    staleTime: UTILITARIOS_STALE_TIME,
    gcTime: UTILITARIOS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useCriarTermoLocacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TermoLocacaoInput) =>
      utilitariosService.criarTermoLocacao(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TERMOS_LOCACAO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
    },
  });
};

export const useCriarRecibo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReciboInput) => utilitariosService.criarRecibo(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIBOS_QUERY_KEY });
    },
  });
};

export const useAtualizarStatusTermoLocacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      dataDevolucao,
    }: {
      id: string;
      status: TermoLocacaoStatus;
      dataDevolucao?: string | null;
    }) =>
      utilitariosService.atualizarStatusTermoLocacao(
        id,
        status,
        dataDevolucao
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TERMOS_LOCACAO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_QUERY_KEY });
    },
  });
};

export const useAtualizarMensalidadeTermo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AtualizarMensalidadeInput) =>
      utilitariosService.atualizarMensalidade(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TERMOS_LOCACAO_QUERY_KEY });
    },
  });
};

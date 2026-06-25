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
export const VENCIMENTOS_QUERY_KEY = ["utilitarios", "vencimentos"];

export const useTermosLocacao = () => {
  return useQuery({
    queryKey: TERMOS_LOCACAO_QUERY_KEY,
    queryFn: () => utilitariosService.listarTermosLocacao(),
  });
};

export const useVencimentosUtilitarios = (filtro: VencimentosFiltro) => {
  return useQuery({
    queryKey: [...VENCIMENTOS_QUERY_KEY, filtro],
    queryFn: () => utilitariosService.gerarRelatorioVencimentos(filtro),
    enabled: filtro.incluirCalibracao || filtro.incluirPreventiva,
  });
};

export const useRecibos = () => {
  return useQuery({
    queryKey: RECIBOS_QUERY_KEY,
    queryFn: () => utilitariosService.listarRecibos(),
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

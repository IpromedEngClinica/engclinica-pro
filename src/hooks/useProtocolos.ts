import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProtocoloOSFormInput,
  protocolosService,
  ProtocoloOSSupabase,
  TipoProtocoloOS,
} from "@/services/protocolosService";

export const PROTOCOLOS_QUERY_KEY = ["protocolos-os"];

export const useProtocolos = (tipo?: TipoProtocoloOS) => {
  return useQuery<ProtocoloOSSupabase[]>({
    queryKey: [...PROTOCOLOS_QUERY_KEY, tipo || "todos"],
    queryFn: () => protocolosService.listar(tipo),
  });
};

export const useProtocolo = (id?: string) => {
  return useQuery<ProtocoloOSSupabase>({
    queryKey: [...PROTOCOLOS_QUERY_KEY, "detalhe", id],
    queryFn: () => protocolosService.buscarPorId(id as string),
    enabled: Boolean(id),
  });
};

export const useCriarProtocolo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProtocoloOSFormInput) => protocolosService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROTOCOLOS_QUERY_KEY });
    },
  });
};

export const useAtualizarProtocolo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ProtocoloOSFormInput;
    }) => protocolosService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROTOCOLOS_QUERY_KEY });
    },
  });
};

export const useCancelarProtocolo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => protocolosService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROTOCOLOS_QUERY_KEY });
    },
  });
};

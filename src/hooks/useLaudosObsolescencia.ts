import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CriarLaudoObsolescenciaInput,
  CriarMotivoObsolescenciaInput,
  LaudoObsolescenciaSupabase,
  laudosObsolescenciaService,
  MotivoObsolescenciaSupabase,
} from "@/services/laudosObsolescenciaService";

export const LAUDOS_OBSOLESCENCIA_QUERY_KEY = ["laudos-obsolescencia"];
export const MOTIVOS_OBSOLESCENCIA_QUERY_KEY = ["motivos-obsolescencia"];

export const useLaudosObsolescencia = () => {
  return useQuery<LaudoObsolescenciaSupabase[]>({
    queryKey: LAUDOS_OBSOLESCENCIA_QUERY_KEY,
    queryFn: laudosObsolescenciaService.listar,
  });
};

export const useLaudoObsolescencia = (id?: string) => {
  return useQuery<LaudoObsolescenciaSupabase>({
    queryKey: [...LAUDOS_OBSOLESCENCIA_QUERY_KEY, id],
    queryFn: () => laudosObsolescenciaService.buscarPorId(id as string),
    enabled: Boolean(id),
  });
};

export const useCriarLaudoObsolescencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CriarLaudoObsolescenciaInput) =>
      laudosObsolescenciaService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: LAUDOS_OBSOLESCENCIA_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
    },
  });
};

export const useMotivosObsolescencia = () => {
  return useQuery<MotivoObsolescenciaSupabase[]>({
    queryKey: MOTIVOS_OBSOLESCENCIA_QUERY_KEY,
    queryFn: laudosObsolescenciaService.listarMotivos,
  });
};

export const useGarantirMotivosPadraoObsolescencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => laudosObsolescenciaService.garantirMotivosPadrao(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MOTIVOS_OBSOLESCENCIA_QUERY_KEY,
      });
    },
  });
};

export const useCriarMotivoObsolescencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CriarMotivoObsolescenciaInput) =>
      laudosObsolescenciaService.criarMotivo(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MOTIVOS_OBSOLESCENCIA_QUERY_KEY,
      });
    },
  });
};

export const useDesativarMotivoObsolescencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => laudosObsolescenciaService.desativarMotivo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MOTIVOS_OBSOLESCENCIA_QUERY_KEY,
      });
    },
  });
};

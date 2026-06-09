import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  segurancaEletricaService,
  type SegurancaEletricaFormInput,
} from "@/services/segurancaEletricaService";

export const SEGURANCA_ELETRICA_QUERY_KEY = ["seguranca-eletrica"];

export const useSegurancaEletrica = () =>
  useQuery({
    queryKey: SEGURANCA_ELETRICA_QUERY_KEY,
    queryFn: () => segurancaEletricaService.listar(),
  });

export const useCriarSegurancaEletrica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SegurancaEletricaFormInput) =>
      segurancaEletricaService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEGURANCA_ELETRICA_QUERY_KEY });
    },
  });
};

export const useAtualizarSegurancaEletrica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: SegurancaEletricaFormInput;
    }) => segurancaEletricaService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEGURANCA_ELETRICA_QUERY_KEY });
    },
  });
};

export const useCancelarSegurancaEletrica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => segurancaEletricaService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEGURANCA_ELETRICA_QUERY_KEY });
    },
  });
};

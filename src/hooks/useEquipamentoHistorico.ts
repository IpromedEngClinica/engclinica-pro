import { useQuery } from "@tanstack/react-query";
import {
  EquipamentoHistorico,
  equipamentoHistoricoService,
} from "@/services/equipamentoHistoricoService";

export const EQUIPAMENTO_HISTORICO_QUERY_KEY = ["equipamento-historico"];

export const useEquipamentoHistorico = (equipamentoId?: string) => {
  return useQuery<EquipamentoHistorico>({
    queryKey: [...EQUIPAMENTO_HISTORICO_QUERY_KEY, equipamentoId],
    queryFn: () =>
      equipamentoHistoricoService.buscarPorEquipamento(
        equipamentoId as string
      ),
    enabled: Boolean(equipamentoId),
  });
};

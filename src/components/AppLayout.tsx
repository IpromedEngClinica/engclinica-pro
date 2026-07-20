import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import {
  ORDENS_SERVICO_DEFAULT_PAGINADO_FILTROS,
  ORDENS_SERVICO_GC_TIME,
  ORDENS_SERVICO_QUERY_KEY,
  ORDENS_SERVICO_STALE_TIME,
} from "@/hooks/useOrdensServico";
import { ordensServicoService } from "@/services/ordensServicoService";
import {
  EQUIPAMENTOS_DEFAULT_PAGINADO_FILTROS,
  EQUIPAMENTOS_GC_TIME,
  EQUIPAMENTOS_QUERY_KEY,
  EQUIPAMENTOS_STALE_TIME,
} from "@/hooks/useEquipamentos";
import { equipamentosService } from "@/services/equipamentosService";
import {
  UTILITARIOS_GC_TIME,
  UTILITARIOS_STALE_TIME,
  VENCIMENTOS_QUERY_KEY,
} from "@/hooks/useUtilitarios";
import { utilitariosService } from "@/services/utilitariosService";
import {
  CALIBRACAO_EXECUCOES_DEFAULT_PAGINADO_FILTROS,
  CALIBRACAO_EXECUCOES_GC_TIME,
  CALIBRACAO_EXECUCOES_QUERY_KEY,
  CALIBRACAO_EXECUCOES_STALE_TIME,
} from "@/hooks/useCalibracaoExecucoes";
import { calibracaoExecucoesService } from "@/services/calibracaoExecucoesService";

const AppLayout = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  useEffect(() => {
    if (!hasPermission("os.visualizar")) return;

    queryClient.prefetchQuery({
      queryKey: [
        ...ORDENS_SERVICO_QUERY_KEY,
        "paginado",
        ORDENS_SERVICO_DEFAULT_PAGINADO_FILTROS,
      ],
      queryFn: () =>
        ordensServicoService.listarPaginado(
          ORDENS_SERVICO_DEFAULT_PAGINADO_FILTROS
        ),
      staleTime: ORDENS_SERVICO_STALE_TIME,
      gcTime: ORDENS_SERVICO_GC_TIME,
    });
  }, [hasPermission, queryClient]);

  useEffect(() => {
    if (!hasPermission("equipamentos.visualizar")) return;

    queryClient.prefetchQuery({
      queryKey: [
        ...EQUIPAMENTOS_QUERY_KEY,
        "paginado",
        EQUIPAMENTOS_DEFAULT_PAGINADO_FILTROS,
      ],
      queryFn: () =>
        equipamentosService.listarPaginado(
          EQUIPAMENTOS_DEFAULT_PAGINADO_FILTROS
        ),
      staleTime: EQUIPAMENTOS_STALE_TIME,
      gcTime: EQUIPAMENTOS_GC_TIME,
    });
  }, [hasPermission, queryClient]);

  useEffect(() => {
    if (!hasPermission("utilitarios.visualizar")) return;

    const filtro = {
      ano: new Date().getFullYear(),
      incluirCalibracao: true,
      incluirPreventiva: true,
    };

    queryClient.prefetchQuery({
      queryKey: [...VENCIMENTOS_QUERY_KEY, filtro],
      queryFn: () => utilitariosService.gerarRelatorioVencimentos(filtro),
      staleTime: UTILITARIOS_STALE_TIME,
      gcTime: UTILITARIOS_GC_TIME,
    });
  }, [hasPermission, queryClient]);

  useEffect(() => {
    if (!hasPermission("calibracao.visualizar")) return;

    queryClient.prefetchQuery({
      queryKey: [
        ...CALIBRACAO_EXECUCOES_QUERY_KEY,
        "paginado",
        CALIBRACAO_EXECUCOES_DEFAULT_PAGINADO_FILTROS,
      ],
      queryFn: () =>
        calibracaoExecucoesService.listarExecucoesPaginadas(
          CALIBRACAO_EXECUCOES_DEFAULT_PAGINADO_FILTROS
        ),
      staleTime: CALIBRACAO_EXECUCOES_STALE_TIME,
      gcTime: CALIBRACAO_EXECUCOES_GC_TIME,
    });

    queryClient.prefetchQuery({
      queryKey: [...CALIBRACAO_EXECUCOES_QUERY_KEY, "filtros"],
      queryFn: () => calibracaoExecucoesService.listarExecucoesFiltros(),
      staleTime: CALIBRACAO_EXECUCOES_STALE_TIME,
      gcTime: CALIBRACAO_EXECUCOES_GC_TIME,
    });
  }, [hasPermission, queryClient]);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden">
      <AppSidebar />
      <main className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="min-h-full w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

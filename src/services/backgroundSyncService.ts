import type { QueryClient } from "@tanstack/react-query";
import { ordensServicoService } from "@/services/ordensServicoService";
import { equipamentosService } from "@/services/equipamentosService";
import { calibracaoExecucoesService } from "@/services/calibracaoExecucoesService";
import { empresasService } from "@/services/empresasService";
import { orcamentosService } from "@/services/orcamentosService";
import { contratosService } from "@/services/contratosService";
import { listarEstadosOS, listarTiposOS } from "@/hooks/useCamposOS";
import { listarTiposEquipamento } from "@/hooks/useTiposEquipamento";
import { listarPecas } from "@/hooks/usePecas";
import {
  CATALOG_CACHE_STALE_TIME,
  SESSION_CACHE_GC_TIME,
  SESSION_CACHE_STALE_TIME,
} from "@/lib/queryClient";

type BackgroundSyncOptions = {
  queryClient: QueryClient;
  hasPermission: (permission: string) => boolean;
  shouldContinue: () => boolean;
};

const waitForMainThread = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const ordensServicoDefaultFilters = {
  termo: "",
  ocultarFechadas: false,
  estadoNome: undefined,
  solicitanteNome: undefined,
  tipoServicoNome: undefined,
  responsavelTecnico: "",
  numero: "",
  page: 1,
  limit: 25,
  sortBy: "numero_ordem" as const,
  ascending: false,
};

const equipamentosDefaultFilters = {
  statusFiltro: "ativos" as const,
  termo: "",
  page: 1,
  limit: 25,
  sortBy: "numero_cadastro" as const,
  ascending: false,
};

const orcamentosDefaultFilters = {
  termo: undefined,
  status: "pendente" as const,
  tipo: undefined,
  clienteNome: undefined,
  formaPagamento: undefined,
  modoPagamento: undefined,
  frete: undefined,
  orcamentista: undefined,
  dataInicio: undefined,
  dataFim: undefined,
  valorMinimo: undefined,
  valorMaximo: undefined,
  origem: undefined,
  page: 1,
  limit: 25,
  sortBy: "data" as const,
  ascending: false,
};

const calibracoesDefaultFilters = {
  termo: "",
  empresaId: undefined,
  tipoEquipamentoId: undefined,
  resultado: undefined,
  dataDe: undefined,
  dataAte: undefined,
  validadeDe: undefined,
  validadeAte: undefined,
  page: 1,
  limit: 25,
  sortBy: "data_calibracao" as const,
  ascending: false,
};

export const sincronizarDadosSessao = async ({
  queryClient,
  hasPermission,
  shouldContinue,
}: BackgroundSyncOptions) => {
  const tasks: Array<() => Promise<unknown>> = [];

  if (hasPermission("os.visualizar")) {
    tasks.push(() =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["ordens-servico", "paginado", ordensServicoDefaultFilters],
          queryFn: () =>
            ordensServicoService.listarPaginado(ordensServicoDefaultFilters),
          staleTime: SESSION_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["ordens-servico", "opcoes-filtros"],
          queryFn: ordensServicoService.listarOpcoesFiltros,
          staleTime: CATALOG_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
      ])
    );
  }

  if (hasPermission("equipamentos.visualizar")) {
    tasks.push(() =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["equipamentos", "paginado", equipamentosDefaultFilters],
          queryFn: () =>
            equipamentosService.listarPaginado(equipamentosDefaultFilters),
          staleTime: SESSION_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["equipamentos", "opcoes-filtros", "ativos"],
          queryFn: () => equipamentosService.listarOpcoesFiltros("ativos"),
          staleTime: CATALOG_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
      ])
    );
  }

  if (hasPermission("orcamentos.visualizar")) {
    tasks.push(() =>
      queryClient.prefetchQuery({
        queryKey: ["orcamentos", "paginado", orcamentosDefaultFilters],
        queryFn: () =>
          orcamentosService.listarPaginado(orcamentosDefaultFilters),
        staleTime: SESSION_CACHE_STALE_TIME,
        gcTime: SESSION_CACHE_GC_TIME,
      })
    );
  }

  if (hasPermission("empresas.visualizar")) {
    tasks.push(() =>
      queryClient.prefetchQuery({
        queryKey: ["empresas", "lista", "ativas"],
        queryFn: () => empresasService.listar({ statusFiltro: "ativas" }),
        staleTime: SESSION_CACHE_STALE_TIME,
        gcTime: SESSION_CACHE_GC_TIME,
      })
    );
  }

  if (
    hasPermission("os.visualizar") ||
    hasPermission("equipamentos.visualizar") ||
    hasPermission("orcamentos.visualizar")
  ) {
    tasks.push(() =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["tipos-equipamento"],
          queryFn: listarTiposEquipamento,
          staleTime: CATALOG_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["tipos-os"],
          queryFn: listarTiposOS,
          staleTime: CATALOG_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["estados-os"],
          queryFn: listarEstadosOS,
          staleTime: CATALOG_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
      ])
    );
  }

  if (hasPermission("calibracao.visualizar")) {
    tasks.push(() =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: [
            "calibracao-execucoes",
            "paginado",
            calibracoesDefaultFilters,
          ],
          queryFn: () =>
            calibracaoExecucoesService.listarExecucoesPaginadas(
              calibracoesDefaultFilters
            ),
          staleTime: SESSION_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["calibracao-execucoes", "filtros"],
          queryFn: () => calibracaoExecucoesService.listarExecucoesFiltros(),
          staleTime: SESSION_CACHE_STALE_TIME,
          gcTime: SESSION_CACHE_GC_TIME,
        }),
      ])
    );
  }

  if (hasPermission("contratos.visualizar")) {
    tasks.push(() =>
      queryClient.prefetchQuery({
        queryKey: ["contratos", undefined],
        queryFn: () => contratosService.listar(),
        staleTime: SESSION_CACHE_STALE_TIME,
        gcTime: SESSION_CACHE_GC_TIME,
      })
    );
  }

  if (hasPermission("orcamentos.visualizar")) {
    tasks.push(() =>
      queryClient.prefetchQuery({
        queryKey: ["pecas"],
        queryFn: listarPecas,
        staleTime: CATALOG_CACHE_STALE_TIME,
        gcTime: SESSION_CACHE_GC_TIME,
      })
    );
  }

  for (const task of tasks) {
    if (!shouldContinue()) break;

    try {
      await task();
    } catch (error) {
      console.warn("Falha em sincronizacao de dados em segundo plano:", error);
    }

    await waitForMainThread();
  }
};

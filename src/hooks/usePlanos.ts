import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  planosService,
  type Plano,
  type PlanoAdicionarEquipamentosInput,
  type PlanoCicloInput,
  type PlanoEquipamentoInput,
  type PlanoInput,
  type PlanoRelatorioAnualInput,
  type PlanoRelatorioCicloOpcoes,
  type PlanoSetorInput,
} from "@/services/planosService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import {
  gerarPdfRelatorioCicloPlano,
  normalizeRelatorioPlanoFileName,
} from "@/utils/gerarPdfRelatorioCicloPlano";
import { baixarPdfMesclado, mesclarPdfsPlano, type PdfAnexoPlano } from "@/utils/mesclarPdfsPlano";
import { gerarPdfRelatorioAnualPlano, type GerarRelatorioAnualPlanoOptions } from "@/utils/gerarPdfRelatorioAnualPlano";
import { calcularValidadeFimDoMes, calcularValidadeRelatorioCiclo } from "@/utils/planoDatas";

export const PLANOS_QUERY_KEY = ["planos"];
export const PLANO_USUARIOS_QUERY_KEY = ["plano-usuarios"];
export const PLANO_CICLOS_QUERY_KEY = ["plano-ciclos"];
export const PLANO_CICLO_ATUAL_QUERY_KEY = ["plano-ciclo-atual"];
export const PLANO_CICLO_QUERY_KEY = ["plano-ciclo"];
export const PLANO_CICLO_ITENS_QUERY_KEY = ["plano-ciclo-itens"];
export const PLANO_HISTORICO_QUERY_KEY = ["plano-historico"];
export const PLANO_CICLO_DETALHES_QUERY_KEY = ["plano-ciclo-detalhes"];
export const PLANO_RELATORIOS_ANUAIS_QUERY_KEY = ["plano-relatorios-anuais"];
export const PLANOS_VALIDADES_RELATORIOS_QUERY_KEY = ["planos-validades-relatorios"];

const invalidatePlanos = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: PLANOS_QUERY_KEY });
};

export const usePlanoUsuarios = () => useQuery({
  queryKey: PLANO_USUARIOS_QUERY_KEY,
  queryFn: () => planosService.listarUsuarios(),
});

export const usePlanos = () => useQuery({
  queryKey: PLANOS_QUERY_KEY,
  queryFn: () => planosService.listarPlanos(),
});

export const usePlano = (id?: string) => useQuery({
  queryKey: [...PLANOS_QUERY_KEY, id],
  queryFn: () => planosService.buscarPlanoPorId(id as string),
  enabled: Boolean(id),
});

export const usePlanoCiclos = (planoId?: string) => useQuery({
  queryKey: [...PLANO_CICLOS_QUERY_KEY, planoId],
  queryFn: () => planosService.listarCiclosPlano(planoId as string),
  enabled: Boolean(planoId),
});

export const usePlanoHistorico = (planoId?: string) => useQuery({
  queryKey: [...PLANO_HISTORICO_QUERY_KEY, planoId],
  queryFn: () => planosService.listarCiclosPlano(planoId as string),
  enabled: Boolean(planoId),
});

export const usePlanoCicloAtual = (planoId?: string) => useQuery({
  queryKey: [...PLANO_CICLO_ATUAL_QUERY_KEY, planoId],
  queryFn: () => planosService.buscarCicloAtualPlano(planoId as string),
  enabled: Boolean(planoId),
});

export const usePlanoCiclo = (cicloId?: string) => useQuery({
  queryKey: [...PLANO_CICLO_QUERY_KEY, cicloId],
  queryFn: () => planosService.buscarCicloPlano(cicloId as string),
  enabled: Boolean(cicloId),
});

export const usePlanoCicloDetalhes = (cicloId?: string) => useQuery({
  queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, cicloId],
  queryFn: () => planosService.buscarDetalhesCicloPlano(cicloId as string),
  enabled: Boolean(cicloId),
});

export const usePlanoCicloItens = (cicloId?: string) => useQuery({
  queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, cicloId],
  queryFn: () => planosService.listarItensCiclo(cicloId as string),
  enabled: Boolean(cicloId),
});

export const useRelatoriosAnuaisPlano = (planoId?: string) => useQuery({
  queryKey: [...PLANO_RELATORIOS_ANUAIS_QUERY_KEY, planoId],
  queryFn: () => planosService.listarRelatoriosAnuaisPlano(planoId as string),
  enabled: Boolean(planoId),
});

export const useValidadesRelatoriosPlanos = () => useQuery({
  queryKey: PLANOS_VALIDADES_RELATORIOS_QUERY_KEY,
  queryFn: () => planosService.listarValidadesRelatoriosPlanos(),
});

export const useCriarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanoInput) => planosService.criarPlano(input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useAtualizarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlanoInput }) =>
      planosService.atualizarPlano(id, input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useDesativarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planosService.desativarPlano(id),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useCriarSetorPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planoId, input }: { planoId: string; input: PlanoSetorInput }) =>
      planosService.criarSetorPlano(planoId, input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useAtualizarSetorPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlanoSetorInput }) =>
      planosService.atualizarSetorPlano(id, input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useRemoverSetorPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planosService.removerSetorPlano(id),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useAdicionarEquipamentosPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planoId, input }: { planoId: string; input: PlanoAdicionarEquipamentosInput }) =>
      planosService.adicionarEquipamentosPlano(planoId, input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useAtualizarEquipamentoPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlanoEquipamentoInput }) =>
      planosService.atualizarEquipamentoPlano(id, input),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useRemoverEquipamentoPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planosService.removerEquipamentoPlano(id),
    onSuccess: () => invalidatePlanos(queryClient),
  });
};

export const useCriarCicloPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planoId, input }: { planoId: string; input: PlanoCicloInput }) =>
      planosService.criarCicloPlano(planoId, input),
    onSuccess: (ciclo) => {
      invalidatePlanos(queryClient);
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, ciclo.plano_id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ATUAL_QUERY_KEY, ciclo.plano_id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, ciclo.id] });
    },
  });
};

export const useAbrirPreventivaItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => planosService.abrirPreventivaItem(itemId),
    onSuccess: ({ item }) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
    },
  });
};

export const useCriarOuBuscarOsPreventivaParaItem = useAbrirPreventivaItem;

export const useCriarOuBuscarCalibracaoParaItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => planosService.criarOuBuscarCalibracaoParaItem(itemId),
    onSuccess: ({ item }) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: ["calibracao-execucoes"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
    },
  });
};

export const useConcluirItemCicloCalibracao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, execucaoId }: { itemId: string; execucaoId: string }) =>
      planosService.concluirItemCicloCalibracao(itemId, execucaoId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, item.ciclo_id] });
      queryClient.invalidateQueries({ queryKey: ["plano-ciclo-atual"] });
      queryClient.invalidateQueries({ queryKey: ["calibracao-execucoes"] });
      queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
    },
  });
};

const invalidateCicloOperacional = (
  queryClient: ReturnType<typeof useQueryClient>,
  cicloId?: string,
  planoId?: string
) => {
  invalidatePlanos(queryClient);
  if (planoId) {
    queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, planoId] });
    queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ATUAL_QUERY_KEY, planoId] });
    queryClient.invalidateQueries({ queryKey: [...PLANO_HISTORICO_QUERY_KEY, planoId] });
  } else {
    queryClient.invalidateQueries({ queryKey: PLANO_CICLOS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PLANO_CICLO_ATUAL_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PLANO_HISTORICO_QUERY_KEY });
  }
  if (cicloId) {
    queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, cicloId] });
    queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, cicloId] });
    queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, cicloId] });
  }
  queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
  queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
  queryClient.invalidateQueries({ queryKey: ["equipamento-historico"] });
};

export const useFinalizarPreventivasConformesEmLote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemIds,
      cicloId,
      planoId,
      dataFechamento,
      dataReferenciaValidade,
      onProgress,
    }: {
      itemIds: string[];
      cicloId?: string;
      planoId?: string;
      dataFechamento?: string | null;
      dataReferenciaValidade?: string | null;
      onProgress?: Parameters<
        typeof planosService.finalizarPreventivasConformesEmLote
      >[0]["onProgress"];
    }) =>
      planosService.finalizarPreventivasConformesEmLote({
        itemIds,
        dataFechamento,
        dataReferenciaValidade,
        onProgress,
      }),
    onSuccess: (_, variables) => invalidateCicloOperacional(queryClient, variables.cicloId, variables.planoId),
  });
};

export const useMarcarEquipamentosNaoLocalizados = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cicloId,
      planoId,
      equipamentoIds,
      observacao,
    }: {
      cicloId: string;
      planoId?: string;
      equipamentoIds: string[];
      observacao?: string | null;
    }) => planosService.marcarEquipamentosNaoLocalizados({ cicloId, equipamentoIds, observacao }),
    onSuccess: (_, variables) => invalidateCicloOperacional(queryClient, variables.cicloId, variables.planoId),
  });
};

export const useCancelarEquipamentosNoCiclo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cicloId,
      planoId,
      equipamentoIds,
    }: {
      cicloId: string;
      planoId?: string;
      equipamentoIds: string[];
    }) => planosService.cancelarEquipamentosNoCiclo({ cicloId, equipamentoIds }),
    onSuccess: (_, variables) => invalidateCicloOperacional(queryClient, variables.cicloId, variables.planoId),
  });
};

export const useConcluirCicloPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloId }: { cicloId: string; planoId?: string }) =>
      planosService.concluirCicloPlano(cicloId),
    onSuccess: (ciclo, variables) => invalidateCicloOperacional(queryClient, ciclo.id, variables.planoId || ciclo.plano_id),
  });
};

const ordenarAnexosPorEquipamento = <T,>(
  itens: T[],
  getCampos: (item: T) => Array<string | null | undefined>
) =>
  [...itens].sort((a, b) =>
    getCampos(a).join(" ").localeCompare(getCampos(b).join(" "), "pt-BR")
  );

const executarComConcorrencia = async <T, R>(
  itens: T[],
  executar: (item: T, index: number) => Promise<R>,
  limite = 2
) => {
  const resultados = new Array<R>(itens.length);
  let proximoIndice = 0;

  const worker = async () => {
    while (proximoIndice < itens.length) {
      const indice = proximoIndice;
      proximoIndice += 1;
      resultados[indice] = await executar(itens[indice], indice);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limite, itens.length) }, () => worker())
  );

  return resultados;
};

export const useAtualizarCicloPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cicloId,
      planoId,
      input,
    }: {
      cicloId: string;
      planoId: string;
      input: PlanoCicloInput;
    }) => planosService.atualizarCicloPlano(cicloId, input),
    onSuccess: (ciclo, variables) => {
      invalidatePlanos(queryClient);
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ATUAL_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
  });
};

export const useAtualizarTituloControleCicloPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cicloId,
      planoId,
      titulo,
    }: {
      cicloId: string;
      planoId: string;
      titulo: string;
    }) => planosService.atualizarTituloControleCicloPlano(cicloId, titulo),
    onSuccess: (ciclo, variables) => {
      invalidatePlanos(queryClient);
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_HISTORICO_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, ciclo.id] });
    },
  });
};

export const useAdicionarEquipamentosCicloPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cicloId,
      planoId,
      planoEquipamentoIds,
    }: {
      cicloId: string;
      planoId: string;
      planoEquipamentoIds: string[];
    }) => planosService.adicionarEquipamentosCicloPlano(cicloId, planoEquipamentoIds),
    onSuccess: (ciclo, variables) => {
      invalidatePlanos(queryClient);
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_HISTORICO_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ATUAL_QUERY_KEY, variables.planoId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_ITENS_QUERY_KEY, ciclo.id] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, ciclo.id] });
    },
  });
};

const normalizarOsParaRelatorioPlano = (
  os: OrdemServicoSupabase,
  plano: Pick<Plano, "titulo" | "responsavel_id" | "responsavel">
): OrdemServicoSupabase => ({
  ...os,
  tecnico_responsavel_id: os.tecnico_responsavel_id || plano.responsavel_id,
  responsavel_texto: os.responsavel_texto || plano.responsavel?.nome || null,
  observacoes: os.observacoes?.replace(
    /Plano:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    `Plano: ${plano.titulo}`
  ) || null,
});

export const useGerarRelatorioCompletoCiclo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cicloId,
      opcoes,
      completo,
    }: {
      cicloId: string;
      opcoes: PlanoRelatorioCicloOpcoes;
      completo: boolean;
    }) => {
      const detalhes = await planosService.buscarDadosRelatorioCiclo(cicloId);
      const validadeAte =
        opcoes.validadeAte ||
        (detalhes.ciclo.cronograma_mes_inicio
          ? calcularValidadeRelatorioCiclo(detalhes.ciclo, opcoes.validadeMeses)
          : detalhes.ciclo.relatorio_validade_ate ||
            calcularValidadeRelatorioCiclo(detalhes.ciclo, opcoes.validadeMeses));
      await planosService.salvarValidadeRelatorioCiclo({
        cicloId,
        meses: opcoes.validadeMeses,
        emitidoEm: opcoes.emitidoEm || new Date().toISOString().slice(0, 10),
        validadeAte,
      });

      const relatorioPrincipal = await gerarPdfRelatorioCicloPlano(detalhes, {
        ...opcoes,
        validadeAte,
        save: !completo,
      });

      if (!completo) {
        return { ressalvas: [] as string[] };
      }

      const ressalvas: string[] = [];
      const trabalhos: Array<{
        categoria: "preventiva" | "corretiva" | "calibracao";
        nome: string;
        gerar: () => Promise<Blob | ArrayBuffer | Uint8Array>;
      }> = [];
      const certificadosSegurancaEletrica: PdfAnexoPlano[] = [];

      if (opcoes.incluirOsPreventivas !== false) {
        ordenarAnexosPorEquipamento(detalhes.ordensPreventivas, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ]).forEach((os) => trabalhos.push({
          categoria: "preventiva",
          nome: `OS ${os.numero || os.id}`,
          gerar: () => gerarPdfOrdemServico(
            normalizarOsParaRelatorioPlano(os, detalhes.plano),
            false
          ),
        }));
      }

      if (opcoes.incluirOsCorretivas !== false) {
        ordenarAnexosPorEquipamento(detalhes.ordensCorretivas, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ]).forEach((os) => trabalhos.push({
          categoria: "corretiva",
          nome: `OS ${os.numero || os.id}`,
          gerar: () => gerarPdfOrdemServico(
            normalizarOsParaRelatorioPlano(os, detalhes.plano),
            false
          ),
        }));
      }

      if (opcoes.incluirCertificadosCalibracao !== false) {
        ordenarAnexosPorEquipamento(detalhes.calibracoes, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ]).forEach((execucao) => trabalhos.push({
          categoria: "calibracao",
          nome: `Certificado ${execucao.numero_certificado || execucao.id}`,
          gerar: () => gerarPdfCalibracaoCertificado(execucao, false),
        }));
      }

      const resultados = await executarComConcorrencia(trabalhos, async (trabalho) => {
        try {
          return {
            categoria: trabalho.categoria,
            anexo: { nome: trabalho.nome, bytes: await trabalho.gerar() } as PdfAnexoPlano,
          };
        } catch {
          ressalvas.push(trabalho.nome);
          return { categoria: trabalho.categoria, anexo: null };
        }
      });
      const anexos = (categoria: (typeof trabalhos)[number]["categoria"]) =>
        resultados
          .filter((resultado) => resultado.categoria === categoria && resultado.anexo)
          .map((resultado) => resultado.anexo as PdfAnexoPlano);

      const pdfFinal = await mesclarPdfsPlano({
        relatorioPrincipalBytes: relatorioPrincipal,
        osPreventivas: anexos("preventiva"),
        osCorretivas: anexos("corretiva"),
        certificadosCalibracao: anexos("calibracao"),
        certificadosSegurancaEletrica,
      });

      baixarPdfMesclado(
        pdfFinal,
        `relatorio_ciclo_completo_${normalizeRelatorioPlanoFileName(detalhes.plano.titulo)}_${normalizeRelatorioPlanoFileName(detalhes.ciclo.titulo)}.pdf`
      );

      return { ressalvas };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, variables.cicloId] });
      queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, variables.cicloId] });
      queryClient.invalidateQueries({ queryKey: PLANO_HISTORICO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANOS_VALIDADES_RELATORIOS_QUERY_KEY });
    },
  });
};

export const useGerarRelatorioAnualPlano = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      opcoesPdf,
    }: {
      input: PlanoRelatorioAnualInput;
      opcoesPdf: GerarRelatorioAnualPlanoOptions;
    }) => {
      if (input.cicloId && opcoesPdf.cronogramaMesInicio) {
        await planosService.atualizarCronogramaCicloPlano(input.cicloId, {
          mesInicio: opcoesPdf.cronogramaMesInicio,
          mesesRealizados: opcoesPdf.mesesVisitadosPreventiva || [],
          mesesPrevistos: opcoesPdf.mesesPrevistosCronograma || [],
        });
        await planosService.salvarValidadeRelatorioCiclo({
          cicloId: input.cicloId,
          meses: input.validadeMeses,
          emitidoEm: input.emitidoEm,
          validadeAte: input.validadeAte,
        });
      }

      const registro = await planosService.salvarRegistroRelatorioAnual(input);
      const dados = await planosService.buscarDadosRelatorioAnualPlano({
        planoId: input.planoId,
        cicloId: input.cicloId,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        incluirPreventiva: input.incluirPreventiva,
        incluirCalibracao: input.incluirCalibracao,
        incluirSegurancaEletrica: input.incluirSegurancaEletrica,
        incluirInativos: input.incluirInativos,
      });
      dados.revisao = registro.revisao;

      queryClient.invalidateQueries({ queryKey: PLANOS_VALIDADES_RELATORIOS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...PLANO_RELATORIOS_ANUAIS_QUERY_KEY, input.planoId],
      });

      const cronograma = await gerarPdfRelatorioAnualPlano(dados, {
        ...opcoesPdf,
        save: input.tipoSaida === "cronograma",
      });

      const ressalvas: string[] = [];
      if (input.tipoSaida === "cronograma") return { registro, ressalvas };

      const detalhesCiclos = await planosService.listarDocumentosDosCiclosNoPeriodo({
        planoId: input.planoId,
        cicloId: input.cicloId,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
      });
      const trabalhos: Array<{
        categoria: "relatorio" | "preventiva" | "corretiva" | "calibracao";
        nome: string;
        gerar: () => Promise<Blob | ArrayBuffer | Uint8Array>;
      }> = [];

      detalhesCiclos.forEach((detalhes) => {
        trabalhos.push({
          categoria: "relatorio",
          nome: `Relatorio do ciclo ${detalhes.ciclo.titulo}`,
          gerar: () => gerarPdfRelatorioCicloPlano(detalhes, { save: false }),
        });
        detalhes.ordensPreventivas.forEach((os) => trabalhos.push({
          categoria: "preventiva",
          nome: `OS ${os.numero || os.id}`,
          gerar: () => gerarPdfOrdemServico(
            normalizarOsParaRelatorioPlano(os, dados.plano),
            false
          ),
        }));
        detalhes.ordensCorretivas.forEach((os) => trabalhos.push({
          categoria: "corretiva",
          nome: `OS ${os.numero || os.id}`,
          gerar: () => gerarPdfOrdemServico(
            normalizarOsParaRelatorioPlano(os, dados.plano),
            false
          ),
        }));
        detalhes.calibracoes.forEach((execucao) => trabalhos.push({
          categoria: "calibracao",
          nome: `Certificado ${execucao.numero_certificado || execucao.id}`,
          gerar: () => gerarPdfCalibracaoCertificado(execucao, false),
        }));
      });

      const resultados = await executarComConcorrencia(trabalhos, async (trabalho) => {
        try {
          return {
            categoria: trabalho.categoria,
            anexo: { nome: trabalho.nome, bytes: await trabalho.gerar() } as PdfAnexoPlano,
          };
        } catch {
          ressalvas.push(trabalho.nome);
          return { categoria: trabalho.categoria, anexo: null };
        }
      });
      const anexos = (categoria: (typeof trabalhos)[number]["categoria"]) =>
        resultados
          .filter((resultado) => resultado.categoria === categoria && resultado.anexo)
          .map((resultado) => resultado.anexo as PdfAnexoPlano);

      const pdfFinal = await mesclarPdfsPlano({
        relatorioPrincipalBytes: cronograma,
        osPreventivas: [...anexos("relatorio"), ...anexos("preventiva")],
        osCorretivas: anexos("corretiva"),
        certificadosCalibracao: anexos("calibracao"),
      });
      const cicloFileSuffix = input.cicloId && detalhesCiclos[0]?.ciclo?.titulo
        ? `_${normalizeRelatorioPlanoFileName(detalhesCiclos[0].ciclo.titulo)}`
        : "";

      baixarPdfMesclado(
        pdfFinal,
        `cronograma_anual_completo_${normalizeRelatorioPlanoFileName(dados.plano.titulo)}_${input.dataInicio}_${input.dataFim}${cicloFileSuffix}.pdf`
      );

      return { registro, ressalvas };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_RELATORIOS_ANUAIS_QUERY_KEY, variables.input.planoId] });
      if (variables.input.cicloId) {
        queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_QUERY_KEY, variables.input.cicloId] });
        queryClient.invalidateQueries({ queryKey: [...PLANO_CICLO_DETALHES_QUERY_KEY, variables.input.cicloId] });
        queryClient.invalidateQueries({ queryKey: [...PLANO_CICLOS_QUERY_KEY, variables.input.planoId] });
        queryClient.invalidateQueries({ queryKey: [...PLANO_HISTORICO_QUERY_KEY, variables.input.planoId] });
      }
    },
  });
};

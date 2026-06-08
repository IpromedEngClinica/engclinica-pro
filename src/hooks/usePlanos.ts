import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  planosService,
  type PlanoAdicionarEquipamentosInput,
  type PlanoCicloInput,
  type PlanoEquipamentoInput,
  type PlanoInput,
  type PlanoRelatorioAnualInput,
  type PlanoRelatorioCicloOpcoes,
  type PlanoSetorInput,
} from "@/services/planosService";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import {
  gerarPdfRelatorioCicloPlano,
  normalizeRelatorioPlanoFileName,
} from "@/utils/gerarPdfRelatorioCicloPlano";
import { baixarPdfMesclado, mesclarPdfsPlano, type PdfAnexoPlano } from "@/utils/mesclarPdfsPlano";
import { gerarPdfRelatorioAnualPlano, type GerarRelatorioAnualPlanoOptions } from "@/utils/gerarPdfRelatorioAnualPlano";

export const PLANOS_QUERY_KEY = ["planos"];
export const PLANO_USUARIOS_QUERY_KEY = ["plano-usuarios"];
export const PLANO_CICLOS_QUERY_KEY = ["plano-ciclos"];
export const PLANO_CICLO_ATUAL_QUERY_KEY = ["plano-ciclo-atual"];
export const PLANO_CICLO_QUERY_KEY = ["plano-ciclo"];
export const PLANO_CICLO_ITENS_QUERY_KEY = ["plano-ciclo-itens"];
export const PLANO_HISTORICO_QUERY_KEY = ["plano-historico"];
export const PLANO_CICLO_DETALHES_QUERY_KEY = ["plano-ciclo-detalhes"];
export const PLANO_RELATORIOS_ANUAIS_QUERY_KEY = ["plano-relatorios-anuais"];

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
    }: {
      itemIds: string[];
      cicloId?: string;
      planoId?: string;
      dataFechamento?: string | null;
    }) => planosService.finalizarPreventivasConformesEmLote({ itemIds, dataFechamento }),
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
      await planosService.salvarValidadeRelatorioCiclo({
        cicloId,
        meses: opcoes.validadeMeses,
        emitidoEm: opcoes.emitidoEm || new Date().toISOString().slice(0, 10),
        validadeAte: opcoes.validadeAte || new Date().toISOString().slice(0, 10),
      });

      const detalhes = await planosService.buscarDadosRelatorioCiclo(cicloId);
      const relatorioPrincipal = await gerarPdfRelatorioCicloPlano(detalhes, {
        ...opcoes,
        save: !completo,
      });

      if (!completo) {
        return { ressalvas: [] as string[] };
      }

      const ressalvas: string[] = [];
      const osPreventivas: PdfAnexoPlano[] = [];
      const osCorretivas: PdfAnexoPlano[] = [];
      const certificadosCalibracao: PdfAnexoPlano[] = [];
      const certificadosSegurancaEletrica: PdfAnexoPlano[] = [];

      if (opcoes.incluirOsPreventivas !== false) {
        for (const os of ordenarAnexosPorEquipamento(detalhes.ordensPreventivas, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ])) {
          try {
            osPreventivas.push({
              nome: `OS ${os.numero}`,
              bytes: await gerarPdfOrdemServico(os, false),
            });
          } catch {
            ressalvas.push(`OS ${os.numero || os.id}`);
          }
        }
      }

      if (opcoes.incluirOsCorretivas !== false) {
        for (const os of ordenarAnexosPorEquipamento(detalhes.ordensCorretivas, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ])) {
          try {
            osCorretivas.push({
              nome: `OS ${os.numero}`,
              bytes: await gerarPdfOrdemServico(os, false),
            });
          } catch {
            ressalvas.push(`OS ${os.numero || os.id}`);
          }
        }
      }

      if (opcoes.incluirCertificadosCalibracao !== false) {
        for (const execucao of ordenarAnexosPorEquipamento(detalhes.calibracoes, (item) => [
          item.equipamento?.setor,
          item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto,
          item.equipamento?.fabricante,
          item.equipamento?.modelo,
          item.equipamento?.numero_serie,
        ])) {
          try {
            certificadosCalibracao.push({
              nome: `Certificado ${execucao.numero_certificado}`,
              bytes: await gerarPdfCalibracaoCertificado(execucao, false),
            });
          } catch {
            ressalvas.push(`Certificado ${execucao.numero_certificado || execucao.id}`);
          }
        }
      }

      const pdfFinal = await mesclarPdfsPlano({
        relatorioPrincipalBytes: relatorioPrincipal,
        osPreventivas,
        osCorretivas,
        certificadosCalibracao,
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
      const registro = await planosService.salvarRegistroRelatorioAnual(input);
      const dados = await planosService.buscarDadosRelatorioAnualPlano({
        planoId: input.planoId,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        incluirPreventiva: input.incluirPreventiva,
        incluirCalibracao: input.incluirCalibracao,
        incluirSegurancaEletrica: input.incluirSegurancaEletrica,
        incluirInativos: input.incluirInativos,
      });
      dados.revisao = registro.revisao;

      const cronograma = await gerarPdfRelatorioAnualPlano(dados, {
        ...opcoesPdf,
        save: input.tipoSaida === "cronograma",
      });

      const ressalvas: string[] = [];
      if (input.tipoSaida === "cronograma") return { registro, ressalvas };

      const detalhesCiclos = await planosService.listarDocumentosDosCiclosNoPeriodo({
        planoId: input.planoId,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
      });
      const relatoriosCiclos: PdfAnexoPlano[] = [];
      const osPreventivas: PdfAnexoPlano[] = [];
      const osCorretivas: PdfAnexoPlano[] = [];
      const certificadosCalibracao: PdfAnexoPlano[] = [];

      for (const detalhes of detalhesCiclos) {
        try {
          relatoriosCiclos.push({
            nome: `Relatorio ${detalhes.ciclo.titulo}`,
            bytes: await gerarPdfRelatorioCicloPlano(detalhes, { save: false }),
          });
        } catch {
          ressalvas.push(`Relatorio do ciclo ${detalhes.ciclo.titulo}`);
        }

        for (const os of detalhes.ordensPreventivas) {
          try {
            osPreventivas.push({ nome: `OS ${os.numero}`, bytes: await gerarPdfOrdemServico(os, false) });
          } catch {
            ressalvas.push(`OS ${os.numero || os.id}`);
          }
        }
        for (const os of detalhes.ordensCorretivas) {
          try {
            osCorretivas.push({ nome: `OS ${os.numero}`, bytes: await gerarPdfOrdemServico(os, false) });
          } catch {
            ressalvas.push(`OS ${os.numero || os.id}`);
          }
        }
        for (const execucao of detalhes.calibracoes) {
          try {
            certificadosCalibracao.push({
              nome: `Certificado ${execucao.numero_certificado}`,
              bytes: await gerarPdfCalibracaoCertificado(execucao, false),
            });
          } catch {
            ressalvas.push(`Certificado ${execucao.numero_certificado || execucao.id}`);
          }
        }
      }

      const pdfFinal = await mesclarPdfsPlano({
        relatorioPrincipalBytes: cronograma,
        osPreventivas: [...relatoriosCiclos, ...osPreventivas],
        osCorretivas,
        certificadosCalibracao,
      });

      baixarPdfMesclado(
        pdfFinal,
        `cronograma_anual_completo_${normalizeRelatorioPlanoFileName(dados.plano.titulo)}_${input.dataInicio}_${input.dataFim}.pdf`
      );

      return { registro, ressalvas };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PLANO_RELATORIOS_ANUAIS_QUERY_KEY, variables.input.planoId] });
    },
  });
};

import { supabase } from "@/lib/supabaseClient";
import { LaudoObsolescenciaSupabase } from "@/services/laudosObsolescenciaService";
import { OrcamentoSupabase } from "@/services/orcamentosService";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { ProtocoloOSSupabase } from "@/services/protocolosService";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import type { SegurancaEletricaExecucao } from "@/services/segurancaEletricaService";

export type EquipamentoHistorico = {
  ordensServico: OrdemServicoSupabase[];
  protocolos: ProtocoloOSSupabase[];
  orcamentos: OrcamentoSupabase[];
  laudosObsolescencia: LaudoObsolescenciaSupabase[];
  calibracoes: CalibracaoExecucao[];
  segurancaEletrica: SegurancaEletricaExecucao[];
};

const selectOSHistorico = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  tipo_os_id,
  estado_os_id,
  tecnico_responsavel_id,
  solicitante_texto,
  responsavel_texto,
  problema_relatado,
  origem_problema,
  descricao_servico,
  observacoes,
  prioridade,
  status_sistema,
  ativo,
  data_abertura,
  data_fechamento,
  created_at,
  updated_at,
  tipo_os:tipos_os (
    id,
    nome
  ),
  estado_os:estados_os (
    id,
    nome,
    finaliza_os,
    cancela_os
  ),
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    ativo
  )
`;

const selectProtocolosHistorico = `
  id,
  organizacao_id,
  numero,
  tipo,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  data_protocolo,
  data_recolhimento,
  data_entrega,
  responsavel_nome,
  responsavel_documento,
  responsavel_contato,
  problema_relatado,
  observacoes,
  status,
  ativo,
  created_at,
  updated_at,
  ordem_servico:ordens_servico (
    id,
    numero,
    status_sistema,
    ativo
  )
`;

const selectOrcamentosHistorico = `
  id,
  organizacao_id,
  numero,
  identificador,
  tipo_orcamento,
  origem,
  empresa_id,
  equipamento_id,
  ordem_servico_id,
  data_orcamento,
  data_validade,
  status,
  observacoes,
  condicoes_pagamento,
  prazo_execucao,
  garantia,
  forma_pagamento,
  modo_pagamento,
  numero_parcelas,
  valor_entrada,
  valor_parcela,
  valor_pecas,
  valor_servicos,
  desconto_tipo,
  desconto_valor,
  desconto_aplicado,
  valor_total,
  prazo_entrega,
  frete,
  detalhes_orcamento,
  responsavel_orcamentista,
  aprovado_por,
  data_aprovacao,
  data_reprovacao,
  data_faturamento,
  data_cancelamento,
  motivo_reprovacao,
  ativo,
  created_at,
  updated_at,
  ordem_servico:ordens_servico (
    id,
    numero,
    status_sistema,
    ativo
  )
`;

const selectLaudosObsolescenciaHistorico = `
  id,
  organizacao_id,
  numero,
  empresa_id,
  equipamento_id,
  motivo_id,
  motivo_texto,
  data_criacao,
  observacoes,
  responsavel_nome,
  responsavel_registro,
  ativo,
  created_at,
  updated_at
`;

const selectCalibracoesHistorico = `
  id,
  organizacao_id,
  numero_certificado,
  empresa_id,
  equipamento_id,
  procedimento_id,
  procedimento_nome_snapshot,
  procedimento_versao_snapshot,
  data_calibracao,
  data_emissao,
  data_validade,
  validade_mes,
  validade_meses,
  status,
  resultado_geral,
  pdf_storage_path,
  pdf_hash,
  ativo,
  created_at,
  updated_at
`;

const selectSegurancaEletricaHistorico = `
  id,
  organizacao_id,
  numero_certificado,
  empresa_id,
  equipamento_id,
  padrao_id,
  classe_equipamento,
  tipo_parte_aplicada,
  temperatura_ambiente_texto,
  umidade_relativa_texto,
  local_ensaio,
  data_teste,
  data_emissao,
  data_validade,
  tecnico_executor_nome,
  responsavel_tecnico_nome,
  responsavel_solicitante,
  resultado_geral,
  observacoes,
  status,
  ativo,
  created_at,
  updated_at
`;

export const equipamentoHistoricoService = {
  async buscarPorEquipamento(
    equipamentoId: string
  ): Promise<EquipamentoHistorico> {
    const { data: perfil, error: perfilError } = await supabase.rpc("current_user_perfil");
    if (perfilError) throw new Error(perfilError.message);
    const selectOsPermitido = perfil === "solicitante"
      ? selectOSHistorico.replace("  descricao_servico,\n", "")
      : selectOSHistorico;

    const [
      ordensResult,
      protocolosResult,
      orcamentosResult,
      laudosResult,
      calibracoesResult,
      segurancaEletricaResult,
    ] =
      await Promise.all([
        supabase
          .from("ordens_servico")
          .select(selectOsPermitido)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .eq("oculta_operacao", false)
          .order("created_at", { ascending: false }),

        supabase
          .from("protocolos_os")
          .select(selectProtocolosHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .order("data_protocolo", { ascending: false }),

        supabase
          .from("orcamentos")
          .select(selectOrcamentosHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .order("data_orcamento", { ascending: false }),

        supabase
          .from("laudos_obsolescencia")
          .select(selectLaudosObsolescenciaHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .order("data_criacao", { ascending: false }),

        supabase
          .from("calibracao_execucoes")
          .select(selectCalibracoesHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .eq("status", "fechada")
          .order("data_calibracao", { ascending: false }),

        supabase
          .from("seguranca_eletrica_execucoes")
          .select(selectSegurancaEletricaHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
          .eq("status", "fechada")
          .order("data_teste", { ascending: false }),
      ]);

    if (ordensResult.error) {
      throw new Error(ordensResult.error.message);
    }

    if (protocolosResult.error) {
      throw new Error(protocolosResult.error.message);
    }

    if (orcamentosResult.error) {
      throw new Error(orcamentosResult.error.message);
    }

    if (laudosResult.error) {
      throw new Error(laudosResult.error.message);
    }

    if (calibracoesResult.error) {
      throw new Error(calibracoesResult.error.message);
    }

    if (segurancaEletricaResult.error) {
      throw new Error(segurancaEletricaResult.error.message);
    }

    return {
      ordensServico:
        (ordensResult.data as unknown as OrdemServicoSupabase[]) || [],
      protocolos:
        (protocolosResult.data as unknown as ProtocoloOSSupabase[]) || [],
      orcamentos:
        (orcamentosResult.data as unknown as OrcamentoSupabase[]) || [],
      laudosObsolescencia:
        (laudosResult.data as unknown as LaudoObsolescenciaSupabase[]) || [],
      calibracoes:
        (calibracoesResult.data as unknown as CalibracaoExecucao[]) || [],
      segurancaEletrica:
        (segurancaEletricaResult.data as unknown as SegurancaEletricaExecucao[]) ||
        [],
    };
  },
};

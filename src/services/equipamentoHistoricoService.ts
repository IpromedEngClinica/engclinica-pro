import { supabase } from "@/lib/supabaseClient";
import { OrcamentoSupabase } from "@/services/orcamentosService";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { ProtocoloOSSupabase } from "@/services/protocolosService";

export type EquipamentoHistorico = {
  ordensServico: OrdemServicoSupabase[];
  protocolos: ProtocoloOSSupabase[];
  orcamentos: OrcamentoSupabase[];
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
  valor_total,
  prazo_entrega,
  frete,
  detalhes_orcamento,
  responsavel_orcamentista,
  aprovado_por,
  data_aprovacao,
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

export const equipamentoHistoricoService = {
  async buscarPorEquipamento(
    equipamentoId: string
  ): Promise<EquipamentoHistorico> {
    const [ordensResult, protocolosResult, orcamentosResult] =
      await Promise.all([
        supabase
          .from("ordens_servico")
          .select(selectOSHistorico)
          .eq("equipamento_id", equipamentoId)
          .eq("ativo", true)
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

    return {
      ordensServico:
        (ordensResult.data as unknown as OrdemServicoSupabase[]) || [],
      protocolos:
        (protocolosResult.data as unknown as ProtocoloOSSupabase[]) || [],
      orcamentos:
        (orcamentosResult.data as unknown as OrcamentoSupabase[]) || [],
    };
  },
};

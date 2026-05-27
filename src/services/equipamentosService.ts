import { supabase } from "@/lib/supabaseClient";
import type { EmpresaSupabase } from "@/services/empresasService";

export type EquipamentoSupabase = {
  id: string;
  organizacao_id: string;
  empresa_id: string;
  tipo_equipamento_id: string | null;
  tipo_texto: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
  setor: string | null;
  status: string;
  data_aquisicao: string | null;
  data_instalacao: string | null;
  data_ultima_preventiva: string | null;
  data_proxima_preventiva: string | null;
  data_ultima_calibracao: string | null;
  data_proxima_calibracao: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaSupabase | null;
  tipo_equipamento?: {
    id: string;
    nome: string;
  } | null;
};

export type EquipamentoFormInput = {
  empresaId: string;
  tipoEquipamentoId?: string;
  tipoTexto?: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  patrimonio?: string;
  tag?: string;
  setor?: string;
  status?: string;
  dataAquisicao?: string;
  dataInstalacao?: string;
  dataUltimaPreventiva?: string;
  dataProximaPreventiva?: string;
  dataUltimaCalibracao?: string;
  dataProximaCalibracao?: string;
  observacoes?: string;
};

const selectEquipamentos = `
  id,
  organizacao_id,
  empresa_id,
  tipo_equipamento_id,
  tipo_texto,
  fabricante,
  modelo,
  numero_serie,
  patrimonio,
  tag,
  setor,
  status,
  data_aquisicao,
  data_instalacao,
  data_ultima_preventiva,
  data_proxima_preventiva,
  data_ultima_calibracao,
  data_proxima_calibracao,
  observacoes,
  ativo,
  created_at,
  updated_at,
  empresa:empresas (
    id,
    organizacao_id,
    nome,
    nome_fantasia,
    tipo_cliente,
    tipo_relacao,
    cpf_cnpj,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    contato,
    email,
    celular,
    telefone,
    observacoes,
    ativo,
    created_at,
    updated_at
  ),
  tipo_equipamento:tipos_equipamento (
    id,
    nome
  )
`;

const toDatabasePayload = (input: EquipamentoFormInput) => ({
  empresa_id: input.empresaId,
  tipo_equipamento_id: input.tipoEquipamentoId || null,
  tipo_texto: input.tipoTexto || null,
  fabricante: input.fabricante || null,
  modelo: input.modelo || null,
  numero_serie: input.numeroSerie || null,
  patrimonio: input.patrimonio || null,
  tag: input.tag || null,
  setor: input.setor || null,
  status: input.status || "Ativo",
  data_aquisicao: input.dataAquisicao || null,
  data_instalacao: input.dataInstalacao || null,
  data_ultima_preventiva: input.dataUltimaPreventiva || null,
  data_proxima_preventiva: input.dataProximaPreventiva || null,
  data_ultima_calibracao: input.dataUltimaCalibracao || null,
  data_proxima_calibracao: input.dataProximaCalibracao || null,
  observacoes: input.observacoes || null,
});

export const equipamentosService = {
  async listar() {
    const { data, error } = await supabase
      .from("equipamentos")
      .select(selectEquipamentos)
      .eq("ativo", true)
      .eq("empresa.ativo", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase[];
  },

  async criar(input: EquipamentoFormInput) {
    const { data: organizacaoId, error: orgError } = await supabase.rpc(
      "current_organizacao_id"
    );

    if (orgError) {
      throw new Error(orgError.message);
    }

    if (!organizacaoId) {
      throw new Error("Não foi possível identificar a organização do usuário.");
    }

    const { data, error } = await supabase
      .from("equipamentos")
      .insert({
        organizacao_id: organizacaoId,
        ...toDatabasePayload(input),
        ativo: true,
      })
      .select(selectEquipamentos)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase;
  },

  async atualizar(id: string, input: EquipamentoFormInput) {
    const { data, error } = await supabase
      .from("equipamentos")
      .update(toDatabasePayload(input))
      .eq("id", id)
      .select(selectEquipamentos)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as EquipamentoSupabase;
  },
};

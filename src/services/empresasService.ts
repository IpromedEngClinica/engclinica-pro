import { supabase } from "@/lib/supabaseClient";

export type EmpresaSupabase = {
  id: string;
  organizacao_id: string;
  nome: string;
  nome_fantasia: string | null;
  tipo_cliente: string | null;
  tipo_relacao: string;
  cpf_cnpj: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  contato: string | null;
  email: string | null;
  celular: string | null;
  telefone: string | null;
  observacoes: string | null;
  incluir_criterio_aceitacao_calibracao: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EmpresaFormInput = {
  nome: string;
  nomeFantasia?: string;
  tipoCliente?: string;
  tipoRelacao?: string;
  cpfCnpj?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  contato?: string;
  email?: string;
  celular?: string;
  telefone?: string;
  observacoes?: string;
  incluirCriterioAceitacaoCalibracao?: boolean;
};

export type StatusEmpresaFiltro = "ativas" | "todas" | "inativas";

export type ListarEmpresasFiltros = {
  statusFiltro?: StatusEmpresaFiltro;
};

export const empresasService = {
  async listar(filtros?: ListarEmpresasFiltros) {
    const statusFiltro = filtros?.statusFiltro || "ativas";
    let query = supabase
      .from("empresas")
      .select(
        `
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
        incluir_criterio_aceitacao_calibracao,
        ativo,
        created_at,
        updated_at
      `
      )
      .order("nome", { ascending: true });

    if (statusFiltro === "ativas") {
      query = query.eq("ativo", true);
    }

    if (statusFiltro === "inativas") {
      query = query.eq("ativo", false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data as EmpresaSupabase[];
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("empresas")
      .select(
        `
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
        incluir_criterio_aceitacao_calibracao,
        ativo,
        created_at,
        updated_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as EmpresaSupabase;
  },

  async criar(input: EmpresaFormInput) {
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
      .from("empresas")
      .insert({
        organizacao_id: organizacaoId,
        nome: input.nome,
        nome_fantasia: input.nomeFantasia || null,
        tipo_cliente: input.tipoCliente || null,
        tipo_relacao: input.tipoRelacao || "cliente",
        cpf_cnpj: input.cpfCnpj || null,
        cep: input.cep || null,
        rua: input.rua || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        contato: input.contato || null,
        email: input.email || null,
        celular: input.celular || null,
        telefone: input.telefone || null,
        observacoes: input.observacoes || null,
        incluir_criterio_aceitacao_calibracao:
          input.incluirCriterioAceitacaoCalibracao ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as EmpresaSupabase;
  },

  async atualizar(id: string, input: EmpresaFormInput) {
    const { data, error } = await supabase
      .from("empresas")
      .update({
        nome: input.nome,
        nome_fantasia: input.nomeFantasia || null,
        tipo_cliente: input.tipoCliente || null,
        tipo_relacao: input.tipoRelacao || "cliente",
        cpf_cnpj: input.cpfCnpj || null,
        cep: input.cep || null,
        rua: input.rua || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        contato: input.contato || null,
        email: input.email || null,
        celular: input.celular || null,
        telefone: input.telefone || null,
        observacoes: input.observacoes || null,
        incluir_criterio_aceitacao_calibracao:
          input.incluirCriterioAceitacaoCalibracao ?? false,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as EmpresaSupabase;
  },
};

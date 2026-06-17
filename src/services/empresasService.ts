import { supabase } from "@/lib/supabaseClient";

export type EmpresaSetorSupabase = {
  id: string;
  organizacao_id: string;
  empresa_id: string;
  nome: string;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  mesmo_endereco_cliente: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EmpresaSupabase = {
  id: string;
  organizacao_id: string;
  nome: string;
  nome_fantasia: string | null;
  tipo_cliente: string | null;
  tipo_relacao: string;
  representante_comercial_setor: string | null;
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
  setores?: EmpresaSetorSupabase[];
};

export type EmpresaSetorFormInput = {
  id?: string;
  nome: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  mesmoEnderecoCliente?: boolean;
};

export type EmpresaFormInput = {
  nome: string;
  nomeFantasia?: string;
  tipoCliente?: string;
  tipoRelacao?: string;
  representanteComercialSetor?: string;
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
  setores?: EmpresaSetorFormInput[];
};

export type StatusEmpresaFiltro = "ativas" | "todas" | "inativas";

export type ListarEmpresasFiltros = {
  statusFiltro?: StatusEmpresaFiltro;
};

const selectEmpresas = `
  id,
  organizacao_id,
  nome,
  nome_fantasia,
  tipo_cliente,
  tipo_relacao,
  representante_comercial_setor,
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
  updated_at,
  setores:empresa_setores (
    id,
    organizacao_id,
    empresa_id,
    nome,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    observacoes,
    mesmo_endereco_cliente,
    ativo,
    created_at,
    updated_at
  )
`;

const normalizarEmpresa = (empresa: EmpresaSupabase): EmpresaSupabase => ({
  ...empresa,
  setores: [...(empresa.setores || [])]
    .filter((setor) => setor.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
});

const normalizarSetoresInput = (setores?: EmpresaSetorFormInput[]) => {
  const vistos = new Set<string>();

  return (setores || [])
    .map((setor) => ({
      ...setor,
      nome: setor.nome.trim(),
      estado: setor.estado?.trim().toUpperCase().slice(0, 2) || "",
    }))
    .filter((setor) => setor.nome)
    .filter((setor) => {
      const key = setor.nome.toLocaleLowerCase("pt-BR");
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });
};

const toSetorPayload = (
  empresaId: string,
  organizacaoId: string,
  setor: EmpresaSetorFormInput
) => ({
  organizacao_id: organizacaoId,
  empresa_id: empresaId,
  nome: setor.nome.trim(),
  cep: setor.cep || null,
  rua: setor.rua || null,
  numero: setor.numero || null,
  complemento: setor.complemento || null,
  bairro: setor.bairro || null,
  cidade: setor.cidade || null,
  estado: setor.estado?.toUpperCase() || null,
  observacoes: setor.observacoes || null,
  mesmo_endereco_cliente: setor.mesmoEnderecoCliente ?? false,
  ativo: true,
});

const salvarSetoresEmpresa = async (
  empresaId: string,
  organizacaoId: string,
  setores?: EmpresaSetorFormInput[]
) => {
  const setoresNormalizados = normalizarSetoresInput(setores);
  const idsMantidos = new Set(
    setoresNormalizados
      .map((setor) => setor.id)
      .filter((id): id is string => Boolean(id))
  );

  const { data: setoresAtuais, error: setoresAtuaisError } = await supabase
    .from("empresa_setores")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("ativo", true);

  if (setoresAtuaisError) {
    throw new Error(setoresAtuaisError.message);
  }

  const idsParaInativar = (setoresAtuais || [])
    .map((setor) => setor.id as string)
    .filter((id) => !idsMantidos.has(id));

  if (idsParaInativar.length) {
    const { error } = await supabase
      .from("empresa_setores")
      .update({ ativo: false })
      .in("id", idsParaInativar);

    if (error) throw new Error(error.message);
  }

  for (const setor of setoresNormalizados) {
    if (setor.id) {
      const { error } = await supabase
        .from("empresa_setores")
        .update(toSetorPayload(empresaId, organizacaoId, setor))
        .eq("id", setor.id)
        .eq("empresa_id", empresaId);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("empresa_setores")
        .insert(toSetorPayload(empresaId, organizacaoId, setor));

      if (error) throw new Error(error.message);
    }
  }
};

export const empresasService = {
  async listar(filtros?: ListarEmpresasFiltros) {
    const statusFiltro = filtros?.statusFiltro || "ativas";
    let query = supabase
      .from("empresas")
      .select(selectEmpresas)
      .order("created_at", { ascending: false });

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

    return ((data || []) as unknown as EmpresaSupabase[]).map(normalizarEmpresa);
  },

  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from("empresas")
      .select(selectEmpresas)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalizarEmpresa(data as unknown as EmpresaSupabase);
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
        representante_comercial_setor:
          input.representanteComercialSetor || null,
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
      .select(selectEmpresas)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const empresaCriada = data as unknown as EmpresaSupabase;
    if (input.setores !== undefined) {
      await salvarSetoresEmpresa(empresaCriada.id, organizacaoId, input.setores);
    }

    return this.buscarPorId(empresaCriada.id);
  },

  async atualizar(id: string, input: EmpresaFormInput) {
    const { data, error } = await supabase
      .from("empresas")
      .update({
        nome: input.nome,
        nome_fantasia: input.nomeFantasia || null,
        tipo_cliente: input.tipoCliente || null,
        tipo_relacao: input.tipoRelacao || "cliente",
        representante_comercial_setor:
          input.representanteComercialSetor || null,
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
      .select(selectEmpresas)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const empresaAtualizada = data as unknown as EmpresaSupabase;
    if (input.setores !== undefined) {
      await salvarSetoresEmpresa(
        id,
        empresaAtualizada.organizacao_id,
        input.setores
      );
    }

    return this.buscarPorId(id);
  },
};

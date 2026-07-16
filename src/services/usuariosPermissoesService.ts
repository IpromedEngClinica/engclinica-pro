import { supabase } from "@/lib/supabaseClient";
import { getAppUrl } from "@/utils/appUrl";

export type PerfilUsuario =
  | "admin"
  | "gestor"
  | "tecnico"
  | "comercial"
  | "solicitante";

export type PerfilConfiguravel = Exclude<PerfilUsuario, "admin">;

export const PERFIS_USUARIO: Array<{
  value: PerfilUsuario;
  label: string;
  description: string;
}> = [
  {
    value: "admin",
    label: "Admin",
    description: "Acesso total e envio de convites.",
  },
  {
    value: "gestor",
    label: "Gestor",
    description: "Gestao operacional ampla sem administrar usuarios.",
  },
  {
    value: "tecnico",
    label: "Tecnico",
    description: "Execucao tecnica, OS, certificados e planos.",
  },
  {
    value: "comercial",
    label: "Comercial",
    description: "Clientes, orcamentos, contratos e acompanhamento.",
  },
  {
    value: "solicitante",
    label: "Solicitante",
    description: "Acesso do cliente aos proprios dados e certificados.",
  },
];

export const PERFIS_CONFIGURAVEIS: PerfilConfiguravel[] = [
  "gestor",
  "tecnico",
  "comercial",
  "solicitante",
];

export type Permissao = {
  chave: string;
  nome: string;
  grupo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
};

export type PerfilPermissao = {
  organizacao_id: string;
  perfil: PerfilConfiguravel;
  permissao_chave: string;
  permitido: boolean;
};

export type UsuarioHierarquia = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  perfil: PerfilUsuario;
  empresa_id: string | null;
  assinatura_storage_path: string | null;
  assinatura_atualizada_em: string | null;
  ativo: boolean;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
  } | null;
};

export type EmpresaConvite = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  ativo: boolean;
};

export type UsuarioConvite = {
  id: string;
  organizacao_id: string;
  empresa_id: string | null;
  email: string;
  nome: string | null;
  perfil: PerfilUsuario;
  status: "pendente" | "aceito" | "cancelado" | "expirado";
  expira_em: string;
  created_at: string;
  aceito_em: string | null;
  cancelado_em: string | null;
  token_reenvio: string | null;
  excluido_em: string | null;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
  } | null;
};

export type UsuariosPermissoesConfig = {
  usuarios: UsuarioHierarquia[];
  permissoes: Permissao[];
  perfilPermissoes: PerfilPermissao[];
  empresas: EmpresaConvite[];
  convites: UsuarioConvite[];
};

export type CriarConviteInput = {
  nome?: string;
  email: string;
  perfil: PerfilUsuario;
  empresaId?: string | null;
  diasValidade?: number;
};

export type ConviteCriado = {
  convite: UsuarioConvite;
  link: string;
};

const selectUsuarios = `
  id,
  nome,
  email,
  telefone,
  cargo,
  perfil,
  empresa_id,
  assinatura_storage_path,
  assinatura_atualizada_em,
  ativo,
  empresa:empresas!usuarios_empresa_id_fkey (
    id,
    nome,
    nome_fantasia
  )
`;

const selectPermissoes = `
  chave,
  nome,
  grupo,
  descricao,
  ordem,
  ativo
`;

const selectPerfilPermissoes = `
  organizacao_id,
  perfil,
  permissao_chave,
  permitido
`;

const selectEmpresas = `
  id,
  nome,
  nome_fantasia,
  ativo
`;

const selectConvites = `
  id,
  organizacao_id,
  empresa_id,
  email,
  nome,
  perfil,
  status,
  expira_em,
  created_at,
  aceito_em,
  cancelado_em,
  token_reenvio,
  excluido_em,
  empresa:empresas!usuario_convites_empresa_id_fkey (
    id,
    nome,
    nome_fantasia
  )
`;

const buscarOrganizacaoAtual = async () => {
  const { data, error } = await supabase.rpc("current_organizacao_id");

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nao foi possivel identificar a organizacao.");

  return data as string;
};

const getTokenAleatorio = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const getSha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const getConviteUrl = (token: string) =>
  `${getAppUrl()}/convite/${encodeURIComponent(token)}`;

export const getPerfilLabel = (perfil: string) =>
  PERFIS_USUARIO.find((item) => item.value === perfil)?.label || perfil;

export const perfilExigeCliente = (perfil: PerfilUsuario) =>
  perfil === "solicitante";

export const usuariosPermissoesService = {
  async buscarConfig(): Promise<UsuariosPermissoesConfig> {
    const [
      usuariosResult,
      permissoesResult,
      perfilPermissoesResult,
      empresasResult,
      convitesResult,
    ] = await Promise.all([
      supabase
        .from("usuarios")
        .select(selectUsuarios)
        .order("nome", { ascending: true }),
      supabase
        .from("permissoes")
        .select(selectPermissoes)
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
      supabase.from("perfil_permissoes").select(selectPerfilPermissoes),
      supabase
        .from("empresas")
        .select(selectEmpresas)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("usuario_convites")
        .select(selectConvites)
        .is("excluido_em", null)
        .order("created_at", { ascending: false }),
    ]);

    if (usuariosResult.error) throw new Error(usuariosResult.error.message);
    if (permissoesResult.error) throw new Error(permissoesResult.error.message);
    if (perfilPermissoesResult.error) {
      throw new Error(perfilPermissoesResult.error.message);
    }
    if (empresasResult.error) throw new Error(empresasResult.error.message);

    const convitesIndisponiveis =
      convitesResult.error &&
      convitesResult.error.message.includes("usuario_convites");

    if (convitesResult.error && !convitesIndisponiveis) {
      throw new Error(convitesResult.error.message);
    }

    return {
      usuarios: (usuariosResult.data || []) as unknown as UsuarioHierarquia[],
      permissoes: (permissoesResult.data || []) as Permissao[],
      perfilPermissoes: (perfilPermissoesResult.data ||
        []) as PerfilPermissao[],
      empresas: (empresasResult.data || []) as EmpresaConvite[],
      convites: convitesIndisponiveis
        ? []
        : ((convitesResult.data || []) as unknown as UsuarioConvite[]),
    };
  },

  async atualizarPermissaoPerfil(input: {
    perfil: PerfilConfiguravel;
    permissaoChave: string;
    permitido: boolean;
  }) {
    const organizacaoId = await buscarOrganizacaoAtual();

    const { error } = await supabase.from("perfil_permissoes").upsert(
      {
        organizacao_id: organizacaoId,
        perfil: input.perfil,
        permissao_chave: input.permissaoChave,
        permitido: input.permitido,
      },
      { onConflict: "organizacao_id,perfil,permissao_chave" }
    );

    if (error) throw new Error(error.message);
  },

  async criarConvite(input: CriarConviteInput): Promise<ConviteCriado> {
    const email = input.email.trim().toLowerCase();
    const nome = input.nome?.trim() || null;
    const empresaId = input.empresaId || null;

    if (!email) throw new Error("Informe o e-mail do convidado.");
    if (perfilExigeCliente(input.perfil) && !empresaId) {
      throw new Error("Solicitantes precisam estar vinculados a um cliente.");
    }

    const organizacaoId = await buscarOrganizacaoAtual();
    const token = getTokenAleatorio();
    const tokenHash = await getSha256Hex(token);
    const diasValidade = Math.max(1, Math.floor(input.diasValidade || 7));
    const expiraEm = new Date(
      Date.now() + diasValidade * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: conviteExistente, error: conviteExistenteError } =
      await supabase
        .from("usuario_convites")
        .select("id")
        .eq("organizacao_id", organizacaoId)
        .eq("email", email)
        .eq("status", "pendente")
        .maybeSingle();

    if (conviteExistenteError) {
      throw new Error(conviteExistenteError.message);
    }

    if (conviteExistente) {
      throw new Error("Ja existe um convite pendente para este e-mail.");
    }

    const { data, error } = await supabase
      .from("usuario_convites")
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: empresaId,
        email,
        nome,
        perfil: input.perfil,
        token_hash: tokenHash,
        token_reenvio: token,
        expira_em: expiraEm,
      })
      .select(selectConvites)
      .single();

    if (error) throw new Error(error.message);

    return {
      convite: data as unknown as UsuarioConvite,
      link: getConviteUrl(token),
    };
  },

  async cancelarConvite(conviteId: string) {
    const { data, error } = await supabase
      .from("usuario_convites")
      .update({
        status: "cancelado",
        cancelado_em: new Date().toISOString(),
      })
      .eq("id", conviteId)
      .eq("status", "pendente")
      .is("excluido_em", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Este convite nao esta mais pendente.");
  },

  async obterLinkConvite(convite: UsuarioConvite) {
    if (convite.status !== "pendente") {
      throw new Error("Somente convites pendentes podem ser copiados.");
    }

    if (new Date(convite.expira_em).getTime() < Date.now()) {
      throw new Error("Este convite esta expirado.");
    }

    if (convite.token_reenvio) {
      return getConviteUrl(convite.token_reenvio);
    }

    // Convites criados antes desta migration nao possuem o token bruto.
    // Nesse caso, rotacionamos o token sem alterar a validade do convite.
    const token = getTokenAleatorio();
    const tokenHash = await getSha256Hex(token);
    const { data, error } = await supabase
      .from("usuario_convites")
      .update({
        token_hash: tokenHash,
        token_reenvio: token,
      })
      .eq("id", convite.id)
      .eq("status", "pendente")
      .is("excluido_em", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Este convite nao esta mais disponivel.");

    return getConviteUrl(token);
  },

  async excluirConvite(conviteId: string) {
    const { data: convite, error: buscarError } = await supabase
      .from("usuario_convites")
      .select("id,status")
      .eq("id", conviteId)
      .is("excluido_em", null)
      .maybeSingle();

    if (buscarError) throw new Error(buscarError.message);
    if (!convite) throw new Error("Convite nao encontrado.");

    const { data: authData } = await supabase.auth.getUser();
    const agora = new Date().toISOString();
    const atualizacao: Record<string, string | null> = {
      excluido_em: agora,
      excluido_por: authData.user?.id || null,
    };

    if (convite.status === "pendente") {
      atualizacao.status = "cancelado";
      atualizacao.cancelado_em = agora;
    }

    const { error } = await supabase
      .from("usuario_convites")
      .update(atualizacao)
      .eq("id", conviteId);

    if (error) throw new Error(error.message);
  },
};

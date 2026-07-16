import { supabase } from "@/lib/supabaseClient";
import { getAppUrl } from "@/utils/appUrl";
import { getPerfilLabel, type PerfilUsuario } from "./usuariosPermissoesService";

export type ConvitePublico = {
  email: string;
  nome: string | null;
  perfil: PerfilUsuario;
  empresa_id: string | null;
  empresa_nome: string | null;
  expira_em: string;
};

export type AceiteConviteResultado = {
  precisaConfirmarEmail: boolean;
};

export const conviteCadastroService = {
  async validar(token: string): Promise<ConvitePublico> {
    const { data, error } = await supabase
      .rpc("validar_usuario_convite", { p_token: token })
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error("Convite invalido, expirado ou ja utilizado.");
    }

    return data as ConvitePublico;
  },

  async aceitar(input: {
    token: string;
    nome: string;
    email: string;
    senha: string;
  }): Promise<AceiteConviteResultado> {
    const email = input.email.trim().toLowerCase();

    const { data: sessaoAtual } = await supabase.auth.getSession();
    const emailSessao = sessaoAtual.session?.user.email?.toLowerCase();

    if (emailSessao === email) {
      const { error } = await supabase.rpc("aceitar_usuario_convite", {
        p_token: input.token,
        p_nome: input.nome,
      });

      if (error) throw new Error(error.message);

      return { precisaConfirmarEmail: false };
    }

    if (emailSessao && emailSessao !== email) {
      await supabase.auth.signOut();
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: input.senha,
      options: {
        emailRedirectTo: `${getAppUrl()}/convite/${encodeURIComponent(
          input.token
        )}`,
        data: {
          nome: input.nome,
        },
      },
    });

    if (signUpError) throw new Error(signUpError.message);

    if (!signUpData.session) {
      return { precisaConfirmarEmail: true };
    }

    const { error: aceitarError } = await supabase.rpc(
      "aceitar_usuario_convite",
      {
        p_token: input.token,
        p_nome: input.nome,
      }
    );

    if (aceitarError) throw new Error(aceitarError.message);

    return { precisaConfirmarEmail: false };
  },

  getPerfilLabel,
};

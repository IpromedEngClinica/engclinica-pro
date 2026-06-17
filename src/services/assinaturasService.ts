import { supabase } from "@/lib/supabaseClient";

const ASSINATURAS_BUCKET = "assinaturas-usuarios";

export type AssinaturaDocumento = {
  usuarioId: string;
  nome: string;
  storagePath: string;
  dataUrl: string;
};

export type AssinaturasDocumento = {
  tecnico?: AssinaturaDocumento | null;
  responsavel?: AssinaturaDocumento | null;
  solicitante?: AssinaturaDocumento | null;
};

type AssinaturaResolvidaRpc = Omit<AssinaturaDocumento, "dataUrl">;

type ResolverAssinaturasInput = {
  tecnicoUsuarioId?: string | null;
  tecnicoNome?: string | null;
  responsavelNome?: string | null;
  solicitanteNome?: string | null;
  empresaId?: string | null;
};

const dataUrlCache = new Map<string, Promise<string>>();

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a assinatura."));
    reader.readAsDataURL(blob);
  });

const baixarDataUrl = (storagePath: string) => {
  const cached = dataUrlCache.get(storagePath);
  if (cached) return cached;

  const promise = supabase.storage
    .from(ASSINATURAS_BUCKET)
    .download(storagePath)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return blobToDataUrl(data);
    })
    .catch((error) => {
      dataUrlCache.delete(storagePath);
      throw error;
    });

  dataUrlCache.set(storagePath, promise);
  return promise;
};

const hidratarAssinatura = async (
  assinatura?: AssinaturaResolvidaRpc | null
): Promise<AssinaturaDocumento | null> => {
  if (!assinatura?.storagePath) return null;

  return {
    ...assinatura,
    dataUrl: await baixarDataUrl(assinatura.storagePath),
  };
};

export const assinaturasService = {
  async buscarMinhaAssinatura() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Usuario nao autenticado.");

    const { data, error } = await supabase
      .from("usuarios")
      .select("assinatura_storage_path, assinatura_atualizada_em")
      .eq("id", authData.user.id)
      .single();

    if (error) throw new Error(error.message);

    const storagePath = data.assinatura_storage_path as string | null;
    return {
      storagePath,
      atualizadaEm: data.assinatura_atualizada_em as string | null,
      dataUrl: storagePath ? await baixarDataUrl(storagePath) : null,
    };
  },

  async salvarMinhaAssinatura(arquivo: Blob) {
    const [{ data: authData, error: authError }, { data: organizacaoId, error: organizacaoError }] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_organizacao_id"),
      ]);

    if (authError) throw new Error(authError.message);
    if (organizacaoError) throw new Error(organizacaoError.message);
    if (!authData.user || !organizacaoId) throw new Error("Usuario nao autenticado.");

    const storagePath = `${organizacaoId}/${authData.user.id}/assinatura.png`;
    const { error: uploadError } = await supabase.storage
      .from(ASSINATURAS_BUCKET)
      .upload(storagePath, arquivo, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { error: salvarError } = await supabase.rpc(
      "salvar_assinatura_propria",
      { p_storage_path: storagePath }
    );

    if (salvarError) throw new Error(salvarError.message);

    dataUrlCache.delete(storagePath);
    return assinaturasService.buscarMinhaAssinatura();
  },

  async removerMinhaAssinatura(storagePath?: string | null) {
    const { error } = await supabase.rpc("remover_assinatura_propria");
    if (error) throw new Error(error.message);

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(ASSINATURAS_BUCKET)
        .remove([storagePath]);
      if (storageError) throw new Error(storageError.message);
      dataUrlCache.delete(storagePath);
    }
  },

  async resolverDocumento(
    input: ResolverAssinaturasInput
  ): Promise<AssinaturasDocumento> {
    try {
      const { data, error } = await supabase.rpc(
        "resolver_assinaturas_documento",
        {
          p_tecnico_usuario_id: input.tecnicoUsuarioId || null,
          p_tecnico_nome: input.tecnicoNome || null,
          p_responsavel_nome: input.responsavelNome || null,
          p_solicitante_nome: input.solicitanteNome || null,
          p_empresa_id: input.empresaId || null,
        }
      );

      if (error) throw new Error(error.message);

      const resolvidas = (data || {}) as {
        tecnico?: AssinaturaResolvidaRpc | null;
        responsavel?: AssinaturaResolvidaRpc | null;
        solicitante?: AssinaturaResolvidaRpc | null;
      };

      const [tecnico, responsavel, solicitante] = await Promise.all([
        hidratarAssinatura(resolvidas.tecnico),
        hidratarAssinatura(resolvidas.responsavel),
        hidratarAssinatura(resolvidas.solicitante),
      ]);

      return { tecnico, responsavel, solicitante };
    } catch (error) {
      console.warn("Nao foi possivel carregar as assinaturas do documento.", error);
      return {};
    }
  },
};

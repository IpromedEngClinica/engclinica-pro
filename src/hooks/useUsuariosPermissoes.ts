import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usuariosPermissoesService,
  type CriarConviteInput,
  type PerfilConfiguravel,
  type UsuarioConvite,
} from "@/services/usuariosPermissoesService";

export const USUARIOS_PERMISSOES_QUERY_KEY = ["usuarios-permissoes"];

export const useUsuariosPermissoesConfig = (enabled = true) =>
  useQuery({
    queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
    queryFn: () => usuariosPermissoesService.buscarConfig(),
    enabled,
  });

export const useAtualizarPermissaoPerfil = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      perfil: PerfilConfiguravel;
      permissaoChave: string;
      permitido: boolean;
    }) => usuariosPermissoesService.atualizarPermissaoPerfil(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
      });
    },
  });
};

export const useCriarConviteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CriarConviteInput) =>
      usuariosPermissoesService.criarConvite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
      });
    },
  });
};

export const useCancelarConviteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conviteId: string) =>
      usuariosPermissoesService.cancelarConvite(conviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
      });
    },
  });
};

export const useObterLinkConviteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (convite: UsuarioConvite) =>
      usuariosPermissoesService.obterLinkConvite(convite),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
      });
    },
  });
};

export const useExcluirConviteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conviteId: string) =>
      usuariosPermissoesService.excluirConvite(conviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USUARIOS_PERMISSOES_QUERY_KEY,
      });
    },
  });
};

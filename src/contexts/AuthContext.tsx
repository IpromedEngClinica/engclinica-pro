import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { queryClient } from "@/lib/queryClient";

type AuthUsuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: string | null;
  ativo: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  usuario: AuthUsuario | null;
  permissoes: string[];
  loading: boolean;
  usuarioLoading: boolean;
  hasPermission: (permissao: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<AuthUsuario | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioLoading, setUsuarioLoading] = useState(false);
  const usuarioRef = useRef<AuthUsuario | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUsuario = async (
      currentSession: Session | null,
      showLoading = true
    ) => {
      if (!currentSession?.user) {
        usuarioRef.current = null;
        setUsuario(null);
        setPermissoes([]);
        setUsuarioLoading(false);
        return;
      }

      const userId = currentSession.user.id;

      if (showLoading) {
        setUsuarioLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, email, perfil, empresa_id, ativo")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (!mounted || sessionUserIdRef.current !== userId) return;

        if (error) {
          console.error("Erro ao carregar usuario:", error.message);
          if (showLoading) {
            usuarioRef.current = null;
            setUsuario(null);
            setPermissoes([]);
          }
          return;
        }

        const usuarioData = (data as AuthUsuario | null) ?? null;
        usuarioRef.current = usuarioData;
        setUsuario(usuarioData);

        if (!usuarioData) {
          setPermissoes([]);
          return;
        }

        if (usuarioData.perfil === "admin") {
          setPermissoes(["*"]);
          return;
        }

        const { data: permissoesData, error: permissoesError } = await supabase
          .from("perfil_permissoes")
          .select("permissao_chave")
          .eq("perfil", usuarioData.perfil)
          .eq("permitido", true);

        if (!mounted || sessionUserIdRef.current !== userId) return;

        if (permissoesError) {
          console.error("Erro ao carregar permissoes:", permissoesError.message);
          if (showLoading) {
            setPermissoes([]);
          }
          return;
        }

        setPermissoes(
          (permissoesData || []).map(
            (item) => item.permissao_chave as string
          )
        );
      } finally {
        if (
          mounted &&
          showLoading &&
          sessionUserIdRef.current === userId
        ) {
          setUsuarioLoading(false);
        }
      }
    };

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao carregar sessao:", error.message);
      }

      const initialSession = data.session ?? null;
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = initialSession?.user.id ?? null;

      if (previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
      }
      sessionUserIdRef.current = nextUserId;
      setSession(initialSession);
      setUsuarioLoading(Boolean(initialSession?.user));
      setLoading(false);
      void loadUsuario(initialSession);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        const previousUserId = sessionUserIdRef.current;
        const nextUserId = newSession?.user.id ?? null;
        const sameUser = Boolean(
          newSession?.user && usuarioRef.current?.id === newSession.user.id
        );

        if (previousUserId && previousUserId !== nextUserId) {
          queryClient.clear();
        }

        sessionUserIdRef.current = nextUserId;
        setSession(newSession);
        setUsuarioLoading(Boolean(newSession?.user) && !sameUser);
        setLoading(false);
        setTimeout(() => {
          void loadUsuario(newSession, !sameUser);
        }, 0);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    usuarioRef.current = null;
    sessionUserIdRef.current = null;
    setUsuario(null);
    setPermissoes([]);
  };

  const hasPermission = useCallback(
    (permissao: string) =>
      usuario?.perfil === "admin" ||
      permissoes.includes("*") ||
      permissoes.includes(permissao),
    [usuario?.perfil, permissoes]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      usuario,
      permissoes,
      loading,
      usuarioLoading,
      hasPermission,
      signIn,
      signOut,
    }),
    [session, usuario, permissoes, loading, usuarioLoading, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return ctx;
};

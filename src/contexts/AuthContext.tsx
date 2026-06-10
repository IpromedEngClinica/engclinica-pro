import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

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

  useEffect(() => {
    let mounted = true;

    const loadUsuario = async (currentSession: Session | null) => {
      if (!currentSession?.user) {
        setUsuario(null);
        setPermissoes([]);
        setUsuarioLoading(false);
        return;
      }

      setUsuarioLoading(true);

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, email, perfil, empresa_id, ativo")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("Erro ao carregar usuario:", error.message);
          setUsuario(null);
          setPermissoes([]);
          return;
        }

        const usuarioData = (data as AuthUsuario | null) ?? null;
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

        if (!mounted) return;

        if (permissoesError) {
          console.error("Erro ao carregar permissoes:", permissoesError.message);
          setPermissoes([]);
          return;
        }

        setPermissoes(
          (permissoesData || []).map(
            (item) => item.permissao_chave as string
          )
        );
      } finally {
        if (mounted) setUsuarioLoading(false);
      }
    };

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao carregar sessao:", error.message);
      }

      setSession(data.session ?? null);
      setUsuarioLoading(Boolean(data.session?.user));
      setLoading(false);
      void loadUsuario(data.session ?? null);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUsuarioLoading(Boolean(newSession?.user));
        setLoading(false);
        setTimeout(() => {
          void loadUsuario(newSession);
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

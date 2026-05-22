import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Cpu, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  const [email, setEmail] = useState("ipromed.eng@gmail.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const result = await signIn(email.trim(), password);

    setSubmitting(false);

    if (result.error) {
      setError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Cpu className="w-6 h-6 text-primary-foreground" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                EngClinica Pro
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acesse o sistema de gestão de engenharia clínica.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Senha
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="w-4 h-4 mr-2" />
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center border-t pt-4">
            Acesso restrito a usuários autorizados.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
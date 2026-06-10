import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { conviteCadastroService } from "@/services/conviteCadastroService";
import type { ConvitePublico } from "@/services/conviteCadastroService";

const ConviteCadastro = () => {
  const { token = "" } = useParams();
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [emailAutenticado, setEmailAutenticado] = useState("");
  const [form, setForm] = useState({
    nome: "",
    senha: "",
    confirmarSenha: "",
  });

  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      setLoading(true);
      setErro("");

      try {
        const data = await conviteCadastroService.validar(token);

        if (!mounted) return;
        setConvite(data);
        const { data: sessaoAtual } = await supabase.auth.getSession();
        if (!mounted) return;
        setEmailAutenticado(
          sessaoAtual.session?.user.email?.toLowerCase() || ""
        );
        setForm((prev) => ({
          ...prev,
          nome: data.nome || "",
        }));
      } catch (err) {
        if (!mounted) return;
        setErro(
          err instanceof Error
            ? err.message
            : "Nao foi possivel validar o convite."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void carregar();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!convite) return;

    setErro("");
    setSucesso("");

    const sessaoDoConvite =
      emailAutenticado === convite.email.trim().toLowerCase();

    if (!sessaoDoConvite && form.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!sessaoDoConvite && form.senha !== form.confirmarSenha) {
      setErro("A confirmacao de senha nao confere.");
      return;
    }

    setSubmitting(true);

    try {
      const resultado = await conviteCadastroService.aceitar({
        token,
        nome: form.nome.trim() || convite.nome || convite.email,
        email: convite.email,
        senha: form.senha,
      });

      if (resultado.precisaConfirmarEmail) {
        setSucesso(
          "Cadastro criado. Confirme o e-mail enviado pelo Supabase e acesse o link de convite novamente para concluir."
        );
        return;
      }

      setSucesso("Convite aceito. Redirecionando...");
      window.location.assign("/");
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado ao aceitar convite."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sessaoDoConvite =
    convite !== null && emailAutenticado === convite.email.trim().toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Criar acesso</h1>
            <p className="text-sm text-muted-foreground">
              Convite unico para acessar o EngClinica Pro.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Validando convite...
          </div>
        )}

        {!loading && erro && !convite && (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Ir para login</Link>
            </Button>
          </div>
        )}

        {!loading && convite && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{convite.email}</div>
              <div className="text-muted-foreground">
                Perfil: {conviteCadastroService.getPerfilLabel(convite.perfil)}
              </div>
              {convite.empresa_nome && (
                <div className="text-muted-foreground">
                  Cliente: {convite.empresa_nome}
                </div>
              )}
              <div className="text-muted-foreground">
                Expira em:{" "}
                {new Date(convite.expira_em).toLocaleDateString("pt-BR")}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nome: event.target.value }))
                }
                required
              />
            </div>

            {!sessaoDoConvite && (
              <>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={form.senha}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        senha: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Confirmar senha</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmarSenha}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        confirmarSenha: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </>
            )}

            {erro && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {sucesso && (
              <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{sucesso}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sessaoDoConvite ? "Concluir acesso" : "Criar conta"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ConviteCadastro;

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

type TestResult = {
  label: string;
  status: "success" | "error" | "pending";
  message: string;
};

const SupabaseTest = () => {
  const [results, setResults] = useState<TestResult[]>([
    {
      label: "Conexão Supabase",
      status: "pending",
      message: "Aguardando teste...",
    },
  ]);

  const updateResult = (label: string, status: TestResult["status"], message: string) => {
    setResults((prev) => {
      const exists = prev.some((item) => item.label === label);

      if (!exists) {
        return [...prev, { label, status, message }];
      }

      return prev.map((item) =>
        item.label === label ? { ...item, status, message } : item
      );
    });
  };

  const runTests = async () => {
    setResults([]);

    updateResult("Conexão Supabase", "pending", "Testando conexão...");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      updateResult(
        "Sessão",
        "error",
        `Erro ao consultar sessão: ${sessionError.message}`
      );
    } else if (!sessionData.session) {
      updateResult(
        "Sessão",
        "error",
        "Nenhum usuário autenticado. Isso é esperado se ainda não criamos tela de login."
      );
    } else {
      updateResult(
        "Sessão",
        "success",
        `Usuário autenticado: ${sessionData.session.user.email}`
      );
    }

    const { data: organizacoes, error: orgError } = await supabase
      .from("organizacoes")
      .select("id, nome, nome_fantasia, cnpj")
      .limit(5);

    if (orgError) {
      updateResult(
        "Tabela organizacoes",
        "error",
        `Erro ao consultar organizações: ${orgError.message}`
      );
    } else {
      updateResult(
        "Tabela organizacoes",
        "success",
        `Consulta executada. Registros retornados: ${organizacoes?.length ?? 0}`
      );
    }

    const { data: tipos, error: tiposError } = await supabase
      .from("tipos_equipamento")
      .select("id, nome")
      .limit(5);

    if (tiposError) {
      updateResult(
        "Tabela tipos_equipamento",
        "error",
        `Erro ao consultar tipos de equipamento: ${tiposError.message}`
      );
    } else {
      updateResult(
        "Tabela tipos_equipamento",
        "success",
        `Consulta executada. Registros retornados: ${tipos?.length ?? 0}`
      );
    }

    updateResult("Conexão Supabase", "success", "Teste finalizado.");
  };

  useEffect(() => {
    runTests();
  }, []);

  const statusClass = {
    success: "bg-success/10 text-success",
    error: "bg-destructive/10 text-destructive",
    pending: "bg-warning/10 text-warning",
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Teste Supabase"
        description="Página temporária para validar conexão entre frontend e Supabase."
      >
        <Button onClick={runTests}>Executar novamente</Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            Resultado dos testes
          </h2>
        </div>

        <div className="divide-y">
          {results.map((result) => (
            <div
              key={result.label}
              className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{result.label}</p>
                <p className="text-sm text-muted-foreground">{result.message}</p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium w-fit ${statusClass[result.status]}`}
              >
                {result.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          Observação: se não houver usuário logado, as consultas protegidas por
          RLS podem retornar erro ou zero registros. Isso é esperado até criarmos
          a tela de autenticação.
        </p>
      </div>
    </div>
  );
};

export default SupabaseTest;
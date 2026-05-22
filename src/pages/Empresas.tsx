import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  MoreHorizontal,
  Wrench,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useMemo, useState } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";

const Empresas = () => {
  const [search, setSearch] = useState("");
  const { data: empresas = [], isLoading, isError, error, refetch } = useEmpresas();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return empresas;

    return empresas.filter((e) => {
      return (
        e.nome.toLowerCase().includes(q) ||
        (e.nome_fantasia || "").toLowerCase().includes(q) ||
        (e.cpf_cnpj || "").toLowerCase().includes(q) ||
        (e.cidade || "").toLowerCase().includes(q) ||
        (e.estado || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q)
      );
    });
  }, [empresas, search]);

  const featurePending = (label: string) => {
  window.alert(`${label} será migrado para Supabase na próxima etapa.`);
    };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Empresas"
        description="Gerencie as empresas cadastradas no Supabase"
      >
        <Button onClick={() => featurePending("Cadastro de empresa")}>
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando empresas...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar empresas
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {error instanceof Error ? error.message : "Erro desconhecido."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Nome
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Cidade
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Telefone
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    E-mail
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Contato
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    CPF/CNPJ
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      <button
                        type="button"
                        onClick={() => featurePending("Visualização de empresa")}
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4" /> {e.nome}
                      </button>
                      {e.nome_fantasia && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.nome_fantasia}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.tipo_cliente || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.cidade || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.estado || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.telefone || e.celular || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.email || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.contato || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.cpf_cnpj || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Ações">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-popover">
                            <DropdownMenuItem
                              onClick={() => featurePending("Visualização de empresa")}
                            >
                              <Eye className="w-4 h-4 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => featurePending("Edição de empresa")}
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                featurePending("Cadastro de equipamento vinculado")
                              }
                            >
                              <Wrench className="w-4 h-4 mr-2" /> Cadastrar Equipamento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma empresa cadastrada no Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Empresas;
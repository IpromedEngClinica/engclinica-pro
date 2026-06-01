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
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import PageHeader from "@/components/PageHeader";
import EmpresaFormDialog, { DialogMode } from "@/components/EmpresaFormDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoFormDialog from "@/components/EquipamentoFormDialog";
import { useMemo, useState } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  EmpresaSupabase,
  empresasService,
  StatusEmpresaFiltro,
} from "@/services/empresasService";

const ALL = "__all__";

const Empresas = () => {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] =
    useState<StatusEmpresaFiltro>("ativas");
  const [cidadeFiltro, setCidadeFiltro] = useState(ALL);
  const [ufFiltro, setUfFiltro] = useState(ALL);
  const [documentoFiltro, setDocumentoFiltro] = useState<
    "todos" | "cnpj" | "cpf" | "sem_documento"
  >("todos");
  const [emailFiltro, setEmailFiltro] = useState<
    "todos" | "com_email" | "sem_email"
  >("todos");
  const [telefoneFiltro, setTelefoneFiltro] = useState<
    "todos" | "com_telefone" | "sem_telefone"
  >("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [equipamentoFormOpen, setEquipamentoFormOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<EmpresaSupabase | null>(null);
  const [empresaParaNovoEquipamento, setEmpresaParaNovoEquipamento] =
    useState<EmpresaSupabase | null>(null);

  const { data: empresas = [], isLoading, isError, error, refetch } =
    useEmpresas({ statusFiltro });

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

  const opts = useMemo(
    () => ({
      cidades: uniq(empresas.map((empresa) => empresa.cidade || "")),
      ufs: uniq(empresas.map((empresa) => empresa.estado || "")),
    }),
    [empresas]
  );

  const getTipoDocumento = (value?: string | null) => {
    const digits = (value || "").replace(/\D/g, "");
    if (!digits) return "sem_documento";
    return digits.length > 11 ? "cnpj" : "cpf";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return empresas.filter((e) => {
      const matchSearch =
        !q ||
        e.nome.toLowerCase().includes(q) ||
        (e.nome_fantasia || "").toLowerCase().includes(q) ||
        (e.cpf_cnpj || "").toLowerCase().includes(q) ||
        (e.cidade || "").toLowerCase().includes(q) ||
        (e.estado || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q);

      const tipoDocumento = getTipoDocumento(e.cpf_cnpj);
      const temEmail = Boolean(e.email?.trim());
      const temTelefone = Boolean(e.telefone?.trim() || e.celular?.trim());

      return (
        matchSearch &&
        (cidadeFiltro === ALL || e.cidade === cidadeFiltro) &&
        (ufFiltro === ALL || e.estado === ufFiltro) &&
        (documentoFiltro === "todos" || tipoDocumento === documentoFiltro) &&
        (emailFiltro === "todos" ||
          (emailFiltro === "com_email" ? temEmail : !temEmail)) &&
        (telefoneFiltro === "todos" ||
          (telefoneFiltro === "com_telefone" ? temTelefone : !temTelefone))
      );
    });
  }, [
    cidadeFiltro,
    documentoFiltro,
    emailFiltro,
    empresas,
    search,
    telefoneFiltro,
    ufFiltro,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFiltro !== "ativas") count++;
    if (cidadeFiltro !== ALL) count++;
    if (ufFiltro !== ALL) count++;
    if (documentoFiltro !== "todos") count++;
    if (emailFiltro !== "todos") count++;
    if (telefoneFiltro !== "todos") count++;
    return count;
  }, [
    cidadeFiltro,
    documentoFiltro,
    emailFiltro,
    statusFiltro,
    telefoneFiltro,
    ufFiltro,
  ]);

  const limparFiltros = () => {
    setSearch("");
    setStatusFiltro("ativas");
    setCidadeFiltro(ALL);
    setUfFiltro(ALL);
    setDocumentoFiltro("todos");
    setEmailFiltro("todos");
    setTelefoneFiltro("todos");
  };

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setDialogOpen(true);
  };

  const openView = async (empresa: EmpresaSupabase) => {
    try {
      const empresaCompleta = await empresasService.buscarPorId(empresa.id);
      setSelected(empresaCompleta);
      setDetailsOpen(true);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Erro inesperado ao abrir empresa."
      );
    }
  };

  const openEdit = (empresa: EmpresaSupabase) => {
    setSelected(empresa);
    setMode("edit");
    setDialogOpen(true);
  };

  const openCreateEquipamento = (empresa: EmpresaSupabase) => {
    setEmpresaParaNovoEquipamento(empresa);
    setEquipamentoFormOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Empresas"
        description="Gerencie as empresas cadastradas no Supabase"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </PageHeader>

      <EmpresaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        empresa={selected}
      />

      <EmpresaDetalhesDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        empresa={selected}
        onEditar={(empresa) => {
          setSelected(empresa);
          setMode("edit");
          setDialogOpen(true);
          setDetailsOpen(false);
        }}
        onCriarEquipamento={openCreateEquipamento}
      />

      <EquipamentoFormDialog
        open={equipamentoFormOpen}
        onOpenChange={(open) => {
          setEquipamentoFormOpen(open);
          if (!open) setEmpresaParaNovoEquipamento(null);
        }}
        empresaInicialId={empresaParaNovoEquipamento?.id}
        empresaInicial={empresaParaNovoEquipamento}
      />

      <div className="bg-card rounded-xl border mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {filtersOpen && (
          <div className="border-t px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select
                value={statusFiltro}
                onValueChange={(value) =>
                  setStatusFiltro(value as StatusEmpresaFiltro)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativas">Somente ativas</SelectItem>
                  <SelectItem value="todas">Ativas e inativas</SelectItem>
                  <SelectItem value="inativas">Somente inativas</SelectItem>
                </SelectContent>
              </Select>

              <SearchableSelect
                value={cidadeFiltro === ALL ? "" : cidadeFiltro}
                onValueChange={(value) => setCidadeFiltro(value || ALL)}
                options={opts.cidades}
                placeholder="Cidade (todas)"
                emptyText="Nenhuma cidade encontrada."
              />

              <SearchableSelect
                value={ufFiltro === ALL ? "" : ufFiltro}
                onValueChange={(value) => setUfFiltro(value || ALL)}
                options={opts.ufs}
                placeholder="UF (todas)"
                emptyText="Nenhuma UF encontrada."
              />

              <Select
                value={documentoFiltro}
                onValueChange={(value) =>
                  setDocumentoFiltro(
                    value as "todos" | "cnpj" | "cpf" | "sem_documento"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os documentos</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="sem_documento">Sem documento</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={emailFiltro}
                onValueChange={(value) =>
                  setEmailFiltro(value as "todos" | "com_email" | "sem_email")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="E-mail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">E-mail: todos</SelectItem>
                  <SelectItem value="com_email">Com e-mail</SelectItem>
                  <SelectItem value="sem_email">Sem e-mail</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={telefoneFiltro}
                onValueChange={(value) =>
                  setTelefoneFiltro(
                    value as "todos" | "com_telefone" | "sem_telefone"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Telefone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Telefone: todos</SelectItem>
                  <SelectItem value="com_telefone">Com telefone</SelectItem>
                  <SelectItem value="sem_telefone">Sem telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

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
                        onClick={() => openView(e)}
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
                            <DropdownMenuItem onClick={() => openView(e)}>
                              <Eye className="w-4 h-4 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(e)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCreateEquipamento(e)}
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

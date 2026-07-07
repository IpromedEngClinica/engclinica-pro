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
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import SortableTableHeader from "@/components/SortableTableHeader";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import PageHeader from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmpresaFormDialog, { DialogMode } from "@/components/EmpresaFormDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoFormDialog from "@/components/EquipamentoFormDialog";
import { useEffect, useMemo, useState } from "react";
import { useEmpresas, useExcluirEmpresa } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import {
  EmpresaSupabase,
  empresasService,
  StatusEmpresaFiltro,
} from "@/services/empresasService";
import { onlyDigits } from "@/utils/brasil";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";
import { toast } from "@/hooks/use-toast";

const ALL = "__all__";

const formatNumeroCadastro = (numero?: number | null) =>
  String(numero || 0).padStart(3, "0");

const normalizarTexto = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getTipoEmpresa = (empresa: EmpresaSupabase) =>
  empresa.tipo_cliente || empresa.tipo_relacao || "";

const Empresas = () => {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] =
    useState<StatusEmpresaFiltro>("ativas");
  const [tipoFiltro, setTipoFiltro] = useState(ALL);
  const [cidadeFiltro, setCidadeFiltro] = useState(ALL);
  const [ufFiltro, setUfFiltro] = useState(ALL);
  const [contatoFiltro, setContatoFiltro] = useState("");
  const [cpfCnpjFiltro, setCpfCnpjFiltro] = useState("");
  const [documentoFiltro, setDocumentoFiltro] = useState<
    "todos" | "cnpj" | "cpf" | "sem_documento"
  >("todos");
  const [emailFiltro, setEmailFiltro] = useState<
    "todos" | "com_email" | "sem_email"
  >("todos");
  const [telefoneFiltro, setTelefoneFiltro] = useState<
    "todos" | "com_telefone" | "sem_telefone"
  >("todos");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("numero_cadastro");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [equipamentoFormOpen, setEquipamentoFormOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<EmpresaSupabase | null>(null);
  const [empresaExclusao, setEmpresaExclusao] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentosEmpresaExclusao, setEquipamentosEmpresaExclusao] =
    useState(0);
  const [excluirEquipamentosVinculados, setExcluirEquipamentosVinculados] =
    useState(false);
  const [empresaParaNovoEquipamento, setEmpresaParaNovoEquipamento] =
    useState<EmpresaSupabase | null>(null);
  const { hasPermission, usuario } = useAuth();
  const excluirEmpresa = useExcluirEmpresa();
  const canManageEmpresas = hasPermission("empresas.gerenciar");
  const canManageEquipamentos = hasPermission("equipamentos.gerenciar");
  const canDeleteEmpresas =
    canManageEmpresas && ["admin", "gestor"].includes(usuario?.perfil || "");

  const { data: empresas = [], isLoading, isError, error, refetch } =
    useEmpresas({ statusFiltro });

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

  const opts = useMemo(
    () => ({
      tipos: uniq(empresas.map((empresa) => getTipoEmpresa(empresa))),
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
    const q = normalizarTexto(search);
    const qDigits = onlyDigits(search);
    const contatoQ = normalizarTexto(contatoFiltro);
    const documentoQ = normalizarTexto(cpfCnpjFiltro);
    const documentoQDigits = onlyDigits(cpfCnpjFiltro);

    return empresas.filter((e) => {
      const documento = e.cpf_cnpj || "";
      const documentoDigits = onlyDigits(documento);
      const tipoEmpresa = getTipoEmpresa(e);
      const matchSearch =
        !q ||
        normalizarTexto(e.nome).includes(q) ||
        normalizarTexto(e.nome_fantasia).includes(q) ||
        normalizarTexto(documento).includes(q) ||
        normalizarTexto(e.cidade).includes(q) ||
        normalizarTexto(e.estado).includes(q) ||
        normalizarTexto(e.email).includes(q) ||
        normalizarTexto(e.contato).includes(q) ||
        normalizarTexto(tipoEmpresa).includes(q) ||
        (qDigits ? documentoDigits.includes(qDigits) : false);

      const matchContato =
        !contatoQ || normalizarTexto(e.contato).includes(contatoQ);

      const matchCpfCnpj =
        !documentoQ ||
        normalizarTexto(documento).includes(documentoQ) ||
        (documentoQDigits
          ? documentoDigits.includes(documentoQDigits)
          : false);

      const tipoDocumento = getTipoDocumento(e.cpf_cnpj);
      const temEmail = Boolean(e.email?.trim());
      const temTelefone = Boolean(e.telefone?.trim() || e.celular?.trim());

      return (
        matchSearch &&
        matchContato &&
        matchCpfCnpj &&
        (tipoFiltro === ALL || tipoEmpresa === tipoFiltro) &&
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
    contatoFiltro,
    cpfCnpjFiltro,
    documentoFiltro,
    emailFiltro,
    empresas,
    search,
    telefoneFiltro,
    tipoFiltro,
    ufFiltro,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFiltro !== "ativas") count++;
    if (tipoFiltro !== ALL) count++;
    if (cidadeFiltro !== ALL) count++;
    if (ufFiltro !== ALL) count++;
    if (contatoFiltro.trim()) count++;
    if (cpfCnpjFiltro.trim()) count++;
    if (documentoFiltro !== "todos") count++;
    if (emailFiltro !== "todos") count++;
    if (telefoneFiltro !== "todos") count++;
    return count;
  }, [
    cidadeFiltro,
    contatoFiltro,
    cpfCnpjFiltro,
    documentoFiltro,
    emailFiltro,
    statusFiltro,
    telefoneFiltro,
    tipoFiltro,
    ufFiltro,
  ]);

  const sortGetters = useMemo<
    Record<string, (item: EmpresaSupabase) => unknown>
  >(
    () => ({
      numero_cadastro: (empresa) => empresa.numero_cadastro,
      nome: (empresa) => empresa.nome,
      tipo: getTipoEmpresa,
      cidade: (empresa) => empresa.cidade,
      estado: (empresa) => empresa.estado,
      telefone: (empresa) => empresa.telefone || empresa.celular,
      email: (empresa) => empresa.email,
      contato: (empresa) => empresa.contato,
      cpf_cnpj: (empresa) => onlyDigits(empresa.cpf_cnpj || ""),
    }),
    []
  );

  const sortedFiltered = useMemo(
    () =>
      sortByValue(
        filtered,
        sortGetters[sortKey] || sortGetters.numero_cadastro,
        sortDirection
      ),
    [filtered, sortDirection, sortGetters, sortKey]
  );

  const visibleEmpresas = useMemo(
    () => sortedFiltered.slice((page - 1) * listLimit, page * listLimit),
    [listLimit, page, sortedFiltered]
  );

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / listLimit));
  const firstVisibleIndex = sortedFiltered.length
    ? (page - 1) * listLimit + 1
    : 0;
  const lastVisibleIndex = Math.min(page * listLimit, sortedFiltered.length);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  useEffect(() => {
    setPage(1);
  }, [
    cidadeFiltro,
    contatoFiltro,
    cpfCnpjFiltro,
    documentoFiltro,
    emailFiltro,
    listLimit,
    search,
    statusFiltro,
    telefoneFiltro,
    tipoFiltro,
    ufFiltro,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const limparFiltros = () => {
    setSearch("");
    setStatusFiltro("ativas");
    setTipoFiltro(ALL);
    setCidadeFiltro(ALL);
    setUfFiltro(ALL);
    setContatoFiltro("");
    setCpfCnpjFiltro("");
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

  const openExcluir = async (empresa: EmpresaSupabase) => {
    try {
      const totalEquipamentos = await empresasService.contarEquipamentos(
        empresa.id
      );
      setEmpresaExclusao(empresa);
      setEquipamentosEmpresaExclusao(totalEquipamentos);
      setExcluirEquipamentosVinculados(false);
    } catch (error) {
      toast({
        title: "Erro ao verificar equipamentos",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleExcluirEmpresa = async () => {
    if (!empresaExclusao) return;

    try {
      await excluirEmpresa.mutateAsync({
        id: empresaExclusao.id,
        input: {
          excluirEquipamentos: excluirEquipamentosVinculados,
        },
      });
      toast({ title: "Cliente excluído com sucesso." });
      setEmpresaExclusao(null);
      setEquipamentosEmpresaExclusao(0);
      setExcluirEquipamentosVinculados(false);
    } catch (error) {
      toast({
        title: "Não foi possível excluir o cliente",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
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
        {canManageEmpresas && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nova Empresa
          </Button>
        )}
      </PageHeader>

      <EmpresaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        empresa={selected}
      />

      <AlertDialog
        open={Boolean(empresaExclusao)}
        onOpenChange={(open) => {
          if (!open && !excluirEmpresa.isPending) {
            setEmpresaExclusao(null);
            setEquipamentosEmpresaExclusao(0);
            setExcluirEquipamentosVinculados(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente definitivamente?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {empresaExclusao?.nome || "Este cliente"} possui{" "}
                  <strong>{equipamentosEmpresaExclusao}</strong>{" "}
                  equipamento(s) cadastrado(s).
                </p>
                <p>
                  A exclusão será definitiva e será bloqueada caso existam OS,
                  certificados, protocolos, orçamentos ou outros registros
                  vinculados.
                </p>
                {equipamentosEmpresaExclusao > 0 && (
                  <label className="flex items-start gap-2 rounded-md border p-3 text-foreground">
                    <Checkbox
                      checked={excluirEquipamentosVinculados}
                      onCheckedChange={(value) =>
                        setExcluirEquipamentosVinculados(Boolean(value))
                      }
                      disabled={excluirEmpresa.isPending}
                    />
                    <span>
                      Excluir também os {equipamentosEmpresaExclusao}{" "}
                      equipamento(s) deste cliente.
                    </span>
                  </label>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluirEmpresa.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluirEmpresa.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleExcluirEmpresa();
              }}
            >
              {excluirEmpresa.isPending ? "Excluindo..." : "Excluir cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmpresaDetalhesDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        empresa={selected}
        onEditar={
          canManageEmpresas
            ? (empresa) => {
                setSelected(empresa);
                setMode("edit");
                setDialogOpen(true);
                setDetailsOpen(false);
              }
            : undefined
        }
        onCriarEquipamento={
          canManageEquipamentos ? openCreateEquipamento : undefined
        }
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
                value={tipoFiltro === ALL ? "" : tipoFiltro}
                onValueChange={(value) => setTipoFiltro(value || ALL)}
                options={opts.tipos}
                placeholder="Tipo (todos)"
                emptyText="Nenhum tipo encontrado."
              />

              <Input
                value={contatoFiltro}
                onChange={(event) => setContatoFiltro(event.target.value)}
                placeholder="Contato"
              />

              <Input
                value={cpfCnpjFiltro}
                onChange={(event) => setCpfCnpjFiltro(event.target.value)}
                placeholder="CPF/CNPJ"
              />

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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ListLimitSelect
              value={listLimit}
              onChange={setListLimit}
              total={filtered.length}
            />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
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
                    <SortableTableHeader
                      label="Nº"
                      sortField="numero_cadastro"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Nome"
                      sortField="nome"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Tipo"
                      sortField="tipo"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Cidade"
                      sortField="cidade"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Estado"
                      sortField="estado"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Telefone"
                      sortField="telefone"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="E-mail"
                      sortField="email"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="Contato"
                      sortField="contato"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    <SortableTableHeader
                      label="CPF/CNPJ"
                      sortField="cpf_cnpj"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleEmpresas.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {formatNumeroCadastro(e.numero_cadastro)}
                    </td>

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
                            {canManageEmpresas && (
                              <DropdownMenuItem onClick={() => openEdit(e)}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                            )}
                            {canManageEquipamentos && (
                              <DropdownMenuItem
                                onClick={() => openCreateEquipamento(e)}
                              >
                                <Wrench className="w-4 h-4 mr-2" /> Cadastrar Equipamento
                              </DropdownMenuItem>
                            )}
                            {canDeleteEmpresas && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => void openExcluir(e)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma empresa cadastrada no Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {sortedFiltered.length > 0 && (
              <div className="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Mostrando {firstVisibleIndex}-{lastVisibleIndex} de{" "}
                  {sortedFiltered.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Empresas;

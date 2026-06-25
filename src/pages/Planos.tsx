import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, Eye, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import PlanoFormDialog from "@/components/PlanoFormDialog";
import PlanosValidadesRelatorios from "@/components/PlanosValidadesRelatorios";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesativarPlano, usePlanos, usePlanoUsuarios } from "@/hooks/usePlanos";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { toast } from "@/hooks/use-toast";
import type { Plano } from "@/services/planosService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import { FREQUENCIAS_PLANO, getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";
import { sortByValue, type SortDirection } from "@/utils/sortUtils";
import { formatDateTimeValue, formatDateValue } from "@/utils/planoDatas";

const ALL = "__all__";
type SortKey = "progresso" | "titulo" | "cliente" | "responsavel" | "inicio" | "previsao" | "situacao" | "frequencia" | "equipamentos";

const cliente = (plano: Plano) => plano.empresa?.nome_fantasia || plano.empresa?.nome || "-";
const cicloAtual = (plano: Plano) => plano.ciclos?.find((item) => item.status === "aberto") || null;
const todayDateOnly = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};
const validadeRelatorioAtual = (plano: Plano) =>
  [...(plano.ciclos || [])]
    .map((ciclo) => ciclo.relatorio_validade_ate)
    .filter((validade): validade is string => Boolean(validade))
    .sort((a, b) => b.localeCompare(a))[0] || null;
const getProgresso = (plano: Plano) => {
  const itens = cicloAtual(plano)?.itens || [];
  if (!itens.length) return 0;

  const resolvidos = itens.filter((item) =>
    ["concluido", "cancelado", "nao_localizado"].includes(item.status)
  ).length;

  return Math.round((resolvidos / itens.length) * 100);
};
const sortValue = (plano: Plano, key: SortKey) => ({
  progresso: getProgresso(plano),
  titulo: plano.titulo,
  cliente: cliente(plano),
  responsavel: plano.responsavel?.nome || "",
  inicio: cicloAtual(plano)?.data_abertura || plano.data_inicial,
  previsao: cicloAtual(plano)?.data_fechamento_prevista || "",
  situacao: cicloAtual(plano)?.status || (plano.ativo ? "ativo" : "inativo"),
  frequencia: plano.frequencia,
  equipamentos: plano.equipamentos?.length || 0,
}[key]);

const Planos = () => {
  const navigate = useNavigate();
  const { data: planos = [], isLoading, isError, error } = usePlanos();
  const { data: usuarios = [] } = usePlanoUsuarios();
  const desativar = useDesativarPlano();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Plano | null>(null);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState(ALL);
  const [responsavel, setResponsavel] = useState(ALL);
  const [frequencia, setFrequencia] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("inicio");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);

  const empresas = useMemo(() => Array.from(new Map(planos.map((plano) => [plano.empresa_id, cliente(plano)])).entries()), [planos]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortByValue(planos.filter((plano) => {
      const inicio = cicloAtual(plano)?.data_abertura || plano.data_inicial;
      return (!q || `${plano.titulo} ${cliente(plano)} ${plano.responsavel?.nome || ""}`.toLowerCase().includes(q))
        && (empresa === ALL || plano.empresa_id === empresa)
        && (responsavel === ALL || plano.responsavel_id === responsavel)
        && (frequencia === ALL || plano.frequencia === frequencia)
        && (status === ALL || (status === "ativo" ? plano.ativo : !plano.ativo))
        && (!dataDe || inicio >= dataDe)
        && (!dataAte || inicio <= dataAte);
    }), (plano) => sortValue(plano, sortKey), direction);
  }, [dataAte, dataDe, direction, empresa, frequencia, planos, responsavel, search, sortKey, status]);

  const {
    paginatedItems: visiblePlanos,
    ...planosPagination
  } = usePaginatedList(filtered, listLimit);

  const sort = (key: SortKey) => {
    if (sortKey === key) setDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  const handleDesativar = async (plano: Plano) => {
    if (!window.confirm(`Desativar o plano "${plano.titulo}"?`)) return;
    try {
      await desativar.mutateAsync(plano.id);
      toast({ title: "Plano desativado." });
    } catch (err) {
      toast({
        title: "Erro ao desativar plano",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirEmpresa = async (plano: Plano) => {
    if (!plano.empresa_id) return;

    try {
      const empresaCompleta = await empresasService.buscarPorId(plano.empresa_id);
      setEmpresaSelecionada(empresaCompleta);
      setEmpresaDetalhesOpen(true);
    } catch (err) {
      toast({
        title: "Erro ao abrir cliente",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Planos" description="Gerencie planos periodicos por cliente, setor e equipamento.">
        <Button onClick={() => { setSelected(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </PageHeader>

      <PlanoFormDialog open={formOpen} onOpenChange={setFormOpen} plano={selected} onSaved={(plano, created) => created && navigate(`/planos/${plano.id}`)} />
      <EmpresaDetalhesDialog
        open={empresaDetalhesOpen}
        onOpenChange={(open) => {
          setEmpresaDetalhesOpen(open);
          if (!open) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
      />

      <Tabs defaultValue="planos">
        <TabsList className="mb-4">
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="validades">Validades dos relatorios</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="mt-0">
      <div className="mb-4 rounded-lg border bg-card">
        <button className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium" onClick={() => setFiltersOpen(!filtersOpen)}>
          <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filtros avancados</span>
          <ChevronDown className={`h-4 w-4 ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen && (
          <div className="grid gap-3 border-t p-4 md:grid-cols-3 xl:grid-cols-6">
            <Filtro value={empresa} onChange={setEmpresa} all="Todos os clientes" options={empresas} />
            <Filtro value={responsavel} onChange={setResponsavel} all="Todos responsaveis" options={usuarios.map((usuario) => [usuario.id, usuario.nome])} />
            <Filtro value={frequencia} onChange={setFrequencia} all="Todas frequencias" options={FREQUENCIAS_PLANO.map((item) => [item.value, item.label])} />
            <Filtro value={status} onChange={setStatus} all="Todos status" options={[["ativo", "Ativos"], ["inativo", "Inativos"]]} />
            <Input type="date" value={dataDe} onChange={(event) => setDataDe(event.target.value)} />
            <Input type="date" value={dataAte} onChange={(event) => setDataAte(event.target.value)} />
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input className="max-w-md" placeholder="Buscar titulo, cliente ou responsavel" value={search} onChange={(event) => setSearch(event.target.value)} />
        <ListLimitSelect value={listLimit} onChange={setListLimit} total={filtered.length} />
      </div>

      {isError && <p className="text-destructive">{error instanceof Error ? error.message : "Erro ao carregar planos."}</p>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              {([
                ["Progresso", "progresso"],
                ["Titulo", "titulo"],
                ["Cliente", "cliente"],
                ["Responsavel", "responsavel"],
                ["Inicio do ciclo atual", "inicio"],
                ["Previsao de conclusao", "previsao"],
                ["Situacao", "situacao"],
                ["Frequencia", "frequencia"],
                ["Qtd. equipamentos", "equipamentos"],
              ] as Array<[string, SortKey | null]>).map(([label, key]) => (
                <Th key={label}>
                  {key ? <button className="flex items-center gap-1" onClick={() => sort(key)}>{label}<ArrowUpDown className="h-3 w-3" /></button> : label}
                </Th>
              ))}
              <Th />
            </tr>
          </thead>
          <tbody>
            {visiblePlanos.map((plano) => {
              const ciclo = cicloAtual(plano);
              const percentual = getProgresso(plano);
              const validade = validadeRelatorioAtual(plano);
              const vencido = Boolean(validade && validade < todayDateOnly());
              return (
                <tr key={plano.id} className="border-t">
                  <Td>
                    <PlanoProgressoCell
                      cicloAberto={Boolean(ciclo)}
                      percentual={percentual}
                      validade={validade}
                      vencido={vencido}
                    />
                  </Td>
                  <Td><button className="font-medium text-primary hover:underline" onClick={() => navigate(`/planos/${plano.id}`)}>{plano.titulo}</button></Td>
                  <Td>
                    {plano.empresa_id ? (
                      <button
                        className="text-left text-primary hover:underline"
                        onClick={() => abrirEmpresa(plano)}
                      >
                        {cliente(plano)}
                      </button>
                    ) : (
                      cliente(plano)
                    )}
                  </Td>
                  <Td>{plano.responsavel?.nome || "-"}</Td>
                  <Td>{ciclo ? formatDateTimeValue(ciclo.data_abertura) : formatDateValue(plano.data_inicial)}</Td>
                  <Td>{formatDateTimeValue(ciclo?.data_fechamento_prevista)}</Td>
                  <Td><Badge variant="outline">{ciclo?.status || (plano.ativo ? "Ativo" : "Inativo")}</Badge></Td>
                  <Td>{getPlanoFrequenciaLabel(plano.frequencia)}</Td>
                  <Td>{plano.equipamentos?.length || 0}</Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/planos/${plano.id}`)}><Eye className="mr-2 h-4 w-4" />Abrir plano</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(plano); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDesativar(plano)}><Trash2 className="mr-2 h-4 w-4" />Desativar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              );
            })}
            {!isLoading && !filtered.length && <tr><Td>Nenhum plano encontrado.</Td></tr>}
            {isLoading && <tr><Td>Carregando planos...</Td></tr>}
          </tbody>
        </table>
        <ListPagination
          {...planosPagination}
          onPageChange={planosPagination.setPage}
        />
      </div>
        </TabsContent>

        <TabsContent value="validades" className="mt-0">
          <PlanosValidadesRelatorios />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Filtro = ({ value, onChange, all, options }: { value: string; onChange: (value: string) => void; all: string; options: Array<readonly [string, string]> }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>{all}</SelectItem>
      {options.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
    </SelectContent>
  </Select>
);

const PlanoProgressoCell = ({
  cicloAberto,
  percentual,
  validade,
  vencido,
}: {
  cicloAberto: boolean;
  percentual: number;
  validade: string | null;
  vencido: boolean;
}) => {
  if (cicloAberto) {
    return (
      <div className="flex min-w-28 items-center gap-2">
        <Progress value={percentual} className="h-2 w-16" />
        <span className="text-xs font-medium tabular-nums">{percentual}%</span>
      </div>
    );
  }

  if (vencido) {
    return (
      <div className="flex min-w-44 flex-col gap-1">
        <Badge variant="destructive" className="w-fit">
          Renovar com cliente
        </Badge>
        <span className="text-xs text-muted-foreground">
          Venceu em {formatDateValue(validade)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-40 flex-col gap-1">
      <Badge variant="secondary" className="w-fit">
        Sem ciclo aberto
      </Badge>
      {validade && (
        <span className="text-xs text-muted-foreground">
          Valido ate {formatDateValue(validade)}
        </span>
      )}
    </div>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default Planos;

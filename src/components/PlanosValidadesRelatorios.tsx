import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Search, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ListLimitSelect, { DEFAULT_LIST_LIMIT } from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useValidadesRelatoriosPlanos } from "@/hooks/usePlanos";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import type { PlanoValidadeRelatorio } from "@/services/planosService";

const TODOS = "todos";

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const dateOnly = (value: string) => new Date(`${value}T12:00:00`);

const diasAte = (value: string) => {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.ceil((dateOnly(value).getTime() - hoje.getTime()) / 86_400_000);
};

const getCliente = (relatorio: PlanoValidadeRelatorio) =>
  relatorio.plano?.empresa?.nome || relatorio.plano?.empresa?.nome_fantasia ||
  "Cliente nao informado";

const getSituacao = (dias: number) => {
  if (dias < 0) return "vencido";
  if (dias <= 30) return "ate30";
  if (dias <= 60) return "ate60";
  return "emdia";
};

const SituacaoBadge = ({ dias }: { dias: number }) => {
  if (dias < 0) return <Badge variant="destructive">Vencido ha {Math.abs(dias)} dia(s)</Badge>;
  if (dias === 0) return <Badge variant="destructive">Vence hoje</Badge>;
  if (dias <= 30) return <Badge className="bg-warning text-warning-foreground">Vence em {dias} dia(s)</Badge>;
  if (dias <= 60) return <Badge variant="outline">Vence em {dias} dia(s)</Badge>;
  return <Badge className="bg-success/10 text-success">Em dia</Badge>;
};

const PlanosValidadesRelatorios = () => {
  const navigate = useNavigate();
  const { data: relatorios = [], isLoading, isError, error } = useValidadesRelatoriosPlanos();
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState(TODOS);
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);

  const relatoriosAtuais = useMemo(() => {
    const porPlano = new Map<string, PlanoValidadeRelatorio>();

    relatorios.forEach((relatorio) => {
      const atual = porPlano.get(relatorio.plano_id);
      if (
        !atual ||
        relatorio.emitido_em > atual.emitido_em ||
        (relatorio.emitido_em === atual.emitido_em && relatorio.created_at > atual.created_at)
      ) {
        porPlano.set(relatorio.plano_id, relatorio);
      }
    });

    return Array.from(porPlano.values()).sort(
      (a, b) => dateOnly(a.validade_ate).getTime() - dateOnly(b.validade_ate).getTime()
    );
  }, [relatorios]);

  const contadores = useMemo(() => {
    const dias = relatoriosAtuais.map((item) => diasAte(item.validade_ate));
    return {
      vencidos: dias.filter((item) => item < 0).length,
      ate30: dias.filter((item) => item >= 0 && item <= 30).length,
      ate60: dias.filter((item) => item > 30 && item <= 60).length,
      emDia: dias.filter((item) => item > 60).length,
    };
  }, [relatoriosAtuais]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return relatoriosAtuais.filter((relatorio) => {
      const dias = diasAte(relatorio.validade_ate);
      const correspondeSituacao = situacao === TODOS || getSituacao(dias) === situacao;
      const correspondeBusca = !q || `${relatorio.plano?.titulo || ""} ${getCliente(relatorio)}`.toLowerCase().includes(q);
      return correspondeSituacao && correspondeBusca;
    });
  }, [relatoriosAtuais, search, situacao]);

  const {
    paginatedItems: visiveis,
    ...relatoriosPagination
  } = usePaginatedList(filtrados, listLimit);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo icon={AlertTriangle} label="Vencidos" value={contadores.vencidos} tone="destructive" />
        <Resumo icon={CalendarClock} label="Vencem em ate 30 dias" value={contadores.ate30} tone="warning" />
        <Resumo icon={CalendarClock} label="Vencem entre 31 e 60 dias" value={contadores.ate60} />
        <Resumo icon={CheckCircle2} label="Validade acima de 60 dias" value={contadores.emDia} tone="success" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar plano ou cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={situacao} onValueChange={setSituacao}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as situacoes</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="ate30">Ate 30 dias</SelectItem>
              <SelectItem value="ate60">De 31 a 60 dias</SelectItem>
              <SelectItem value="emdia">Em dia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ListLimitSelect value={listLimit} onChange={setListLimit} total={filtrados.length} />
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar validades dos relatorios."}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <Th>Plano</Th>
              <Th>Cliente</Th>
              <Th>Emissao</Th>
              <Th>Validade</Th>
              <Th>Relatorio vigente</Th>
              <Th>Situacao</Th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((relatorio) => {
              const dias = diasAte(relatorio.validade_ate);
              return (
                <tr key={relatorio.id} className="border-t">
                  <Td>
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => navigate(`/planos/${relatorio.plano_id}`)}
                    >
                      {relatorio.plano?.titulo || "Plano nao encontrado"}
                    </button>
                  </Td>
                  <Td>{getCliente(relatorio)}</Td>
                  <Td>{formatDate(relatorio.emitido_em)}</Td>
                  <Td>{formatDate(relatorio.validade_ate)}</Td>
                  <Td>
                    {relatorio.referencia}
                    {relatorio.revisao ? ` - Revisao ${relatorio.revisao}` : ""}
                  </Td>
                  <Td><SituacaoBadge dias={dias} /></Td>
                </tr>
              );
            })}
            {isLoading && <tr><Td>Carregando validades...</Td></tr>}
            {!isLoading && !filtrados.length && (
              <tr><Td>Nenhum relatorio de plano encontrado para os filtros informados.</Td></tr>
            )}
          </tbody>
        </table>
        <ListPagination
          {...relatoriosPagination}
          onPageChange={relatoriosPagination.setPage}
        />
      </div>
    </div>
  );
};

const Resumo = ({
  icon: Icon,
  label,
  tone = "default",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "default" | "destructive" | "success" | "warning";
  value: number;
}) => {
  const toneClass = {
    default: "text-primary bg-primary/10",
    destructive: "text-destructive bg-destructive/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>
);

const Td = ({ children }: { children?: React.ReactNode }) => (
  <td className="whitespace-nowrap px-3 py-3">{children}</td>
);

export default PlanosValidadesRelatorios;

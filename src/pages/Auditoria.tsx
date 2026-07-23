import {
  AlertCircle,
  Clock,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ListLimitSelect, { DEFAULT_LIST_LIMIT } from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditoriaLogs } from "@/hooks/useAuditoria";
import {
  auditoriaService,
  type AuditoriaAcao,
  type AuditoriaLog,
} from "@/services/auditoriaService";

const ALL = "todos";

const MODULOS = [
  "Empresas",
  "Equipamentos",
  "Ordem de Servico",
  "Orcamentos",
  "Calibracao",
  "Seguranca Eletrica",
  "Planos",
  "Contratos",
  "Protocolos",
  "Laudos de Obsolescencia",
  "Procedimentos Preventivos",
  "Utilitarios",
];

const moduloLabels: Record<string, string> = {
  "Ordem de Servico": "Ordem de Serviço",
  Orcamentos: "Orçamentos",
  Calibracao: "Calibração",
  "Seguranca Eletrica": "Segurança Elétrica",
  "Laudos de Obsolescencia": "Laudos de Obsolescência",
  Utilitarios: "Utilitários",
};

const acaoLabel: Record<AuditoriaAcao, string> = {
  criou: "Criou",
  alterou: "Alterou",
  excluiu: "Excluiu",
};

const acaoBadgeClass: Record<AuditoriaAcao, string> = {
  criou: "border-green-200 bg-green-50 text-green-700",
  alterou: "border-blue-200 bg-blue-50 text-blue-700",
  excluiu: "border-red-200 bg-red-50 text-red-700",
};

const campoLabels: Record<string, string> = {
  aprovado_em: "Data de aprovação",
  aprovado_por: "Aprovado por",
  ativo: "Ativo",
  bairro: "Bairro",
  cancelado_em: "Data de cancelamento",
  cidade: "Cidade",
  complemento: "Complemento",
  contato: "Contato",
  cpf_cnpj: "CPF/CNPJ",
  data_aprovacao: "Data de aprovação",
  status: "Status",
  status_sistema: "Status do sistema",
  estado_da_os: "Estado da OS",
  estado_os_id: "Estado da OS",
  empresa_id: "Cliente",
  equipamento_id: "Equipamento",
  fabricante: "Fabricante",
  modelo: "Modelo",
  nome: "Nome",
  nome_fantasia: "Nome fantasia",
  numero: "Número",
  numero_serie: "Número de série",
  origem_problema: "Origem do problema",
  patrimonio: "Patrimônio",
  prioridade: "Prioridade",
  problema_relatado: "Problema relatado",
  razao_social: "Razão social",
  responsavel_texto: "Técnico executor",
  solicitante_texto: "Solicitante",
  tecnico_responsavel_id: "Técnico executor",
  tipo_os_id: "Tipo de serviço",
  titulo: "Título",
  observacoes: "Observações",
  descricao: "Descrição",
  descricao_servico: "Descrição do serviço",
  valor_entrada: "Valor de entrada",
  valor_frete: "Valor do frete",
  valor_pecas: "Valor das peças",
  valor_servicos: "Valor dos serviços",
  valor_total: "Valor total",
  valor_total_antes_desconto: "Valor antes do desconto",
  data_abertura: "Data de abertura",
  data_criacao: "Data de criação",
  data_fechamento: "Data de fechamento",
  data_validade: "Data de validade",
  data_inicio: "Data de início",
  data_fim: "Data final",
  updated_by: "Atualizado por",
};

const campoGrupos: Record<string, string> = {
  estado_da_os: "estado_os",
  estado_os_id: "estado_os",
  responsavel_texto: "tecnico_executor",
  tecnico_responsavel_id: "tecnico_executor",
  empresa_id: "cliente",
  solicitante_texto: "cliente",
};

const campoPrioridade: Record<string, number> = {
  estado_da_os: 10,
  responsavel_texto: 10,
  solicitante_texto: 10,
};

const camposTecnicos = new Set([
  "id",
  "organizacao_id",
  "created_at",
  "updated_at",
  "updated_by",
  "arkmeds_orcamento_id",
  "arkmeds_ordem_servico_numero",
  "arkmeds_status_original",
  "origem",
  "raw_json",
]);

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatUsuario = (log: AuditoriaLog) =>
  log.usuario_nome_snapshot ||
  log.usuario_email_snapshot ||
  (log.usuario_id ? "Usuário sem nome" : "Sistema");

const isMigrationMissingError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /auditoria_logs|listar_auditoria_logs_resumo/i.test(message) &&
    /does not exist|not found|schema cache|could not find/i.test(message);
};

const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\bos\b/gi, "OS")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatCampo = (campo: string) =>
  campoLabels[campo] || titleCase(campo);

const formatModulo = (modulo: string) => moduloLabels[modulo] || modulo;

const formatValue = (value: unknown, campo?: string) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);

  const text = String(value);

  if (campo?.startsWith("data_") || campo?.endsWith("_em")) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: text.includes("T") ? "short" : undefined,
      });
    }
  }

  if (campo?.startsWith("valor_") && !Number.isNaN(Number(value))) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(text)) {
    return `Referência interna (${text.slice(0, 8)}...)`;
  }

  if (campo?.includes("status") || campo === "prioridade") {
    return titleCase(text);
  }

  return text;
};

const compactValue = (value: unknown, campo?: string) => {
  const text = formatValue(value, campo);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
};

const getCamposRepresentativos = (campos: string[]) => {
  const agrupados = new Map<string, string>();

  campos
    .filter((campo) => !camposTecnicos.has(campo))
    .forEach((campo) => {
      const grupo = campoGrupos[campo] || campo;
      const atual = agrupados.get(grupo);
      if (
        !atual ||
        (campoPrioridade[campo] || 0) > (campoPrioridade[atual] || 0)
      ) {
        agrupados.set(grupo, campo);
      }
    });

  return Array.from(agrupados.values());
};

const getCamposResumo = (log: AuditoriaLog) => {
  if (log.acao === "criou") return ["Novo registro"];
  if (log.acao === "excluiu") return ["Registro excluído"];

  const campos = getCamposRepresentativos(log.campos_alterados || []);
  return campos.length ? campos.map(formatCampo) : ["Dados do registro"];
};

const getChangedRows = (log: AuditoriaLog) =>
  getCamposRepresentativos(log.campos_alterados || []).map((campo) => ({
    campo,
    anterior: log.dados_anteriores?.[campo],
    novo: log.dados_novos?.[campo],
  }));

const Auditoria = () => {
  const [search, setSearch] = useState("");
  const [modulo, setModulo] = useState(ALL);
  const [acao, setAcao] = useState<AuditoriaAcao | "todas">("todas");
  const [limit, setLimit] = useState(DEFAULT_LIST_LIMIT);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditoriaLog | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const filtro = useMemo(
    () => ({
      search,
      modulo,
      acao,
      limit,
      page,
    }),
    [acao, limit, modulo, page, search]
  );

  const {
    data: auditoriaResult = { items: [], total: 0 },
    error,
    isError,
    isLoading,
    isFetching,
    refetch,
  } =
    useAuditoriaLogs(filtro);
  const logs = auditoriaResult.items;
  const totalPages = Math.max(1, Math.ceil(auditoriaResult.total / limit));
  const firstVisibleIndex = auditoriaResult.total ? (page - 1) * limit + 1 : 0;
  const lastVisibleIndex = Math.min(page * limit, auditoriaResult.total);

  const selectedChangedRows = selected ? getChangedRows(selected) : [];

  useEffect(() => {
    setPage(1);
  }, [acao, limit, modulo, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openDetails = async (log: AuditoriaLog) => {
    setSelected(log);
    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const details = await auditoriaService.buscarPorId(log.id);
      setSelected(details);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Auditoria"
        description="Histórico rastreável de criações, alterações e exclusões do sistema."
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">Eventos registrados</h2>
            <p className="text-sm text-muted-foreground">
              Mostrando os eventos mais recentes conforme os filtros aplicados.
            </p>
          </div>
          <ListLimitSelect value={limit} onChange={setLimit} />
        </div>

        <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuário, registro, tabela ou campo"
            />
          </div>

          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Modulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os módulos</SelectItem>
              {MODULOS.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatModulo(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={acao}
            onValueChange={(value) => setAcao(value as AuditoriaAcao | "todas")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Acao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as ações</SelectItem>
              <SelectItem value="criou">Criou</SelectItem>
              <SelectItem value="alterou">Alterou</SelectItem>
              <SelectItem value="excluiu">Excluiu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Horário</TableHead>
              <TableHead className="w-[130px]">Ação</TableHead>
              <TableHead className="w-[190px]">Módulo</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-[220px]">Usuário</TableHead>
              <TableHead className="w-[280px]">Alterações</TableHead>
              <TableHead className="w-[90px] text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Carregando auditoria...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      {isMigrationMissingError(error)
                        ? "Auditoria ainda nao esta ativa no banco"
                        : "Erro ao carregar auditoria"}
                    </div>
                    <p className="text-sm">
                      {isMigrationMissingError(error) ? (
                        <>
                          Execute as migrations{" "}
                          <span className="font-mono">
                            060_auditoria_logs.sql
                          </span>{" "}
                          e{" "}
                          <span className="font-mono">
                            089_auditoria_rpc_listagem.sql
                          </span>{" "}
                          no Supabase. Erro retornado:{" "}
                        </>
                      ) : (
                        "Erro retornado: "
                      )}
                      {error instanceof Error ? error.message : String(error)}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(log.criado_em)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={acaoBadgeClass[log.acao]}
                    >
                      {acaoLabel[log.acao]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatModulo(log.modulo)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCampo(log.tabela)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {log.registro_descricao || log.registro_id || "-"}
                    </div>
                    {log.registro_id && (
                      <div className="text-xs text-muted-foreground">
                        ID: {log.registro_id}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{formatUsuario(log)}</div>
                    {log.usuario_perfil_snapshot && (
                      <div className="text-xs text-muted-foreground">
                        {log.usuario_perfil_snapshot}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {getCamposResumo(log)
                        .slice(0, 3)
                        .map((campo) => (
                          <Badge
                            key={campo}
                            variant="secondary"
                            className="whitespace-normal text-left font-normal"
                          >
                            {campo}
                          </Badge>
                        ))}
                      {getCamposResumo(log).length > 3 && (
                        <Badge variant="outline" className="font-normal">
                          +{getCamposResumo(log).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDetails(log)}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={auditoriaResult.total}
          firstVisibleIndex={firstVisibleIndex}
          lastVisibleIndex={lastVisibleIndex}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalhes da auditoria</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {detailsLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando dados completos do evento...
                </div>
              )}
              {detailsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {detailsError}
                </div>
              )}
              <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                <Info label="Horário" value={formatDateTime(selected.criado_em)} />
                <Info label="Usuário" value={formatUsuario(selected)} />
                <Info
                  label="Perfil"
                  value={selected.usuario_perfil_snapshot || "-"}
                />
                <Info label="Ação" value={acaoLabel[selected.acao]} />
                <Info label="Módulo" value={formatModulo(selected.modulo)} />
                <Info label="Tabela" value={formatCampo(selected.tabela)} />
                <Info
                  label="Registro"
                  value={selected.registro_descricao || selected.registro_id || "-"}
                />
                <Info label="ID do registro" value={selected.registro_id || "-"} />
              </section>

              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
                <div className="text-xs font-semibold uppercase text-blue-700">
                  Resumo do evento
                </div>
                <p className="mt-1 text-sm">
                  {selected.acao === "alterou"
                    ? `Alterou: ${getCamposResumo(selected).join(", ")}.`
                    : selected.acao === "criou"
                      ? "Criou um novo registro."
                      : "Excluiu o registro."}
                </p>
              </section>

              {selected.acao === "alterou" && (
                <section className="rounded-lg border">
                  <div className="border-b p-3">
                    <h3 className="text-sm font-semibold">Campos alterados</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead>Antes</TableHead>
                        <TableHead>Depois</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedChangedRows.map((row) => (
                        <TableRow key={row.campo}>
                          <TableCell className="font-medium">
                            {formatCampo(row.campo)}
                          </TableCell>
                          <TableCell className="max-w-[320px] break-words">
                            {compactValue(row.anterior, row.campo)}
                          </TableCell>
                          <TableCell className="max-w-[320px] break-words">
                            {compactValue(row.novo, row.campo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              <details className="rounded-lg border">
                <summary className="cursor-pointer p-3 text-sm font-semibold">
                  Dados técnicos do evento
                </summary>
                <section className="grid gap-4 border-t p-3 md:grid-cols-2">
                  <JsonBlock
                    title="Dados anteriores"
                    value={selected.dados_anteriores}
                  />
                  <JsonBlock title="Dados novos" value={selected.dados_novos} />
                </section>
              </details>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs font-medium uppercase text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 break-words text-sm font-medium">{value}</div>
  </div>
);

const JsonBlock = ({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}) => (
  <div className="rounded-lg border">
    <div className="border-b p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-3 text-xs">
      {value ? JSON.stringify(value, null, 2) : "-"}
    </pre>
  </div>
);

export default Auditoria;

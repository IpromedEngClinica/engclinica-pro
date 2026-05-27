import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  PackageSearch,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ProtocoloDetalhesDialog from "@/components/ProtocoloDetalhesDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useProtocolos } from "@/hooks/useProtocolos";
import {
  ProtocoloOSSupabase,
  TipoProtocoloOS,
} from "@/services/protocolosService";
import { gerarPdfProtocolo } from "@/utils/gerarPdfProtocolo";

const getEmpresaNome = (p: ProtocoloOSSupabase) =>
  p.empresa?.nome_fantasia || p.empresa?.nome || "Não informado";

const getEquipamentoLabel = (p: ProtocoloOSSupabase) => {
  if (!p.equipamento) return "-";

  const tipo =
    p.equipamento.tipo_equipamento?.nome ||
    p.equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    p.equipamento.fabricante,
    p.equipamento.modelo,
    p.equipamento.tag ||
      p.equipamento.patrimonio ||
      p.equipamento.numero_serie,
  ]
    .filter(Boolean)
    .join(" - ");
};

const formatTipo = (tipo: string) => {
  const map: Record<string, string> = {
    recolhimento: "Recolhimento",
    entrega: "Entrega",
  };

  return map[tipo] || tipo;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getDataPrincipal = (p: ProtocoloOSSupabase) => {
  if (p.tipo === "recolhimento") return p.data_recolhimento || p.data_protocolo;
  if (p.tipo === "entrega") return p.data_entrega || p.data_protocolo;
  return p.data_protocolo;
};

const tipoBadgeClass = (tipo: TipoProtocoloOS) =>
  tipo === "entrega"
    ? "bg-success/10 text-success"
    : "bg-primary/10 text-primary";

const statusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("cancel")) {
    return "bg-destructive/10 text-destructive";
  }

  return "bg-muted text-muted-foreground";
};

const Protocolos = () => {
  const [tipoFiltro, setTipoFiltro] = useState<TipoProtocoloOS | "todos">(
    "todos"
  );
  const [search, setSearch] = useState("");
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [protocoloDetalhes, setProtocoloDetalhes] =
    useState<ProtocoloOSSupabase | null>(null);

  const { data: protocolos = [], isLoading, isError, error, refetch } =
    useProtocolos(tipoFiltro === "todos" ? undefined : tipoFiltro);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return protocolos.filter((p) => {
      const empresa = getEmpresaNome(p).toLowerCase();
      const equipamento = getEquipamentoLabel(p).toLowerCase();
      const osNumero = p.ordem_servico?.numero || "";
      const responsavel = p.responsavel_nome || "";

      return (
        !q ||
        p.numero.toLowerCase().includes(q) ||
        empresa.includes(q) ||
        equipamento.includes(q) ||
        osNumero.toLowerCase().includes(q) ||
        responsavel.toLowerCase().includes(q)
      );
    });
  }, [protocolos, search]);

  const openDetalhes = (protocolo: ProtocoloOSSupabase) => {
    setProtocoloDetalhes(protocolo);
    setDetalhesOpen(true);
  };

  const TipoIcon = ({ tipo }: { tipo: TipoProtocoloOS }) =>
    tipo === "entrega" ? (
      <PackageCheck className="w-4 h-4" />
    ) : (
      <PackageSearch className="w-4 h-4" />
    );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Protocolos"
        description="Consulte os protocolos de recolhimento e entrega salvos no Supabase"
      />

      <ProtocoloDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(value) => {
          setDetalhesOpen(value);
          if (!value) setProtocoloDetalhes(null);
        }}
        protocolo={protocoloDetalhes}
      />

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tipoFiltro === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("todos")}
            >
              Todos
            </Button>
            <Button
              variant={tipoFiltro === "recolhimento" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("recolhimento")}
            >
              <PackageSearch className="w-4 h-4 mr-2" />
              Recolhimento
            </Button>
            <Button
              variant={tipoFiltro === "entrega" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro("entrega")}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Entrega
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolo, empresa, OS..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando protocolos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar protocolos
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
                    Número
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Empresa
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Equipamento
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    OS vinculada
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Responsável
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((protocolo) => (
                  <tr
                    key={protocolo.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => openDetalhes(protocolo)}
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <TipoIcon tipo={protocolo.tipo} />
                        {protocolo.numero}
                      </button>
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${tipoBadgeClass(
                          protocolo.tipo
                        )}`}
                      >
                        {formatTipo(protocolo.tipo)}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {getEmpresaNome(protocolo)}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {getEquipamentoLabel(protocolo)}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.ordem_servico?.numero || "-"}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(getDataPrincipal(protocolo))}
                    </td>

                    <td className="px-5 py-3 text-muted-foreground">
                      {protocolo.responsavel_nome || "-"}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                          protocolo.status
                        )}`}
                      >
                        {protocolo.status || "-"}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Ações">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-popover"
                          >
                            <DropdownMenuItem
                              onClick={() => openDetalhes(protocolo)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                await gerarPdfProtocolo(protocolo);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Gerar PDF
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
                      Nenhum protocolo encontrado.
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

export default Protocolos;

import {
  AlertCircle,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import CalibracaoPadraoDetalhesDialog from "@/components/CalibracaoPadraoDetalhesDialog";
import CalibracaoPadraoDocumentosDialog from "@/components/CalibracaoPadraoDocumentosDialog";
import CalibracaoPadraoFormDialog from "@/components/CalibracaoPadraoFormDialog";
import CalibracaoProcedimentosSection from "@/components/CalibracaoProcedimentosSection";
import CalibracaoExecucoesSection from "@/components/CalibracaoExecucoesSection";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useCalibracaoPadroes,
  useDesativarCalibracaoPadrao,
} from "@/hooks/useCalibracaoPadroes";
import { toast } from "@/hooks/use-toast";
import {
  CalibracaoPadrao,
  CalibracaoPadraoStatusValidade,
  calibracaoPadroesService,
  getStatusValidadePadrao,
} from "@/services/calibracaoPadroesService";
import { formatarDataPadrao } from "@/utils/calibracaoValidade";

const statusLabels: Record<CalibracaoPadraoStatusValidade, string> = {
  vencido: "Vencido",
  ate_30_dias: "Vence em ate 30 dias",
  ate_60_dias: "Vence em ate 60 dias",
  valido: "Valido",
};

const statusClasses: Record<CalibracaoPadraoStatusValidade, string> = {
  vencido: "bg-red-50 text-red-700 border-red-200",
  ate_30_dias: "bg-orange-50 text-orange-700 border-orange-200",
  ate_60_dias: "bg-yellow-50 text-yellow-700 border-yellow-200",
  valido: "bg-green-50 text-green-700 border-green-200",
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

type CalibracaoSection = "execucoes" | "padroes" | "procedimentos" | "configuracoes";

const Calibracao = ({ section }: { section: CalibracaoSection }) => {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [documentosOpen, setDocumentosOpen] = useState(false);
  const [selected, setSelected] = useState<CalibracaoPadrao | null>(null);
  const [renovacaoOpen, setRenovacaoOpen] = useState(false);
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const { data: padroes = [], isLoading, isError, error, refetch } =
    useCalibracaoPadroes();
  const desativarPadrao = useDesativarCalibracaoPadrao();

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return padroes;
    return padroes.filter((padrao) =>
      [
        padrao.numero_certificado,
        padrao.nome_padrao,
        padrao.fabricante,
        padrao.modelo,
        padrao.numero_serie,
        padrao.laboratorio_calibrador,
      ].some((value) => value?.toLowerCase().includes(termo))
    );
  }, [padroes, search]);

  const counters = useMemo(
    () =>
      padroes.reduce(
        (acc, padrao) => {
          acc[getStatusValidadePadrao(padrao.data_validade)]++;
          return acc;
        },
        { vencido: 0, ate_30_dias: 0, ate_60_dias: 0, valido: 0 }
      ),
    [padroes]
  );

  const visiblePadroes = useMemo(
    () => filtered.slice(0, listLimit),
    [filtered, listLimit]
  );

  const openCreate = () => {
    setSelected(null);
    setFormOpen(true);
  };

  const openEdit = (padrao: CalibracaoPadrao) => {
    setSelected(padrao);
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const openRenovacao = (padrao: CalibracaoPadrao) => {
    setSelected(padrao);
    setDetailsOpen(false);
    setRenovacaoOpen(true);
  };

  const openDetails = (padrao: CalibracaoPadrao) => {
    setSelected(padrao);
    setDetailsOpen(true);
  };

  const openDocumentos = (padrao: CalibracaoPadrao) => {
    setSelected(padrao);
    setDocumentosOpen(true);
  };

  const handleDesativar = async (padrao: CalibracaoPadrao) => {
    if (!window.confirm(`Desativar o padrao "${padrao.nome_padrao}"?`)) return;

    try {
      await desativarPadrao.mutateAsync(padrao.id);
      setDetailsOpen(false);
      toast({ title: "Padrao de calibracao desativado." });
    } catch (error) {
      toast({
        title: "Erro ao desativar padrao",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const baixarCertificado = async (padrao: CalibracaoPadrao) => {
    const certificado = (padrao.documentos || []).find(
      (documento) => documento.tipo_documento === "Certificado"
    );
    if (!certificado) {
      toast({ title: "Nenhum certificado anexado a este padrao." });
      return;
    }

    try {
      const url = await calibracaoPadroesService.baixarDocumento(certificado);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao baixar certificado",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Calibração"
        description="Cadastre padrões internos, certificados e tabelas metrológicas."
      >
        {section === "padroes" && (
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Padrão
        </Button>
        )}
      </PageHeader>

      <CalibracaoPadraoFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setSelected(null);
        }}
        padrao={selected}
      />

      <CalibracaoPadraoFormDialog
        open={renovacaoOpen}
        onOpenChange={(value) => {
          setRenovacaoOpen(value);
          if (!value) setSelected(null);
        }}
        padrao={selected}
        renovacao
      />

      <CalibracaoPadraoDetalhesDialog
        open={detailsOpen}
        onOpenChange={(value) => {
          setDetailsOpen(value);
          if (!value) setSelected(null);
        }}
        padrao={selected}
        onEditar={openEdit}
        onRenovar={openRenovacao}
        onDocumentos={openDocumentos}
        onDesativar={handleDesativar}
      />

      <CalibracaoPadraoDocumentosDialog
        open={documentosOpen}
        onOpenChange={(value) => {
          setDocumentosOpen(value);
          if (!value) setSelected(null);
        }}
        padrao={selected}
      />

      {section === "padroes" && <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Counter label="Vencidos" value={counters.vencido} className="text-red-700" />
            <Counter label="Até 30 dias" value={counters.ate_30_dias} className="text-orange-700" />
            <Counter label="Até 60 dias" value={counters.ate_60_dias} className="text-yellow-700" />
            <Counter label="Válidos" value={counters.valido} className="text-green-700" />
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar padrão..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
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
              <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando padrões...
              </div>
            )}

            {isError && (
              <div className="px-5 py-8">
                <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <AlertCircle className="mt-0.5 w-5 h-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Erro ao carregar padrões</p>
                    <p className="mt-1 text-sm text-destructive/80">
                      {error instanceof Error ? error.message : "Erro desconhecido."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !isError && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {["Número do Certificado", "Padrão", "Fabricante", "Modelo", "Número de Série", "Laboratório Calibrador", "Data da Calibração", "Validade", "Status", "Documentos", "Ações"].map((label) => (
                        <th key={label} className={`${label === "Ações" ? "text-right" : "text-left"} px-4 py-3 font-medium text-muted-foreground`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePadroes.map((padrao) => {
                      const status = getStatusValidadePadrao(padrao.data_validade);
                      return (
                        <tr key={padrao.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{padrao.numero_certificado}</td>
                          <td className="px-4 py-3">
                            <button type="button" className="font-medium text-primary hover:underline" onClick={() => openDetails(padrao)}>{padrao.nome_padrao}</button>
                          </td>
                          <td className="px-4 py-3">{padrao.fabricante || "-"}</td>
                          <td className="px-4 py-3">{padrao.modelo || "-"}</td>
                          <td className="px-4 py-3">{padrao.numero_serie || "-"}</td>
                          <td className="px-4 py-3">{padrao.laboratorio_calibrador}</td>
                          <td className="px-4 py-3">{formatDate(padrao.data_calibracao)}</td>
                          <td className="px-4 py-3">{formatarDataPadrao(padrao.data_validade)}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className={statusClasses[status]}>{statusLabels[status]}</Badge></td>
                          <td className="px-4 py-3">{padrao.documentos?.length || 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => openDetails(padrao)}><Eye className="w-4 h-4 mr-2" /> Visualizar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(padrao)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openRenovacao(padrao)}><FileText className="w-4 h-4 mr-2" /> Renovar certificado</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDocumentos(padrao)}><FileText className="w-4 h-4 mr-2" /> Documentos</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => baixarCertificado(padrao)}><Download className="w-4 h-4 mr-2" /> Baixar certificado</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDesativar(padrao)}><Trash2 className="w-4 h-4 mr-2" /> Desativar</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={11} className="px-5 py-8 text-center text-muted-foreground">Nenhum padrão de calibração cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>}

      {section === "procedimentos" && <CalibracaoProcedimentosSection />}
      {section === "execucoes" && <CalibracaoExecucoesSection />}
      {section === "configuracoes" && <Placeholder title="Configurações" />}
    </div>
  );
};

const Counter = ({ label, value, className }: { label: string; value: number; className: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-2xl font-semibold ${className}`}>{value}</p>
  </div>
);

const Placeholder = ({ title }: { title: string }) => (
  <div className="rounded-xl border bg-card p-8 text-center">
    <h3 className="font-medium">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">Em desenvolvimento</p>
  </div>
);

export default Calibracao;

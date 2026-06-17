import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import PageHeader from "@/components/PageHeader";
import SegurancaEletricaDetalhesDialog from "@/components/SegurancaEletricaDetalhesDialog";
import SegurancaEletricaFormDialog from "@/components/SegurancaEletricaFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSegurancaEletrica } from "@/hooks/useSegurancaEletrica";
import {
  formatNumeroCertificadoSegurancaEletrica,
  type SegurancaEletricaExecucao,
} from "@/services/segurancaEletricaService";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { gerarPdfSegurancaEletrica } from "@/utils/gerarPdfSegurancaEletrica";
import { toast } from "@/hooks/use-toast";

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const getEmpresaNome = (execucao: SegurancaEletricaExecucao) =>
  execucao.empresa?.nome_fantasia ||
  execucao.empresa?.nome ||
  "Nao informado";

const resultadoClass = (resultado: string) =>
  resultado === "aprovado"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-red-50 text-red-700 border-red-200";

const SegurancaEletrica = () => {
  const [search, setSearch] = useState("");
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<SegurancaEletricaExecucao | null>(
    null
  );
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const { data: execucoes = [], isLoading, isError, error, refetch } =
    useSegurancaEletrica();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return execucoes;

    return execucoes.filter((execucao) =>
      [
        formatNumeroCertificadoSegurancaEletrica(execucao.numero_certificado),
        getEmpresaNome(execucao),
        getEquipamentoLabel(execucao.equipamento),
        execucao.equipamento?.numero_serie,
        execucao.equipamento?.patrimonio,
        execucao.equipamento?.tag,
        execucao.padrao?.nome_padrao,
        execucao.padrao?.numero_certificado,
      ].some((value) => value?.toLowerCase().includes(q))
    );
  }, [execucoes, search]);

  const visible = useMemo(
    () => filtered.slice(0, listLimit),
    [filtered, listLimit]
  );

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setFormOpen(true);
  };

  const openEdit = (execucao: SegurancaEletricaExecucao) => {
    setSelected(execucao);
    setMode("edit");
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const openDetails = (execucao: SegurancaEletricaExecucao) => {
    setSelected(execucao);
    setDetailsOpen(true);
  };

  const abrirEmpresa = async (execucao: SegurancaEletricaExecucao) => {
    if (!execucao.empresa) return;

    try {
      const empresaCompleta = await empresasService.buscarPorId(
        execucao.empresa.id
      );
      setEmpresaSelecionada(empresaCompleta);
      setEmpresaDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir cliente",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirEquipamento = async (execucao: SegurancaEletricaExecucao) => {
    if (!execucao.equipamento) return;

    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        execucao.equipamento.id
      );
      setEquipamentoSelecionado(equipamentoCompleto);
      setEquipamentoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Segurança Elétrica"
        description="Registre avaliações conforme NBR IEC 60601-1 usando padrões da calibração."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Segurança Elétrica
        </Button>
      </PageHeader>

      <SegurancaEletricaFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setSelected(null);
        }}
        execucao={selected}
        mode={mode}
      />

      <SegurancaEletricaDetalhesDialog
        open={detailsOpen}
        onOpenChange={(value) => {
          setDetailsOpen(value);
          if (!value) setSelected(null);
        }}
        execucao={selected}
        onEditar={openEdit}
      />

      <EmpresaDetalhesDialog
        open={empresaDialogOpen}
        onOpenChange={(value) => {
          setEmpresaDialogOpen(value);
          if (!value) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
      />

      <EquipamentoDetalhesDialog
        open={equipamentoDialogOpen}
        onOpenChange={(value) => {
          setEquipamentoDialogOpen(value);
          if (!value) setEquipamentoSelecionado(null);
        }}
        equipamento={equipamentoSelecionado}
      />

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-start">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar certificado, cliente, equipamento..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ListLimitSelect
            value={listLimit}
            onChange={setListLimit}
            total={filtered.length}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando segurança elétrica...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8">
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Erro ao carregar segurança elétrica
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  {error instanceof Error ? error.message : "Erro desconhecido."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left">Certificado</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Equipamento</th>
                  <th className="px-4 py-3 text-left">Classe</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Validade</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((execucao) => (
                  <tr
                    key={execucao.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        className="text-primary hover:underline font-semibold"
                        onClick={() => openDetails(execucao)}
                      >
                        {formatNumeroCertificadoSegurancaEletrica(
                          execucao.numero_certificado
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {execucao.empresa ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => abrirEmpresa(execucao)}
                        >
                          {getEmpresaNome(execucao)}
                        </button>
                      ) : (
                        getEmpresaNome(execucao)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {execucao.equipamento ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => abrirEquipamento(execucao)}
                        >
                          {getEquipamentoLabel(execucao.equipamento)}
                        </button>
                      ) : (
                        getEquipamentoLabel(execucao.equipamento)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {execucao.classe_equipamento} - {execucao.tipo_parte_aplicada}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={resultadoClass(execucao.resultado_geral)}
                      >
                        {execucao.resultado_geral === "aprovado"
                          ? "APROVADO"
                          : "REPROVADO"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatDate(execucao.data_teste)}</td>
                    <td className="px-4 py-3">{formatDate(execucao.data_validade)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(execucao)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(execucao)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => gerarPdfSegurancaEletrica(execucao)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Gerar PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Nenhuma avaliação de segurança elétrica encontrada.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SegurancaEletrica;

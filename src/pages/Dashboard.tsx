import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrcamentoFormDialog from "@/components/OrcamentoFormDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import OrdemServicoFormDialog, {
  DialogMode as OrdemServicoDialogMode,
} from "@/components/OrdemServicoFormDialog";
import PageHeader from "@/components/PageHeader";
import ProtocoloEntregaDialog from "@/components/ProtocoloEntregaDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useExcluirOrdemServico } from "@/hooks/useOrdensServico";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  empresasService,
  type EmpresaSupabase,
} from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import {
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";

type EmpresaResumo = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

type EquipamentoResumo = {
  id: string;
  empresa_id: string;
  tipo_texto: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tag: string | null;
  setor: string | null;
  status: string;
  data_proxima_preventiva: string | null;
  data_proxima_calibracao: string | null;
  ativo: boolean;
  empresa?: EmpresaResumo | null;
  tipo_equipamento?: {
    id: string;
    nome: string;
  } | null;
};

type OrdemServicoResumo = {
  id: string;
  numero: string;
  empresa_id: string;
  equipamento_id: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  problema_relatado: string | null;
  descricao_servico: string | null;
  responsavel_texto: string | null;
  status_sistema: string;
  ativo: boolean;
  empresa?: EmpresaResumo | null;
  equipamento?: EquipamentoResumo | null;
  tipo_os?: {
    id: string;
    nome: string;
  } | null;
  estado_os?: {
    id: string;
    nome: string;
    finaliza_os: boolean;
    cancela_os: boolean;
  } | null;
};

type ChecklistPreventivaResumo = {
  id: string;
  equipamento_id: string | null;
  checklist_preventiva?: Array<{
    data_validade: string | null;
    created_at: string;
  }> | null;
};

type ContratoResumo = {
  id: string;
  empresa_nome_snapshot: string | null;
  numero_identificacao: string | null;
  data_proxima_renovacao: string;
  periodicidade_visita: string | null;
  vendedor: string | null;
  empresa?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
  } | null;
};

type PadraoResumo = {
  id: string;
  numero_certificado: string;
  nome_padrao: string;
  laboratorio_calibrador: string;
  data_validade: string;
};

type PreventivaMes = {
  key: string;
  label: string;
  inicio: Date;
  fim: Date;
  equipamentos: EquipamentoResumo[];
};

type DashboardData = {
  liberadosEntrega: OrdemServicoResumo[];
  analiseCompleta: OrdemServicoResumo[];
  osAbertas: OrdemServicoResumo[];
  equipamentosManutencao: EquipamentoResumo[];
  preventivasPorMes: PreventivaMes[];
  contratosVencendo: ContratoResumo[];
  calibracoesVencendo: EquipamentoResumo[];
  padroesVencendo: PadraoResumo[];
};

const selectOS = `
  id,
  numero,
  empresa_id,
  equipamento_id,
  data_abertura,
  data_fechamento,
  problema_relatado,
  descricao_servico,
  responsavel_texto,
  status_sistema,
  ativo,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    rua,
    numero,
    bairro,
    cidade,
    estado
  ),
  equipamento:equipamentos (
    id,
    empresa_id,
    tipo_texto,
    fabricante,
    modelo,
    numero_serie,
    patrimonio,
    tag,
    setor,
    status,
    data_proxima_preventiva,
    data_proxima_calibracao,
    ativo,
    tipo_equipamento:tipos_equipamento (
      id,
      nome
    )
  ),
  tipo_os:tipos_os (
    id,
    nome
  ),
  estado_os:estados_os (
    id,
    nome,
    finaliza_os,
    cancela_os
  )
`;

const selectEquipamentos = `
  id,
  empresa_id,
  tipo_texto,
  fabricante,
  modelo,
  numero_serie,
  patrimonio,
  tag,
  setor,
  status,
  data_proxima_preventiva,
  data_proxima_calibracao,
  ativo,
  empresa:empresas (
    id,
    nome,
    nome_fantasia,
    rua,
    numero,
    bairro,
    cidade,
    estado
  ),
  tipo_equipamento:tipos_equipamento (
    id,
    nome
  )
`;

const selectContratos = `
  id,
  empresa_nome_snapshot,
  numero_identificacao,
  data_proxima_renovacao,
  periodicidade_visita,
  vendedor,
  empresa:empresas (
    id,
    nome,
    nome_fantasia
  )
`;

const selectPadroes = `
  id,
  numero_certificado,
  nome_padrao,
  laboratorio_calibrador,
  data_validade
`;

const selectChecklists = `
  id,
  equipamento_id,
  checklist_preventiva:os_checklists_preventiva (
    data_validade,
    created_at
  )
`;

const normalize = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const diffDays = (date?: string | null) => {
  const parsed = parseDateOnly(date);
  if (!parsed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
};

const ageDays = (date?: string | null) => {
  const days = diffDays(date);
  return days === null ? null : Math.max(Math.abs(days), 0);
};

const formatDate = (value?: string | null) => {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString("pt-BR") : "-";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

const formatMes = (date: Date) =>
  date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });

const getEmpresaNome = (empresa?: EmpresaResumo | null) =>
  empresa?.nome_fantasia || empresa?.nome || "Cliente não informado";

const getContratoEmpresaNome = (contrato: ContratoResumo) =>
  contrato.empresa?.nome_fantasia ||
  contrato.empresa?.nome ||
  contrato.empresa_nome_snapshot ||
  "Cliente não informado";

const getEquipamentoLabel = (equipamento?: EquipamentoResumo | null) => {
  if (!equipamento) return "Equipamento não informado";

  const tipo =
    equipamento.tipo_equipamento?.nome ||
    equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.numero_serie ? `S/N ${equipamento.numero_serie}` : null,
    equipamento.patrimonio ? `Pat. ${equipamento.patrimonio}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
};

const getEndereco = (empresa?: EmpresaResumo | null) => {
  if (!empresa) return "Endereço não informado";

  const cidadeUf = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  const partes = [
    empresa.rua,
    empresa.numero,
    empresa.bairro,
    cidadeUf || null,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : "Endereço não informado";
};

const getEstadoNome = (os: OrdemServicoResumo) =>
  os.estado_os?.nome || os.status_sistema || "Estado não informado";

const isLiberadoEntrega = (os: OrdemServicoResumo) =>
  normalize(getEstadoNome(os)).includes("liberado para entrega");

const isAnaliseCompleta = (os: OrdemServicoResumo) => {
  const estado = normalize(getEstadoNome(os));
  return estado.includes("analise completa") || estado.includes("analise concluida");
};

const isAberta = (os: OrdemServicoResumo) =>
  os.ativo &&
  os.status_sistema !== "fechada" &&
  !os.estado_os?.finaliza_os &&
  !os.estado_os?.cancela_os;

const getLatestPreventivaMap = (ordens: ChecklistPreventivaResumo[]) => {
  const map = new Map<string, string>();

  ordens.forEach((os) => {
    if (!os.equipamento_id) return;

    const datas = (os.checklist_preventiva || [])
      .map((checklist) => checklist.data_validade)
      .filter((value): value is string => Boolean(value));

    datas.forEach((data) => {
      const atual = map.get(os.equipamento_id);
      if (!atual || data > atual) {
        map.set(os.equipamento_id, data);
      }
    });
  });

  return map;
};

const getDataPreventivaEfetiva = (
  equipamento: EquipamentoResumo,
  latestPreventivaMap: Map<string, string>
) => {
  const cadastrada = equipamento.data_proxima_preventiva;
  const checklist = latestPreventivaMap.get(equipamento.id);

  if (cadastrada && checklist) return checklist > cadastrada ? checklist : cadastrada;
  return checklist || cadastrada || null;
};

const montarPreventivasPorMes = (
  equipamentos: EquipamentoResumo[],
  latestPreventivaMap: Map<string, string>
) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const meses: PreventivaMes[] = Array.from({ length: 6 }, (_, index) => {
    const inicio = startOfMonth(addMonths(hoje, index));
    const fim = endOfMonth(inicio);

    return {
      key: `${inicio.getFullYear()}-${inicio.getMonth()}`,
      label: index === 0 ? "Este mês" : formatMes(inicio),
      inicio,
      fim,
      equipamentos: [],
    };
  });

  equipamentos.forEach((equipamento) => {
    const dataEfetiva = getDataPreventivaEfetiva(equipamento, latestPreventivaMap);
    const data = parseDateOnly(dataEfetiva);
    if (!data) return;

    const mes =
      data < meses[0].inicio
        ? meses[0]
        : meses.find((item) => data >= item.inicio && data <= item.fim);
    if (!mes) return;

    mes.equipamentos.push({
      ...equipamento,
      data_proxima_preventiva: dataEfetiva,
    });
  });

  return meses.map((mes) => ({
    ...mes,
    equipamentos: mes.equipamentos.sort((a, b) =>
      (a.data_proxima_preventiva || "").localeCompare(
        b.data_proxima_preventiva || ""
      )
    ),
  }));
};

const carregarDashboard = async (): Promise<DashboardData> => {
  const { data: perfil, error: perfilError } = await supabase.rpc("current_user_perfil");
  if (perfilError) throw new Error(perfilError.message);
  const selectOsPermitido = perfil === "solicitante"
    ? selectOS.replace("  descricao_servico,\n", "")
    : selectOS;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteContratos = toDateOnly(addDays(hoje, 60));
  const limitePreventivas = toDateOnly(endOfMonth(addMonths(hoje, 5)));
  const limiteCalibracoes = toDateOnly(addDays(hoje, 60));
  const limitePadroes = toDateOnly(addDays(hoje, 60));

  const [
    osResult,
    equipamentosPreventivaResult,
    equipamentosManutencaoResult,
    contratosResult,
    checklistsResult,
    calibracoesResult,
    padroesResult,
  ] = await Promise.all([
    supabase
      .from("ordens_servico")
      .select(selectOsPermitido)
      .eq("ativo", true)
      .order("data_abertura", { ascending: false })
      .limit(500),
    supabase
      .from("equipamentos")
      .select(selectEquipamentos)
      .eq("ativo", true)
      .not("data_proxima_preventiva", "is", null)
      .lte("data_proxima_preventiva", limitePreventivas)
      .order("data_proxima_preventiva", { ascending: true })
      .limit(800),
    supabase
      .from("equipamentos")
      .select(selectEquipamentos)
      .eq("ativo", true)
      .ilike("status", "%manutenção%")
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("contratos")
      .select(selectContratos)
      .eq("ativo", true)
      .lte("data_proxima_renovacao", limiteContratos)
      .order("data_proxima_renovacao", { ascending: true })
      .limit(50),
    supabase
      .from("ordens_servico")
      .select(selectChecklists)
      .not("equipamento_id", "is", null)
      .order("data_fechamento", { ascending: false })
      .limit(2000),
    supabase
      .from("equipamentos")
      .select(selectEquipamentos)
      .eq("ativo", true)
      .not("data_proxima_calibracao", "is", null)
      .lte("data_proxima_calibracao", limiteCalibracoes)
      .order("data_proxima_calibracao", { ascending: true })
      .limit(50),
    supabase
      .from("calibracao_padroes")
      .select(selectPadroes)
      .eq("ativo", true)
      .lte("data_validade", limitePadroes)
      .order("data_validade", { ascending: true })
      .limit(50),
  ]);

  const errors = [
    osResult.error,
    equipamentosPreventivaResult.error,
    equipamentosManutencaoResult.error,
    contratosResult.error,
    checklistsResult.error,
    calibracoesResult.error,
    padroesResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Erro ao carregar painel.");
  }

  const ordens = (osResult.data || []) as unknown as OrdemServicoResumo[];
  const latestPreventivaMap = getLatestPreventivaMap(
    (checklistsResult.data || []) as unknown as ChecklistPreventivaResumo[]
  );

  return {
    liberadosEntrega: ordens.filter(isLiberadoEntrega).slice(0, 8),
    analiseCompleta: ordens.filter(isAnaliseCompleta).slice(0, 8),
    osAbertas: ordens.filter(isAberta),
    equipamentosManutencao:
      (equipamentosManutencaoResult.data || []) as unknown as EquipamentoResumo[],
    preventivasPorMes: montarPreventivasPorMes(
      (equipamentosPreventivaResult.data || []) as unknown as EquipamentoResumo[],
      latestPreventivaMap
    ),
    contratosVencendo: (contratosResult.data || []) as unknown as ContratoResumo[],
    calibracoesVencendo:
      (calibracoesResult.data || []) as unknown as EquipamentoResumo[],
    padroesVencendo: (padroesResult.data || []) as unknown as PadraoResumo[],
  };
};

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ClipboardList;
  tone?: "default" | "warning" | "danger" | "success";
}) => {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <Card className="rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {value.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className={`rounded-lg p-2.5 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
    {text}
  </div>
);

const DaysBadge = ({ days }: { days: number | null }) => {
  if (days === null) return <Badge variant="outline">Sem data</Badge>;
  if (days < 0) return <Badge variant="destructive">Vencido há {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge variant="destructive">Vence hoje</Badge>;
  if (days <= 15) return <Badge className="bg-warning text-warning-foreground">{days}d</Badge>;
  return <Badge variant="outline">{days}d</Badge>;
};

const AgeBadge = ({ date }: { date?: string | null }) => {
  const days = ageDays(date);
  if (days === null) return <Badge variant="outline">Sem data</Badge>;
  if (days === 0) return <Badge variant="outline">Hoje</Badge>;
  return <Badge variant="outline">Há {days}d</Badge>;
};

const OrdemServicoRow = ({
  ocultarDescricaoServico,
  loading,
  onOpen,
  os,
}: {
  ocultarDescricaoServico?: boolean;
  loading?: boolean;
  onOpen: (osId: string) => void;
  os: OrdemServicoResumo;
}) => (
  <div className="grid gap-3 border-b px-4 py-3 last:border-0 lg:grid-cols-[120px_1.2fr_1fr_1fr_auto]">
    <div>
      <button
        type="button"
        onClick={() => onOpen(os.id)}
        disabled={loading}
        className="font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
      >
        OS {os.numero}
      </button>
      <p className="text-xs text-muted-foreground">{formatDateTime(os.data_abertura)}</p>
    </div>
    <div>
      <p className="font-medium text-foreground">{getEquipamentoLabel(os.equipamento)}</p>
      <p className="text-xs text-muted-foreground">{os.equipamento?.setor || "Sem setor"}</p>
    </div>
    <div>
      <p className="font-medium text-foreground">{getEmpresaNome(os.empresa)}</p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {getEndereco(os.empresa)}
      </p>
    </div>
    <div>
      <p className="text-sm text-foreground">
        {os.problema_relatado || (!ocultarDescricaoServico ? os.descricao_servico : null) || "-"}
      </p>
      <p className="text-xs text-muted-foreground">{os.responsavel_texto || "Sem responsável"}</p>
    </div>
    <div className="flex items-start justify-end">
      <Badge variant="outline">{getEstadoNome(os)}</Badge>
    </div>
  </div>
);

const EquipamentoRow = ({
  equipamento,
  data,
}: {
  equipamento: EquipamentoResumo;
  data: string | null;
}) => (
  <div className="grid gap-3 border-b px-4 py-3 last:border-0 md:grid-cols-[1.2fr_1fr_auto]">
    <div>
      <p className="font-medium text-foreground">{getEquipamentoLabel(equipamento)}</p>
      <p className="text-xs text-muted-foreground">{equipamento.setor || "Sem setor"}</p>
    </div>
    <div>
      <p className="font-medium text-foreground">{getEmpresaNome(equipamento.empresa)}</p>
      <p className="text-xs text-muted-foreground">{getEndereco(equipamento.empresa)}</p>
    </div>
    <div className="flex items-start justify-end gap-2">
      <span className="text-sm font-medium">{formatDate(data)}</span>
      <DaysBadge days={diffDays(data)} />
    </div>
  </div>
);

const Dashboard = () => {
  const { usuario } = useAuth();
  const ocultarDescricaoServico = usuario?.perfil === "solicitante";
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-operacional"],
    queryFn: carregarDashboard,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [osDetalhes, setOsDetalhes] = useState<OrdemServicoSupabase | null>(
    null
  );
  const [osCarregandoId, setOsCarregandoId] = useState<string | null>(null);
  const [orcamentoOpen, setOrcamentoOpen] = useState(false);
  const [osOrcamento, setOsOrcamento] =
    useState<OrdemServicoSupabase | null>(null);
  const [osFormOpen, setOsFormOpen] = useState(false);
  const [osFormMode, setOsFormMode] =
    useState<OrdemServicoDialogMode>("create");
  const [osSelecionada, setOsSelecionada] =
    useState<OrdemServicoSupabase | null>(null);
  const [empresaDetalhesOpen, setEmpresaDetalhesOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaSupabase | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [osEntrega, setOsEntrega] =
    useState<OrdemServicoSupabase | null>(null);
  const excluirOS = useExcluirOrdemServico();

  const preventivasEsteMes =
    data?.preventivasPorMes[0]?.equipamentos.length || 0;
  const preventivasVencidas =
    data?.preventivasPorMes[0]?.equipamentos.filter(
      (equipamento) => (diffDays(equipamento.data_proxima_preventiva) ?? 1) < 0
    ).length || 0;
  const contratosCriticos =
    data?.contratosVencendo.filter(
      (contrato) => (diffDays(contrato.data_proxima_renovacao) ?? 999) <= 30
    ).length || 0;
  const padroesCriticos =
    data?.padroesVencendo.filter(
      (padrao) => (diffDays(padrao.data_validade) ?? 999) <= 30
    ).length || 0;

  const abrirOrdemServico = async (osId: string) => {
    try {
      setOsCarregandoId(osId);
      const ordem = await ordensServicoService.buscarPorId(osId);
      setOsDetalhes(ordem);
      setDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir OS",
        description:
          error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setOsCarregandoId(null);
    }
  };

  const openEmpresaDetalhes = async (
    empresa: EmpresaSupabase | null | undefined
  ) => {
    if (!empresa) return;

    try {
      const empresaCompleta = await empresasService.buscarPorId(empresa.id);
      setEmpresaSelecionada(empresaCompleta);
      setEmpresaDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir empresa",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const openEquipamentoDetalhes = async (
    equipamento: EquipamentoSupabase | null | undefined
  ) => {
    if (!equipamento) return;

    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        equipamento.id
      );
      setEquipamentoSelecionado(equipamentoCompleto);
      setEquipamentoDetalhesOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleExcluir = async (os: OrdemServicoSupabase) => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir a OS ${os.numero}? Ela será ocultada da listagem, mas permanecerá no banco para histórico.`
    );

    if (!confirmado) return;

    try {
      await excluirOS.mutateAsync(os.id);
      await refetch();

      toast({
        title: "OS excluída com sucesso.",
        description: `A OS ${os.numero} foi ocultada da listagem.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir OS",
        description:
          error instanceof Error ? error.message : "Erro inesperado ao excluir OS.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <OrdemServicoFormDialog
        open={osFormOpen}
        onOpenChange={(open) => {
          setOsFormOpen(open);
          if (!open) {
            setOsSelecionada(null);
            refetch();
          }
        }}
        mode={osFormMode}
        os={osSelecionada}
      />

      <OrdemServicoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(open) => {
          setDetalhesOpen(open);
          if (!open) setOsDetalhes(null);
        }}
        os={osDetalhes}
        onEdit={(ordem) => {
          setDetalhesOpen(false);
          setOsDetalhes(null);
          setOsSelecionada(ordem);
          setOsFormMode("edit");
          setOsFormOpen(true);
        }}
        onDelete={(ordem) => {
          setDetalhesOpen(false);
          setOsDetalhes(null);
          handleExcluir(ordem);
        }}
        onOpenEmpresa={openEmpresaDetalhes}
        onOpenEquipamento={openEquipamentoDetalhes}
        onCriarOrcamento={(os) => {
          setOsOrcamento(os);
          setOrcamentoOpen(true);
        }}
        onProtocoloEntrega={(os) => {
          setOsEntrega(os);
          setEntregaOpen(true);
        }}
      />

      <EmpresaDetalhesDialog
        open={empresaDetalhesOpen}
        onOpenChange={(open) => {
          setEmpresaDetalhesOpen(open);
          if (!open) setEmpresaSelecionada(null);
        }}
        empresa={empresaSelecionada}
      />

      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={(open) => {
          setEquipamentoDetalhesOpen(open);
          if (!open) setEquipamentoSelecionado(null);
        }}
        equipamento={equipamentoSelecionado}
      />

      <ProtocoloEntregaDialog
        open={entregaOpen}
        onOpenChange={(open) => {
          setEntregaOpen(open);
          if (!open) {
            setOsEntrega(null);
            refetch();
          }
        }}
        os={osEntrega}
      />

      <OrcamentoFormDialog
        open={orcamentoOpen}
        onOpenChange={(open) => {
          setOrcamentoOpen(open);
          if (!open) {
            setOsOrcamento(null);
            refetch();
          }
        }}
        mode="create"
        fromOS={osOrcamento}
      />

      <PageHeader
        title="Painel de Controle"
        description="Prioridades operacionais e alertas de vencimento"
      >
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </PageHeader>

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error)?.message || "Erro ao carregar dados do painel."}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Liberados para entrega"
              value={data?.liberadosEntrega.length || 0}
              description="Equipamentos aguardando retirada ou entrega"
              icon={PackageCheck}
              tone="success"
            />
            <StatCard
              title="Análise concluída"
              value={data?.analiseCompleta.length || 0}
              description="OS aguardando proposta/decisão do gestor"
              icon={ClipboardCheck}
              tone="warning"
            />
            <StatCard
              title="Preventivas este mês"
              value={preventivasEsteMes}
              description={`${preventivasVencidas} vencida(s) dentro do mês atual`}
              icon={CalendarClock}
              tone={preventivasVencidas > 0 ? "danger" : "default"}
            />
            <StatCard
              title="Contratos até 60 dias"
              value={data?.contratosVencendo.length || 0}
              description={`${contratosCriticos} vencendo em até 30 dias`}
              icon={FileText}
              tone={contratosCriticos > 0 ? "warning" : "default"}
            />
            <StatCard
              title="OS abertas"
              value={data?.osAbertas.length || 0}
              description="Ordens ativas que ainda não foram finalizadas"
              icon={ClipboardList}
            />
            <StatCard
              title="Equipamentos em manutenção"
              value={data?.equipamentosManutencao.length || 0}
              description="Status operacional marcado como em manutenção"
              icon={Wrench}
              tone="warning"
            />
            <StatCard
              title="Calibrações até 60 dias"
              value={data?.calibracoesVencendo.length || 0}
              description="Equipamentos com calibração vencida ou próxima"
              icon={ShieldAlert}
              tone={(data?.calibracoesVencendo.length || 0) > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Padrões até 60 dias"
              value={data?.padroesVencendo.length || 0}
              description={`${padroesCriticos} vencendo em até 30 dias`}
              icon={AlertTriangle}
              tone={padroesCriticos > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Liberados para entrega</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    OS com equipamento pronto, cliente e endereço para logística.
                  </p>
                </div>
                <Link to="/ordens-servico" className="text-sm text-primary hover:underline">
                  Ver OS <ArrowRight className="inline h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {data?.liberadosEntrega.length ? (
                  data.liberadosEntrega.map((os) => (
                    <OrdemServicoRow
                      key={os.id}
                      loading={osCarregandoId === os.id}
                      ocultarDescricaoServico={ocultarDescricaoServico}
                      onOpen={abrirOrdemServico}
                      os={os}
                    />
                  ))
                ) : (
                  <div className="p-4">
                    <EmptyState text="Nenhum equipamento liberado para entrega." />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Análise concluída</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Prioridade comercial/gestão para proposta de manutenção.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.analiseCompleta.length ? (
                  data.analiseCompleta.map((os) => (
                    <div key={os.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => abrirOrdemServico(os.id)}
                            disabled={osCarregandoId === os.id}
                            className="font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
                          >
                            OS {os.numero}
                          </button>
                          <p className="text-sm font-medium">{getEquipamentoLabel(os.equipamento)}</p>
                          <p className="text-xs text-muted-foreground">{getEmpresaNome(os.empresa)}</p>
                        </div>
                        <AgeBadge date={os.data_abertura} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Nenhuma OS em análise concluída." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Preventivas mês a mês</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Usa a próxima preventiva efetiva, considerando checklists já finalizados.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.preventivasPorMes.map((mes) => (
                  <div key={mes.key} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold capitalize">{mes.label}</span>
                      <Badge variant={mes.equipamentos.length ? "default" : "outline"}>
                        {mes.equipamentos.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {mes.equipamentos.slice(0, 3).map((equipamento) => (
                        <div key={equipamento.id} className="text-sm">
                          <p className="font-medium">{getEquipamentoLabel(equipamento)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getEmpresaNome(equipamento.empresa)} · {formatDate(equipamento.data_proxima_preventiva)}
                          </p>
                        </div>
                      ))}
                      {mes.equipamentos.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{mes.equipamentos.length - 3} equipamento(s)
                        </p>
                      )}
                      {mes.equipamentos.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem vencimentos previstos.</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Preventivas do mês atual</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Equipamentos vencidos ou com vencimento ainda neste mês.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {data?.preventivasPorMes[0]?.equipamentos.length ? (
                  data.preventivasPorMes[0].equipamentos
                    .slice(0, 8)
                    .map((equipamento) => (
                      <EquipamentoRow
                        key={equipamento.id}
                        equipamento={equipamento}
                        data={equipamento.data_proxima_preventiva}
                      />
                    ))
                ) : (
                  <div className="p-4">
                    <EmptyState text="Nenhuma preventiva vencendo neste mês." />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Contratos vencendo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Renovação ou revisão contratual em até 60 dias.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.contratosVencendo.length ? (
                  data.contratosVencendo.slice(0, 8).map((contrato) => (
                    <div key={contrato.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="font-medium">{getContratoEmpresaNome(contrato)}</p>
                        <p className="text-xs text-muted-foreground">
                          {contrato.numero_identificacao || "Sem identificação"} · {contrato.periodicidade_visita || "Periodicidade não informada"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatDate(contrato.data_proxima_renovacao)}</p>
                        <DaysBadge days={diffDays(contrato.data_proxima_renovacao)} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Nenhum contrato vencendo nos próximos 60 dias." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Calibrações próximas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Equipamentos com calibração vencida ou vencendo em até 60 dias.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {data?.calibracoesVencendo.length ? (
                  data.calibracoesVencendo.slice(0, 8).map((equipamento) => (
                    <EquipamentoRow
                      key={equipamento.id}
                      equipamento={equipamento}
                      data={equipamento.data_proxima_calibracao}
                    />
                  ))
                ) : (
                  <div className="p-4">
                    <EmptyState text="Nenhuma calibração vencendo nos próximos 60 dias." />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(data?.osAbertas.length || 0) > 0 && (
            <Card className="mt-6 rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  OS abertas recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data?.osAbertas.slice(0, 8).map((os) => (
                  <OrdemServicoRow
                    key={os.id}
                    loading={osCarregandoId === os.id}
                    ocultarDescricaoServico={ocultarDescricaoServico}
                    onOpen={abrirOrdemServico}
                    os={os}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {(data?.equipamentosManutencao.length || 0) > 0 && (
            <Card className="mt-6 rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cpu className="h-5 w-5 text-warning" />
                  Equipamentos em manutenção
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data?.equipamentosManutencao.slice(0, 8).map((equipamento) => (
                  <EquipamentoRow
                    key={equipamento.id}
                    equipamento={equipamento}
                    data={equipamento.data_proxima_preventiva}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;

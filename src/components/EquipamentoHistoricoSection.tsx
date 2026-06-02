import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { ReactNode, useState } from "react";
import LaudoObsolescenciaDetalhesDialog from "@/components/LaudoObsolescenciaDetalhesDialog";
import OrcamentoDetalhesDialog from "@/components/OrcamentoDetalhesDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import ProtocoloDetalhesDialog from "@/components/ProtocoloDetalhesDialog";
import CalibracaoExecucaoDetalhesDialog from "@/components/CalibracaoExecucaoDetalhesDialog";
import { useEquipamentoHistorico } from "@/hooks/useEquipamentoHistorico";
import { toast } from "@/hooks/use-toast";
import {
  LaudoObsolescenciaSupabase,
  laudosObsolescenciaService,
} from "@/services/laudosObsolescenciaService";
import {
  OrcamentoSupabase,
  OrcamentoTipo,
  orcamentosService,
} from "@/services/orcamentosService";
import {
  OrdemServicoSupabase,
  ordensServicoService,
} from "@/services/ordensServicoService";
import {
  ProtocoloOSSupabase,
  protocolosService,
  TipoProtocoloOS,
} from "@/services/protocolosService";
import {
  CalibracaoExecucao,
  calibracaoExecucoesService,
  formatNumeroCertificadoCalibracao,
} from "@/services/calibracaoExecucoesService";
import { formatarMesAno } from "@/utils/calibracaoValidade";

interface EquipamentoHistoricoSectionProps {
  equipamentoId?: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const protocoloLabel: Record<TipoProtocoloOS, string> = {
  recolhimento: "Recolhimento",
  entrega: "Entrega",
};

const tipoOrcamentoLabel: Record<OrcamentoTipo, string> = {
  servico: "Serviço",
  pecas: "Peças",
  pecas_servicos: "Peças + Serviços",
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-lg border bg-card overflow-hidden">
    <div className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
      {title}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const EmptyText = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

const HistoricoLink = ({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) => (
  <button
    type="button"
    className="text-primary hover:underline font-medium text-left"
    onClick={onClick}
    aria-label={ariaLabel}
  >
    {children}
  </button>
);

const EquipamentoHistoricoSection = ({
  equipamentoId,
}: EquipamentoHistoricoSectionProps) => {
  const { data, isLoading, isError, error } =
    useEquipamentoHistorico(equipamentoId);
  const [ordemSelecionada, setOrdemSelecionada] =
    useState<OrdemServicoSupabase | null>(null);
  const [ordemDialogOpen, setOrdemDialogOpen] = useState(false);
  const [protocoloSelecionado, setProtocoloSelecionado] =
    useState<ProtocoloOSSupabase | null>(null);
  const [protocoloDialogOpen, setProtocoloDialogOpen] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] =
    useState<OrcamentoSupabase | null>(null);
  const [orcamentoDialogOpen, setOrcamentoDialogOpen] = useState(false);
  const [laudoSelecionado, setLaudoSelecionado] =
    useState<LaudoObsolescenciaSupabase | null>(null);
  const [laudoDialogOpen, setLaudoDialogOpen] = useState(false);
  const [calibracaoSelecionada, setCalibracaoSelecionada] =
    useState<CalibracaoExecucao | null>(null);
  const [calibracaoDialogOpen, setCalibracaoDialogOpen] = useState(false);

  const handleAbrirOS = async (id: string) => {
    try {
      const os = await ordensServicoService.buscarPorId(id);
      setOrdemSelecionada(os);
      setOrdemDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir OS",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirProtocolo = async (id: string) => {
    try {
      const protocolo = await protocolosService.buscarPorId(id);
      setProtocoloSelecionado(protocolo);
      setProtocoloDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir protocolo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirOrcamento = async (id: string) => {
    try {
      const orcamento = await orcamentosService.buscarPorId(id);
      setOrcamentoSelecionado(orcamento);
      setOrcamentoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir orcamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirLaudo = async (id: string) => {
    try {
      const laudo = await laudosObsolescenciaService.buscarPorId(id);
      setLaudoSelecionado(laudo);
      setLaudoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir laudo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirCalibracao = async (id: string) => {
    try {
      setCalibracaoSelecionada(
        await calibracaoExecucoesService.buscarExecucaoPorId(id)
      );
      setCalibracaoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir calibracao",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirPdfCalibracao = async (calibracao: CalibracaoExecucao) => {
    try {
      window.open(
        await calibracaoExecucoesService.criarUrlPdf(calibracao),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      toast({
        title: "Erro ao abrir certificado",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (!equipamentoId) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando histórico de atividades...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">
            Erro ao carregar histórico
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            {error instanceof Error ? error.message : "Erro desconhecido."}
          </p>
        </div>
      </div>
    );
  }

  const ordensServico = data?.ordensServico || [];
  const protocolos = data?.protocolos || [];
  const orcamentos = data?.orcamentos || [];
  const laudosObsolescencia = data?.laudosObsolescencia || [];
  const calibracoes = data?.calibracoes || [];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">
        Histórico de Atividades
      </h3>

      <SectionCard title="Ordens de Serviço">
        {ordensServico.length === 0 ? (
          <EmptyText>
            Nenhuma Ordem de Serviço vinculada a este equipamento.
          </EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Responsável
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Criação
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Fechamento
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Problema
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordensServico.map((os) => (
                  <tr key={os.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <HistoricoLink
                        onClick={() => handleAbrirOS(os.id)}
                        ariaLabel={`Abrir OS n. ${os.numero}`}
                      >
                        {os.numero || "-"}
                      </HistoricoLink>
                    </td>
                    <td className="px-3 py-2">
                      {os.estado_os?.nome || os.status_sistema || "-"}
                    </td>
                    <td className="px-3 py-2">{os.tipo_os?.nome || "-"}</td>
                    <td className="px-3 py-2">{os.responsavel_texto || "-"}</td>
                    <td className="px-3 py-2">
                      {formatDate(os.data_abertura || os.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(os.data_fechamento)}
                    </td>
                    <td className="px-3 py-2 max-w-[280px] truncate">
                      {os.problema_relatado || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Orçamentos">
        {orcamentos.length === 0 ? (
          <EmptyText>Nenhum orçamento vinculado a este equipamento.</EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    OS
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Validade
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                    Valor Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((orcamento) => (
                  <tr key={orcamento.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <HistoricoLink
                        onClick={() => handleAbrirOrcamento(orcamento.id)}
                        ariaLabel={`Abrir orcamento n. ${orcamento.numero}`}
                      >
                        {orcamento.numero || "-"}
                      </HistoricoLink>
                    </td>
                    <td className="px-3 py-2">{orcamento.status}</td>
                    <td className="px-3 py-2">
                      {tipoOrcamentoLabel[orcamento.tipo_orcamento]}
                    </td>
                    <td className="px-3 py-2">
                      {orcamento.ordem_servico?.numero || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(orcamento.data_orcamento)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(orcamento.data_validade)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(orcamento.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Protocolos">
        {protocolos.length === 0 ? (
          <EmptyText>Nenhum protocolo vinculado a este equipamento.</EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    OS
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Responsável
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {protocolos.map((protocolo) => (
                  <tr key={protocolo.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <HistoricoLink
                        onClick={() => handleAbrirProtocolo(protocolo.id)}
                        ariaLabel={`Abrir protocolo n. ${protocolo.numero}`}
                      >
                        {protocolo.numero || "-"}
                      </HistoricoLink>
                    </td>
                    <td className="px-3 py-2">
                      {protocoloLabel[protocolo.tipo]}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(
                        protocolo.data_recolhimento ||
                          protocolo.data_entrega ||
                          protocolo.data_protocolo
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {protocolo.ordem_servico?.numero || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {protocolo.responsavel_nome || "-"}
                    </td>
                    <td className="px-3 py-2">{protocolo.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Laudo de Obsolescência">
        {laudosObsolescencia.length === 0 ? (
          <EmptyText>
            Nenhum laudo de obsolescência vinculado a este equipamento.
          </EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Motivo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Responsável
                  </th>
                </tr>
              </thead>
              <tbody>
                {laudosObsolescencia.map((laudo) => (
                  <tr key={laudo.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <HistoricoLink
                        onClick={() => handleAbrirLaudo(laudo.id)}
                        ariaLabel={`Abrir laudo n. ${laudo.numero}`}
                      >
                        {laudo.numero || "-"}
                      </HistoricoLink>
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(laudo.data_criacao)}
                    </td>
                    <td className="px-3 py-2 max-w-[360px] truncate">
                      {laudo.motivo_texto || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {laudo.responsavel_nome || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Calibrações">
        {calibracoes.length === 0 ? (
          <EmptyText>
            Nenhum certificado de calibração vinculado a este equipamento.
          </EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Validade</th>
                  <th className="px-3 py-2 text-left">Resultado</th>
                  <th className="px-3 py-2 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {calibracoes.map((calibracao) => (
                  <tr key={calibracao.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <HistoricoLink
                        onClick={() => handleAbrirCalibracao(calibracao.id)}
                        ariaLabel={`Abrir calibracao ${formatNumeroCertificadoCalibracao(calibracao.numero_certificado)}`}
                      >
                        {formatNumeroCertificadoCalibracao(calibracao.numero_certificado)}
                      </HistoricoLink>
                    </td>
                    <td className="px-3 py-2">{formatDate(calibracao.data_calibracao)}</td>
                    <td className="px-3 py-2">{formatarMesAno(calibracao.validade_mes || calibracao.data_validade)}</td>
                    <td className="px-3 py-2">{calibracao.resultado_geral?.replaceAll("_", " ") || "-"}</td>
                    <td className="px-3 py-2">
                      {calibracao.pdf_storage_path ? (
                        <button type="button" className="flex items-center gap-1 text-primary hover:underline" onClick={() => handleAbrirPdfCalibracao(calibracao)}>
                          <FileText className="h-4 w-4" /> Abrir
                        </button>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Teste de Segurança Elétrica">
        <EmptyText>
          Nenhum teste de segurança elétrica vinculado a este equipamento.
        </EmptyText>
      </SectionCard>

      <OrdemServicoDetalhesDialog
        open={ordemDialogOpen}
        onOpenChange={(value) => {
          setOrdemDialogOpen(value);
          if (!value) setOrdemSelecionada(null);
        }}
        os={ordemSelecionada}
      />

      <ProtocoloDetalhesDialog
        open={protocoloDialogOpen}
        onOpenChange={(value) => {
          setProtocoloDialogOpen(value);
          if (!value) setProtocoloSelecionado(null);
        }}
        protocolo={protocoloSelecionado}
      />

      <OrcamentoDetalhesDialog
        open={orcamentoDialogOpen}
        onOpenChange={(value) => {
          setOrcamentoDialogOpen(value);
          if (!value) setOrcamentoSelecionado(null);
        }}
        orcamento={orcamentoSelecionado}
      />

      <LaudoObsolescenciaDetalhesDialog
        open={laudoDialogOpen}
        onOpenChange={(value) => {
          setLaudoDialogOpen(value);
          if (!value) setLaudoSelecionado(null);
        }}
        laudo={laudoSelecionado}
      />

      <CalibracaoExecucaoDetalhesDialog
        open={calibracaoDialogOpen}
        onOpenChange={(value) => {
          setCalibracaoDialogOpen(value);
          if (!value) setCalibracaoSelecionada(null);
        }}
        execucao={calibracaoSelecionada}
      />
    </div>
  );
};

export default EquipamentoHistoricoSection;

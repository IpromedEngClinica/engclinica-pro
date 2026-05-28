import { AlertCircle, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useEquipamentoHistorico } from "@/hooks/useEquipamentoHistorico";
import { OrcamentoTipo } from "@/services/orcamentosService";
import { TipoProtocoloOS } from "@/services/protocolosService";

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

const EquipamentoHistoricoSection = ({
  equipamentoId,
}: EquipamentoHistoricoSectionProps) => {
  const { data, isLoading, isError, error } =
    useEquipamentoHistorico(equipamentoId);

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
                    <td className="px-3 py-2 font-medium text-primary">
                      {os.numero}
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
                    <td className="px-3 py-2 font-medium text-primary">
                      {protocolo.numero}
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
                    <td className="px-3 py-2 font-medium text-primary">
                      {orcamento.numero}
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

      <SectionCard title="Calibrações">
        <EmptyText>
          Nenhum certificado de calibração vinculado a este equipamento.
        </EmptyText>
      </SectionCard>

      <SectionCard title="Teste de Segurança Elétrica">
        <EmptyText>
          Nenhum teste de segurança elétrica vinculado a este equipamento.
        </EmptyText>
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
                    <td className="px-3 py-2 font-medium text-primary">
                      {laudo.numero}
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
    </div>
  );
};

export default EquipamentoHistoricoSection;

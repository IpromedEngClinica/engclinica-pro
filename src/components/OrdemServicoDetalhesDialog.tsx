import { ClipboardList, FileText, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ModalActionsBar from "@/components/ModalActionsBar";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  OrdemServicoChecklistPreventivaItemSupabase,
  OrdemServicoSupabase,
} from "@/services/ordensServicoService";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import {
  formatResultadoGeralChecklist,
  formatRespostaChecklist,
  getChecklistMarks,
} from "@/utils/checklistPreventiva";
import { formatarTipoHistorico } from "@/utils/historicoLabels";
import { useAuth } from "@/contexts/AuthContext";

interface OrdemServicoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: OrdemServicoSupabase | null;
  onEdit?: (os: OrdemServicoSupabase) => void;
  onDelete?: (os: OrdemServicoSupabase) => void;
  onOpenEmpresa?: (empresa: EmpresaSupabase) => void;
  onOpenEquipamento?: (equipamento: EquipamentoSupabase) => void;
  onCriarOrcamento?: (os: OrdemServicoSupabase) => void;
  onProtocoloEntrega?: (os: OrdemServicoSupabase) => void;
}

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome_fantasia ||
  os.empresa?.nome ||
  os.solicitante_texto ||
  "Não informado";

const getEquipamentoTipo = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome ||
  os.equipamento?.tipo_texto ||
  "Equipamento não informado";

const getTipoServico = (os: OrdemServicoSupabase) =>
  os.tipo_os?.nome || "Não informado";

const getEstado = (os: OrdemServicoSupabase) =>
  os.estado_os?.nome || os.status_sistema || "Não informado";

const getTecnico = (os: OrdemServicoSupabase) => os.responsavel_texto || "—";

const getChecklistPreventiva = (os: OrdemServicoSupabase) => {
  const checklist = os.checklist_preventiva;

  if (Array.isArray(checklist)) return checklist[0] || null;

  return checklist || null;
};

const isOSPreventiva = (os: OrdemServicoSupabase) => {
  const tipo = os.tipo_os?.nome?.toLowerCase() || "";
  const descricao = os.descricao_servico?.toLowerCase() || "";

  return (
    tipo.includes("preventiva") ||
    descricao.includes("preventiva") ||
    Boolean(getChecklistPreventiva(os))
  );
};

const dedupeAcessoriosView = (
  acessorios?: Array<{
    id?: string;
    descricao?: string | null;
    quantidade?: number | null;
    observacoes?: string | null;
  }>
) => {
  const map = new Map<
    string,
    {
      id?: string;
      descricao: string;
      quantidade: number;
      observacoes: string | null;
    }
  >();

  (acessorios || []).forEach((item) => {
    const descricao = item.descricao?.trim();
    if (!descricao) return;

    const chave = descricao.toLowerCase().replace(/\s+/g, " ");

    if (!map.has(chave)) {
      map.set(chave, {
        id: item.id,
        descricao,
        quantidade: Number(item.quantidade || 1),
        observacoes: item.observacoes || null,
      });
    }
  });

  return Array.from(map.values());
};

const resultadoGeralLabel = (resultado?: string | null) => {
  const map: Record<string, string> = {
    aprovado: "Aprovado para uso",
    nao_aprovado: "Nao aprovado para uso",
    aprovado_com_restricao: "Aprovado com restricao",
  };

  return map[resultado || ""] || "—";
};

const checklistObservacao = (
  item: OrdemServicoChecklistPreventivaItemSupabase
) => {
  const respostaFormatada = formatRespostaChecklist(item.resposta);

  return (
    item.observacao ||
    (item.tipo_resposta === "aprovacao_uso" ? respostaFormatada : "-")
  );
};

const formatAcao = (acao: string) => {
  const map: Record<string, string> = {
    criada: "OS criada",
    editada: "OS editada",
    estado_alterado: "Estado alterado",
    fechada: "OS fechada",
    cancelada: "OS cancelada",
    excluida: "OS excluída",
    protocolo_entrega: "Protocolo de entrega",
    checklist_preventiva_editado: "Checklist de preventiva editado",
    protocolo_recolhimento: "Protocolo de recolhimento",
    orcamento_aprovado: "Orçamento aprovado",
    orcamento_reprovado: "Orçamento reprovado",
    orcamento_faturado: "Orçamento faturado",
    orcamento_cancelado: "Orçamento cancelado",
    orcamento_pendente: "Orçamento pendente",
  };

  return map[acao] || formatarTipoHistorico(acao);
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const statusColor = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("fechada") || normalized.includes("fechado")) {
    return "bg-success/10 text-success";
  }

  if (normalized.includes("cancelada") || normalized.includes("cancelado")) {
    return "bg-destructive/10 text-destructive";
  }

  if (
    normalized.includes("aguardando") ||
    normalized.includes("orçamento") ||
    normalized.includes("peca") ||
    normalized.includes("peça")
  ) {
    return "bg-warning/10 text-warning";
  }

  return "bg-primary/10 text-primary";
};

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg border p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="text-sm">
    <span className="font-medium text-muted-foreground">{label}: </span>
    <span className="text-foreground">{children}</span>
  </div>
);

const TextBlock = ({ value }: { value?: string | null }) => (
  <p className="text-sm whitespace-pre-wrap text-foreground">{value || "—"}</p>
);

const OrdemServicoDetalhesDialog = ({
  open,
  onOpenChange,
  os,
  onEdit,
  onDelete,
  onOpenEmpresa,
  onOpenEquipamento,
  onCriarOrcamento,
  onProtocoloEntrega,
}: OrdemServicoDetalhesDialogProps) => {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { usuario } = useAuth();

  if (!os) return null;

  const isSolicitante = usuario?.perfil === "solicitante";
  const estado = getEstado(os);
  const acessoriosUnicos = dedupeAcessoriosView(os.acessorios);
  const preventiva = isOSPreventiva(os);
  const checklistPreventiva = getChecklistPreventiva(os);
  const checklistItens = [...(checklistPreventiva?.itens || [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  const historicoOrdenado = [...(os.historico || [])].sort((a, b) => {
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pr-8">
            <div className="space-y-2">
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Ordem de Serviço {os.numero}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                    estado
                  )}`}
                >
                  {estado}
                </span>
                <span>Status: {os.status_sistema || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Field label="Abertura">{formatDate(os.data_abertura)}</Field>
              <Field label="Fechamento">{formatDate(os.data_fechamento)}</Field>
            </div>
          </div>
        </DialogHeader>

        <ModalActionsBar className="mt-0 px-6 py-3">
          {onEdit && (
            <Button size="sm" onClick={() => onEdit(os)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar OS
            </Button>
          )}
          {preventiva && (
            <Button variant="outline" size="sm" onClick={() => setChecklistOpen(true)}>
              {checklistPreventiva ? "Editar checklist" : "Acessar checklist"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await gerarPdfOrdemServico(
                isSolicitante ? { ...os, descricao_servico: null } : os
              );
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
          {onCriarOrcamento && (
            <Button variant="outline" size="sm" onClick={() => onCriarOrcamento(os)}>
              Gerar Orçamento
            </Button>
          )}
          {onProtocoloEntrega && (
            <Button variant="outline" size="sm" onClick={() => onProtocoloEntrega(os)}>
              Protocolo de Entrega
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(os)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir OS
            </Button>
          )}
        </ModalActionsBar>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <InfoCard title="Solicitante">
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                {os.empresa && onOpenEmpresa ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left text-sm"
                    onClick={() => onOpenEmpresa(os.empresa as EmpresaSupabase)}
                  >
                    {getEmpresaNome(os)}
                  </button>
                ) : (
                  <p className="text-sm font-medium">{getEmpresaNome(os)}</p>
                )}
              </div>
            </InfoCard>

            <InfoCard title="Equipamento">
              <Field label="Tipo">
                {os.equipamento && onOpenEquipamento ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium text-left"
                    onClick={() =>
                      onOpenEquipamento(os.equipamento as EquipamentoSupabase)
                    }
                  >
                    {getEquipamentoTipo(os)}
                  </button>
                ) : (
                  getEquipamentoTipo(os)
                )}
              </Field>
              <Field label="Fabricante">{os.equipamento?.fabricante || "—"}</Field>
              <Field label="Modelo">{os.equipamento?.modelo || "—"}</Field>
              <Field label="Número de série">
                {os.equipamento?.numero_serie || "—"}
              </Field>
              <Field label="Patrimônio">{os.equipamento?.patrimonio || "—"}</Field>
              <Field label="TAG">{os.equipamento?.tag || "—"}</Field>
              <Field label="Setor">{os.equipamento?.setor || "—"}</Field>
            </InfoCard>
          </div>

          <InfoCard title="Serviço">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {!preventiva && (
                <Field label="Tipo de OS">{getTipoServico(os)}</Field>
              )}
              <Field label="Técnico executor">{getTecnico(os)}</Field>
              <Field label="Estado">{estado}</Field>
              <Field label="Status interno">{os.status_sistema || "—"}</Field>
            </div>

            <div className="pt-2 space-y-4">
              {!preventiva && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Problema relatado
                    </h4>
                    <TextBlock value={os.problema_relatado} />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Origem do problema
                    </h4>
                    <TextBlock value={os.origem_problema} />
                  </div>
                </>
              )}

              {!isSolicitante && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Descrição do serviço
                  </h4>
                  <TextBlock value={os.descricao_servico} />
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Observações
                </h4>
                <TextBlock value={os.observacoes} />
              </div>
            </div>
          </InfoCard>
          {checklistPreventiva && (
            <InfoCard title="Checklist de Preventiva">
              <Field label="Procedimento">
                {checklistPreventiva.titulo_procedimento}
              </Field>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-center px-3 py-2 font-medium w-14">Item</th>
                      <th className="text-left px-3 py-2 font-medium">Descricao</th>
                      <th className="text-center px-3 py-2 font-medium">Conforme</th>
                      <th className="text-center px-3 py-2 font-medium">Nao Conforme</th>
                      <th className="text-center px-3 py-2 font-medium">N/A</th>
                      <th className="text-left px-3 py-2 font-medium">Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistItens.map((item, index) => {
                      const marcadores = getChecklistMarks(item.resposta);

                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">{item.descricao}</td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {marcadores.conforme}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {marcadores.naoConforme}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {marcadores.naoAplica}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {checklistObservacao(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <Field label="Resultado Geral">
                  {formatResultadoGeralChecklist(checklistPreventiva.resultado_geral)}
                </Field>
                <Field label="Validade da Preventiva">
                  {formatDate(checklistPreventiva.data_validade)}
                </Field>
                <Field label="Validade padrao">
                  {checklistPreventiva.validade_meses} meses
                </Field>
              </div>

              {checklistPreventiva.observacoes && (
                <TextBlock value={checklistPreventiva.observacoes} />
              )}
            </InfoCard>
          )}


          <InfoCard title="Acessórios">
            {acessoriosUnicos.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {acessoriosUnicos.map((acessorio) => (
                  <li
                    key={acessorio.id || acessorio.descricao}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {acessorio.descricao}
                      </p>
                      {acessorio.observacoes && (
                        <p className="text-muted-foreground">
                          {acessorio.observacoes}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      Qtd. {acessorio.quantidade}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum acessório informado.
              </p>
            )}
          </InfoCard>

          <InfoCard title="Histórico">
            {historicoOrdenado.length > 0 ? (
              <div className="space-y-2">
                {historicoOrdenado.map((item) => (
                  <div key={item.id} className="border rounded-md p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {formatAcao(item.acao)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    {item.observacao && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                        {item.observacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum histórico registrado.
              </p>
            )}
          </InfoCard>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PreventivaChecklistDialog
      open={checklistOpen}
      onOpenChange={setChecklistOpen}
      osExistenteId={os.id}
      modo="usar_os_existente"
    />
    </>
  );
};

export default OrdemServicoDetalhesDialog;

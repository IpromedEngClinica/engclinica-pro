import {
  CalendarCheck,
  ClipboardList,
  Cpu,
  FileWarning,
  PackageCheck,
  Pencil,
  Ruler,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import CalibracaoExecucaoFormDialog from "@/components/CalibracaoExecucaoFormDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EquipamentoHistoricoSection from "@/components/EquipamentoHistoricoSection";
import EquipamentoFormDialog from "@/components/EquipamentoFormDialog";
import LaudoObsolescenciaFormDialog from "@/components/LaudoObsolescenciaFormDialog";
import ModalActionsBar from "@/components/ModalActionsBar";
import OrdemServicoFormDialog from "@/components/OrdemServicoFormDialog";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import ProtocoloRecolhimentoDialog from "@/components/ProtocoloRecolhimentoDialog";
import { toast } from "@/hooks/use-toast";
import {
  procedimentosPreventivaService,
  type ProcedimentoPreventiva,
} from "@/services/procedimentosPreventivaService";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { getBloqueioCriacaoCalibracao } from "@/utils/equipamentoCalibracao";

interface EquipamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: EquipamentoSupabase | null;
  onEditar?: (equipamento: EquipamentoSupabase) => void;
  onCriarOS?: (equipamento: EquipamentoSupabase) => void;
  onCriarPreventiva?: (equipamento: EquipamentoSupabase) => void;
  onCriarProtocoloRecolhimento?: (equipamento: EquipamentoSupabase) => void;
  onCriarLaudo?: (equipamento: EquipamentoSupabase) => void;
  onCriarCalibracao?: (equipamento: EquipamentoSupabase) => void;
}

const getTipoEquipamento = (equipamento: EquipamentoSupabase) =>
  equipamento.tipo_equipamento?.nome ||
  equipamento.tipo_texto ||
  "Equipamento";

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome || equipamento.empresa?.nome_fantasia ||
  "Não informado";

const getEquipamentoStatusLabel = (equipamento: EquipamentoSupabase) => {
  if (equipamento.ativo === false) {
    return "Desativado";
  }

  return equipamento.status || "Ativo";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: string | boolean | null;
}) => {
  const display =
    typeof value === "boolean" ? (value ? "Sim" : "Não") : value || "-";

  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className="text-foreground">{display}</span>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg border p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {children}
    </div>
  </section>
);

const EquipamentoDetalhesDialog = ({
  open,
  onOpenChange,
  equipamento,
  onEditar,
  onCriarOS,
  onCriarPreventiva,
  onCriarProtocoloRecolhimento,
  onCriarLaudo,
  onCriarCalibracao,
}: EquipamentoDetalhesDialogProps) => {
  const [editarOpen, setEditarOpen] = useState(false);
  const [osOpen, setOsOpen] = useState(false);
  const [recolhimentoOpen, setRecolhimentoOpen] = useState(false);
  const [preventivaOpen, setPreventivaOpen] = useState(false);
  const [procedimentoPreventiva, setProcedimentoPreventiva] =
    useState<ProcedimentoPreventiva | null>(null);
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [calibracaoOpen, setCalibracaoOpen] = useState(false);

  if (!equipamento) return null;

  const tipo = getTipoEquipamento(equipamento);
  const isAtivo = equipamento.ativo !== false;

  const handleEditar = () => {
    if (onEditar) {
      onEditar(equipamento);
      return;
    }

    setEditarOpen(true);
  };

  const handleCriarOS = () => {
    if (onCriarOS) {
      onCriarOS(equipamento);
      return;
    }

    setOsOpen(true);
  };

  const handleRecolhimento = () => {
    if (onCriarProtocoloRecolhimento) {
      onCriarProtocoloRecolhimento(equipamento);
      return;
    }

    setRecolhimentoOpen(true);
  };

  const handlePreventiva = async () => {
    if (onCriarPreventiva) {
      onCriarPreventiva(equipamento);
      return;
    }

    if (!equipamento.tipo_equipamento_id) {
      toast({
        title: "Tipo de equipamento nao informado.",
        description: "Cadastre o tipo de equipamento antes de criar a preventiva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const procedimento =
        await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(
          equipamento.tipo_equipamento_id
        );

      if (!procedimento) {
        toast({
          title: "Nenhum procedimento preventivo cadastrado.",
          description: "Cadastre um procedimento para este tipo de equipamento.",
          variant: "destructive",
        });
        return;
      }

      setProcedimentoPreventiva(procedimento);
      setPreventivaOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao buscar procedimento preventivo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleLaudo = () => {
    if (onCriarLaudo) {
      onCriarLaudo(equipamento);
      return;
    }

    setLaudoOpen(true);
  };

  const handleCriarCalibracao = () => {
    const bloqueio = getBloqueioCriacaoCalibracao(equipamento);
    if (bloqueio) {
      toast({
        title: "Nao foi possivel criar calibracao",
        description: bloqueio,
        variant: "destructive",
      });
      return;
    }

    if (onCriarCalibracao) {
      onCriarCalibracao(equipamento);
      return;
    }

    setCalibracaoOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              {tipo}
            </DialogTitle>
          </DialogHeader>

          <ModalActionsBar>
            <Button variant="outline" size="sm" onClick={handleEditar}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={handleCriarCalibracao}>
              <Ruler className="w-4 h-4 mr-2" />
              {"Criar Calibra\u00e7\u00e3o"}
            </Button>
            {isAtivo && (
              <>
                <Button variant="outline" size="sm" onClick={handleCriarOS}>
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Criar OS
                </Button>
                <Button variant="outline" size="sm" onClick={handleRecolhimento}>
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Recolhimento
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreventiva}>
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Preventiva
                </Button>
              </>
            )}
            <Button size="sm" onClick={handleLaudo}>
              <FileWarning className="w-4 h-4 mr-2" />
              Laudo
            </Button>
          </ModalActionsBar>

          <div className="space-y-4">
          <Section title="Dados do Equipamento">
            <Field
              label="Nº do equipamento"
              value={String(equipamento.numero_cadastro).padStart(3, "0")}
            />
            <Field label="Tipo" value={tipo} />
            <Field label="Status" value={getEquipamentoStatusLabel(equipamento)} />
            <Field label="Proprietário" value={getEmpresaNome(equipamento)} />
            <Field label="Fabricante" value={equipamento.fabricante} />
            <Field label="Modelo" value={equipamento.modelo} />
            <Field label="TAG" value={equipamento.tag} />
            <Field label="Número de Série" value={equipamento.numero_serie} />
            <Field label="Patrimonio" value={equipamento.patrimonio} />
            <Field label="Setor" value={equipamento.setor} />
          </Section>

          <Section title="Preventiva e Calibração">
            <Field
              label="Última Preventiva"
              value={formatDate(equipamento.data_ultima_preventiva)}
            />
            <Field
              label="Próxima Preventiva"
              value={formatDate(equipamento.data_proxima_preventiva)}
            />
            <Field
              label="Última Calibração"
              value={formatDate(equipamento.data_ultima_calibracao)}
            />
            <Field
              label="Próxima Calibração"
              value={formatDate(equipamento.data_proxima_calibracao)}
            />
          </Section>

          {equipamento.observacoes && (
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Observações
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {equipamento.observacoes}
              </p>
            </section>
          )}

          <EquipamentoHistoricoSection equipamentoId={equipamento.id} />
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EquipamentoFormDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        mode="edit"
        equipamento={equipamento}
      />

      <OrdemServicoFormDialog
        open={osOpen}
        onOpenChange={setOsOpen}
        mode="create"
        fromEquipamento={{
          id: equipamento.id,
          empresaId: equipamento.empresa_id,
        }}
      />

      <ProtocoloRecolhimentoDialog
        open={recolhimentoOpen}
        onOpenChange={setRecolhimentoOpen}
        equipamento={equipamento}
      />

      <PreventivaChecklistDialog
        open={preventivaOpen}
        onOpenChange={(value) => {
          setPreventivaOpen(value);
          if (!value) setProcedimentoPreventiva(null);
        }}
        equipamento={equipamento}
        procedimento={procedimentoPreventiva}
      />

      <LaudoObsolescenciaFormDialog
        open={laudoOpen}
        onOpenChange={setLaudoOpen}
        initialEmpresaId={equipamento.empresa_id}
        initialEquipamentoId={equipamento.id}
      />

      <CalibracaoExecucaoFormDialog
        open={calibracaoOpen}
        onOpenChange={setCalibracaoOpen}
        empresaInicialId={equipamento.empresa_id}
        equipamentoInicialId={equipamento.id}
      />
    </>
  );
};

export default EquipamentoDetalhesDialog;

import { useEffect, useState } from "react";
import { Loader2, Play, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConcluirItemExecucao } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import { equipamentosService, type EquipamentoSupabase } from "@/services/equipamentosService";
import type { PlanoExecucao, PlanoExecucaoItem } from "@/services/planosService";
import { procedimentosPreventivaService, type ProcedimentoPreventiva } from "@/services/procedimentosPreventivaService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visita: PlanoExecucao;
  itens: PlanoExecucaoItem[];
};

const label = (item?: PlanoExecucaoItem) => [
  item?.equipamento?.tipo_equipamento?.nome || item?.equipamento?.tipo_texto || "Equipamento",
  item?.equipamento?.fabricante,
  item?.equipamento?.modelo,
  item?.equipamento?.numero_serie ? `NS ${item.equipamento.numero_serie}` : null,
].filter(Boolean).join(" - ");

const PlanoFilaPreventivasDialog = ({ open, onOpenChange, visita, itens }: Props) => {
  const navigate = useNavigate();
  const concluir = useConcluirItemExecucao();
  const [index, setIndex] = useState(0);
  const [equipamento, setEquipamento] = useState<EquipamentoSupabase | null>(null);
  const [procedimento, setProcedimento] = useState<ProcedimentoPreventiva | null>(null);
  const [loading, setLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const item = itens[index];

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, itens]);

  useEffect(() => {
    if (!open || !item) return;
    let active = true;
    setLoading(true);
    setEquipamento(null);
    setProcedimento(null);
    equipamentosService.buscarPorId(item.equipamento_id).then(async (loaded) => {
      if (!loaded.tipo_equipamento_id) throw new Error("O equipamento nao possui tipo cadastrado.");
      const proc = await procedimentosPreventivaService.buscarAtivoPorTipoEquipamento(loaded.tipo_equipamento_id);
      if (!active) return;
      setEquipamento(loaded);
      setProcedimento(proc);
    }).catch((error) => active && toast({ title: "Erro ao carregar preventiva", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [item, open]);

  const avancar = () => {
    if (index + 1 >= itens.length) {
      onOpenChange(false);
      toast({ title: "Fila de preventivas finalizada." });
    } else setIndex((current) => current + 1);
  };
  const executar = async () => {
    if (!item || !procedimento) return;
    if (!item.os_id) {
      toast({ title: "Abra a OS preventiva antes de executar o checklist.", variant: "destructive" });
      return;
    }
    try {
      setChecklistOpen(true);
    } catch (error) {
      toast({ title: "Erro ao iniciar preventiva", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };
  const salvar = async (os: { id: string }) => {
    if (!item) return;
    try {
      await concluir.mutateAsync({ id: item.id, payload: { osId: os.id } });
      setChecklistOpen(false);
      avancar();
    } catch (error) {
      toast({ title: "Erro ao concluir item", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    }
  };

  if (!item) return null;
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
      <DialogHeader><DialogTitle>Fila de preventivas</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Equipamento {index + 1} de {itens.length}</p>
        <p className="font-medium">{label(item)}</p>
        <p className="text-sm">Setor: {item.setor?.nome || "Sem setor"}</p>
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!loading && !procedimento && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Checklist nao cadastrado para este tipo de equipamento. <Button variant="link" className="h-auto p-0 text-amber-900" onClick={() => navigate("/procedimentos")}>Cadastrar procedimento</Button></div>}
      </div>
      <DialogFooter><Button variant="outline" onClick={avancar}><SkipForward className="mr-2 h-4 w-4" />Pular</Button><Button disabled={loading || !procedimento} onClick={executar}><Play className="mr-2 h-4 w-4" />Executar checklist</Button></DialogFooter>
    </DialogContent></Dialog>
    <PreventivaChecklistDialog open={checklistOpen} onOpenChange={setChecklistOpen} equipamento={equipamento} procedimento={procedimento} ordemServicoId={item.os_id} dataAbertura={visita.data_abertura_preventiva} dataFechamento={visita.data_fechamento_preventiva} onSaved={salvar} />
  </>;
};

export default PlanoFilaPreventivasDialog;

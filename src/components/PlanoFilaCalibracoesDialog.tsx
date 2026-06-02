import { useEffect, useMemo, useState } from "react";
import { Play, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CalibracaoExecucaoFormDialog from "@/components/CalibracaoExecucaoFormDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCalibracaoProcedimentos } from "@/hooks/useCalibracaoProcedimentos";
import { useConcluirItemExecucao } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import { calibracaoExecucoesService, type CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import type { PlanoExecucao, PlanoExecucaoItem } from "@/services/planosService";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; visita: PlanoExecucao; itens: PlanoExecucaoItem[] };
const label = (item?: PlanoExecucaoItem) => [item?.equipamento?.tipo_equipamento?.nome || item?.equipamento?.tipo_texto || "Equipamento", item?.equipamento?.fabricante, item?.equipamento?.modelo, item?.equipamento?.numero_serie ? `NS ${item.equipamento.numero_serie}` : null].filter(Boolean).join(" - ");

const PlanoFilaCalibracoesDialog = ({ open, onOpenChange, visita, itens }: Props) => {
  const navigate = useNavigate();
  const concluir = useConcluirItemExecucao();
  const { data: procedimentos = [] } = useCalibracaoProcedimentos();
  const [index, setIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [execucao, setExecucao] = useState<CalibracaoExecucao | null>(null);
  const item = itens[index];
  const compativel = useMemo(() => procedimentos.some((proc) => proc.ativo && proc.tipo_equipamento_id === item?.equipamento?.tipo_equipamento_id), [item?.equipamento?.tipo_equipamento_id, procedimentos]);

  useEffect(() => { if (open) setIndex(0); }, [itens, open]);
  const avancar = () => {
    if (index + 1 >= itens.length) {
      onOpenChange(false);
      toast({ title: "Fila de calibracoes finalizada." });
    } else setIndex((current) => current + 1);
  };
  const executar = async () => {
    if (!item) return;
    if (!item.calibracao_execucao_id) {
      toast({ title: "Abra a calibracao antes de preencher as leituras.", variant: "destructive" });
      return;
    }
    try {
      setExecucao(await calibracaoExecucoesService.buscarExecucaoPorId(item.calibracao_execucao_id));
      setFormOpen(true);
    }
    catch (error) { toast({ title: "Erro ao iniciar calibracao", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };
  const salvar = async (calibracao: { id: string }) => {
    if (!item) return;
    try { await concluir.mutateAsync({ id: item.id, payload: { calibracaoExecucaoId: calibracao.id } }); setFormOpen(false); avancar(); }
    catch (error) { toast({ title: "Erro ao concluir item", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" }); }
  };

  if (!item) return null;
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
      <DialogHeader><DialogTitle>Fila de calibracoes</DialogTitle></DialogHeader>
      <div className="space-y-3"><p className="text-sm text-muted-foreground">Equipamento {index + 1} de {itens.length}</p><p className="font-medium">{label(item)}</p><p className="text-sm">Setor: {item.setor?.nome || "Sem setor"}</p>{!compativel && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Procedimento de calibracao nao cadastrado. <Button variant="link" className="h-auto p-0 text-amber-900" onClick={() => navigate("/calibracao/procedimentos")}>Cadastrar procedimento</Button></div>}</div>
      <DialogFooter><Button variant="outline" onClick={avancar}><SkipForward className="mr-2 h-4 w-4" />Pular</Button><Button disabled={!compativel} onClick={executar}><Play className="mr-2 h-4 w-4" />Executar calibracao</Button></DialogFooter>
    </DialogContent></Dialog>
    <CalibracaoExecucaoFormDialog open={formOpen} onOpenChange={setFormOpen} execucao={execucao} empresaInicialId={visita.plano?.empresa_id} equipamentoInicialId={item.equipamento_id} dataCalibracaoInicial={visita.data_realizacao_calibracao} dataEmissaoInicial={visita.data_emissao_calibracao} origemFluxo="plano" planoId={visita.plano_id} planoExecucaoId={visita.id} planoExecucaoItemId={item.id} onSaved={salvar} />
  </>;
};

export default PlanoFilaCalibracoesDialog;

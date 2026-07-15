import { ArrowLeft, CalendarClock, CalendarDays, CheckCircle2, History, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlanoCicloFormDialog from "@/components/PlanoCicloFormDialog";
import PlanoDadosGeraisTab from "@/components/PlanoDadosGeraisTab";
import PlanoEquipamentosTab from "@/components/PlanoEquipamentosTab";
import PlanoExecucaoTab from "@/components/PlanoExecucaoTab";
import PlanoFormDialog from "@/components/PlanoFormDialog";
import PlanoHistoricoTab from "@/components/PlanoHistoricoTab";
import PlanoRelatorioAnualDialog from "@/components/PlanoRelatorioAnualDialog";
import PlanoRelatoriosAnuaisDialog from "@/components/PlanoRelatoriosAnuaisDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConcluirCicloPlano, usePlano, usePlanoCicloAtual } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";

const PlanoDetalhes = () => {
  const { planoId } = useParams();
  const navigate = useNavigate();
  const { data: plano, isLoading, isError, error } = usePlano(planoId);
  const { data: cicloAtual } = usePlanoCicloAtual(planoId);
  const concluirCiclo = useConcluirCicloPlano();
  const [formOpen, setFormOpen] = useState(false);
  const [cicloOpen, setCicloOpen] = useState(false);
  const [editandoCiclo, setEditandoCiclo] = useState(false);
  const [relatorioAnualOpen, setRelatorioAnualOpen] = useState(false);
  const [relatoriosAnuaisOpen, setRelatoriosAnuaisOpen] = useState(false);
  const [tab, setTab] = useState("dados");

  if (isLoading) return <div className="p-8">Carregando plano...</div>;
  if (isError || !plano) return <div className="p-8 text-destructive">{error instanceof Error ? error.message : "Plano nao encontrado."}</div>;

  const handleConcluirCiclo = async () => {
    if (!cicloAtual) {
      toast({ title: "Nao ha ciclo aberto para concluir." });
      return;
    }
    try {
      await concluirCiclo.mutateAsync({ cicloId: cicloAtual.id, planoId: plano.id });
      toast({ title: "Ciclo concluido e enviado para o historico." });
      setTab("historico");
    } catch (error) {
      toast({
        title: "Erro ao concluir ciclo",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={plano.titulo} description={plano.empresa?.nome || plano.empresa?.nome_fantasia || ""}>
        <Button variant="outline" onClick={() => navigate("/planos")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Planos</Button>
        <Button variant="outline" onClick={() => setRelatorioAnualOpen(true)}><CalendarDays className="mr-2 h-4 w-4" />Gerar relatorio anual</Button>
        <Button variant="outline" onClick={() => setRelatoriosAnuaisOpen(true)}><History className="mr-2 h-4 w-4" />Relatorios anuais</Button>
        <Button variant="outline" onClick={() => setFormOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
        {cicloAtual && (
          <Button variant="outline" onClick={() => { setEditandoCiclo(true); setCicloOpen(true); }}>
            <CalendarClock className="mr-2 h-4 w-4" />Editar datas do ciclo
          </Button>
        )}
        <Button onClick={() => { setEditandoCiclo(false); setCicloOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo Ciclo</Button>
        <Button variant="outline" disabled={concluirCiclo.isPending} onClick={handleConcluirCiclo}><CheckCircle2 className="mr-2 h-4 w-4" />Concluir Ciclo</Button>
      </PageHeader>

      <PlanoFormDialog open={formOpen} onOpenChange={setFormOpen} plano={plano} />
      <PlanoCicloFormDialog
        open={cicloOpen}
        onOpenChange={(open) => { setCicloOpen(open); if (!open) setEditandoCiclo(false); }}
        plano={plano}
        ciclo={editandoCiclo ? cicloAtual : null}
        onSaved={() => setTab("execucao")}
      />
      <PlanoRelatorioAnualDialog open={relatorioAnualOpen} onOpenChange={setRelatorioAnualOpen} planoId={plano.id} />
      <PlanoRelatoriosAnuaisDialog open={relatoriosAnuaisOpen} onOpenChange={setRelatoriosAnuaisOpen} planoId={plano.id} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="execucao">Execucao</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>
        <TabsContent value="dados"><PlanoDadosGeraisTab plano={plano} /></TabsContent>
        <TabsContent value="equipamentos"><PlanoEquipamentosTab plano={plano} /></TabsContent>
        <TabsContent value="execucao"><PlanoExecucaoTab planoId={plano.id} onNovoCiclo={() => setCicloOpen(true)} /></TabsContent>
        <TabsContent value="historico"><PlanoHistoricoTab planoId={plano.id} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PlanoDetalhes;

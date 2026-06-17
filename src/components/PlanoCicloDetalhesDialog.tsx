import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanoCicloDetalhes } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { PlanoCicloDetalhes, PlanoCicloItem } from "@/services/planosService";
import { gerarPdfCalibracaoCertificado } from "@/utils/gerarPdfCalibracaoCertificado";
import { gerarPdfOrdemServico } from "@/utils/gerarPdfOrdemServico";
import { gerarPdfRelatorioCicloPlano } from "@/utils/gerarPdfRelatorioCicloPlano";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTimeValue, formatDateValue } from "@/utils/planoDatas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId?: string | null;
};

const equipamentoNome = (item: PlanoCicloItem) =>
  [
    item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento",
    item.equipamento?.fabricante,
    item.equipamento?.modelo,
  ].filter(Boolean).join(" - ");

const getChecklist = (osId: string | null, detalhes: PlanoCicloDetalhes) => {
  if (!osId) return null;
  const os = detalhes.ordensPreventivas.find((item) => item.id === osId);
  const checklist = os?.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const isPreventivaConforme = (item: PlanoCicloItem, detalhes: PlanoCicloDetalhes) => {
  const checklist = getChecklist(item.os_id, detalhes);
  if (!checklist) return false;
  const itens = checklist.itens || [];
  const tecnicos = itens.filter((resposta) => resposta.tipo_resposta !== "aprovacao_uso");
  const aprovacao = itens.find((resposta) => resposta.tipo_resposta === "aprovacao_uso");
  return tecnicos.length > 0 &&
    tecnicos.every((resposta) => resposta.resposta === "conforme" || resposta.resposta === "nao_aplica") &&
    aprovacao?.resposta === "aprovado";
};

const PlanoCicloDetalhesDialog = ({ cicloId, onOpenChange, open }: Props) => {
  const { usuario } = useAuth();
  const { data: detalhes, isLoading } = usePlanoCicloDetalhes(open ? cicloId || undefined : undefined);

  const gerarRelatorio = async () => {
    if (!detalhes) return;
    try {
      await gerarPdfRelatorioCicloPlano(detalhes);
    } catch (error) {
      toast({
        title: "Erro ao gerar relatorio",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirPdfOs = async (osId: string) => {
    const os = detalhes?.ordensPreventivas.find((item) => item.id === osId);
    if (!os) return;
    await gerarPdfOrdemServico(
      usuario?.perfil === "solicitante"
        ? { ...os, descricao_servico: null }
        : os
    );
  };

  const abrirPdfCalibracao = async (execucaoId: string) => {
    const execucao = detalhes?.calibracoes.find((item) => item.id === execucaoId);
    if (!execucao) return;
    await gerarPdfCalibracaoCertificado(execucao);
  };

  const ciclo = detalhes?.ciclo;
  const itens = ciclo?.itens || [];
  const equipamentosPrevistos = new Set(itens.map((item) => item.equipamento_id)).size;
  const preventivasRealizadas = itens.filter((item) => item.tipo_servico === "preventiva" && item.status === "concluido").length;
  const preventivasConformes = detalhes
    ? itens.filter((item) => item.tipo_servico === "preventiva" && item.status === "concluido" && isPreventivaConforme(item, detalhes)).length
    : 0;
  const naoLocalizados = new Set(itens.filter((item) => item.status === "nao_localizado").map((item) => item.equipamento_id)).size;
  const calibracoesRealizadas = itens.filter((item) => item.tipo_servico === "calibracao" && item.status === "concluido").length;
  const segurancaRealizada = itens.filter((item) => item.tipo_servico === "seguranca_eletrica" && item.status === "concluido").length;
  const setores = Array.from(new Set(itens.map((item) => item.setor?.nome_snapshot || "Sem setor")));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Detalhes do ciclo</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando ciclo...</p>}
        {!isLoading && detalhes && ciclo && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-4">
              <Info label="Plano" value={detalhes.plano.titulo} />
              <Info label="Cliente" value={detalhes.plano.empresa?.nome_fantasia || detalhes.plano.empresa?.nome || "-"} />
              <Info label="Ciclo" value={ciclo.titulo} />
              <Info label="Situacao" value={ciclo.status} />
              <Info label="Execucao" value={formatDateTimeValue(ciclo.data_abertura)} />
              <Info label="Fechamento" value={formatDateTimeValue(ciclo.data_fechamento_real || ciclo.data_fechamento_prevista)} />
              <Info label="Responsavel" value={detalhes.plano.responsavel?.nome || "-"} />
            </div>

            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
              <Metric label="Equipamentos previstos" value={equipamentosPrevistos} />
              <Metric label="Preventivas realizadas" value={preventivasRealizadas} />
              <Metric label="Conformes" value={preventivasConformes} />
              <Metric label="Nao conformes" value={Math.max(0, preventivasRealizadas - preventivasConformes)} />
              <Metric label="Nao localizados" value={naoLocalizados} />
              <Metric label="Calibracoes realizadas" value={calibracoesRealizadas} />
              <Metric label="Seguranca eletrica" value={segurancaRealizada} />
            </div>

            <Tabs defaultValue="resumo">
              <TabsList>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="setores">Setores</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-3">
                <TabelaItens itens={itens} />
              </TabsContent>

              <TabsContent value="setores" className="mt-3 space-y-3">
                {setores.map((setor) => (
                  <div key={setor} className="rounded-md border">
                    <div className="border-b bg-muted/30 px-3 py-2 font-medium">{setor}</div>
                    <TabelaItens itens={itens.filter((item) => (item.setor?.nome_snapshot || "Sem setor") === setor)} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="documentos" className="mt-3">
                <div className="mb-3">
                  <Button onClick={gerarRelatorio}>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar relatorio consolidado do ciclo
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/40"><Th>Equipamento</Th><Th>Tipo</Th><Th>Documento</Th><Th>Acoes</Th></tr></thead>
                    <tbody>
                      {itens.filter((item) => item.os_id || item.calibracao_execucao_id).map((item) => (
                        <tr key={item.id} className="border-t">
                          <Td>{equipamentoNome(item)}</Td>
                          <Td>{item.tipo_servico}</Td>
                          <Td>{item.os_id ? "OS preventiva" : "Certificado de calibracao"}</Td>
                          <Td>
                            {item.os_id && <Button size="sm" variant="outline" onClick={() => abrirPdfOs(item.os_id as string)}>Visualizar OS</Button>}
                            {item.calibracao_execucao_id && <Button size="sm" variant="outline" onClick={() => abrirPdfCalibracao(item.calibracao_execucao_id as string)}>Visualizar certificado</Button>}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);

const TabelaItens = ({ itens }: { itens: PlanoCicloItem[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/40">
          <Th>Equipamento</Th>
          <Th>Setor</Th>
          <Th>Servico</Th>
          <Th>Status</Th>
          <Th>Documento</Th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={item.id} className="border-t">
            <Td>{equipamentoNome(item)}</Td>
            <Td>{item.setor?.nome_snapshot || "Sem setor"}</Td>
            <Td>{item.tipo_servico}</Td>
            <Td><Badge variant="outline">{item.status}</Badge></Td>
            <Td>{item.os_id ? "OS vinculada" : item.calibracao_execucao_id ? "Certificado vinculado" : "-"}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">{children}</th>
);
const Td = ({ children }: { children?: React.ReactNode }) => (
  <td className="whitespace-nowrap px-3 py-2 align-top">{children}</td>
);

export default PlanoCicloDetalhesDialog;

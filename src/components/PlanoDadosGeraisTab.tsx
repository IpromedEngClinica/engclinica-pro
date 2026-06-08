import { Progress } from "@/components/ui/progress";
import { usePlanoCicloAtual } from "@/hooks/usePlanos";
import type { Plano } from "@/services/planosService";
import { getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";

type Props = {
  plano: Plano;
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const PlanoDadosGeraisTab = ({ plano }: Props) => {
  const equipamentos = plano.equipamentos || [];
  const { data: cicloAtual } = usePlanoCicloAtual(plano.id);
  const itensCiclo = cicloAtual?.itens || [];

  const preventiva = equipamentos.filter((item) => item.executar_preventiva).length;
  const calibracao = equipamentos.filter((item) => item.executar_calibracao).length;
  const seguranca = equipamentos.filter((item) => item.executar_seguranca_eletrica).length;
  const concluidos = itensCiclo.filter((item) => item.status === "concluido").length;
  const pendentes = itensCiclo.filter((item) => item.status === "pendente").length;
  const abertos = itensCiclo.filter((item) => item.status === "aberto").length;
  const cancelados = itensCiclo.filter((item) => item.status === "cancelado").length;
  const naoLocalizados = itensCiclo.filter((item) => item.status === "nao_localizado").length;
  const resolvidos = concluidos + cancelados + naoLocalizados;
  const progresso = itensCiclo.length ? Math.round((resolvidos / itensCiclo.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Info label="Cliente" value={plano.empresa?.nome_fantasia || plano.empresa?.nome || "-"} />
        <Info label="Responsavel" value={plano.responsavel?.nome || "-"} />
        <Info label="Data inicial" value={formatDate(plano.data_inicial)} />
        <Info label="Frequencia" value={getPlanoFrequenciaLabel(plano.frequencia)} />
        <Info label="Prazo" value={`${plano.prazo_execucao_dias} dia(s)`} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold">Ciclo atual</h3>
        {cicloAtual ? (
          <div className="grid gap-3 md:grid-cols-5">
            <Info label="Inicia em" value={formatDate(cicloAtual.data_abertura)} />
            <Info label="Prazo" value={`${plano.prazo_execucao_dias} dia(s)`} />
            <Info label="Termina em" value={formatDate(cicloAtual.data_fechamento_prevista)} />
            <Info label="Situacao" value={cicloAtual.status} />
            <Info label="Progresso" value={`${resolvidos} / ${itensCiclo.length} resolvidos`} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum ciclo aberto. Crie um ciclo para iniciar a execucao.</p>
        )}
        <div className="mt-4">
          <Progress value={progresso} />
          <p className="mt-1 text-xs text-muted-foreground">{resolvidos} / {itensCiclo.length} resolvidos</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Info label="Total equipamentos" value={String(equipamentos.length)} />
        <Info label="Preventivas previstas" value={String(preventiva)} />
        <Info label="Calibracoes previstas" value={String(calibracao)} />
        <Info label="Seguranca eletrica prevista" value={String(seguranca)} />
        <Info label="Itens concluidos" value={String(concluidos)} />
        <Info label="Itens pendentes" value={String(pendentes)} />
        <Info label="Itens abertos" value={String(abertos)} />
        <Info label="Nao localizados" value={String(naoLocalizados)} />
        <Info label="Itens cancelados" value={String(cancelados)} />
      </div>

      {plano.descricao && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">Descricao</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{plano.descricao}</p>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);

export default PlanoDadosGeraisTab;

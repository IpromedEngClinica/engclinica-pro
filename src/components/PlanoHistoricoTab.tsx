import { CalendarDays, ChevronDown, Eye, Files } from "lucide-react";
import { useState } from "react";
import PlanoCicloDetalhesDialog from "@/components/PlanoCicloDetalhesDialog";
import PlanoRelatorioAnualDialog from "@/components/PlanoRelatorioAnualDialog";
import PlanoRelatorioCicloDialog from "@/components/PlanoRelatorioCicloDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlanoHistorico } from "@/hooks/usePlanos";
import type { PlanoCiclo } from "@/services/planosService";

type Props = {
  planoId: string;
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const contar = (ciclo: PlanoCiclo, status?: string) =>
  (ciclo.itens || []).filter((item) => !status || item.status === status).length;

const PlanoHistoricoTab = ({ planoId }: Props) => {
  const { data: ciclos = [], isLoading } = usePlanoHistorico(planoId);
  const [selectedCicloId, setSelectedCicloId] = useState<string | null>(null);
  const [relatorioCicloId, setRelatorioCicloId] = useState<string | null>(null);
  const [relatorioAnualOpen, setRelatorioAnualOpen] = useState(false);
  const [relatorioAnualModo, setRelatorioAnualModo] = useState<"cronograma" | "cronograma_completo">("cronograma");
  const historico = ciclos.filter((ciclo) => ciclo.status !== "aberto");

  const abrirRelatorioCompleto = (cicloId: string) => {
    setRelatorioCicloId(cicloId);
  };

  const abrirRelatorioAnual = (modo: "cronograma" | "cronograma_completo") => {
    setRelatorioAnualModo(modo);
    setRelatorioAnualOpen(true);
  };

  return (
    <>
      <PlanoCicloDetalhesDialog
        open={Boolean(selectedCicloId)}
        cicloId={selectedCicloId}
        onOpenChange={(open) => {
          if (!open) setSelectedCicloId(null);
        }}
      />
      <PlanoRelatorioCicloDialog
        open={Boolean(relatorioCicloId)}
        cicloId={relatorioCicloId}
        onOpenChange={(open) => {
          if (!open) setRelatorioCicloId(null);
        }}
      />
      <PlanoRelatorioAnualDialog
        open={relatorioAnualOpen}
        onOpenChange={setRelatorioAnualOpen}
        planoId={planoId}
        modoInicial={relatorioAnualModo}
      />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <Th>Ciclo</Th>
              <Th>Data prevista</Th>
              <Th>Abertura</Th>
              <Th>Fechamento</Th>
              <Th>Total de itens</Th>
              <Th>Concluidos</Th>
              <Th>Nao conformes</Th>
              <Th>Nao localizados</Th>
              <Th>Situacao</Th>
              <Th>Acoes</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><Td>Carregando historico...</Td></tr>}
            {!isLoading && historico.map((ciclo) => (
              <tr key={ciclo.id} className="border-t">
                <Td>{ciclo.titulo}</Td>
                <Td>{formatDate(ciclo.data_prevista)}</Td>
                <Td>{formatDate(ciclo.data_abertura)}</Td>
                <Td>{formatDate(ciclo.data_fechamento_real || ciclo.data_fechamento_prevista)}</Td>
                <Td>{contar(ciclo)}</Td>
                <Td>{contar(ciclo, "concluido")}</Td>
                <Td>0</Td>
                <Td>{contar(ciclo, "nao_localizado")}</Td>
                <Td><Badge variant="outline">{statusLabel[ciclo.status]}</Badge></Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedCicloId(ciclo.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Files className="mr-2 h-4 w-4" />
                          Relatório
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirRelatorioCompleto(ciclo.id)}>
                          <Files className="mr-2 h-4 w-4" />
                          Relatório Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => abrirRelatorioAnual("cronograma")}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Somente Cronograma
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => abrirRelatorioAnual("cronograma_completo")}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Cronograma Completo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Td>
              </tr>
            ))}
            {!isLoading && !historico.length && <tr><Td>Nenhum ciclo concluido ou cancelado.</Td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoHistoricoTab;

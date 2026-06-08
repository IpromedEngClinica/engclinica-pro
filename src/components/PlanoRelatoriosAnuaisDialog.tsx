import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRelatoriosAnuaisPlano } from "@/hooks/usePlanos";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const PlanoRelatoriosAnuaisDialog = ({ onOpenChange, open, planoId }: Props) => {
  const { data: relatorios = [], isLoading } = useRelatoriosAnuaisPlano(open ? planoId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>Relatorios anuais</DialogTitle></DialogHeader>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <Th>Periodo</Th>
                <Th>Revisao</Th>
                <Th>Emissao</Th>
                <Th>Validade</Th>
                <Th>Tipo</Th>
                <Th>Arquivo</Th>
                <Th>Acoes</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><Td>Carregando...</Td></tr>}
              {!isLoading && relatorios.map((relatorio) => (
                <tr key={relatorio.id} className="border-t">
                  <Td>{formatDate(relatorio.data_inicio)} a {formatDate(relatorio.data_fim)}</Td>
                  <Td>Revisao {relatorio.revisao}</Td>
                  <Td>{formatDate(relatorio.emitido_em)}</Td>
                  <Td>{formatDate(relatorio.validade_ate)}</Td>
                  <Td>{relatorio.tipo_saida === "cronograma_completo" ? "Completo" : "Cronograma"}</Td>
                  <Td>{relatorio.arquivo_url ? "Disponivel" : "Nao armazenado"}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!relatorio.arquivo_url}
                      onClick={() => relatorio.arquivo_url && window.open(relatorio.arquivo_url, "_blank")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                  </Td>
                </tr>
              ))}
              {!isLoading && !relatorios.length && <tr><Td>Nenhum relatorio anual gerado.</Td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoRelatoriosAnuaisDialog;

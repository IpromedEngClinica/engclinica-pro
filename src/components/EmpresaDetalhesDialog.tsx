import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empresa, useData } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa | null;
  onSelectOS?: (osId: number) => void;
  onSelectEquipamento?: (equipamentoId: number) => void;
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border bg-card shadow-sm">
    <div className="inline-block -mt-3 ml-4 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
      {title}
    </div>
    <div className="p-5 pt-3 space-y-2 text-foreground">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="text-sm">
    <span className="font-semibold text-foreground">{label}: </span>
    <span className="text-foreground">{children || "—"}</span>
  </div>
);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const ESTADOS_FECHADOS = new Set([
  "Fechada",
  "Cancelada",
  "Serviço Finalizado",
  "Liberado Para Entrega",
]);

const EmpresaDetalhesDialog = ({
  open,
  onOpenChange,
  empresa,
  onSelectOS,
  onSelectEquipamento,
}: Props) => {
  const { ordensServico, equipamentos } = useData();

  const osAbertas = useMemo(() => {
    if (!empresa) return [];
    return ordensServico
      .filter((o) => o.solicitante === empresa.nome && !ESTADOS_FECHADOS.has(o.estado))
      .sort((a, b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
  }, [ordensServico, empresa]);

  const equipamentosCliente = useMemo(() => {
    if (!empresa) return [];
    return equipamentos.filter((e) => e.empresa === empresa.nome);
  }, [equipamentos, empresa]);

  if (!empresa) return null;
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl text-foreground">{empresa.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          <Card title="Dados Gerais">
            <Field label="Nome">{empresa.nome}</Field>
            <Field label="Nome Fantasia">{empresa.nomeFantasia}</Field>
            <Field label="Tipo de Cliente">{empresa.tipoCliente}</Field>
            <Field label="CPF/CNPJ">{empresa.cpfCnpj}</Field>
          </Card>

          <Card title="Informações de Contato">
            <Field label="Contato">{empresa.contato}</Field>
            <Field label="E-mail">{empresa.email}</Field>
            <Field label="Telefone">{empresa.telefone}</Field>
            <Field label="Celular">{empresa.celular}</Field>
          </Card>

          <Card title="Localização">
            <Field label="CEP">{empresa.cep}</Field>
            <Field label="Rua">{empresa.rua}</Field>
            <Field label="Número">{empresa.numero}</Field>
            <Field label="Complemento">{empresa.complemento}</Field>
            <Field label="Bairro">{empresa.bairro}</Field>
            <Field label="Cidade">{empresa.cidade}</Field>
            <Field label="Estado">{empresa.estado}</Field>
            <Field label="Localização">{localizacao}</Field>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Histórico e Vínculos</h2>

            <Card title="Ordens de Serviço em Aberto">
              {osAbertas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ordem de serviço em aberto para este cliente.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Número</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo de Serviço</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Responsável</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {osAbertas.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => onSelectOS?.(o.id)}
                        >
                          <td className="px-3 py-2 font-medium text-primary">{o.numero}</td>
                          <td className="px-3 py-2">{o.estado}</td>
                          <td className="px-3 py-2">{o.tipoServico}</td>
                          <td className="px-3 py-2">{o.responsavelTecnico || "—"}</td>
                          <td className="px-3 py-2">{formatDate(o.dataCriacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="mt-6">
              <Card title="Equipamentos Cadastrados">
                {equipamentosCliente.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum equipamento cadastrado para este cliente.
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Modelo</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fabricante</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">TAG</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nº Série</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Setor</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipamentosCliente.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => onSelectEquipamento?.(e.id)}
                          >
                            <td className="px-3 py-2 font-medium text-primary">{e.tipo}</td>
                            <td className="px-3 py-2">{e.modelo}</td>
                            <td className="px-3 py-2">{e.fabricante}</td>
                            <td className="px-3 py-2">{e.tag}</td>
                            <td className="px-3 py-2">{e.serie}</td>
                            <td className="px-3 py-2">{e.setor}</td>
                            <td className="px-3 py-2">{e.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaDetalhesDialog;

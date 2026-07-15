import { Building2, Pencil, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ModalActionsBar from "@/components/ModalActionsBar";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import EmpresaFormDialog from "@/components/EmpresaFormDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import type { EmpresaSupabase } from "@/services/empresasService";
import {
  equipamentosService,
  type EquipamentoSupabase,
} from "@/services/equipamentosService";
import { toast } from "@/hooks/use-toast";
import {
  getEquipamentoLabel,
  getStatusEquipamentoLabel,
} from "@/utils/equipamentoDisplay";

interface EmpresaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaSupabase | null;
  onEditar?: (empresa: EmpresaSupabase) => void;
  onCriarEquipamento?: (empresa: EmpresaSupabase) => void;
}

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: string | boolean | null;
}) => {
  const display =
    typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value || "-";

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

const EmpresaDetalhesDialog = ({
  open,
  onOpenChange,
  empresa,
  onEditar,
  onCriarEquipamento,
}: EmpresaDetalhesDialogProps) => {
  const [buscaEquipamento, setBuscaEquipamento] = useState("");
  const [limiteEquipamentos, setLimiteEquipamentos] = useState<
    10 | 25 | 50 | "todos"
  >(10);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoSupabase | null>(null);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);

  const { data: equipamentosEmpresa = [], isLoading: carregandoEquipamentos } =
    useEquipamentos({
      empresaId: empresa?.id || "__none__",
      statusFiltro: "todos",
    });

  const equipamentosFiltrados = useMemo(() => {
    const termo = buscaEquipamento.trim().toLowerCase();

    if (!termo) return equipamentosEmpresa;

    return equipamentosEmpresa.filter((equipamento) => {
      const campos = [
        equipamento.tipo_equipamento?.nome,
        equipamento.tipo_texto,
        equipamento.modelo,
        equipamento.fabricante,
        equipamento.numero_serie,
        equipamento.patrimonio,
        equipamento.tag,
        equipamento.setor,
      ];

      return campos.some((campo) => campo?.toLowerCase().includes(termo));
    });
  }, [buscaEquipamento, equipamentosEmpresa]);

  const equipamentosVisiveis =
    limiteEquipamentos === "todos"
      ? equipamentosFiltrados
      : equipamentosFiltrados.slice(0, limiteEquipamentos);

  const abrirEquipamento = async (equipamento: EquipamentoSupabase) => {
    try {
      const equipamentoCompleto = await equipamentosService.buscarPorId(
        equipamento.id
      );
      setEquipamentoSelecionado(equipamentoCompleto);
      setEquipamentoDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao abrir equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (!empresa) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {empresa.nome || empresa.nome_fantasia}
            </DialogTitle>
          </DialogHeader>

          <ModalActionsBar>
            {onCriarEquipamento && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCriarEquipamento(empresa)}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Cadastrar Equipamento
              </Button>
            )}
            <Button
              size="sm"
              onClick={() =>
                onEditar ? onEditar(empresa) : setEditarOpen(true)
              }
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </ModalActionsBar>

          <div className="space-y-4">
            <Section title="Dados Gerais">
              <Field label="Nome/Razao Social" value={empresa.nome} />
              <Field label="Nome Fantasia" value={empresa.nome_fantasia} />
              <Field label="Tipo de Cliente" value={empresa.tipo_cliente} />
              <Field label="Relacao" value={empresa.tipo_relacao} />
              <Field label="CPF/CNPJ" value={empresa.cpf_cnpj} />
              <Field
                label="Critério de aceitação em calibrações"
                value={
                  empresa.incluir_criterio_aceitacao_calibracao
                    ? "Habilitado"
                    : "Desabilitado"
                }
              />
              <Field label="Status" value={empresa.ativo} />
            </Section>

            <Section title="Contato">
              <Field label="Contato" value={empresa.contato} />
              <Field label="Telefone" value={empresa.telefone} />
              <Field label="Celular" value={empresa.celular} />
              <Field label="E-mail" value={empresa.email} />
            </Section>

            <Section title="Endereco">
              <Field label="CEP" value={empresa.cep} />
              <Field label="Rua" value={empresa.rua} />
              <Field label="Numero" value={empresa.numero} />
              <Field label="Complemento" value={empresa.complemento} />
              <Field label="Bairro" value={empresa.bairro} />
              <Field label="Cidade" value={empresa.cidade} />
              <Field label="UF" value={empresa.estado} />
            </Section>

            {empresa.observacoes && (
              <section className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Observacoes
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {empresa.observacoes}
                </p>
              </section>
            )}

            <section className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Equipamentos da Empresa
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    className="sm:w-80"
                    placeholder="Buscar por tipo, modelo, serie, patrimonio..."
                    value={buscaEquipamento}
                    onChange={(event) => setBuscaEquipamento(event.target.value)}
                  />
                  <Select
                    value={String(limiteEquipamentos)}
                    onValueChange={(value) =>
                      setLimiteEquipamentos(
                        value === "todos"
                          ? "todos"
                          : (Number(value) as 10 | 25 | 50)
                      )
                    }
                  >
                    <SelectTrigger className="sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {carregandoEquipamentos ? (
                <p className="text-sm text-muted-foreground">
                  Carregando equipamentos...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Tipo
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Modelo
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Fabricante
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          N. Serie
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Patrimonio
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Setor
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosVisiveis.map((equipamento) => (
                        <tr
                          key={equipamento.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-primary hover:underline font-medium text-left"
                              onClick={() => abrirEquipamento(equipamento)}
                            >
                              {getEquipamentoLabel(equipamento)}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {equipamento.modelo || "-"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {equipamento.fabricante || "-"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {equipamento.numero_serie || "-"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {equipamento.patrimonio || "-"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {equipamento.setor || "-"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={
                                equipamento.ativo === false
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-green-50 text-green-700 border-green-200"
                              }
                            >
                              {getStatusEquipamentoLabel(equipamento)}
                            </Badge>
                          </td>
                        </tr>
                      ))}

                      {equipamentosVisiveis.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            Nenhum equipamento encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
          </DialogContent>
      </Dialog>

      <EmpresaFormDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        mode="edit"
        empresa={empresa}
      />

      <EquipamentoDetalhesDialog
        open={equipamentoDialogOpen}
        onOpenChange={(value) => {
          setEquipamentoDialogOpen(value);
          if (!value) setEquipamentoSelecionado(null);
        }}
        equipamento={equipamentoSelecionado}
      />
    </>
  );
};

export default EmpresaDetalhesDialog;

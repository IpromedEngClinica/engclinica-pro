import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCriarEntregaComFechamentoOS } from "@/hooks/useProtocolos";
import {
  OrdemServicoAcessorioSupabase,
  OrdemServicoSupabase,
} from "@/services/ordensServicoService";

interface ProtocoloEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: OrdemServicoSupabase | null;
}

type AcessorioEntrega = {
  id?: string;
  descricao: string;
  quantidade: number;
  conferido: boolean;
  observacoes: string;
};

const toLocalDatetimeValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome_fantasia || os.empresa?.nome || "Não informado";

const getEquipamentoLabel = (os: OrdemServicoSupabase) => {
  if (!os.equipamento) return "Não informado";

  const tipo =
    os.equipamento.tipo_equipamento?.nome ||
    os.equipamento.tipo_texto ||
    "Equipamento";

  return [
    tipo,
    os.equipamento.fabricante,
    os.equipamento.modelo,
    os.equipamento.tag,
  ]
    .filter(Boolean)
    .join(" - ");
};

const getEstado = (os: OrdemServicoSupabase) =>
  os.estado_os?.nome || os.status_sistema || "Não informado";

const normalizarAcessorios = (
  acessorios: OrdemServicoAcessorioSupabase[] | undefined
): AcessorioEntrega[] =>
  (acessorios || [])
    .filter((item) => item.descricao?.trim())
    .map((item) => ({
      id: item.id,
      descricao: item.descricao.trim(),
      quantidade: item.quantidade || 1,
      conferido: true,
      observacoes: item.observacoes || "",
    }));

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value || "-"}</p>
  </div>
);

const ProtocoloEntregaDialog = ({
  open,
  onOpenChange,
  os,
}: ProtocoloEntregaDialogProps) => {
  const criarEntrega = useCriarEntregaComFechamentoOS();

  const [dataEntrega, setDataEntrega] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelDocumento, setResponsavelDocumento] = useState("");
  const [responsavelContato, setResponsavelContato] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [acessorios, setAcessorios] = useState<AcessorioEntrega[]>([]);

  const saving = criarEntrega.isPending;

  useEffect(() => {
    if (!open) return;

    setDataEntrega(toLocalDatetimeValue(new Date()));
    setResponsavelNome("");
    setResponsavelDocumento("");
    setResponsavelContato("");
    setObservacoes("");
    setAcessorios(normalizarAcessorios(os?.acessorios));
  }, [open, os]);

  const updateAcessorio = (
    index: number,
    patch: Partial<AcessorioEntrega>
  ) => {
    setAcessorios((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleSave = async () => {
    if (!os) {
      toast({
        title: "Selecione uma OS.",
        variant: "destructive",
      });
      return;
    }

    if (!os.empresa_id) {
      toast({
        title: "Esta OS não possui empresa vinculada.",
        variant: "destructive",
      });
      return;
    }

    if (!os.equipamento_id) {
      toast({
        title: "Esta OS não possui equipamento vinculado.",
        variant: "destructive",
      });
      return;
    }

    try {
      await criarEntrega.mutateAsync({
        ordemServicoId: os.id,
        empresaId: os.empresa_id,
        equipamentoId: os.equipamento_id,
        dataEntrega: dataEntrega
          ? new Date(dataEntrega).toISOString()
          : undefined,
        responsavelNome: responsavelNome.trim(),
        responsavelDocumento: responsavelDocumento.trim(),
        responsavelContato: responsavelContato.trim(),
        observacoes: observacoes.trim(),
        acessorios: acessorios.map((item) => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          conferido: item.conferido,
          observacoes: item.observacoes.trim() || undefined,
        })),
      });

      toast({
        title: "Protocolo de entrega criado e OS fechada com sucesso.",
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao criar protocolo de entrega.";

      toast({
        title: "Erro ao criar protocolo",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!os) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Protocolo de Entrega</DialogTitle>
          <p className="text-sm text-muted-foreground">
            OS {os.numero} - {getEmpresaNome(os)}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Dados da Ordem de Serviço
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Número da OS" value={os.numero} />
              <Field label="Estado atual" value={getEstado(os)} />
              <Field label="Empresa" value={getEmpresaNome(os)} />
              <Field label="Equipamento" value={getEquipamentoLabel(os)} />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Entrega</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Data da Entrega</Label>
                <Input
                  type="datetime-local"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Responsável que recebeu</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Documento do responsável</Label>
                <Input
                  placeholder="CPF/RG, se necessário"
                  value={responsavelDocumento}
                  onChange={(e) => setResponsavelDocumento(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Contato do responsável</Label>
                <Input
                  placeholder="Telefone, e-mail ou setor"
                  value={responsavelContato}
                  onChange={(e) => setResponsavelContato(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Observações</Label>
              <Textarea
                placeholder="Informações adicionais da entrega..."
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Acessórios entregues
              </h3>
            </div>

            {acessorios.length > 0 ? (
              <div className="space-y-3">
                {acessorios.map((item, index) => {
                  const id = `acessorio-entrega-${item.id || index}`;

                  return (
                    <div
                      key={id}
                      className="grid grid-cols-1 gap-3 rounded-md border px-3 py-3 sm:grid-cols-[1fr_220px]"
                    >
                      <label
                        htmlFor={id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Checkbox
                          id={id}
                          checked={item.conferido}
                          onCheckedChange={(checked) =>
                            updateAcessorio(index, {
                              conferido: checked === true,
                            })
                          }
                          disabled={saving}
                        />
                        <span>
                          <span className="font-medium">{item.descricao}</span>
                          <span className="block text-xs text-muted-foreground">
                            Quantidade: {item.quantidade}
                          </span>
                        </span>
                      </label>

                      <Input
                        placeholder="Observação do acessório"
                        value={item.observacoes}
                        onChange={(e) =>
                          updateAcessorio(index, {
                            observacoes: e.target.value,
                          })
                        }
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum acessório registrado nesta OS.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Ao salvar, a OS será fechada automaticamente e receberá a data de
            fechamento informada.
          </p>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Protocolo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocoloEntregaDialog;

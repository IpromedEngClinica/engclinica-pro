import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EquipamentoSupabase } from "@/services/equipamentosService";
import { useCriarRecolhimentoComOS } from "@/hooks/useProtocolos";

interface ProtocoloRecolhimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: EquipamentoSupabase | null;
}

const toLocalDatetimeValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome_fantasia ||
  equipamento.empresa?.nome ||
  "Não informado";

const getTipoEquipamento = (equipamento: EquipamentoSupabase) =>
  equipamento.tipo_equipamento?.nome ||
  equipamento.tipo_texto ||
  "Equipamento não informado";

const chaveAcessorio = (descricao: string) =>
  descricao.trim().toLowerCase().replace(/\s+/g, " ");

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value || "—"}</p>
  </div>
);

const ProtocoloRecolhimentoDialog = ({
  open,
  onOpenChange,
  equipamento,
}: ProtocoloRecolhimentoDialogProps) => {
  const criarRecolhimento = useCriarRecolhimentoComOS();

  const [dataRecolhimento, setDataRecolhimento] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelDocumento, setResponsavelDocumento] = useState("");
  const [responsavelContato, setResponsavelContato] = useState("");
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");

  const saving = criarRecolhimento.isPending;

  useEffect(() => {
    if (!open) return;

    setDataRecolhimento(toLocalDatetimeValue(new Date()));
    setResponsavelNome("");
    setResponsavelDocumento("");
    setResponsavelContato("");
    setProblemaRelatado("");
    setObservacoes("");
    setAcessorios([]);
    setNovoAcessorio("");
  }, [open]);

  const handleAddAcessorio = () => {
    const descricao = novoAcessorio.trim();
    if (!descricao) return;

    const chaveNova = chaveAcessorio(descricao);
    const jaExiste = acessorios.some(
      (item) => chaveAcessorio(item) === chaveNova
    );

    if (jaExiste) {
      toast({
        title: "Acessório já adicionado.",
        variant: "destructive",
      });
      return;
    }

    setAcessorios((prev) => [...prev, descricao]);
    setNovoAcessorio("");
  };

  const handleRemoveAcessorio = (index: number) => {
    setAcessorios((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!equipamento) {
      toast({
        title: "Selecione um equipamento.",
        variant: "destructive",
      });
      return;
    }

    if (!equipamento.empresa_id) {
      toast({
        title: "Equipamento sem empresa vinculada.",
        variant: "destructive",
      });
      return;
    }

    try {
      await criarRecolhimento.mutateAsync({
        equipamentoId: equipamento.id,
        empresaId: equipamento.empresa_id,
        dataRecolhimento: dataRecolhimento
          ? new Date(dataRecolhimento).toISOString()
          : undefined,
        responsavelNome: responsavelNome.trim(),
        responsavelDocumento: responsavelDocumento.trim(),
        responsavelContato: responsavelContato.trim(),
        problemaRelatado: problemaRelatado.trim(),
        observacoes: observacoes.trim(),
        acessorios: acessorios.map((descricao) => ({
          descricao,
          quantidade: 1,
          conferido: true,
          observacoes: undefined,
        })),
      });

      toast({
        title: "Protocolo de recolhimento criado e OS aberta com sucesso.",
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado ao criar protocolo de recolhimento.";

      toast({
        title: "Erro ao criar protocolo",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!equipamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Protocolo de Recolhimento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getTipoEquipamento(equipamento)} · {getEmpresaNome(equipamento)}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Dados do Equipamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Empresa" value={getEmpresaNome(equipamento)} />
              <Field label="Tipo" value={getTipoEquipamento(equipamento)} />
              <Field label="Fabricante" value={equipamento.fabricante} />
              <Field label="Modelo" value={equipamento.modelo} />
              <Field label="Número de série" value={equipamento.numero_serie} />
              <Field label="Patrimônio" value={equipamento.patrimonio} />
              <Field label="TAG" value={equipamento.tag} />
              <Field label="Setor" value={equipamento.setor} />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Recolhimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Data de recolhimento</Label>
                <Input
                  type="datetime-local"
                  value={dataRecolhimento}
                  onChange={(e) => setDataRecolhimento(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Responsável pela coleta</Label>
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
              <Label className="text-sm">Problema relatado</Label>
              <Textarea
                placeholder="Descreva o problema informado pelo cliente ou operador..."
                rows={4}
                value={problemaRelatado}
                onChange={(e) => setProblemaRelatado(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Observações</Label>
              <Textarea
                placeholder="Informações adicionais do recolhimento..."
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Acessórios recolhidos
            </h3>

            <div className="flex gap-2">
              <Input
                placeholder="Novo acessório..."
                value={novoAcessorio}
                onChange={(e) => setNovoAcessorio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAcessorio();
                  }
                }}
                disabled={saving}
              />
              <Button
                type="button"
                onClick={handleAddAcessorio}
                disabled={saving}
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>

            {acessorios.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {acessorios.map((acessorio, index) => (
                  <li
                    key={`${acessorio}-${index}`}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{acessorio}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAcessorio(index)}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={saving}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum acessório adicionado.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Ao salvar, será aberta automaticamente uma Ordem de Serviço vinculada
            a este equipamento.
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

export default ProtocoloRecolhimentoDialog;

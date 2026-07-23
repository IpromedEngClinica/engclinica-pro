import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { useEstadosOS, useTiposOS } from "@/hooks/useCamposOS";
import { useAtualizarOrdensServicoEmLote } from "@/hooks/useOrdensServico";
import { useTecnicosExecutores } from "@/hooks/useTecnicosExecutores";
import { toast } from "@/hooks/use-toast";
import type {
  OrdemServicoCamposEdicaoLote,
  OrdemServicoPrioridade,
} from "@/services/ordensServicoService";
import { ordenarNomesEstadosOS } from "@/utils/ordemEstadosOS";
import { localDateTimeToIso } from "@/utils/planoDatas";

type CampoLote =
  | "estado"
  | "tipoServico"
  | "tecnicoExecutor"
  | "prioridade"
  | "dataAbertura"
  | "dataFechamento"
  | "problemaRelatado"
  | "origemProblema"
  | "descricaoServico"
  | "observacoes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemIds: string[];
  onSuccess: () => void;
};

const camposIniciais: Record<CampoLote, boolean> = {
  estado: false,
  tipoServico: false,
  tecnicoExecutor: false,
  prioridade: false,
  dataAbertura: false,
  dataFechamento: false,
  problemaRelatado: false,
  origemProblema: false,
  descricaoServico: false,
  observacoes: false,
};

const prioridades: Array<{ value: OrdemServicoPrioridade; label: string }> = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const CampoSelecionavel = ({
  checked,
  onCheckedChange,
  label,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    className={`rounded-md border p-3 transition-colors ${
      checked ? "border-primary/50 bg-primary/[0.03]" : "bg-muted/20"
    }`}
  >
    <div className="mb-2 flex items-center gap-2">
      <Checkbox
        id={`campo-lote-${label}`}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={`campo-lote-${label}`} className="cursor-pointer font-medium">
        {label}
      </Label>
    </div>
    {children}
  </div>
);

const OrdemServicoEdicaoLoteDialog = ({
  open,
  onOpenChange,
  ordemIds,
  onSuccess,
}: Props) => {
  const [camposSelecionados, setCamposSelecionados] =
    useState(camposIniciais);
  const [estadoId, setEstadoId] = useState("");
  const [tipoServicoId, setTipoServicoId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [prioridade, setPrioridade] =
    useState<OrdemServicoPrioridade>("normal");
  const [dataAbertura, setDataAbertura] = useState("");
  const [dataFechamento, setDataFechamento] = useState("");
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [origemProblema, setOrigemProblema] = useState("");
  const [descricaoServico, setDescricaoServico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: estados = [] } = useEstadosOS();
  const { data: tiposServico = [] } = useTiposOS();
  const { data: usuarios = [] } = useTecnicosExecutores();
  const atualizarEmLote = useAtualizarOrdensServicoEmLote();

  const estadoOptions = useMemo(() => {
    const nomesOrdenados = ordenarNomesEstadosOS(estados.map((item) => item.nome));
    return nomesOrdenados
      .map((nome) => estados.find((item) => item.nome === nome))
      .filter((item): item is (typeof estados)[number] => Boolean(item))
      .map((item) => ({ value: item.id, label: item.nome }));
  }, [estados]);

  const tipoOptions = useMemo(
    () => tiposServico.map((item) => ({ value: item.id, label: item.nome })),
    [tiposServico]
  );

  const tecnicoOptions = useMemo(
    () =>
      usuarios
        .filter(
          (usuario) =>
            usuario.ativo &&
            ["admin", "gestor", "tecnico"].includes(usuario.perfil)
        )
        .map((usuario) => ({ value: usuario.id, label: usuario.nome })),
    [usuarios]
  );

  useEffect(() => {
    if (open) return;
    setCamposSelecionados(camposIniciais);
    setEstadoId("");
    setTipoServicoId("");
    setTecnicoId("");
    setPrioridade("normal");
    setDataAbertura("");
    setDataFechamento("");
    setProblemaRelatado("");
    setOrigemProblema("");
    setDescricaoServico("");
    setObservacoes("");
  }, [open]);

  const selecionarCampo = (campo: CampoLote, checked: boolean) => {
    setCamposSelecionados((atual) => ({ ...atual, [campo]: checked }));
  };

  const handleSalvar = async () => {
    if (!ordemIds.length) return;

    if (!Object.values(camposSelecionados).some(Boolean)) {
      toast({
        title: "Selecione ao menos um campo",
        description: "Somente os campos marcados serão alterados nas OS selecionadas.",
        variant: "destructive",
      });
      return;
    }

    if (camposSelecionados.estado && !estadoId) {
      toast({ title: "Selecione o estado", variant: "destructive" });
      return;
    }

    if (camposSelecionados.tipoServico && !tipoServicoId) {
      toast({ title: "Selecione o tipo de serviço", variant: "destructive" });
      return;
    }

    if (camposSelecionados.tecnicoExecutor && !tecnicoId) {
      toast({ title: "Selecione o técnico executor", variant: "destructive" });
      return;
    }

    if (camposSelecionados.dataAbertura && !dataAbertura) {
      toast({ title: "Informe a data e hora de abertura", variant: "destructive" });
      return;
    }

    if (camposSelecionados.dataFechamento && !dataFechamento) {
      toast({ title: "Informe a data e hora de fechamento", variant: "destructive" });
      return;
    }

    const campos: OrdemServicoCamposEdicaoLote = {};

    if (camposSelecionados.estado) campos.estadoOsId = estadoId;
    if (camposSelecionados.tipoServico) campos.tipoOsId = tipoServicoId;
    if (camposSelecionados.tecnicoExecutor) {
      campos.tecnicoResponsavelId = tecnicoId;
      campos.responsavelTexto =
        usuarios.find((usuario) => usuario.id === tecnicoId)?.nome || "";
    }
    if (camposSelecionados.prioridade) campos.prioridade = prioridade;
    if (camposSelecionados.dataAbertura) {
      campos.dataAbertura = localDateTimeToIso(dataAbertura);
    }
    if (camposSelecionados.dataFechamento) {
      campos.dataFechamento = localDateTimeToIso(dataFechamento);
    }
    if (camposSelecionados.problemaRelatado) {
      campos.problemaRelatado = problemaRelatado.trim();
    }
    if (camposSelecionados.origemProblema) {
      campos.origemProblema = origemProblema.trim();
    }
    if (camposSelecionados.descricaoServico) {
      campos.descricaoServico = descricaoServico.trim();
    }
    if (camposSelecionados.observacoes) {
      campos.observacoes = observacoes.trim();
    }

    try {
      const atualizadas = await atualizarEmLote.mutateAsync({
        ids: ordemIds,
        campos,
      });
      toast({
        title: "Ordens de Serviço atualizadas",
        description: `${atualizadas} OS atualizada(s) com os campos selecionados.`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro na edição em lote",
        description:
          error instanceof Error ? error.message : "Não foi possível atualizar as OS.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edição rápida de Ordens de Serviço</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong>{ordemIds.length} OS selecionada(s).</strong> Marque somente os
            campos que deseja aplicar a todas elas. Campos não marcados serão preservados.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CampoSelecionavel
            label="Estado"
            checked={camposSelecionados.estado}
            onCheckedChange={(checked) => selecionarCampo("estado", checked)}
          >
            <SearchableSelect
              value={estadoId}
              onValueChange={setEstadoId}
              options={estadoOptions}
              placeholder="Selecione o novo estado"
              disabled={!camposSelecionados.estado}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Tipo de Serviço"
            checked={camposSelecionados.tipoServico}
            onCheckedChange={(checked) => selecionarCampo("tipoServico", checked)}
          >
            <SearchableSelect
              value={tipoServicoId}
              onValueChange={setTipoServicoId}
              options={tipoOptions}
              placeholder="Selecione o tipo de serviço"
              disabled={!camposSelecionados.tipoServico}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Técnico Executor"
            checked={camposSelecionados.tecnicoExecutor}
            onCheckedChange={(checked) =>
              selecionarCampo("tecnicoExecutor", checked)
            }
          >
            <SearchableSelect
              value={tecnicoId}
              onValueChange={setTecnicoId}
              options={tecnicoOptions}
              placeholder="Selecione o técnico executor"
              disabled={!camposSelecionados.tecnicoExecutor}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Prioridade"
            checked={camposSelecionados.prioridade}
            onCheckedChange={(checked) => selecionarCampo("prioridade", checked)}
          >
            <SearchableSelect
              value={prioridade}
              onValueChange={(value) =>
                setPrioridade(value as OrdemServicoPrioridade)
              }
              options={prioridades}
              placeholder="Selecione a prioridade"
              disabled={!camposSelecionados.prioridade}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Data e Hora de Abertura"
            checked={camposSelecionados.dataAbertura}
            onCheckedChange={(checked) =>
              selecionarCampo("dataAbertura", checked)
            }
          >
            <Input
              type="datetime-local"
              value={dataAbertura}
              onChange={(event) => setDataAbertura(event.target.value)}
              disabled={!camposSelecionados.dataAbertura}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Data e Hora de Fechamento"
            checked={camposSelecionados.dataFechamento}
            onCheckedChange={(checked) =>
              selecionarCampo("dataFechamento", checked)
            }
          >
            <Input
              type="datetime-local"
              value={dataFechamento}
              onChange={(event) => setDataFechamento(event.target.value)}
              disabled={!camposSelecionados.dataFechamento}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Problema Relatado"
            checked={camposSelecionados.problemaRelatado}
            onCheckedChange={(checked) =>
              selecionarCampo("problemaRelatado", checked)
            }
          >
            <Textarea
              value={problemaRelatado}
              onChange={(event) => setProblemaRelatado(event.target.value)}
              disabled={!camposSelecionados.problemaRelatado}
              rows={3}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Origem do Problema"
            checked={camposSelecionados.origemProblema}
            onCheckedChange={(checked) =>
              selecionarCampo("origemProblema", checked)
            }
          >
            <Input
              value={origemProblema}
              onChange={(event) => setOrigemProblema(event.target.value)}
              disabled={!camposSelecionados.origemProblema}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Descrição do Serviço"
            checked={camposSelecionados.descricaoServico}
            onCheckedChange={(checked) =>
              selecionarCampo("descricaoServico", checked)
            }
          >
            <Textarea
              value={descricaoServico}
              onChange={(event) => setDescricaoServico(event.target.value)}
              disabled={!camposSelecionados.descricaoServico}
              rows={3}
            />
          </CampoSelecionavel>

          <CampoSelecionavel
            label="Observações"
            checked={camposSelecionados.observacoes}
            onCheckedChange={(checked) => selecionarCampo("observacoes", checked)}
          >
            <Textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              disabled={!camposSelecionados.observacoes}
              rows={3}
            />
          </CampoSelecionavel>
        </div>

        <p className="text-xs text-muted-foreground">
          Campos textuais marcados podem ser limpos deixando o conteúdo em branco.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={atualizarEmLote.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={atualizarEmLote.isPending}>
            {atualizarEmLote.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Aplicar em {ordemIds.length} OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrdemServicoEdicaoLoteDialog;

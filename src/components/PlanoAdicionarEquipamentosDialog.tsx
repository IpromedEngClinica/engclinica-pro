import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useAdicionarEquipamentosPlano } from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { EquipamentoSelecionadoPlano, Plano } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano;
};

const ALL = "__all__";
const NONE = "__none__";

const nomeEquipamento = (equipamento: EquipamentoSupabase) =>
  [
    equipamento.tipo_equipamento?.nome || equipamento.tipo_texto || "Equipamento",
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.numero_serie ? `NS ${equipamento.numero_serie}` : null,
  ].filter(Boolean).join(" - ");

const PlanoAdicionarEquipamentosDialog = ({ open, onOpenChange, plano }: Props) => {
  const { data: equipamentos = [], isLoading } = useEquipamentos({ empresaId: plano.empresa_id, statusFiltro: "ativos" });
  const adicionar = useAdicionarEquipamentosPlano();
  const [search, setSearch] = useState("");
  const [setorCadastro, setSetorCadastro] = useState(ALL);
  const [tipo, setTipo] = useState(ALL);
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [tag, setTag] = useState("");
  const [setorPlano, setSetorPlano] = useState(NONE);
  const [selecionados, setSelecionados] = useState<Record<string, EquipamentoSelecionadoPlano>>({});

  const incluidos = useMemo(() => new Set((plano.equipamentos || []).map((item) => item.equipamento_id)), [plano.equipamentos]);
  const tipos = useMemo(() =>
    Array.from(new Map(equipamentos.filter((item) => item.tipo_equipamento).map((item) => [item.tipo_equipamento_id || "", item.tipo_equipamento?.nome || "Sem tipo"])).entries()),
    [equipamentos]
  );
  const setoresCadastro = useMemo(() =>
    Array.from(new Set(equipamentos.map((item) => item.setor).filter(Boolean))) as string[],
    [equipamentos]
  );
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipamentos.filter((item) => {
      const texto = [
        nomeEquipamento(item),
        item.patrimonio,
        item.tag,
        item.setor,
      ].filter(Boolean).join(" ").toLowerCase();
      return !incluidos.has(item.id)
        && (!q || texto.includes(q))
        && (setorCadastro === ALL || item.setor === setorCadastro)
        && (tipo === ALL || item.tipo_equipamento_id === tipo)
        && (!fabricante.trim() || (item.fabricante || "").toLowerCase().includes(fabricante.trim().toLowerCase()))
        && (!modelo.trim() || (item.modelo || "").toLowerCase().includes(modelo.trim().toLowerCase()))
        && (!serie.trim() || (item.numero_serie || "").toLowerCase().includes(serie.trim().toLowerCase()))
        && (!patrimonio.trim() || (item.patrimonio || "").toLowerCase().includes(patrimonio.trim().toLowerCase()))
        && (!tag.trim() || (item.tag || "").toLowerCase().includes(tag.trim().toLowerCase()));
    });
  }, [equipamentos, fabricante, incluidos, modelo, patrimonio, search, serie, setorCadastro, tag, tipo]);

  const selecionadosArray = useMemo(() => Object.values(selecionados), [selecionados]);
  const selecionadosIds = useMemo(() => new Set(selecionadosArray.map((item) => item.equipamentoId)), [selecionadosArray]);
  const criarSelecao = (equipamentoId: string): EquipamentoSelecionadoPlano => ({
    equipamentoId,
    setorPlanoId: setorPlano === NONE ? null : setorPlano,
    preventiva: true,
    calibracao: false,
    segurancaEletrica: false,
  });
  const todosSelecionados = filtrados.length > 0 && filtrados.every((item) => selecionadosIds.has(item.id));
  const toggleTodos = (checked: boolean) => {
    const idsFiltrados = new Set(filtrados.map((item) => item.id));
    setSelecionados((current) => {
      if (!checked) {
        return Object.fromEntries(Object.entries(current).filter(([id]) => !idsFiltrados.has(id)));
      }
      const next = { ...current };
      filtrados.forEach((item) => {
        if (!next[item.id]) next[item.id] = criarSelecao(item.id);
      });
      return next;
    });
  };
  const toggleItem = (equipamentoId: string, checked: boolean) => {
    setSelecionados((current) => {
      if (!checked) {
        const { [equipamentoId]: _removido, ...rest } = current;
        return rest;
      }
      return { ...current, [equipamentoId]: current[equipamentoId] || criarSelecao(equipamentoId) };
    });
  };
  const atualizarItem = (equipamentoId: string, patch: Partial<EquipamentoSelecionadoPlano>) => {
    setSelecionados((current) => ({
      ...current,
      [equipamentoId]: {
        ...(current[equipamentoId] || criarSelecao(equipamentoId)),
        ...patch,
        equipamentoId,
      },
    }));
  };
  const itemSelecionado = (equipamentoId: string) => selecionados[equipamentoId] || criarSelecao(equipamentoId);

  const salvar = async () => {
    try {
      await adicionar.mutateAsync({
        planoId: plano.id,
        input: {
          equipamentos: selecionadosArray,
        },
      });
      toast({ title: "Equipamentos adicionados ao plano." });
      setSelecionados({});
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao adicionar equipamentos",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[94vw]">
        <DialogHeader>
          <DialogTitle>Adicionar equipamentos</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Busca geral" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select value={setorCadastro} onValueChange={setSetorCadastro}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os setores cadastrados</SelectItem>
              {setoresCadastro.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {tipos.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Fabricante" value={fabricante} onChange={(event) => setFabricante(event.target.value)} />
          <Input placeholder="Modelo" value={modelo} onChange={(event) => setModelo(event.target.value)} />
          <Input placeholder="Numero de serie" value={serie} onChange={(event) => setSerie(event.target.value)} />
          <Input placeholder="Patrimonio" value={patrimonio} onChange={(event) => setPatrimonio(event.target.value)} />
          <Input placeholder="TAG" value={tag} onChange={(event) => setTag(event.target.value)} />
        </div>
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label>Setor padrao ao selecionar</Label>
            <Select value={setorPlano} onValueChange={setSetorPlano}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem setor</SelectItem>
                {(plano.setores || []).map((setor) => <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <Th><Checkbox checked={todosSelecionados} onCheckedChange={(value) => toggleTodos(Boolean(value))} /></Th>
                <Th>Equipamento</Th>
                <Th>Setor plano</Th>
                <Th>Setor cadastro</Th>
                <Th>Fabricante</Th>
                <Th>Modelo</Th>
                <Th>NS</Th>
                <Th>Patrimonio</Th>
                <Th>TAG</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><Td><Loader2 className="h-4 w-4 animate-spin" /></Td></tr>}
              {!isLoading && filtrados.map((item) => (
                <tr key={item.id} className="border-t">
                  <Td><Checkbox checked={selecionadosIds.has(item.id)} onCheckedChange={(value) => toggleItem(item.id, Boolean(value))} /></Td>
                  <Td>{nomeEquipamento(item)}</Td>
                  <Td>
                    <Select
                      value={itemSelecionado(item.id).setorPlanoId || NONE}
                      disabled={!selecionadosIds.has(item.id)}
                      onValueChange={(value) => atualizarItem(item.id, { setorPlanoId: value === NONE ? null : value })}
                    >
                      <SelectTrigger className="h-8 min-w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem setor</SelectItem>
                        {(plano.setores || []).map((setor) => <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Td>
                  <Td>{item.setor || "-"}</Td>
                  <Td>{item.fabricante || "-"}</Td>
                  <Td>{item.modelo || "-"}</Td>
                  <Td>{item.numero_serie || "-"}</Td>
                  <Td>{item.patrimonio || "-"}</Td>
                  <Td>{item.tag || "-"}</Td>
                </tr>
              ))}
              {!isLoading && !filtrados.length && <tr><Td>Nenhum equipamento disponivel.</Td></tr>}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={!selecionadosArray.length || adicionar.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-2 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-2">{children}</td>;

export default PlanoAdicionarEquipamentosDialog;

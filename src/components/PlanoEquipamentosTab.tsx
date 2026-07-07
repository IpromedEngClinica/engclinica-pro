import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PlanoAdicionarEquipamentosDialog from "@/components/PlanoAdicionarEquipamentosDialog";
import SortableTableHeader from "@/components/SortableTableHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAtualizarEquipamentoPlano,
  useRemoverEquipamentoPlano,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import {
  getSetorKeyPlanoEquipamento,
  getSetorNomePlanoEquipamento,
  listarSetoresDerivadosPlano,
  type Plano,
  type PlanoEquipamento,
  type PlanoEquipamentoInput,
} from "@/services/planosService";
import type { SortDirection } from "@/utils/sortUtils";

type Props = {
  plano: Plano;
};

const ALL = "__all__";
type SortField =
  | "ordem"
  | "equipamento"
  | "setor"
  | "tipo"
  | "modelo"
  | "fabricante"
  | "numero_serie"
  | "patrimonio"
  | "preventiva"
  | "calibracao"
  | "seguranca_eletrica";

const compareText = (a: string | null | undefined, b: string | null | undefined) =>
  (a || "").localeCompare(b || "", "pt-BR", { numeric: true, sensitivity: "base" });

const getSortValue = (item: PlanoEquipamento, field: SortField) => {
  const equipamento = item.equipamento;
  switch (field) {
    case "ordem":
      return item.ordem;
    case "equipamento":
      return equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto || "";
    case "setor":
      return getSetorNomePlanoEquipamento(item);
    case "tipo":
      return equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto || "";
    case "modelo":
      return equipamento?.modelo || "";
    case "fabricante":
      return equipamento?.fabricante || "";
    case "numero_serie":
      return equipamento?.numero_serie || "";
    case "patrimonio":
      return equipamento?.patrimonio || "";
    case "preventiva":
      return item.executar_preventiva ? 1 : 0;
    case "calibracao":
      return item.executar_calibracao ? 1 : 0;
    case "seguranca_eletrica":
      return item.executar_seguranca_eletrica ? 1 : 0;
    default:
      return "";
  }
};

const comparePlanoEquipamento = (a: PlanoEquipamento, b: PlanoEquipamento, field: SortField) => {
  const valueA = getSortValue(a, field);
  const valueB = getSortValue(b, field);

  if (typeof valueA === "number" && typeof valueB === "number") {
    return valueA - valueB;
  }

  return compareText(String(valueA), String(valueB));
};

const PlanoEquipamentosTab = ({ plano }: Props) => {
  const atualizar = useAtualizarEquipamentoPlano();
  const remover = useRemoverEquipamentoPlano();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [setor, setSetor] = useState(ALL);
  const [tipo, setTipo] = useState(ALL);
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [status, setStatus] = useState(ALL);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("ordem");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const equipamentos = useMemo(() => plano.equipamentos || [], [plano.equipamentos]);
  const setores = useMemo(() => listarSetoresDerivadosPlano(equipamentos), [equipamentos]);

  useEffect(() => {
    if (setor !== ALL && !setores.some((item) => item.key === setor)) {
      setSetor(ALL);
    }
  }, [setor, setores]);

  const tipos = useMemo(() =>
    Array.from(new Map(equipamentos.map((item) => [
      item.equipamento?.tipo_equipamento_id || item.equipamento?.tipo_texto || "",
      item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Sem tipo",
    ])).entries()).filter(([id]) => id),
    [equipamentos]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipamentos
      .filter((item) => {
        const equipamento = item.equipamento;
        const texto = [
          equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto,
          equipamento?.fabricante,
          equipamento?.modelo,
          equipamento?.numero_serie,
          equipamento?.patrimonio,
          equipamento?.tag,
          equipamento?.setor,
          item.setor?.nome,
        ].filter(Boolean).join(" ").toLowerCase();
        const tipoId = equipamento?.tipo_equipamento_id || equipamento?.tipo_texto || "";
        return (!q || texto.includes(q))
          && (setor === ALL || getSetorKeyPlanoEquipamento(item) === setor)
          && (tipo === ALL || tipoId === tipo)
          && (!fabricante.trim() || (equipamento?.fabricante || "").toLowerCase().includes(fabricante.trim().toLowerCase()))
          && (!modelo.trim() || (equipamento?.modelo || "").toLowerCase().includes(modelo.trim().toLowerCase()))
          && (status === ALL || equipamento?.status === status);
      })
      .sort((a, b) => {
        const compare = comparePlanoEquipamento(a, b, sortField);
        if (compare !== 0) return sortDirection === "asc" ? compare : -compare;
        return a.ordem - b.ordem;
      });
  }, [equipamentos, fabricante, modelo, search, setor, sortDirection, sortField, status, tipo]);

  const handleSort = (field: string) => {
    const nextField = field as SortField;
    if (sortField === nextField) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(nextField);
    setSortDirection(nextField === "ordem" ? "asc" : "asc");
  };

  const salvar = async (item: PlanoEquipamento, patch: Partial<PlanoEquipamentoInput>) => {
    try {
      await atualizar.mutateAsync({
        id: item.id,
        input: {
          equipamentoId: item.equipamento_id,
          setorId: item.setor_id,
          executarPreventiva: item.executar_preventiva,
          executarCalibracao: item.executar_calibracao,
          executarSegurancaEletrica: item.executar_seguranca_eletrica,
          ordem: item.ordem,
          ...patch,
        },
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const removerItem = async (item: PlanoEquipamento) => {
    if (!window.confirm("Remover equipamento do plano?")) return;
    try {
      await remover.mutateAsync(item.id);
      toast({ title: "Equipamento removido do plano." });
    } catch (error) {
      toast({
        title: "Erro ao remover equipamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const atualizarLote = async (patch: Partial<PlanoEquipamentoInput>) => {
    const lote = equipamentos.filter((item) => selecionados.includes(item.id));
    try {
      await Promise.all(lote.map((item) => salvar(item, patch)));
      setSelecionados([]);
      toast({ title: "Estrutura atualizada." });
    } catch {
      // salvar ja exibe o erro individual.
    }
  };

  const todosMarcados = filtrados.length > 0 && filtrados.every((item) => selecionados.includes(item.id));

  return (
    <div className="space-y-4">
      <PlanoAdicionarEquipamentosDialog open={addOpen} onOpenChange={setAddOpen} plano={plano} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar equipamentos</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={setor === ALL ? "default" : "outline"}
          onClick={() => setSetor(ALL)}
        >
          Todos ({equipamentos.length})
        </Button>
        {setores.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={setor === item.key ? "default" : "outline"}
            className="whitespace-nowrap"
            onClick={() => setSetor(item.key)}
          >
            {item.nome} ({item.quantidade})
          </Button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        <Input placeholder="Busca geral" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {tipos.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Fabricante" value={fabricante} onChange={(event) => setFabricante(event.target.value)} />
        <Input placeholder="Modelo" value={modelo} onChange={(event) => setModelo(event.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Em manutenção">Em manutencao</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selecionados.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
          <span className="px-2 py-2 text-sm font-medium">{selecionados.length} selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarPreventiva: true })}>Marcar P</Button>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarPreventiva: false })}>Desmarcar P</Button>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarCalibracao: true })}>Marcar C</Button>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarCalibracao: false })}>Desmarcar C</Button>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarSegurancaEletrica: true })}>Marcar E</Button>
          <Button size="sm" variant="outline" onClick={() => atualizarLote({ executarSegurancaEletrica: false })}>Desmarcar E</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <Th><Checkbox checked={todosMarcados} onCheckedChange={(value) => setSelecionados(value ? filtrados.map((item) => item.id) : [])} /></Th>
              <Th><SortableTableHeader label="#" sortField="ordem" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Equipamento" sortField="equipamento" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Setor" sortField="setor" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Tipo" sortField="tipo" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Modelo" sortField="modelo" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Fabricante" sortField="fabricante" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Numero de serie" sortField="numero_serie" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="Patrimonio" sortField="patrimonio" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="P" sortField="preventiva" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="C" sortField="calibracao" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th><SortableTableHeader label="E" sortField="seguranca_eletrica" sortKey={sortField} sortDirection={sortDirection} onSort={handleSort} /></Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item, index) => (
              <tr key={item.id} className="border-t">
                <Td><Checkbox checked={selecionados.includes(item.id)} onCheckedChange={(value) => setSelecionados((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))} /></Td>
                <Td>{index + 1}</Td>
                <Td>{item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento"}</Td>
                <Td>{getSetorNomePlanoEquipamento(item)}</Td>
                <Td>{item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "-"}</Td>
                <Td>{item.equipamento?.modelo || "-"}</Td>
                <Td>{item.equipamento?.fabricante || "-"}</Td>
                <Td>{item.equipamento?.numero_serie || "-"}</Td>
                <Td>{item.equipamento?.patrimonio || "-"}</Td>
                <Td><Checkbox checked={item.executar_preventiva} onCheckedChange={(value) => salvar(item, { executarPreventiva: Boolean(value) })} /></Td>
                <Td><Checkbox checked={item.executar_calibracao} onCheckedChange={(value) => salvar(item, { executarCalibracao: Boolean(value) })} /></Td>
                <Td><Checkbox checked={item.executar_seguranca_eletrica} onCheckedChange={(value) => salvar(item, { executarSegurancaEletrica: Boolean(value) })} /></Td>
                <Td><Button size="icon" variant="ghost" className="text-destructive" onClick={() => removerItem(item)}><Trash2 className="h-4 w-4" /></Button></Td>
              </tr>
            ))}
            {!filtrados.length && <tr><Td>Nenhum equipamento encontrado.</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-3 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-3">{children}</td>;

export default PlanoEquipamentosTab;

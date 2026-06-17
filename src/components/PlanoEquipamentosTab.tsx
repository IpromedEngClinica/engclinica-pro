import { useMemo, useState } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
import PlanoAdicionarEquipamentosDialog from "@/components/PlanoAdicionarEquipamentosDialog";
import PlanoSetoresDialog from "@/components/PlanoSetoresDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAtualizarEquipamentoPlano,
  useRemoverEquipamentoPlano,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoEquipamento, PlanoEquipamentoInput } from "@/services/planosService";

type Props = {
  plano: Plano;
};

const ALL = "__all__";
const NONE = "__none__";

const PlanoEquipamentosTab = ({ plano }: Props) => {
  const atualizar = useAtualizarEquipamentoPlano();
  const remover = useRemoverEquipamentoPlano();
  const [addOpen, setAddOpen] = useState(false);
  const [setoresOpen, setSetoresOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [setor, setSetor] = useState(ALL);
  const [tipo, setTipo] = useState(ALL);
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [status, setStatus] = useState(ALL);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const equipamentos = useMemo(() => plano.equipamentos || [], [plano.equipamentos]);
  const setores = useMemo(() => plano.setores || [], [plano.setores]);

  const tipos = useMemo(() =>
    Array.from(new Map(equipamentos.map((item) => [
      item.equipamento?.tipo_equipamento_id || item.equipamento?.tipo_texto || "",
      item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Sem tipo",
    ])).entries()).filter(([id]) => id),
    [equipamentos]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipamentos.filter((item) => {
      const equipamento = item.equipamento;
      const texto = [
        equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto,
        equipamento?.fabricante,
        equipamento?.modelo,
        equipamento?.numero_serie,
        equipamento?.patrimonio,
        equipamento?.tag,
        item.setor?.nome,
      ].filter(Boolean).join(" ").toLowerCase();
      const tipoId = equipamento?.tipo_equipamento_id || equipamento?.tipo_texto || "";
      return (!q || texto.includes(q))
        && (setor === ALL || (setor === NONE ? !item.setor_id : item.setor_id === setor))
        && (tipo === ALL || tipoId === tipo)
        && (!fabricante.trim() || (equipamento?.fabricante || "").toLowerCase().includes(fabricante.trim().toLowerCase()))
        && (!modelo.trim() || (equipamento?.modelo || "").toLowerCase().includes(modelo.trim().toLowerCase()))
        && (status === ALL || equipamento?.status === status);
    });
  }, [equipamentos, fabricante, modelo, search, setor, status, tipo]);

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
      <PlanoSetoresDialog open={setoresOpen} onOpenChange={setSetoresOpen} plano={plano} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar equipamentos</Button>
        <Button variant="outline" onClick={() => setSetoresOpen(true)}><Settings2 className="mr-2 h-4 w-4" />Gerenciar setores</Button>
        <Button variant="outline" onClick={() => toast({ title: "Estrutura salva." })}>Salvar estrutura</Button>
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Input placeholder="Busca geral" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select value={setor} onValueChange={setSetor}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os setores</SelectItem>
            <SelectItem value={NONE}>Sem setor</SelectItem>
            {setores.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
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
              <Th>#</Th>
              <Th>Equipamento</Th>
              <Th>Setor</Th>
              <Th>Tipo</Th>
              <Th>Modelo</Th>
              <Th>Fabricante</Th>
              <Th>Numero de serie</Th>
              <Th>Patrimonio</Th>
              <Th>P</Th>
              <Th>C</Th>
              <Th>E</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item, index) => (
              <tr key={item.id} className="border-t">
                <Td><Checkbox checked={selecionados.includes(item.id)} onCheckedChange={(value) => setSelecionados((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))} /></Td>
                <Td>{index + 1}</Td>
                <Td>{item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento"}</Td>
                <Td>
                  <Select value={item.setor_id || NONE} onValueChange={(value) => salvar(item, { setorId: value === NONE ? null : value })}>
                    <SelectTrigger className="h-8 min-w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem setor</SelectItem>
                      {setores.map((setorItem) => <SelectItem key={setorItem.id} value={setorItem.id}>{setorItem.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Td>
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

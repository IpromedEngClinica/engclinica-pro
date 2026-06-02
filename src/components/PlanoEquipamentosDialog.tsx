import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdicionarEquipamentoPlano, useAtualizarEquipamentoPlano, useAtualizarSetorPlano,
  useCriarSetorPlano, usePlano, useRemoverEquipamentoPlano, useRemoverSetorPlano,
} from "@/hooks/usePlanos";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { toast } from "@/hooks/use-toast";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { Plano, PlanoEquipamento, PlanoEquipamentoInput, PlanoSetor } from "@/services/planosService";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; plano: Plano | null; setorInicialId?: string | null };
type Selection = Record<string, { p: boolean; c: boolean; s: boolean; setorId: string }>;
const ALL = "__all__";
const SEM_SETOR = "__sem_setor__";

const equipamentoNome = (item?: EquipamentoSupabase | null) =>
  [item?.tipo_equipamento?.nome || item?.tipo_texto || "Equipamento", item?.fabricante, item?.modelo, item?.numero_serie ? `NS ${item.numero_serie}` : null].filter(Boolean).join(" - ");

const PlanoEquipamentosDialog = ({ open, onOpenChange, plano, setorInicialId }: Props) => {
  const { data: detalhe, isLoading } = usePlano(open ? plano?.id : undefined);
  const { data: equipamentos = [] } = useEquipamentos({ empresaId: plano?.empresa_id, statusFiltro: "ativos" });
  const criarSetor = useCriarSetorPlano();
  const atualizarSetor = useAtualizarSetorPlano();
  const removerSetor = useRemoverSetorPlano();
  const adicionar = useAdicionarEquipamentoPlano();
  const atualizar = useAtualizarEquipamentoPlano();
  const remover = useRemoverEquipamentoPlano();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState(ALL);
  const [setorOriginal, setSetorOriginal] = useState(ALL);
  const [selecionados, setSelecionados] = useState<Selection>({});
  const [incluidosSelecionados, setIncluidosSelecionados] = useState<string[]>([]);
  const [setorFoco, setSetorFoco] = useState(ALL);
  const setores = useMemo(() => detalhe?.setores || [], [detalhe?.setores]);
  const incluidos = useMemo(() => detalhe?.equipamentos || [], [detalhe?.equipamentos]);
  const unidadeInteira = plano?.modo_organizacao === "unidade_inteira";
  const incluidosVisiveis = useMemo(() => incluidos.filter((item) =>
    unidadeInteira || setorFoco === ALL ||
    (setorFoco === SEM_SETOR ? !item.setor_id : item.setor_id === setorFoco)
  ), [incluidos, setorFoco, unidadeInteira]);

  useEffect(() => {
    if (!open) return;
    setSetorFoco(unidadeInteira ? SEM_SETOR : setorInicialId || ALL);
    setIncluidosSelecionados([]);
    setSelecionados({});
  }, [open, setorInicialId, unidadeInteira]);

  const disponiveis = useMemo(() => {
    const incluidosIds = new Set(incluidos.map((item) => item.equipamento_id));
    return equipamentos.filter((item) => {
    const q = search.toLowerCase().trim();
    const label = equipamentoNome(item).toLowerCase();
    return !incluidosIds.has(item.id) && (!q || label.includes(q)) &&
      (tipo === ALL || item.tipo_equipamento_id === tipo) &&
      (setorOriginal === ALL || (item.setor || "") === setorOriginal);
    });
  }, [equipamentos, incluidos, search, setorOriginal, tipo]);
  const tipos = useMemo(() => Array.from(new Map(equipamentos.filter((item) => item.tipo_equipamento).map((item) => [item.tipo_equipamento_id, item.tipo_equipamento?.nome])).entries()), [equipamentos]);
  const setoresOriginais = useMemo(() => Array.from(new Set(equipamentos.map((item) => item.setor).filter(Boolean))) as string[], [equipamentos]);

  if (!plano) return null;

  const novoSetor = async () => {
    const nome = window.prompt("Nome do novo setor:");
    if (!nome?.trim()) return;
    try { await criarSetor.mutateAsync({ planoId: plano.id, input: { nome, ordem: setores.length + 1 } }); }
    catch (error) { erro("Erro ao criar setor", error); }
  };
  const editarSetor = async (setor: PlanoSetor) => {
    const nome = window.prompt("Nome do setor:", setor.nome);
    if (!nome?.trim()) return;
    try { await atualizarSetor.mutateAsync({ id: setor.id, input: { ...setor, nome } }); }
    catch (error) { erro("Erro ao atualizar setor", error); }
  };
  const excluirSetor = async (setor: PlanoSetor) => {
    if (!window.confirm(`Excluir o setor "${setor.nome}"? Os equipamentos permanecerao no plano sem setor.`)) return;
    try { await removerSetor.mutateAsync(setor.id); } catch (error) { erro("Erro ao excluir setor", error); }
  };
  const moverSetor = async (setor: PlanoSetor, delta: number) => {
    const index = setores.findIndex((item) => item.id === setor.id);
    const outro = setores[index + delta];
    if (!outro) return;
    try {
      await Promise.all([
        atualizarSetor.mutateAsync({ id: setor.id, input: { ...setor, ordem: outro.ordem } }),
        atualizarSetor.mutateAsync({ id: outro.id, input: { ...outro, ordem: setor.ordem } }),
      ]);
    } catch (error) { erro("Erro ao ordenar setores", error); }
  };
  const toggleSelecionado = (equipamentoId: string, checked: boolean) =>
    setSelecionados((current) => {
      const next = { ...current };
      if (checked) next[equipamentoId] = { p: true, c: false, s: false, setorId: unidadeInteira || setorFoco === SEM_SETOR || setorFoco === ALL ? "" : setorFoco };
      else delete next[equipamentoId];
      return next;
    });
  const patchSelecionado = (id: string, patch: Partial<Selection[string]>) =>
    setSelecionados((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const adicionarSelecionados = async () => {
    const entries = Object.entries(selecionados);
    if (!entries.length) return;
    try {
      await Promise.all(entries.map(([equipamentoId, item], index) => adicionar.mutateAsync({
        planoId: plano.id,
        input: { equipamentoId, setorId: item.setorId || null, executarPreventiva: item.p, executarCalibracao: item.c, executarSegurancaEletrica: item.s, ordem: incluidos.length + index + 1 },
      })));
      setSelecionados({});
      toast({ title: "Equipamentos adicionados ao plano." });
    } catch (error) { erro("Erro ao adicionar equipamentos", error); }
  };
  const salvarIncluido = async (item: PlanoEquipamento, patch: Partial<PlanoEquipamentoInput>) => {
    try {
      await atualizar.mutateAsync({ id: item.id, input: {
        equipamentoId: item.equipamento_id, setorId: item.setor_id,
        executarPreventiva: item.executar_preventiva, executarCalibracao: item.executar_calibracao,
        executarSegurancaEletrica: item.executar_seguranca_eletrica, ordem: item.ordem, ...patch,
      } });
    } catch (error) { erro("Erro ao atualizar equipamento", error); }
  };
  const removerIncluido = async (item: PlanoEquipamento) => {
    if (!window.confirm(`Remover "${equipamentoNome(item.equipamento)}" do plano?`)) return;
    try { await remover.mutateAsync(item.id); }
    catch (error) { erro("Erro ao remover equipamento", error); }
  };
  const atualizarIncluidosEmLote = async (patch: Partial<PlanoEquipamentoInput>) => {
    const selecionadosLote = incluidos.filter((item) => incluidosSelecionados.includes(item.id));
    if (!selecionadosLote.length) return;
    try {
      await Promise.all(selecionadosLote.map((item) => salvarIncluido(item, patch)));
      setIncluidosSelecionados([]);
      toast({ title: "Equipamentos atualizados." });
    } catch (error) { erro("Erro ao atualizar equipamentos", error); }
  };
  const removerIncluidosEmLote = async () => {
    const selecionadosLote = incluidos.filter((item) => incluidosSelecionados.includes(item.id));
    if (!selecionadosLote.length || !window.confirm(`Remover ${selecionadosLote.length} equipamento(s) do plano?`)) return;
    try {
      await Promise.all(selecionadosLote.map((item) => remover.mutateAsync(item.id)));
      setIncluidosSelecionados([]);
      toast({ title: "Equipamentos removidos do plano." });
    } catch (error) { erro("Erro ao remover equipamentos", error); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[96vw]">
    <DialogHeader><DialogTitle>Equipamentos do plano: {plano.titulo}</DialogTitle><p className="text-sm text-muted-foreground">Cliente: {plano.empresa?.nome_fantasia || plano.empresa?.nome}</p></DialogHeader>
    {isLoading ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" /> : <div className="space-y-5">
      {!unidadeInteira && <section><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Setores</h3><Button size="sm" variant="outline" onClick={novoSetor}><Plus className="mr-1 h-4 w-4" />Novo setor</Button></div>
        <div className="flex flex-wrap gap-2">{setores.map((setor, index) => <div key={setor.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"><span>{setor.nome}</span><Button size="icon" variant="ghost" className="h-6 w-6" disabled={!index} onClick={() => moverSetor(setor, -1)}><ArrowUp className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === setores.length - 1} onClick={() => moverSetor(setor, 1)}><ArrowDown className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => editarSetor(setor)}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => excluirSetor(setor)}><Trash2 className="h-3 w-3" /></Button></div>)}</div>
      </section>}
      <section><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Escopo da estrutura</h3>{!unidadeInteira && <SetorFiltro value={setorFoco} setores={setores} onChange={setSetorFoco} />}</div><p className="text-sm text-muted-foreground">{unidadeInteira ? "Todos os equipamentos da unidade" : setorFoco === ALL ? "Todos os setores" : setorFoco === SEM_SETOR ? "Sem setor" : setores.find((item) => item.id === setorFoco)?.nome}</p></section>
      <section><h3 className="mb-2 font-semibold">Equipamentos disponiveis do cliente</h3><div className="mb-2 grid gap-2 md:grid-cols-3"><Input placeholder="Buscar equipamento" value={search} onChange={(e) => setSearch(e.target.value)} /><Filtro value={tipo} onChange={setTipo} all="Todos os tipos" options={tipos.map(([id, nome]) => [id || "", nome || "Sem tipo"])} /><Filtro value={setorOriginal} onChange={setSetorOriginal} all="Todos os setores de cadastro" options={setoresOriginais.map((value) => [value, value])} /></div>
        <Tabela><thead><tr><Th /><Th>Equipamento</Th>{!unidadeInteira && <Th>Setor do plano</Th>}<Th>P</Th><Th>C</Th><Th>S</Th></tr></thead><tbody>{disponiveis.map((item) => { const sel = selecionados[item.id]; return <tr key={item.id} className="border-t"><Td><Checkbox checked={Boolean(sel)} onCheckedChange={(value) => toggleSelecionado(item.id, Boolean(value))} /></Td><Td>{equipamentoNome(item)}</Td>{!unidadeInteira && <Td><SetorSelect value={sel?.setorId || ""} setores={setores} onChange={(value) => patchSelecionado(item.id, { setorId: value })} disabled={!sel} /></Td>}{(["p", "c", "s"] as const).map((key) => <Td key={key}><Checkbox checked={sel?.[key] || false} disabled={!sel} onCheckedChange={(value) => patchSelecionado(item.id, { [key]: Boolean(value) })} /></Td>)}</tr>; })}</tbody></Tabela>
        <Button className="mt-2" size="sm" onClick={adicionarSelecionados} disabled={!Object.keys(selecionados).length}>Adicionar selecionados</Button>
      </section>
      <section><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Equipamentos incluidos no plano</h3>{incluidosSelecionados.length > 0 && <div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarPreventiva: true })}>Marcar P</Button><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarPreventiva: false })}>Desmarcar P</Button><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarCalibracao: true })}>Marcar C</Button><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarCalibracao: false })}>Desmarcar C</Button><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarSegurancaEletrica: true })}>Marcar S</Button><Button size="sm" variant="outline" onClick={() => atualizarIncluidosEmLote({ executarSegurancaEletrica: false })}>Desmarcar S</Button><Button size="sm" variant="destructive" onClick={removerIncluidosEmLote}>Remover</Button></div>}</div><Tabela><thead><tr><Th /><Th>Setor</Th><Th>Equipamento</Th><Th>Marca</Th><Th>Modelo</Th><Th>Numero de serie</Th><Th>P</Th><Th>C</Th><Th>S</Th><Th /></tr></thead><tbody>{incluidosVisiveis.map((item) => <tr key={item.id} className="border-t"><Td><Checkbox checked={incluidosSelecionados.includes(item.id)} onCheckedChange={(value) => setIncluidosSelecionados((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))} /></Td><Td>{unidadeInteira ? "Unidade inteira" : <SetorSelect value={item.setor_id || ""} setores={setores} onChange={(setorId) => salvarIncluido(item, { setorId: setorId || null })} />}</Td><Td>{item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento"}</Td><Td>{item.equipamento?.fabricante || "-"}</Td><Td>{item.equipamento?.modelo || "-"}</Td><Td>{item.equipamento?.numero_serie || "-"}</Td>{([["executar_preventiva", "executarPreventiva"], ["executar_calibracao", "executarCalibracao"], ["executar_seguranca_eletrica", "executarSegurancaEletrica"]] as const).map(([db, input]) => <Td key={db}><Checkbox checked={item[db]} onCheckedChange={(value) => salvarIncluido(item, { [input]: Boolean(value) })} /></Td>)}<Td><Button size="icon" variant="ghost" className="text-destructive" onClick={() => removerIncluido(item)}><Trash2 className="h-4 w-4" /></Button></Td></tr>)}</tbody></Tabela></section>
    </div>}
  </DialogContent></Dialog>;
};

const erro = (title: string, error: unknown) => toast({ title, description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
const Tabela = ({ children }: { children: React.ReactNode }) => <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm">{children}</table></div>;
const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap bg-muted/40 px-3 py-2 text-left font-medium">{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-2">{children}</td>;
const Filtro = ({ value, onChange, all, options }: { value: string; onChange: (value: string) => void; all: string; options: string[][] }) => <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{all}</SelectItem>{options.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>;
const SetorSelect = ({ value, setores, onChange, disabled }: { value: string; setores: PlanoSetor[]; onChange: (value: string) => void; disabled?: boolean }) => <Select value={value || "__none__"} onValueChange={(item) => onChange(item === "__none__" ? "" : item)} disabled={disabled}><SelectTrigger className="h-8 min-w-36"><SelectValue placeholder="Sem setor" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem setor</SelectItem>{setores.map((setor) => <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>)}</SelectContent></Select>;
const SetorFiltro = ({ value, setores, onChange }: { value: string; setores: PlanoSetor[]; onChange: (value: string) => void }) => <Select value={value} onValueChange={onChange}><SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos os setores</SelectItem>{setores.map((setor) => <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>)}<SelectItem value={SEM_SETOR}>Sem setor</SelectItem></SelectContent></Select>;

export default PlanoEquipamentosDialog;

import { useMemo, useState } from "react";
import { CalendarCheck, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";
import SearchableSelect from "@/components/SearchableSelect";
import { useData, ProcedimentoPreventiva } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

const Procedimentos = () => {
  const { procedimentos, addProcedimento, updateProcedimento, removeProcedimento, tipos } = useData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcedimentoPreventiva | null>(null);
  const [form, setForm] = useState({ nome: "", tipoEquipamento: "", itensTexto: "" });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const novoTipo = searchParams.get("novo");
    if (novoTipo) {
      setEditing(null);
      setForm({ nome: `Preventiva - ${novoTipo}`, tipoEquipamento: novoTipo, itensTexto: "" });
      setOpen(true);
      searchParams.delete("novo");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return procedimentos.filter(
      (p) => !q || p.nome.toLowerCase().includes(q) || p.tipoEquipamento.toLowerCase().includes(q)
    );
  }, [procedimentos, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: "", tipoEquipamento: "", itensTexto: "" });
    setOpen(true);
  };
  const openEdit = (p: ProcedimentoPreventiva) => {
    setEditing(p);
    setForm({ nome: p.nome, tipoEquipamento: p.tipoEquipamento, itensTexto: p.itens.join("\n") });
    setOpen(true);
  };
  const handleSave = () => {
    if (!form.nome.trim() || !form.tipoEquipamento.trim()) {
      toast({ title: "Preencha nome e tipo de equipamento", variant: "destructive" });
      return;
    }
    const itens = form.itensTexto
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (itens.length === 0) {
      toast({ title: "Adicione ao menos um item ao checklist", variant: "destructive" });
      return;
    }
    if (editing) {
      updateProcedimento(editing.id, { nome: form.nome, tipoEquipamento: form.tipoEquipamento, itens });
      toast({ title: "Procedimento atualizado" });
    } else {
      addProcedimento({ nome: form.nome, tipoEquipamento: form.tipoEquipamento, itens });
      toast({ title: "Procedimento cadastrado" });
    }
    setOpen(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Procedimentos de Preventiva" description="Cadastre checklists por tipo de equipamento">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Procedimento
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar procedimento ou tipo..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo de Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Itens</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-primary" /> {p.nome}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.tipoEquipamento}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.itens.length}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          removeProcedimento(p.id);
                          toast({ title: "Procedimento removido" });
                        }}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum procedimento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Procedimento" : "Novo Procedimento"}</DialogTitle>
            <DialogDescription>
              Defina os itens do checklist. Cada linha será um item a ser verificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Preventiva Monitor Multiparâmetro"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Equipamento</label>
              <SearchableSelect
                value={form.tipoEquipamento}
                onValueChange={(v) => setForm((f) => ({ ...f, tipoEquipamento: v }))}
                options={tipos}
                placeholder="Selecione o tipo"
                emptyText="Nenhum tipo encontrado."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Itens do Checklist (um por linha)</label>
              <Textarea
                value={form.itensTexto}
                onChange={(e) => setForm((f) => ({ ...f, itensTexto: e.target.value }))}
                rows={10}
                placeholder={"Verificar cabo de força\nLimpeza geral\nTeste de bateria\nCalibração de sensores"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A "Aprovação para uso" será adicionada automaticamente ao final do checklist.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Procedimentos;

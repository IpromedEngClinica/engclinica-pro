import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAtualizarSetorPlano,
  useCriarSetorPlano,
  useRemoverSetorPlano,
} from "@/hooks/usePlanos";
import { toast } from "@/hooks/use-toast";
import type { Plano, PlanoSetor } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano;
};

const PlanoSetoresDialog = ({ open, onOpenChange, plano }: Props) => {
  const criar = useCriarSetorPlano();
  const atualizar = useAtualizarSetorPlano();
  const remover = useRemoverSetorPlano();
  const setores = plano.setores || [];
  const [form, setForm] = useState({ nome: "", unidade: "", ordem: String(setores.length + 1) });

  const reset = () => setForm({ nome: "", unidade: "", ordem: String(setores.length + 1) });

  const criarSetor = async () => {
    try {
      await criar.mutateAsync({
        planoId: plano.id,
        input: { nome: form.nome, unidade: form.unidade, ordem: Number(form.ordem || 0) },
      });
      reset();
      toast({ title: "Setor adicionado." });
    } catch (error) {
      erro("Erro ao adicionar setor", error);
    }
  };

  const editar = async (setor: PlanoSetor) => {
    const nome = window.prompt("Nome do setor:", setor.nome);
    if (!nome?.trim()) return;
    const unidade = window.prompt("Unidade:", setor.unidade || "") ?? setor.unidade ?? "";
    try {
      await atualizar.mutateAsync({ id: setor.id, input: { ...setor, nome, unidade } });
      toast({ title: "Setor atualizado." });
    } catch (error) {
      erro("Erro ao atualizar setor", error);
    }
  };

  const excluir = async (setor: PlanoSetor) => {
    const possuiEquipamentos = (plano.equipamentos || []).some((item) => item.setor_id === setor.id);
    const mensagem = possuiEquipamentos
      ? `O setor "${setor.nome}" possui equipamentos. Eles ficarao sem setor. Continuar?`
      : `Excluir o setor "${setor.nome}"?`;
    if (!window.confirm(mensagem)) return;
    try {
      await remover.mutateAsync(setor.id);
      toast({ title: "Setor removido." });
    } catch (error) {
      erro("Erro ao remover setor", error);
    }
  };

  const mover = async (setor: PlanoSetor, delta: number) => {
    const index = setores.findIndex((item) => item.id === setor.id);
    const outro = setores[index + delta];
    if (!outro) return;
    try {
      await Promise.all([
        atualizar.mutateAsync({ id: setor.id, input: { ...setor, ordem: outro.ordem } }),
        atualizar.mutateAsync({ id: outro.id, input: { ...outro, ordem: setor.ordem } }),
      ]);
    } catch (error) {
      erro("Erro ao ordenar setores", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar setores</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Field label="Nome do setor*" value={form.nome} onChange={(nome) => setForm({ ...form, nome })} />
          <Field label="Unidade" value={form.unidade} onChange={(unidade) => setForm({ ...form, unidade })} />
          <Field label="Ordem" type="number" value={form.ordem} onChange={(ordem) => setForm({ ...form, ordem })} />
          <Button className="self-end" onClick={criarSetor} disabled={criar.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <Th>Ordem</Th>
                <Th>Setor</Th>
                <Th>Unidade</Th>
                <Th>Equipamentos</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {setores.map((setor, index) => (
                <tr key={setor.id} className="border-t">
                  <Td>{setor.ordem}</Td>
                  <Td>{setor.nome}</Td>
                  <Td>{setor.unidade || "-"}</Td>
                  <Td>{(plano.equipamentos || []).filter((item) => item.setor_id === setor.id).length}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" disabled={!index} onClick={() => mover(setor, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" disabled={index === setores.length - 1} onClick={() => mover(setor, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => editar(setor)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => excluir(setor)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {!setores.length && <tr><Td>Nenhum setor cadastrado.</Td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const erro = (title: string, error: unknown) =>
  toast({ title, description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);
const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-2 text-left font-medium">{children}</th>;
const Td = ({ children }: { children?: React.ReactNode }) => <td className="whitespace-nowrap px-3 py-2">{children}</td>;

export default PlanoSetoresDialog;

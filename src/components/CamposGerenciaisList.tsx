import { Plus, Trash2, Settings2, Search, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

// Capitaliza a primeira letra de cada palavra preservando acentos.
// Regex anterior (\b\w) tratava letras acentuadas como fronteira de palavra,
// resultando em "ElétRico". Usamos Unicode-aware boundaries.
const capitalizeWords = (str: string) =>
  str.replace(/(^|\s)(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("pt-BR"));

interface CamposGerenciaisListProps {
  title: string;
  description: string;
  items: string[];
  onAdd: (item: string) => void | Promise<void>;
  onRemove: (index: number) => void | Promise<void>;
  onRename?: (index: number, novoNome: string) => void | Promise<void>;
  placeholder?: string;
  itemLabel?: string;
  canRemove?: (index: number) => { ok: boolean; reason?: string };
}

const CamposGerenciaisList = ({
  title,
  description,
  items,
  onAdd,
  onRemove,
  onRename,
  placeholder = "Novo item...",
  itemLabel = "item",
  canRemove,
}: CamposGerenciaisListProps) => {
  const [novo, setNovo] = useState("");
  const [search, setSearch] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const indexed = items.map((value, index) => ({ value, index }));
    if (!search.trim()) return indexed;
    return indexed.filter((i) => i.value.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const handleAdd = async () => {
    const formatted = capitalizeWords(novo.trim());
    if (!formatted || busy) return;
    if (items.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: `${itemLabel} já cadastrado`, variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      await onAdd(formatted);
      setNovo("");
      toast({ title: `${itemLabel} adicionado com sucesso` });
    } catch (error) {
      toast({
        title: `Erro ao adicionar ${itemLabel.toLowerCase()}`,
        description:
          error instanceof Error ? error.message : "Não foi possível salvar o registro.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (busy) return;
    if (canRemove) {
      const check = canRemove(index);
      if (!check.ok) {
        toast({ title: `Não é possível remover`, description: check.reason, variant: "destructive" });
        return;
      }
    }
    try {
      setBusy(true);
      await onRemove(index);
      toast({ title: `${itemLabel} removido` });
    } catch (error) {
      toast({
        title: `Erro ao remover ${itemLabel.toLowerCase()}`,
        description:
          error instanceof Error ? error.message : "Não foi possível remover o registro.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const confirmEdit = async (index: number) => {
    if (!onRename) return;
    const formatted = capitalizeWords(editingValue.trim());
    if (!formatted || busy) return;
    const original = items[index];
    if (formatted === original) {
      cancelEdit();
      return;
    }
    if (items.some((t, i) => i !== index && t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: `${itemLabel} já cadastrado`, variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      await onRename(index, formatted);
      toast({
        title: `${itemLabel} atualizado`,
        description: "Consultas dependentes foram atualizadas.",
      });
      cancelEdit();
    } catch (error) {
      toast({
        title: `Erro ao atualizar ${itemLabel.toLowerCase()}`,
        description:
          error instanceof Error ? error.message : "Não foi possível atualizar o registro.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={title} description={description} />
      <div className="bg-card rounded-xl border max-w-2xl">
        <div className="px-5 py-4 border-b flex gap-3">
          <Input
            placeholder={placeholder}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={busy}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>
        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ul className="divide-y">
          {filtered.map(({ value, index }) => {
            const isEditing = editingIndex === index;
            return (
              <li
                key={index}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Settings2 className="w-4 h-4 text-primary shrink-0" />
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit(index);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-8"
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground truncate">{value}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmEdit(index)}
                        disabled={busy}
                        className="text-success hover:text-success"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {onRename && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(index, value)}
                          disabled={busy}
                          className="text-muted-foreground hover:text-primary"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(index)}
                        disabled={busy}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum {itemLabel.toLowerCase()} encontrado
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CamposGerenciaisList;

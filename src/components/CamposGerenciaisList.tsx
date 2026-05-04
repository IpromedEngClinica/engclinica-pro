import { Plus, Trash2, Settings2, Search, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

const capitalizeWords = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

interface CamposGerenciaisListProps {
  title: string;
  description: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  onRename?: (index: number, novoNome: string) => void;
  placeholder?: string;
  itemLabel?: string;
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
}: CamposGerenciaisListProps) => {
  const [novo, setNovo] = useState("");
  const [search, setSearch] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const filtered = useMemo(() => {
    const indexed = items.map((value, index) => ({ value, index }));
    if (!search.trim()) return indexed;
    return indexed.filter((i) => i.value.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const handleAdd = () => {
    const formatted = capitalizeWords(novo.trim());
    if (!formatted) return;
    if (items.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: `${itemLabel} já cadastrado`, variant: "destructive" });
      return;
    }
    onAdd(formatted);
    setNovo("");
    toast({ title: `${itemLabel} adicionado com sucesso` });
  };

  const handleRemove = (index: number) => {
    onRemove(index);
    toast({ title: `${itemLabel} removido` });
  };

  const startEdit = (index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const confirmEdit = (index: number) => {
    if (!onRename) return;
    const formatted = capitalizeWords(editingValue.trim());
    if (!formatted) return;
    const original = items[index];
    if (formatted === original) {
      cancelEdit();
      return;
    }
    if (items.some((t, i) => i !== index && t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: `${itemLabel} já cadastrado`, variant: "destructive" });
      return;
    }
    onRename(index, formatted);
    toast({
      title: `${itemLabel} atualizado`,
      description: "Todas as referências dependentes foram atualizadas.",
    });
    cancelEdit();
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
          <Button onClick={handleAdd}>
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
                        className="text-success hover:text-success"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
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

import { Plus, Trash2, Settings2, Search } from "lucide-react";
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
  placeholder?: string;
  itemLabel?: string;
}

const CamposGerenciaisList = ({
  title,
  description,
  items,
  onAdd,
  onRemove,
  placeholder = "Novo item...",
  itemLabel = "item",
}: CamposGerenciaisListProps) => {
  const [novo, setNovo] = useState("");
  const [search, setSearch] = useState("");

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
          {filtered.map(({ value, index }) => (
            <li key={index} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
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

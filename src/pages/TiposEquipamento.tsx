import { Plus, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { useState } from "react";

const capitalizeWords = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

const TiposEquipamento = () => {
  const { tipos, addTipo, removeTipo } = useData();
  const [novoTipo, setNovoTipo] = useState("");

  const handleAdd = () => {
    const formatted = capitalizeWords(novoTipo.trim());
    if (!formatted) return;
    if (tipos.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      toast({ title: "Tipo já cadastrado", variant: "destructive" });
      return;
    }
    addTipo(formatted);
    setNovoTipo("");
    toast({ title: "Tipo adicionado com sucesso" });
  };

  const handleRemove = (index: number) => {
    removeTipo(index);
    toast({ title: "Tipo removido" });
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tipos de Equipamento" description="Gerencie os tipos de equipamento disponíveis no sistema" />
      <div className="bg-card rounded-xl border max-w-2xl">
        <div className="px-5 py-4 border-b flex gap-3">
          <Input placeholder="Novo tipo de equipamento..." value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="flex-1" />
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
        </div>
        <ul className="divide-y">
          {tipos.map((tipo, index) => (
            <li key={index} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{tipo}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
          {tipos.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum tipo cadastrado</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TiposEquipamento;

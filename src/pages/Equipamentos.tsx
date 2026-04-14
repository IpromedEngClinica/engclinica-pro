import { Cpu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";

const mockEquipamentos = [
  { id: 1, nome: "Monitor Multiparâmetro", marca: "Philips", modelo: "MX800", serie: "SN-001234", empresa: "Hospital São Lucas", status: "Ativo" },
  { id: 2, nome: "Ventilador Pulmonar", marca: "Dräger", modelo: "Savina 300", serie: "SN-005678", empresa: "Clínica Santa Maria", status: "Em manutenção" },
  { id: 3, nome: "Bisturi Elétrico", marca: "WEM", modelo: "SS-501", serie: "SN-009012", empresa: "Hospital Regional", status: "Ativo" },
  { id: 4, nome: "Desfibrilador", marca: "CMOS Drake", modelo: "Life 400", serie: "SN-003456", empresa: "UPA Centro", status: "Inativo" },
  { id: 5, nome: "Bomba de Infusão", marca: "B.Braun", modelo: "Infusomat", serie: "SN-007890", empresa: "Hospital São Lucas", status: "Ativo" },
];

const statusColor: Record<string, string> = {
  Ativo: "bg-success/10 text-success",
  "Em manutenção": "bg-warning/10 text-warning",
  Inativo: "bg-destructive/10 text-destructive",
};

const Equipamentos = () => {
  const [search, setSearch] = useState("");
  const filtered = mockEquipamentos.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase()) || e.empresa.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Equipamentos" description="Gerencie os equipamentos cadastrados">
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar equipamento ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Marca</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Modelo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nº Série</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> {e.nome}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.marca}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.modelo}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.serie}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.empresa}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[e.status]}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Equipamentos;

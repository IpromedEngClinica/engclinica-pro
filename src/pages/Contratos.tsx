import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";

const mockContratos = [
  { id: 1, numero: "CT-2024-001", empresa: "Hospital São Lucas", tipo: "Manutenção Preventiva", inicio: "01/01/2024", fim: "31/12/2024", valor: "R$ 15.000,00", status: "Ativo" },
  { id: 2, numero: "CT-2024-002", empresa: "Clínica Santa Maria", tipo: "Manutenção Corretiva", inicio: "01/03/2024", fim: "28/02/2025", valor: "R$ 8.500,00", status: "Ativo" },
  { id: 3, numero: "CT-2023-015", empresa: "Hospital Regional", tipo: "Calibração", inicio: "01/06/2023", fim: "31/05/2024", valor: "R$ 22.000,00", status: "Vencido" },
  { id: 4, numero: "CT-2024-003", empresa: "UPA Centro", tipo: "Manutenção Preventiva", inicio: "01/04/2024", fim: "31/03/2025", valor: "R$ 6.200,00", status: "Ativo" },
];

const Contratos = () => {
  const [search, setSearch] = useState("");
  const filtered = mockContratos.filter((c) =>
    c.empresa.toLowerCase().includes(search.toLowerCase()) || c.numero.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Contratos" description="Gerencie os contratos de serviço">
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Contrato
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar contrato ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Número</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Início</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fim</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Valor</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {c.numero}
                  </td>
                  <td className="px-5 py-3 text-foreground">{c.empresa}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.tipo}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.inicio}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.fim}</td>
                  <td className="px-5 py-3 text-foreground font-medium">{c.valor}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.status === "Ativo" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>{c.status}</span>
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

export default Contratos;

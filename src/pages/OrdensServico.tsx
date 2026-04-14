import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";

const mockOS = [
  { id: 1, codigo: "OS-2024-0312", equipamento: "Monitor Multiparâmetro", empresa: "Hospital São Lucas", tipo: "Corretiva", prioridade: "Alta", status: "Aberta", data: "14/04/2026" },
  { id: 2, codigo: "OS-2024-0311", equipamento: "Ventilador Pulmonar", empresa: "Clínica Santa Maria", tipo: "Preventiva", prioridade: "Média", status: "Em andamento", data: "13/04/2026" },
  { id: 3, codigo: "OS-2024-0310", equipamento: "Bisturi Elétrico", empresa: "Hospital Regional", tipo: "Corretiva", prioridade: "Baixa", status: "Finalizada", data: "12/04/2026" },
  { id: 4, codigo: "OS-2024-0309", equipamento: "Desfibrilador", empresa: "UPA Centro", tipo: "Calibração", prioridade: "Alta", status: "Aberta", data: "12/04/2026" },
  { id: 5, codigo: "OS-2024-0308", equipamento: "Bomba de Infusão", empresa: "Hospital São Lucas", tipo: "Preventiva", prioridade: "Média", status: "Finalizada", data: "11/04/2026" },
];

const statusColor: Record<string, string> = {
  Aberta: "bg-warning/10 text-warning",
  "Em andamento": "bg-info/10 text-info",
  Finalizada: "bg-success/10 text-success",
};

const prioridadeColor: Record<string, string> = {
  Alta: "bg-destructive/10 text-destructive",
  Média: "bg-warning/10 text-warning",
  Baixa: "bg-muted text-muted-foreground",
};

const OrdensServico = () => {
  const [search, setSearch] = useState("");
  const filtered = mockOS.filter((os) =>
    os.codigo.toLowerCase().includes(search.toLowerCase()) ||
    os.equipamento.toLowerCase().includes(search.toLowerCase()) ||
    os.empresa.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ordens de Serviço" description="Gerencie as ordens de serviço">
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Nova OS
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar OS, equipamento ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Código</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Prioridade</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((os) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-primary flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> {os.codigo}
                  </td>
                  <td className="px-5 py-3 text-foreground">{os.equipamento}</td>
                  <td className="px-5 py-3 text-muted-foreground">{os.empresa}</td>
                  <td className="px-5 py-3 text-muted-foreground">{os.tipo}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${prioridadeColor[os.prioridade]}`}>{os.prioridade}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[os.status]}`}>{os.status}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{os.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdensServico;

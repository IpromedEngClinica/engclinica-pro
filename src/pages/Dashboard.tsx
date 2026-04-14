import { Building2, Cpu, FileText, ClipboardList, TrendingDown, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const stats = [
  { label: "Empresas", value: 24, icon: Building2, change: "+3 este mês", up: true },
  { label: "Equipamentos", value: 1387, icon: Cpu, change: "+12 este mês", up: true },
  { label: "Contratos Ativos", value: 18, icon: FileText, change: "2 vencem em breve", up: false },
  { label: "OS Abertas", value: 47, icon: ClipboardList, change: "-8% vs último mês", up: true },
];

const recentOS = [
  { id: "OS-2024-0312", equipamento: "Monitor Multiparâmetro", empresa: "Hospital São Lucas", status: "Aberta", data: "14/04/2026" },
  { id: "OS-2024-0311", equipamento: "Ventilador Pulmonar", empresa: "Clínica Santa Maria", status: "Em andamento", data: "13/04/2026" },
  { id: "OS-2024-0310", equipamento: "Bisturi Elétrico", empresa: "Hospital Regional", status: "Finalizada", data: "12/04/2026" },
  { id: "OS-2024-0309", equipamento: "Desfibrilador", empresa: "UPA Centro", status: "Aberta", data: "12/04/2026" },
  { id: "OS-2024-0308", equipamento: "Bomba de Infusão", empresa: "Hospital São Lucas", status: "Finalizada", data: "11/04/2026" },
];

const statusColor: Record<string, string> = {
  Aberta: "bg-warning/10 text-warning",
  "Em andamento": "bg-info/10 text-info",
  Finalizada: "bg-success/10 text-success",
};

const Dashboard = () => (
  <div className="p-6 lg:p-8">
    <PageHeader title="Painel de Controle" description="Visão geral do sistema" />

    {/* Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="bg-card rounded-xl border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
          </div>
          <span className="text-3xl font-bold text-foreground">{s.value.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {s.up ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-warning" />}
            {s.change}
          </span>
        </div>
      ))}
    </div>

    {/* Recent OS */}
    <div className="bg-card rounded-xl border">
      <div className="px-5 py-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Últimas Ordens de Serviço</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Equipamento</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Empresa</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {recentOS.map((os) => (
              <tr key={os.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 font-medium text-primary">{os.id}</td>
                <td className="px-5 py-3 text-foreground">{os.equipamento}</td>
                <td className="px-5 py-3 text-muted-foreground">{os.empresa}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[os.status]}`}>
                    {os.status}
                  </span>
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

export default Dashboard;

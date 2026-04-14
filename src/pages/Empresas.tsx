import { Building2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EmpresaFormDialog from "@/components/EmpresaFormDialog";
import { useState } from "react";
const mockEmpresas = [
  { id: 1, nome: "Hospital São Lucas", cnpj: "12.345.678/0001-01", cidade: "São Paulo", estado: "SP", email: "contato@saolucas.com", contato: "João Silva" },
  { id: 2, nome: "Clínica Santa Maria", cnpj: "98.765.432/0001-02", cidade: "Rio de Janeiro", estado: "RJ", email: "admin@santamaria.com", contato: "Maria Souza" },
  { id: 3, nome: "Hospital Regional", cnpj: "11.222.333/0001-03", cidade: "Belo Horizonte", estado: "MG", email: "contato@hregional.com", contato: "Carlos Lima" },
  { id: 4, nome: "UPA Centro", cnpj: "44.555.666/0001-04", cidade: "Curitiba", estado: "PR", email: "upa@centro.com", contato: "Ana Costa" },
  { id: 5, nome: "Clínica Vida", cnpj: "77.888.999/0001-05", cidade: "Porto Alegre", estado: "RS", email: "vida@clinica.com", contato: "Pedro Santos" },
];

const Empresas = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const filtered = mockEmpresas.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Empresas" description="Gerencie as empresas cadastradas">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </PageHeader>

      <EmpresaFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">CNPJ</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Cidade</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> {e.nome}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cnpj}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cidade}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.telefone}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      e.contrato === "Ativo" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {e.contrato}
                    </span>
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

export default Empresas;

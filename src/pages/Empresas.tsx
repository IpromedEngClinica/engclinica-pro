import { Building2, Plus, Search, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EmpresaFormDialog, { DialogMode } from "@/components/EmpresaFormDialog";
import { useState } from "react";
import { useData, Empresa } from "@/contexts/DataContext";

const Empresas = () => {
  const { empresasList } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Empresa | null>(null);

  const filtered = empresasList.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setDialogOpen(true);
  };

  const openView = (e: Empresa) => {
    setSelected(e);
    setMode("view");
    setDialogOpen(true);
  };

  const openEdit = (e: Empresa) => {
    setSelected(e);
    setMode("edit");
    setDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Empresas" description="Gerencie as empresas cadastradas">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </PageHeader>

      <EmpresaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        empresa={selected}
      />

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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Cidade</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">E-mail</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contato</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">CPF/CNPJ</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> {e.nome}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cidade}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.estado}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.telefone || e.celular || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.contato}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cpfCnpj}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openView(e)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Empresas;

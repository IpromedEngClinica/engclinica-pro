import { Building2, Plus, Search, Eye, Pencil, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EmpresaFormDialog, { DialogMode } from "@/components/EmpresaFormDialog";
import EmpresaDetalhesDialog from "@/components/EmpresaDetalhesDialog";
import EquipamentoDetalhesDialog from "@/components/EquipamentoDetalhesDialog";
import OrdemServicoDetalhesDialog from "@/components/OrdemServicoDetalhesDialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, Empresa, Equipamento, OrdemServico } from "@/contexts/DataContext";

const Empresas = () => {
  const { empresasList, equipamentos, ordensServico } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesEmp, setDetalhesEmp] = useState<Empresa | null>(null);

  const [eqDetalhesOpen, setEqDetalhesOpen] = useState(false);
  const [eqDetalhesSel, setEqDetalhesSel] = useState<Equipamento | null>(null);

  const [osDetalhesOpen, setOsDetalhesOpen] = useState(false);
  const [osDetalhesSel, setOsDetalhesSel] = useState<OrdemServico | null>(null);

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId) {
      const emp = empresasList.find((e) => String(e.id) === viewId);
      if (emp) {
        setDetalhesEmp(emp);
        setDetalhesOpen(true);
      }
      searchParams.delete("view");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, empresasList, setSearchParams]);

  const filtered = empresasList.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setDialogOpen(true);
  };

  const openView = (e: Empresa) => {
    setDetalhesEmp(e);
    setDetalhesOpen(true);
  };

  const openEdit = (e: Empresa) => {
    setSelected(e);
    setMode("edit");
    setDialogOpen(true);
  };

  const openOSById = (id: number) => {
    const os = ordensServico.find((o) => o.id === id);
    if (os) {
      setDetalhesOpen(false);
      setOsDetalhesSel(os);
      setOsDetalhesOpen(true);
    }
  };

  const openEquipamentoById = (id: number) => {
    const eq = equipamentos.find((e) => e.id === id);
    if (eq) {
      setDetalhesOpen(false);
      setEqDetalhesSel(eq);
      setEqDetalhesOpen(true);
    }
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

      <EmpresaDetalhesDialog
        open={detalhesOpen}
        onOpenChange={(v) => { setDetalhesOpen(v); if (!v) setDetalhesEmp(null); }}
        empresa={detalhesEmp}
        onSelectOS={openOSById}
        onSelectEquipamento={openEquipamentoById}
      />

      <EquipamentoDetalhesDialog
        open={eqDetalhesOpen}
        onOpenChange={(v) => { setEqDetalhesOpen(v); if (!v) setEqDetalhesSel(null); }}
        equipamento={eqDetalhesSel}
        onSelectOS={openOSById}
      />

      <OrdemServicoDetalhesDialog
        open={osDetalhesOpen}
        onOpenChange={(v) => { setOsDetalhesOpen(v); if (!v) setOsDetalhesSel(null); }}
        os={osDetalhesSel}
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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
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
                  <td className="px-5 py-3 font-medium text-foreground">
                    <button
                      type="button"
                      onClick={() => openView(e)}
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" /> {e.nome}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.tipoCliente || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cidade}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.estado}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.telefone || e.celular || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.contato}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.cpfCnpj}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Ações">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-popover">
                          <DropdownMenuItem onClick={() => openView(e)}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-muted-foreground">
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

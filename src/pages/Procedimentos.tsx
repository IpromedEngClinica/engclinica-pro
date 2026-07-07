import { useMemo, useState } from "react";
import { CalendarCheck, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ListLimitSelect, {
  DEFAULT_LIST_LIMIT,
} from "@/components/ListLimitSelect";
import ListPagination from "@/components/ListPagination";
import PageHeader from "@/components/PageHeader";
import ProcedimentoPreventivaFormDialog from "@/components/ProcedimentoPreventivaFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useDesativarProcedimentoPreventiva,
  useProcedimentosPreventiva,
} from "@/hooks/useProcedimentosPreventiva";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import type { ProcedimentoPreventiva } from "@/services/procedimentosPreventivaService";

const Procedimentos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(Boolean(searchParams.get("tipoEquipamentoId")));
  const [editing, setEditing] = useState<ProcedimentoPreventiva | null>(null);
  const [listLimit, setListLimit] = useState(DEFAULT_LIST_LIMIT);
  const [tipoInicial, setTipoInicial] = useState(
    searchParams.get("tipoEquipamentoId")
  );

  const { data: procedimentos = [], isLoading, isError, error } =
    useProcedimentosPreventiva();
  const desativarProcedimento = useDesativarProcedimentoPreventiva();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return procedimentos.filter((procedimento) => {
      const tipo = procedimento.tipo_equipamento?.nome || "";

      return (
        !q ||
        procedimento.titulo.toLowerCase().includes(q) ||
        tipo.toLowerCase().includes(q)
      );
    });
  }, [procedimentos, search]);

  const {
    paginatedItems: visibleProcedimentos,
    ...procedimentosPagination
  } = usePaginatedList(filtered, listLimit);

  const openCreate = () => {
    setEditing(null);
    setTipoInicial(null);
    setOpen(true);
  };

  const openEdit = (procedimento: ProcedimentoPreventiva) => {
    setEditing(procedimento);
    setTipoInicial(null);
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setEditing(null);
      setTipoInicial(null);
      if (searchParams.get("tipoEquipamentoId")) {
        searchParams.delete("tipoEquipamentoId");
        setSearchParams(searchParams, { replace: true });
      }
    }
  };

  const handleDesativar = async (procedimento: ProcedimentoPreventiva) => {
    const confirmar = window.confirm(
      `Desativar o procedimento "${procedimento.titulo}"?`
    );

    if (!confirmar) return;

    try {
      await desativarProcedimento.mutateAsync(procedimento.id);
      toast({ title: "Procedimento desativado." });
    } catch (error) {
      toast({
        title: "Erro ao desativar procedimento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Procedimentos Preventivos"
        description="Cadastre checklists por tipo de equipamento"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Procedimento
        </Button>
      </PageHeader>

      <ProcedimentoPreventivaFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        procedimento={editing}
        tipoEquipamentoIdInicial={tipoInicial}
      />

      <div className="bg-card rounded-xl border">
        <div className="px-5 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar procedimento ou tipo..."
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ListLimitSelect
            value={listLimit}
            onChange={setListLimit}
            total={filtered.length}
          />
        </div>

        {isLoading && (
          <div className="px-5 py-10 flex justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando procedimentos...
          </div>
        )}

        {isError && (
          <div className="px-5 py-8 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro desconhecido."}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Titulo
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Tipo de Equipamento
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Validade
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Itens
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProcedimentos.map((procedimento) => (
                  <tr
                    key={procedimento.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-primary" />
                        {procedimento.titulo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {procedimento.tipo_equipamento?.nome || "-"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {procedimento.validade_meses} meses
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {procedimento.itens?.length || 0}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        Ativo
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(procedimento)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDesativar(procedimento)}
                          title="Desativar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum procedimento cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <ListPagination
              {...procedimentosPagination}
              onPageChange={procedimentosPagination.setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Procedimentos;

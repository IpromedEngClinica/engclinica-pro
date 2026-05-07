import { useMemo, useState } from "react";
import { Search, MoreHorizontal, Pencil, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empresa, useData } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa | null;
  onSelectOS?: (osId: number) => void;
  onSelectEquipamento?: (equipamentoId: number) => void;
  onCreateEquipamento?: (empresa: Empresa) => void;
  onEdit?: (empresa: Empresa) => void;
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border bg-card shadow-sm">
    <div className="inline-block -mt-3 ml-4 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
      {title}
    </div>
    <div className="p-5 pt-3 space-y-2 text-foreground">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="text-sm">
    <span className="font-semibold text-foreground">{label}: </span>
    <span className="text-foreground">{children || "—"}</span>
  </div>
);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const ESTADOS_FECHADOS = new Set([
  "Fechada",
  "Cancelada",
  "Serviço Finalizado",
  "Liberado Para Entrega",
]);

const PAGE_OPTIONS = [10, 25, 50, 100];

const TableControls = ({
  search,
  setSearch,
  perPage,
  setPerPage,
  placeholder,
}: {
  search: string;
  setSearch: (v: string) => void;
  perPage: number;
  setPerPage: (v: number) => void;
  placeholder: string;
}) => (
  <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-3">
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9 h-9"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Mostrar</span>
      <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
        <SelectTrigger className="h-9 w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PAGE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>itens</span>
    </div>
  </div>
);

const EmpresaDetalhesDialog = ({
  open,
  onOpenChange,
  empresa,
  onSelectOS,
  onSelectEquipamento,
}: Props) => {
  const { ordensServico, equipamentos } = useData();

  const [osSearch, setOsSearch] = useState("");
  const [osPerPage, setOsPerPage] = useState(10);
  const [eqSearch, setEqSearch] = useState("");
  const [eqPerPage, setEqPerPage] = useState(10);

  const osAbertas = useMemo(() => {
    if (!empresa) return [];
    return ordensServico
      .filter((o) => o.solicitante === empresa.nome && !ESTADOS_FECHADOS.has(o.estado))
      .sort((a, b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
  }, [ordensServico, empresa]);

  const equipamentosCliente = useMemo(() => {
    if (!empresa) return [];
    return equipamentos.filter((e) => e.empresa === empresa.nome);
  }, [equipamentos, empresa]);

  const osFiltered = useMemo(() => {
    const q = osSearch.trim().toLowerCase();
    const list = !q
      ? osAbertas
      : osAbertas.filter(
          (o) =>
            o.numero.toLowerCase().includes(q) ||
            o.estado.toLowerCase().includes(q) ||
            o.tipoServico.toLowerCase().includes(q) ||
            (o.responsavelTecnico || "").toLowerCase().includes(q),
        );
    return list.slice(0, osPerPage);
  }, [osAbertas, osSearch, osPerPage]);

  const eqFiltered = useMemo(() => {
    const q = eqSearch.trim().toLowerCase();
    const list = !q
      ? equipamentosCliente
      : equipamentosCliente.filter(
          (e) =>
            e.tipo.toLowerCase().includes(q) ||
            e.modelo.toLowerCase().includes(q) ||
            e.fabricante.toLowerCase().includes(q) ||
            e.tag.toLowerCase().includes(q) ||
            e.serie.toLowerCase().includes(q) ||
            (e.setor || "").toLowerCase().includes(q) ||
            (e.patrimonio || "").toLowerCase().includes(q),
        );
    return list.slice(0, eqPerPage);
  }, [equipamentosCliente, eqSearch, eqPerPage]);

  if (!empresa) return null;
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl text-foreground">{empresa.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          <Card title="Dados Gerais">
            <Field label="Nome">{empresa.nome}</Field>
            <Field label="Nome Fantasia">{empresa.nomeFantasia}</Field>
            <Field label="Tipo de Cliente">{empresa.tipoCliente}</Field>
            <Field label="CPF/CNPJ">{empresa.cpfCnpj}</Field>
          </Card>

          <Card title="Informações de Contato">
            <Field label="Contato">{empresa.contato}</Field>
            <Field label="E-mail">{empresa.email}</Field>
            <Field label="Telefone">{empresa.telefone}</Field>
            <Field label="Celular">{empresa.celular}</Field>
          </Card>

          <Card title="Localização">
            <Field label="CEP">{empresa.cep}</Field>
            <Field label="Rua">{empresa.rua}</Field>
            <Field label="Número">{empresa.numero}</Field>
            <Field label="Complemento">{empresa.complemento}</Field>
            <Field label="Bairro">{empresa.bairro}</Field>
            <Field label="Cidade">{empresa.cidade}</Field>
            <Field label="Estado">{empresa.estado}</Field>
            <Field label="Localização">{localizacao}</Field>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Histórico e Vínculos</h2>

            <Card title="Ordens de Serviço em Aberto">
              <TableControls
                search={osSearch}
                setSearch={setOsSearch}
                perPage={osPerPage}
                setPerPage={setOsPerPage}
                placeholder="Buscar OS..."
              />
              {osAbertas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ordem de serviço em aberto para este cliente.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Número</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo de Serviço</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Responsável</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {osFiltered.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => onSelectOS?.(o.id)}
                        >
                          <td className="px-3 py-2 font-medium text-primary">{o.numero}</td>
                          <td className="px-3 py-2">{o.estado}</td>
                          <td className="px-3 py-2">{o.tipoServico}</td>
                          <td className="px-3 py-2">{o.responsavelTecnico || "—"}</td>
                          <td className="px-3 py-2">{formatDate(o.dataCriacao)}</td>
                        </tr>
                      ))}
                      {osFiltered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                            Nenhum resultado para a busca.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {osAbertas.length > osPerPage && (
                    <p className="text-xs text-muted-foreground mt-2 px-2">
                      Mostrando {osFiltered.length} de {osAbertas.length}
                    </p>
                  )}
                </div>
              )}
            </Card>

            <div className="mt-6">
              <Card title="Equipamentos Cadastrados">
                <TableControls
                  search={eqSearch}
                  setSearch={setEqSearch}
                  perPage={eqPerPage}
                  setPerPage={setEqPerPage}
                  placeholder="Buscar equipamento..."
                />
                {equipamentosCliente.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum equipamento cadastrado para este cliente.
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Modelo</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fabricante</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">TAG</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nº Série</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Setor</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eqFiltered.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => onSelectEquipamento?.(e.id)}
                          >
                            <td className="px-3 py-2 font-medium text-primary">{e.tipo}</td>
                            <td className="px-3 py-2">{e.modelo}</td>
                            <td className="px-3 py-2">{e.fabricante}</td>
                            <td className="px-3 py-2">{e.tag}</td>
                            <td className="px-3 py-2">{e.serie}</td>
                            <td className="px-3 py-2">{e.setor}</td>
                            <td className="px-3 py-2">{e.status}</td>
                          </tr>
                        ))}
                        {eqFiltered.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                              Nenhum resultado para a busca.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {equipamentosCliente.length > eqPerPage && (
                      <p className="text-xs text-muted-foreground mt-2 px-2">
                        Mostrando {eqFiltered.length} de {equipamentosCliente.length}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaDetalhesDialog;

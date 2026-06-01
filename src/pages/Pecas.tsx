import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import {
  PecaSupabase,
  useAtualizarPeca,
  useCriarFabricantePeca,
  useCriarModeloPeca,
  useCriarPeca,
  useDesativarFabricantePeca,
  useDesativarModeloPeca,
  useDesativarPeca,
  useCriarVariacaoPeca,
  useDesativarVariacaoPeca,
  usePecas,
} from "@/hooks/usePecas";

type FormState = {
  nome: string;
  descricao: string;
  precoPadrao: string;
};

type VariacaoFormState = {
  fabricanteId: string;
  modeloId: string;
  precoPadrao: string;
};

const emptyForm: FormState = {
  nome: "",
  descricao: "",
  precoPadrao: "",
};

const emptyVariacaoForm: VariacaoFormState = {
  fabricanteId: "",
  modeloId: "",
  precoPadrao: "",
};

const normalizar = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value || 0));

const toForm = (peca: PecaSupabase): FormState => ({
  nome: peca.nome,
  descricao: peca.descricao || "",
  precoPadrao:
    peca.preco_padrao === null || peca.preco_padrao === undefined
      ? ""
      : String(peca.preco_padrao),
});

const Pecas = () => {
  const { data: pecas = [] } = usePecas();
  const { data: orcamentos = [] } = useOrcamentos();
  const criar = useCriarPeca();
  const atualizar = useAtualizarPeca();
  const desativar = useDesativarPeca();
  const criarFabricante = useCriarFabricantePeca();
  const criarModelo = useCriarModeloPeca();
  const desativarFabricante = useDesativarFabricantePeca();
  const desativarModelo = useDesativarModeloPeca();
  const criarVariacao = useCriarVariacaoPeca();
  const desativarVariacao = useDesativarVariacaoPeca();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [variacaoForm, setVariacaoForm] =
    useState<VariacaoFormState>(emptyVariacaoForm);
  const [novoFabricante, setNovoFabricante] = useState("");
  const [novoModelo, setNovoModelo] = useState("");

  const selected = useMemo(
    () => pecas.find((peca) => peca.id === selectedId) || null,
    [pecas, selectedId]
  );

  const isSaving = criar.isPending || atualizar.isPending;

  const getUsos = (peca: PecaSupabase) =>
    orcamentos.reduce(
      (acc, orcamento) =>
        acc +
        (orcamento.itens || []).filter(
          (item) =>
            item.peca_id === peca.id ||
            normalizar(item.peca_nome) === normalizar(peca.nome) ||
            normalizar(item.peca?.nome) === normalizar(peca.nome)
        ).length,
      0
    );

  const reset = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setVariacaoForm(emptyVariacaoForm);
    setNovoFabricante("");
    setNovoModelo("");
  };

  const handleSelect = (peca: PecaSupabase) => {
    setSelectedId(peca.id);
    setForm(toForm(peca));
    setVariacaoForm(emptyVariacaoForm);
    setNovoFabricante("");
    setNovoModelo("");
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome da peca.", variant: "destructive" });
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      precoPadrao: form.precoPadrao ? Number(form.precoPadrao) : null,
    };

    try {
      if (selected) {
        await atualizar.mutateAsync({ id: selected.id, ...payload });
        toast({ title: "Peca atualizada com sucesso." });
      } else {
        const criada = await criar.mutateAsync(payload);
        setSelectedId(criada.id);
        toast({ title: "Peca criada com sucesso." });
      }
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Erro ao salvar peca.",
        variant: "destructive",
      });
    }
  };

  const handleDesativar = async (peca: PecaSupabase) => {
    const usos = getUsos(peca);
    if (usos > 0) {
      toast({
        title: "Peca em uso.",
        description: `Existe(m) ${usos} item(ns) de orcamento usando esta peca.`,
        variant: "destructive",
      });
      return;
    }

    await desativar.mutateAsync(peca.id);
    if (selectedId === peca.id) reset();
  };

  const handleAdicionarFabricante = async () => {
    if (!selected || !novoFabricante.trim()) return;
    await criarFabricante.mutateAsync({
      pecaId: selected.id,
      nome: novoFabricante.trim(),
    });
    setNovoFabricante("");
  };

  const handleAdicionarModelo = async () => {
    if (!selected || !novoModelo.trim()) return;
    await criarModelo.mutateAsync({
      pecaId: selected.id,
      nome: novoModelo.trim(),
    });
    setNovoModelo("");
  };

  const handleAdicionarVariacao = async () => {
    if (!selected) return;

    if (
      !variacaoForm.fabricanteId &&
      !variacaoForm.modeloId &&
      !variacaoForm.precoPadrao
    ) {
      toast({
        title: "Informe fabricante, modelo ou preco para a variacao.",
        variant: "destructive",
      });
      return;
    }

    const fabricante =
      fabricantesAtivos.find((item) => item.id === variacaoForm.fabricanteId) ||
      null;
    const modelo =
      modelosAtivos.find((item) => item.id === variacaoForm.modeloId) || null;

    try {
      await criarVariacao.mutateAsync({
        pecaId: selected.id,
        pecaFabricanteId: fabricante?.id || null,
        pecaModeloId: modelo?.id || null,
        fabricanteTexto: fabricante?.nome || null,
        modeloTexto: modelo?.nome || null,
        precoPadrao: variacaoForm.precoPadrao
          ? Number(variacaoForm.precoPadrao)
          : null,
      });
      setVariacaoForm(emptyVariacaoForm);
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Erro ao salvar variacao.",
        variant: "destructive",
      });
    }
  };

  const fabricantesAtivos = (selected?.fabricantes || []).filter(
    (fabricante) => fabricante.ativo
  );
  const modelosAtivos = (selected?.modelos || []).filter((modelo) => modelo.ativo);
  const variacoesAtivas = (selected?.variacoes || []).filter(
    (variacao) => variacao.ativo
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pecas</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie pecas, preco padrao e opcoes de fabricante/modelo para
          orcamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pecas cadastradas</CardTitle>
            <CardDescription>
              O preco padrao e sugerido no orcamento, mas continua editavel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preco padrao</TableHead>
                  <TableHead>Fabricantes</TableHead>
                  <TableHead>Modelos</TableHead>
                  <TableHead>Variacoes</TableHead>
                  <TableHead className="w-[110px] text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pecas.map((peca) => (
                  <TableRow key={peca.id}>
                    <TableCell>
                      <div className="font-medium">{peca.nome}</div>
                      {peca.descricao && (
                        <div className="text-xs text-muted-foreground">
                          {peca.descricao}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(peca.preco_padrao)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(peca.fabricantes || []).filter((item) => item.ativo).length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(peca.modelos || []).filter((item) => item.ativo).length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(peca.variacoes || []).filter((item) => item.ativo).length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSelect(peca)}
                          title="Editar peca"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDesativar(peca)}
                          title="Desativar peca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pecas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma peca cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  {selected ? "Editar peca" : "Nova peca"}
                </CardTitle>
                <CardDescription>
                  Fabricantes e modelos ficam disponiveis ao montar o orcamento.
                </CardDescription>
              </div>
              {selected && (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={reset}>
                    Nova peca
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={reset}>
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Nome / Tipo da peca</Label>
              <Input
                value={form.nome}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nome: event.target.value }))
                }
                placeholder="Sensor de Oximetria"
              />
            </div>
            <div className="space-y-2">
              <Label>Preco padrao</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.precoPadrao}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    precoPadrao: event.target.value,
                  }))
                }
                placeholder="Preco padrao opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={form.descricao}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    descricao: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Nova
              </Button>
            </div>

            <div className="border-t pt-5 space-y-5">
              <div className="space-y-2">
                <Label>Fabricantes</Label>
                <div className="flex gap-2">
                  <Input
                    value={novoFabricante}
                    disabled={!selected}
                    onChange={(event) => setNovoFabricante(event.target.value)}
                    placeholder={
                      selected ? "Novo fabricante" : "Salve a peca primeiro"
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selected || !novoFabricante.trim()}
                    onClick={handleAdicionarFabricante}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fabricantesAtivos.map((fabricante) => (
                    <Badge key={fabricante.id} variant="secondary" className="gap-2">
                      {fabricante.nome}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => desativarFabricante.mutate(fabricante.id)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                  {selected && fabricantesAtivos.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Nenhum fabricante cadastrado.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modelos</Label>
                <div className="flex gap-2">
                  <Input
                    value={novoModelo}
                    disabled={!selected}
                    onChange={(event) => setNovoModelo(event.target.value)}
                    placeholder={selected ? "Novo modelo" : "Salve a peca primeiro"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selected || !novoModelo.trim()}
                    onClick={handleAdicionarModelo}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modelosAtivos.map((modelo) => (
                    <Badge key={modelo.id} variant="secondary" className="gap-2">
                      {modelo.nome}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => desativarModelo.mutate(modelo.id)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                  {selected && modelosAtivos.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Nenhum modelo cadastrado.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t pt-5">
                <div>
                  <Label>Variacoes e precos</Label>
                  <p className="text-xs text-muted-foreground">
                    Combine fabricante/modelo e defina um preco sugerido
                    opcional.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={variacaoForm.fabricanteId || "none"}
                    disabled={!selected || fabricantesAtivos.length === 0}
                    onValueChange={(value) =>
                      setVariacaoForm((current) => ({
                        ...current,
                        fabricanteId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Fabricante opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem fabricante</SelectItem>
                      {fabricantesAtivos.map((fabricante) => (
                        <SelectItem key={fabricante.id} value={fabricante.id}>
                          {fabricante.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={variacaoForm.modeloId || "none"}
                    disabled={!selected || modelosAtivos.length === 0}
                    onValueChange={(value) =>
                      setVariacaoForm((current) => ({
                        ...current,
                        modeloId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Modelo opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem modelo</SelectItem>
                      {modelosAtivos.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variacaoForm.precoPadrao}
                      disabled={!selected}
                      onChange={(event) =>
                        setVariacaoForm((current) => ({
                          ...current,
                          precoPadrao: event.target.value,
                        }))
                      }
                      placeholder="Preco da variacao"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selected || criarVariacao.isPending}
                      onClick={handleAdicionarVariacao}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {variacoesAtivas.map((variacao) => (
                    <div
                      key={variacao.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {[
                            variacao.fabricante_texto || "Sem fabricante",
                            variacao.modelo_texto || "Sem modelo",
                          ].join(" + ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(variacao.preco_padrao)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => desativarVariacao.mutate(variacao.id)}
                        title="Desativar variacao"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {selected && variacoesAtivas.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Nenhuma variacao cadastrada.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pecas;

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useData,
  OrcamentoTipo,
  FormaPagamento,
  ModoPagamento,
  TipoFrete,
  OrcamentoItemPeca,
  OrcamentoItemServico,
  OrdemServico,
  Orcamento,
} from "@/contexts/DataContext";

export type DialogMode = "create" | "edit" | "view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromOS?: OrdemServico | null;
  mode?: DialogMode;
  orcamento?: Orcamento | null;
}

const nowDateTimeLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const tiposOrcamento: OrcamentoTipo[] = ["Serviço", "Peças", "Peças + Serviços"];
const formasPagamento: FormaPagamento[] = ["Dinheiro", "Cartão", "Boleto", "Pix"];
const modosPagamento: ModoPagamento[] = ["À vista", "Parcelado", "Entrada + Parcela"];
const fretes: TipoFrete[] = ["CIF", "FOB"];

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const OrcamentoFormDialog = ({ open, onOpenChange, fromOS, mode = "create", orcamento = null }: Props) => {
  const { empresas, pecas, tiposOS, tipos, equipamentos, addOrcamento, updateOrcamento, buildOrcamentoNumero } = useData();

  const readOnly = mode === "view";

  const [tipo, setTipo] = useState<OrcamentoTipo>("Serviço");
  const [solicitante, setSolicitante] = useState("");
  const [pecasItems, setPecasItems] = useState<OrcamentoItemPeca[]>([]);
  const [servicosItems, setServicosItems] = useState<OrcamentoItemServico[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("Pix");
  const [modoPagamento, setModoPagamento] = useState<ModoPagamento>("À vista");
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [dataCriacao, setDataCriacao] = useState(nowDateTimeLocal());
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [validadeDias, setValidadeDias] = useState(90);
  const [frete, setFrete] = useState<TipoFrete>("CIF");
  const [detalhes, setDetalhes] = useState("");
  const [responsavel, setResponsavel] = useState("Ícaro Rezende");
  const [numeroPreview, setNumeroPreview] = useState("");

  useEffect(() => {
    if (!open) return;

    // Modo edição/visualização de orçamento existente
    if (orcamento && (mode === "edit" || mode === "view")) {
      setNumeroPreview(orcamento.numero);
      setDataCriacao(orcamento.dataCriacao);
      setTipo(orcamento.tipo);
      setSolicitante(orcamento.solicitante);
      setPecasItems(orcamento.pecas);
      setServicosItems(orcamento.servicos);
      setFormaPagamento(orcamento.formaPagamento);
      setModoPagamento(orcamento.modoPagamento);
      setNumeroParcelas(orcamento.numeroParcelas);
      setValorEntrada(orcamento.valorEntrada);
      setPrazoEntrega(orcamento.prazoEntrega);
      setValidadeDias(orcamento.validadeDias);
      setFrete(orcamento.frete);
      setDetalhes(orcamento.detalhes);
      setResponsavel(orcamento.responsavelOrcamentista);
      return;
    }

    const numero = buildOrcamentoNumero(fromOS?.numero ?? null);
    setNumeroPreview(numero);
    setDataCriacao(nowDateTimeLocal());
    setFormaPagamento("Pix");
    setModoPagamento("À vista");
    setNumeroParcelas(1);
    setValorEntrada(0);
    setPrazoEntrega("");
    setValidadeDias(90);
    setFrete("CIF");
    setResponsavel("Ícaro Rezende");

    if (fromOS) {
      // Puxar o tipo de equipamento a partir do equipamento da OS
      const eq = equipamentos.find((e) => e.id === fromOS.equipamentoId);
      const tipoEquip = eq?.tipo ?? "";

      setTipo("Serviço");
      setSolicitante(fromOS.solicitante);
      setPecasItems([]);
      setServicosItems([
        {
          tipoServico: fromOS.tipoServico,
          tipoEquipamento: tipoEquip,
          quantidade: 1,
          valorUnitario: 0,
          garantiaDias: 90,
        },
      ]);
      setDetalhes(fromOS.descricaoServico || "");
    } else {
      setTipo("Serviço");
      setSolicitante("");
      setPecasItems([]);
      setServicosItems([]);
      setDetalhes("");
    }
  }, [open, fromOS, orcamento, mode, buildOrcamentoNumero, equipamentos]);

  const incluiPecas = tipo === "Peças" || tipo === "Peças + Serviços";
  const incluiServicos = tipo === "Serviço" || tipo === "Peças + Serviços";

  // Garantir que listas correspondam ao tipo selecionado
  useEffect(() => {
    if (!incluiPecas) setPecasItems([]);
    if (!incluiServicos) setServicosItems([]);
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPecas = useMemo(
    () => pecasItems.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0),
    [pecasItems]
  );
  const totalServicos = useMemo(
    () => servicosItems.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0),
    [servicosItems]
  );
  const totalGeral = totalPecas + totalServicos;

  const valorParcela = useMemo(() => {
    if (modoPagamento === "À vista" || numeroParcelas <= 0) return totalGeral;
    if (modoPagamento === "Parcelado") return totalGeral / numeroParcelas;
    if (modoPagamento === "Entrada + Parcela") {
      const restante = Math.max(totalGeral - valorEntrada, 0);
      return numeroParcelas > 0 ? restante / numeroParcelas : 0;
    }
    return totalGeral;
  }, [modoPagamento, numeroParcelas, totalGeral, valorEntrada]);

  const addPecaItem = () =>
    setPecasItems((p) => [...p, { peca: "", quantidade: 1, valorUnitario: 0, garantiaDias: 90 }]);
  const updatePecaItem = (i: number, patch: Partial<OrcamentoItemPeca>) =>
    setPecasItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removePecaItem = (i: number) =>
    setPecasItems((p) => p.filter((_, idx) => idx !== i));

  const addServicoItem = () =>
    setServicosItems((s) => [
      ...s,
      { tipoServico: "", tipoEquipamento: "", quantidade: 1, valorUnitario: 0, garantiaDias: 90 },
    ]);
  const updateServicoItem = (i: number, patch: Partial<OrcamentoItemServico>) =>
    setServicosItems((s) => s.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeServicoItem = (i: number) =>
    setServicosItems((s) => s.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!solicitante) {
      toast({ title: "Selecione o solicitante", variant: "destructive" });
      return;
    }
    if (incluiPecas && pecasItems.length === 0) {
      toast({ title: "Adicione ao menos uma peça", variant: "destructive" });
      return;
    }
    if (incluiServicos && servicosItems.length === 0) {
      toast({ title: "Adicione ao menos um serviço", variant: "destructive" });
      return;
    }

    const payload = {
      numero: numeroPreview,
      osId: orcamento?.osId ?? fromOS?.id ?? null,
      dataCriacao,
      tipo,
      solicitante,
      pecas: incluiPecas ? pecasItems : [],
      servicos: incluiServicos ? servicosItems : [],
      formaPagamento,
      modoPagamento,
      numeroParcelas: modoPagamento === "À vista" ? 1 : numeroParcelas,
      valorEntrada: modoPagamento === "Entrada + Parcela" ? valorEntrada : 0,
      prazoEntrega,
      validadeDias,
      frete,
      detalhes,
      responsavelOrcamentista: responsavel,
    };

    if (mode === "edit" && orcamento) {
      updateOrcamento(orcamento.id, payload);
      toast({ title: "Orçamento atualizado com sucesso!" });
    } else {
      addOrcamento(payload);
      toast({ title: "Orçamento criado com sucesso!" });
    }
    onOpenChange(false);
  };

  const dialogTitle =
    mode === "view" ? `Visualizar Orçamento ${numeroPreview}` :
    mode === "edit" ? `Editar Orçamento ${numeroPreview}` :
    fromOS ? `Novo Orçamento (a partir da ${fromOS.numero})` : "Novo Orçamento";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={readOnly} className={readOnly ? "space-y-4 [&_button]:pointer-events-none" : "space-y-4"}>

        {/* Identificação */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Número</Label>
              <Input value={numeroPreview} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Data de Criação</Label>
              <Input
                type="datetime-local"
                value={dataCriacao}
                onChange={(e) => setDataCriacao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Tipo de Orçamento *</Label>
              <SearchableSelect
                value={tipo}
                onValueChange={(v) => setTipo(v as OrcamentoTipo)}
                options={tiposOrcamento}
                placeholder="Selecione o tipo"
                emptyText="Nenhum tipo encontrado."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm">Solicitante *</Label>
              <SearchableSelect
                value={solicitante}
                onValueChange={setSolicitante}
                options={empresas}
                placeholder="Selecione a empresa"
                emptyText="Nenhuma empresa encontrada."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Responsável Orçamentista</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Peças */}
        <div className={`rounded-lg border p-5 space-y-4 ${!incluiPecas ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Peças</h3>
            <Button type="button" size="sm" onClick={addPecaItem} disabled={!incluiPecas}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar peça
            </Button>
          </div>
          {pecasItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {incluiPecas ? "Nenhuma peça adicionada." : "Tipo selecionado não inclui peças."}
            </p>
          ) : (
            <div className="space-y-3">
              {pecasItems.map((item, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-md p-3">
                  <div className="md:col-span-4 space-y-2">
                    <Label className="text-xs">Peça</Label>
                    <SearchableSelect
                      value={item.peca}
                      onValueChange={(v) => updatePecaItem(i, { peca: v })}
                      options={pecas}
                      placeholder="Selecione a peça"
                      emptyText="Nenhuma peça encontrada."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => updatePecaItem(i, { quantidade: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Valor Unit. (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.valorUnitario}
                      onChange={(e) => updatePecaItem(i, { valorUnitario: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Garantia (dias)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.garantiaDias}
                      onChange={(e) => updatePecaItem(i, { garantiaDias: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePecaItem(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Serviços */}
        <div className={`rounded-lg border p-5 space-y-4 ${!incluiServicos ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Serviços</h3>
            <Button type="button" size="sm" onClick={addServicoItem} disabled={!incluiServicos}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar serviço
            </Button>
          </div>
          {servicosItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {incluiServicos ? "Nenhum serviço adicionado." : "Tipo selecionado não inclui serviços."}
            </p>
          ) : (
            <div className="space-y-3">
              {servicosItems.map((item, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-md p-3">
                  <div className="md:col-span-4 space-y-2">
                    <Label className="text-xs">Tipo de Serviço</Label>
                    <SearchableSelect
                      value={item.tipoServico}
                      onValueChange={(v) => updateServicoItem(i, { tipoServico: v })}
                      options={tiposOS}
                      placeholder="Selecione o tipo"
                      emptyText="Nenhum tipo encontrado."
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Tipo de Equipamento</Label>
                    <SearchableSelect
                      value={item.tipoEquipamento}
                      onValueChange={(v) => updateServicoItem(i, { tipoEquipamento: v })}
                      options={tipos}
                      placeholder="Selecione"
                      emptyText="Nenhum encontrado."
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => updateServicoItem(i, { quantidade: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Valor Unit. (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.valorUnitario}
                      onChange={(e) => updateServicoItem(i, { valorUnitario: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <Label className="text-xs">Gar. (dias)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.garantiaDias}
                      onChange={(e) => updateServicoItem(i, { garantiaDias: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeServicoItem(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financeiro */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold">Informações Financeiras</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Total Peças</p>
              <p className="text-lg font-semibold">{formatBRL(totalPecas)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Total Serviços</p>
              <p className="text-lg font-semibold">{formatBRL(totalServicos)}</p>
            </div>
            <div className="rounded-md bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Total Geral</p>
              <p className="text-lg font-semibold text-primary">{formatBRL(totalGeral)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Forma de Pagamento</Label>
              <SearchableSelect
                value={formaPagamento}
                onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}
                options={formasPagamento}
                placeholder="Selecione"
                emptyText="—"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Modo de Pagamento</Label>
              <SearchableSelect
                value={modoPagamento}
                onValueChange={(v) => setModoPagamento(v as ModoPagamento)}
                options={modosPagamento}
                placeholder="Selecione"
                emptyText="—"
              />
            </div>

            {modoPagamento === "Parcelado" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Nº de Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Valor da Parcela</Label>
                  <Input value={formatBRL(valorParcela)} disabled className="bg-muted" />
                </div>
              </>
            )}

            {modoPagamento === "Entrada + Parcela" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Valor da Entrada (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Nº de Parcelas (após entrada)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm">Valor de cada parcela</Label>
                  <Input value={formatBRL(valorParcela)} disabled className="bg-muted" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Entrega e Validade */}
        <div className="rounded-lg border p-5 space-y-5">
          <h3 className="text-sm font-semibold">Entrega e Validade</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm">Prazo de Entrega</Label>
              <Input
                placeholder="Ex: 15 dias úteis"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Validade da Proposta (dias)</Label>
              <Input
                type="number"
                min={1}
                value={validadeDias}
                onChange={(e) => setValidadeDias(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Frete</Label>
              <SearchableSelect
                value={frete}
                onValueChange={(v) => setFrete(v as TipoFrete)}
                options={fretes}
                placeholder="Selecione"
                emptyText="—"
              />
            </div>
          </div>
        </div>

        {/* Detalhes */}
        <div className="rounded-lg border p-5 space-y-2">
          <h3 className="text-sm font-semibold">Detalhes do Orçamento</h3>
          <Textarea
            placeholder="Descrição detalhada do orçamento..."
            rows={5}
            value={detalhes}
            onChange={(e) => setDetalhes(e.target.value)}
          />
        </div>

        </fieldset>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave}>
              {mode === "edit" ? "Salvar Alterações" : "Salvar Orçamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrcamentoFormDialog;

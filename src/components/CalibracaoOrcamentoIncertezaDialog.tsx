import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ComponenteIncerteza } from "@/utils/calibracaoCalculos";
import { formatDecimalPtBr, normalizeDecimalInput } from "@/utils/numberUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automaticas: ComponenteIncerteza[];
  adicionais: ComponenteIncerteza[];
  disabled?: boolean;
  onChange: (componentes: ComponenteIncerteza[]) => void;
}

const emptyForm = { nome: "", valorOrigem: "", divisor: "", incertezaPadrao: "" };

const CalibracaoOrcamentoIncertezaDialog = ({
  open,
  onOpenChange,
  automaticas,
  adicionais,
  disabled = false,
  onChange,
}: Props) => {
  const [form, setForm] = useState(emptyForm);
  const componentes = [...automaticas, ...adicionais];

  const adicionar = () => {
    const incertezaPadrao = normalizeDecimalInput(form.incertezaPadrao);
    if (!form.nome.trim() || incertezaPadrao === null) return;
    onChange([
      ...adicionais,
      {
        nome: form.nome.trim(),
        categoria: "tipo_b",
        distribuicao: "outra",
        valorOrigem: normalizeDecimalInput(form.valorOrigem),
        divisor: normalizeDecimalInput(form.divisor),
        incertezaPadrao,
        infinito: true,
        origem: "Componente adicional informada na execucao",
      },
    ]);
    setForm(emptyForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>Orcamento de incerteza</DialogTitle></DialogHeader>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead><tr className="border-b bg-muted/50">
              {["Fonte", "Tipo", "Distribuicao", "Valor de origem", "Divisor", "Coef. sensibilidade", "Incerteza padrao", "Graus de liberdade", "Contribuicao", "Acao"].map((label) => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}
            </tr></thead>
            <tbody>{componentes.map((item, index) => {
              const adicionalIndex = index - automaticas.length;
              const contribuicao = (item.coeficienteSensibilidade ?? 1) * item.incertezaPadrao;
              return <tr key={`${item.nome}-${index}`} className="border-b last:border-0">
                <td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.categoria}</td><td className="px-3 py-2">{item.distribuicao || "-"}</td>
                <td className="px-3 py-2">{formatDecimalPtBr(item.valorOrigem)}</td><td className="px-3 py-2">{formatDecimalPtBr(item.divisor)}</td>
                <td className="px-3 py-2">{formatDecimalPtBr(item.coeficienteSensibilidade ?? 1)}</td><td className="px-3 py-2">{formatDecimalPtBr(item.incertezaPadrao)}</td>
                <td className="px-3 py-2">{item.infinito ? "INF" : formatDecimalPtBr(item.grausLiberdade)}</td><td className="px-3 py-2">{formatDecimalPtBr(contribuicao)}</td>
                <td className="px-3 py-2">{adicionalIndex >= 0 && <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={() => onChange(adicionais.filter((_, itemIndex) => itemIndex !== adicionalIndex))}><Trash2 className="h-4 w-4" /></Button>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!disabled && <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
          <Field label="Nova fonte Tipo B" value={form.nome} onChange={(nome) => setForm((current) => ({ ...current, nome }))} />
          <Field label="Valor de origem" value={form.valorOrigem} onChange={(valorOrigem) => setForm((current) => ({ ...current, valorOrigem }))} />
          <Field label="Divisor" value={form.divisor} onChange={(divisor) => setForm((current) => ({ ...current, divisor }))} />
          <div className="flex items-end gap-2"><Field label="Incerteza padrao *" value={form.incertezaPadrao} onChange={(incertezaPadrao) => setForm((current) => ({ ...current, incertezaPadrao }))} /><Button type="button" onClick={adicionar}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button></div>
        </div>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) => (
  <div className="min-w-0 flex-1 space-y-2"><Label>{label}</Label><Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></div>
);

export default CalibracaoOrcamentoIncertezaDialog;

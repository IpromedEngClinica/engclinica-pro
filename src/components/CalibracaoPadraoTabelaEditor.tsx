import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type CalibracaoPadraoPontoDraft = {
  key: string;
  id?: string;
  valorNominal: string;
  mediaValoresMedidos: string;
  tendencia: string;
  tendenciaManual: boolean;
  incertezaExpandida: string;
  fatorAbrangenciaK: string;
  grausLiberdadeEfetivosVeff: string;
  veffInfinito: boolean;
  observacoes: string;
};

export type CalibracaoPadraoTabelaDraft = {
  key: string;
  id?: string;
  nome: string;
  grandeza: string;
  unidade: string;
  resolucaoPadrao: string;
  pontos: CalibracaoPadraoPontoDraft[];
};

type TabelaField = "nome" | "grandeza" | "unidade" | "resolucaoPadrao";
type PontoField = Exclude<
  keyof CalibracaoPadraoPontoDraft,
  "key" | "id" | "tendenciaManual" | "veffInfinito"
>;

interface Props {
  tabela: CalibracaoPadraoTabelaDraft;
  disabled?: boolean;
  onAtualizarTabela: (
    key: string,
    field: TabelaField,
    value: string
  ) => void;
  onExcluirTabela: (key: string) => void;
  onAdicionarPonto: (tabelaKey: string) => void;
  onRemoverPonto: (tabelaKey: string, pontoKey?: string) => void;
  onAtualizarPonto: (
    tabelaKey: string,
    pontoKey: string,
    field: PontoField,
    value: string
  ) => void;
}

const CalibracaoPadraoTabelaEditor = ({
  tabela,
  disabled = false,
  onAtualizarTabela,
  onExcluirTabela,
  onAdicionarPonto,
  onRemoverPonto,
  onAtualizarPonto,
}: Props) => (
  <div className="space-y-4 rounded-b-lg border border-t-0 bg-background p-4">
    <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_96px_150px_auto]">
      <EditorField
        label="Nome da tabela *"
        value={tabela.nome}
        onChange={(value) => onAtualizarTabela(tabela.key, "nome", value)}
        disabled={disabled}
      />
      <EditorField
        label="Grandeza *"
        value={tabela.grandeza}
        onChange={(value) => onAtualizarTabela(tabela.key, "grandeza", value)}
        disabled={disabled}
      />
      <EditorField
        label="Unidade *"
        value={tabela.unidade}
        onChange={(value) => onAtualizarTabela(tabela.key, "unidade", value)}
        disabled={disabled}
      />
      <EditorField
        label="Resolucao do padrao"
        value={tabela.resolucaoPadrao}
        onChange={(value) =>
          onAtualizarTabela(tabela.key, "resolucaoPadrao", value)
        }
        disabled={disabled}
        inputMode="decimal"
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onExcluirTabela(tabela.key)}
          disabled={disabled}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir tabela
        </Button>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAdicionarPonto(tabela.key)}
        disabled={disabled}
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar linha
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || tabela.pontos.length === 0}
        onClick={() => onRemoverPonto(tabela.key)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remover ultima linha
      </Button>
    </div>

    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1040px] table-fixed text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <Header className="w-[120px]">Valor nominal / referencia *</Header>
            <Header className="w-[135px]">Media dos valores medidos</Header>
            <Header className="w-[115px]">
              Tendencia
              <span className="block text-[10px] font-normal text-muted-foreground">
                Automatica, mas editavel
              </span>
            </Header>
            <Header className="w-[130px]">Incerteza expandida</Header>
            <Header className="w-[70px]">k</Header>
            <Header className="w-[95px]">
              <span className="flex items-center gap-1">
                veff
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Para valores infinitos digite inf.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span className="block text-[10px] font-normal text-muted-foreground">
                Numero ou inf
              </span>
            </Header>
            <Header className="w-[180px]">Observacoes</Header>
            <Header className="w-[52px] text-right">Acoes</Header>
          </tr>
        </thead>
        <tbody>
          {tabela.pontos.map((ponto) => (
            <tr key={ponto.key} className="border-b last:border-0">
              <Cell
                value={ponto.valorNominal}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "valorNominal",
                    value
                  )
                }
                disabled={disabled}
                decimal
              />
              <Cell
                value={ponto.mediaValoresMedidos}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "mediaValoresMedidos",
                    value
                  )
                }
                disabled={disabled}
                decimal
              />
              <Cell
                value={ponto.tendencia}
                onChange={(value) =>
                  onAtualizarPonto(tabela.key, ponto.key, "tendencia", value)
                }
                disabled={disabled}
                decimal
                title={
                  ponto.tendenciaManual
                    ? "Tendencia ajustada manualmente."
                    : "Tendencia calculada automaticamente."
                }
                className={
                  ponto.tendenciaManual
                    ? "border-amber-300 bg-amber-50/60"
                    : undefined
                }
              />
              <Cell
                value={ponto.incertezaExpandida}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "incertezaExpandida",
                    value
                  )
                }
                disabled={disabled}
                decimal
              />
              <Cell
                value={ponto.fatorAbrangenciaK}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "fatorAbrangenciaK",
                    value
                  )
                }
                disabled={disabled}
                decimal
              />
              <Cell
                value={ponto.grausLiberdadeEfetivosVeff}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "grausLiberdadeEfetivosVeff",
                    value
                  )
                }
                disabled={disabled}
                decimal
                placeholder="Ex.: 30 ou inf"
              />
              <Cell
                value={ponto.observacoes}
                onChange={(value) =>
                  onAtualizarPonto(
                    tabela.key,
                    ponto.key,
                    "observacoes",
                    value
                  )
                }
                disabled={disabled}
                className="truncate"
              />
              <td className="px-1.5 py-1.5 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Remover linha"
                  onClick={() => onRemoverPonto(tabela.key, ponto.key)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const EditorField = ({
  label,
  value,
  onChange,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  inputMode?: "decimal";
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      inputMode={inputMode}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  </div>
);

const Header = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <th className={`px-2 py-2 text-left align-middle font-medium ${className || ""}`}>
    {children}
  </th>
);

const Cell = ({
  className,
  decimal = false,
  disabled,
  placeholder,
  title,
  value,
  onChange,
}: {
  className?: string;
  decimal?: boolean;
  disabled: boolean;
  placeholder?: string;
  title?: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <td className="px-1.5 py-1.5">
    <Input
      className={`h-8 min-w-0 px-2 text-xs ${className || ""}`}
      inputMode={decimal ? "decimal" : undefined}
      placeholder={placeholder}
      title={title}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  </td>
);

export default CalibracaoPadraoTabelaEditor;

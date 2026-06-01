import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import type { CalibracaoPadraoTipoDocumento } from "@/services/calibracaoPadroesService";

export type CalibracaoPadraoDocumentoDraft = {
  key: string;
  file: File | null;
  tipoDocumento: CalibracaoPadraoTipoDocumento;
  observacoes: string;
};

interface Props {
  documentos: CalibracaoPadraoDocumentoDraft[];
  disabled?: boolean;
  onAdicionar: () => void;
  onAtualizar: (
    key: string,
    patch: Partial<CalibracaoPadraoDocumentoDraft>
  ) => void;
  onRemover: (key: string) => void;
}

const CalibracaoPadraoDocumentosSection = ({
  documentos,
  disabled = false,
  onAdicionar,
  onAtualizar,
  onRemover,
}: Props) => (
  <Card>
    <CardHeader className="border-b bg-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            4. Documentos do padrao
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Os novos arquivos serao enviados depois que o padrao for salvo.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdicionar}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar documento
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 p-4">
      {documentos.map((documento) => (
        <div
          key={documento.key}
          className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[180px_minmax(220px,1fr)_minmax(180px,1fr)_auto]"
        >
          <div className="space-y-2">
            <Label>Tipo do documento</Label>
            <Select
              value={documento.tipoDocumento}
              onValueChange={(value) =>
                onAtualizar(documento.key, {
                  tipoDocumento: value as CalibracaoPadraoTipoDocumento,
                })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Certificado">Certificado</SelectItem>
                <SelectItem value="Rastreabilidade">Rastreabilidade</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Arquivo</Label>
            <Input
              type="file"
              disabled={disabled}
              onChange={(event) =>
                onAtualizar(documento.key, {
                  file: event.target.files?.[0] || null,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Input
              value={documento.observacoes}
              placeholder="Opcional"
              disabled={disabled}
              onChange={(event) =>
                onAtualizar(documento.key, {
                  observacoes: event.target.value,
                })
              }
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Remover documento"
              onClick={() => onRemover(documento.key)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {documentos.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum novo documento pendente.
        </p>
      )}
    </CardContent>
  </Card>
);

export default CalibracaoPadraoDocumentosSection;


import { Download, Eye, Loader2, Trash2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCalibracaoPadraoDocumentos,
  useRemoverCalibracaoPadraoDocumento,
  useUploadCalibracaoPadraoDocumento,
} from "@/hooks/useCalibracaoPadroes";
import { toast } from "@/hooks/use-toast";
import {
  CalibracaoPadrao,
  CalibracaoPadraoDocumento,
  CalibracaoPadraoTipoDocumento,
  calibracaoPadroesService,
} from "@/services/calibracaoPadroesService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  padrao: CalibracaoPadrao | null;
}

const tiposDocumento: CalibracaoPadraoTipoDocumento[] = [
  "Certificado",
  "Rastreabilidade",
  "Outro",
];

const grupos: Array<{
  titulo: string;
  tipo: CalibracaoPadraoTipoDocumento;
}> = [
  { titulo: "Certificados", tipo: "Certificado" },
  { titulo: "Rastreabilidade", tipo: "Rastreabilidade" },
  { titulo: "Outros", tipo: "Outro" },
];

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CalibracaoPadraoDocumentosDialog = ({
  open,
  onOpenChange,
  padrao,
}: Props) => {
  const [tipoDocumento, setTipoDocumento] =
    useState<CalibracaoPadraoTipoDocumento>("Certificado");
  const [observacoes, setObservacoes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: documentos = [], isLoading } =
    useCalibracaoPadraoDocumentos(padrao?.id);
  const uploadDocumento = useUploadCalibracaoPadraoDocumento();
  const removerDocumento = useRemoverCalibracaoPadraoDocumento();

  const handleUpload = async () => {
    if (!padrao || !file) return;

    try {
      await uploadDocumento.mutateAsync({
        padraoId: padrao.id,
        tipoDocumento,
        file,
        observacoes,
      });
      setFile(null);
      setObservacoes("");
      toast({ title: "Documento anexado com sucesso." });
    } catch (error) {
      toast({
        title: "Erro ao anexar documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const abrirDocumento = async (documento: CalibracaoPadraoDocumento) => {
    try {
      const url = await calibracaoPadroesService.visualizarDocumento(documento);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao abrir documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const baixarDocumento = async (documento: CalibracaoPadraoDocumento) => {
    try {
      const url = await calibracaoPadroesService.baixarDocumento(documento);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao baixar documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleRemover = async (documento: CalibracaoPadraoDocumento) => {
    if (!window.confirm(`Remover o documento "${documento.nome_arquivo}"?`)) {
      return;
    }

    try {
      await removerDocumento.mutateAsync(documento);
      toast({ title: "Documento removido." });
    } catch (error) {
      toast({
        title: "Erro ao remover documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Padrao de Calibracao</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Novo documento</h3>
            <div className="grid gap-3 md:grid-cols-[190px_1fr]">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={tipoDocumento}
                  onValueChange={(value) =>
                    setTipoDocumento(value as CalibracaoPadraoTipoDocumento)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDocumento.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                rows={2}
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </div>

            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploadDocumento.isPending}
            >
              {uploadDocumento.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Anexar documento
            </Button>
          </section>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando documentos...
            </p>
          ) : (
            grupos.map((grupo) => {
              const itens = documentos.filter(
                (documento) => documento.tipo_documento === grupo.tipo
              );

              return (
                <section key={grupo.tipo} className="rounded-lg border">
                  <div className="px-4 py-3 border-b text-sm font-semibold">
                    {grupo.titulo} ({itens.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                            Arquivo
                          </th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                            Tamanho
                          </th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                            Observacoes
                          </th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                            Acoes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((documento) => (
                          <tr
                            key={documento.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-2 font-medium">
                              {documento.nome_arquivo}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {formatBytes(documento.tamanho_bytes)}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {documento.observacoes || "-"}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Visualizar"
                                  onClick={() => abrirDocumento(documento)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Baixar"
                                  onClick={() => baixarDocumento(documento)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Remover"
                                  onClick={() => handleRemover(documento)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {itens.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-5 text-center text-muted-foreground"
                            >
                              Nenhum documento nesta categoria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalibracaoPadraoDocumentosDialog;


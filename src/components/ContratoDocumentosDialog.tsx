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
  useContratoDocumentos,
  useRemoverContratoDocumento,
  useUploadContratoDocumento,
} from "@/hooks/useContratos";
import { toast } from "@/hooks/use-toast";
import {
  ContratoDocumentoSupabase,
  ContratoSupabase,
  contratosService,
} from "@/services/contratosService";

interface ContratoDocumentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoSupabase | null;
}

const tiposDocumento = [
  "Contrato",
  "Termo Aditivo",
  "Publicacao",
  "Empenho",
  "Outro",
];

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ContratoDocumentosDialog = ({
  open,
  onOpenChange,
  contrato,
}: ContratoDocumentosDialogProps) => {
  const [tipoDocumento, setTipoDocumento] = useState("Contrato");
  const [observacoes, setObservacoes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const uploadDocumento = useUploadContratoDocumento();
  const removerDocumento = useRemoverContratoDocumento();
  const { data: documentos = [], isLoading } = useContratoDocumentos(
    contrato?.id
  );

  const handleUpload = async () => {
    if (!contrato || !file) return;

    try {
      await uploadDocumento.mutateAsync({
        contratoId: contrato.id,
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

  const abrirDocumento = async (documento: ContratoDocumentoSupabase) => {
    try {
      const url = await contratosService.criarUrlDocumento(documento);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao abrir documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const baixarDocumento = async (documento: ContratoDocumentoSupabase) => {
    try {
      const url = await contratosService.baixarDocumento(documento);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Erro ao baixar documento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleRemover = async (documento: ContratoDocumentoSupabase) => {
    const confirmar = window.confirm(
      `Remover o documento "${documento.nome_arquivo}"?`
    );
    if (!confirmar) return;

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Novo documento</h3>
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
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
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                rows={2}
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
          </div>

          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b text-sm font-semibold">
              {documentos.length} documento(s)
            </div>
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Carregando documentos...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                        Tipo
                      </th>
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
                    {documentos.map((documento) => (
                      <tr key={documento.id} className="border-b last:border-0">
                        <td className="px-4 py-2">{documento.tipo_documento}</td>
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

                    {documentos.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Nenhum documento anexado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

export default ContratoDocumentosDialog;

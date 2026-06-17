import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, PenLine, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { assinaturasService } from "@/services/assinaturasService";

type MinhaAssinaturaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 300;
const CROP_PADDING = 18;

const carregarImagem = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel carregar a assinatura atual."));
    image.src = src;
  });

const desenharImagemCentralizada = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
) => {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(
    (canvas.width - 60) / image.naturalWidth,
    (canvas.height - 50) / image.naturalHeight,
    1
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  context.drawImage(
    image,
    (canvas.width - width) / 2,
    (canvas.height - height) / 2,
    width,
    height
  );
};

const canvasPossuiAssinatura = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 12) return true;
  }

  return false;
};

const gerarPngRecortado = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Editor de assinatura indisponivel."));

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = imageData.data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return Promise.reject(new Error("Desenhe sua assinatura antes de salvar."));
  }

  const sourceX = Math.max(0, minX - CROP_PADDING);
  const sourceY = Math.max(0, minY - CROP_PADDING);
  const sourceWidth = Math.min(canvas.width - sourceX, maxX - minX + 1 + CROP_PADDING * 2);
  const sourceHeight = Math.min(canvas.height - sourceY, maxY - minY + 1 + CROP_PADDING * 2);
  const output = document.createElement("canvas");
  output.width = sourceWidth;
  output.height = sourceHeight;
  output.getContext("2d")?.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );

  return new Promise<Blob>((resolve, reject) => {
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao preparar a assinatura."))),
      "image/png"
    );
  });
};

const MinhaAssinaturaDialog = ({
  open,
  onOpenChange,
}: MinhaAssinaturaDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhandoRef = useRef(false);
  const ultimoPontoRef = useRef<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assinaturaAtual, setAssinaturaAtual] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [temDesenho, setTemDesenho] = useState(false);
  const { toast } = useToast();

  const limparCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setTemDesenho(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setIsLoading(true);
    setAssinaturaAtual(null);
    setStoragePath(null);

    assinaturasService
      .buscarMinhaAssinatura()
      .then(async (assinatura) => {
        if (!active) return;
        setAssinaturaAtual(assinatura.dataUrl);
        setStoragePath(assinatura.storagePath);

        const canvas = canvasRef.current;
        if (!canvas) return;

        if (assinatura.dataUrl) {
          const image = await carregarImagem(assinatura.dataUrl);
          if (!active) return;
          desenharImagemCentralizada(canvas, image);
          setTemDesenho(true);
        } else {
          limparCanvas();
        }
      })
      .catch((error) => {
        if (!active) return;
        toast({
          title: "Erro ao carregar assinatura",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [limparCanvas, open, toast]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const iniciarDesenho = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isLoading || isSaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    desenhandoRef.current = true;
    ultimoPontoRef.current = getPoint(event);
  };

  const desenhar = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhandoRef.current || !ultimoPontoRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getPoint(event);
    context.beginPath();
    context.moveTo(ultimoPontoRef.current.x, ultimoPontoRef.current.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = "#111827";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();

    ultimoPontoRef.current = point;
    setTemDesenho(true);
  };

  const finalizarDesenho = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    desenhandoRef.current = false;
    ultimoPontoRef.current = null;
  };

  const salvar = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasPossuiAssinatura(canvas)) {
      toast({ title: "Desenhe sua assinatura antes de salvar.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const arquivo = await gerarPngRecortado(canvas);
      const assinatura = await assinaturasService.salvarMinhaAssinatura(arquivo);
      setAssinaturaAtual(assinatura.dataUrl);
      setStoragePath(assinatura.storagePath);
      toast({ title: "Assinatura salva." });
    } catch (error) {
      toast({
        title: "Erro ao salvar assinatura",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const excluir = async () => {
    setIsSaving(true);
    try {
      await assinaturasService.removerMinhaAssinatura(storagePath);
      setAssinaturaAtual(null);
      setStoragePath(null);
      limparCanvas();
      toast({ title: "Assinatura excluida." });
    } catch (error) {
      toast({
        title: "Erro ao excluir assinatura",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Minha assinatura
          </DialogTitle>
          <DialogDescription>
            Desenhe com o mouse, caneta ou toque. A assinatura sera inserida automaticamente nos documentos vinculados ao seu usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Editor</h3>
                <p className="text-xs text-muted-foreground">Assine dentro da area pontilhada.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={limparCanvas} disabled={isLoading || isSaving}>
                <Eraser className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-md border border-dashed border-muted-foreground/45 bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block aspect-[3/1] w-full cursor-crosshair touch-none"
                onPointerDown={iniciarDesenho}
                onPointerMove={desenhar}
                onPointerUp={finalizarDesenho}
                onPointerCancel={finalizarDesenho}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Assinatura atual</h3>
              <p className="text-xs text-muted-foreground">Esta e a imagem usada nos PDFs.</p>
            </div>
            <div className="flex min-h-44 items-center justify-center rounded-md border bg-white p-5">
              {assinaturaAtual ? (
                <img src={assinaturaAtual} alt="Assinatura atual" className="max-h-28 max-w-full object-contain" />
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <PenLine className="mx-auto mb-2 h-7 w-7 opacity-50" />
                  Nenhuma assinatura cadastrada
                </div>
              )}
            </div>
            {assinaturaAtual && (
              <Button type="button" variant="outline" className="w-full text-destructive hover:text-destructive" onClick={excluir} disabled={isSaving}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir assinatura
              </Button>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Fechar
          </Button>
          <Button type="button" onClick={salvar} disabled={isLoading || isSaving || !temDesenho}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MinhaAssinaturaDialog;

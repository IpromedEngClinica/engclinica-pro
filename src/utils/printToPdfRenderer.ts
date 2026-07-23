import { supabase } from "@/lib/supabaseClient";

type PrintToPdfOptions = {
  html: string;
  fileName: string;
  save?: boolean;
  orientation?: "p" | "l";
  footerText?: string;
  footerFontSizePx?: number;
  marginBottomMm?: number;
};

const DEFAULT_ENDPOINT = "/api/pdf/render";
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

const getPdfEndpoint = () =>
  (import.meta.env.VITE_PDF_RENDERER_URL as string | undefined) ||
  DEFAULT_ENDPOINT;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Chrome can finish a Blob download asynchronously. Revoking the URL in the
  // same task works locally in some cases, but cancels downloads in production.
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, DOWNLOAD_URL_LIFETIME_MS);
};

export const prepararJanelaVisualizacaoPdf = () => {
  const previewWindow = window.open("about:blank", "_blank");

  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.document.title = "Gerando PDF...";
    previewWindow.document.body.innerHTML =
      '<p style="font: 14px Arial, sans-serif; padding: 24px">Gerando PDF...</p>';
  }

  return previewWindow;
};

export const exibirPdfBlob = (blob: Blob, previewWindow?: Window | null) => {
  const targetWindow = previewWindow || window.open("about:blank", "_blank");
  if (!targetWindow) {
    throw new Error("O navegador bloqueou a janela de visualizacao do PDF.");
  }

  targetWindow.opener = null;
  const url = URL.createObjectURL(blob);
  targetWindow.location.replace(url);
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
};

const logPdfRendererError = (message: string, details?: unknown) => {
  console.error(`[PDF] ${message}`, details ?? "");
};

export const renderHtmlToPdfWithPrintToPdf = async ({
  html,
  fileName,
  save = true,
  orientation = "p",
  footerText,
  footerFontSizePx,
  marginBottomMm,
}: PrintToPdfOptions): Promise<Blob | null> => {
  const endpoint = getPdfEndpoint();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        html,
        fileName,
        orientation,
        footerText,
        footerFontSizePx,
        marginBottomMm,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      logPdfRendererError(
        `Falha no renderizador (${response.status} ${response.statusText}).`,
        responseBody
      );
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/pdf")) {
      logPdfRendererError("O renderizador retornou um arquivo que nao e PDF.", contentType);
      return null;
    }

    const blob = await response.blob();

    if (!blob.size) {
      logPdfRendererError("O renderizador retornou um PDF vazio.");
      return null;
    }

    if (save) {
      downloadBlob(blob, fileName);
    }

    return blob;
  } catch (error) {
    logPdfRendererError("Erro inesperado ao gerar ou baixar o PDF.", error);
    return null;
  }
};

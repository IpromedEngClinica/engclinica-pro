type PrintToPdfOptions = {
  html: string;
  fileName: string;
  save?: boolean;
  orientation?: "p" | "l";
  footerText?: string;
  footerFontSizePx?: number;
};

const DEFAULT_ENDPOINT = "/api/pdf/render";

const getPdfEndpoint = () =>
  (import.meta.env.VITE_PDF_RENDERER_URL as string | undefined) ||
  DEFAULT_ENDPOINT;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const renderHtmlToPdfWithPrintToPdf = async ({
  html,
  fileName,
  save = true,
  orientation = "p",
  footerText,
  footerFontSizePx,
}: PrintToPdfOptions): Promise<Blob | null> => {
  const endpoint = getPdfEndpoint();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html,
        fileName,
        orientation,
        footerText,
        footerFontSizePx,
      }),
    });

    if (!response.ok) return null;

    const blob = await response.blob();

    if (!blob.size) return null;

    if (save) {
      downloadBlob(blob, fileName);
    }

    return blob;
  } catch {
    return null;
  }
};

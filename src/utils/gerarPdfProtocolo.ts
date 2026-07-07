import aciLogo from "@/assets/aci-logo-hd.png";
import type { ProtocoloOSSupabase } from "@/services/protocolosService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import {
  buildProtocoloHtml,
  PROTOCOLO_FOOTER,
} from "@/utils/protocoloPdfTemplate";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";

export const gerarPdfProtocolo = async (protocolo: ProtocoloOSSupabase) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildProtocoloHtml(protocolo, logoBase64);
  const fileName = `Protocolo-${protocolo.numero || "sem-numero"}.pdf`;
  const printToPdf = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    footerText: PROTOCOLO_FOOTER,
    footerFontSizePx: 7.2,
  });

  if (printToPdf) return printToPdf;

  return renderHtmlToPdf({
    html,
    fileName,
    footerText: PROTOCOLO_FOOTER,
    footerHeightMm: 16,
  });
};

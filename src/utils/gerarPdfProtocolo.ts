import aciLogo from "@/assets/aci-logo-hd.png";
import type { ProtocoloOSSupabase } from "@/services/protocolosService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { buildProtocoloHtml } from "@/utils/protocoloPdfTemplate";

export const gerarPdfProtocolo = async (protocolo: ProtocoloOSSupabase) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildProtocoloHtml(protocolo, logoBase64);

  await renderHtmlToPdf({
    html,
    fileName: `Protocolo-${protocolo.numero || "sem-numero"}.pdf`,
  });
};

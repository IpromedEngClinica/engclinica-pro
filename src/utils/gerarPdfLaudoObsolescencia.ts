import aciLogo from "@/assets/aci-logo-hd.png";
import type { LaudoObsolescenciaSupabase } from "@/services/laudosObsolescenciaService";
import { buildLaudoObsolescenciaHtml } from "@/utils/laudoObsolescenciaPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

export const gerarPdfLaudoObsolescencia = async (
  laudo: LaudoObsolescenciaSupabase
) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildLaudoObsolescenciaHtml(laudo, logoBase64);

  await renderHtmlToPdf({
    html,
    fileName: `Laudo-Obsolescencia-${laudo.numero || "sem-numero"}.pdf`,
  });
};

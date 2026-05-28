import aciLogo from "@/assets/aci-logo-hd.png";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { buildOrdemServicoHtml } from "@/utils/osPdfTemplate";

export const gerarPdfOrdemServico = async (os: OrdemServicoSupabase) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildOrdemServicoHtml(os, logoBase64);

  await renderHtmlToPdf({
    html,
    fileName: `OS-${os.numero || "sem-numero"}.pdf`,
  });
};

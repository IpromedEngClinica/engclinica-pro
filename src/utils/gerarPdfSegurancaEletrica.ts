import aciLogo from "@/assets/aci-logo-hd.png";
import type { SegurancaEletricaExecucao } from "@/services/segurancaEletricaService";
import { formatNumeroCertificadoSegurancaEletrica } from "@/services/segurancaEletricaService";
import { buildSegurancaEletricaHtml } from "@/utils/segurancaEletricaPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

export const gerarPdfSegurancaEletrica = async (
  execucao: SegurancaEletricaExecucao
) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildSegurancaEletricaHtml(execucao, logoBase64);

  await renderHtmlToPdf({
    html,
    fileName: `Seguranca-Eletrica-${formatNumeroCertificadoSegurancaEletrica(
      execucao.numero_certificado
    )}.pdf`,
  });
};

import aciLogo from "@/assets/aci-logo-hd.png";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import { formatNumeroCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import { buildCalibracaoCertificadoHtml } from "@/utils/calibracaoCertificadoPdfTemplate";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { imageToDataUrl } from "@/utils/pdfImageUtils";

export const gerarPdfCalibracaoCertificado = async (
  execucao: CalibracaoExecucao,
  save = true
) => {
  const logo = await imageToDataUrl(aciLogo);
  return renderHtmlToPdf({
    html: buildCalibracaoCertificadoHtml(execucao, logo),
    fileName: `${formatNumeroCertificadoCalibracao(execucao.numero_certificado)}.pdf`,
    save,
  });
};

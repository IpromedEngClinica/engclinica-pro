import aciLogo from "@/assets/aci-logo-hd.png";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import { formatNomeDownloadCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import {
  buildCalibracaoCertificadoHtml,
  CALIBRACAO_CERTIFICADO_FOOTER,
} from "@/utils/calibracaoCertificadoPdfTemplate";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { assinaturasService } from "@/services/assinaturasService";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";

export const gerarPdfCalibracaoCertificado = async (
  execucao: CalibracaoExecucao,
  save = true
) => {
  const [logo, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoUsuarioId: execucao.tecnico_executor_usuario_id,
      tecnicoNome: execucao.tecnico_executor_nome,
      responsavelNome: execucao.responsavel_tecnico_nome,
      solicitanteNome: execucao.responsavel_solicitante,
      empresaId: execucao.empresa_id,
    }),
  ]);
  const html = buildCalibracaoCertificadoHtml(execucao, logo, assinaturas);
  const fileName = formatNomeDownloadCertificadoCalibracao(execucao);
  const printToPdf = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    save,
    footerText: CALIBRACAO_CERTIFICADO_FOOTER,
    footerFontSizePx: 7.2,
  });

  if (printToPdf) return printToPdf;

  return renderHtmlToPdf({
    html,
    fileName,
    save,
    footerText: CALIBRACAO_CERTIFICADO_FOOTER,
    footerHeightMm: 16,
  });
};

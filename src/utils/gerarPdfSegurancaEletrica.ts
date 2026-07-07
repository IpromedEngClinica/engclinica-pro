import aciLogo from "@/assets/aci-logo-hd.png";
import type { SegurancaEletricaExecucao } from "@/services/segurancaEletricaService";
import { formatNumeroCertificadoSegurancaEletrica } from "@/services/segurancaEletricaService";
import {
  buildSegurancaEletricaHtml,
  SEGURANCA_ELETRICA_FOOTER,
} from "@/utils/segurancaEletricaPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { assinaturasService } from "@/services/assinaturasService";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";

export const gerarPdfSegurancaEletrica = async (
  execucao: SegurancaEletricaExecucao,
  save = true
) => {
  const [logoBase64, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoNome: execucao.tecnico_executor_nome,
      responsavelNome: execucao.responsavel_tecnico_nome,
      solicitanteNome: execucao.responsavel_solicitante,
      empresaId: execucao.empresa_id,
    }),
  ]);
  const html = buildSegurancaEletricaHtml(execucao, logoBase64, assinaturas);
  const fileName = `Seguranca-Eletrica-${formatNumeroCertificadoSegurancaEletrica(
    execucao.numero_certificado
  )}.pdf`;

  const printToPdf = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    save,
    footerText: SEGURANCA_ELETRICA_FOOTER,
    footerFontSizePx: 7.2,
  });

  if (printToPdf) return printToPdf;

  return renderHtmlToPdf({
    html,
    fileName,
    save,
    footerText: SEGURANCA_ELETRICA_FOOTER,
    footerHeightMm: 16,
  });
};

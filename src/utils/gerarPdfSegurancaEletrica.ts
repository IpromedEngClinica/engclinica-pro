import aciLogo from "@/assets/aci-logo-hd.png";
import type { SegurancaEletricaExecucao } from "@/services/segurancaEletricaService";
import { formatNumeroCertificadoSegurancaEletrica } from "@/services/segurancaEletricaService";
import { buildSegurancaEletricaHtml } from "@/utils/segurancaEletricaPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { assinaturasService } from "@/services/assinaturasService";

export const gerarPdfSegurancaEletrica = async (
  execucao: SegurancaEletricaExecucao
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

  await renderHtmlToPdf({
    html,
    fileName: `Seguranca-Eletrica-${formatNumeroCertificadoSegurancaEletrica(
      execucao.numero_certificado
    )}.pdf`,
  });
};

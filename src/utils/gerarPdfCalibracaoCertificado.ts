import aciLogo from "@/assets/aci-logo-hd.png";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import { formatNomeArquivoCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import { buildCalibracaoCertificadoHtml } from "@/utils/calibracaoCertificadoPdfTemplate";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { assinaturasService } from "@/services/assinaturasService";

export const gerarPdfCalibracaoCertificado = async (
  execucao: CalibracaoExecucao,
  save = true
) => {
  const [logo, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoNome: execucao.tecnico_executor_nome,
      responsavelNome: execucao.responsavel_tecnico_nome,
      solicitanteNome: execucao.responsavel_solicitante,
      empresaId: execucao.empresa_id,
    }),
  ]);
  return renderHtmlToPdf({
    html: buildCalibracaoCertificadoHtml(execucao, logo, assinaturas),
    fileName: formatNomeArquivoCertificadoCalibracao(execucao),
    save,
  });
};

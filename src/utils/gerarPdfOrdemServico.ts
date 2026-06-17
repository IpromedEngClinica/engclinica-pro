import aciLogo from "@/assets/aci-logo-hd.png";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { buildOrdemServicoHtml } from "@/utils/osPdfTemplate";
import { assinaturasService } from "@/services/assinaturasService";

export const gerarPdfOrdemServico = async (
  os: OrdemServicoSupabase,
  save = true
) => {
  const [logoBase64, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoUsuarioId: os.tecnico_responsavel_id,
      tecnicoNome: os.responsavel_texto,
      responsavelNome: os.responsavel_texto,
      solicitanteNome: os.solicitante_texto,
      empresaId: os.empresa_id,
    }),
  ]);
  const html = buildOrdemServicoHtml(os, logoBase64, assinaturas);

  return renderHtmlToPdf({
    html,
    fileName: `OS-${os.numero || "sem-numero"}.pdf`,
    save,
  });
};

import aciLogo from "@/assets/aci-logo-hd.png";
import type { OrcamentoSupabase } from "@/services/orcamentosService";
import { buildOrcamentoHtml } from "@/utils/orcamentoPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

export const gerarPdfOrcamento = async (orcamento: OrcamentoSupabase) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildOrcamentoHtml(orcamento, logoBase64);

  await renderHtmlToPdf({
    html,
    fileName: `Orcamento-${orcamento.numero || "sem-numero"}.pdf`,
  });
};

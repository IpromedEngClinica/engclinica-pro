import aciLogo from "@/assets/aci-logo-hd.png";
import type { RelatorioControlePatrimonialDados } from "@/services/relatoriosService";
import { buildControlePatrimonialHtml } from "@/utils/controlePatrimonialPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

const normalizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export const gerarPdfControlePatrimonial = async (
  dados: RelatorioControlePatrimonialDados,
  save = true
) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildControlePatrimonialHtml(dados, logoBase64);
  const fileName = `controle_patrimonial_${normalizeFileName(
    dados.relatorio.titulo || "relatorio"
  )}_rev${dados.relatorio.revisao}.pdf`;

  return renderHtmlToPdf({
    html,
    fileName,
    save,
    orientation: "l",
    marginMm: 5,
  });
};

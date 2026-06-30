import aciLogo from "@/assets/aci-logo-hd.png";
import type { RelatorioVisitaExternaDados } from "@/services/relatoriosService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";
import { buildVisitaExternaHtml } from "@/utils/visitaExternaPdfTemplate";

const normalizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export const gerarPdfVisitaExterna = async (
  dados: RelatorioVisitaExternaDados,
  save = true
) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildVisitaExternaHtml(dados, logoBase64);
  const fileName = `visita_externa_${normalizeFileName(
    dados.relatorio.titulo || "relatorio"
  )}_rev${dados.relatorio.revisao}.pdf`;

  const printToPdf = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    save,
    orientation: "l",
    footerText: " ",
    footerFontSizePx: 10,
  });

  if (printToPdf) return printToPdf;

  return renderHtmlToPdf({
    html,
    fileName,
    save,
    orientation: "l",
    marginMm: 5,
    fontScale: 1,
  });
};

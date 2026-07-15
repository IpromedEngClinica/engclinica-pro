import aciLogo from "@/assets/aci-logo-hd.png";
import type { Recibo } from "@/services/utilitariosService";
import { assinaturasService } from "@/services/assinaturasService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { buildReciboHtml, RECIBO_FOOTER_TEXT } from "@/utils/reciboPdfTemplate";

const sanitizeFileNameSegment = (value?: string | number | null) =>
  String(value || "")
    .trim()
    .split("")
    .map((char) =>
      char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? " " : char
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const getClienteNome = (recibo: Recibo) =>
  recibo.empresa?.nome || recibo.empresa?.nome_fantasia || "Cliente";

const getEquipamentoNome = (recibo: Recibo) =>
  recibo.equipamento?.tipo_equipamento?.nome ||
  recibo.equipamento?.tipo_texto ||
  recibo.equipamento?.modelo ||
  "Equipamento";

export const gerarPdfRecibo = async (recibo: Recibo) => {
  const [logoBase64, assinaturaDataUrl] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.buscarDataUrlPorStoragePath(
      recibo.criado_por?.assinatura_storage_path
    ),
  ]);

  const html = buildReciboHtml(recibo, logoBase64, assinaturaDataUrl);
  const cliente = sanitizeFileNameSegment(getClienteNome(recibo));
  const equipamento = sanitizeFileNameSegment(getEquipamentoNome(recibo));

  await renderHtmlToPdf({
    html,
    fileName: `Recibo ${recibo.numero} - ${cliente} - ${equipamento}.pdf`,
    fontScale: 1.2,
    footerText: RECIBO_FOOTER_TEXT,
    footerHeightMm: 17,
  });
};

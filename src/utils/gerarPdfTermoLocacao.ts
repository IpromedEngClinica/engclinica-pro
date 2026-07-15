import aciLogo from "@/assets/aci-logo-hd.png";
import type { TermoLocacao } from "@/services/utilitariosService";
import {
  buildTermoLocacaoHtml,
  TERMO_LOCACAO_FOOTER_TEXT,
} from "@/utils/termoLocacaoPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

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

const getEquipamentoNome = (termo: TermoLocacao) =>
  termo.equipamento?.tipo_equipamento?.nome ||
  termo.equipamento?.tipo_texto ||
  termo.equipamento?.modelo ||
  "Equipamento";

export const gerarPdfTermoLocacao = async (termo: TermoLocacao) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildTermoLocacaoHtml(termo, logoBase64);
  const cliente =
    sanitizeFileNameSegment(
      termo.empresa_locataria?.nome || termo.empresa_locataria?.nome_fantasia
    ) || "Cliente";
  const equipamento = sanitizeFileNameSegment(getEquipamentoNome(termo));

  await renderHtmlToPdf({
    html,
    fileName: `Termo ${termo.numero} - ${cliente} - ${equipamento}.pdf`,
    fontScale: 1.38,
    footerText: TERMO_LOCACAO_FOOTER_TEXT,
    footerHeightMm: 17,
  });
};

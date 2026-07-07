import aciLogo from "@/assets/aci-logo-hd.png";
import {
  buildCadastroVisitaHtml,
  type CadastroVisitaPdfColunas,
} from "@/utils/cadastroVisitaPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

export type GerarPdfCadastroVisitaOptions = {
  cliente?: string;
  dataVisita?: string;
  linhas: number;
  colunas?: Partial<CadastroVisitaPdfColunas>;
};

const normalizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export const gerarPdfCadastroVisita = async (
  options: GerarPdfCadastroVisitaOptions
) => {
  const logoBase64 = await imageToDataUrl(aciLogo);
  const html = buildCadastroVisitaHtml(options, logoBase64);
  const cliente = normalizeFileName(options.cliente || "cliente");
  const data = normalizeFileName(options.dataVisita || "sem_data");

  return renderHtmlToPdf({
    html,
    fileName: `cadastro_visita_${cliente}_${data}.pdf`,
    orientation: "l",
    marginMm: 5,
    fontScale: 1.44,
  });
};

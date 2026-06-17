import jsPDF from "jspdf";
import aciLogo from "@/assets/aci-logo-hd.png";
import { imageToDataUrl } from "@/utils/pdfImageUtils";

export type DocWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export const PDF_MARGIN = 14;
export const PDF_CONTENT_TOP = 42;
export const PDF_FOOTER_RESERVED = 24;
export const PDF_EMPTY = "—";

export const PDF_PRIMARY = [190, 20, 30] as const;
export const PDF_TEXT = [35, 35, 35] as const;
export const PDF_MUTED = [65, 65, 65] as const;
export const PDF_LINE = [45, 45, 45] as const;

export const PDF_FONT = {
  title: 14.5,
  subtitle: 9.2,
  section: 13.2,
  label: 8.7,
  body: 8.7,
  small: 6.2,
  table: 7.4,
  tableHead: 7.6,
};

export const FOOTER_TEXT =
  "ACI Comércio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica - Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora – MG Cep 36.080-370- Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

let cachedLogoDataUrl: string | null = null;

const getLogoDataUrl = async () => {
  if (!cachedLogoDataUrl) {
    cachedLogoDataUrl = await imageToDataUrl(aciLogo);
  }

  return cachedLogoDataUrl;
};

export const setFont = (
  doc: jsPDF,
  weight: "normal" | "medium" | "semibold" | "bold" | "extrabold" = "semibold",
  size = PDF_FONT.body
) => {
  const safeWeight =
    weight === "normal" || weight === "medium"
      ? "semibold"
      : weight === "extrabold"
        ? "extrabold"
        : weight === "semibold"
          ? "semibold"
          : weight === "bold"
            ? "bold"
            : "semibold";

  try {
    doc.setFont("Montserrat", safeWeight);
  } catch {
    doc.setFont(
      "Montserrat",
      safeWeight === "extrabold" || safeWeight === "semibold"
        ? "bold"
        : safeWeight
    );
  }

  doc.setFontSize(size);
};

export const setTextColor = (
  doc: jsPDF,
  color: readonly [number, number, number]
) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

export const formatPdfDate = (iso?: string | null, withTime = false) => {
  if (!iso) return PDF_EMPTY;

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return PDF_EMPTY;

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  });
};

export const formatPdfCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

export const formatPdfQuantity = (value?: number | null) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const pdfSafe = (value?: string | null) =>
  value?.trim() || PDF_EMPTY;

export const getTableEndY = (doc: jsPDF, fallbackY: number) =>
  (doc as DocWithAutoTable).lastAutoTable?.finalY || fallbackY;

export const drawHorizontalLine = (doc: jsPDF, y: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(PDF_LINE[0], PDF_LINE[1], PDF_LINE[2]);
  doc.setLineWidth(0.35);
  doc.line(PDF_MARGIN, y, pageWidth - PDF_MARGIN, y);
};

export const drawHeader = async ({
  doc,
  title,
  subtitleLines = [],
}: {
  doc: jsPDF;
  title: string;
  subtitleLines?: string[];
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  try {
    const logoDataUrl = await getLogoDataUrl();
    doc.addImage(logoDataUrl, "PNG", PDF_MARGIN, 8, 55, 21);
  } catch {
    setFont(doc, "extrabold", 16);
    doc.text("ACI", PDF_MARGIN, 19);
  }

  setFont(doc, "extrabold", PDF_FONT.title);
  setTextColor(doc, PDF_TEXT);
  doc.text(title, pageWidth - PDF_MARGIN, 15.5, { align: "right" });

  setFont(doc, "semibold", PDF_FONT.subtitle);
  setTextColor(doc, PDF_MUTED);
  subtitleLines.forEach((line, index) => {
    doc.text(line, pageWidth - PDF_MARGIN, 23 + index * 4.8, {
      align: "right",
    });
  });

  drawHorizontalLine(doc, 40);
  doc.setTextColor(0);

  return 48;
};

export const ensureSpace = (doc: jsPDF, y: number, requiredHeight: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + requiredHeight <= pageHeight - PDF_FOOTER_RESERVED) return y;

  doc.addPage();
  return 18;
};

export const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const safeY = ensureSpace(doc, y, 12);

  setFont(doc, "bold", PDF_FONT.section);
  setTextColor(doc, PDF_TEXT);
  doc.text(title, PDF_MARGIN, safeY);

  doc.setDrawColor(PDF_LINE[0], PDF_LINE[1], PDF_LINE[2]);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, safeY + 2.2, pageWidth - PDF_MARGIN, safeY + 2.2);
  doc.setTextColor(0);

  return safeY + 6.2;
};

export const drawLabelValue = (
  doc: jsPDF,
  label: string,
  value: string | null | undefined,
  xLabel: number,
  xValue: number,
  y: number,
  maxWidth = 130
) => {
  setFont(doc, "semibold", PDF_FONT.label);
  setTextColor(doc, PDF_TEXT);
  doc.text(label, xLabel, y);

  setFont(doc, "semibold", PDF_FONT.body);
  setTextColor(doc, [45, 45, 45] as const);

  const lines = doc.splitTextToSize(value?.trim() || PDF_EMPTY, maxWidth);
  doc.text(lines, xValue, y);
  doc.setTextColor(0);

  return y + Math.max(4.2, lines.length * 3.8);
};

export const addFooter = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(PDF_LINE[0], PDF_LINE[1], PDF_LINE[2]);
    doc.setLineWidth(0.18);
    doc.line(
      PDF_MARGIN,
      pageHeight - 14,
      pageWidth - PDF_MARGIN,
      pageHeight - 14
    );

    setFont(doc, "semibold", PDF_FONT.small);
    setTextColor(doc, PDF_MUTED);

    const footerLines = doc.splitTextToSize(FOOTER_TEXT, pageWidth - 30);
    doc.text(footerLines, pageWidth / 2, pageHeight - 10.5, {
      align: "center",
    });

    doc.text(`Página ${i} de ${totalPages}`, pageWidth - PDF_MARGIN, pageHeight - 3.8, {
      align: "right",
    });

    doc.setTextColor(0);
  }
};

export const commonTableOptions = {
  theme: "plain" as const,
  styles: {
    font: "Montserrat",
    fontStyle: "semibold" as const,
    fontSize: PDF_FONT.table,
    cellPadding: 1.1,
    textColor: [35, 35, 35] as [number, number, number],
    lineColor: [45, 45, 45] as [number, number, number],
    lineWidth: 0.08,
    overflow: "linebreak" as const,
    valign: "top" as const,
  },
  headStyles: {
    font: "Montserrat",
    fontStyle: "bold" as const,
    fontSize: PDF_FONT.tableHead,
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [35, 35, 35] as [number, number, number],
    lineColor: [45, 45, 45] as [number, number, number],
    lineWidth: 0.12,
  },
  bodyStyles: {
    font: "Montserrat",
    fontStyle: "semibold" as const,
    textColor: [35, 35, 35] as [number, number, number],
  },
  margin: {
    left: PDF_MARGIN,
    right: PDF_MARGIN,
    top: 18,
    bottom: PDF_FOOTER_RESERVED,
  },
};

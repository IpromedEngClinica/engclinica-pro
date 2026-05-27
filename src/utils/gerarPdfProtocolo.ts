import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProtocoloOSSupabase } from "@/services/protocolosService";
import { registerMontserrat } from "@/utils/pdfFonts";
import {
  addFooter,
  commonTableOptions,
  drawHeader,
  ensureSpace,
  formatPdfDate,
  getTableEndY,
  PDF_EMPTY,
  PDF_FOOTER_RESERVED,
  PDF_LINE,
  PDF_MARGIN,
  PDF_TEXT,
  pdfSafe,
  setFont,
  setTextColor,
} from "@/utils/pdfLayout";

const getEmpresaNome = (protocolo: ProtocoloOSSupabase) =>
  protocolo.empresa?.nome || protocolo.empresa?.nome_fantasia || "Não informado";

const getEmpresaCampo = (protocolo: ProtocoloOSSupabase, campo: string) =>
  pdfSafe((protocolo.empresa as Record<string, string | null> | null | undefined)?.[campo]);

const getEquipamentoTipo = (protocolo: ProtocoloOSSupabase) =>
  protocolo.equipamento?.tipo_equipamento?.nome ||
  protocolo.equipamento?.tipo_texto ||
  "Equipamento não informado";

const getTitulo = (protocolo: ProtocoloOSSupabase) => {
  if (protocolo.tipo === "recolhimento") {
    return `Protocolo de Recolhimento Nº ${protocolo.numero}`;
  }

  if (protocolo.tipo === "entrega") {
    return `Protocolo de Entrega Nº ${protocolo.numero}`;
  }

  return `Protocolo Nº ${protocolo.numero}`;
};

const getDataOperacionalLabel = (protocolo: ProtocoloOSSupabase) => {
  if (protocolo.tipo === "recolhimento") return "Data de Recolhimento";
  if (protocolo.tipo === "entrega") return "Data de Entrega";
  return "Data";
};

const getDataOperacional = (protocolo: ProtocoloOSSupabase) => {
  if (protocolo.tipo === "recolhimento") {
    return protocolo.data_recolhimento || protocolo.data_protocolo;
  }

  if (protocolo.tipo === "entrega") {
    return protocolo.data_entrega || protocolo.data_protocolo;
  }

  return protocolo.data_protocolo;
};

const formatTipo = (tipo: string) => {
  const map: Record<string, string> = {
    recolhimento: "Recolhimento",
    entrega: "Entrega",
  };

  return map[tipo] || tipo;
};

const ensure = (doc: jsPDF, y: number, needed = 35) =>
  ensureSpace(doc, y, needed);

const drawSectionTitle = (
  doc: jsPDF,
  number: number,
  title: string,
  y: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const safeY = ensure(doc, y, 18);

  setFont(doc, "bold", 13.2);
  setTextColor(doc, PDF_TEXT);
  doc.text(`${number}- ${title}`, PDF_MARGIN, safeY);

  doc.setDrawColor(PDF_LINE[0], PDF_LINE[1], PDF_LINE[2]);
  doc.setLineWidth(0.35);
  doc.line(PDF_MARGIN, safeY + 4, pageWidth - PDF_MARGIN, safeY + 4);
  doc.setTextColor(0);

  return safeY + 11;
};

const drawLabelValue = (
  doc: jsPDF,
  label: string,
  value: string,
  xLabel: number,
  xValue: number,
  y: number,
  options?: { maxWidth?: number; lineHeight?: number; valueWeight?: "normal" | "semibold" | "bold" }
) => {
  const maxWidth = options?.maxWidth || 120;
  const lineHeight = options?.lineHeight || 4.5;

  setFont(doc, "bold", 8.9);
  doc.setTextColor(45, 45, 45);
  doc.text(label, xLabel, y);

  setFont(doc, options?.valueWeight || "normal", 8.9);
  doc.setTextColor(50, 50, 50);

  const lines = doc.splitTextToSize(value || PDF_EMPTY, maxWidth);
  doc.text(lines, xValue, y);
  doc.setTextColor(0);

  return y + Math.max(lineHeight, lines.length * lineHeight);
};

const drawTextBlock = (
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  maxWidth = 154
) => {
  y = ensure(doc, y, 16);

  setFont(doc, "bold", 8.9);
  doc.setTextColor(45, 45, 45);
  doc.text(label, PDF_MARGIN, y);

  setFont(doc, "normal", 8.9);
  doc.setTextColor(50, 50, 50);

  const lines = doc.splitTextToSize(value || PDF_EMPTY, maxWidth);
  let currentY = y + 4.8;
  const pageHeight = doc.internal.pageSize.getHeight();

  lines.forEach((line: string) => {
    if (currentY > pageHeight - PDF_FOOTER_RESERVED) {
      doc.addPage();
      currentY = 18;
    }

    doc.text(line, PDF_MARGIN, currentY);
    currentY += 4.5;
  });

  doc.setTextColor(0);
  return currentY + 3;
};

const drawDadosSolicitante = (
  doc: jsPDF,
  y: number,
  protocolo: ProtocoloOSSupabase
) => {
  y = drawSectionTitle(doc, 1, "Dados do Solicitante", y);

  y = drawLabelValue(doc, "Nome:", getEmpresaNome(protocolo), PDF_MARGIN, 39, y, {
    maxWidth: 150,
    valueWeight: "semibold",
  });
  y = drawLabelValue(doc, "Endereço:", getEmpresaCampo(protocolo, "endereco"), PDF_MARGIN, 39, y, {
    maxWidth: 150,
  });
  y = drawLabelValue(doc, "CNPJ:", getEmpresaCampo(protocolo, "cnpj"), PDF_MARGIN, 39, y);
  y = drawLabelValue(doc, "Contato:", getEmpresaCampo(protocolo, "contato"), PDF_MARGIN, 39, y);
  y = drawLabelValue(doc, "E-mail:", getEmpresaCampo(protocolo, "email"), PDF_MARGIN, 39, y);
  y = drawLabelValue(
    doc,
    "N.Fantasia:",
    protocolo.empresa?.nome_fantasia || PDF_EMPTY,
    PDF_MARGIN,
    39,
    y
  );

  return y + 5;
};

const drawEquipamento = (
  doc: jsPDF,
  y: number,
  protocolo: ProtocoloOSSupabase
) => {
  y = drawSectionTitle(doc, 2, "Instrumento/Equipamento", y);

  const leftLabel = PDF_MARGIN;
  const leftValue = 39;
  const rightLabel = 112;
  const rightValue = 145;
  const rowHeight = 5.4;

  y = ensure(doc, y, 32);

  drawLabelValue(doc, "Tipo:", getEquipamentoTipo(protocolo), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  drawLabelValue(
    doc,
    "Número Série:",
    pdfSafe(protocolo.equipamento?.numero_serie),
    rightLabel,
    rightValue,
    y,
    { maxWidth: 48 }
  );
  y += rowHeight;

  drawLabelValue(doc, "Modelo:", pdfSafe(protocolo.equipamento?.modelo), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  drawLabelValue(
    doc,
    "Fabricante:",
    pdfSafe(protocolo.equipamento?.fabricante),
    rightLabel,
    rightValue,
    y,
    { maxWidth: 48 }
  );
  y += rowHeight;

  y = drawLabelValue(
    doc,
    "Patrimônio:",
    pdfSafe(protocolo.equipamento?.patrimonio),
    leftLabel,
    leftValue,
    y,
    { maxWidth: 62 }
  );
  y = drawLabelValue(doc, "TAG:", pdfSafe(protocolo.equipamento?.tag), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  y = drawLabelValue(doc, "Setor:", pdfSafe(protocolo.equipamento?.setor), leftLabel, leftValue, y, {
    maxWidth: 62,
  });

  return y + 5;
};

const drawDadosProtocolo = (
  doc: jsPDF,
  y: number,
  protocolo: ProtocoloOSSupabase
) => {
  y = drawSectionTitle(doc, 3, "Dados do Protocolo", y);

  const responsavelLabel =
    protocolo.tipo === "entrega"
      ? "Responsável pelo Recebimento:"
      : "Responsável pela Coleta:";

  y = drawLabelValue(doc, "Tipo:", formatTipo(protocolo.tipo), PDF_MARGIN, 58, y, {
    valueWeight: "semibold",
  });
  y = drawLabelValue(
    doc,
    `${getDataOperacionalLabel(protocolo)}:`,
    formatPdfDate(getDataOperacional(protocolo), true),
    PDF_MARGIN,
    58,
    y
  );
  y = drawLabelValue(doc, responsavelLabel, pdfSafe(protocolo.responsavel_nome), PDF_MARGIN, 58, y, {
    maxWidth: 130,
  });
  y = drawLabelValue(doc, "Documento:", pdfSafe(protocolo.responsavel_documento), PDF_MARGIN, 58, y);
  y = drawLabelValue(doc, "Contato:", pdfSafe(protocolo.responsavel_contato), PDF_MARGIN, 58, y);
  y = drawLabelValue(
    doc,
    "OS Vinculada:",
    protocolo.ordem_servico?.numero || PDF_EMPTY,
    PDF_MARGIN,
    58,
    y
  );

  return y + 5;
};

const renderAcessorios = (
  doc: jsPDF,
  startY: number,
  protocolo: ProtocoloOSSupabase
) => {
  const acessorios = protocolo.acessorios || [];
  let y = drawSectionTitle(doc, 4, "Acessórios", startY);

  if (acessorios.length === 0) {
    setFont(doc, "normal", 8.9);
    doc.setTextColor(50, 50, 50);
    doc.text("Nenhum acessório informado.", PDF_MARGIN, y);
    doc.setTextColor(0);
    return y + 10;
  }

  autoTable(doc, {
    ...commonTableOptions,
    startY: y,
    theme: "grid",
    head: [["Item", "Acessório", "Qtde", "Conferido", "Observações"]],
    body: acessorios.map((item, index) => [
      String(index + 1),
      item.descricao,
      String(item.quantidade || 1),
      item.conferido ? "Sim" : "Não",
      pdfSafe(item.observacoes),
    ]),
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 54 },
    },
  });

  y = getTableEndY(doc, y) + 8;
  return y;
};

const drawObservacoes = (
  doc: jsPDF,
  y: number,
  protocolo: ProtocoloOSSupabase
) => {
  y = drawSectionTitle(doc, 5, "Observações", y);
  y = drawTextBlock(doc, "Problema Relatado:", pdfSafe(protocolo.problema_relatado), y);
  y = drawTextBlock(doc, "Observações:", pdfSafe(protocolo.observacoes), y);

  return y + 2;
};

const renderAssinaturas = (
  doc: jsPDF,
  startY: number,
  protocolo: ProtocoloOSSupabase
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = ensure(doc, startY, 42);
  const lineWidth = 52;
  const gap = 8;
  const dateWidth = 48;
  const firstX = PDF_MARGIN;
  const secondX = firstX + lineWidth + gap;
  const dateX = pageWidth - PDF_MARGIN - dateWidth;

  const assinaturaCliente =
    protocolo.tipo === "entrega"
      ? "Responsável pelo Recebimento"
      : "Assinatura do Cliente";

  const assinaturaACI =
    protocolo.tipo === "entrega"
      ? "Técnico Responsável / ACI"
      : "Responsável pela Coleta / ACI";

  setFont(doc, "bold", 11);
  doc.setTextColor(45, 45, 45);
  doc.text("Assinaturas", PDF_MARGIN, y);
  y += 18;

  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.28);
  doc.line(firstX, y, firstX + lineWidth, y);
  doc.line(secondX, y, secondX + lineWidth, y);
  doc.line(dateX, y, dateX + dateWidth, y);

  setFont(doc, "normal", 8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(assinaturaCliente, firstX + lineWidth / 2, y + 5, {
    align: "center",
  });
  doc.text(assinaturaACI, secondX + lineWidth / 2, y + 5, {
    align: "center",
  });
  doc.text("____ de __________ de ______", dateX + dateWidth / 2, y + 5, {
    align: "center",
  });

  doc.setTextColor(0);
};

export const gerarPdfProtocolo = async (protocolo: ProtocoloOSSupabase) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerMontserrat(doc);

  let y = await drawHeader({
    doc,
    title: getTitulo(protocolo),
    subtitleLines: [
      `Data: ${formatPdfDate(protocolo.data_protocolo, true)}`,
      `OS: ${protocolo.ordem_servico?.numero || PDF_EMPTY}`,
      `Status: ${protocolo.status || PDF_EMPTY}`,
    ],
  });

  y = drawDadosSolicitante(doc, y, protocolo);
  y = drawEquipamento(doc, y, protocolo);
  y = drawDadosProtocolo(doc, y, protocolo);
  y = renderAcessorios(doc, y, protocolo);
  y = drawObservacoes(doc, y, protocolo);

  renderAssinaturas(doc, y + 2, protocolo);
  addFooter(doc);

  const prefix =
    protocolo.tipo === "entrega"
      ? "PROTOCOLO-ENTREGA"
      : "PROTOCOLO-RECOLHIMENTO";

  doc.save(`${prefix}-${protocolo.numero || "sem-numero"}.pdf`);
};

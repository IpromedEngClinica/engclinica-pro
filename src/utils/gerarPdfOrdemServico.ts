import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EmpresaSupabase } from "@/services/empresasService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { registerMontserrat } from "@/utils/pdfFonts";
import {
  addFooter,
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
import {
  CHECKLIST_CHECK_MARK,
  CHECKLIST_CROSS_MARK,
  formatResultadoGeralChecklist,
  getChecklistMarks,
} from "@/utils/checklistPreventiva";

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome || os.empresa?.nome_fantasia || os.solicitante_texto || "Não informado";

const getEnderecoEmpresa = (empresa?: EmpresaSupabase | null) => {
  if (!empresa) return PDF_EMPTY;

  const linha1 = [
    empresa.rua,
    empresa.numero,
    empresa.complemento,
  ].filter(Boolean).join(", ");

  const linha2 = [
    empresa.bairro,
    empresa.cidade,
    empresa.estado,
  ].filter(Boolean).join(" - ");

  const cep = empresa.cep ? `CEP ${empresa.cep}` : "";

  return [linha1, linha2, cep].filter(Boolean).join(" - ") || PDF_EMPTY;
};

const getEquipamentoTipo = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome ||
  os.equipamento?.tipo_texto ||
  "Equipamento não informado";

const getTipoServico = (os: OrdemServicoSupabase) =>
  os.tipo_os?.nome || "Não informado";

const getChecklistPreventiva = (os: OrdemServicoSupabase) => {
  const checklist = os.checklist_preventiva;

  if (Array.isArray(checklist)) return checklist[0] || null;

  return checklist || null;
};

const isOSPreventiva = (os: OrdemServicoSupabase) => {
  const tipo = os.tipo_os?.nome?.toLowerCase() || "";
  const descricao = os.descricao_servico?.toLowerCase() || "";

  return (
    tipo.includes("preventiva") ||
    descricao.includes("preventiva") ||
    Boolean(getChecklistPreventiva(os))
  );
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

  setFont(doc, "bold", 13.5);
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
  options?: { maxWidth?: number; lineHeight?: number; valueWeight?: "medium" | "semibold" | "bold" | "normal" }
) => {
  const maxWidth = options?.maxWidth || 120;
  const lineHeight = options?.lineHeight || 4.5;

  setFont(doc, "bold", 9);
  doc.setTextColor(45, 45, 45);
  doc.text(label, xLabel, y);

  setFont(doc, options?.valueWeight || "normal", 9);
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

  setFont(doc, "bold", 9);
  doc.setTextColor(45, 45, 45);
  doc.text(label, PDF_MARGIN, y);

  setFont(doc, "normal", 9);
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
  os: OrdemServicoSupabase
) => {
  y = drawSectionTitle(doc, 1, "Dados do Solicitante", y);

  y = drawLabelValue(doc, "Nome:", getEmpresaNome(os), PDF_MARGIN, 39, y, {
    maxWidth: 150,
    valueWeight: "semibold",
  });
  y = drawLabelValue(doc, "Endereço:", getEnderecoEmpresa(os.empresa), PDF_MARGIN, 39, y, {
    maxWidth: 150,
  });
  y = drawLabelValue(doc, "CPF/CNPJ:", pdfSafe(os.empresa?.cpf_cnpj), PDF_MARGIN, 39, y);
  y = drawLabelValue(
    doc,
    "Contato:",
    pdfSafe(os.empresa?.contato || os.empresa?.celular || os.empresa?.telefone),
    PDF_MARGIN,
    39,
    y
  );
  y = drawLabelValue(
    doc,
    "N.Fantasia:",
    os.empresa?.nome_fantasia || PDF_EMPTY,
    PDF_MARGIN,
    39,
    y
  );

  return y + 5;
};

const drawEquipamento = (doc: jsPDF, y: number, os: OrdemServicoSupabase) => {
  y = drawSectionTitle(doc, 2, "Instrumento/Equipamento", y);

  const leftLabel = PDF_MARGIN;
  const leftValue = 39;
  const rightLabel = 112;
  const rightValue = 145;
  const rowHeight = 5.4;

  y = ensure(doc, y, 32);

  drawLabelValue(doc, "Tipo:", getEquipamentoTipo(os), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  drawLabelValue(
    doc,
    "Número Série:",
    pdfSafe(os.equipamento?.numero_serie),
    rightLabel,
    rightValue,
    y,
    { maxWidth: 48 }
  );
  y += rowHeight;

  drawLabelValue(doc, "Modelo:", pdfSafe(os.equipamento?.modelo), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  drawLabelValue(
    doc,
    "Fabricante:",
    pdfSafe(os.equipamento?.fabricante),
    rightLabel,
    rightValue,
    y,
    { maxWidth: 48 }
  );
  y += rowHeight;

  y = drawLabelValue(
    doc,
    "Patrimônio:",
    pdfSafe(os.equipamento?.patrimonio),
    leftLabel,
    leftValue,
    y,
    { maxWidth: 62 }
  );
  y = drawLabelValue(doc, "TAG:", pdfSafe(os.equipamento?.tag), leftLabel, leftValue, y, {
    maxWidth: 62,
  });
  y = drawLabelValue(doc, "Setor:", pdfSafe(os.equipamento?.setor), leftLabel, leftValue, y, {
    maxWidth: 62,
  });

  return y + 5;
};

const drawServicoPrestado = (
  doc: jsPDF,
  y: number,
  os: OrdemServicoSupabase
) => {
  y = drawSectionTitle(doc, 3, "Serviço Prestado", y);

  if (isOSPreventiva(os)) {
    const descricao = pdfSafe(os.descricao_servico);
    y = drawTextBlock(
      doc,
      "Descrição do Serviço:",
      descricao !== PDF_EMPTY
        ? descricao
        : "Manutencao preventiva realizada conforme checklist tecnico.",
      y
    );

    return y + 2;
  }

  y = drawLabelValue(
    doc,
    "Tipo de Serviço:",
    getTipoServico(os),
    PDF_MARGIN,
    50,
    y,
    { maxWidth: 140, valueWeight: "semibold" }
  );

  y = drawTextBlock(doc, "Problema Relatado:", pdfSafe(os.problema_relatado), y);
  y = drawTextBlock(doc, "Origem do Problema:", pdfSafe(os.origem_problema), y);
  y = drawTextBlock(doc, "Descrição do Serviço:", pdfSafe(os.descricao_servico), y);

  return y + 2;
};

const drawChecklistPreventiva = (
  doc: jsPDF,
  y: number,
  os: OrdemServicoSupabase
) => {
  const checklist = getChecklistPreventiva(os);

  if (!checklist) return y;

  y = ensure(doc, y, 18);

  setFont(doc, "bold", 12);
  doc.setTextColor(45, 45, 45);
  doc.text("3.1 - Checklists", PDF_MARGIN, y);
  y += 7;

  setFont(doc, "bold", 9);
  doc.text(
    checklist.titulo_procedimento ||
      checklist.tipo_equipamento_nome ||
      "Checklist de Preventiva",
    PDF_MARGIN,
    y
  );
  y += 5;

  setFont(doc, "normal", 8.5);
  doc.text(
    `Legenda: ${CHECKLIST_CHECK_MARK} conforme, ${CHECKLIST_CROSS_MARK} nao conforme, N/A nao se aplica`,
    PDF_MARGIN,
    y
  );
  y += 6;

  const itens = [...(checklist.itens || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );
  const body = itens.map((item, index) => {
    const marks = getChecklistMarks(item.resposta);
    return [
      String(index + 1),
      item.descricao || PDF_EMPTY,
      marks.conforme,
      marks.naoConforme,
      marks.naoAplica,
      item.observacao || marks.texto || PDF_EMPTY,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Item", "Descrição", "Conforme", "Não Conforme", "N/A", "Observação"]],
    body:
      body.length > 0
        ? body
        : [["-", "Nenhum item informado", "", "", "", PDF_EMPTY]],
    theme: "grid",
    styles: {
      font: "Montserrat",
      fontSize: 7.4,
      cellPadding: 1.6,
      textColor: [45, 45, 45],
      lineColor: PDF_LINE,
      lineWidth: 0.12,
      valign: "middle",
    },
    headStyles: {
      fillColor: [45, 45, 45],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 72 },
      2: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      5: { cellWidth: "auto" },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });

  y = getTableEndY(doc, y) + 6;
  y = ensure(doc, y, 20);
  y = drawLabelValue(
    doc,
    "Resultado Geral:",
    formatResultadoGeralChecklist(checklist.resultado_geral),
    PDF_MARGIN,
    58,
    y,
    { maxWidth: 100, valueWeight: "semibold" }
  );
  y = drawLabelValue(
    doc,
    "Validade da Preventiva:",
    formatPdfDate(checklist.data_validade),
    PDF_MARGIN,
    58,
    y,
    { maxWidth: 60 }
  );
  y = drawLabelValue(
    doc,
    "Validade:",
    `${checklist.validade_meses} meses`,
    PDF_MARGIN,
    58,
    y,
    { maxWidth: 60 }
  );

  if (checklist.observacoes) {
    y = drawTextBlock(doc, "Observações do Checklist:", checklist.observacoes, y);
  }

  doc.setTextColor(0);
  return y + 3;
};

const drawObservacoes = (doc: jsPDF, y: number, os: OrdemServicoSupabase) => {
  y = drawSectionTitle(doc, 4, "Observações", y);
  y = drawTextBlock(doc, "Observações:", pdfSafe(os.observacoes), y);

  const acessorios = os.acessorios || [];

  y = ensure(doc, y, 14);
  setFont(doc, "bold", 9);
  doc.setTextColor(45, 45, 45);
  doc.text("Acessórios:", PDF_MARGIN, y);
  y += 5;

  setFont(doc, "normal", 9);
  doc.setTextColor(50, 50, 50);

  if (acessorios.length === 0) {
    doc.text(PDF_EMPTY, PDF_MARGIN, y);
    y += 5;
  } else {
    acessorios.forEach((item) => {
      y = ensure(doc, y, 8);
      const texto = item.quantidade && item.quantidade > 1
        ? `• ${item.descricao} (${item.quantidade}x)`
        : `• ${item.descricao}`;
      doc.text(texto, PDF_MARGIN + 2, y);
      y += 4.8;

      if (item.observacoes) {
        const lines = doc.splitTextToSize(item.observacoes, 170);
        doc.text(lines, PDF_MARGIN + 6, y);
        y += Math.max(4.8, lines.length * 4.3);
      }
    });
  }

  doc.setTextColor(0);
  return y + 5;
};

const renderAssinaturas = (doc: jsPDF, startY: number, os: OrdemServicoSupabase) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = ensure(doc, startY, 42);
  const lineWidth = 52;
  const gap = 8;
  const dateWidth = 48;
  const firstX = PDF_MARGIN;
  const secondX = firstX + lineWidth + gap;
  const dateX = pageWidth - PDF_MARGIN - dateWidth;

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
  doc.text("Assinatura do Cliente", firstX + lineWidth / 2, y + 5, {
    align: "center",
  });
  doc.text("Responsável Técnico", secondX + lineWidth / 2, y + 5, {
    align: "center",
  });
  doc.text("____ de __________ de ______", dateX + dateWidth / 2, y + 5, {
    align: "center",
  });

  if (os.responsavel_texto) {
    doc.text(os.responsavel_texto, secondX + lineWidth / 2, y + 10, {
      align: "center",
    });
  }

  doc.setTextColor(0);
};

export const gerarPdfOrdemServico = async (os: OrdemServicoSupabase) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerMontserrat(doc);

  let y = await drawHeader({
    doc,
    title: `Ordem de Serviço Nº ${os.numero}`,
    subtitleLines: [
      `Data de Abertura: ${formatPdfDate(os.data_abertura, true)}`,
      ...(os.data_fechamento
        ? [`Data de Fechamento: ${formatPdfDate(os.data_fechamento, true)}`]
        : []),
    ],
  });

  y = drawDadosSolicitante(doc, y, os);
  y = drawEquipamento(doc, y, os);
  y = drawServicoPrestado(doc, y, os);
  y = drawChecklistPreventiva(doc, y, os);
  y = drawObservacoes(doc, y, os);

  renderAssinaturas(doc, y + 2, os);
  addFooter(doc);

  doc.save(`OS-${os.numero || "sem-numero"}.pdf`);
};

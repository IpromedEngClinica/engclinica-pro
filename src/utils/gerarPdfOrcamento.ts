import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  OrcamentoItemSupabase,
  OrcamentoSupabase,
} from "@/services/orcamentosService";
import { registerMontserrat } from "@/utils/pdfFonts";
import {
  addFooter,
  drawHeader,
  drawLabelValue,
  drawSectionTitle,
  ensureSpace,
  formatPdfCurrency,
  formatPdfDate,
  formatPdfQuantity,
  getTableEndY,
  PDF_EMPTY,
  PDF_FONT,
  PDF_FOOTER_RESERVED,
  PDF_MARGIN,
  pdfSafe,
  setFont,
  setTextColor,
  PDF_TEXT,
} from "@/utils/pdfLayout";

const labelMap: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
  servico: "Serviço",
  peca: "Peça",
  deslocamento: "Deslocamento",
  outro: "Outro",
  pecas: "Peças",
  pecas_servicos: "Peças + Serviços",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  boleto: "Boleto",
  pix: "Pix",
  avista: "À vista",
  parcelado: "Parcelado",
  entrada_parcela: "Entrada + parcela",
  cif: "CIF",
  fob: "FOB",
};

const label = (value?: string | null) =>
  value ? labelMap[value] || value : PDF_EMPTY;

const getTitulo = (orcamento: OrcamentoSupabase) => {
  if (orcamento.tipo_orcamento === "servico") {
    return `Orçamento de Serviço Nº ${orcamento.numero}`;
  }

  if (orcamento.tipo_orcamento === "pecas") {
    return `Orçamento de Peças Nº ${orcamento.numero}`;
  }

  return `Orçamento Nº ${orcamento.numero}`;
};

const getEmpresaRecord = (orcamento: OrcamentoSupabase) =>
  (orcamento.empresa || {}) as Record<string, string | null | undefined>;

const getEmpresaCampo = (
  orcamento: OrcamentoSupabase,
  campos: string[]
) => {
  const empresa = getEmpresaRecord(orcamento);

  for (const campo of campos) {
    const value = empresa[campo];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return PDF_EMPTY;
};

const getEmpresaNome = (orcamento: OrcamentoSupabase) =>
  orcamento.empresa?.nome || orcamento.empresa?.nome_fantasia || "Não informado";

const getCidadeEstado = (orcamento: OrcamentoSupabase) => {
  const cidade = getEmpresaCampo(orcamento, ["cidade", "municipio"]);
  const estado = getEmpresaCampo(orcamento, ["estado", "uf"]);

  if (cidade === PDF_EMPTY && estado === PDF_EMPTY) return PDF_EMPTY;
  if (cidade === PDF_EMPTY) return estado;
  if (estado === PDF_EMPTY) return cidade;
  return `${cidade}/${estado}`;
};

const getEquipamentoTipo = (orcamento: OrcamentoSupabase) =>
  orcamento.equipamento?.tipo_equipamento?.nome ||
  orcamento.equipamento?.tipo_texto ||
  PDF_EMPTY;

const getEquipamentoResumo = (orcamento: OrcamentoSupabase) => {
  const equipamento = orcamento.equipamento;

  if (!equipamento) return "Equipamento não vinculado.";

  const partes = [
    `Equipamento: ${getEquipamentoTipo(orcamento)}`,
    equipamento.fabricante ? `Marca: ${equipamento.fabricante}` : null,
    equipamento.modelo ? `Modelo: ${equipamento.modelo}` : null,
    equipamento.numero_serie
      ? `Número de Série: ${equipamento.numero_serie}`
      : null,
    equipamento.patrimonio ? `Patrimônio: ${equipamento.patrimonio}` : null,
    equipamento.tag ? `TAG: ${equipamento.tag}` : null,
    equipamento.setor ? `Setor: ${equipamento.setor}` : null,
  ].filter(Boolean);

  return partes.join(", ");
};

const getItemServico = (item: OrcamentoItemSupabase) =>
  item.tipo_servico?.nome || item.descricao || label(item.tipo);

const getItemPeca = (item: OrcamentoItemSupabase) =>
  item.peca_nome || item.peca?.nome || item.descricao || PDF_EMPTY;

const getItensOrdenados = (orcamento: OrcamentoSupabase) =>
  [...(orcamento.itens || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

const ensure = (doc: jsPDF, y: number, needed = 28) =>
  ensureSpace(doc, y, needed);

const drawTextBlock = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize = 8.5
) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  setFont(doc, "normal", fontSize);
  setTextColor(doc, PDF_TEXT);

  const lines = doc.splitTextToSize(text || PDF_EMPTY, width);
  const lineHeight = fontSize * 0.38;
  let currentY = y;

  lines.forEach((line: string) => {
    if (currentY + lineHeight > pageHeight - PDF_FOOTER_RESERVED) {
      doc.addPage();
      currentY = 18;
    }

    doc.text(line, x, currentY);
    currentY += lineHeight;
  });

  doc.setTextColor(0);
  return currentY + 2;
};

const drawLabeledParagraph = (
  doc: jsPDF,
  labelText: string,
  value: string,
  y: number
) => {
  y = ensure(doc, y, 18);
  setFont(doc, "semibold", PDF_FONT.label);
  setTextColor(doc, PDF_TEXT);
  doc.text(labelText, PDF_MARGIN, y);

  return drawTextBlock(doc, value, PDF_MARGIN, y + 4.6, 182, PDF_FONT.body);
};

const drawNumberedSectionTitle = (
  doc: jsPDF,
  number: number,
  title: string,
  y: number
) => drawSectionTitle(doc, `${number}- ${title}`, y);

const drawCliente = (doc: jsPDF, y: number, orcamento: OrcamentoSupabase) => {
  y = drawNumberedSectionTitle(doc, 1, "Cliente", y);

  const rows: Array<[string, string]> = [
    ["Nome:", getEmpresaNome(orcamento)],
    ["Endereço:", getEmpresaCampo(orcamento, ["endereco", "logradouro"])],
    ["Contato:", getEmpresaCampo(orcamento, ["contato", "telefone", "celular"])],
    ["Email:", getEmpresaCampo(orcamento, ["email", "e_mail"])],
    ["Cidade/Estado:", getCidadeEstado(orcamento)],
    ["CNPJ/CPF:", getEmpresaCampo(orcamento, ["cnpj", "cpf", "documento"])],
  ];

  rows.forEach(([rowLabel, value]) => {
    y = ensure(doc, y, 8);
    drawLabelValue(doc, rowLabel, value, PDF_MARGIN, PDF_MARGIN + 28, y);
    y += 5.2;
  });

  return y + 4;
};

const renderItens = ({
  doc,
  startY,
  title,
  itens,
  getDescricao,
}: {
  doc: jsPDF;
  startY: number;
  title: string;
  itens: OrcamentoItemSupabase[];
  getDescricao: (item: OrcamentoItemSupabase) => string;
}) => {
  if (itens.length === 0) return startY;

  let y = ensure(doc, startY, 35);

  setFont(doc, "bold", PDF_FONT.body);
  setTextColor(doc, PDF_TEXT);
  doc.text(title, PDF_MARGIN, y);
  y += 4.8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Item", title, "Garantia", "Qtde", "Valor Un.", "Valor"]],
    body: itens.map((item, index) => [
      String(index + 1),
      getDescricao(item),
      pdfSafe(item.garantia),
      formatPdfQuantity(item.quantidade),
      formatPdfCurrency(item.valor_unitario),
      formatPdfCurrency(item.valor_total),
    ]),
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      fontSize: PDF_FONT.table,
      cellPadding: 1.2,
      textColor: [45, 45, 45],
      lineWidth: 0.08,
      lineColor: [75, 75, 75],
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      font: "Montserrat",
      fillColor: [255, 255, 255],
      textColor: [40, 40, 40],
      fontStyle: "bold",
      fontSize: PDF_FONT.tableHead,
      lineWidth: 0.12,
      lineColor: [55, 55, 55],
    },
    bodyStyles: {
      font: "Montserrat",
      fontStyle: "normal",
    },
    margin: {
      left: PDF_MARGIN,
      right: PDF_MARGIN,
      top: 18,
      bottom: PDF_FOOTER_RESERVED,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30 },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
    },
  });

  y = getTableEndY(doc, y) + 6;
  return y + 2;
};

const drawTwoColumnRows = (
  doc: jsPDF,
  y: number,
  rows: Array<[string, string, string, string]>
) => {
  rows.forEach(([labelLeft, valueLeft, labelRight, valueRight]) => {
    y = ensure(doc, y, 9);
    drawLabelValue(doc, labelLeft, valueLeft, PDF_MARGIN, PDF_MARGIN + 34, y);
    if (labelRight) {
      drawLabelValue(doc, labelRight, valueRight, 110, 142, y);
    }
    y += 5.8;
  });

  return y + 4;
};

const drawTotaisItens = (
  doc: jsPDF,
  y: number,
  orcamento: OrcamentoSupabase
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  y = ensure(doc, y, 18);

  setFont(doc, "bold", PDF_FONT.body);
  setTextColor(doc, PDF_TEXT);
  doc.text(
    `Total Serviços: ${formatPdfCurrency(orcamento.valor_servicos)}`,
    pageWidth - PDF_MARGIN,
    y,
    { align: "right" }
  );
  y += 5;
  doc.text(
    `Total Peças: ${formatPdfCurrency(orcamento.valor_pecas)}`,
    pageWidth - PDF_MARGIN,
    y,
    { align: "right" }
  );
  y += 5;
  doc.text(
    `Valor Total: ${formatPdfCurrency(orcamento.valor_total)}`,
    pageWidth - PDF_MARGIN,
    y,
    { align: "right" }
  );
  doc.setTextColor(0);

  return y + 10;
};

const drawDadosOrcamento = (
  doc: jsPDF,
  y: number,
  orcamento: OrcamentoSupabase
) => {
  y = drawNumberedSectionTitle(doc, 3, "Dados do Orçamento", y);

  return drawTwoColumnRows(doc, y, [
    [
      "Responsável:",
      pdfSafe(orcamento.responsavel_orcamentista),
      "Estado:",
      label(orcamento.status),
    ],
    [
      "Prazo de Entrega:",
      pdfSafe(orcamento.prazo_entrega),
      "Frete:",
      label(orcamento.frete),
    ],
    [
      "Validade:",
      formatPdfDate(orcamento.data_validade),
      "OS:",
      orcamento.ordem_servico?.numero || PDF_EMPTY,
    ],
    [
      "Identificador:",
      pdfSafe(orcamento.identificador),
      "",
      "",
    ],
  ]);
};

const drawInformacoes = (
  doc: jsPDF,
  y: number,
  orcamento: OrcamentoSupabase
) => {
  y = drawNumberedSectionTitle(doc, 4, "Informações", y);
  y = drawLabeledParagraph(
    doc,
    "Informações técnicas:",
    getEquipamentoResumo(orcamento),
    y
  );

  y = drawLabeledParagraph(
    doc,
    "Serviços a serem executados:",
    pdfSafe(orcamento.detalhes_orcamento),
    y
  );

  y = drawLabeledParagraph(doc, "Obs:", pdfSafe(orcamento.observacoes), y);

  if (orcamento.garantia) {
    y = drawLabeledParagraph(doc, "Garantia:", orcamento.garantia, y);
  }

  return y + 2;
};

const drawPagamento = (
  doc: jsPDF,
  y: number,
  orcamento: OrcamentoSupabase
) => {
  y = drawNumberedSectionTitle(doc, 5, "Pagamento", y);

  const rows: Array<[string, string, string, string]> = [
    [
      "Forma:",
      label(orcamento.forma_pagamento),
      "Modo:",
      label(orcamento.modo_pagamento),
    ],
    [
      "Valor total:",
      formatPdfCurrency(orcamento.valor_total),
      "Parcelas:",
      orcamento.numero_parcelas ? String(orcamento.numero_parcelas) : PDF_EMPTY,
    ],
  ];

  if (orcamento.valor_entrada || orcamento.valor_parcela) {
    rows.push([
      "Entrada:",
      orcamento.valor_entrada
        ? formatPdfCurrency(orcamento.valor_entrada)
        : PDF_EMPTY,
      "Valor parcela:",
      orcamento.valor_parcela
        ? formatPdfCurrency(orcamento.valor_parcela)
        : PDF_EMPTY,
    ]);
  }

  y = drawTwoColumnRows(doc, y, rows);

  if (orcamento.condicoes_pagamento) {
    y = drawLabeledParagraph(
      doc,
      "Condições de pagamento:",
      orcamento.condicoes_pagamento,
      y
    );
  }

  return y + 2;
};

const renderAutorizacao = (
  doc: jsPDF,
  startY: number,
  orcamento: OrcamentoSupabase
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawSectionTitle(
    doc,
    "6- Autorização para realização do serviço",
    ensure(doc, startY, 48)
  );
  const lineWidth = 74;

  y = drawTextBlock(
    doc,
    "Autorizo a execução dos serviços e/ou fornecimento das peças descritas neste orçamento.",
    PDF_MARGIN,
    y,
    182,
    8.5
  );

  y += 14;

  doc.setDrawColor(45);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + lineWidth, y);
  doc.line(pageWidth - PDF_MARGIN - lineWidth, y, pageWidth - PDF_MARGIN, y);

  setFont(doc, "normal", PDF_FONT.body);
  doc.text("Responsável Orçamentista", PDF_MARGIN + lineWidth / 2, y + 5, {
    align: "center",
  });
  doc.text("Aprovado por", pageWidth - PDF_MARGIN - lineWidth / 2, y + 5, {
    align: "center",
  });

  if (orcamento.responsavel_orcamentista) {
    doc.text(orcamento.responsavel_orcamentista, PDF_MARGIN + lineWidth / 2, y + 10, {
      align: "center",
    });
  }

  if (orcamento.aprovado_por) {
    doc.text(orcamento.aprovado_por, pageWidth - PDF_MARGIN - lineWidth / 2, y + 10, {
      align: "center",
    });
  }
};

export const gerarPdfOrcamento = async (orcamento: OrcamentoSupabase) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerMontserrat(doc);

  let y = await drawHeader({
    doc,
    title: getTitulo(orcamento),
    subtitleLines: [
      `Data: ${formatPdfDate(orcamento.data_orcamento)}`,
      `Status: ${label(orcamento.status)}`,
      `Validade: ${formatPdfDate(orcamento.data_validade)}`,
    ],
  });

  y = drawCliente(doc, y, orcamento);

  const itens = getItensOrdenados(orcamento);
  const servicos = itens.filter((item) =>
    ["servico", "deslocamento", "outro"].includes(item.tipo)
  );
  const pecas = itens.filter((item) => item.tipo === "peca");

  if (servicos.length > 0 || pecas.length > 0) {
    y = drawNumberedSectionTitle(doc, 2, "Itens do Orçamento", y);
  }

  y = renderItens({
    doc,
    startY: y,
    title: "Serviços",
    itens: servicos,
    getDescricao: getItemServico,
  });

  y = renderItens({
    doc,
    startY: y,
    title: "Peças",
    itens: pecas,
    getDescricao: getItemPeca,
  });

  if (servicos.length > 0 || pecas.length > 0) {
    y = drawTotaisItens(doc, y, orcamento);
  }

  y = drawDadosOrcamento(doc, y, orcamento);
  y = drawInformacoes(doc, y, orcamento);
  y = drawPagamento(doc, y, orcamento);

  renderAutorizacao(doc, y + 2, orcamento);
  addFooter(doc);

  doc.save(`ORCAMENTO-${orcamento.numero || "sem-numero"}.pdf`);
};

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { OrdemServicoSupabase } from "@/services/ordensServicoService";

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const safe = (value?: string | null) => value?.trim() || "—";

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome_fantasia || os.empresa?.nome || "Não informado";

const getEquipamentoTipo = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome ||
  os.equipamento?.tipo_texto ||
  "Equipamento não informado";

const getTipoServico = (os: OrdemServicoSupabase) =>
  os.tipo_os?.nome || "Não informado";

const getEstado = (os: OrdemServicoSupabase) =>
  os.estado_os?.nome || os.status_sistema || "Não informado";

const getTecnico = (os: OrdemServicoSupabase) => os.responsavel_texto || "—";

const getTableEndY = (doc: jsPDF, fallbackY: number) => {
  return (doc as DocWithAutoTable).lastAutoTable?.finalY || fallbackY;
};

export const gerarPdfOrdemServico = (os: OrdemServicoSupabase) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("ORDEM DE SERVIÇO", pageWidth / 2, y, { align: "center" });

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Número: ${os.numero}`, margin, y);
  doc.text(`Data de abertura: ${formatDate(os.data_abertura)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 5;

  doc.text(`Estado: ${getEstado(os)}`, margin, y);
  doc.text(`Status: ${os.status_sistema || "—"}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Solicitante", ""]],
    body: [
      ["Empresa", getEmpresaNome(os)],
      ["Solicitante informado", safe(os.solicitante_texto)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [45, 45, 45] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  y = getTableEndY(doc, y) + 6;

  autoTable(doc, {
    startY: y,
    head: [["Equipamento", ""]],
    body: [
      ["Tipo", getEquipamentoTipo(os)],
      ["Fabricante", safe(os.equipamento?.fabricante)],
      ["Modelo", safe(os.equipamento?.modelo)],
      ["Número de Série", safe(os.equipamento?.numero_serie)],
      ["Patrimônio", safe(os.equipamento?.patrimonio)],
      ["TAG", safe(os.equipamento?.tag)],
      ["Setor", safe(os.equipamento?.setor)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [45, 45, 45] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  y = getTableEndY(doc, y) + 6;

  autoTable(doc, {
    startY: y,
    head: [["Serviço", ""]],
    body: [
      ["Tipo de Serviço", getTipoServico(os)],
      ["Responsável Técnico", getTecnico(os)],
      ["Problema Relatado", safe(os.problema_relatado)],
      ["Origem do Problema", safe(os.origem_problema)],
      ["Descrição do Serviço", safe(os.descricao_servico)],
      ["Observações", safe(os.observacoes)],
      ["Data de Fechamento", formatDate(os.data_fechamento)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [45, 45, 45] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  y = getTableEndY(doc, y) + 6;

  const acessorios = os.acessorios || [];

  autoTable(doc, {
    startY: y,
    head: [["Acessórios", "Qtd.", "Observações"]],
    body:
      acessorios.length > 0
        ? acessorios.map((item) => [
            item.descricao,
            String(item.quantidade || 1),
            safe(item.observacoes),
          ])
        : [["Nenhum acessório informado", "—", "—"]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [45, 45, 45] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 65 },
    },
    margin: { left: margin, right: margin },
  });

  y = getTableEndY(doc, y) + 14;

  if (y > 245) {
    doc.addPage();
    y = 25;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0);

  doc.text("Assinaturas", margin, y);
  y += 18;

  const lineWidth = 75;

  doc.line(margin, y, margin + lineWidth, y);
  doc.text("Responsável pelo Cliente", margin + lineWidth / 2, y + 5, {
    align: "center",
  });

  doc.line(pageWidth - margin - lineWidth, y, pageWidth - margin, y);
  doc.text("Técnico Responsável", pageWidth - margin - lineWidth / 2, y + 5, {
    align: "center",
  });

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `EngClinica Pro - OS ${os.numero} - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      287,
      { align: "center" }
    );
  }

  const filename = `OS-${os.numero || "sem-numero"}.pdf`;
  doc.save(filename);
};

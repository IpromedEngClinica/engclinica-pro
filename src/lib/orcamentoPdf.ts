import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Orcamento, Empresa } from "@/contexts/DataContext";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
};

// Tema minimalista: vermelho corporativo + cinza
const RED: [number, number, number] = [200, 30, 30];
const DARK: [number, number, number] = [40, 40, 40];
const GRAY: [number, number, number] = [120, 120, 120];
const LIGHT: [number, number, number] = [240, 240, 240];

const COMPANY_FOOTER =
  "ACI Comércio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica\n" +
  "Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora – MG - CEP 36.080-370\n" +
  "Pabx (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

export function generateOrcamentoPdf(orc: Orcamento, empresa?: Empresa) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const totalPecas = orc.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const totalServ = orc.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const total = totalPecas + totalServ;

  // ===== Header =====
  doc.setFillColor(...RED);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ACI", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Equipamentos Hospitalares", margin, 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Orçamento Nº ${orc.numero}`, pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(formatDate(orc.dataCriacao), pageW - margin, 20, { align: "right" });
  doc.text(`Status: ${orc.status}`, pageW - margin, 25, { align: "right" });

  let y = 38;

  const sectionTitle = (title: string) => {
    doc.setFillColor(...LIGHT);
    doc.rect(margin, y - 4, pageW - margin * 2, 7, "F");
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 2, y + 1);
    y += 8;
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  };

  const kv = (label: string, value: string, x: number, w: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(value || "—", w);
    doc.text(lines, x, y + 4);
    return lines.length * 4 + 4;
  };

  // ===== Cliente =====
  sectionTitle("Cliente");
  const colW = (pageW - margin * 2 - 6) / 2;
  const h1 = kv("Nome", empresa?.nome ?? orc.solicitante, margin, colW);
  const h2 = kv(
    "Cidade / Estado",
    empresa ? `${empresa.cidade} / ${empresa.estado}` : "—",
    margin + colW + 6,
    colW
  );
  y += Math.max(h1, h2) + 2;
  if (empresa) {
    const h3 = kv("CNPJ / CPF", empresa.cpfCnpj, margin, colW);
    const h4 = kv("Contato", `${empresa.contato} • ${empresa.telefone}`, margin + colW + 6, colW);
    y += Math.max(h3, h4) + 2;
  }
  y += 2;

  // ===== Peças =====
  if (orc.pecas.length > 0) {
    sectionTitle("Descritivo de Peças");
    autoTable(doc, {
      startY: y,
      head: [["#", "Peça", "Qtde", "Valor Unit.", "Garantia", "Total"]],
      body: orc.pecas.map((p, i) => [
        String(i + 1),
        p.peca,
        String(p.quantidade),
        formatBRL(p.valorUnitario),
        `${p.garantiaDias} dias`,
        formatBRL(p.quantidade * p.valorUnitario),
      ]),
      theme: "grid",
      headStyles: { fillColor: RED, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: DARK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 2 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`Total Peças: ${formatBRL(totalPecas)}`, pageW - margin, y + 4, { align: "right" });
    y += 10;
  }

  // ===== Serviços =====
  if (orc.servicos.length > 0) {
    sectionTitle("Descritivo de Serviços");
    autoTable(doc, {
      startY: y,
      head: [["#", "Tipo de Serviço", "Equipamento", "Qtde", "Valor Unit.", "Garantia", "Total"]],
      body: orc.servicos.map((s, i) => [
        String(i + 1),
        s.tipoServico,
        s.tipoEquipamento || "—",
        String(s.quantidade),
        formatBRL(s.valorUnitario),
        `${s.garantiaDias} dias`,
        formatBRL(s.quantidade * s.valorUnitario),
      ]),
      theme: "grid",
      headStyles: { fillColor: RED, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: DARK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 2 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Total Serviços: ${formatBRL(totalServ)}`, pageW - margin, y + 4, { align: "right" });
    y += 10;
  }

  // Quebra se necessário
  if (y > pageH - 90) { doc.addPage(); y = 20; }

  // ===== Dados do Orçamento =====
  sectionTitle("Dados do Orçamento");
  const w3 = (pageW - margin * 2 - 12) / 3;
  const a1 = kv("Responsável", orc.responsavelOrcamentista, margin, w3);
  const a2 = kv("Prazo de Entrega", orc.prazoEntrega || "—", margin + w3 + 6, w3);
  const a3 = kv("Validade", `${orc.validadeDias} dias`, margin + (w3 + 6) * 2, w3);
  y += Math.max(a1, a2, a3) + 1;
  const b1 = kv("Frete", orc.frete, margin, w3);
  const b2 = kv("Tipo", orc.tipo, margin + w3 + 6, w3);
  const b3 = kv("Status", orc.status, margin + (w3 + 6) * 2, w3);
  y += Math.max(b1, b2, b3) + 3;

  // ===== Informações Técnicas =====
  if (orc.detalhes) {
    if (y > pageH - 70) { doc.addPage(); y = 20; }
    sectionTitle("Informações Técnicas");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(orc.detalhes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ===== Pagamento =====
  if (y > pageH - 60) { doc.addPage(); y = 20; }
  sectionTitle("Pagamento");
  const p1 = kv("Forma de Pagamento", orc.formaPagamento, margin, w3);
  const p2 = kv("Modo de Pagamento", orc.modoPagamento, margin + w3 + 6, w3);
  let parcelaInfo = "—";
  if (orc.modoPagamento === "Parcelado" && orc.numeroParcelas > 0) {
    parcelaInfo = `${orc.numeroParcelas}x de ${formatBRL(total / orc.numeroParcelas)}`;
  } else if (orc.modoPagamento === "Entrada + Parcela") {
    const restante = Math.max(total - orc.valorEntrada, 0);
    parcelaInfo = `Entrada ${formatBRL(orc.valorEntrada)} + ${orc.numeroParcelas}x de ${formatBRL(restante / Math.max(orc.numeroParcelas, 1))}`;
  } else {
    parcelaInfo = "À vista";
  }
  const p3 = kv("Parcelamento", parcelaInfo, margin + (w3 + 6) * 2, w3);
  y += Math.max(p1, p2, p3) + 4;

  // Total destaque
  doc.setFillColor(...RED);
  doc.rect(margin, y, pageW - margin * 2, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("VALOR TOTAL", margin + 4, y + 8);
  doc.setFontSize(13);
  doc.text(formatBRL(total), pageW - margin - 4, y + 8, { align: "right" });

  // ===== Footer em todas as páginas =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = pageH - 16;
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.5);
    doc.line(margin, fy - 2, pageW - margin, fy - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    const fLines = COMPANY_FOOTER.split("\n");
    fLines.forEach((line, idx) => {
      doc.text(line, pageW / 2, fy + idx * 3.2, { align: "center" });
    });
    doc.setFontSize(7);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`Orcamento-${orc.numero}.pdf`);
}

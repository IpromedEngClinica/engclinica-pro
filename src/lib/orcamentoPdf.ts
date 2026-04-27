import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Orcamento, Empresa } from "@/contexts/DataContext";
import logoUrl from "@/assets/aci-logo.png";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
};

// Paleta minimalista — quase sem vermelho, apenas como acento sutil
const ACCENT: [number, number, number] = [180, 35, 35]; // vermelho ACI (uso pontual)
const DARK: [number, number, number] = [45, 55, 72];
const TEXT: [number, number, number] = [60, 70, 85];
const MUTED: [number, number, number] = [130, 138, 150];
const BORDER: [number, number, number] = [225, 228, 232];
const SOFT: [number, number, number] = [247, 248, 250];

const COMPANY_FOOTER =
  "ACI Comércio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica\n" +
  "Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora – MG - CEP 36.080-370\n" +
  "Pabx (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

// Carrega a logo como dataURL para embutir no PDF
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateOrcamentoPdf(orc: Orcamento, empresa?: Empresa) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const totalPecas = orc.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const totalServ = orc.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const total = totalPecas + totalServ;

  const logo = await loadLogoDataUrl();

  // ===== Header =====
  // Fundo branco com leve faixa inferior cinza
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 32, "F");

  // Logo
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin, 8, 38, 18);
    } catch {
      // ignore
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...ACCENT);
    doc.text("ACI", margin, 18);
  }

  // Bloco de identificação do orçamento (lado direito)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("ORÇAMENTO", pageW - margin, 12, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(`Nº ${orc.numero}`, pageW - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(`Emissão: ${formatDate(orc.dataCriacao)}`, pageW - margin, 23, { align: "right" });
  doc.text(`Validade: ${orc.validadeDias} dias`, pageW - margin, 27, { align: "right" });

  // Linha de acento sutil
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(margin, 32, pageW - margin, 32);

  let y = 40;

  const sectionTitle = (title: string) => {
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 6;
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
  };

  const kv = (label: string, value: string, x: number, w: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(value || "—", w);
    doc.text(lines, x, y + 3.5);
    return lines.length * 3.6 + 3.5;
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
  y += Math.max(h1, h2);
  if (empresa) {
    const h3 = kv("CNPJ / CPF", empresa.cpfCnpj, margin, colW);
    const h4 = kv("Contato", `${empresa.contato} • ${empresa.telefone}`, margin + colW + 6, colW);
    y += Math.max(h3, h4);
  }
  y += 4;

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
      theme: "plain",
      headStyles: { fillColor: SOFT, textColor: DARK, fontSize: 8, fontStyle: "bold", lineColor: BORDER, lineWidth: 0.1 },
      bodyStyles: { fontSize: 8, textColor: TEXT, lineColor: BORDER, lineWidth: 0.1 },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 2.2 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Subtotal Peças", pageW - margin - 30, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(formatBRL(totalPecas), pageW - margin, y + 4, { align: "right" });
    y += 9;
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
      theme: "plain",
      headStyles: { fillColor: SOFT, textColor: DARK, fontSize: 8, fontStyle: "bold", lineColor: BORDER, lineWidth: 0.1 },
      bodyStyles: { fontSize: 8, textColor: TEXT, lineColor: BORDER, lineWidth: 0.1 },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 2.2 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Subtotal Serviços", pageW - margin - 35, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(formatBRL(totalServ), pageW - margin, y + 4, { align: "right" });
    y += 9;
  }

  if (y > pageH - 90) { doc.addPage(); y = 20; }

  // ===== Dados do Orçamento =====
  sectionTitle("Dados do Orçamento");
  const w3 = (pageW - margin * 2 - 12) / 3;
  const a1 = kv("Responsável", orc.responsavelOrcamentista, margin, w3);
  const a2 = kv("Prazo de Entrega", orc.prazoEntrega || "—", margin + w3 + 6, w3);
  const a3 = kv("Validade", `${orc.validadeDias} dias`, margin + (w3 + 6) * 2, w3);
  y += Math.max(a1, a2, a3);
  const b1 = kv("Frete", orc.frete, margin, w3);
  const b2 = kv("Tipo", orc.tipo, margin + w3 + 6, w3);
  const b3 = kv("Status", orc.status, margin + (w3 + 6) * 2, w3);
  y += Math.max(b1, b2, b3) + 3;

  // ===== Informações Técnicas =====
  if (orc.detalhes) {
    if (y > pageH - 70) { doc.addPage(); y = 20; }
    sectionTitle("Informações Técnicas");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(orc.detalhes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 4;
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

  // ===== Total destaque (limpo, sem fundo vermelho) =====
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("VALOR TOTAL", margin, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ACCENT);
  doc.text(formatBRL(total), pageW - margin, y + 2, { align: "right" });

  // ===== Footer =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = pageH - 16;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, fy - 2, pageW - margin, fy - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const fLines = COMPANY_FOOTER.split("\n");
    fLines.forEach((line, idx) => {
      doc.text(line, pageW / 2, fy + idx * 3, { align: "center" });
    });
    doc.setFontSize(6.5);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`Orcamento-${orc.numero}.pdf`);
}

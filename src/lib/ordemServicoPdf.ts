import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { OrdemServico, Empresa, Equipamento } from "@/contexts/DataContext";
import logoUrl from "@/assets/aci-logo.png";

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const ACCENT: [number, number, number] = [180, 35, 35];
const DARK: [number, number, number] = [45, 55, 72];
const TEXT: [number, number, number] = [60, 70, 85];
const MUTED: [number, number, number] = [130, 138, 150];
const BORDER: [number, number, number] = [225, 228, 232];

const COMPANY_FOOTER =
  "ACI Comércio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica\n" +
  "Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora – MG - CEP 36.080-370\n" +
  "Pabx (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

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

export async function generateOrdemServicoPdf(
  os: OrdemServico,
  empresa?: Empresa,
  equipamento?: Equipamento
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const logo = await loadLogoDataUrl();

  // Header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 32, "F");

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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("ORDEM DE SERVIÇO", pageW - margin, 12, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(`Nº ${os.numero}`, pageW - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(`Emissão: ${formatDate(os.dataCriacao)}`, pageW - margin, 23, { align: "right" });
  doc.text(`Estado: ${os.estado}`, pageW - margin, 27, { align: "right" });

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

  // Cliente
  sectionTitle("Cliente / Solicitante");
  const colW = (pageW - margin * 2 - 6) / 2;
  const h1 = kv("Nome", empresa?.nome ?? os.solicitante, margin, colW);
  const h2 = kv(
    "Cidade / Estado",
    empresa ? `${empresa.cidade} / ${empresa.estado}` : "—",
    margin + colW + 6,
    colW
  );
  y += Math.max(h1, h2);
  if (empresa) {
    const h3 = kv("CNPJ / CPF", empresa.cpfCnpj, margin, colW);
    const h4 = kv(
      "Contato",
      `${empresa.contato || "—"} • ${empresa.telefone || empresa.celular || "—"}`,
      margin + colW + 6,
      colW
    );
    y += Math.max(h3, h4);
  }
  y += 4;

  // Equipamento
  sectionTitle("Equipamento");
  if (equipamento) {
    const w3 = (pageW - margin * 2 - 12) / 3;
    const e1 = kv("Tipo", equipamento.tipo, margin, w3);
    const e2 = kv("Fabricante", equipamento.fabricante, margin + w3 + 6, w3);
    const e3 = kv("Modelo", equipamento.modelo, margin + (w3 + 6) * 2, w3);
    y += Math.max(e1, e2, e3);
    const f1 = kv("Identificação (TAG)", equipamento.tag, margin, w3);
    const f2 = kv("Nº Série", equipamento.serie, margin + w3 + 6, w3);
    const f3 = kv("Patrimônio", equipamento.patrimonio, margin + (w3 + 6) * 2, w3);
    y += Math.max(f1, f2, f3);
    const g1 = kv("Setor", equipamento.setor, margin, colW);
    y += g1;
  } else {
    const e1 = kv("Equipamento", "—", margin, pageW - margin * 2);
    y += e1;
  }
  y += 4;

  // Dados do Serviço
  sectionTitle("Dados do Serviço");
  const w2 = (pageW - margin * 2 - 6) / 2;
  const s1 = kv("Tipo de Serviço", os.tipoServico, margin, w2);
  const s2 = kv("Responsável Técnico", os.responsavelTecnico || "—", margin + w2 + 6, w2);
  y += Math.max(s1, s2);
  const s3 = kv("Origem do Problema", os.origemProblema || "—", margin, pageW - margin * 2);
  y += s3 + 2;

  // Descrição
  if (os.descricaoServico) {
    if (y > pageH - 50) { doc.addPage(); y = 20; }
    sectionTitle("Descrição do Serviço");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(os.descricaoServico, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 4;
  }

  // Acessórios
  if (os.acessorios && os.acessorios.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = 20; }
    sectionTitle("Acessórios");
    autoTable(doc, {
      startY: y,
      head: [["#", "Acessório"]],
      body: os.acessorios.map((a, i) => [String(i + 1), a]),
      theme: "plain",
      headStyles: { fillColor: [247, 248, 250], textColor: DARK, fontSize: 8, fontStyle: "bold", lineColor: BORDER, lineWidth: 0.1 },
      bodyStyles: { fontSize: 8, textColor: TEXT, lineColor: BORDER, lineWidth: 0.1 },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 2.2 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 4;
  }

  // Observações
  if (os.observacoes) {
    if (y > pageH - 50) { doc.addPage(); y = 20; }
    sectionTitle("Observações");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(os.observacoes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 4;
  }

  // Assinaturas
  if (y > pageH - 50) { doc.addPage(); y = 20; }
  y = Math.max(y, pageH - 45);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  const sigW = (pageW - margin * 2 - 10) / 2;
  doc.line(margin, y, margin + sigW, y);
  doc.line(margin + sigW + 10, y, pageW - margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Técnico Responsável", margin + sigW / 2, y + 4, { align: "center" });
  doc.text("Cliente / Solicitante", margin + sigW + 10 + sigW / 2, y + 4, { align: "center" });

  // Footer
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

  doc.save(`OS-${os.numero}.pdf`);
}

import jsPDF from "jspdf";
import { ProtocoloEntrega, Empresa, Equipamento } from "@/contexts/DataContext";
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

const DECLARACAO =
  "Com esta assinatura, declaro que o equipamento me foi entregue na data acima e o mesmo foi testado em minha presença, ou caso não foi testado, assumo a responsabilidade por testá-lo posteriormente.";

const CDC =
  "A Comissão de Defesa do Consumidor, estabelece nas diretrizes do Código de Defesa do Consumidor o prazo de 180 dias para a retirada, pelo proprietário, de equipamentos eletrônicos, máquinas e motores deixados na assistência técnica para conserto. Em caso de não retirada, o prestador de serviço fica autorizado a alienar, doar, reutilizar, desmontar, destruir ou destinar o bem à sucata.";

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

export async function generateProtocoloEntregaPdf(
  pe: ProtocoloEntrega,
  empresa?: Empresa,
  equipamento?: Equipamento
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const logo = await loadLogoDataUrl();

  // Header
  if (logo) {
    try { doc.addImage(logo, "PNG", margin, 8, 38, 18); } catch { /* ignore */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...ACCENT);
    doc.text("ACI", margin, 18);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(`Protocolo de Entrega Nº ${pe.numero}`, pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Data de Entrega: ${formatDate(pe.dataEntrega)}`, pageW - margin, 20, { align: "right" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(margin, 32, pageW - margin, 32);

  let y = 40;

  const sectionTitle = (n: number, title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(`${n} - ${title}`, margin, y);
    y += 2;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const kv = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(label, margin + 4, y);
    const labelW = doc.getTextWidth(label) + 2;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(value || "—", pageW - margin * 2 - labelW - 6);
    doc.text(lines, margin + 4 + labelW, y);
    y += Math.max(5, lines.length * 4.5);
  };

  // 1 - Dados do Solicitante
  sectionTitle(1, "Dados do Solicitante");
  kv("Nome:", empresa?.nome ?? pe.empresa);
  if (empresa) {
    const end = [
      [empresa.rua, empresa.numero].filter(Boolean).join(", "),
      empresa.bairro,
      [empresa.cidade, empresa.estado].filter(Boolean).join("/"),
      empresa.cep ? `CEP ${empresa.cep}` : "",
    ].filter(Boolean).join(" - ");
    kv("Endereço:", end || "—");
  }
  y += 2;

  // 2 - Instrumento/Equipamento
  sectionTitle(2, "Instrumento/Equipamento");
  kv("Tipo:", equipamento?.tipo ?? "—");
  if (equipamento) {
    kv("Modelo:", equipamento.modelo || "—");
    kv("Nº Série:", equipamento.serie || "—");
  }
  y += 2;

  // 3 - Dados Básicos
  sectionTitle(3, "Dados Básicos");
  kv("Entregue por:", pe.entreguePor);
  kv("O equipamento foi testado?:", pe.testado ? "SIM" : "NÃO");
  kv("O equipamento funciona?:", pe.funciona ? "SIM" : "NÃO");
  kv("Ordem de Serviço:", pe.osNumero);
  y += 2;

  // 4 - Observações
  sectionTitle(4, "Observações");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const obs = pe.observacoes?.trim() || "Nenhuma informação adicional foi inserida para essa entrega.";
  const obsLines = doc.splitTextToSize(obs, pageW - margin * 2);
  doc.text(obsLines, margin, y);
  y += obsLines.length * 4.5 + 4;

  // Acessórios
  if (pe.acessorios && pe.acessorios.length > 0) {
    sectionTitle(5, "Acessórios");
    pe.acessorios.forEach((a, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT);
      doc.text(`• ${a}`, margin + 4, y);
      y += 5;
    });
    y += 2;
  }

  // Assinaturas
  let sigY = Math.max(y + 20, pageH - 80);
  if (sigY > pageH - 70) { doc.addPage(); sigY = 40; }
  const sigW = (pageW - margin * 2 - 20) / 2;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + sigW, sigY);
  doc.line(margin + sigW + 20, sigY, pageW - margin, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  doc.text(pe.entreguePor || "Entregue por", margin + sigW / 2, sigY + 4, { align: "center" });
  doc.text(pe.recebidoPor || "Recebido por", margin + sigW + 20 + sigW / 2, sigY + 4, { align: "center" });

  // Declaração
  let dy = sigY + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const decLines = doc.splitTextToSize(DECLARACAO, pageW - margin * 2);
  doc.text(decLines, pageW / 2, dy, { align: "center" });
  dy += decLines.length * 4 + 4;

  // CDC box
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  const cdcLines = doc.splitTextToSize(CDC, pageW - margin * 2 - 6);
  const boxH = cdcLines.length * 3.8 + 6;
  doc.rect(margin, dy, pageW - margin * 2, boxH);
  doc.text(cdcLines, margin + 3, dy + 4);

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
    COMPANY_FOOTER.split("\n").forEach((line, idx) => {
      doc.text(line, pageW / 2, fy + idx * 3, { align: "center" });
    });
    doc.setFontSize(6.5);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`Protocolo-Entrega-${pe.numero}.pdf`);
}

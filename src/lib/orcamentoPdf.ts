import jsPDF from "jspdf";
import { Orcamento, Empresa } from "@/contexts/DataContext";

const COMPANY_FOOTER = [
  "Assistência Técnica Hospitalar e Engenharia Clínica",
  "Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora – MG - CEP 36.080-370",
  "Pabx: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37",
];

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const generateOrcamentoPDF = (orc: Orcamento, empresa?: Empresa) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(10);
    doc.setFillColor(185, 28, 28);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const kv = (label: string, value: string, colWidth = (pageWidth - margin * 2) / 2) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const text = doc.splitTextToSize(value || "—", colWidth - 30);
    doc.text(text, margin + 35, y);
    y += text.length * 4 + 2;
  };

  const longText = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label}:`, margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const text = doc.splitTextToSize(value || "—", pageWidth - margin * 2);
    ensureSpace(text.length * 4 + 2);
    doc.text(text, margin, y);
    y += text.length * 4 + 3;
  };

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(185, 28, 28);
  doc.text("ORÇAMENTO", pageWidth / 2, y + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(orc.numero, pageWidth / 2, y + 9, { align: "center" });
  y += 16;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Cliente
  sectionTitle("CLIENTE / SOLICITANTE");
  if (empresa) {
    kv("Razão Social", empresa.nome);
    kv("Nome Fantasia", empresa.nomeFantasia);
    kv("CPF/CNPJ", empresa.cpfCnpj);
    kv("Endereço", `${empresa.rua}, ${empresa.numero} ${empresa.complemento || ""} - ${empresa.bairro}`);
    kv("Cidade/UF", `${empresa.cidade} - ${empresa.estado} | CEP: ${empresa.cep}`);
    kv("Contato", `${empresa.contato} - ${empresa.celular || empresa.telefone}`);
    kv("E-mail", empresa.email);
  } else {
    kv("Solicitante", orc.solicitante);
  }

  // Dados gerais
  sectionTitle("DADOS GERAIS DO ORÇAMENTO");
  kv("Número", orc.numero);
  kv("Data de Criação", formatDate(orc.dataCriacao));
  kv("Tipo", orc.tipo);
  kv("Status", orc.status);
  kv("Validade da Proposta", `${orc.validadeDias} dias`);
  kv("Prazo de Entrega", orc.prazoEntrega || "A combinar");
  kv("Frete", orc.frete);
  kv("Responsável", orc.responsavelOrcamentista);

  // Serviços
  if (orc.servicos.length > 0) {
    sectionTitle("DESCRITIVO DE SERVIÇOS");
    const headers = ["Serviço", "Equipamento", "Qtd", "Valor Unit.", "Garantia", "Subtotal"];
    const colW = [55, 45, 12, 25, 18, 25];
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 6, "F");
    headers.forEach((h, i) => { doc.text(h, x + 1, y + 4); x += colW[i]; });
    y += 6;
    doc.setFont("helvetica", "normal");
    orc.servicos.forEach((s) => {
      ensureSpace(6);
      x = margin;
      const subtotal = s.quantidade * s.valorUnitario;
      const row = [s.tipoServico, s.tipoEquipamento, String(s.quantidade), formatBRL(s.valorUnitario), `${s.garantiaDias}d`, formatBRL(subtotal)];
      row.forEach((c, i) => {
        const txt = doc.splitTextToSize(c, colW[i] - 2);
        doc.text(txt, x + 1, y + 4);
        x += colW[i];
      });
      y += 6;
    });
  }

  // Peças
  if (orc.pecas.length > 0) {
    sectionTitle("DESCRITIVO DE PEÇAS");
    const headers = ["Peça", "Qtd", "Valor Unit.", "Garantia", "Subtotal"];
    const colW = [80, 20, 30, 25, 25];
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 6, "F");
    headers.forEach((h, i) => { doc.text(h, x + 1, y + 4); x += colW[i]; });
    y += 6;
    doc.setFont("helvetica", "normal");
    orc.pecas.forEach((p) => {
      ensureSpace(6);
      x = margin;
      const subtotal = p.quantidade * p.valorUnitario;
      const row = [p.peca, String(p.quantidade), formatBRL(p.valorUnitario), `${p.garantiaDias}d`, formatBRL(subtotal)];
      row.forEach((c, i) => {
        const txt = doc.splitTextToSize(c, colW[i] - 2);
        doc.text(txt, x + 1, y + 4);
        x += colW[i];
      });
      y += 6;
    });
  }

  // Informações Técnicas
  sectionTitle("INFORMAÇÕES TÉCNICAS");
  longText("Detalhes / Descritivo Técnico", orc.detalhes);

  // Pagamento
  const totalPecas = orc.pecas.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const totalServicos = orc.servicos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const total = totalPecas + totalServicos;
  let valorParcela = total;
  if (orc.modoPagamento === "Parcelado" && orc.numeroParcelas > 0) valorParcela = total / orc.numeroParcelas;
  if (orc.modoPagamento === "Entrada + Parcela" && orc.numeroParcelas > 0) {
    valorParcela = Math.max(total - orc.valorEntrada, 0) / orc.numeroParcelas;
  }

  sectionTitle("CONDIÇÕES DE PAGAMENTO");
  if (totalServicos > 0) kv("Total Serviços", formatBRL(totalServicos));
  if (totalPecas > 0) kv("Total Peças", formatBRL(totalPecas));
  kv("Forma de Pagamento", orc.formaPagamento);
  kv("Modo", orc.modoPagamento);
  if (orc.modoPagamento === "Entrada + Parcela") kv("Entrada", formatBRL(orc.valorEntrada));
  if (orc.modoPagamento !== "À vista") {
    kv("Parcelas", `${orc.numeroParcelas}x de ${formatBRL(valorParcela)}`);
  }

  ensureSpace(12);
  doc.setFillColor(185, 28, 28);
  doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`VALOR TOTAL: ${formatBRL(total)}`, pageWidth - margin - 2, y + 7, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = pageHeight - 20;
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(0.5);
    doc.line(margin, fy, pageWidth - margin, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    COMPANY_FOOTER.forEach((line, idx) => {
      doc.text(line, pageWidth / 2, fy + 4 + idx * 3.5, { align: "center" });
    });
    doc.setFontSize(7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  doc.save(`Orcamento_${orc.numero}.pdf`);
};

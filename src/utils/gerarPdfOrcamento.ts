import aciLogo from "@/assets/aci-logo-hd.png";
import { assinaturasService } from "@/services/assinaturasService";
import type { OrcamentoSupabase } from "@/services/orcamentosService";
import {
  buildOrcamentoHtml,
  ORCAMENTO_FOOTER_TEXT,
} from "@/utils/orcamentoPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";

const sanitizeFileNameSegment = (value?: string | number | null) =>
  String(value || "")
    .trim()
    .split("")
    .map((char) =>
      char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? " " : char
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const getNomeArquivoOrcamento = (orcamento: OrcamentoSupabase) => {
  const numero = sanitizeFileNameSegment(orcamento.numero) || "sem numero";
  const solicitante =
    sanitizeFileNameSegment(
      orcamento.empresa?.nome || orcamento.empresa?.nome_fantasia
    ) || "Solicitante nao informado";
  const identificacao =
    sanitizeFileNameSegment(orcamento.identificador) || "Sem identificacao";

  return `Nº ${numero} - ${solicitante} - ${identificacao}.pdf`;
};

export const gerarPdfOrcamento = async (orcamento: OrcamentoSupabase) => {
  const [logoBase64, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo, {
      maxWidth: 560,
      maxHeight: 220,
      type: "image/jpeg",
      quality: 0.9,
    }),
    assinaturasService.resolverDocumento({
      tecnicoNome: orcamento.responsavel_orcamentista,
      responsavelNome: orcamento.responsavel_orcamentista,
      solicitanteNome: orcamento.aprovado_por || orcamento.empresa?.contato,
      empresaId: orcamento.empresa_id,
    }),
  ]);
  const html = buildOrcamentoHtml(orcamento, logoBase64, assinaturas);
  const fileName = getNomeArquivoOrcamento(orcamento);

  const printToPdfResult = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    footerText: ORCAMENTO_FOOTER_TEXT,
  });

  if (!printToPdfResult) {
    throw new Error(
      "Nao foi possivel gerar o PDF vetorial do orcamento. Verifique o servico de PDF e tente novamente."
    );
  }
};

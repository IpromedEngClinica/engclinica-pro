import aciLogo from "@/assets/aci-logo-hd.png";
import { assinaturasService } from "@/services/assinaturasService";
import type { OrcamentoSupabase } from "@/services/orcamentosService";
import { buildOrcamentoHtml } from "@/utils/orcamentoPdfTemplate";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";

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
      orcamento.empresa?.nome_fantasia || orcamento.empresa?.nome
    ) || "Solicitante nao informado";
  const identificacao =
    sanitizeFileNameSegment(orcamento.identificador) || "Sem identificacao";

  return `Nº ${numero} - ${solicitante} - ${identificacao}.pdf`;
};

export const gerarPdfOrcamento = async (orcamento: OrcamentoSupabase) => {
  const [logoBase64, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoNome: orcamento.responsavel_orcamentista,
      responsavelNome: orcamento.responsavel_orcamentista,
      solicitanteNome: orcamento.aprovado_por || orcamento.empresa?.contato,
      empresaId: orcamento.empresa_id,
    }),
  ]);
  const html = buildOrcamentoHtml(orcamento, logoBase64, assinaturas);

  await renderHtmlToPdf({
    html,
    fileName: getNomeArquivoOrcamento(orcamento),
  });
};

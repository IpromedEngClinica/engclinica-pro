import aciLogo from "@/assets/aci-logo-hd.png";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";
import {
  buildOrdemServicoHtml,
  ORDEM_SERVICO_FOOTER_TEXT,
} from "@/utils/osPdfTemplate";
import { assinaturasService } from "@/services/assinaturasService";
import { buildPdfFileName } from "@/utils/pdfFileNames";

const getNomeArquivoOrdemServico = (os: OrdemServicoSupabase) => {
  const cliente =
    os.empresa?.nome || os.empresa?.nome_fantasia || os.solicitante_texto;
  const equipamento =
    os.equipamento?.tipo_equipamento?.nome ||
    os.equipamento?.tipo_texto ||
    os.equipamento?.modelo;

  return buildPdfFileName("OS", [
    { value: os.numero, fallback: "sem-numero" },
    { value: cliente, fallback: "cliente" },
    { value: equipamento, fallback: "equipamento" },
    { value: os.equipamento?.numero_serie, fallback: "sem-ns" },
  ]);
};

export const gerarPdfOrdemServico = async (
  os: OrdemServicoSupabase,
  save = true
) => {
  const [logoBase64, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo, {
      maxWidth: 560,
      maxHeight: 220,
      type: "image/jpeg",
      quality: 0.9,
    }),
    assinaturasService.resolverDocumento({
      tecnicoUsuarioId: os.tecnico_responsavel_id,
      tecnicoNome: os.responsavel_texto,
      responsavelNome: os.responsavel_texto,
      solicitanteNome: os.solicitante_texto,
      empresaId: os.empresa_id,
    }),
  ]);
  const html = buildOrdemServicoHtml(os, logoBase64, assinaturas);
  const fileName = getNomeArquivoOrdemServico(os);

  const printToPdfResult = await renderHtmlToPdfWithPrintToPdf({
    html,
    fileName,
    save,
    footerText: ORDEM_SERVICO_FOOTER_TEXT,
  });

  if (printToPdfResult) return printToPdfResult;

  return renderHtmlToPdf({
    html,
    fileName,
    save,
    footerText: ORDEM_SERVICO_FOOTER_TEXT,
    footerHeightMm: 16,
  });
};

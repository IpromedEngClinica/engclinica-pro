import { PDFDocument } from "pdf-lib";

export type PdfAnexoPlano = {
  nome: string;
  bytes: Blob | ArrayBuffer | Uint8Array;
};

export type MesclarPdfsPlanoInput = {
  relatorioPrincipalBytes: Blob | ArrayBuffer | Uint8Array;
  osPreventivas?: PdfAnexoPlano[];
  osCorretivas?: PdfAnexoPlano[];
  certificadosCalibracao?: PdfAnexoPlano[];
  certificadosSegurancaEletrica?: PdfAnexoPlano[];
};

const toUint8Array = async (input: Blob | ArrayBuffer | Uint8Array) => {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
};

const copiarPaginas = async (
  destino: PDFDocument,
  origemBytes: Blob | ArrayBuffer | Uint8Array
) => {
  const origem = await PDFDocument.load(await toUint8Array(origemBytes));
  const paginas = await destino.copyPages(origem, origem.getPageIndices());
  paginas.forEach((pagina) => destino.addPage(pagina));
};

export async function mesclarPdfsPlano({
  relatorioPrincipalBytes,
  osPreventivas = [],
  osCorretivas = [],
  certificadosCalibracao = [],
  certificadosSegurancaEletrica = [],
}: MesclarPdfsPlanoInput): Promise<Uint8Array> {
  const destino = await PDFDocument.create();

  await copiarPaginas(destino, relatorioPrincipalBytes);

  for (const grupo of [
    osPreventivas,
    osCorretivas,
    certificadosCalibracao,
    certificadosSegurancaEletrica,
  ]) {
    for (const anexo of grupo) {
      await copiarPaginas(destino, anexo.bytes);
    }
  }

  return destino.save();
}

export const baixarPdfMesclado = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

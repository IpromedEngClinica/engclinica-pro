type PdfFileNamePart = string | number | null | undefined;

export const sanitizePdfFileNamePart = (
  value: PdfFileNamePart,
  fallback: string
) => {
  const sanitized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || fallback;
};

export const buildPdfFileName = (
  prefix: string,
  parts: Array<{ value: PdfFileNamePart; fallback: string }>
) => {
  const normalizedPrefix = sanitizePdfFileNamePart(prefix, "documento");
  const normalizedParts = parts.map((part) =>
    sanitizePdfFileNamePart(part.value, part.fallback)
  );

  return `${normalizedPrefix} - ${normalizedParts.join("-")}.pdf`;
};

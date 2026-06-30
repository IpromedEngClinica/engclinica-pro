import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type RenderHtmlPdfOptions = {
  html: string;
  fileName: string;
  selector?: string;
  save?: boolean;
  orientation?: "p" | "l";
  marginMm?: number;
  scale?: number;
  fontScale?: number;
  footerText?: string;
  footerHeightMm?: number;
  footerFontSizePt?: number;
};

type AvoidBlock = {
  top: number;
  bottom: number;
};

const DOCUMENT_WIDTH_PX = 1123;
const DOCUMENT_HEIGHT_PX = 1588;
const DEFAULT_MARGIN_MM = 8;
// 2.5 renders A4 above 300 DPI while avoiding the memory cost of scale 3.
const DEFAULT_SCALE = 2.5;
const DEFAULT_FONT_SCALE = 1.5;
const DEFAULT_FOOTER_HEIGHT_MM = 15;
const DEFAULT_FOOTER_FONT_SIZE_PT = 10.4;
const MIN_SLICE_RATIO = 0.58;
const PAGE_BREAK_GAP_PX = 16;
const PAGE_BREAK_GAP_CSS_PX = 18;
const MIN_TRAILING_SLICE_PX = 24;
const PAGE_BREAK_SPACER_CLASS = "pdf-page-break-spacer";
const FOOTER_SPACER_CLASS = "pdf-footer-bottom-spacer";

const PAGE_BREAK_SELECTOR = [
  "header",
  "footer",
  "section",
  "article",
  "table",
  "thead",
  "tbody",
  "tr",
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  ".section",
  ".card",
  ".grid",
  ".row",
  ".document-header",
  ".document-section",
  ".signature",
  ".signatures",
  ".summary",
  ".equipment-block",
  ".client-block",
  ".clause",
  ".notice",
  ".date-line",
  ".signature-line",
  ".result-block",
].join(",");

const PAGE_BREAK_LAYOUT_SELECTOR = [
  "table",
  "tr",
  "h2",
  "h3",
  ".result-block",
  ".clause",
  ".notice",
  ".date-line",
  ".signatures",
  ".signature-line",
].join(",");

const RENDER_QUALITY_CSS = `
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  table {
    border-collapse: collapse;
  }

  thead,
  tbody,
  tr,
  th,
  td,
  table,
  section,
  article,
  header,
  footer,
  h1,
  h2,
  h3,
  h4,
  p,
  .section,
  .card,
  .grid,
  .row,
  .document-header,
  .document-section,
  .signature,
  .signatures,
  .summary,
  .equipment-block,
  .client-block,
  .clause,
  .notice,
  .date-line,
  .signature-line {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .result-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

const waitForAssets = async (root: HTMLElement) => {
  const rootDocument = root.ownerDocument;
  const rootWindow = rootDocument.defaultView ?? window;

  if (rootDocument.fonts?.ready) {
    await rootDocument.fonts.ready;
  }

  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  await new Promise((resolve) => rootWindow.requestAnimationFrame(resolve));
  await new Promise((resolve) => rootWindow.setTimeout(resolve, 180));
};

const getPageSize = (pdf: jsPDF) => ({
  width: pdf.internal.pageSize.getWidth(),
  height: pdf.internal.pageSize.getHeight(),
});

const drawFixedFooter = ({
  footerText,
  footerFontSizePt,
  marginMm,
  pageHeightMm,
  pageWidthMm,
  pdf,
}: {
  footerText: string;
  footerFontSizePt: number;
  marginMm: number;
  pageHeightMm: number;
  pageWidthMm: number;
  pdf: jsPDF;
}) => {
  const maxWidth = pageWidthMm - marginMm * 2;
  const lineY = pageHeightMm - 18;
  const textY = pageHeightMm - 13;

  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.2);
  pdf.line(marginMm, lineY, pageWidthMm - marginMm, lineY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(footerFontSizePt);
  pdf.setTextColor(156, 163, 175);

  const lines = pdf.splitTextToSize(footerText, maxWidth);
  pdf.text(lines.slice(0, 2), pageWidthMm / 2, textY, {
    align: "center",
    lineHeightFactor: 1.2,
    maxWidth,
  });
};

const insertPageBreakSpacers = (element: HTMLElement, pageHeightPx: number) => {
  Array.from(element.querySelectorAll(`.${PAGE_BREAK_SPACER_CLASS}`)).forEach(
    (spacer) => spacer.remove()
  );

  const maxIterations = 80;

  for (let index = 0; index < maxIterations; index += 1) {
    const rootRect = element.getBoundingClientRect();
    const blocks = Array.from(
      element.querySelectorAll<HTMLElement>(PAGE_BREAK_LAYOUT_SELECTOR)
    )
      .filter((block) => !block.classList.contains(PAGE_BREAK_SPACER_CLASS))
      .map((block) => {
        const rect = block.getBoundingClientRect();
        const top = rect.top - rootRect.top;
        const bottom = rect.bottom - rootRect.top;
        return {
          block,
          top,
          bottom,
          height: bottom - top,
        };
      })
      .filter(
        ({ top, bottom, height }) =>
          bottom > top &&
          height > 12 &&
          height < pageHeightPx * 0.82 &&
          Math.floor(Math.max(0, top) / pageHeightPx) <
            Math.floor(Math.max(0, bottom - 1) / pageHeightPx)
      )
      .sort((a, b) => a.top - b.top);

    const target = blocks.find(({ top }) => top % pageHeightPx > 24);

    if (!target) return;

    const nextPageTop = (Math.floor(target.top / pageHeightPx) + 1) * pageHeightPx;
    const spacerHeight = Math.ceil(nextPageTop - target.top + PAGE_BREAK_GAP_CSS_PX);

    if (spacerHeight <= 0 || spacerHeight > pageHeightPx * 0.95) return;

    const spacer = element.ownerDocument.createElement("div");
    spacer.className = PAGE_BREAK_SPACER_CLASS;
    spacer.style.height = `${spacerHeight}px`;
    spacer.style.breakInside = "avoid";
    spacer.style.pageBreakInside = "avoid";
    spacer.style.flexShrink = "0";
    spacer.setAttribute("aria-hidden", "true");

    target.block.parentNode?.insertBefore(spacer, target.block);
    spacer.getBoundingClientRect();
  }
};

const alignFooterToPageBottom = (element: HTMLElement, pageHeightPx: number) => {
  element.querySelector(`.${FOOTER_SPACER_CLASS}`)?.remove();

  const footer = element.querySelector<HTMLElement>("footer");
  if (!footer) return;

  const rootRect = element.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const footerBottom = footerRect.bottom - rootRect.top;
  const footerRemainder = footerBottom % pageHeightPx;

  if (footerRemainder < 8 || pageHeightPx - footerRemainder < 8) return;

  const spacerHeight = Math.floor(pageHeightPx - footerRemainder - 2);
  const maxFooterAdjustment = pageHeightPx * 0.14;

  if (spacerHeight <= 0 || spacerHeight > maxFooterAdjustment) return;

  const spacer = element.ownerDocument.createElement("div");
  spacer.className = FOOTER_SPACER_CLASS;
  spacer.style.height = `${spacerHeight}px`;
  spacer.style.flexShrink = "0";
  spacer.setAttribute("aria-hidden", "true");

  footer.parentNode?.insertBefore(spacer, footer);
};

const collectAvoidBlocks = (element: HTMLElement, canvasScale: number) => {
  const rootRect = element.getBoundingClientRect();
  const maxHeight = element.scrollHeight * canvasScale;

  return Array.from(element.querySelectorAll(PAGE_BREAK_SELECTOR))
    .map((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return {
        top: Math.max(0, (rect.top - rootRect.top) * canvasScale),
        bottom: Math.min(maxHeight, (rect.bottom - rootRect.top) * canvasScale),
      };
    })
    .filter((block) => block.bottom - block.top > 6 * canvasScale)
    .sort((a, b) => a.top - b.top);
};

const chooseSliceHeight = ({
  avoidBlocks,
  canvasHeight,
  pageHeightPx,
  renderedHeight,
}: {
  avoidBlocks: AvoidBlock[];
  canvasHeight: number;
  pageHeightPx: number;
  renderedHeight: number;
}) => {
  const remainingHeight = canvasHeight - renderedHeight;

  if (remainingHeight <= pageHeightPx) {
    return remainingHeight;
  }

  const nominalHeight = Math.min(pageHeightPx, remainingHeight);
  const targetBottom = renderedHeight + nominalHeight;
  const minimumBottom = renderedHeight + pageHeightPx * MIN_SLICE_RATIO;
  const gap = PAGE_BREAK_GAP_PX;

  const cuttingBlock = avoidBlocks.find(
    (block) =>
      block.top < targetBottom &&
      block.bottom > targetBottom &&
      block.top > minimumBottom
  );

  if (cuttingBlock) {
    return Math.max(1, Math.floor(cuttingBlock.top - renderedHeight - gap));
  }

  const candidate = [...avoidBlocks]
    .reverse()
    .find(
      (block) =>
        block.bottom < targetBottom - gap &&
        block.bottom > minimumBottom &&
        targetBottom - block.bottom < pageHeightPx * 0.28
    );

  if (candidate) {
    return Math.max(1, Math.floor(candidate.bottom - renderedHeight + gap));
  }

  return nominalHeight;
};

const resolveRenderScale = (
  requestedScale: number,
  elementHeight: number,
  documentHeight: number
) => {
  const estimatedPages = Math.max(1, elementHeight / documentHeight);
  const safeScale = Math.max(2, requestedScale);

  if (estimatedPages > 8) {
    return Math.min(safeScale, 2);
  }

  if (estimatedPages > 4) {
    return Math.min(safeScale, 2.5);
  }

  return safeScale;
};

const canvasHasVisibleContent = (canvas: HTMLCanvasElement) => {
  const probe = document.createElement("canvas");
  probe.width = 240;
  probe.height = Math.max(1, Math.round((canvas.height / canvas.width) * 240));
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return true;

  context.drawImage(canvas, 0, 0, probe.width, probe.height);
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data;

  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index + 3] > 8 &&
      (pixels[index] < 252 || pixels[index + 1] < 252 || pixels[index + 2] < 252)
    ) {
      return true;
    }
  }

  return false;
};

const buildFrameHtml = (html: string) => {
  if (/<html[\s>]/i.test(html)) {
    return html;
  }

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
};

const getDocumentDimensions = (orientation: "p" | "l") =>
  orientation === "l"
    ? { width: DOCUMENT_HEIGHT_PX, height: DOCUMENT_WIDTH_PX }
    : { width: DOCUMENT_WIDTH_PX, height: DOCUMENT_HEIGHT_PX };

const applyFontScale = (root: HTMLElement, fontScale: number) => {
  if (fontScale === 1) return;

  const rootWindow = root.ownerDocument.defaultView ?? window;
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  const styles = elements.map((element) => {
    const computed = rootWindow.getComputedStyle(element);
    const fontSize = Number.parseFloat(computed.fontSize);
    const lineHeight = Number.parseFloat(computed.lineHeight);

    return {
      element,
      fontSize: Number.isFinite(fontSize) ? fontSize : null,
      lineHeight: Number.isFinite(lineHeight) ? lineHeight : null,
    };
  });

  styles.forEach(({ element, fontSize, lineHeight }) => {
    if (fontSize) element.style.fontSize = `${fontSize * fontScale}px`;
    if (lineHeight) element.style.lineHeight = `${lineHeight * fontScale}px`;
  });
};

const createRenderFrame = (html: string, orientation: "p" | "l") => {
  const frame = document.createElement("iframe");
  const dimensions = getDocumentDimensions(orientation);

  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.position = "fixed";
  frame.style.left = "0";
  frame.style.top = "0";
  frame.style.width = `${dimensions.width}px`;
  frame.style.height = `${dimensions.height}px`;
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.transform = "translateX(-200vw)";
  frame.style.zIndex = "-1";

  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;

  if (!frameDocument) {
    document.body.removeChild(frame);
    throw new Error("Nao foi possivel preparar o ambiente do PDF.");
  }

  frameDocument.open();
  frameDocument.write(buildFrameHtml(html));
  frameDocument.close();

  const qualityStyle = frameDocument.createElement("style");
  qualityStyle.textContent = RENDER_QUALITY_CSS;
  (frameDocument.head || frameDocument.documentElement).appendChild(qualityStyle);

  return { frame, frameDocument };
};

export const renderHtmlToPdf = async ({
  html,
  fileName,
  selector = ".document",
  save = true,
  orientation = "p",
  marginMm = DEFAULT_MARGIN_MM,
  scale = DEFAULT_SCALE,
  fontScale = DEFAULT_FONT_SCALE,
  footerText,
  footerHeightMm = DEFAULT_FOOTER_HEIGHT_MM,
  footerFontSizePt = DEFAULT_FOOTER_FONT_SIZE_PT,
}: RenderHtmlPdfOptions) => {
  const { frame, frameDocument } = createRenderFrame(html, orientation);

  try {
    const element = frameDocument.querySelector(selector) as HTMLElement | null;

    if (!element) {
      throw new Error("Elemento do PDF nao encontrado.");
    }

    await waitForAssets(element);
    applyFontScale(element, fontScale);
    await new Promise((resolve) =>
      (frameDocument.defaultView ?? window).requestAnimationFrame(resolve)
    );

    // HTML + html2canvas rasterizes the PDF. For selectable text, move this
    // generation to backend Playwright/Puppeteer or a Supabase Edge Function.
    const dimensions = getDocumentDimensions(orientation);
    const pdf = new jsPDF(orientation, "mm", "a4");
    const { width: pageWidthMm, height: pageHeightMm } = getPageSize(pdf);
    const elementWidth = Math.ceil(
      Math.max(element.scrollWidth, element.offsetWidth, dimensions.width)
    );
    const contentWidthMm = pageWidthMm - marginMm * 2;
    const contentHeightMm =
      pageHeightMm - marginMm * 2 - (footerText ? footerHeightMm : 0);
    const cssPxPerMm = elementWidth / contentWidthMm;
    const pageHeightCssPx = Math.floor(contentHeightMm * cssPxPerMm);

    insertPageBreakSpacers(element, pageHeightCssPx);
    if (!footerText) alignFooterToPageBottom(element, pageHeightCssPx);
    await new Promise((resolve) =>
      (frameDocument.defaultView ?? window).requestAnimationFrame(resolve)
    );

    const elementHeight = Math.ceil(
      Math.max(element.scrollHeight, element.offsetHeight, dimensions.height)
    );
    const renderScale = resolveRenderScale(scale, elementHeight, dimensions.height);

    frame.style.width = `${elementWidth}px`;
    frame.style.height = `${elementHeight}px`;

    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      removeContainer: false,
      width: elementWidth,
      height: elementHeight,
      windowWidth: elementWidth,
      windowHeight: elementHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pxPerMm = canvas.width / contentWidthMm;
    const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);
    const canvasScale = canvas.height / elementHeight;
    const avoidBlocks = collectAvoidBlocks(element, canvasScale);

    pdf.setProperties({
      title: fileName.replace(/\.pdf$/i, ""),
    });

    let pageIndex = 0;
    let renderedHeight = 0;

    while (renderedHeight < canvas.height) {
      if (canvas.height - renderedHeight <= MIN_TRAILING_SLICE_PX) {
        break;
      }

      const sliceHeight = Math.max(
        1,
        Math.floor(
          chooseSliceHeight({
            avoidBlocks,
            canvasHeight: canvas.height,
            pageHeightPx,
            renderedHeight,
          })
        )
      );
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext("2d");

      if (!ctx) {
        throw new Error("Nao foi possivel gerar o canvas do PDF.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (canvasHasVisibleContent(pageCanvas)) {
        const pageImgData = pageCanvas.toDataURL("image/png");

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          pageImgData,
          "PNG",
          marginMm,
          marginMm,
          contentWidthMm,
          sliceHeight / pxPerMm,
          undefined,
          "FAST"
        );

        pageIndex += 1;
      }

      renderedHeight += sliceHeight;
    }

    const totalPages = pdf.getNumberOfPages();
    for (let index = 1; index <= totalPages; index += 1) {
      pdf.setPage(index);
      if (footerText) {
        drawFixedFooter({
          footerText,
          footerFontSizePt,
          marginMm,
          pageHeightMm,
          pageWidthMm,
          pdf,
        });
      }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Página ${index} de ${totalPages}`, pageWidthMm - marginMm, pageHeightMm - 3, {
        align: "right",
      });
    }

    if (save) pdf.save(fileName);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(frame);
  }
};

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
const MIN_SLICE_RATIO = 0.58;
const PAGE_BREAK_GAP_PX = 16;

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
  .client-block {
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
    const elementWidth = Math.ceil(
      Math.max(element.scrollWidth, element.offsetWidth, dimensions.width)
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

    const pdf = new jsPDF(orientation, "mm", "a4");
    const { width: pageWidthMm, height: pageHeightMm } = getPageSize(pdf);
    const contentWidthMm = pageWidthMm - marginMm * 2;
    const contentHeightMm = pageHeightMm - marginMm * 2;
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
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Pagina ${index} de ${totalPages}`, pageWidthMm - marginMm, pageHeightMm - 3, {
        align: "right",
      });
    }

    if (save) pdf.save(fileName);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(frame);
  }
};

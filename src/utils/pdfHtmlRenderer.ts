import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type RenderHtmlPdfOptions = {
  html: string;
  fileName: string;
  selector?: string;
};

const waitForAssets = async (root: HTMLElement) => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
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

  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 180));
};

export const renderHtmlToPdf = async ({
  html,
  fileName,
  selector = ".document",
}: RenderHtmlPdfOptions) => {
  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "1123px";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-1";
  wrapper.style.opacity = "1";
  wrapper.style.pointerEvents = "none";
  wrapper.innerHTML = html;

  document.body.appendChild(wrapper);

  try {
    const element = wrapper.querySelector(selector) as HTMLElement | null;

    if (!element) {
      throw new Error("Elemento do PDF nao encontrado.");
    }

    await waitForAssets(element);

    // HTML + html2canvas rasterizes the PDF. For selectable text, move this
    // generation to backend Playwright/Puppeteer or a Supabase Edge Function.
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      removeContainer: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 8;
    const contentWidthMm = pageWidthMm - marginMm * 2;
    const contentHeightMm = pageHeightMm - marginMm * 2;
    const pxPerMm = canvas.width / contentWidthMm;
    const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);

    let pageIndex = 0;
    let renderedHeight = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
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

      const pageImgData = pageCanvas.toDataURL("image/png", 1.0);

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

      renderedHeight += sliceHeight;
      pageIndex += 1;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(wrapper);
  }
};

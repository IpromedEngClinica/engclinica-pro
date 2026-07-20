import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

const MAX_PDF_PAYLOAD_BYTES = 4 * 1024 * 1024;

type PdfRenderPayload = {
  html?: string;
  fileName?: string;
  orientation?: "p" | "l";
  footerText?: string;
  footerFontSizePx?: number;
  marginBottomMm?: number;
};

let browserPromise: Promise<Browser> | null = null;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildPdfPrintOverrides = ({
  bottomMarginMm,
  footerEnabled,
  landscape,
}: {
  bottomMarginMm?: number;
  footerEnabled: boolean;
  landscape: boolean;
}) => `
  @page {
    size: ${landscape ? "A4 landscape" : "A4 portrait"};
    margin: 10mm 11mm ${bottomMarginMm ?? (footerEnabled ? 14 : 9)}mm 11mm;
  }

  html,
  body {
    width: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .document {
    width: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  section,
  article,
  table,
  thead,
  tr,
  .section,
  .panel,
  .signatures {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

const buildFooterTemplate = (footerText?: string, footerFontSizePx = 9.1) => {
  if (!footerText) return "<div></div>";

  return `
    <div style="
      width: 100%;
      padding: 0 10mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${footerFontSizePx}px;
      line-height: 1.25;
      color: #8b93a1;
    ">
      <div style="
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: start;
        border-top: 1px solid #d1d5db;
        padding-top: 5px;
      ">
        <div style="text-align: center; padding-left: 18mm;">
          ${escapeHtml(footerText)}
        </div>
        <div style="white-space: nowrap; color: #6b7280;">
          Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      </div>
    </div>
  `;
};

const getBrowser = () => {
  if (!browserPromise) {
    chromium.setGraphicsMode = false;
    browserPromise = chromium.executablePath().then((executablePath) =>
      puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: "shell",
      })
    );
  }

  return browserPromise.catch((error) => {
    browserPromise = null;
    throw error;
  });
};

const isAuthenticated = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!authorization || !supabaseUrl || !supabaseAnonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authorization,
    },
  });

  return response.ok;
};

const jsonResponse = (status: number, error: string) =>
  Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return jsonResponse(401, "Sessao invalida ou expirada.");
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > MAX_PDF_PAYLOAD_BYTES) {
    return jsonResponse(413, "Conteudo do PDF excedeu o limite permitido.");
  }

  let payload: PdfRenderPayload;

  try {
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_PDF_PAYLOAD_BYTES) {
      return jsonResponse(413, "Conteudo do PDF excedeu o limite permitido.");
    }

    payload = JSON.parse(rawBody) as PdfRenderPayload;
  } catch {
    return jsonResponse(400, "Conteudo JSON invalido.");
  }

  if (!payload.html) {
    return jsonResponse(400, "HTML do PDF nao informado.");
  }

  const landscape = payload.orientation === "l";
  const footerEnabled = Boolean(payload.footerText);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: landscape ? 1588 : 1123,
      height: landscape ? 1123 : 1588,
      deviceScaleFactor: 1,
    });
    await page.setContent(payload.html, {
      waitUntil: "load",
      timeout: 30_000,
    });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 });
    await page.emulateMediaType("print");
    await page.addStyleTag({
      content: buildPdfPrintOverrides({
        bottomMarginMm: payload.marginBottomMm,
        footerEnabled,
        landscape,
      }),
    });

    const pdf = await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: footerEnabled,
      headerTemplate: "<div></div>",
      footerTemplate: buildFooterTemplate(
        payload.footerText,
        payload.footerFontSizePx
      ),
      timeout: 45_000,
    });

    const fileName = (payload.fileName || "documento.pdf").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse(
      500,
      error instanceof Error
        ? error.message
        : "Erro ao renderizar PDF com Chromium."
    );
  } finally {
    await page.close();
  }
}

export function GET() {
  return jsonResponse(405, "Metodo nao permitido.");
}

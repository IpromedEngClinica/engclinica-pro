import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const PDF_RENDER_ENDPOINT = "/api/pdf/render";
const MAX_PDF_PAYLOAD_BYTES = 18 * 1024 * 1024;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const readRequestBody = (request: NodeJS.ReadableStream) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;

      if (size > MAX_PDF_PAYLOAD_BYTES) {
        reject(new Error("Payload do PDF excedeu o limite permitido."));
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

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

const pdfRenderPlugin = (): Plugin => {
  let browserPromise: Promise<unknown> | null = null;

  const getBrowser = async () => {
    if (!browserPromise) {
      browserPromise = import("playwright").then(({ chromium }) =>
        chromium.launch({ headless: true })
      );
    }

    try {
      return (await browserPromise) as {
        close: () => Promise<void>;
        newPage: (options: unknown) => Promise<{
          setContent: (html: string, options: unknown) => Promise<void>;
          emulateMedia: (options: unknown) => Promise<void>;
          addStyleTag: (options: { content: string }) => Promise<void>;
          pdf: (options: unknown) => Promise<Buffer>;
          close: () => Promise<void>;
        }>;
      };
    } catch (error) {
      browserPromise = null;
      throw error;
    }
  };

  type PlaywrightBrowser = {
      close: () => Promise<void>;
      newPage: (options: unknown) => Promise<{
        setContent: (html: string, options: unknown) => Promise<void>;
        emulateMedia: (options: unknown) => Promise<void>;
        addStyleTag: (options: { content: string }) => Promise<void>;
        pdf: (options: unknown) => Promise<Buffer>;
        close: () => Promise<void>;
      }>;
    };

  return {
    name: "local-playwright-pdf-renderer",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(PDF_RENDER_ENDPOINT, async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Metodo nao permitido." }));
          return;
        }

        try {
          const rawBody = await readRequestBody(request);
          const payload = JSON.parse(rawBody) as {
            html?: string;
            fileName?: string;
            orientation?: "p" | "l";
            footerText?: string;
            footerFontSizePx?: number;
            marginBottomMm?: number;
          };

          if (!payload.html) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "HTML do PDF nao informado." }));
            return;
          }

          const landscape = payload.orientation === "l";
          const footerEnabled = Boolean(payload.footerText);
          const browser = await getBrowser();
          const page = await browser.newPage({
            deviceScaleFactor: 1,
            viewport: landscape
              ? { width: 1588, height: 1123 }
              : { width: 1123, height: 1588 },
          });

          try {
            await page.setContent(payload.html, {
              waitUntil: "networkidle",
              timeout: 30000,
            });
            await page.emulateMedia({ media: "print" });
            await page.addStyleTag({
              content: buildPdfPrintOverrides({
                bottomMarginMm: payload.marginBottomMm,
                footerEnabled,
                landscape,
              }),
            });

            const pdfBuffer = await page.pdf({
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
              timeout: 45000,
            });

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/pdf");
            response.setHeader(
              "Content-Disposition",
              `attachment; filename="${escapeHtml(payload.fileName || "documento.pdf")}"`
            );
            response.end(pdfBuffer);
          } finally {
            await page.close();
          }
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Erro ao renderizar PDF com Playwright.",
            })
          );
        }
      });

      server.httpServer?.once("close", async () => {
        if (!browserPromise) return;

        try {
          const browser = (await browserPromise) as { close: () => Promise<void> };
          await browser.close();
        } catch {
          // No cleanup action is needed when the dev server is already closing.
        }
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    pdfRenderPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

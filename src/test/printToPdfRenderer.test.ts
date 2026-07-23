import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "token-teste" } },
      }),
    },
  },
}));

import { renderHtmlToPdfWithPrintToPdf } from "@/utils/printToPdfRenderer";

describe("printToPdfRenderer", () => {
  const createObjectURL = vi.fn(() => "blob:pdf-teste");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["pdf"], { type: "application/pdf" }), {
          status: 200,
          headers: { "Content-Type": "application/pdf" },
        })
      )
    );
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it("mantem a URL temporaria ativa ate o navegador iniciar o download", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const result = await renderHtmlToPdfWithPrintToPdf({
      html: "<html><body>PDF</body></html>",
      fileName: "certificado.pdf",
    });

    expect(result?.size).toBeGreaterThan(0);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="certificado.pdf"]')).not.toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);

    expect(document.querySelector('a[download="certificado.pdf"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdf-teste");
  });
});

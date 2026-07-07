import { describe, expect, it } from "vitest";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import type { SegurancaEletricaExecucao } from "@/services/segurancaEletricaService";
import { buildCalibracaoCertificadoHtml } from "@/utils/calibracaoCertificadoPdfTemplate";
import { buildOrdemServicoHtml } from "@/utils/osPdfTemplate";
import { buildSegurancaEletricaHtml } from "@/utils/segurancaEletricaPdfTemplate";

const assinatura = (nome: string, marker: string) => ({
  usuarioId: marker,
  nome,
  storagePath: `org/${marker}/assinatura.png`,
  dataUrl: `data:image/png;base64,${marker}`,
});

describe("assinaturas nos PDFs", () => {
  it("insere assinaturas do cliente e do tecnico na OS", () => {
    const html = buildOrdemServicoHtml(
      {
        numero: "123",
        empresa_id: "empresa",
        data_abertura: "2026-06-15T10:00:00Z",
      } as OrdemServicoSupabase,
      "logo",
      {
        solicitante: assinatura("Cliente Teste", "cliente"),
        tecnico: assinatura("Tecnico Teste", "tecnico"),
      }
    );

    expect(html).toContain("data:image/png;base64,cliente");
    expect(html).toContain("data:image/png;base64,tecnico");
    expect(html).toContain("Cliente Teste");
    expect(html).toContain("Tecnico Teste");
    expect(html).toContain("T&eacute;cnico Executor");
  });

  it("omite observacao tecnica do plano e o campo de data da assinatura", () => {
    const html = buildOrdemServicoHtml(
      {
        numero: "124",
        empresa_id: "empresa",
        data_abertura: "2026-06-15T10:00:00Z",
        observacoes: "Plano: Plano Teste. Ciclo: Visita 06/2026.",
      } as OrdemServicoSupabase,
      "logo"
    );

    expect(html).not.toContain("Plano: Plano Teste. Ciclo: Visita 06/2026.");
    expect(html).not.toContain('<div class="signature-label">Data</div>');
    expect(html).toContain("grid-template-columns: 1fr 1fr");
  });

  it("insere assinaturas do executor, responsavel e solicitante na calibracao", () => {
    const html = buildCalibracaoCertificadoHtml(
      {
        numero_certificado: 1,
        data_emissao: "2026-06-15",
        criterio_conformidade_aplicado: false,
        responsavel_solicitante: "Solicitante Teste",
        tabelas: [],
      } as CalibracaoExecucao,
      "logo",
      {
        tecnico: assinatura("Executor Teste", "executor"),
        responsavel: assinatura("Responsavel Teste", "responsavel"),
        solicitante: assinatura("Solicitante Teste", "solicitante"),
      }
    );

    expect(html).toContain("data:image/png;base64,executor");
    expect(html).toContain("data:image/png;base64,responsavel");
    expect(html).toContain("data:image/png;base64,solicitante");
    expect(html).toContain("Executor Teste");
    expect(html).toContain("Responsavel Teste");
    expect(html).toContain("Solicitante Teste");
  });

  it("insere assinaturas do executor e do responsavel na seguranca eletrica", () => {
    const html = buildSegurancaEletricaHtml(
      {
        numero_certificado: 1,
        data_emissao: "2026-06-15",
        resultados: [],
      } as SegurancaEletricaExecucao,
      "logo",
      {
        tecnico: assinatura("Executor Teste", "executor-se"),
        responsavel: assinatura("Responsavel Teste", "responsavel-se"),
      }
    );

    expect(html).toContain("data:image/png;base64,executor-se");
    expect(html).toContain("data:image/png;base64,responsavel-se");
    expect(html).toContain("Executor Teste");
    expect(html).toContain("Responsavel Teste");
  });
});

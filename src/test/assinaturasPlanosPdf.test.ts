import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Plano,
  PlanoCiclo,
  PlanoCicloDetalhes,
  PlanoRelatorioAnualDados,
} from "@/services/planosService";
import { gerarPdfRelatorioAnualPlano } from "@/utils/gerarPdfRelatorioAnualPlano";
import { gerarPdfRelatorioCicloPlano } from "@/utils/gerarPdfRelatorioCicloPlano";

const mocks = vi.hoisted(() => ({
  renderHtmlToPdf: vi.fn(async () => new Blob()),
  resolverDocumento: vi.fn(async () => ({
    responsavel: {
      usuarioId: "responsavel-id",
      nome: "Responsavel Teste",
      storagePath: "org/responsavel-id/assinatura.png",
      dataUrl: "data:image/png;base64,assinatura-plano",
    },
  })),
}));

vi.mock("@/utils/pdfHtmlRenderer", () => ({
  renderHtmlToPdf: mocks.renderHtmlToPdf,
}));

vi.mock("@/utils/pdfImageUtils", () => ({
  imageToDataUrl: vi.fn(async () => "data:image/png;base64,logo"),
}));

vi.mock("@/services/assinaturasService", () => ({
  assinaturasService: {
    resolverDocumento: mocks.resolverDocumento,
  },
}));

const plano = {
  id: "plano-id",
  organizacao_id: "org-id",
  titulo: "Plano Teste",
  empresa_id: "empresa-id",
  responsavel_id: "responsavel-id",
  data_inicial: "2026-06-01",
  frequencia: "anual",
  prazo_execucao_dias: 30,
  descricao: null,
  ativo: true,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  responsavel: {
    id: "responsavel-id",
    nome: "Responsavel Teste",
    email: "responsavel@teste.com",
    perfil: "tecnico",
    ativo: true,
  },
} as Plano;

const ciclo = {
  id: "ciclo-id",
  organizacao_id: "org-id",
  plano_id: "plano-id",
  titulo: "Ciclo Teste",
  data_prevista: "2026-06-01",
  data_abertura: "2026-06-01",
  data_fechamento_prevista: "2026-06-30",
  data_fechamento_real: "2026-06-15",
  data_realizacao_calibracao: null,
  data_emissao_calibracao: null,
  observacoes: null,
  status: "concluido",
  itens: [],
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-15T00:00:00Z",
} as PlanoCiclo;

describe("assinaturas nos PDFs de planos", () => {
  beforeEach(() => {
    mocks.renderHtmlToPdf.mockClear();
    mocks.resolverDocumento.mockClear();
  });

  it("insere a assinatura do responsavel no relatorio do ciclo", async () => {
    await gerarPdfRelatorioCicloPlano({
      plano,
      ciclo,
      ordensPreventivas: [],
      ordensCorretivas: [],
      calibracoes: [],
      segurancasEletricas: [],
    } as PlanoCicloDetalhes, { save: false });

    const html = mocks.renderHtmlToPdf.mock.calls[0][0].html;
    expect(html).toContain("data:image/png;base64,assinatura-plano");
    expect(html).toContain("Responsavel Teste");
    expect(html).not.toContain("Data prevista</span>");
    expect(html).not.toContain("Abertura</span>");
    expect(html).not.toContain("Fechamento</span>");
    expect(html).toContain("30/06/2027");
    expect(html).toContain("1. Proxima visita");
  });

  it("insere a assinatura do responsavel no cronograma anual", async () => {
    const dados = {
      plano,
      ciclos: [],
      detalhesCiclos: [],
      equipamentos: [],
      datasPrevistas: [],
      dataInicio: "2026-06-01",
      dataFim: "2027-05-31",
      meses: [],
      revisao: 1,
    } as PlanoRelatorioAnualDados;

    await gerarPdfRelatorioAnualPlano(dados, {
      emitidoEm: "2026-06-15",
      validadeAte: "2027-06-15",
      validadeMeses: 12,
      incluirPreventiva: true,
      incluirCalibracao: true,
      incluirSegurancaEletrica: true,
      exibirProximaVisita: true,
      exibirOcorrencias: true,
      agruparPorSetor: true,
      save: false,
    });

    const html = mocks.renderHtmlToPdf.mock.calls[0][0].html;
    expect(html).toContain("data:image/png;base64,assinatura-plano");
    expect(html).toContain("Responsavel Teste");
    expect(html).not.toContain("Revisao</span>");
  });
});

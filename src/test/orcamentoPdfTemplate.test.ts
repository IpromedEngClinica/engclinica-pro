import { describe, expect, it } from "vitest";
import type { OrcamentoSupabase } from "@/services/orcamentosService";
import { buildOrcamentoHtml } from "@/utils/orcamentoPdfTemplate";

describe("orcamentoPdfTemplate", () => {
  it("mantem servicos e pecas em tabelas separadas", () => {
    const html = buildOrcamentoHtml(
      {
        numero: 12,
        data_criacao: "2026-06-26",
        validade_proposta: "2026-07-26",
        status: "pendente",
        valor_total: 1500,
        empresa: {
          nome: "Cliente Teste",
          nome_fantasia: "Cliente Teste",
          cpf_cnpj: "00.000.000/0001-00",
        },
        itens: [
          {
            tipo: "servico",
            descricao: "Manutencao preventiva",
            quantidade: 1,
            valor_unitario: 1000,
            valor_total: 1000,
            tipo_servico: { id: "servico", nome: "Preventiva" },
          },
          {
            tipo: "peca",
            descricao: "Bateria reserva",
            peca_nome: "Bateria",
            quantidade: 2,
            valor_unitario: 250,
            valor_total: 500,
            fabricante_texto: "Fabricante A",
            modelo_texto: "Modelo B",
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain("Servi&ccedil;os");
    expect(html).toContain("Pe&ccedil;as");
    expect(html.indexOf("Servi&ccedil;os")).toBeLessThan(
      html.indexOf("Pe&ccedil;as")
    );
    expect(html).toContain("Preventiva");
    expect(html).toContain("Bateria");
    expect(html).toContain("Modelo B / Fabricante A");
    expect(html).not.toContain("&lt;span class=&quot;badge");
  });
});

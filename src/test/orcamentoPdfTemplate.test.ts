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

  it("oculta campos vazios e consolida valores e condicoes comerciais", () => {
    const html = buildOrcamentoHtml(
      {
        numero: "1403",
        data_orcamento: "2026-07-21T12:00:00",
        data_validade: "2026-08-21",
        status: "pendente",
        valor_pecas: 0,
        valor_servicos: 840,
        valor_total: 840,
        desconto_tipo: "valor",
        desconto_valor: 0,
        desconto_aplicado: 0,
        forma_pagamento: "pix",
        modo_pagamento: "avista",
        empresa: {
          nome: "Cliente Teste",
          nome_fantasia: "Cliente Teste",
          cpf_cnpj: null,
        },
        itens: [
          {
            tipo: "servico",
            descricao: "Preventiva - Conforme relação fornecida: 2 balanças",
            observacoes: "2 balanças",
            quantidade: 1,
            valor_unitario: 840,
            valor_total: 840,
            garantia: "90 dias",
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain("Resumo Financeiro");
    expect(html).toContain("Pix À vista");
    expect(html).not.toContain("Rela&ccedil;&atilde;o de equipamentos / escopo informado");
    expect(html).not.toContain("5- Condi&ccedil;&otilde;es Comerciais");
    expect(html).not.toContain("Valor antes do desconto");
    expect(html).not.toContain("Total pe&ccedil;as");
    expect(html).not.toContain("OS vinculada");
    expect(html).not.toContain("Nome fantasia");
    expect(html).not.toContain("<th>Garantia</th>");
    expect(html).not.toContain("Conforme rela&ccedil;&atilde;o fornecida");
  });

  it("combina os servicos e o tipo de equipamentos em uma descricao natural", () => {
    const html = buildOrcamentoHtml(
      {
        numero: "1404",
        data_orcamento: "2026-07-21T12:00:00",
        valor_total: 900,
        empresa: { nome: "Cliente Teste" },
        itens: [
          {
            tipo: "servico",
            descricao: "Preventiva / Calibração - Equipamentos de Fisioterapia",
            quantidade: 1,
            valor_unitario: 900,
            valor_total: 900,
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain(
      "Preventiva e Calibração em Equipamentos de Fisioterapia"
    );
  });

  it("combina os relacionamentos de servico e tipo de equipamento", () => {
    const html = buildOrcamentoHtml(
      {
        numero: "1405",
        data_orcamento: "2026-07-21T12:00:00",
        valor_total: 890,
        empresa: { nome: "Cliente Teste" },
        itens: [
          {
            tipo: "servico",
            descricao: "Preventiva",
            quantidade: 1,
            valor_unitario: 890,
            valor_total: 890,
            tipo_servico: { id: "servico-1", nome: "Preventiva" },
            tipo_equipamento: {
              id: "tipo-1",
              nome: "Equipamentos de Fisioterapia",
            },
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain("Preventiva em Equipamentos de Fisioterapia");
    expect(html).not.toContain(">Preventiva</strong>");
  });

  it("preserva o tipo de equipamento dos itens legados por relacao", () => {
    const html = buildOrcamentoHtml(
      {
        numero: "1406",
        data_orcamento: "2026-07-21T12:00:00",
        valor_total: 890,
        empresa: { nome: "Cliente Teste" },
        itens: [
          {
            tipo: "servico",
            descricao:
              "Preventiva - Conforme relação fornecida: Equipamentos de Fisioterapia",
            observacoes: "Equipamentos de Fisioterapia",
            quantidade: 1,
            valor_unitario: 890,
            valor_total: 890,
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain("Preventiva em Equipamentos de Fisioterapia");
    expect(html).not.toContain("Conforme relação fornecida");
    expect(html).not.toContain(
      "Rela&ccedil;&atilde;o de equipamentos / escopo informado"
    );
  });

  it("exibe somente o escopo separado informado pelo usuario", () => {
    const html = buildOrcamentoHtml(
      {
        numero: "1407",
        data_orcamento: "2026-07-21T12:00:00",
        valor_total: 890,
        empresa: { nome: "Cliente Teste" },
        itens: [
          {
            tipo: "servico",
            descricao: "Preventiva - Equipamentos de Fisioterapia",
            observacoes: "2 ultrassons, 1 TENS e 1 laserterapia",
            quantidade: 1,
            valor_unitario: 890,
            valor_total: 890,
          },
        ],
      } as OrcamentoSupabase,
      "data:image/png;base64,logo"
    );

    expect(html).toContain("Preventiva em Equipamentos de Fisioterapia");
    expect(html).toContain(
      "Rela&ccedil;&atilde;o de equipamentos / escopo informado"
    );
    expect(html).toContain("2 ultrassons, 1 TENS e 1 laserterapia");
  });
});

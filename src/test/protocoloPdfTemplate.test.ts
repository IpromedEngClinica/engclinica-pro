import { describe, expect, it } from "vitest";
import type { ProtocoloOSSupabase } from "@/services/protocolosService";
import { buildProtocoloHtml } from "@/utils/protocoloPdfTemplate";

describe("protocoloPdfTemplate", () => {
  it("usa o padrao visual da calibracao e mantem os campos do protocolo", () => {
    const html = buildProtocoloHtml(
      {
        numero: "77",
        tipo: "entrega",
        data_protocolo: "2026-06-29T10:30:00",
        data_entrega: "2026-06-29T11:00:00",
        responsavel_nome: "Cliente Recebedor",
        responsavel_documento: "MG-123",
        responsavel_contato: "(32) 99999-9999",
        status: "emitido",
        observacoes: "Entrega sem ressalvas.",
        empresa: {
          id: "empresa",
          nome: "Cliente LTDA",
          nome_fantasia: "Cliente",
          cpf_cnpj: "00.000.000/0001-00",
          cep: "36000-000",
          rua: "Rua Teste",
          numero: "10",
          complemento: "Sala 1",
          bairro: "Centro",
          cidade: "Juiz de Fora",
          estado: "MG",
          contato: "Contato Cliente",
          email: "cliente@example.com",
          celular: "(32) 98888-8888",
          telefone: "(32) 3222-2222",
          ativo: true,
        },
        equipamento: {
          id: "equipamento",
          tipo_texto: "Autoclave",
          fabricante: "Fabricante",
          modelo: "Modelo X",
          numero_serie: "NS-123",
          patrimonio: "PAT-1",
          tag: "TAG-1",
          setor: "CME",
          ativo: true,
        },
        ordem_servico: {
          id: "os",
          numero: "55800",
          status_sistema: "fechada",
          ativo: true,
        },
        acessorios: [
          {
            id: "acessorio",
            protocolo_id: "protocolo",
            descricao: "Cabo de forca",
            quantidade: 1,
            conferido: true,
            observacoes: "OK",
            created_at: "2026-06-29T10:30:00",
          },
        ],
      } as ProtocoloOSSupabase,
      "logo"
    );

    expect(html).toContain("document-header");
    expect(html).toContain("Protocolo de Entrega");
    expect(html).toContain("N\u00ba 77");
    expect(html).toContain("Dados do Cliente");
    expect(html).toContain("Cliente LTDA");
    expect(html).toContain("00.000.000/0001-00");
    expect(html).toContain("Instrumento / Equipamento");
    expect(html).toContain("Autoclave");
    expect(html).toContain("NS-123");
    expect(html).toContain("Dados da Entrega");
    expect(html).toContain("Cliente Recebedor");
    expect(html).toContain("Acess\u00f3rios do Equipamento");
    expect(html).toContain("Cabo de forca");
    expect(html).toContain("Entrega sem ressalvas.");
    expect(html).toContain("Com esta assinatura");
    expect(html).toContain("180 dias para a retirada");
    expect(html).toContain("Assinaturas");
    expect(html).not.toContain("protocol-type");
  });

  it("exibe Sem Acessorios quando o protocolo nao possuir acessorios", () => {
    const html = buildProtocoloHtml(
      {
        numero: "78",
        tipo: "recolhimento",
        data_protocolo: "2026-06-29T10:30:00",
        empresa: {
          id: "empresa",
          nome: "Cliente LTDA",
          nome_fantasia: null,
          cpf_cnpj: null,
          cep: null,
          rua: null,
          numero: null,
          complemento: null,
          bairro: null,
          cidade: null,
          estado: null,
          contato: null,
          email: null,
          celular: null,
          telefone: null,
          ativo: true,
        },
        equipamento: {
          id: "equipamento",
          tipo_texto: "Autoclave",
          fabricante: null,
          modelo: null,
          numero_serie: null,
          patrimonio: null,
          tag: null,
          setor: null,
          ativo: true,
        },
        acessorios: [],
      } as ProtocoloOSSupabase,
      "logo"
    );

    expect(html).toContain("Protocolo de Recolhimento");
    expect(html).toContain("Acess\u00f3rios do Equipamento");
    expect(html).toContain("Sem Acess\u00f3rios");
    expect(html).not.toContain("Com esta assinatura");
    expect(html).not.toContain("180 dias para a retirada");
  });
});

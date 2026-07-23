import { describe, expect, it } from "vitest";
import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import { formatNomeArquivoCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import { buildCalibracaoCertificadoHtml } from "@/utils/calibracaoCertificadoPdfTemplate";

describe("calibracaoCertificadoPdfTemplate", () => {
  it("usa validade mensal, U reportada e responsavel tecnico fixo", () => {
    const execucao = {
      numero_certificado: 12,
      data_emissao: "2026-06-01",
      data_calibracao: "2026-06-01",
      data_validade: "2027-06-30",
      validade_mes: "2027-06-01",
      local_calibracao: "dependencias_contratada",
      temperatura_ambiente: 21,
      incerteza_temperatura: 0.5,
      unidade_temperatura: "°C",
      umidade_relativa: 50,
      incerteza_umidade: 5,
      unidade_umidade: "%",
      criterio_conformidade_aplicado: false,
      procedimento_nome_snapshot: "Procedimento",
      procedimento_versao_snapshot: 1,
      tecnico_executor_nome: "Tecnico Executor",
      tecnico_executor_registro: "REGISTRO-NAO-EXIBIR",
      responsavel_solicitante: "Solicitante Teste",
      tabelas: [
        {
          id: "tabela",
          nome_snapshot: "Temperatura",
          grandeza_snapshot: "Temperatura",
          unidade_snapshot: "°C",
          padrao_id: "padrao",
          padrao_validade_snapshot: "2027-01-30",
          resolucao_equipamento_snapshot: 0.1,
          resolucao_equipamento_texto_snapshot: "0,10",
          pontos: [
            {
              id: "ponto",
              valor_nominal: 10,
              valor_nominal_texto_snapshot: "10,00",
              media_valores_medidos: 10,
              casas_decimais_valor_medido: 2,
              tendencia_corrigida: 0.04,
              incerteza_expandida: 0.18,
              incerteza_expandida_calculada: 0.183746,
              incerteza_expandida_reportada: 0.2,
              casas_decimais_incerteza: 1,
              fator_abrangencia_k: 2,
              leituras: [
                {
                  valor_medido: 10,
                  valor_medido_texto: "10,00",
                  casas_decimais: 2,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as CalibracaoExecucao;

    const html = buildCalibracaoCertificadoHtml(execucao, "logo");

    expect(html).toContain("06/2027");
    expect(html).toContain("21 ± 0,5 °C");
    expect(html).toContain("50 ± 5 %");
    expect(html).toContain("Ícaro Heitor Piris Rezende");
    expect(html).toContain("CREA: 142085302-3");
    expect(html).toContain("Solicitante Teste");
    expect(html).toContain("Técnico Executor");
    expect(html).toContain("Responsável Técnico / Signatário Autorizado");
    expect(html).toContain("Solicitante");
    expect(html).toContain("30/01/2027");
    expect(html).toContain("Valor de uma divisão:");
    expect(html).toContain("<strong>0,10 °C</strong>");
    expect(html).not.toContain("Resolução / divisão:");
    expect(html).toContain("<th class=\"center\">VM(1)</th>");
    expect(html).toContain("<td>10,00</td>");
    expect(html).toContain('<td class="center">10,00</td>');
    expect(html).toContain('<td class="center">0,0</td>');
    expect(html).toContain('<td class="center">0,2</td>');
    expect(html).toContain("REGISTRO-NAO-EXIBIR");
    expect(html).not.toContain("0,183746");
  });

  it("identifica discretamente o certificado revisado", () => {
    const html = buildCalibracaoCertificadoHtml(
      {
        numero_certificado: 12,
        numero_revisao: 2,
        data_emissao: "2026-06-01",
        criterio_conformidade_aplicado: false,
        tabelas: [],
      } as unknown as CalibracaoExecucao,
      "logo"
    );

    expect(html).toContain("Revisão: 2");
    expect(html).toContain('<span class="field-label">Revisão:</span>');
    expect(html).toContain('<span class="field-value">2</span>');
    expect(
      formatNomeArquivoCertificadoCalibracao({
        numero_certificado: 12,
        numero_revisao: 2,
      })
    ).toBe("CAL-000012-R002.pdf");
  });

  it("preserva a numeracao anual completa no nome do certificado", () => {
    expect(
      formatNomeArquivoCertificadoCalibracao({
        numero_certificado: 2026070001,
        numero_revisao: 0,
      })
    ).toBe("CAL-2026070001.pdf");
  });

  it("omite o campo de setor quando o equipamento nao possui setor", () => {
    const html = buildCalibracaoCertificadoHtml(
      {
        numero_certificado: 2026070001,
        data_emissao: "2026-07-22",
        criterio_conformidade_aplicado: false,
        equipamento: { setor: "Sem setor" },
        tabelas: [],
      } as unknown as CalibracaoExecucao,
      "logo"
    );

    expect(html).not.toContain("Setor:");
    expect(html).not.toContain("Sem setor");
  });
});

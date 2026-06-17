import { describe, expect, it } from "vitest";

import type { EquipamentoSupabase } from "@/services/equipamentosService";
import type { RelatorioVisitaExternaDados } from "@/services/relatoriosService";
import { buildVisitaExternaHtml } from "@/utils/visitaExternaPdfTemplate";

const equipamento = (index: number): EquipamentoSupabase =>
  ({
    id: `equipamento-${index}`,
    numero_cadastro: index,
    organizacao_id: "organizacao",
    empresa_id: "empresa",
    tipo_equipamento_id: "tipo",
    tipo_texto: null,
    fabricante: `Fabricante ${index}`,
    modelo: `Modelo ${index}`,
    numero_serie: `SERIE-${index}`,
    patrimonio: `PAT-${index}`,
    tag: `TAG-${index}`,
    setor: index % 2 === 0 ? "Sem setor" : "Centro Cirurgico",
    status: "Ativo",
    data_aquisicao: null,
    data_instalacao: null,
    data_ultima_preventiva: null,
    data_proxima_preventiva: null,
    data_ultima_calibracao: null,
    data_proxima_calibracao: null,
    observacoes: null,
    ativo: true,
    created_at: "2026-06-15T12:00:00Z",
    updated_at: "2026-06-15T12:00:00Z",
    empresa: {
      nome: "Hospital Teste",
      nome_fantasia: "Hospital Teste",
    },
    tipo_equipamento: {
      id: "tipo",
      nome: "Monitor Multiparametro",
    },
  }) as EquipamentoSupabase;

const dados: RelatorioVisitaExternaDados = {
  relatorio: {
    id: "relatorio",
    organizacao_id: "organizacao",
    tipo: "visita_externa",
    titulo: "Visita externa",
    filtros: {
      empresaIds: ["empresa"],
      tipoEquipamentoLabels: [],
      setorLabels: [],
      separarPorSetor: true,
    },
    arquivo_url: null,
    emitido_em: "2026-06-15",
    revisao: 1,
    ativo: true,
    created_at: "2026-06-15T12:00:00Z",
    updated_at: "2026-06-15T12:00:00Z",
  },
  equipamentos: Array.from({ length: 21 }, (_, index) => equipamento(index + 1)),
};

describe("visitaExternaPdfTemplate", () => {
  it("usa tabela unica por cliente sem prefixo de serie", () => {
    const html = buildVisitaExternaHtml(dados, "data:image/png;base64,logo");

    expect(html).toContain("width: 1588px");
    expect(html).toContain("Fabricante</th>");
    expect(html).toContain("Modelo</th>");
    expect(html).toContain("N&uacute;mero de S&eacute;rie");
    expect(html).toContain("N&atilde;o conforme");
    expect(html).toContain("Observa&ccedil;&otilde;es gerais da visita");
    expect(html.match(/class="equipment-table"/g)).toHaveLength(1);
    expect(html).not.toContain("continua");
    expect(html).not.toContain("Serie:");
  });
});

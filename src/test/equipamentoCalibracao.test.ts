import { describe, expect, it } from "vitest";
import type { EquipamentoSupabase } from "@/services/equipamentosService";
import { getBloqueioCriacaoCalibracao } from "@/utils/equipamentoCalibracao";

const equipamento = (patch: Partial<EquipamentoSupabase> = {}) =>
  ({
    id: "equipamento",
    empresa_id: "empresa",
    ativo: true,
    status: "Ativo",
    ...patch,
  }) as EquipamentoSupabase;

describe("equipamentoCalibracao", () => {
  it("permite criar calibracao para equipamento ativo vinculado a empresa", () => {
    expect(getBloqueioCriacaoCalibracao(equipamento())).toBeNull();
  });

  it("bloqueia equipamento desativado ou obsoleto", () => {
    expect(getBloqueioCriacaoCalibracao(equipamento({ ativo: false }))).toBe(
      "Nao e possivel criar calibracao para equipamento desativado."
    );
    expect(getBloqueioCriacaoCalibracao(equipamento({ status: "Obsoleto" }))).toBe(
      "Nao e possivel criar calibracao para equipamento desativado."
    );
  });

  it("bloqueia equipamento sem empresa", () => {
    expect(getBloqueioCriacaoCalibracao(equipamento({ empresa_id: "" }))).toBe(
      "O equipamento nao possui cliente vinculado. Atualize o cadastro antes de criar a calibracao."
    );
  });
});

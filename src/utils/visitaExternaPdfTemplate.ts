import type { EquipamentoSupabase } from "@/services/equipamentosService";
import {
  getTipoEquipamentoRelatorio,
  type RelatorioVisitaExternaDados,
} from "@/services/relatoriosService";

const safe = (value?: string | number | null) => {
  const text =
    value === undefined || value === null || value === "" ? "-" : String(value);

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (equipamento: EquipamentoSupabase) =>
  equipamento.empresa?.nome_fantasia ||
  equipamento.empresa?.nome ||
  "Cliente nao informado";

const groupByEmpresaSetor = (equipamentos: EquipamentoSupabase[]) => {
  const empresas = new Map<string, Map<string, EquipamentoSupabase[]>>();

  equipamentos.forEach((equipamento) => {
    const empresa = getEmpresaNome(equipamento);
    const setor = equipamento.setor || "Sem setor";
    if (!empresas.has(empresa)) empresas.set(empresa, new Map());
    const setores = empresas.get(empresa) as Map<string, EquipamentoSupabase[]>;
    setores.set(setor, [...(setores.get(setor) || []), equipamento]);
  });

  return [...empresas.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([empresa, setores]) => ({
      empresa,
      setores: [...setores.entries()].sort(([a], [b]) =>
        a.localeCompare(b, "pt-BR")
      ),
    }));
};

const getIdentificacao = (equipamento: EquipamentoSupabase) =>
  [
    equipamento.numero_serie ? `Serie: ${equipamento.numero_serie}` : null,
    equipamento.patrimonio ? `Pat.: ${equipamento.patrimonio}` : null,
    equipamento.tag ? `TAG: ${equipamento.tag}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "-";

const equipamentoRow = (equipamento: EquipamentoSupabase, index: number) => `
  <tr>
    <td class="index">${safe(index + 1)}</td>
    <td>
      <strong>${safe(getTipoEquipamentoRelatorio(equipamento))}</strong>
      <span>${safe(equipamento.modelo)}${equipamento.fabricante ? ` | ${safe(equipamento.fabricante)}` : ""}</span>
    </td>
    <td>${safe(getIdentificacao(equipamento))}</td>
    <td class="check-cell"><span class="box"></span></td>
    <td class="check-cell"><span class="box"></span></td>
    <td></td>
  </tr>
`;

export const buildVisitaExternaHtml = (
  dados: RelatorioVisitaExternaDados,
  logoBase64: string
) => {
  const { relatorio, equipamentos } = dados;
  const grupos = groupByEmpresaSetor(equipamentos);

  return `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2933; background: #fff; }
      .document { width: 1123px; min-height: 794px; padding: 22px 28px 34px; background: #fff; }
      .header { display: grid; grid-template-columns: 180px 1fr 210px; align-items: start; gap: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
      .logo { width: 165px; height: auto; display: block; }
      h1 { margin: 2px 0 6px; font-size: 24px; font-weight: 700; color: #334155; letter-spacing: 0; }
      .subtitle { margin: 0; font-size: 11px; color: #64748b; line-height: 1.45; }
      .meta { font-size: 10px; color: #475569; line-height: 1.6; text-align: right; }
      .visit-fields { display: grid; grid-template-columns: 1.2fr .8fr .8fr; gap: 10px; margin: 14px 0 18px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; height: 42px; padding: 6px 8px; }
      .field span { display: block; font-size: 8px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
      .company { margin-top: 18px; page-break-inside: avoid; }
      .company-title { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #334155; padding-bottom: 5px; margin-bottom: 10px; }
      .company-title h2 { margin: 0; font-size: 15px; color: #334155; }
      .company-title span { font-size: 10px; color: #64748b; }
      .sector { margin-top: 12px; page-break-inside: avoid; }
      .sector h3 { margin: 0 0 6px; padding: 6px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; color: #334155; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
      th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569; }
      td { border: 1px solid #d8e0ea; padding: 8px 6px; vertical-align: top; min-height: 32px; word-break: break-word; }
      tr:nth-child(even) td { background: #fcfdff; }
      th:nth-child(1), td:nth-child(1) { width: 4%; text-align: center; }
      th:nth-child(2) { width: 28%; }
      th:nth-child(3) { width: 28%; }
      th:nth-child(4), th:nth-child(5), td:nth-child(4), td:nth-child(5) { width: 9%; text-align: center; }
      th:nth-child(6) { width: 22%; }
      td strong { display: block; color: #111827; font-size: 9px; }
      td span { display: block; color: #64748b; margin-top: 2px; }
      .index { color: #64748b; font-weight: 700; }
      .check-cell { vertical-align: middle; }
      .box { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #334155; border-radius: 3px; margin-top: 0; }
      .empty { margin-top: 20px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 18px; text-align: center; color: #64748b; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 32px; page-break-inside: avoid; }
      .signature { border-top: 1px solid #334155; padding-top: 7px; text-align: center; font-size: 10px; color: #475569; }
    </style>
    <div class="document">
      <header class="header">
        <img class="logo" src="${logoBase64}" alt="ACI" />
        <div>
          <h1>Relatório de Visita Externa</h1>
          <p class="subtitle">${safe(relatorio.titulo)} | Checklist impresso para inspeção setorial dos equipamentos.</p>
        </div>
        <div class="meta">
          <div><strong>Revisao:</strong> ${safe(relatorio.revisao)}</div>
          <div><strong>Emissao:</strong> ${safe(formatDate(relatorio.emitido_em))}</div>
          <div><strong>Equipamentos:</strong> ${safe(equipamentos.length)}</div>
        </div>
      </header>

      <section class="visit-fields">
        <div class="field"><span>Tecnico responsavel</span></div>
        <div class="field"><span>Data da visita</span></div>
        <div class="field"><span>Horario</span></div>
      </section>

      ${
        grupos.length
          ? grupos
              .map(
                ({ empresa, setores }) => `
                  <section class="company">
                    <div class="company-title">
                      <h2>${safe(empresa)}</h2>
                      <span>${safe(setores.reduce((total, [, itens]) => total + itens.length, 0))} equipamento(s)</span>
                    </div>
                    ${setores
                      .map(
                        ([setor, itens]) => `
                          <section class="sector">
                            <h3>Setor: ${safe(setor)}</h3>
                            <table>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Equipamento</th>
                                  <th>Identificação</th>
                                  <th>Conforme</th>
                                  <th>Não conforme</th>
                                  <th>Observações</th>
                                </tr>
                              </thead>
                              <tbody>${itens.map(equipamentoRow).join("")}</tbody>
                            </table>
                          </section>
                        `
                      )
                      .join("")}
                  </section>
                `
              )
              .join("")
          : `<div class="empty">Nenhum equipamento encontrado para os filtros selecionados.</div>`
      }

      <section class="signatures">
        <div class="signature">Assinatura do técnico</div>
        <div class="signature">Assinatura do responsável do setor</div>
      </section>
    </div>
  `;
};

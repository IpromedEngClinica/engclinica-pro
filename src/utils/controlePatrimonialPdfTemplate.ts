import type { EquipamentoSupabase } from "@/services/equipamentosService";
import {
  getStatusEquipamentoRelatorio,
  getTipoEquipamentoRelatorio,
  type RelatorioControlePatrimonialDados,
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

const getResumoPorTipo = (equipamentos: EquipamentoSupabase[]) => {
  const resumo = new Map<string, number>();

  equipamentos.forEach((equipamento) => {
    const tipo = getTipoEquipamentoRelatorio(equipamento);
    resumo.set(tipo, (resumo.get(tipo) || 0) + 1);
  });

  return [...resumo.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
};

const groupByEmpresa = (equipamentos: EquipamentoSupabase[]) => {
  const groups = new Map<string, EquipamentoSupabase[]>();

  equipamentos.forEach((equipamento) => {
    const nome = getEmpresaNome(equipamento);
    groups.set(nome, [...(groups.get(nome) || []), equipamento]);
  });

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
};

const statusClass = (status?: string | null) => {
  const lower = (status || "").toLowerCase();
  if (lower.includes("manuten")) return "status maintenance";
  if (lower.includes("desativ") || lower.includes("inativo")) {
    return "status inactive";
  }
  return "status active";
};

const equipamentoRow = (equipamento: EquipamentoSupabase, index: number) => `
  <tr>
    <td class="index">${safe(index + 1)}</td>
    <td>
      <strong>${safe(getTipoEquipamentoRelatorio(equipamento))}</strong>
      <span>${safe(equipamento.modelo)}${equipamento.fabricante ? ` | ${safe(equipamento.fabricante)}` : ""}</span>
    </td>
    <td>${safe(equipamento.numero_serie)}</td>
    <td>
      <strong>${safe(equipamento.patrimonio)}</strong>
      <span>${equipamento.tag ? `TAG ${safe(equipamento.tag)}` : "-"}</span>
    </td>
    <td>${safe(equipamento.setor)}</td>
    <td><span class="${statusClass(getStatusEquipamentoRelatorio(equipamento))}">${safe(getStatusEquipamentoRelatorio(equipamento))}</span></td>
    <td>
      <strong>Preventiva</strong>
      <span>${safe(formatDate(equipamento.data_ultima_preventiva))} -> ${safe(formatDate(equipamento.data_proxima_preventiva))}</span>
      <strong>Calibracao</strong>
      <span>${safe(formatDate(equipamento.data_ultima_calibracao))} -> ${safe(formatDate(equipamento.data_proxima_calibracao))}</span>
    </td>
  </tr>
`;

export const buildControlePatrimonialHtml = (
  dados: RelatorioControlePatrimonialDados,
  logoBase64: string
) => {
  const { relatorio, equipamentos } = dados;
  const resumo = getResumoPorTipo(equipamentos);
  const grupos = groupByEmpresa(equipamentos);

  return `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #243b53; background: #fff; }
      .document { width: 1588px; min-height: 1123px; padding: 20px 22px 28px; background: #fff; }
      .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #d9e2ec; padding-bottom: 14px; }
      .logo { width: 180px; height: auto; display: block; }
      .title { text-align: right; }
      .title h1 { margin: 4px 0 8px; font-size: 26px; font-weight: 600; letter-spacing: 0; color: #334e68; }
      .title p { margin: 0; font-size: 11px; color: #627d98; line-height: 1.5; }
      .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 18px 0; }
      .metric { border: 1px solid #d9e2ec; border-radius: 6px; padding: 10px 12px; background: #fbfdff; }
      .metric span { display: block; font-size: 10px; color: #627d98; text-transform: uppercase; }
      .metric strong { display: block; margin-top: 4px; font-size: 20px; color: #102a43; }
      .summary { margin-bottom: 18px; }
      .summary h2, .company h2 { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #334e68; }
      .summary-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #d9e2ec; }
      .summary-table th { background: #f1f5f9; color: #334e68; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
      .summary-table td { border-top: 1px solid #e4e7eb; padding: 8px; }
      .summary-table th:last-child, .summary-table td:last-child { width: 120px; text-align: right; }
      .company { margin-top: 20px; page-break-inside: avoid; }
      .company-title { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #cbd2d9; padding-bottom: 6px; margin-bottom: 8px; }
      .company-title h2 { margin: 0; }
      .company-title span { font-size: 11px; color: #627d98; }
      .equip-list { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      .equip-list th { background: #f8fafc; color: #52606d; text-align: left; padding: 7px 6px; font-size: 9px; text-transform: uppercase; border-top: 1px solid #d9e2ec; border-bottom: 1px solid #d9e2ec; }
      .equip-list td { padding: 8px 6px; border-bottom: 1px solid #e4e7eb; vertical-align: top; word-break: break-word; }
      .equip-list tr:nth-child(even) td { background: #fbfdff; }
      .equip-list th:nth-child(1), .equip-list td:nth-child(1) { width: 4%; text-align: center; }
      .equip-list th:nth-child(2) { width: 23%; }
      .equip-list th:nth-child(3) { width: 13%; }
      .equip-list th:nth-child(4) { width: 14%; }
      .equip-list th:nth-child(5) { width: 10%; }
      .equip-list th:nth-child(6) { width: 11%; }
      .equip-list th:nth-child(7) { width: 25%; }
      .equip-list td strong { display: block; font-size: 10px; color: #102a43; }
      .equip-list td span { display: block; margin-top: 2px; color: #627d98; }
      .index { color: #627d98; font-weight: 700; }
      .status { display: inline-block; border-radius: 999px; padding: 3px 8px; font-size: 9px; font-weight: 700; white-space: nowrap; }
      .status.active { background: #e8f5e9; color: #256029; }
      .status.maintenance { background: #fff7e6; color: #8a4b00; }
      .status.inactive { background: #fdecea; color: #b42318; }
      .empty { margin-top: 18px; padding: 18px; border: 1px dashed #bcccdc; border-radius: 6px; text-align: center; color: #627d98; }
      .footer-total { margin-top: 20px; border-top: 1px solid #d9e2ec; padding-top: 10px; text-align: right; font-size: 14px; font-weight: 700; color: #334e68; }
    </style>
    <div class="document">
      <header class="header">
        <img class="logo" src="${logoBase64}" alt="ACI" />
        <div class="title">
          <h1>Relatório de Controle Patrimonial</h1>
          <p>${safe(relatorio.titulo)}</p>
          <p>Revisao ${safe(relatorio.revisao)} | Emissao ${safe(formatDate(relatorio.emitido_em))}</p>
        </div>
      </header>

      <section class="metrics">
        <div class="metric"><span>Equipamentos</span><strong>${safe(equipamentos.length)}</strong></div>
        <div class="metric"><span>Tipos de equipamento</span><strong>${safe(resumo.length)}</strong></div>
      </section>

      ${
        relatorio.filtros.incluirResumo
          ? `<section class="summary">
              <h2>Resumo dos Equipamentos</h2>
              <table class="summary-table">
                <thead><tr><th>Tipo de equipamento</th><th>Quantidade</th></tr></thead>
                <tbody>
                  ${resumo.map(([tipo, quantidade]) => `<tr><td>${safe(tipo)}</td><td>${safe(quantidade)}</td></tr>`).join("")}
                </tbody>
              </table>
            </section>`
          : ""
      }

      ${
        grupos.length
          ? grupos
              .map(
                ([empresa, itens]) => `
                  <section class="company">
                    <div class="company-title">
                      <h2>${safe(empresa)}</h2>
                      <span>${safe(itens.length)} equipamento(s)</span>
                    </div>
                    <table class="equip-list">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Equipamento</th>
                          <th>N. Série</th>
                          <th>Patrimônio / TAG</th>
                          <th>Setor</th>
                          <th>Estado</th>
                          <th>Preventiva / Calibração</th>
                        </tr>
                      </thead>
                      <tbody>${itens.map(equipamentoRow).join("")}</tbody>
                    </table>
                  </section>
                `
              )
              .join("")
          : `<div class="empty">Nenhum equipamento encontrado para os filtros selecionados.</div>`
      }

      <div class="footer-total">Total de Equipamentos: ${safe(equipamentos.length)}</div>
    </div>
  `;
};

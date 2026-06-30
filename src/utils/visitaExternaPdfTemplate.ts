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

const safeBlank = (value?: string | number | null) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

const getSetor = (equipamento: EquipamentoSupabase) =>
  equipamento.setor?.trim() || "Sem setor";

const isSemSetor = (value?: string | null) => {
  const setor = value?.trim();
  return !setor || setor.toLocaleLowerCase("pt-BR") === "sem setor";
};

const getSetorImpressao = (equipamento: EquipamentoSupabase) =>
  isSemSetor(equipamento.setor) ? "" : equipamento.setor?.trim();

const isEmManutencao = (equipamento: EquipamentoSupabase) =>
  equipamento.status
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .includes("manutencao") || false;

const uniqueEquipamentos = (equipamentos: EquipamentoSupabase[]) => [
  ...new Map(
    equipamentos.map((equipamento) => [equipamento.id, equipamento] as const)
  ).values(),
];

const compareEquipamentosBase = (
  a: EquipamentoSupabase,
  b: EquipamentoSupabase
) => {
  const tipoCompare = getTipoEquipamentoRelatorio(a).localeCompare(
    getTipoEquipamentoRelatorio(b),
    "pt-BR"
  );
  if (tipoCompare !== 0) return tipoCompare;

  const fabricanteCompare = (a.fabricante || "").localeCompare(
    b.fabricante || "",
    "pt-BR"
  );
  if (fabricanteCompare !== 0) return fabricanteCompare;

  const modeloCompare = (a.modelo || "").localeCompare(b.modelo || "", "pt-BR");
  if (modeloCompare !== 0) return modeloCompare;

  return (a.numero_serie || "").localeCompare(b.numero_serie || "", "pt-BR");
};

const sortEquipamentos = (
  equipamentos: EquipamentoSupabase[],
  separarPorSetor: boolean
) =>
  [...equipamentos].sort((a, b) => {
    if (separarPorSetor) {
      const setorA = getSetor(a);
      const setorB = getSetor(b);

      if (setorA === "Sem setor" && setorB !== "Sem setor") return -1;
      if (setorB === "Sem setor" && setorA !== "Sem setor") return 1;

      const setorCompare = setorA.localeCompare(setorB, "pt-BR");
      if (setorCompare !== 0) return setorCompare;
    }

    return compareEquipamentosBase(a, b);
  });

const groupByEmpresa = (
  equipamentos: EquipamentoSupabase[],
  separarPorSetor: boolean
) => {
  const empresas = new Map<string, EquipamentoSupabase[]>();

  equipamentos.forEach((equipamento) => {
    const empresa = getEmpresaNome(equipamento);
    empresas.set(empresa, [...(empresas.get(empresa) || []), equipamento]);
  });

  return [...empresas.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([empresa, itens]) => ({
      empresa,
      itens: sortEquipamentos(itens, separarPorSetor),
    }));
};

const groupBySetor = (equipamentos: EquipamentoSupabase[]) => {
  const setores = new Map<string, EquipamentoSupabase[]>();

  equipamentos.forEach((equipamento) => {
    const setor = getSetor(equipamento);
    setores.set(setor, [...(setores.get(setor) || []), equipamento]);
  });

  return [...setores.entries()]
    .sort(([a], [b]) => {
      if (a === "Sem setor" && b !== "Sem setor") return -1;
      if (b === "Sem setor" && a !== "Sem setor") return 1;
      return a.localeCompare(b, "pt-BR");
    })
    .map(([setor, itens]) => ({
      setor,
      itens: itens.sort(compareEquipamentosBase),
    }));
};

const equipamentoRow = (equipamento: EquipamentoSupabase, index: number) => `
  <tr class="${isEmManutencao(equipamento) ? "maintenance-row" : ""}">
    <td class="index">${safe(index + 1)}</td>
    <td class="equipment-name">${safe(getTipoEquipamentoRelatorio(equipamento))}</td>
    <td>${safe(equipamento.fabricante)}</td>
    <td>${safe(equipamento.modelo)}</td>
    <td>${safe(equipamento.numero_serie)}</td>
    <td>${safeBlank(getSetorImpressao(equipamento))}</td>
    <td class="check-cell"><span class="box"></span></td>
    <td class="check-cell"><span class="box"></span></td>
    <td></td>
  </tr>
`;

const renderEquipmentTable = (itens: EquipamentoSupabase[]) => `
  <section class="equipment-table">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Equipamento</th>
          <th>Fabricante</th>
          <th>Modelo</th>
          <th>N&uacute;mero de S&eacute;rie</th>
          <th>Setor</th>
          <th>Conforme</th>
          <th>N&atilde;o conforme</th>
          <th>Observa&ccedil;&otilde;es</th>
        </tr>
      </thead>
      <tbody>${itens.map((item, index) => equipamentoRow(item, index)).join("")}</tbody>
    </table>
  </section>
`;

const renderSetorBlocks = (itens: EquipamentoSupabase[]) =>
  groupBySetor(itens)
    .map(
      ({ setor, itens: equipamentosSetor }) => `
        <section class="sector-block">
          <h3>${setor === "Sem setor" ? "Equipamentos sem setor" : `Setor: ${safe(setor)}`}</h3>
          ${renderEquipmentTable(equipamentosSetor)}
        </section>
      `
    )
    .join("");

export const buildVisitaExternaHtml = (
  dados: RelatorioVisitaExternaDados,
  logoBase64: string
) => {
  const { relatorio } = dados;
  const equipamentos = uniqueEquipamentos(dados.equipamentos);
  const grupos = groupByEmpresa(equipamentos, relatorio.filtros.separarPorSetor);
  const modoTexto = relatorio.filtros.separarPorSetor
    ? "ordenada por setor"
    : "lista completa em ordem alfabetica";

  return `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
      .document { width: 1588px; min-height: 1123px; padding: 18px 22px 28px; background: #fff; }
      .header { display: grid; grid-template-columns: 190px 1fr 240px; align-items: start; gap: 22px; border-bottom: 2px solid #000; padding-bottom: 12px; }
      .logo { width: 172px; height: auto; display: block; }
      h1 { margin: 2px 0 6px; font-size: 31px; font-weight: 800; color: #000; letter-spacing: 0; }
      .subtitle { margin: 0; font-size: 15px; color: #000; line-height: 1.4; }
      .meta { font-size: 14px; color: #000; line-height: 1.6; text-align: right; }
      .visit-fields { display: grid; grid-template-columns: 1.4fr .8fr .7fr; gap: 10px; margin: 14px 0 16px; }
      .field { border: 1.6px solid #000; border-radius: 4px; height: 44px; padding: 7px 8px; }
      .field span { display: block; font-size: 11px; text-transform: uppercase; color: #000; margin-bottom: 4px; font-weight: 700; }
      .company { margin-top: 14px; break-inside: auto !important; page-break-inside: auto !important; }
      .company-title { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
      .company-title h2 { margin: 0; font-size: 21px; color: #000; font-weight: 800; }
      .company-title span { font-size: 14px; color: #000; }
      .equipment-table { margin-top: 8px; break-inside: auto !important; page-break-inside: auto !important; }
      .sector-block { margin-top: 12px; break-inside: auto !important; page-break-inside: auto !important; }
      .sector-block h3 { margin: 0 0 6px; font-size: 17px; color: #000; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; color: #000; break-inside: auto !important; page-break-inside: auto !important; }
      thead { display: table-header-group; break-inside: avoid !important; page-break-inside: avoid !important; }
      tbody { break-inside: auto !important; page-break-inside: auto !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      th, td { page-break-inside: auto !important; break-inside: auto !important; }
      tr { min-height: 42px; }
      th { background: #f1f5f9; border: 1.6px solid #000; padding: 8px 6px; text-align: left; font-size: 11px; text-transform: uppercase; color: #000; font-weight: 800; line-height: 1.2; }
      td { border: 1.4px solid #000; padding: 8px 6px; vertical-align: middle; min-height: 42px; overflow-wrap: anywhere; line-height: 1.25; }
      tr:nth-child(even) td { background: #fff; }
      th:nth-child(1), td:nth-child(1) { width: 3%; text-align: center; }
      th:nth-child(2), td:nth-child(2) { width: 17%; }
      th:nth-child(3), td:nth-child(3) { width: 11%; }
      th:nth-child(4), td:nth-child(4) { width: 11%; }
      th:nth-child(5), td:nth-child(5) { width: 15%; }
      th:nth-child(6), td:nth-child(6) { width: 10%; }
      th:nth-child(7), td:nth-child(7) { width: 8%; text-align: center; }
      th:nth-child(8), td:nth-child(8) { width: 9%; text-align: center; }
      th:nth-child(9), td:nth-child(9) { width: 16%; }
      th:nth-child(7),
      th:nth-child(8) {
        padding-left: 3px;
        padding-right: 3px;
        text-align: center;
        white-space: normal;
        overflow-wrap: normal;
        word-break: normal;
        font-size: 10px;
        line-height: 1.15;
      }
      .equipment-name { color: #000; font-weight: 800; }
      .index { color: #000; font-weight: 800; }
      .maintenance-row td,
      .maintenance-row .equipment-name,
      .maintenance-row .index { color: #d11919; }
      .check-cell { vertical-align: middle; }
      .box { display: inline-block; width: 16px; height: 16px; border: 1.8px solid #000; border-radius: 2px; }
      .empty { margin-top: 18px; border: 1.6px dashed #000; border-radius: 4px; padding: 18px; text-align: center; color: #000; font-size: 15px; }
      .final-fields { margin-top: 18px; page-break-inside: avoid; break-inside: avoid; }
      .final-fields h3 { margin: 0 0 6px; font-size: 15px; color: #000; text-transform: uppercase; }
      .observations-box { height: 96px; border: 1.8px solid #000; border-radius: 4px; background: repeating-linear-gradient(to bottom, #fff 0, #fff 27px, #000 28px); }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; margin-top: 28px; page-break-inside: avoid; }
      .signature { border-top: 1.6px solid #000; padding-top: 6px; text-align: center; font-size: 14px; color: #000; }
      @media print {
        html,
        body,
        .document {
          width: auto !important;
          min-width: 0 !important;
          min-height: 0 !important;
        }

        .company,
        .sector-block,
        .equipment-table,
        table,
        tbody {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        .sector-block h3,
        thead,
        tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }
    </style>
    <div class="document visita-externa-report">
      <header class="header">
        <img class="logo" src="${logoBase64}" alt="ACI" />
        <div>
          <h1>Relat&oacute;rio de Visita Externa</h1>
          <p class="subtitle">${safe(relatorio.titulo)} | Rela&ccedil;&atilde;o para inspe&ccedil;&atilde;o dos equipamentos em ${modoTexto}.</p>
        </div>
        <div class="meta">
          <div><strong>Revis&atilde;o:</strong> ${safe(relatorio.revisao)}</div>
          <div><strong>Emiss&atilde;o:</strong> ${safe(formatDate(relatorio.emitido_em))}</div>
          <div><strong>Equipamentos:</strong> ${safe(equipamentos.length)}</div>
        </div>
      </header>

      <section class="visit-fields">
        <div class="field"><span>T&eacute;cnico respons&aacute;vel</span></div>
        <div class="field"><span>Data da visita</span></div>
        <div class="field"><span>Hor&aacute;rio</span></div>
      </section>

      ${
        grupos.length
          ? grupos
              .map(
                ({ empresa, itens }) => `
                  <section class="company">
                    <div class="company-title">
                      <h2>${safe(empresa)}</h2>
                      <span>${safe(itens.length)} equipamento(s)</span>
                    </div>
                    ${
                      relatorio.filtros.separarPorSetor
                        ? renderSetorBlocks(itens)
                        : renderEquipmentTable(itens)
                    }
                  </section>
                `
              )
              .join("")
          : `<div class="empty">Nenhum equipamento encontrado para os filtros selecionados.</div>`
      }

      <section class="final-fields">
        <h3>Observa&ccedil;&otilde;es gerais da visita</h3>
        <div class="observations-box"></div>
        <section class="signatures">
          <div class="signature">Assinatura do t&eacute;cnico</div>
          <div class="signature">Assinatura do respons&aacute;vel do setor</div>
        </section>
      </section>
    </div>
  `;
};

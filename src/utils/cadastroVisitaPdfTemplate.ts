export type CadastroVisitaPdfColunas = {
  setor: boolean;
  modelo: boolean;
  numeroSerie: boolean;
  patrimonio: boolean;
  tag: boolean;
  observacoes: boolean;
};

type CadastroVisitaPdfOptions = {
  cliente?: string;
  dataVisita?: string;
  linhas: number;
  colunas?: Partial<CadastroVisitaPdfColunas>;
};

type CadastroVisitaColumn = {
  key: string;
  label: string;
  weight: number;
  index?: boolean;
};

const defaultColunas: CadastroVisitaPdfColunas = {
  setor: true,
  modelo: true,
  numeroSerie: true,
  patrimonio: true,
  tag: true,
  observacoes: true,
};

const safe = (value?: string | number | null) => {
  const text =
    value === undefined || value === null || value === "" ? "" : String(value);

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
};

const buildColumns = (
  colunas?: Partial<CadastroVisitaPdfColunas>
): CadastroVisitaColumn[] => {
  const selected = { ...defaultColunas, ...colunas };

  return [
    { key: "index", label: "#", weight: 3.2, index: true },
    { key: "equipamento", label: "Equipamento", weight: 18 },
    { key: "fabricante", label: "Fabricante", weight: 13 },
    ...(selected.modelo
      ? [{ key: "modelo", label: "Modelo", weight: 12 }]
      : []),
    ...(selected.numeroSerie
      ? [{ key: "numeroSerie", label: "N. Serie", weight: 14 }]
      : []),
    ...(selected.patrimonio
      ? [{ key: "patrimonio", label: "Patrimonio", weight: 10 }]
      : []),
    ...(selected.tag ? [{ key: "tag", label: "TAG", weight: 8 }] : []),
    ...(selected.setor ? [{ key: "setor", label: "Setor", weight: 12 }] : []),
    ...(selected.observacoes
      ? [{ key: "observacoes", label: "Observacoes", weight: 15 }]
      : []),
  ];
};

const buildColgroup = (columns: CadastroVisitaColumn[]) => {
  const total = columns.reduce((sum, column) => sum + column.weight, 0);

  return columns
    .map(
      (column) =>
        `<col style="width: ${((column.weight / total) * 100).toFixed(2)}%;" />`
    )
    .join("");
};

const buildHeader = (columns: CadastroVisitaColumn[]) =>
  columns.map((column) => `<th>${safe(column.label)}</th>`).join("");

const buildRows = (linhas: number, columns: CadastroVisitaColumn[]) =>
  Array.from({ length: Math.max(1, linhas) })
    .map(
      (_, index) => `
        <tr>
          ${columns
            .map((column) =>
              column.index ? `<td class="index">${index + 1}</td>` : "<td></td>"
            )
            .join("")}
        </tr>
      `
    )
    .join("");

export const buildCadastroVisitaHtml = (
  options: CadastroVisitaPdfOptions,
  logoBase64: string
) => {
  const linhas = Number.isFinite(options.linhas) ? options.linhas : 20;
  const cliente = safe(options.cliente);
  const dataVisita = safe(formatDate(options.dataVisita));
  const columns = buildColumns(options.colunas);

  return `
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #fff;
        color: #000;
        font-family: Arial, Helvetica, sans-serif;
      }
      .document {
        width: 1588px;
        min-height: 1123px;
        padding: 20px 24px 24px;
        background: #fff;
      }
      .header {
        display: grid;
        grid-template-columns: 230px 1fr;
        gap: 24px;
        align-items: start;
        border-top: 5px solid #d71920;
        border-bottom: 2px solid #000;
        padding: 12px 0 14px;
      }
      .logo {
        width: 210px;
        height: auto;
        display: block;
      }
      h1 {
        margin: 0 0 6px;
        color: #000;
        font-size: 30px;
        line-height: 1.1;
      }
      .subtitle {
        margin: 0;
        color: #000;
        font-size: 13px;
        line-height: 1.35;
      }
      .visit-fields {
        display: grid;
        grid-template-columns: 1.5fr .65fr .6fr .7fr;
        gap: 10px;
        margin: 16px 0 14px;
      }
      .field {
        min-height: 48px;
        border: 2px solid #000;
        border-radius: 5px;
        padding: 7px 9px;
      }
      .label {
        display: block;
        margin-bottom: 6px;
        color: #000;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .02em;
        text-transform: uppercase;
      }
      .value {
        min-height: 18px;
        color: #000;
        font-size: 15px;
        font-weight: 700;
      }
      .blank-line {
        display: block;
        height: 18px;
        border-bottom: 2px solid #000;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 11px;
      }
      thead { display: table-header-group; }
      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      th {
        background: #f1f5f9;
        border: 2px solid #000;
        color: #000;
        font-size: 9px;
        padding: 7px 5px;
        text-align: left;
        text-transform: uppercase;
      }
      td {
        height: 41px;
        border: 2px solid #000;
        padding: 5px;
        vertical-align: middle;
      }
      th:first-child, td:first-child { text-align: center; }
      .index {
        color: #000;
        font-weight: 700;
      }
      .footer-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 70px;
        margin-top: 52px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .signature {
        border-top: 2px solid #000;
        padding-top: 7px;
        color: #000;
        font-size: 12px;
        text-align: center;
      }
    </style>
    <div class="document">
      <header class="header">
        <img class="logo" src="${logoBase64}" alt="ACI" />
        <div>
          <h1>Cadastro Visita</h1>
          <p class="subtitle">
            Folha para preenchimento em campo dos equipamentos encontrados no cliente.
            Utilize uma linha por equipamento e separe os itens por setor quando aplicavel.
          </p>
        </div>
      </header>

      <section class="visit-fields">
        <div class="field">
          <span class="label">Cliente</span>
          ${
            cliente
              ? `<div class="value">${cliente}</div>`
              : '<span class="blank-line"></span>'
          }
        </div>
        <div class="field">
          <span class="label">Data da visita</span>
          ${
            dataVisita
              ? `<div class="value">${dataVisita}</div>`
              : '<span class="blank-line"></span>'
          }
        </div>
        <div class="field">
          <span class="label">Horario</span>
          <span class="blank-line"></span>
        </div>
        <div class="field">
          <span class="label">Tecnico</span>
          <span class="blank-line"></span>
        </div>
      </section>

      <table>
        <colgroup>${buildColgroup(columns)}</colgroup>
        <thead>
          <tr>${buildHeader(columns)}</tr>
        </thead>
        <tbody>${buildRows(linhas, columns)}</tbody>
      </table>

      <section class="footer-fields">
        <div class="signature">Assinatura do tecnico</div>
        <div class="signature">Assinatura do responsavel do setor</div>
      </section>
    </div>
  `;
};

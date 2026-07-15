import type { AssinaturasDocumento } from "@/services/assinaturasService";
import type {
  OrcamentoItemSupabase,
  OrcamentoSupabase,
} from "@/services/orcamentosService";
import { PDF_DOCUMENT_BASE_CSS } from "@/utils/pdfDocumentStyles";

const EMPTY = "-";

export const ORCAMENTO_FOOTER_TEXT =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG Cep 36.080-370 - Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const escapeHtml = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return EMPTY;

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const normalizar = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

const formatDate = (iso?: string | null) => {
  if (!iso) return EMPTY;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY;

  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (value?: number | string | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatQuantity = (value?: number | string | null) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const labelMap: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
  servico: "Servico",
  peca: "Peca",
  deslocamento: "Deslocamento",
  outro: "Outro",
  pecas: "Pecas",
  pecas_servicos: "Pecas + Servicos",
  os: "OS",
  avulso: "Avulso",
  dinheiro: "Dinheiro",
  cartao: "Cartao",
  boleto: "Boleto",
  pix: "Pix",
  avista: "A vista",
  a_vista: "A vista",
  parcelado: "Parcelado",
  entrada_parcela: "Entrada + parcelas",
  entrada_parcelas: "Entrada + parcelas",
  entrada_mais_parcelas: "Entrada + parcelas",
  cif: "CIF",
  fob: "FOB",
};

const formatLabel = (value?: string | null) => {
  if (!value) return EMPTY;
  return labelMap[normalizar(value)] || value;
};

const getEmpresaRecord = (orcamento: OrcamentoSupabase) =>
  (orcamento.empresa || {}) as Record<string, unknown>;

const getStringField = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getEmpresaNome = (orcamento: OrcamentoSupabase) =>
  orcamento.empresa?.nome || orcamento.empresa?.nome_fantasia ||
  "Nao informado";

const getEnderecoEmpresa = (orcamento: OrcamentoSupabase) => {
  const empresa = getEmpresaRecord(orcamento);
  const linha1 = [
    getStringField(empresa, ["rua", "logradouro", "endereco"]),
    getStringField(empresa, ["numero"]),
    getStringField(empresa, ["complemento"]),
  ]
    .filter(Boolean)
    .join(", ");
  const linha2 = [
    getStringField(empresa, ["bairro"]),
    getStringField(empresa, ["cidade", "municipio"]),
    getStringField(empresa, ["estado", "uf"]),
  ]
    .filter(Boolean)
    .join(" - ");
  const cep = getStringField(empresa, ["cep"]);

  return [linha1, linha2, cep ? `CEP ${cep}` : ""].filter(Boolean).join(" - ");
};

const getEmpresaCampo = (orcamento: OrcamentoSupabase, keys: string[]) =>
  getStringField(getEmpresaRecord(orcamento), keys);

const getEquipamentoTipo = (orcamento: OrcamentoSupabase) =>
  orcamento.equipamento?.tipo_equipamento?.nome ||
  orcamento.equipamento?.tipo_texto ||
  "";

const getItemServico = (item: OrcamentoItemSupabase) =>
  item.tipo_servico?.nome || item.descricao || formatLabel(item.tipo);

const getItemPeca = (item: OrcamentoItemSupabase) =>
  item.peca_nome || item.peca?.nome || item.descricao || "Peca";

const getModeloFabricantePeca = (item: OrcamentoItemSupabase) => {
  const modelo =
    item.peca_modelo?.nome ||
    item.peca_variacao?.modelo_texto ||
    item.modelo_texto;
  const fabricante =
    item.peca_fabricante?.nome ||
    item.peca_variacao?.fabricante_texto ||
    item.fabricante_texto;

  return [modelo, fabricante].filter(Boolean).join(" / ") || EMPTY;
};

const getItensOrdenados = (orcamento: OrcamentoSupabase) =>
  [...(orcamento.itens || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );

const formatFormaPagamento = (forma?: string | null) => {
  const map: Record<string, string> = {
    dinheiro: "Dinheiro",
    cartao: "Cartao",
    boleto: "Boleto",
    pix: "Pix",
    pagamento_faturado: "Pagamento faturado",
    faturado: "Pagamento faturado",
  };

  return map[normalizar(forma)] || forma || EMPTY;
};

const formatModoPagamento = (modo?: string | null) => {
  const map: Record<string, string> = {
    avista: "A vista",
    a_vista: "A vista",
    vista: "A vista",
    parcelado: "Parcelado",
    entrada_parcelas: "Entrada + parcelas",
    entrada_mais_parcelas: "Entrada + parcelas",
    entrada_parcela: "Entrada + parcelas",
  };

  return map[normalizar(modo)] || modo || EMPTY;
};

const buildField = (
  label: string,
  value?: string | number | null,
  className = ""
) => `
  <div class="field ${className}">
    <span>${label}:</span>
    <strong>${escapeHtml(value)}</strong>
  </div>
`;

const buildRawField = (label: string, html: string, className = "") => `
  <div class="field ${className}">
    <span>${label}:</span>
    <strong>${html}</strong>
  </div>
`;

const buildFinanceItem = (label: string, value?: string | number | null) => `
  <div class="finance-item">
    <span class="label">${label}</span>
    <strong class="value">${escapeHtml(value)}</strong>
  </div>
`;

const buildSectionTitle = (number: string, title: string) => `
  <div class="section-title"><strong>${number}- ${title}</strong></div>
`;

const getStatusClass = (status?: string | null) => {
  const normalized = normalizar(status);

  if (normalized === "aprovado" || normalized === "faturado") return "badge-ok";
  if (normalized === "reprovado" || normalized === "cancelado") return "badge-fail";
  return "badge-muted";
};

const buildStatusBadge = (status?: string | null) => `
  <span class="badge ${getStatusClass(status)}">${escapeHtml(formatLabel(status))}</span>
`;

const buildServicesTable = (items: OrcamentoItemSupabase[]) => {
  if (!items.length) return "";

  return `
    <div class="table-block">
      <h3 class="table-title">Servi&ccedil;os</h3>
      <table class="items-table services-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Servi&ccedil;o</th>
            <th>Garantia</th>
            <th>Qtde</th>
            <th>Valor Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, index) => `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td class="description-cell">
                    <strong>${escapeHtml(getItemServico(item))}</strong>
                    ${
                      item.observacoes
                        ? `<span>${escapeHtml(item.observacoes)}</span>`
                        : ""
                    }
                  </td>
                  <td class="center">${escapeHtml(item.garantia)}</td>
                  <td class="center">${escapeHtml(formatQuantity(item.quantidade))}</td>
                  <td class="right">${escapeHtml(formatCurrency(item.valor_unitario))}</td>
                  <td class="right strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="right strong">Subtotal servi&ccedil;os</td>
            <td class="right strong">${escapeHtml(
              formatCurrency(
                items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0)
              )
            )}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

const buildPartsTable = (items: OrcamentoItemSupabase[]) => {
  if (!items.length) return "";

  return `
    <div class="table-block">
      <h3 class="table-title">Pe&ccedil;as</h3>
      <table class="items-table parts-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Pe&ccedil;a</th>
            <th>Unid.</th>
            <th>Modelo / Fabricante</th>
            <th>Qtde</th>
            <th>Valor Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, index) => `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td class="description-cell">
                    <strong>${escapeHtml(getItemPeca(item))}</strong>
                    ${
                      item.garantia
                        ? `<span>Garantia: ${escapeHtml(item.garantia)}</span>`
                        : ""
                    }
                  </td>
                  <td class="center">un</td>
                  <td>${escapeHtml(getModeloFabricantePeca(item))}</td>
                  <td class="center">${escapeHtml(formatQuantity(item.quantidade))}</td>
                  <td class="right">${escapeHtml(formatCurrency(item.valor_unitario))}</td>
                  <td class="right strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="right strong">Subtotal pe&ccedil;as</td>
            <td class="right strong">${escapeHtml(
              formatCurrency(
                items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0)
              )
            )}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

const buildPaymentSummary = (orcamento: OrcamentoSupabase) => {
  const parcelas =
    orcamento.modo_pagamento === "avista"
      ? EMPTY
      : orcamento.numero_parcelas
        ? `${orcamento.numero_parcelas}x`
        : EMPTY;

  return `
    <div class="payment-grid">
      ${buildField("Forma de pagamento", formatFormaPagamento(orcamento.forma_pagamento))}
      ${buildField("Modo de pagamento", formatModoPagamento(orcamento.modo_pagamento))}
      ${buildField("Condi&ccedil;&otilde;es", orcamento.condicoes_pagamento)}
      ${buildField("Valor total", formatCurrency(orcamento.valor_total))}
      ${buildField("Entrada", orcamento.valor_entrada ? formatCurrency(orcamento.valor_entrada) : EMPTY)}
      ${buildField("Parcelas", parcelas)}
      ${buildField("Valor da parcela", orcamento.valor_parcela ? formatCurrency(orcamento.valor_parcela) : EMPTY)}
      ${buildField("Intervalo", orcamento.dias_entre_parcelas ? `${orcamento.dias_entre_parcelas} dias` : EMPTY)}
    </div>
  `;
};

const buildTechnicalSection = (orcamento: OrcamentoSupabase) => {
  const hasEquipment = Boolean(orcamento.equipamento);
  const hasDetails = Boolean(orcamento.detalhes_orcamento?.trim());
  const hasObservacoes = Boolean(orcamento.observacoes?.trim());

  if (!hasEquipment && !hasDetails && !hasObservacoes) return "";

  return `
    <section class="section">
      ${buildSectionTitle("5", "Informa&ccedil;&otilde;es T&eacute;cnicas")}
      <div class="card-soft technical-box">
        ${
          hasEquipment
            ? `
              <div class="equipment-grid">
                ${buildField("Equipamento", getEquipamentoTipo(orcamento))}
                ${buildField("Marca", orcamento.equipamento?.fabricante)}
                ${buildField("Modelo", orcamento.equipamento?.modelo)}
                ${buildField("N. S&eacute;rie", orcamento.equipamento?.numero_serie)}
                ${buildField("Patrim&ocirc;nio", orcamento.equipamento?.patrimonio)}
                ${buildField("TAG", orcamento.equipamento?.tag)}
                ${buildField("Setor", orcamento.equipamento?.setor)}
              </div>
            `
            : ""
        }
        ${
          hasDetails
            ? `
              <div class="text-box">
                <span>Servi&ccedil;os e informa&ccedil;&otilde;es t&eacute;cnicas</span>
                <p>${escapeHtml(orcamento.detalhes_orcamento)}</p>
              </div>
            `
            : ""
        }
        ${
          hasObservacoes
            ? `
              <div class="text-box">
                <span>Observa&ccedil;&otilde;es t&eacute;cnicas</span>
                <p>${escapeHtml(orcamento.observacoes)}</p>
              </div>
            `
            : ""
        }
      </div>
    </section>
  `;
};

const BASE_CSS = `
  @page {
    size: A4;
    margin: 10mm 11mm 9mm 11mm;
  }

  :root {
    --brand: #b91c1c;
    --ink: #2f3337;
    --value: #3f454b;
    --muted: #5f666d;
    --quiet: #7a828a;
    --line: #cfd4da;
    --light-line: #d7dce1;
    --soft: #f3f5f7;
    --soft-2: #fafbfc;
    --ok: #16834a;
    --ok-soft: #eaf7ef;
    --fail: #b42318;
    --fail-soft: #fff1f0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: var(--ink);
    font-family: Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10.8px;
    line-height: 1.22;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    text-rendering: geometricPrecision;
  }

  .document {
    width: 1123px;
    min-height: 1588px;
    padding: 38px 56px 34px;
    background: #fff;
  }

  .os-header,
  .header {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 22px;
    align-items: start;
    padding-bottom: 11px;
    border-bottom: 1px solid var(--line);
  }

  .logo {
    width: 190px;
    max-height: 58px;
    object-fit: contain;
    display: block;
  }

  .header-title {
    text-align: right;
  }

  .header-title h1 {
    margin: 0 0 5px;
    color: var(--ink);
    font-size: 19px;
    line-height: 1.05;
    font-weight: 750;
    letter-spacing: -0.2px;
  }

  .header-title p,
  .header-title .meta {
    margin: 0;
    color: var(--muted);
    font-size: 10.5px;
    line-height: 1.25;
  }

  .section {
    margin-top: 11px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section-title {
    margin-bottom: 7px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--light-line);
  }

  .section-title strong {
    display: block;
    color: var(--ink);
    font-size: 14px;
    line-height: 1;
    font-weight: 750;
    letter-spacing: -0.1px;
  }

  .card-soft {
    border: 1px solid var(--light-line);
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
  }

  .card-soft {
    padding: 5px 8px;
    background: var(--soft-2);
  }

  .grid {
    display: grid;
    gap: 4px 14px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 18px;
    padding-left: 8px;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px 16px;
    padding-left: 8px;
  }

  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }

  .grid-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .client-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 18px;
    padding-left: 8px;
  }

  .field {
    display: flex;
    gap: 5px;
    align-items: baseline;
    min-width: 0;
  }

  .wide {
    grid-column: span 2;
  }

  .field span,
  .service-line span {
    color: var(--ink);
    font-weight: 700;
    white-space: nowrap;
  }

  .field strong {
    color: var(--value);
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .finance-item .label {
    display: block;
    color: var(--muted);
    font-size: 8.8px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.15px;
  }

  .finance-item .value {
    display: block;
    margin-top: 2px;
    color: var(--value);
    font-size: 10.5px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 9.6px;
    font-weight: 700;
    line-height: 1.15;
  }

  .badge-ok {
    color: var(--ok);
    background: var(--ok-soft);
  }

  .badge-fail {
    color: var(--fail);
    background: var(--fail-soft);
  }

  .badge-muted {
    color: var(--value);
    background: #f0f2f4;
  }

  .table-block {
    margin-top: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .table-title {
    margin: 0 0 6px;
    color: var(--ink);
    font-size: 11.2px;
    font-weight: 750;
  }

  table {
    width: 92%;
    margin: 0 auto;
    border-collapse: collapse;
    border: 1px solid var(--line);
    font-size: 10.1px;
    table-layout: fixed;
    page-break-inside: auto;
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th {
    padding: 3px 6px;
    border: 1px solid var(--line);
    background: var(--soft);
    color: var(--ink);
    font-size: 9px;
    font-weight: 750;
    text-align: center;
    text-transform: uppercase;
  }

  td {
    padding: 2.5px 6px;
    border: 1px solid var(--light-line);
    color: var(--value);
    vertical-align: middle;
  }

  tfoot td {
    background: var(--soft-2);
    font-weight: 750;
  }

  tbody tr:nth-child(even) td {
    background: #fbfcfd;
  }

  .center {
    text-align: center;
  }

  .right {
    text-align: right;
    white-space: nowrap;
  }

  .strong {
    font-weight: 750;
    color: var(--ink);
  }

  .description-cell {
    text-align: left;
    overflow-wrap: anywhere;
  }

  .description-cell strong,
  .description-cell span {
    display: block;
  }

  .description-cell span {
    margin-top: 2px;
    color: var(--muted);
    font-size: 9.2px;
    font-weight: 500;
  }

  .services-table th:nth-child(1),
  .services-table td:nth-child(1),
  .parts-table th:nth-child(1),
  .parts-table td:nth-child(1) {
    width: 38px;
  }

  .services-table th:nth-child(2),
  .services-table td:nth-child(2) {
    width: 43%;
  }

  .services-table th:nth-child(3),
  .services-table td:nth-child(3),
  .services-table th:nth-child(4),
  .services-table td:nth-child(4),
  .services-table th:nth-child(5),
  .services-table td:nth-child(5) {
    width: 11%;
  }

  .services-table th:nth-child(6),
  .services-table td:nth-child(6) {
    width: 15%;
  }

  .parts-table th:nth-child(2),
  .parts-table td:nth-child(2) {
    width: 31%;
  }

  .parts-table th:nth-child(3),
  .parts-table td:nth-child(3),
  .parts-table th:nth-child(5),
  .parts-table td:nth-child(5) {
    width: 8%;
  }

  .parts-table th:nth-child(4),
  .parts-table td:nth-child(4) {
    width: 22%;
  }

  .parts-table th:nth-child(6),
  .parts-table td:nth-child(6),
  .parts-table th:nth-child(7),
  .parts-table td:nth-child(7) {
    width: 12%;
  }

  .finance-grid {
    display: grid;
    grid-template-columns: 1.05fr 1.95fr;
    gap: 8px;
    align-items: stretch;
  }

  .total-card {
    padding: 7px 10px;
    border: 1px solid #cdebd8;
    border-radius: 6px;
    background: var(--ok-soft);
  }

  .total-card .label {
    color: #4f6659;
    font-size: 9.5px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }

  .total-card .value {
    margin-top: 3px;
    color: var(--ok);
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }

  .finance-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px 12px;
    padding: 6px 8px;
    border: 1px solid var(--light-line);
    border-radius: 6px;
    background: #ffffff;
  }

  .compact-grid .field,
  .payment-grid .field,
  .budget-grid .field {
    padding: 2px 0;
  }

  .budget-grid {
    padding: 5px 8px;
    border: 1px solid var(--light-line);
    border-radius: 6px;
    background: var(--soft-2);
  }

  .technical-box {
    display: grid;
    gap: 5px;
  }

  .text-box {
    padding-top: 4px;
    border-top: 1px solid var(--light-line);
  }

  .text-box span {
    display: block;
    margin-bottom: 3px;
    color: var(--muted);
    font-size: 8.8px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .text-box p,
  .terms-box p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .payment-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px 14px;
    padding: 4px 8px;
  }

  .terms-box {
    padding: 5px 9px;
    border: 1px solid #ead7d7;
    border-left: 3px solid var(--brand);
    border-radius: 5px;
    background: #fffafa;
    color: var(--value);
  }

  .terms-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }

  .terms-list li {
    margin: 1px 0;
    padding-left: 9px;
    position: relative;
  }

  .terms-list li::before {
    content: "-";
    position: absolute;
    left: 0;
    color: var(--brand);
    font-weight: 700;
  }

  .authorization {
    margin-top: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .authorization-title {
    margin: 0 0 6px;
    color: var(--ink);
    font-size: 12px;
    font-weight: 750;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
    margin-top: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signature-block {
    min-height: 58px;
    text-align: center;
    font-size: 9.8px;
    color: var(--ink);
  }

  .signature-image {
    width: 100%;
    height: 34px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 4px;
  }

  .signature-image img {
    max-width: 92%;
    max-height: 34px;
    object-fit: contain;
    display: block;
  }

  .signature-line {
    border-top: 1px solid #7c838a;
    margin-bottom: 4px;
  }

  .signature-name {
    display: block;
    margin-top: 1px;
    font-weight: 700;
    color: var(--ink);
  }

  .signature-role {
    display: block;
    color: var(--muted);
    font-size: 9.5px;
  }

  .muted-text {
    margin: 0;
    color: var(--muted);
  }

  @media print {
    .document {
      width: auto;
      min-height: auto;
      padding: 0;
    }
  }
`;

export const buildOrcamentoHtml = (
  orcamento: OrcamentoSupabase,
  logoSrc: string,
  assinaturas: AssinaturasDocumento = {}
) => {
  const itens = getItensOrdenados(orcamento);
  const servicos = itens.filter((item) =>
    ["servico", "deslocamento", "outro"].includes(item.tipo)
  );
  const pecas = itens.filter((item) => item.tipo === "peca");
  const assinaturaOrcamentista = assinaturas.tecnico || assinaturas.responsavel;
  const assinaturaAprovacao = assinaturas.solicitante;
  const nomeOrcamentista =
    assinaturaOrcamentista?.nome || orcamento.responsavel_orcamentista;
  const nomeAprovador = orcamento.aprovado_por || assinaturaAprovacao?.nome;

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orcamento ${escapeHtml(orcamento.numero)}</title>
  <style>${PDF_DOCUMENT_BASE_CSS}${BASE_CSS}</style>
</head>

<body>
  <main class="document">
    <header class="document-header header">
      <img class="logo" src="${logoSrc}" alt="ACI Equipamentos Hospitalares" />

      <div class="document-title header-title">
        <h1>Or&ccedil;amento N&ordm; ${escapeHtml(orcamento.numero)}</h1>
        <div class="document-meta meta">
          <div>Data: ${escapeHtml(formatDate(orcamento.data_orcamento))}</div>
          ${
            orcamento.data_validade
              ? `<div>Validade da proposta: ${escapeHtml(formatDate(orcamento.data_validade))}</div>`
              : ""
          }
        </div>
      </div>
    </header>

    <section class="section">
      ${buildSectionTitle("1", "Dados do Cliente")}
      <div class="info-grid info-grid-2 client-identification">
        ${buildField("Nome", getEmpresaNome(orcamento))}
        ${buildField("CPF/CNPJ", getEmpresaCampo(orcamento, ["cpf_cnpj", "cnpj", "cpf", "documento"]))}
        ${buildField("Endere&ccedil;o", getEnderecoEmpresa(orcamento), "wide")}
        ${buildField("Contato", getEmpresaCampo(orcamento, ["contato", "celular", "telefone"]))}
        ${buildField("E-mail", getEmpresaCampo(orcamento, ["email", "e_mail"]))}
        ${buildField("Nome fantasia", orcamento.empresa?.nome_fantasia)}
        ${buildField(
          "Cidade/Estado",
          [orcamento.empresa?.cidade, orcamento.empresa?.estado].filter(Boolean).join(" - ")
        )}
      </div>
    </section>

    <section class="section">
      ${buildSectionTitle("2", "Itens do Or&ccedil;amento")}
      ${buildServicesTable(servicos)}
      ${buildPartsTable(pecas)}
      ${
        !servicos.length && !pecas.length
          ? `<div class="card-soft muted-text">Nenhum item informado.</div>`
          : ""
      }
    </section>

    <section class="section">
      ${buildSectionTitle("3", "Informa&ccedil;&otilde;es Financeiras")}
      <div class="finance-grid">
        <div class="total-card">
          <span class="label">Total geral</span>
          <div class="value">${escapeHtml(formatCurrency(orcamento.valor_total))}</div>
        </div>

        <div class="finance-details">
          ${buildFinanceItem("Total pe&ccedil;as", formatCurrency(orcamento.valor_pecas))}
          ${buildFinanceItem("Total servi&ccedil;os", formatCurrency(orcamento.valor_servicos))}
          ${buildFinanceItem(
            "Valor antes do desconto",
            formatCurrency(
              Number(orcamento.valor_pecas || 0) +
                Number(orcamento.valor_servicos || 0)
            )
          )}
          ${
            Number(orcamento.desconto_aplicado || 0) > 0
              ? buildFinanceItem(
                  "Desconto aplicado",
                  `${orcamento.desconto_tipo === "percentual" ? `${Number(orcamento.desconto_valor || 0)}%` : formatCurrency(orcamento.desconto_valor)} (${formatCurrency(orcamento.desconto_aplicado)})`
                )
              : ""
          }
          ${buildFinanceItem("Frete", formatLabel(orcamento.frete))}
          ${buildFinanceItem("Forma de pagamento", formatFormaPagamento(orcamento.forma_pagamento))}
          ${buildFinanceItem("Modo de pagamento", formatModoPagamento(orcamento.modo_pagamento))}
          ${buildFinanceItem("Prazo de entrega", orcamento.prazo_entrega)}
          ${buildFinanceItem("Validade", formatDate(orcamento.data_validade))}
        </div>
      </div>
    </section>

    <section class="section">
      ${buildSectionTitle("4", "Dados do Or&ccedil;amento")}
      <div class="card budget-grid grid grid-3">
        ${buildField("Respons&aacute;vel", orcamento.responsavel_orcamentista)}
        ${buildField("Respons&aacute;vel or&ccedil;amentista", nomeOrcamentista)}
        ${buildField("Prazo de entrega", orcamento.prazo_entrega || orcamento.prazo_execucao)}
        ${buildField("Frete", formatLabel(orcamento.frete))}
        ${buildRawField("Estado", buildStatusBadge(orcamento.status))}
        ${buildField("Data", formatDate(orcamento.data_orcamento))}
        ${buildField("Validade", formatDate(orcamento.data_validade))}
        ${buildField("OS vinculada", orcamento.ordem_servico?.numero ? `OS ${orcamento.ordem_servico.numero}` : EMPTY)}
        ${buildField("Identifica&ccedil;&atilde;o", orcamento.identificador)}
      </div>
    </section>

    ${buildTechnicalSection(orcamento)}

    <section class="section">
      ${buildSectionTitle("6", "Pagamento")}
      <div class="card">
        ${buildPaymentSummary(orcamento)}
      </div>
    </section>

    <section class="section">
      ${buildSectionTitle("7", "Termos e Garantia")}
      <div class="terms-box">
        <ul class="terms-list">
          <li>A garantia nao cobre pe&ccedil;as nao substituidas, mau uso e servi&ccedil;os nao executados.</li>
          <li>Pe&ccedil;as, deslocamento, frete e despesas adicionais seguem os itens e condi&ccedil;&otilde;es descritos nesta proposta.</li>
          <li>A execu&ccedil;&atilde;o do servi&ccedil;o fica condicionada &agrave; aprova&ccedil;&atilde;o da proposta dentro do prazo de validade informado.</li>
          ${
            orcamento.garantia
              ? `<li>Garantia informada: ${escapeHtml(orcamento.garantia)}.</li>`
              : ""
          }
          ${
            orcamento.condicoes_pagamento
              ? `<li>Condi&ccedil;&otilde;es de pagamento: ${escapeHtml(orcamento.condicoes_pagamento)}.</li>`
              : ""
          }
        </ul>
      </div>
    </section>

    <section class="authorization">
      <h2 class="authorization-title">Autoriza&ccedil;&atilde;o para realiza&ccedil;&atilde;o do servi&ccedil;o</h2>
      <div class="signature-grid">
        <div class="signature-block">
          <div class="signature-image">
            ${assinaturaOrcamentista?.dataUrl ? `<img src="${assinaturaOrcamentista.dataUrl}" alt="Assinatura do responsavel pelo orcamento" />` : ""}
          </div>
          <div class="signature-line"></div>
          ${nomeOrcamentista ? `<span class="signature-name">${escapeHtml(nomeOrcamentista)}</span>` : ""}
          <span class="signature-role">Respons&aacute;vel Or&ccedil;amentista</span>
        </div>

        <div class="signature-block">
          <div class="signature-image">
            ${assinaturaAprovacao?.dataUrl ? `<img src="${assinaturaAprovacao.dataUrl}" alt="Assinatura do responsavel pela aprovacao" />` : ""}
          </div>
          <div class="signature-line"></div>
          ${nomeAprovador ? `<span class="signature-name">${escapeHtml(nomeAprovador)}</span>` : ""}
          <span class="signature-role">Aprovado por</span>
        </div>
      </div>
    </section>
  </main>
</body>
</html>
  `;
};

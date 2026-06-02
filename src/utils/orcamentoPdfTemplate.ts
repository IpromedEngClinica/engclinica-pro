import type {
  OrcamentoItemSupabase,
  OrcamentoSupabase,
} from "@/services/orcamentosService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { formatDescricaoPecaOrcamento } from "@/utils/orcamentoItens";

const EMPTY = "-";
const FOOTER_TEXT =
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

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;

  return d.toLocaleDateString("pt-BR");
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
  parcelado: "Parcelado",
  entrada_parcela: "Entrada + parcela",
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
  orcamento.empresa?.nome_fantasia ||
  orcamento.empresa?.nome ||
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

const getTipoEquipamento = (item: OrcamentoItemSupabase) =>
  item.tipo_equipamento?.nome || EMPTY;

const getItemServico = (item: OrcamentoItemSupabase) =>
  item.tipo_servico?.nome || item.descricao || formatLabel(item.tipo);

const getItemPeca = (item: OrcamentoItemSupabase) =>
  formatDescricaoPecaOrcamento(item);

const getItensOrdenados = (orcamento: OrcamentoSupabase) =>
  [...(orcamento.itens || [])].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

const getEquipamentoResumo = (orcamento: OrcamentoSupabase) => {
  return getEquipamentoLabel(orcamento.equipamento);
};

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

const getCondicoesPagamento = (orcamento: OrcamentoSupabase) => {
  if (orcamento.condicoes_pagamento?.trim()) {
    return orcamento.condicoes_pagamento.trim();
  }

  const forma = formatFormaPagamento(orcamento.forma_pagamento);
  const modo = normalizar(orcamento.modo_pagamento);
  const numeroParcelas = Number(orcamento.numero_parcelas || 0);
  const diasEntreParcelas = Number(orcamento.dias_entre_parcelas || 30);
  const valorEntrada = Number(orcamento.valor_entrada || 0);
  const valorParcela = Number(orcamento.valor_parcela || 0);

  if (modo === "parcelado" && numeroParcelas > 0) {
    return `${forma} - ${numeroParcelas} parcelas de ${formatCurrency(
      valorParcela
    )} a cada ${diasEntreParcelas} dias.`;
  }

  if (
    ["entrada_parcelas", "entrada_mais_parcelas", "entrada_parcela"].includes(
      modo
    ) &&
    numeroParcelas > 0
  ) {
    return `${forma} - Entrada de ${formatCurrency(
      valorEntrada
    )} + ${numeroParcelas} parcelas de ${formatCurrency(
      valorParcela
    )} a cada ${diasEntreParcelas} dias.`;
  }

  return `${forma} - A vista.`;
};

const buildField = (label: string, value?: string | number | null) => `
  <div class="field">
    <span class="field-label">${label}</span>
    <div class="field-value">${escapeHtml(value)}</div>
  </div>
`;

const buildItemsTable = ({
  title,
  items,
  type,
}: {
  title: string;
  items: OrcamentoItemSupabase[];
  type: "servicos" | "pecas";
}) => {
  const colSpan = type === "servicos" ? 6 : 5;

  const rows = items.length
    ? items
        .map((item, index) => {
          if (type === "servicos") {
            return `
              <tr>
                <td class="col-item">${index + 1}</td>
                <td>${escapeHtml(getItemServico(item))}</td>
                <td>${escapeHtml(getTipoEquipamento(item))}</td>
                <td class="numeric">${escapeHtml(formatQuantity(item.quantidade))}</td>
                <td class="numeric">${escapeHtml(formatCurrency(item.valor_unitario))}</td>
                <td class="numeric strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
              </tr>
            `;
          }

          return `
            <tr>
              <td class="col-item">${index + 1}</td>
              <td>${escapeHtml(getItemPeca(item))}</td>
              <td class="numeric">${escapeHtml(formatQuantity(item.quantidade))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(item.valor_unitario))}</td>
              <td class="numeric strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="${colSpan}" class="empty-state">Nenhum item informado.</td></tr>`;

  const head =
    type === "servicos"
      ? `
        <tr>
          <th>Item</th>
          <th>Servico</th>
          <th>Equipamento</th>
          <th>Qtde</th>
          <th>Valor Unit.</th>
          <th>Total</th>
        </tr>
      `
      : `
        <tr>
          <th>Item</th>
          <th>Peca</th>
          <th>Qtde</th>
          <th>Valor Unit.</th>
          <th>Total</th>
        </tr>
      `;

  return `
    <div class="table-block">
      <div class="table-title">${title}</div>
      <table class="table">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

const BASE_CSS = `
  @page { size: A4; margin: 14mm; }

  :root {
    --primary: #C5161D;
    --text: #111827;
    --muted: #6B7280;
    --section-bg: #F9FAFB;
    --card-bg: #FFFFFF;
    --border: #E5E7EB;
    --success: #16A34A;
    --danger: #DC2626;
    --warning: #D97706;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: var(--text);
    background: #fff;
    font-size: 8.8pt;
    line-height: 1.28;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  .document {
    width: 1123px;
    min-height: 1588px;
    padding: 42px 42px 28px;
    background: #fff;
  }

  .top-bar {
    height: 5px;
    background: var(--primary);
    border-radius: 999px;
    margin-bottom: 12px;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 14px;
  }

  .logo {
    width: 140px;
    height: auto;
    display: block;
  }

  .header-info { text-align: right; }

  .header-info h1 {
    margin: 0 0 8px;
    font-size: 16pt;
    line-height: 1.1;
    font-weight: 700;
    color: var(--text);
  }

  .header-info .meta {
    color: var(--muted);
    font-size: 8.2pt;
    font-weight: 600;
    line-height: 1.45;
  }

  .section {
    margin-top: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section-title {
    margin: 0 0 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
    font-size: 11pt;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0;
    line-height: 1.2;
  }

  .card {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px 16px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 7px 14px;
  }

  .field {
    min-width: 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .field-label {
    display: block;
    margin-bottom: 1px;
    color: var(--muted);
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .field-value {
    color: var(--text);
    font-size: 8.8pt;
    font-weight: 600;
    word-break: break-word;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 7.5pt;
    font-weight: 700;
    white-space: nowrap;
    line-height: 1.2;
  }

  .badge-success { background: rgba(22, 163, 74, 0.12); color: var(--success); }
  .badge-danger { background: rgba(220, 38, 38, 0.12); color: var(--danger); }
  .badge-warning { background: rgba(217, 119, 6, 0.13); color: var(--warning); }
  .badge-muted { background: #EEF2F7; color: var(--muted); }

  .table-block { margin-top: 8px; }

  .table-title {
    margin-bottom: 5px;
    font-size: 9.2pt;
    font-weight: 700;
    color: var(--text);
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    font-size: 8.2pt;
    page-break-inside: auto;
  }

  .table thead { display: table-header-group; }
  .table tr { page-break-inside: avoid; break-inside: avoid; }

  .table th {
    background: #F3F4F6;
    color: var(--text);
    font-size: 7.4pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 5px 6px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }

  .table td {
    padding: 5px 6px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    color: var(--text);
    font-weight: 500;
  }

  .table tbody tr:last-child td { border-bottom: 0; }
  .col-item { width: 34px; text-align: center; color: var(--muted); font-weight: 700; }
  .numeric { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .empty-state { color: var(--muted); font-weight: 700; text-align: center; }

  .totals-grid {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 10px 16px;
    align-items: stretch;
  }

  .total-card-success {
    border: 1px solid rgba(22, 163, 74, 0.18);
    background: rgba(22, 163, 74, 0.08);
    border-radius: 6px;
    padding: 10px;
  }

  .total-card-success span {
    display: block;
    color: var(--muted);
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
  }

  .total-card-success strong {
    display: block;
    margin-top: 3px;
    color: var(--success);
    font-size: 14pt;
    font-weight: 700;
  }

  .payment-conditions {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #ffffff;
  }

  .payment-conditions span {
    display: block;
    color: var(--muted);
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .payment-conditions strong {
    color: var(--text);
    font-size: 8.8pt;
    font-weight: 700;
  }

  .text-block {
    min-height: 30px;
    white-space: pre-wrap;
    color: var(--text);
    font-weight: 400;
  }

  .standard-note {
    margin-top: 14px;
    padding: 8px 10px;
    border-left: 3px solid var(--primary);
    background: rgba(197, 22, 29, 0.04);
    color: var(--text);
    font-size: 8.4pt;
    font-weight: 600;
    border-radius: 4px;
  }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 120px;
    column-gap: 26px;
    margin-top: 26px;
    align-items: start;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signature-block {
    height: 58px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    text-align: center;
    color: var(--muted);
    font-size: 8pt;
    font-weight: 600;
  }

  .signature-line {
    width: 100%;
    border-top: 1px dashed #9CA3AF;
    height: 1px;
    margin: 0 0 7px;
  }

  .signature-name {
    display: block;
    margin-top: 2px;
    color: var(--text);
    font-weight: 700;
  }

  .footer {
    margin-top: 22px;
    padding-top: 8px;
    padding-bottom: 10px;
    border-top: 1px solid var(--border);
    color: #9CA3AF;
    font-size: 8pt;
    line-height: 1.35;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

export const buildOrcamentoHtml = (
  orcamento: OrcamentoSupabase,
  logoSrc: string
) => {
  const itens = getItensOrdenados(orcamento);
  const servicos = itens.filter((item) =>
    ["servico", "deslocamento", "outro"].includes(item.tipo)
  );
  const pecas = itens.filter((item) => item.tipo === "peca");
  const detalhesHtml = orcamento.detalhes_orcamento?.trim()
    ? `
      <section class="section">
        <div class="section-title">5 - Detalhes do Or&ccedil;amento</div>

        <div class="card">
          <div class="text-block">${escapeHtml(orcamento.detalhes_orcamento)}</div>
        </div>
      </section>
    `
    : "";
  const condicoesPagamento = getCondicoesPagamento(orcamento);

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orcamento ${escapeHtml(orcamento.numero)}</title>
  <style>${BASE_CSS}</style>
</head>

<body>
  <main class="document">
    <div class="top-bar"></div>

    <header class="header">
      <div>
        <img class="logo" src="${logoSrc}" alt="ACI Equipamentos Hospitalares" />
      </div>

      <div class="header-info">
        <h1>Or&ccedil;amento N&ordm; ${escapeHtml(orcamento.numero)}</h1>
        <div class="meta">
          <div>Data: ${escapeHtml(formatDate(orcamento.data_orcamento))}</div>
          <div>Validade da proposta: ${escapeHtml(formatDate(orcamento.data_validade))}</div>
        </div>
      </div>
    </header>

    <section class="section">
      <div class="section-title">1 - Dados do Cliente</div>

      <div class="card grid-2">
        ${buildField("Nome", getEmpresaNome(orcamento))}
        ${buildField("CPF/CNPJ", getEmpresaCampo(orcamento, ["cpf_cnpj", "cnpj", "cpf", "documento"]))}
        ${buildField("Endereco", getEnderecoEmpresa(orcamento))}
        ${buildField("Contato", getEmpresaCampo(orcamento, ["contato", "celular", "telefone"]))}
        ${buildField("E-mail", getEmpresaCampo(orcamento, ["email", "e_mail"]))}
        ${buildField("Nome fantasia", orcamento.empresa?.nome_fantasia)}
      </div>
    </section>

    <section class="section">
      <div class="section-title">2 - Dados do Or&ccedil;amento</div>

      <div class="card grid-3">
        ${buildField("Numero", orcamento.numero)}
        ${buildField("Data de criacao", formatDate(orcamento.data_orcamento))}
        ${buildField("Validade da proposta", formatDate(orcamento.data_validade))}
        ${buildField("Frete", formatLabel(orcamento.frete))}
        ${buildField("OS vinculada", orcamento.ordem_servico?.numero)}
        ${buildField("Equipamento", getEquipamentoResumo(orcamento))}
      </div>
    </section>

    <section class="section">
      <div class="section-title">3 - Itens do Or&ccedil;amento</div>

      ${servicos.length ? buildItemsTable({ title: "Servi&ccedil;os", items: servicos, type: "servicos" }) : ""}
      ${pecas.length ? buildItemsTable({ title: "Pe&ccedil;as", items: pecas, type: "pecas" }) : ""}
      ${!servicos.length && !pecas.length ? buildItemsTable({ title: "Itens", items: [], type: "pecas" }) : ""}
    </section>

    <section class="section">
      <div class="section-title">4 - Informa&ccedil;&otilde;es Financeiras</div>

      <div class="card totals-grid">
        <div class="total-card-success">
          <span>Valor total</span>
          <strong>${escapeHtml(formatCurrency(orcamento.valor_total))}</strong>
        </div>

        <div class="grid-2">
          ${buildField("Total pecas", formatCurrency(orcamento.valor_pecas))}
          ${buildField("Total servicos", formatCurrency(orcamento.valor_servicos))}
          ${buildField("Forma de pagamento", formatFormaPagamento(orcamento.forma_pagamento))}
          ${buildField("Modo de pagamento", formatModoPagamento(orcamento.modo_pagamento))}
        </div>
      </div>

      <div class="payment-conditions">
        <span>Condicoes de pagamento</span>
        <strong>${escapeHtml(condicoesPagamento)}</strong>
      </div>
    </section>

    ${detalhesHtml}

    <div class="standard-note">
      A garantia nao cobre pecas nao substituidas, mau uso e servicos nao executados.
    </div>

    <footer class="footer">
      ${escapeHtml(FOOTER_TEXT)}
    </footer>
  </main>
</body>
</html>
  `;
};

import type {
  AssinaturasDocumento,
} from "@/services/assinaturasService";
import type {
  OrcamentoItemSupabase,
  OrcamentoSupabase,
} from "@/services/orcamentosService";
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
                <td>${escapeHtml(formatQuantity(item.quantidade))}</td>
                <td>${escapeHtml(formatCurrency(item.valor_unitario))}</td>
                <td class="strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
              </tr>
            `;
          }

          return `
            <tr>
              <td class="col-item">${index + 1}</td>
              <td>${escapeHtml(getItemPeca(item))}</td>
              <td>${escapeHtml(formatQuantity(item.quantidade))}</td>
              <td>${escapeHtml(formatCurrency(item.valor_unitario))}</td>
              <td class="strong">${escapeHtml(formatCurrency(item.valor_total))}</td>
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
      <table class="table table-${type}">
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
    font-size: 8pt;
    line-height: 1.24;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  .document {
    width: 1123px;
    min-height: 1588px;
    padding: 40px 42px 28px;
    background: #fff;
    display: flex;
    flex-direction: column;
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
    min-height: 128px;
    margin-bottom: -8px;
  }

  .logo {
    width: 360px;
    height: auto;
    display: block;
    margin-top: 6px;
  }

  .header-info { text-align: right; }

  .header-info h1 {
    margin: 0 0 8px;
    font-size: 15pt;
    line-height: 1.1;
    font-weight: 700;
    color: var(--text);
  }

  .header-info .meta {
    color: var(--muted);
    font-size: 7.6pt;
    font-weight: 600;
    line-height: 1.45;
  }

  .section {
    margin-top: 9px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section-title {
    margin: 0 0 5px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
    font-size: 10.2pt;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0;
    line-height: 1.2;
  }

  .card {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 9px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 14px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px 12px;
  }

  .client-card {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr);
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  .client-card .field {
    min-height: 37px;
    padding: 7px 9px;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .client-card .field:nth-child(2n) {
    border-right: 0;
  }

  .client-card .field:nth-last-child(-n + 2) {
    border-bottom: 0;
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
    font-size: 6.7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .field-value {
    color: var(--text);
    font-size: 7.8pt;
    font-weight: 600;
    line-height: 1.22;
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

  .table-block {
    margin-top: 9px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .table-title {
    margin: 0;
    padding: 6px 8px;
    background: #FAFAFA;
    border-bottom: 1px solid var(--border);
    font-size: 8.5pt;
    font-weight: 700;
    color: var(--text);
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border: 0;
    border-radius: 0;
    overflow: hidden;
    font-size: 7.8pt;
    table-layout: fixed;
    page-break-inside: auto;
  }

  .table thead { display: table-header-group; }
  .table tr { page-break-inside: avoid; break-inside: avoid; }

  .table th {
    background: #F3F4F6;
    color: var(--text);
    font-size: 6.9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 5px 6px;
    border-bottom: 1px solid var(--border);
    text-align: center;
    border-right: 1px solid var(--border);
  }

  .table td {
    padding: 6px 6px;
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    vertical-align: middle;
    color: var(--text);
    font-weight: 500;
    text-align: center;
  }

  .table tbody tr:last-child td { border-bottom: 0; }
  .table th:last-child,
  .table td:last-child { border-right: 0; }
  .col-item { width: 34px; text-align: center; color: var(--muted); font-weight: 700; }
  .numeric { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .empty-state { color: var(--muted); font-weight: 700; text-align: center; }

  .table-servicos th:nth-child(1),
  .table-servicos td:nth-child(1) { width: 48px; }
  .table-servicos th:nth-child(2),
  .table-servicos td:nth-child(2) { width: 51%; }
  .table-servicos th:nth-child(3),
  .table-servicos td:nth-child(3) { width: 16%; }
  .table-servicos th:nth-child(4),
  .table-servicos td:nth-child(4) { width: 8%; }
  .table-servicos th:nth-child(5),
  .table-servicos td:nth-child(5),
  .table-servicos th:nth-child(6),
  .table-servicos td:nth-child(6) { width: 12%; }

  .table-pecas th:nth-child(1),
  .table-pecas td:nth-child(1) { width: 48px; }
  .table-pecas th:nth-child(2),
  .table-pecas td:nth-child(2) { width: 56%; }
  .table-pecas th:nth-child(3),
  .table-pecas td:nth-child(3) { width: 9%; }
  .table-pecas th:nth-child(4),
  .table-pecas td:nth-child(4),
  .table-pecas th:nth-child(5),
  .table-pecas td:nth-child(5) { width: 14%; }

  .totals-grid {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 10px 16px;
    align-items: stretch;
  }

  .total-card-success {
    border: 1px solid rgba(22, 163, 74, 0.18);
    background: rgba(22, 163, 74, 0.08);
    border-radius: 6px;
    padding: 8px 10px;
  }

  .total-card-success span {
    display: block;
    color: var(--muted);
    font-size: 6.7pt;
    font-weight: 700;
    text-transform: uppercase;
  }

  .total-card-success strong {
    display: block;
    margin-top: 3px;
    color: var(--success);
    font-size: 12.5pt;
    font-weight: 700;
  }

  .text-block {
    min-height: 30px;
    white-space: pre-wrap;
    color: var(--text);
    font-weight: 400;
    font-size: 7.8pt;
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
    grid-template-columns: 1fr 1fr;
    column-gap: 46px;
    margin-top: 26px;
    align-items: start;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signature-block {
    min-height: 78px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    text-align: center;
    color: var(--muted);
    font-size: 7.8pt;
    font-weight: 600;
  }

  .signature-image {
    height: 44px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 2px;
  }

  .signature-image img {
    display: block;
    max-width: 220px;
    max-height: 42px;
    object-fit: contain;
  }

  .signature-line {
    width: 100%;
    border-top: 1px solid #9CA3AF;
    height: 1px;
    margin: 0 0 5px;
  }

  .signature-name {
    display: block;
    margin-top: 2px;
    color: var(--text);
    font-weight: 700;
  }

  .authorization-title {
    margin: 0 0 8px;
    font-size: 9.4pt;
    font-weight: 700;
    color: var(--text);
  }

  .document-tail {
    margin-top: auto;
    padding-top: 26px;
    break-inside: avoid;
    page-break-inside: avoid;
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
  logoSrc: string,
  assinaturas: AssinaturasDocumento = {}
) => {
  const itens = getItensOrdenados(orcamento);
  const servicos = itens.filter((item) =>
    ["servico", "deslocamento", "outro"].includes(item.tipo)
  );
  const pecas = itens.filter((item) => item.tipo === "peca");
  const detalhesHtml = orcamento.detalhes_orcamento?.trim()
    ? `
      <section class="section">
        <div class="section-title">4 - Descri&ccedil;&atilde;o do servi&ccedil;o</div>

        <div class="card">
          <div class="text-block">${escapeHtml(orcamento.detalhes_orcamento)}</div>
        </div>
      </section>
    `
    : "";
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

      <div class="card client-card">
        ${buildField("Nome", getEmpresaNome(orcamento))}
        ${buildField("CPF/CNPJ", getEmpresaCampo(orcamento, ["cpf_cnpj", "cnpj", "cpf", "documento"]))}
        ${buildField("Endereco", getEnderecoEmpresa(orcamento))}
        ${buildField("Contato", getEmpresaCampo(orcamento, ["contato", "celular", "telefone"]))}
        ${buildField("E-mail", getEmpresaCampo(orcamento, ["email", "e_mail"]))}
        ${buildField("Nome fantasia", orcamento.empresa?.nome_fantasia)}
      </div>
    </section>

    <section class="section">
      <div class="section-title">2 - Itens do Or&ccedil;amento</div>

      ${servicos.length ? buildItemsTable({ title: "Servi&ccedil;os", items: servicos, type: "servicos" }) : ""}
      ${pecas.length ? buildItemsTable({ title: "Pe&ccedil;as", items: pecas, type: "pecas" }) : ""}
      ${!servicos.length && !pecas.length ? buildItemsTable({ title: "Itens", items: [], type: "pecas" }) : ""}
    </section>

    <section class="section">
      <div class="section-title">3 - Informa&ccedil;&otilde;es Financeiras</div>

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
          ${buildField("Prazo de entrega", orcamento.prazo_entrega)}
          ${buildField("Validade da proposta", formatDate(orcamento.data_validade))}
        </div>
      </div>
    </section>

    ${detalhesHtml}

    <div class="document-tail">
      <div class="standard-note">
        A garantia nao cobre pecas nao substituidas, mau uso e servicos nao executados.
      </div>

      <section class="authorization">
        <div class="authorization-title">Autoriza&ccedil;&atilde;o para realiza&ccedil;&atilde;o do servi&ccedil;o</div>
        <div class="signatures">
          <div class="signature-block">
            <div class="signature-image">
              ${assinaturaOrcamentista?.dataUrl ? `<img src="${assinaturaOrcamentista.dataUrl}" alt="Assinatura do responsavel pelo orcamento">` : ""}
            </div>
            <div class="signature-line"></div>
            ${nomeOrcamentista ? `<span class="signature-name">${escapeHtml(nomeOrcamentista)}</span>` : ""}
            <span>Respons&aacute;vel Or&ccedil;amentista</span>
          </div>

          <div class="signature-block">
            <div class="signature-image">
              ${assinaturaAprovacao?.dataUrl ? `<img src="${assinaturaAprovacao.dataUrl}" alt="Assinatura do responsavel pela aprovacao">` : ""}
            </div>
            <div class="signature-line"></div>
            ${nomeAprovador ? `<span class="signature-name">${escapeHtml(nomeAprovador)}</span>` : ""}
            <span>Aprovado por</span>
          </div>
        </div>
      </section>

      <footer class="footer">
        ${escapeHtml(FOOTER_TEXT)}
      </footer>
    </div>
  </main>
</body>
</html>
  `;
};

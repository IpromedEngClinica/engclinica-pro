import type { ProtocoloOSSupabase } from "@/services/protocolosService";

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

const formatDateTime = (iso?: string | null) => {
  if (!iso) return EMPTY;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatTipo = (tipo?: string | null) => {
  const map: Record<string, string> = {
    recolhimento: "Recolhimento",
    entrega: "Entrega",
  };

  return map[normalizar(tipo)] || tipo || EMPTY;
};

const getTipoBadge = (tipo?: string | null) =>
  normalizar(tipo) === "entrega"
    ? `<span class="badge badge-success">${escapeHtml(formatTipo(tipo))}</span>`
    : `<span class="badge badge-warning">${escapeHtml(formatTipo(tipo))}</span>`;

const getEmpresaRecord = (protocolo: ProtocoloOSSupabase) =>
  (protocolo.empresa || {}) as Record<string, unknown>;

const getStringField = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getEmpresaNome = (protocolo: ProtocoloOSSupabase) =>
  protocolo.empresa?.nome_fantasia ||
  protocolo.empresa?.nome ||
  "Nao informado";

const getEmpresaCampo = (protocolo: ProtocoloOSSupabase, keys: string[]) =>
  getStringField(getEmpresaRecord(protocolo), keys);

const getEnderecoEmpresa = (protocolo: ProtocoloOSSupabase) => {
  const empresa = getEmpresaRecord(protocolo);
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

const getEquipamentoTipo = (protocolo: ProtocoloOSSupabase) =>
  protocolo.equipamento?.tipo_equipamento?.nome ||
  protocolo.equipamento?.tipo_texto ||
  "";

const getTitulo = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega"
    ? `Protocolo de Entrega N&ordm; ${escapeHtml(protocolo.numero)}`
    : `Protocolo de Recolhimento N&ordm; ${escapeHtml(protocolo.numero)}`;

const getDataOperacionalLabel = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega" ? "Data da entrega" : "Data do recolhimento";

const getDataOperacional = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega"
    ? protocolo.data_entrega || protocolo.data_protocolo
    : protocolo.data_recolhimento || protocolo.data_protocolo;

const buildField = (label: string, value?: string | number | null) => `
  <div class="field">
    <span class="field-label">${label}</span>
    <div class="field-value">${escapeHtml(value)}</div>
  </div>
`;

const buildAcessoriosHtml = (protocolo: ProtocoloOSSupabase) => {
  const acessorios = protocolo.acessorios || [];

  if (!acessorios.length) return "";

  const title =
    protocolo.tipo === "entrega"
      ? "4 - Acess&oacute;rios Entregues"
      : "4 - Acess&oacute;rios Recebidos";

  const rows = acessorios
    .map(
      (item, index) => `
        <tr>
          <td class="col-item">${index + 1}</td>
          <td>${escapeHtml(item.descricao)}</td>
          <td class="numeric">${escapeHtml(item.quantidade || 1)}</td>
          <td>${item.conferido ? "Sim" : "Nao"}</td>
          <td>${escapeHtml(item.observacoes)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="section">
      <div class="section-title">${title}</div>

      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Descricao</th>
            <th>Quantidade</th>
            <th>Conferido</th>
            <th>Observacao</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
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

  .text-block {
    min-height: 30px;
    white-space: pre-wrap;
    color: var(--text);
    font-weight: 400;
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

export const buildProtocoloHtml = (
  protocolo: ProtocoloOSSupabase,
  logoSrc: string
) => {
  const isEntrega = protocolo.tipo === "entrega";
  const dadosTitle = isEntrega
    ? "3 - Dados da Entrega"
    : "3 - Dados do Recolhimento";
  const responsavelLabel = isEntrega
    ? "Responsavel pelo recebimento"
    : "Responsavel pela coleta";
  const observacoesTitle = protocolo.acessorios?.length
    ? "5 - Observa&ccedil;&otilde;es"
    : "4 - Observa&ccedil;&otilde;es";
  const assinaturasTitle = protocolo.acessorios?.length
    ? "6 - Assinaturas"
    : "5 - Assinaturas";
  const assinaturaCliente = isEntrega
    ? "Assinatura de quem recebeu"
    : "Assinatura do cliente/entregador";
  const assinaturaACI = isEntrega
    ? "Responsavel tecnico"
    : "Responsavel pela coleta";

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Protocolo ${escapeHtml(protocolo.numero)}</title>
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
        <h1>${getTitulo(protocolo)}</h1>
        <div class="meta">
          <div>Tipo: ${getTipoBadge(protocolo.tipo)}</div>
          <div>Data: ${escapeHtml(formatDateTime(protocolo.data_protocolo))}</div>
          <div>OS: ${escapeHtml(protocolo.ordem_servico?.numero)}</div>
        </div>
      </div>
    </header>

    <section class="section">
      <div class="section-title">1 - Dados do Cliente</div>

      <div class="card grid-2">
        ${buildField("Nome", getEmpresaNome(protocolo))}
        ${buildField("CPF/CNPJ", getEmpresaCampo(protocolo, ["cpf_cnpj", "cnpj", "cpf", "documento"]))}
        ${buildField("Endereco", getEnderecoEmpresa(protocolo))}
        ${buildField("Contato", getEmpresaCampo(protocolo, ["contato", "celular", "telefone"]))}
        ${buildField("E-mail", getEmpresaCampo(protocolo, ["email", "e_mail"]))}
        ${buildField("Nome fantasia", protocolo.empresa?.nome_fantasia)}
      </div>
    </section>

    <section class="section">
      <div class="section-title">2 - Instrumento / Equipamento</div>

      <div class="card grid-3">
        ${buildField("Tipo", getEquipamentoTipo(protocolo))}
        ${buildField("Fabricante", protocolo.equipamento?.fabricante)}
        ${buildField("Modelo", protocolo.equipamento?.modelo)}
        ${buildField("Serie", protocolo.equipamento?.numero_serie)}
        ${buildField("Patrimonio", protocolo.equipamento?.patrimonio)}
        ${buildField("TAG", protocolo.equipamento?.tag)}
        ${buildField("Setor", protocolo.equipamento?.setor)}
      </div>
    </section>

    <section class="section">
      <div class="section-title">${dadosTitle}</div>

      <div class="card grid-2">
        ${buildField(responsavelLabel, protocolo.responsavel_nome)}
        ${buildField("Documento", protocolo.responsavel_documento)}
        ${buildField("Contato", protocolo.responsavel_contato)}
        ${buildField(getDataOperacionalLabel(protocolo), formatDateTime(getDataOperacional(protocolo)))}
        ${buildField("OS vinculada", protocolo.ordem_servico?.numero)}
        ${buildField("Status", protocolo.status)}
      </div>
    </section>

    ${buildAcessoriosHtml(protocolo)}

    <section class="section">
      <div class="section-title">${observacoesTitle}</div>

      <div class="card grid-2">
        <div class="field">
          <span class="field-label">Problema relatado</span>
          <div class="text-block">${escapeHtml(protocolo.problema_relatado)}</div>
        </div>

        <div class="field">
          <span class="field-label">Observacoes</span>
          <div class="text-block">${escapeHtml(protocolo.observacoes)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">${assinaturasTitle}</div>
    </section>

    <section class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div>${assinaturaCliente}</div>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div>${assinaturaACI} / ACI</div>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div>Data</div>
      </div>
    </section>

    <footer class="footer">
      ${escapeHtml(FOOTER_TEXT)}
    </footer>
  </main>
</body>
</html>
  `;
};

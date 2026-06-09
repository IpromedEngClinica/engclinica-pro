import type { EmpresaSupabase } from "@/services/empresasService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";

const FOOTER_TEXT =
  "ACI Comércio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica - Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora - MG Cep 36.080-370 - Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const escapeHtml = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "—";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome_fantasia || os.empresa?.nome || os.solicitante_texto || "—";

const getEnderecoEmpresa = (empresa?: EmpresaSupabase | null) => {
  if (!empresa) return "—";

  const linha1 = [empresa.rua, empresa.numero, empresa.complemento]
    .filter(Boolean)
    .join(", ");

  const linha2 = [empresa.bairro, empresa.cidade, empresa.estado]
    .filter(Boolean)
    .join(" - ");

  const cep = empresa.cep ? `CEP ${empresa.cep}` : "";

  return [linha1, linha2, cep].filter(Boolean).join(" - ") || "—";
};

const getTipoEquipamento = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome ||
  os.equipamento?.tipo_texto ||
  "—";

const getContato = (empresa?: EmpresaSupabase | null) =>
  empresa?.contato || empresa?.celular || empresa?.telefone || "—";

const getChecklistPreventiva = (os: OrdemServicoSupabase) => {
  const checklist = os.checklist_preventiva;

  if (Array.isArray(checklist)) return checklist[0] || null;

  return checklist || null;
};

const normalizarResposta = (resposta?: string | null) =>
  (resposta || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const formatResposta = (respostaRaw?: string | null) => {
  const resposta = normalizarResposta(respostaRaw);

  const map: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Não Conforme",
    nao_aplica: "N/A",
    n_a: "N/A",
    na: "N/A",
    aprovado: "Aprovado para uso",
    nao_aprovado: "Não aprovado para uso",
    aprovado_com_restricao: "Aprovado com restrição",
  };

  return map[resposta] || respostaRaw || "—";
};

const getChecklistStatus = (respostaRaw?: string | null) => {
  const resposta = normalizarResposta(respostaRaw);

  if (resposta === "conforme" || resposta === "aprovado") {
    return {
      statusClass: "status-success",
      icon: "✓",
      label: formatResposta(respostaRaw),
    };
  }

  if (resposta === "nao_conforme" || resposta === "nao_aprovado") {
    return {
      statusClass: "status-danger",
      icon: "✕",
      label: formatResposta(respostaRaw),
    };
  }

  if (resposta === "aprovado_com_restricao") {
    return {
      statusClass: "status-warning",
      icon: "!",
      label: formatResposta(respostaRaw),
    };
  }

  return {
    statusClass: "status-muted",
    icon: "—",
    label: "N/A",
  };
};

const getResultadoBadge = (resultado?: string | null) => {
  const normalized = normalizarResposta(resultado);

  if (normalized === "aprovado") {
    return '<span class="badge badge-success">Aprovado para uso</span>';
  }

  if (normalized === "nao_aprovado") {
    return '<span class="badge badge-danger">Não aprovado para uso</span>';
  }

  if (normalized === "aprovado_com_restricao") {
    return '<span class="badge badge-warning">Aprovado com restrição</span>';
  }

  return '<span class="badge badge-muted">—</span>';
};

const buildAcessoriosHtml = (os: OrdemServicoSupabase) => {
  const acessorios = os.acessorios || [];

  if (!acessorios.length) {
    return "";
  }

  return `
    <section class="section">
      <div class="section-title">5 - Acessórios</div>

      <div class="card">
        <div class="accessory-list">
      ${acessorios
        .map((item) => {
          const quantidade = Number(item.quantidade || 1);

          return `
            <div class="accessory-item">
              <div>
                <strong>${escapeHtml(item.descricao)}</strong>
                ${
                  item.observacoes
                    ? `<p>${escapeHtml(item.observacoes)}</p>`
                    : ""
                }
              </div>
              <span>${quantidade}x</span>
            </div>
          `;
        })
        .join("")}
        </div>
      </div>
    </section>
  `;
};

const buildChecklistHtml = (os: OrdemServicoSupabase) => {
  const checklist = getChecklistPreventiva(os);

  if (!checklist) return "";

  const itens = [...(checklist.itens || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );

  const rows = itens.length
    ? itens
        .map((item, index) => {
          const status = getChecklistStatus(item.resposta);
          const observacao = item.observacao || "";

          return `
            <tr>
              <td class="col-item">${index + 1}</td>
              <td class="col-desc">${escapeHtml(item.descricao)}</td>
              <td class="col-status ${status.statusClass}">
                <span class="status-symbol">${status.icon}</span>
                <span>${escapeHtml(status.label)}</span>
              </td>
              <td class="col-obs">${escapeHtml(observacao)}</td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="4" class="empty-state">Nenhum item informado.</td></tr>';

  return `
    <section class="section">
      <div class="section-title">3.1 - Checklist técnico</div>

      <div class="card checklist-card">
        <div class="checklist-header">
          <div>
            <div class="checklist-title">${escapeHtml(checklist.titulo_procedimento || "Checklist de preventiva")}</div>
            <div class="checklist-subtitle">${escapeHtml(checklist.tipo_equipamento_nome || getTipoEquipamento(os))}</div>
          </div>
        </div>

        <table class="check-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Descrição</th>
              <th>Resultado</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="summary-line">
          <div class="summary-cell summary-result">
            <strong>Resultado Geral:</strong>
            ${getResultadoBadge(checklist.resultado_geral)}
          </div>
          <div class="summary-cell">
            <strong>Validade da Preventiva:</strong>
            <span>${escapeHtml(formatDate(checklist.data_validade))}</span>
          </div>
          <div class="summary-cell">
            <strong>Validade:</strong>
            <span>${escapeHtml(checklist.validade_meses || 12)} meses</span>
          </div>
        </div>

        ${
          checklist.observacoes
            ? `<div class="checklist-observation">
                <span>Observações do checklist</span>
                <p>${escapeHtml(checklist.observacoes)}</p>
              </div>`
            : ""
        }
      </div>
    </section>
  `;
};

const isPreventiva = (os: OrdemServicoSupabase) => {
  const tipo = os.tipo_os?.nome?.toLowerCase() || "";
  const descricao = os.descricao_servico?.toLowerCase() || "";

  return (
    tipo.includes("preventiva") ||
    descricao.includes("preventiva") ||
    Boolean(getChecklistPreventiva(os))
  );
};

export const buildOrdemServicoHtml = (
  os: OrdemServicoSupabase,
  logoSrc: string
) => {
  const preventiva = isPreventiva(os);
  const checklistHtml = buildChecklistHtml(os);
  const observacoesClass = os.observacoes?.trim()
    ? "card observations"
    : "card observations observations-empty";

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Serviço ${escapeHtml(os.numero)}</title>

  <style>
    @page {
      size: A4;
      margin: 14mm;
    }

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

    * {
      box-sizing: border-box;
    }

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

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      border-top: 6px solid var(--primary);
      padding-top: 14px;
      margin-bottom: 14px;
    }

    .logo {
      width: 190px;
      height: auto;
      display: block;
    }

    .header-info {
      text-align: right;
    }

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

    .service-description {
      color: var(--text);
      font-size: 8.8pt;
      font-weight: 400;
      word-break: break-word;
    }

    .service-description,
    .observations {
      white-space: pre-wrap;
    }

    .observations {
      min-height: 34px;
    }

    .observations-empty {
      min-height: 30px;
      padding: 8px 10px;
    }

    .checklist-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .checklist-title {
      font-size: 10pt;
      font-weight: 700;
      color: var(--text);
    }

    .checklist-subtitle {
      margin-top: 1px;
      font-size: 8pt;
      font-weight: 600;
      color: var(--muted);
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

    .badge-success {
      background: rgba(22, 163, 74, 0.12);
      color: var(--success);
    }

    .badge-danger {
      background: rgba(220, 38, 38, 0.12);
      color: var(--danger);
    }

    .badge-warning {
      background: rgba(217, 119, 6, 0.13);
      color: var(--warning);
    }

    .badge-muted {
      background: #EEF2F7;
      color: var(--muted);
    }

    .checklist-card {
      break-inside: auto;
      page-break-inside: auto;
    }

    .check-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      font-size: 8.2pt;
      page-break-inside: auto;
    }

    .check-table thead {
      display: table-header-group;
    }

    .check-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .check-table th {
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

    .check-table td {
      padding: 5px 6px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      color: var(--text);
      font-weight: 500;
    }

    .check-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .col-item {
      width: 32px;
      text-align: center;
      color: var(--muted);
      font-weight: 700;
    }

    .col-desc {
      width: auto;
    }

    .col-status {
      width: 150px;
      white-space: nowrap;
      font-weight: 700;
    }

    .col-obs {
      width: 170px;
      color: var(--muted);
      font-weight: 500;
    }

    .status-symbol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      margin-right: 5px;
      font-weight: 700;
    }

    .status-success {
      color: var(--success);
    }

    .status-danger {
      color: var(--danger);
    }

    .status-warning {
      color: var(--warning);
    }

    .status-muted {
      color: var(--muted);
    }

    .summary-line {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.7fr;
      gap: 10px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      font-size: 8.2pt;
      color: var(--text);
      align-items: center;
    }

    .summary-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .summary-cell strong {
      font-weight: 700;
      white-space: nowrap;
    }

    .summary-cell span {
      font-weight: 600;
    }

    .summary-result {
      justify-content: flex-start;
    }

    .summary-result .badge {
      margin-left: 2px;
    }

    .checklist-observation {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 12px;
    }

    .checklist-observation span {
      display: block;
      margin-bottom: 3px;
      color: var(--muted);
      font-size: 7.4pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .checklist-observation p {
      margin: 0;
      color: var(--text);
      font-size: 10pt;
      font-weight: 500;
      white-space: pre-wrap;
    }

    .accessory-list {
      display: grid;
      gap: 8px;
    }

    .accessory-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: start;
      padding: 10px;
      border-radius: 6px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .accessory-item strong {
      display: block;
      font-size: 8.9pt;
      color: var(--text);
    }

    .accessory-item p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 9pt;
    }

    .accessory-item span,
    .accessory-empty,
    .empty-state {
      color: var(--muted);
      font-size: 9.5pt;
      font-weight: 700;
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

    .signature-label {
      line-height: 1.25;
    }

    .signature-name {
      display: block;
      margin-top: 2px;
      color: var(--text);
      font-weight: 700;
      line-height: 1.25;
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
  </style>
</head>

<body>
  <main class="document">
    <header class="header">
      <div>
        <img class="logo" src="${logoSrc}" alt="ACI Equipamentos Hospitalares" />
      </div>

      <div class="header-info">
        <h1>Ordem de Serviço Nº ${escapeHtml(os.numero)}</h1>
        <div class="meta">
          <div>Data de Abertura: ${escapeHtml(formatDateTime(os.data_abertura || os.created_at))}</div>
          ${
            os.data_fechamento
              ? `<div>Data de Fechamento: ${escapeHtml(formatDateTime(os.data_fechamento))}</div>`
              : ""
          }
        </div>
      </div>
    </header>

    <section class="section">
      <div class="section-title">1 - Dados do Solicitante</div>

      <div class="card grid-2">
        <div class="field">
          <span class="field-label">Nome</span>
          <div class="field-value">${escapeHtml(getEmpresaNome(os))}</div>
        </div>

        <div class="field">
          <span class="field-label">Contato</span>
          <div class="field-value">${escapeHtml(getContato(os.empresa))}</div>
        </div>

        <div class="field">
          <span class="field-label">Endereço</span>
          <div class="field-value">${escapeHtml(getEnderecoEmpresa(os.empresa))}</div>
        </div>

        <div class="field">
          <span class="field-label">CPF/CNPJ</span>
          <div class="field-value">${escapeHtml(os.empresa?.cpf_cnpj)}</div>
        </div>

        <div class="field">
          <span class="field-label">E-mail</span>
          <div class="field-value">${escapeHtml(os.empresa?.email)}</div>
        </div>

        <div class="field">
          <span class="field-label">Nome Fantasia</span>
          <div class="field-value">${escapeHtml(os.empresa?.nome_fantasia)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">2 - Instrumento / Equipamento</div>

      <div class="card grid-3">
        <div class="field">
          <span class="field-label">Tipo</span>
          <div class="field-value">${escapeHtml(getTipoEquipamento(os))}</div>
        </div>

        <div class="field">
          <span class="field-label">Modelo</span>
          <div class="field-value">${escapeHtml(os.equipamento?.modelo)}</div>
        </div>

        <div class="field">
          <span class="field-label">Fabricante</span>
          <div class="field-value">${escapeHtml(os.equipamento?.fabricante)}</div>
        </div>

        <div class="field">
          <span class="field-label">Número de Série</span>
          <div class="field-value">${escapeHtml(os.equipamento?.numero_serie)}</div>
        </div>

        <div class="field">
          <span class="field-label">Patrimônio</span>
          <div class="field-value">${escapeHtml(os.equipamento?.patrimonio)}</div>
        </div>

        <div class="field">
          <span class="field-label">TAG</span>
          <div class="field-value">${escapeHtml(os.equipamento?.tag)}</div>
        </div>

        <div class="field">
          <span class="field-label">Setor</span>
          <div class="field-value">${escapeHtml(os.equipamento?.setor)}</div>
        </div>

        <div class="field">
          <span class="field-label">Status</span>
          <div class="field-value">${escapeHtml(os.equipamento?.status)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">3 - Serviço Prestado</div>

      <div class="card">
        ${
          preventiva
            ? `
              <div class="field">
                <span class="field-label">Descrição do Serviço</span>
                <div class="service-description">${escapeHtml(
                  os.descricao_servico ||
                    "Manutenção preventiva realizada conforme checklist técnico."
                )}</div>
              </div>
            `
            : `
              <div class="grid-2">
                <div class="field">
                  <span class="field-label">Tipo de Serviço</span>
                  <div class="field-value">${escapeHtml(os.tipo_os?.nome)}</div>
                </div>

                <div class="field">
                  <span class="field-label">Responsável Técnico</span>
                  <div class="field-value">${escapeHtml(os.responsavel_texto)}</div>
                </div>

                <div class="field">
                  <span class="field-label">Problema Relatado</span>
                  <div class="field-value">${escapeHtml(os.problema_relatado)}</div>
                </div>

                <div class="field">
                  <span class="field-label">Origem do Problema</span>
                  <div class="field-value">${escapeHtml(os.origem_problema)}</div>
                </div>
              </div>

              <div class="field" style="margin-top: 12px;">
                <span class="field-label">Descrição do Serviço</span>
                <div class="service-description">${escapeHtml(os.descricao_servico)}</div>
              </div>
            `
        }
      </div>
    </section>

    ${checklistHtml}

    <section class="section">
      <div class="section-title">4 - Observações</div>

      <div class="${observacoesClass}">
        ${escapeHtml(os.observacoes)}
      </div>
    </section>

    ${buildAcessoriosHtml(os)}

    <section class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura do Cliente</div>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">
          Responsável Técnico
          ${
            os.responsavel_texto
              ? `<span class="signature-name">${escapeHtml(os.responsavel_texto)}</span>`
              : ""
          }
        </div>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Data</div>
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

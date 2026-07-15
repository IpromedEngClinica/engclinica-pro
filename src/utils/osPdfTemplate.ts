import type { EmpresaSupabase } from "@/services/empresasService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import type { AssinaturasDocumento } from "@/services/assinaturasService";
import { PDF_DOCUMENT_BASE_CSS } from "@/utils/pdfDocumentStyles";

export const ORDEM_SERVICO_FOOTER_TEXT =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG Cep 36.080-370 - Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const EMPTY = "-";

const escapeHtml = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return EMPTY;

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return EMPTY;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY;

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatDate = (iso?: string | null) => {
  if (!iso) return EMPTY;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY;

  return date.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (os: OrdemServicoSupabase) =>
  os.empresa?.nome || os.empresa?.nome_fantasia || os.solicitante_texto || EMPTY;

const getEnderecoEmpresa = (empresa?: EmpresaSupabase | null) => {
  if (!empresa) return EMPTY;

  const linha1 = [empresa.rua, empresa.numero, empresa.complemento]
    .filter(Boolean)
    .join(", ");
  const linha2 = [empresa.bairro, empresa.cidade, empresa.estado]
    .filter(Boolean)
    .join(" - ");
  const cep = empresa.cep ? `CEP ${empresa.cep}` : "";

  return [linha1, linha2, cep].filter(Boolean).join(" - ") || EMPTY;
};

const getTipoEquipamento = (os: OrdemServicoSupabase) =>
  os.equipamento?.tipo_equipamento?.nome || os.equipamento?.tipo_texto || EMPTY;

const getContato = (empresa?: EmpresaSupabase | null) =>
  empresa?.contato || empresa?.celular || empresa?.telefone || EMPTY;

const getChecklistPreventiva = (os: OrdemServicoSupabase) => {
  const checklist = os.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const normalizeAnswer = (answer?: string | null) =>
  (answer || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const formatAnswer = (answerRaw?: string | null) => {
  const answer = normalizeAnswer(answerRaw);
  const labels: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Nao conforme",
    nao_aplica: "N/A",
    n_a: "N/A",
    na: "N/A",
    aprovado: "Aprovado para uso",
    nao_aprovado: "Nao aprovado para uso",
    aprovado_com_restricao: "Aprovado com restricao",
  };

  return labels[answer] || answerRaw || EMPTY;
};

const getChecklistStatus = (answerRaw?: string | null) => {
  const answer = normalizeAnswer(answerRaw);

  if (answer === "conforme" || answer === "aprovado") {
    return {
      className: "status-ok",
      symbol: formatAnswer(answerRaw),
      label: formatAnswer(answerRaw),
    };
  }

  if (answer === "nao_conforme" || answer === "nao_aprovado") {
    return {
      className: "status-fail",
      symbol: formatAnswer(answerRaw),
      label: formatAnswer(answerRaw),
    };
  }

  if (answer === "aprovado_com_restricao") {
    return {
      className: "status-alert",
      symbol: formatAnswer(answerRaw),
      label: formatAnswer(answerRaw),
    };
  }

  return {
    className: "status-na",
    symbol: "N/A",
    label: "Nao se aplica",
  };
};

const getResultadoLabel = (resultado?: string | null) => {
  const normalized = normalizeAnswer(resultado);

  if (normalized === "aprovado") return "Aprovado para uso";
  if (normalized === "nao_aprovado") return "Nao aprovado para uso";
  if (normalized === "aprovado_com_restricao") return "Aprovado com restricao";
  return EMPTY;
};

const getResultadoClass = (resultado?: string | null) => {
  const normalized = normalizeAnswer(resultado);

  if (normalized === "aprovado") return "result-ok";
  if (normalized === "nao_aprovado") return "result-fail";
  if (normalized === "aprovado_com_restricao") return "result-alert";
  return "result-na";
};

const sectionTitle = (number: string, title: string) => `
  <div class="section-title">
    <strong>${number}- ${title}</strong>
  </div>
`;

const field = (label: string, value?: string | number | null) => `
  <div class="field">
    <span>${label}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>
`;

const serviceLine = (label: string, value?: string | null) => `
  <div class="service-line">
    <span>${label}</span>
    <p>${escapeHtml(value)}</p>
  </div>
`;

const buildAcessoriosHtml = (os: OrdemServicoSupabase, sectionNumber: string) => {
  const acessorios = os.acessorios || [];

  if (!acessorios.length) return "";

  return `
    <section class="section compact-section">
      ${sectionTitle(sectionNumber, "Acessorios")}
      <table class="data-table simple-table">
        <thead>
          <tr>
      <th>Descri&ccedil;&atilde;o</th>
      <th>Quantidade</th>
      <th>Observa&ccedil;&atilde;o</th>
          </tr>
        </thead>
        <tbody>
          ${acessorios
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(item.descricao)}</td>
                  <td class="center">${escapeHtml(Number(item.quantidade || 1))}</td>
                  <td>${escapeHtml(item.observacoes)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
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
        .map((item) => {
          const status = getChecklistStatus(item.resposta);

          return `
            <tr>
              <td class="check-desc">${escapeHtml(item.descricao)}</td>
      <td class="check-info">${escapeHtml(item.observacao)}</td>
      <td class="check-result ${status.className}">
        <span>${status.symbol}</span>
      </td>
    </tr>
  `;
        })
        .join("")
    : '<tr><td colspan="3" class="empty-row">Nenhum item informado.</td></tr>';

  return `
    <section class="section checklist-section">
      ${sectionTitle("3.1", "Checklists")}

      <div class="checklist-meta">
        <div>
          <strong>${escapeHtml(checklist.titulo_procedimento || "Checklist tecnico")}</strong>
          <span>${escapeHtml(checklist.tipo_equipamento_nome || getTipoEquipamento(os))}</span>
        </div>
        <div class="legend">
          <span>Conforme</span>
          <span>Nao conforme</span>
          <span>N/A</span>
        </div>
      </div>

      <table class="data-table check-table">
        <thead>
          <tr>
            <th>Descri&ccedil;&atilde;o</th>
            <th>Informa&ccedil;&atilde;o</th>
            <th>Avalia&ccedil;&atilde;o</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="check-summary">
        <div>
          <span>Resultado geral</span>
          <strong class="${getResultadoClass(checklist.resultado_geral)}">
            ${escapeHtml(getResultadoLabel(checklist.resultado_geral))}
          </strong>
        </div>
        <div>
          <span>Validade da preventiva</span>
          <strong>${escapeHtml(formatDate(checklist.data_validade))}</strong>
        </div>
        <div>
          <span>Validade</span>
          <strong>${escapeHtml(checklist.validade_meses || 12)} meses</strong>
        </div>
      </div>

      ${
        checklist.observacoes
          ? `
            <div class="checklist-note">
              <span>Observa&ccedil;&otilde;es do checklist</span>
              <p>${escapeHtml(checklist.observacoes)}</p>
            </div>
          `
          : ""
      }
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
  logoSrc: string,
  assinaturas: AssinaturasDocumento = {}
) => {
  const preventiva = isPreventiva(os);
  const checklistHtml = buildChecklistHtml(os);
  const observacoes = os.observacoes?.trim() || "";
  const observacaoSomentePlanoECiclo = /^Plano:\s*.+?\.\s*Ciclo:\s*.+?\.?$/i.test(
    observacoes
  );
  const exibirObservacoes = Boolean(observacoes && !observacaoSomentePlanoECiclo);
  const assinaturaTecnica = assinaturas.tecnico || assinaturas.responsavel;
  const observacoesSectionNumber = checklistHtml ? "4" : "4";
  const acessoriosSectionNumber = exibirObservacoes ? "5" : "4";

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Servico ${escapeHtml(os.numero)}</title>
  <style>
    ${PDF_DOCUMENT_BASE_CSS}

    @page {
      size: A4;
      margin: 10mm;
    }

    :root {
      --brand: #d71920;
      --ink: #2f3337;
      --value: #3f454b;
      --muted: #5f666d;
      --quiet: #7a828a;
      --line: #cfd4da;
      --light-line: #d7dce1;
      --soft: #f3f5f7;
      --soft-2: #fafbfc;
      --ok: #177245;
      --ok-soft: #edf8f1;
      --fail: #b42318;
      --fail-soft: #fff1f0;
      --alert: #9a5b00;
      --alert-soft: #fff7e8;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #fff;
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

    .os-header {
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
      display: block;
      object-fit: contain;
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

    .header-title p {
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

    .compact-section {
      margin-top: 9px;
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

    .field {
      display: flex;
      gap: 5px;
      align-items: baseline;
      min-width: 0;
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

    .equipment-grid .field:nth-child(8) strong {
      display: inline-block;
      width: fit-content;
      padding: 1px 7px;
      border-radius: 999px;
      background: #f0f2f4;
      color: #3f454b;
      font-size: 9.8px;
      font-weight: 650;
    }

    .service-box {
      display: grid;
      gap: 4px;
      padding: 6px 8px;
      border: 1px solid var(--light-line);
      border-radius: 5px;
      background: var(--soft-2);
    }

    .service-line {
      display: flex;
      gap: 7px;
      align-items: start;
    }

    .service-line p {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--value);
    }

    .checklist-section {
      break-inside: auto;
      page-break-inside: auto;
    }

    .checklist-meta {
      width: 92%;
      margin: 0 auto 5px;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 12px;
    }

    .checklist-meta strong {
      display: block;
      font-size: 11.5px;
      font-weight: 750;
    }

    .checklist-meta span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 9.5px;
      font-weight: 600;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 650;
    }

    .legend span {
      margin: 0;
      color: var(--muted);
      white-space: nowrap;
    }

    .check-table,
    .simple-table {
      width: 92%;
      margin: 0 auto;
      border-collapse: collapse;
      border: 1px solid var(--line);
      font-size: 10.2px;
      page-break-inside: auto;
    }

    .check-table thead,
    .simple-table thead {
      display: table-header-group;
    }

    .check-table tr,
    .simple-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .check-table th,
    .simple-table th {
      padding: 4px 6px;
      border: 1px solid var(--line);
      background: var(--soft);
      color: var(--ink);
      font-size: 9px;
      font-weight: 750;
      text-align: center;
      text-transform: uppercase;
    }

    .check-table th:first-child,
    .simple-table th:first-child {
      text-align: left;
    }

    .check-table td,
    .simple-table td {
      padding: 3px 6px;
      border: 1px solid var(--light-line);
      vertical-align: middle;
      color: var(--value);
    }

    .check-table tbody tr:nth-child(even) td,
    .simple-table tbody tr:nth-child(even) td {
      background: #fbfcfd;
    }

    .check-desc {
      width: 48%;
      font-weight: 650;
    }

    .check-info {
      width: 32%;
      color: var(--muted);
      text-align: center;
    }

    .check-result {
      width: 20%;
      text-align: center;
      font-weight: 800;
      white-space: nowrap;
    }

    .check-result span {
      display: inline-block;
      min-width: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9.2px;
      line-height: 1.05;
      font-weight: 700;
    }

    .status-ok {
      color: var(--ok);
    }

    .status-ok span {
      background: var(--ok-soft);
    }

    .result-ok {
      color: var(--ok);
    }

    .status-fail {
      color: var(--fail);
    }

    .status-fail span {
      background: var(--fail-soft);
    }

    .result-fail {
      color: var(--fail);
    }

    .status-alert {
      color: var(--alert);
    }

    .status-alert span {
      background: var(--alert-soft);
    }

    .result-alert {
      color: var(--alert);
    }

    .status-na {
      color: var(--muted);
    }

    .status-na span {
      background: #f0f2f4;
    }

    .result-na {
      color: var(--muted);
    }

    .check-summary {
      width: 92%;
      margin: 5px auto 0;
      display: grid;
      grid-template-columns: 1fr 1fr 0.8fr;
      border: 1px solid var(--light-line);
      background: var(--soft-2);
      border-radius: 4px;
      overflow: hidden;
    }

    .check-summary div {
      padding: 4px 7px;
      border-right: 1px solid var(--light-line);
    }

    .check-summary div:last-child {
      border-right: 0;
    }

    .check-summary span {
      display: block;
      color: var(--muted);
      font-size: 7.5px;
      font-weight: 750;
      text-transform: uppercase;
    }

    .check-summary strong {
      display: block;
      margin-top: 2px;
      font-size: 10.5px;
      font-weight: 750;
    }

    .checklist-note,
    .observations {
      width: 92%;
      margin: 5px auto 0;
      padding: 5px 8px;
      border: 1px solid var(--light-line);
      background: var(--soft-2);
      border-radius: 5px;
    }

    .checklist-note span {
      display: block;
      margin-bottom: 3px;
      color: var(--muted);
      font-size: 7.5px;
      font-weight: 750;
      text-transform: uppercase;
    }

    .checklist-note p,
    .observations p {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .simple-table .center {
      text-align: center;
    }

    .empty-row {
      text-align: center;
      color: var(--muted);
      font-weight: 700;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 150px;
      gap: 24px;
      align-items: start;
      margin-top: 16px;
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

    .signature-label {
      font-weight: 600;
      color: #4d545b;
    }

    .signature-name {
      display: block;
      margin-top: 1px;
      font-weight: 700;
      color: var(--ink);
    }

    .date-block {
      min-height: 58px;
      text-align: center;
      font-size: 9.8px;
      color: var(--ink);
    }

    .date-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 1px;
      font-size: 10px;
      white-space: nowrap;
    }

    .date-line span {
      display: inline-block;
      min-width: 42px;
      height: 0;
      border-bottom: 1px solid #7c838a;
    }

  </style>
</head>

<body>
  <main class="document">
    <header class="document-header os-header">
      <img class="logo" src="${logoSrc}" alt="ACI Equipamentos Hospitalares" />

      <div class="document-title header-title">
        <h1>Ordem de Servi&ccedil;o N&ordm; ${escapeHtml(os.numero)}</h1>
        <p class="document-meta">Data de Abertura: ${escapeHtml(formatDateTime(os.data_abertura || os.created_at))}</p>
        ${
          os.data_fechamento
            ? `<p class="document-meta">Data de Fechamento: ${escapeHtml(formatDateTime(os.data_fechamento))}</p>`
            : ""
        }
      </div>
    </header>

    <section class="section">
      ${sectionTitle("1", "Dados do Solicitante")}
      <div class="info-grid info-grid-2 client-identification">
        ${field("Nome:", getEmpresaNome(os))}
        ${field("Contato:", getContato(os.empresa))}
        ${field("Endere&ccedil;o:", getEnderecoEmpresa(os.empresa))}
        ${field("CPF/CNPJ:", os.empresa?.cpf_cnpj)}
        ${field("E-mail:", os.empresa?.email)}
        ${field("Fantasia:", os.empresa?.nome_fantasia)}
      </div>
    </section>

    <section class="section">
      ${sectionTitle("2", "Instrumento/Equipamento")}
      <div class="info-grid info-grid-3 equipment-grid">
        ${field("Tipo:", getTipoEquipamento(os))}
        ${field("Modelo:", os.equipamento?.modelo)}
        ${field("Fabricante:", os.equipamento?.fabricante)}
        ${field("N. S&eacute;rie:", os.equipamento?.numero_serie)}
        ${field("Patrim&ocirc;nio:", os.equipamento?.patrimonio)}
        ${field("TAG:", os.equipamento?.tag)}
        ${field("Setor:", os.equipamento?.setor)}
        ${field("Status:", os.equipamento?.status)}
      </div>
    </section>

    <section class="section">
      ${sectionTitle("3", "Servi&ccedil;o Prestado")}
      <div class="service-box">
        ${
          preventiva
            ? serviceLine(
                "Descri&ccedil;&atilde;o do Servi&ccedil;o:",
                os.descricao_servico ||
                  "Manutencao preventiva realizada conforme checklist tecnico."
              )
            : `
              ${serviceLine("Tipo de Servi&ccedil;o:", os.tipo_os?.nome)}
              ${serviceLine("Descri&ccedil;&atilde;o do Servi&ccedil;o:", os.descricao_servico)}
              ${serviceLine("Origem do Problema:", os.origem_problema)}
              ${serviceLine("Problema Reclamado:", os.problema_relatado)}
              ${serviceLine("T&eacute;cnico Executor:", os.responsavel_texto)}
            `
        }
      </div>
    </section>

    ${checklistHtml}

    ${
      exibirObservacoes
        ? `
          <section class="section compact-section">
            ${sectionTitle(observacoesSectionNumber, "Observa&ccedil;&otilde;es")}
            <div class="observations"><p>${escapeHtml(observacoes)}</p></div>
          </section>
        `
        : ""
    }

    ${buildAcessoriosHtml(os, acessoriosSectionNumber)}

    <section class="signature-area signatures">
      <div class="signature-block">
        <div class="signature-image">
          ${assinaturas.solicitante?.dataUrl ? `<img src="${assinaturas.solicitante.dataUrl}" alt="Assinatura do cliente" />` : ""}
        </div>
        <div class="signature-line"></div>
        <div class="signature-label">
          Assinatura do Cliente
          ${assinaturas.solicitante?.nome ? `<span class="signature-name">${escapeHtml(assinaturas.solicitante.nome)}</span>` : ""}
        </div>
      </div>

      <div class="signature-block">
        <div class="signature-image">
          ${assinaturaTecnica?.dataUrl ? `<img src="${assinaturaTecnica.dataUrl}" alt="Assinatura do tecnico executor" />` : ""}
        </div>
        <div class="signature-line"></div>
        <div class="signature-label">
          T&eacute;cnico Executor
          ${
            assinaturaTecnica?.nome || os.responsavel_texto
              ? `<span class="signature-name">${escapeHtml(assinaturaTecnica?.nome || os.responsavel_texto)}</span>`
              : ""
          }
        </div>
      </div>

      <div class="date-block">
        <div class="signature-image"></div>
        <div class="date-line">
          <span></span>de<span></span>de<span></span>
        </div>
      </div>
    </section>
  </main>
</body>
</html>
  `;
};

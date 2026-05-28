import type { LaudoObsolescenciaSupabase } from "@/services/laudosObsolescenciaService";

const EMPTY = "-";
const RESPONSAVEL_PADRAO = "Icaro Heitor Piris Rezende";
const REGISTRO_PADRAO = "CREA - 142085302-3";
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

const formatDateTime = (iso?: string | null) => {
  if (!iso) return EMPTY;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getEmpresaNome = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.empresa?.nome_fantasia || laudo.empresa?.nome || EMPTY;

const getEnderecoEmpresa = (laudo: LaudoObsolescenciaSupabase) => {
  const empresa = laudo.empresa;
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

const getContatoEmpresa = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.empresa?.contato ||
  laudo.empresa?.celular ||
  laudo.empresa?.telefone ||
  EMPTY;

const getTipoEquipamento = (laudo: LaudoObsolescenciaSupabase) =>
  laudo.equipamento?.tipo_equipamento?.nome ||
  laudo.equipamento?.tipo_texto ||
  EMPTY;

const BASE_CSS = `
  @page { size: A4; margin: 14mm; }

  :root {
    --primary: #C5161D;
    --text: #111827;
    --muted: #6B7280;
    --border: #E5E7EB;
    --danger: #DC2626;
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

  .text-block {
    min-height: 30px;
    white-space: pre-wrap;
    color: var(--text);
    font-weight: 400;
  }

  .declaration {
    font-size: 9.2pt;
    line-height: 1.45;
  }

  .status-line {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(220, 38, 38, 0.1);
    color: var(--danger);
    font-size: 7.8pt;
    font-weight: 700;
  }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 42px;
    margin-top: 34px;
    align-items: start;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signature-block {
    height: 74px;
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
`;

export const buildLaudoObsolescenciaHtml = (
  laudo: LaudoObsolescenciaSupabase,
  logoSrc: string
) => {
  const responsavelNome = laudo.responsavel_nome || RESPONSAVEL_PADRAO;
  const responsavelRegistro = laudo.responsavel_registro || REGISTRO_PADRAO;

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Laudo de Obsolescencia ${escapeHtml(laudo.numero)}</title>
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
        <h1>Laudo de Obsolesc&ecirc;ncia N&ordm; ${escapeHtml(laudo.numero)}</h1>
        <div class="meta">
          <div>Data: ${escapeHtml(formatDateTime(laudo.data_criacao))}</div>
          <div>Equipamento desativado automaticamente</div>
        </div>
      </div>
    </header>

    <section class="section">
      <div class="section-title">1 - Dados do Contratante</div>
      <div class="card grid-2">
        <div class="field">
          <span class="field-label">Nome</span>
          <div class="field-value">${escapeHtml(getEmpresaNome(laudo))}</div>
        </div>
        <div class="field">
          <span class="field-label">CPF/CNPJ</span>
          <div class="field-value">${escapeHtml(laudo.empresa?.cpf_cnpj)}</div>
        </div>
        <div class="field">
          <span class="field-label">Endere&ccedil;o</span>
          <div class="field-value">${escapeHtml(getEnderecoEmpresa(laudo))}</div>
        </div>
        <div class="field">
          <span class="field-label">Contato</span>
          <div class="field-value">${escapeHtml(getContatoEmpresa(laudo))}</div>
        </div>
        <div class="field">
          <span class="field-label">E-mail</span>
          <div class="field-value">${escapeHtml(laudo.empresa?.email)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">2 - Declara&ccedil;&atilde;o de Obsolesc&ecirc;ncia</div>
      <div class="card">
        <div class="text-block declaration">
          Declaro, para os devidos fins, que o equipamento abaixo identificado encontra-se fora de utiliza&ccedil;&atilde;o, sendo considerado obsoleto e/ou economicamente invi&aacute;vel para manuten&ccedil;&atilde;o, conforme an&aacute;lise t&eacute;cnica e motivo descrito neste laudo.
        </div>
        <span class="status-line">Equipamento desativado</span>
      </div>
    </section>

    <section class="section">
      <div class="section-title">3 - Dados do Equipamento</div>
      <div class="card grid-3">
        <div class="field">
          <span class="field-label">Tipo</span>
          <div class="field-value">${escapeHtml(getTipoEquipamento(laudo))}</div>
        </div>
        <div class="field">
          <span class="field-label">Modelo</span>
          <div class="field-value">${escapeHtml(laudo.equipamento?.modelo)}</div>
        </div>
        <div class="field">
          <span class="field-label">N&uacute;mero de S&eacute;rie</span>
          <div class="field-value">${escapeHtml(laudo.equipamento?.numero_serie)}</div>
        </div>
        <div class="field">
          <span class="field-label">Patrim&ocirc;nio</span>
          <div class="field-value">${escapeHtml(laudo.equipamento?.patrimonio)}</div>
        </div>
        <div class="field">
          <span class="field-label">Fabricante</span>
          <div class="field-value">${escapeHtml(laudo.equipamento?.fabricante)}</div>
        </div>
        <div class="field">
          <span class="field-label">Setor/TAG</span>
          <div class="field-value">${escapeHtml(
            [laudo.equipamento?.setor, laudo.equipamento?.tag]
              .filter(Boolean)
              .join(" - ")
          )}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">4 - Motivo da Obsolesc&ecirc;ncia</div>
      <div class="card">
        <div class="text-block">${escapeHtml(laudo.motivo_texto)}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">5 - Observa&ccedil;&otilde;es</div>
      <div class="card">
        <div class="text-block">${escapeHtml(laudo.observacoes)}</div>
      </div>
    </section>

    <section class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div>Respons&aacute;vel T&eacute;cnico</div>
        <span class="signature-name">${escapeHtml(responsavelNome)}</span>
        <span>${escapeHtml(responsavelRegistro)}</span>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div>Solicitante</div>
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

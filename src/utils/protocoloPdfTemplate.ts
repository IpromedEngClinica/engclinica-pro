import type { ProtocoloOSSupabase } from "@/services/protocolosService";
import { PDF_DOCUMENT_BASE_CSS } from "@/utils/pdfDocumentStyles";

export const PROTOCOLO_FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const EMPTY = "-";

const text = {
  protocoloEntrega: "Protocolo de Entrega",
  protocoloRecolhimento: "Protocolo de Recolhimento",
  semNumero: "sem n\u00famero",
  emissao: "Emiss\u00e3o:",
  dadosCliente: "Dados do Cliente",
  endereco: "Endere\u00e7o:",
  instrumentoEquipamento: "Instrumento / Equipamento",
  identificacao: "Identifica\u00e7\u00e3o:",
  numeroSerie: "N\u00famero de S\u00e9rie:",
  patrimonio: "Patrim\u00f4nio:",
  dadosEntrega: "Dados da Entrega",
  dadosRecolhimento: "Dados do Recolhimento",
  dataEntrega: "Data da entrega:",
  dataRecolhimento: "Data do recolhimento:",
  responsavelRecebimento: "Respons\u00e1vel pelo recebimento:",
  responsavelColeta: "Respons\u00e1vel pela coleta:",
  acessoriosEquipamento: "Acess\u00f3rios do Equipamento",
  semAcessorios: "Sem Acess\u00f3rios",
  descricao: "Descri\u00e7\u00e3o",
  observacao: "Observa\u00e7\u00e3o",
  observacoes: "Observa\u00e7\u00f5es",
  nao: "N\u00e3o",
  problemaRelatado: "Problema relatado",
  declaracoes: "Declara\u00e7\u00f5es",
  assinaturas: "Assinaturas",
  assinaturaRecebimento: "Respons\u00e1vel pelo recebimento",
  assinaturaEntregaCliente: "Respons\u00e1vel pela entrega",
  assinaturaAciEntrega: "Respons\u00e1vel ACI pela entrega",
  assinaturaAciColeta: "Respons\u00e1vel ACI pela coleta",
  declaracaoEntrega:
    "Com esta assinatura, declaro que o equipamento me foi entregue com os acess\u00f3rios descritos na data acima e o mesmo foi testado em minha presen\u00e7a, ou caso n\u00e3o foi testado, assumo a responsabilidade por test\u00e1-lo posteriormente.",
  declaracaoPrazo:
    "A Comiss\u00e3o de Defesa do Consumidor estabelece, nas diretrizes do C\u00f3digo de Defesa do Consumidor, o prazo de 180 dias para a retirada, pelo propriet\u00e1rio, de equipamentos eletr\u00f4nicos, m\u00e1quinas e motores deixados na assist\u00eancia t\u00e9cnica para conserto. Em caso de n\u00e3o retirada, o prestador de servi\u00e7o fica autorizado a alienar, doar, reutilizar, desmontar, destruir ou destinar o bem \u00e0 sucata.",
};

const esc = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return EMPTY;

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const hasValue = (value?: string | number | null) => {
  if (value === null || value === undefined) return false;
  const content = String(value).trim();
  return content !== "" && content !== EMPTY;
};

const escPreserveBreaks = (value?: string | number | null) =>
  esc(value).replace(/\n/g, "<br>");

const formatDateTime = (value?: string | null) => {
  if (!value) return EMPTY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getTitulo = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega"
    ? text.protocoloEntrega
    : text.protocoloRecolhimento;

const getEmpresaNome = (protocolo: ProtocoloOSSupabase) =>
  protocolo.empresa?.nome || protocolo.empresa?.nome_fantasia || EMPTY;

const getEnderecoEmpresa = (protocolo: ProtocoloOSSupabase) => {
  const empresa = protocolo.empresa;
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

const getContatoEmpresa = (protocolo: ProtocoloOSSupabase) =>
  [
    protocolo.empresa?.contato,
    protocolo.empresa?.telefone || protocolo.empresa?.celular,
  ]
    .filter(Boolean)
    .join(" / ") || EMPTY;

const getTipoEquipamento = (protocolo: ProtocoloOSSupabase) =>
  protocolo.equipamento?.tipo_equipamento?.nome ||
  protocolo.equipamento?.tipo_texto ||
  EMPTY;

const getIdentificacaoEquipamento = (protocolo: ProtocoloOSSupabase) =>
  protocolo.equipamento?.tag ||
  protocolo.equipamento?.patrimonio ||
  protocolo.equipamento?.numero_serie ||
  EMPTY;

const getDataOperacionalLabel = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega" ? text.dataEntrega : text.dataRecolhimento;

const getDataOperacional = (protocolo: ProtocoloOSSupabase) =>
  protocolo.tipo === "entrega"
    ? protocolo.data_entrega || protocolo.data_protocolo
    : protocolo.data_recolhimento || protocolo.data_protocolo;

const field = (label: string, value?: string | number | null, wide = false) => `
  <div class="field ${wide ? "field-address" : ""}">
    <span class="field-label">${esc(label)}</span>
    <span class="field-value">${esc(value)}</span>
  </div>
`;

const optionalField = (
  label: string,
  value?: string | number | null,
  wide = false
) => (hasValue(value) ? field(label, value, wide) : "");

const sectionTitle = (number: string, title: string) => `
  <h2 class="section-title">${esc(number)}. ${esc(title)}</h2>
`;

const buildAcessorios = (protocolo: ProtocoloOSSupabase) => {
  const acessorios = protocolo.acessorios || [];
  const rows = acessorios.length
    ? acessorios
        .map(
          (item, index) => `
            <tr>
              <td class="nowrap">${index + 1}</td>
              <td class="text-left">${esc(item.descricao)}</td>
              <td class="nowrap">${esc(item.quantidade || 1)}</td>
              <td>${item.conferido ? "Sim" : text.nao}</td>
              <td class="text-left">${esc(item.observacoes)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="5" class="text-left empty-accessories">${text.semAcessorios}</td>
      </tr>
    `;

  return `
    <section class="section">
      ${sectionTitle("4", text.acessoriosEquipamento)}
      <table class="data-table protocol-accessories">
        <thead>
          <tr>
            <th>#</th>
            <th class="text-left">${text.descricao}</th>
            <th>Quantidade</th>
            <th>Conferido</th>
            <th class="text-left">${text.observacao}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

const buildObservacoes = (number: string, protocolo: ProtocoloOSSupabase) =>
  hasValue(protocolo.problema_relatado) || hasValue(protocolo.observacoes)
    ? `
      <section class="section">
        ${sectionTitle(number, text.observacoes)}
        <div class="soft-box text-box observations-box">
          ${
            hasValue(protocolo.problema_relatado)
              ? `
                <strong>${text.problemaRelatado}</strong>
                <div>${escPreserveBreaks(protocolo.problema_relatado)}</div>
              `
              : ""
          }
          ${
            hasValue(protocolo.observacoes)
              ? `
                <strong>${text.observacoes}</strong>
                <div>${escPreserveBreaks(protocolo.observacoes)}</div>
              `
              : ""
          }
        </div>
      </section>
    `
    : "";

const signatureBlock = (label: string, name?: string | null) => `
  <div class="signature-block">
    <div class="signature-image-placeholder"></div>
    <div class="signature-line"></div>
    <div class="signature-name">${esc(name)}</div>
    <div class="signature-role">${esc(label)}</div>
  </div>
`;

const buildDeclaracoes = (number: string) => `
  <section class="section protocol-declarations">
    ${sectionTitle(number, text.declaracoes)}
    <div class="soft-box text-box declaration-box">
      <p>${text.declaracaoEntrega}</p>
      <p>${text.declaracaoPrazo}</p>
    </div>
  </section>
`;

const styles = `
  ${PDF_DOCUMENT_BASE_CSS}

  .text-box {
    color: var(--value);
    white-space: normal;
  }

  .text-box strong {
    display: block;
    margin: 0 0 4px;
    color: var(--ink);
  }

  .observations-box div + strong {
    margin-top: 8px;
  }

  .protocol-accessories th:first-child,
  .protocol-accessories td:first-child {
    width: 34px;
  }

  .empty-accessories {
    color: var(--ink);
    font-weight: 650;
  }

  .protocol-declarations {
    margin-top: 14px;
  }

  .declaration-box {
    border-left: 3px solid var(--brand);
    font-size: 10.2px;
    line-height: 1.35;
  }

  .declaration-box p {
    margin: 0;
  }

  .declaration-box p + p {
    margin-top: 7px;
  }
`;

export const buildProtocoloHtml = (
  protocolo: ProtocoloOSSupabase,
  logoSrc: string
) => {
  const isEntrega = protocolo.tipo === "entrega";
  const numero = protocolo.numero || text.semNumero;
  const hasObservacoes =
    hasValue(protocolo.problema_relatado) || hasValue(protocolo.observacoes);
  const observacoesNumero = "5";
  const includeDeclaracoes = isEntrega;
  const declaracoesNumero = hasObservacoes ? "6" : "5";
  const assinaturasNumero = includeDeclaracoes
    ? hasObservacoes
      ? "7"
      : "6"
    : hasObservacoes
      ? "6"
      : "5";
  const responsavelLabel = isEntrega
    ? text.responsavelRecebimento
    : text.responsavelColeta;
  const assinaturaCliente = isEntrega
    ? text.assinaturaRecebimento
    : text.assinaturaEntregaCliente;
  const assinaturaAci = isEntrega
    ? text.assinaturaAciEntrega
    : text.assinaturaAciColeta;

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <style>${styles}</style>
    </head>
    <body>
      <main class="document">
        <header class="document-header">
          <img class="logo" src="${logoSrc}" alt="ACI">
          <div class="document-title">
            <h1>${esc(getTitulo(protocolo))}</h1>
            <div class="document-code">N\u00ba ${esc(numero)}</div>
            <div class="document-meta">
              ${text.emissao} ${formatDateTime(protocolo.data_protocolo)}
              ${hasValue(protocolo.ordem_servico?.numero) ? `<br>OS: ${esc(protocolo.ordem_servico?.numero)}` : ""}
            </div>
          </div>
        </header>

        <section class="section">
          ${sectionTitle("1", text.dadosCliente)}
          <div class="info-grid info-grid-2 client-identification">
            ${field("Nome:", getEmpresaNome(protocolo))}
            ${field("Contato:", getContatoEmpresa(protocolo))}
            ${field(text.endereco, getEnderecoEmpresa(protocolo), true)}
            ${field("CPF/CNPJ:", protocolo.empresa?.cpf_cnpj)}
            ${field("E-mail:", protocolo.empresa?.email, true)}
            ${field("Fantasia:", protocolo.empresa?.nome_fantasia)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("2", text.instrumentoEquipamento)}
          <div class="info-grid info-grid-3">
            ${optionalField("Tipo:", getTipoEquipamento(protocolo))}
            ${optionalField(text.identificacao, getIdentificacaoEquipamento(protocolo))}
            ${optionalField("Modelo:", protocolo.equipamento?.modelo)}
            ${optionalField("Fabricante:", protocolo.equipamento?.fabricante)}
            ${optionalField(text.numeroSerie, protocolo.equipamento?.numero_serie)}
            ${optionalField(text.patrimonio, protocolo.equipamento?.patrimonio)}
            ${optionalField("TAG:", protocolo.equipamento?.tag)}
            ${optionalField("Setor:", protocolo.equipamento?.setor)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("3", isEntrega ? text.dadosEntrega : text.dadosRecolhimento)}
          <div class="info-grid info-grid-3">
            ${field(responsavelLabel, protocolo.responsavel_nome)}
            ${field("Documento:", protocolo.responsavel_documento)}
            ${field("Contato:", protocolo.responsavel_contato)}
            ${field(getDataOperacionalLabel(protocolo), formatDateTime(getDataOperacional(protocolo)))}
            ${field("OS vinculada:", protocolo.ordem_servico?.numero)}
            ${field("Status:", protocolo.status)}
          </div>
        </section>

        ${buildAcessorios(protocolo)}

        ${buildObservacoes(observacoesNumero, protocolo)}

        ${includeDeclaracoes ? buildDeclaracoes(declaracoesNumero) : ""}

        <section class="section summary-signatures">
          ${sectionTitle(assinaturasNumero, text.assinaturas)}
          <div class="signature-area">
            ${signatureBlock(assinaturaCliente, protocolo.responsavel_nome)}
            ${signatureBlock(assinaturaAci, "")}
            ${signatureBlock("Data", "")}
          </div>
        </section>
      </main>
    </body>
  </html>`;
};

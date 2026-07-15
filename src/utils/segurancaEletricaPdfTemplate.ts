import type {
  SegurancaEletricaExecucao,
  SegurancaEletricaResultado,
} from "@/services/segurancaEletricaService";
import { formatNumeroCertificadoSegurancaEletrica } from "@/services/segurancaEletricaService";
import { formatDecimalSeguranca } from "@/utils/segurancaEletricaTemplate";
import type { AssinaturasDocumento } from "@/services/assinaturasService";
import { PDF_DOCUMENT_BASE_CSS } from "@/utils/pdfDocumentStyles";

export const SEGURANCA_ELETRICA_FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const RESPONSAVEL_TECNICO_CREA = "CREA: 142085302-3";
const EMPTY = "-";

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
  const text = String(value).trim();
  return text !== "" && text !== EMPTY;
};

const escPreserveBreaks = (value?: string | number | null) =>
  esc(value).replace(/\n/g, "<br>");

const date = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : EMPTY;

const sectionTitle = (number: string, title: string) => `
  <h2 class="section-title">${esc(number)}. ${esc(title)}</h2>
`;

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

const getEmpresaNome = (execucao: SegurancaEletricaExecucao) =>
  execucao.empresa?.nome || execucao.empresa?.nome_fantasia;

const getEnderecoEmpresa = (execucao: SegurancaEletricaExecucao) => {
  const empresa = execucao.empresa;
  if (!empresa) return EMPTY;

  const linha1 = [empresa.rua, empresa.numero].filter(Boolean).join(", ");
  const linha2 = [empresa.bairro, empresa.cidade, empresa.estado]
    .filter(Boolean)
    .join(" - ");
  const cep = empresa.cep ? `CEP ${empresa.cep}` : "";

  return [linha1, linha2, cep].filter(Boolean).join(" - ") || EMPTY;
};

const getTipoEquipamento = (execucao: SegurancaEletricaExecucao) =>
  execucao.equipamento?.tipo_equipamento?.nome ||
  execucao.equipamento?.tipo_texto ||
  EMPTY;

const getIdentificacaoEquipamento = (execucao: SegurancaEletricaExecucao) =>
  execucao.equipamento?.tag ||
  execucao.equipamento?.patrimonio ||
  execucao.equipamento?.numero_serie ||
  EMPTY;

const resultLabel = (value?: string | null) => {
  if (value === "aprovado") return "Aprovado";
  if (value === "reprovado") return "Reprovado";
  return EMPTY;
};

const resultClass = (value?: string | null) => {
  if (value === "aprovado") return "result-ok";
  if (value === "reprovado") return "result-fail";
  return "result-na";
};

const formatValorRegistrado = (item: SegurancaEletricaResultado) =>
  item.valor_registrado_texto ||
  (item.valor_registrado == null
    ? EMPTY
    : formatDecimalSeguranca(item.valor_registrado));

const groupBy = (resultados: SegurancaEletricaResultado[]) =>
  resultados.reduce<Record<string, SegurancaEletricaResultado[]>>((acc, item) => {
    const grupo = item.grupo || "Resultados";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(item);
    return acc;
  }, {});

const buildResultados = (resultados: SegurancaEletricaResultado[]) => {
  if (!resultados.length) {
    return '<tr><td colspan="6" class="center">Nenhum resultado registrado.</td></tr>';
  }

  return Object.entries(groupBy(resultados))
    .map(
      ([grupo, itens]) => `
        <tr class="group-row"><td colspan="6">${esc(grupo)}</td></tr>
        ${itens
          .map(
            (item) => `
              <tr>
                <td class="text-left">${esc(item.caracteristica)}</td>
                <td class="center nowrap">${esc(item.unidade)}</td>
                <td class="center">${esc(item.valor_esperado_texto)}</td>
                <td class="center">${esc(formatValorRegistrado(item))}</td>
                <td class="center nowrap">${esc(item.desvio_texto || EMPTY)}</td>
                <td class="center ${resultClass(item.resultado)}">${esc(resultLabel(item.resultado))}</td>
              </tr>
            `
          )
          .join("")}
      `
    )
    .join("");
};

const assinaturaBlock = ({
  dataUrl,
  nome,
  funcao,
  registro,
}: {
  dataUrl?: string;
  nome?: string | null;
  funcao: string;
  registro?: string | null;
}) => `
  <div class="signature-block">
    ${dataUrl ? `<img class="signature-image" src="${dataUrl}" alt="Assinatura de ${esc(nome)}">` : '<div class="signature-image-placeholder"></div>'}
    <div class="signature-line"></div>
    <div class="signature-name">${esc(nome)}</div>
    <div class="signature-role">${esc(funcao)}</div>
    ${registro ? `<div class="signature-register">${esc(registro)}</div>` : ""}
  </div>
`;

const buildNotaResultado = (execucao: SegurancaEletricaExecucao) => {
  const resultado = resultLabel(execucao.resultado_geral).toLowerCase();

  return `O equipamento encontra-se ${resultado || "sem resultado registrado"} conforme os resultados obtidos.

Este documento certifica que os padrões listados foram utilizados para avaliar o equipamento identificado acima, de acordo com os procedimentos aplicáveis e com a NBR IEC 60601-1. Este certificado refere-se somente aos itens avaliados, não sendo permitida sua reprodução parcial.

O resultado das medições apresentadas neste certificado refere-se ao resultado não corrigido.`;
};

const styles = `
  ${PDF_DOCUMENT_BASE_CSS}

  .info-box {
    padding: 8px 9px;
    border: 1px solid var(--light-line);
    border-radius: 6px;
    background: var(--soft-2);
    color: var(--value);
    white-space: pre-wrap;
  }

  .mt-compact {
    margin-top: 8px;
  }

  .result-ok {
    color: var(--ok);
    font-weight: 750;
  }

  .result-fail {
    color: var(--fail);
    font-weight: 750;
  }

  .result-na {
    color: var(--muted);
    font-weight: 700;
  }

  .result-pill {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    font-weight: 750;
  }

  .result-pill.result-ok {
    background: var(--ok-soft);
  }

  .result-pill.result-fail {
    background: var(--fail-soft);
  }

  .group-row td {
    background: #f9fafb;
    color: var(--ink);
    font-weight: 750;
    text-align: left;
  }

  .summary-signatures {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

export const buildSegurancaEletricaHtml = (
  execucao: SegurancaEletricaExecucao,
  logoSrc: string,
  assinaturas: AssinaturasDocumento = {}
) => {
  const numero = formatNumeroCertificadoSegurancaEletrica(
    execucao.numero_certificado
  );
  const equipamento = execucao.equipamento;
  const padrao = execucao.padrao;
  const resultados = [...(execucao.resultados || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );

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
            <h1>Certificado de Segurança Elétrica</h1>
            <div class="document-code">SE-${esc(numero)}</div>
            <div class="document-meta">Emissão: ${date(execucao.data_emissao)}</div>
          </div>
        </header>

        <section class="section">
          ${sectionTitle("1", "Dados do Contratante")}
          <div class="info-grid info-grid-2 client-identification">
            ${field("Nome:", getEmpresaNome(execucao))}
            ${optionalField("Contato:", [execucao.empresa?.contato, execucao.empresa?.telefone || execucao.empresa?.celular].filter(Boolean).join(" / "))}
            ${optionalField("Endereço:", getEnderecoEmpresa(execucao), true)}
            ${optionalField("CPF/CNPJ:", execucao.empresa?.cpf_cnpj)}
            ${optionalField("E-mail:", execucao.empresa?.email, true)}
            ${optionalField("Fantasia:", execucao.empresa?.nome_fantasia)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("2", "Instrumento / Equipamento Ensaiado")}
          <div class="info-grid info-grid-3">
            ${optionalField("Tipo:", getTipoEquipamento(execucao))}
            ${optionalField("Identificação:", getIdentificacaoEquipamento(execucao))}
            ${optionalField("Modelo:", equipamento?.modelo)}
            ${optionalField("Fabricante:", equipamento?.fabricante)}
            ${optionalField("Número de Série:", equipamento?.numero_serie)}
            ${optionalField("Patrimônio:", equipamento?.patrimonio)}
            ${optionalField("TAG:", equipamento?.tag)}
            ${optionalField("Setor:", equipamento?.setor)}
            ${optionalField("Classe:", execucao.classe_equipamento)}
            ${optionalField("Parte aplicada:", execucao.tipo_parte_aplicada)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("3", "Condições Ambientais")}
          <div class="info-grid info-grid-3">
            ${optionalField("Local:", execucao.local_ensaio)}
            ${optionalField("Temperatura:", execucao.temperatura_ambiente_texto)}
            ${optionalField("Umidade Relativa:", execucao.umidade_relativa_texto)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("4", "Padrão Utilizado")}
          <table class="data-table">
            <thead>
              <tr>
                <th class="text-left">Nome</th>
                <th class="nowrap">Certificado</th>
                <th class="nowrap">Validade</th>
                <th class="nowrap">Identificação</th>
                <th>Órgão calibrador</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-left">${esc(padrao?.nome_padrao)}</td>
                <td class="nowrap">${esc(padrao?.numero_certificado)}</td>
                <td class="nowrap">${date(padrao?.data_validade)}</td>
                <td class="nowrap">${esc(padrao?.tag || padrao?.numero_serie || padrao?.patrimonio)}</td>
                <td>${esc(padrao?.laboratorio_calibrador)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          ${sectionTitle("5", "Resultado da Avaliação")}
          <div class="info-grid info-grid-3 summary-block">
            ${field("Resultado geral:", resultLabel(execucao.resultado_geral))}
            ${field("Data do ensaio:", date(execucao.data_teste))}
            ${field("Próxima certificação:", date(execucao.data_validade))}
          </div>
          <div class="info-box mt-compact">${escPreserveBreaks(buildNotaResultado(execucao))}</div>
        </section>

        <section class="section">
          ${sectionTitle("6", "Resultados dos Testes de Segurança Elétrica")}
          <table class="data-table result-table">
            <thead>
              <tr>
                <th class="text-left">Características</th>
                <th class="center nowrap">Unidade</th>
                <th class="center">Valor esperado</th>
                <th class="center">Valor registrado</th>
                <th class="center nowrap">Desvio</th>
                <th class="center">Resultado</th>
              </tr>
            </thead>
            <tbody>${buildResultados(resultados)}</tbody>
          </table>
        </section>

        ${
          execucao.observacoes
            ? `
              <section class="section">
                ${sectionTitle("7", "Observações")}
                <div class="info-box">${escPreserveBreaks(execucao.observacoes)}</div>
              </section>
            `
            : ""
        }

        <section class="section summary-signatures">
          ${sectionTitle(execucao.observacoes ? "8" : "7", "Assinaturas")}
          <div class="signature-area">
            ${assinaturaBlock({
              dataUrl: assinaturas.tecnico?.dataUrl,
              nome: assinaturas.tecnico?.nome || execucao.tecnico_executor_nome,
              funcao: "Técnico Executor",
            })}
            ${assinaturaBlock({
              dataUrl: assinaturas.responsavel?.dataUrl,
              nome: assinaturas.responsavel?.nome || execucao.responsavel_tecnico_nome,
              funcao: "Responsável Técnico / Signatário Autorizado",
              registro: RESPONSAVEL_TECNICO_CREA,
            })}
            ${assinaturaBlock({
              dataUrl: assinaturas.solicitante?.dataUrl,
              nome:
                assinaturas.solicitante?.nome ||
                execucao.responsavel_solicitante ||
                execucao.empresa?.contato ||
                getEmpresaNome(execucao),
              funcao: "Solicitante",
            })}
          </div>
        </section>
      </main>
    </body>
  </html>`;
};

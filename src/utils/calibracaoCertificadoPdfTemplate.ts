import type {
  CalibracaoExecucao,
  CalibracaoExecucaoPonto,
  CalibracaoExecucaoTabela,
} from "@/services/calibracaoExecucoesService";
import type { AssinaturasDocumento } from "@/services/assinaturasService";
import { formatNumeroCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import {
  formatarDataPadrao,
  formatarLocalCalibracao,
  formatarMesAno,
} from "@/utils/calibracaoValidade";
import {
  formatarNumeroComCasas,
  formatDecimalPtBr,
  obterCasasResolucaoEquipamento,
} from "@/utils/numberUtils";
import { PDF_DOCUMENT_BASE_CSS } from "@/utils/pdfDocumentStyles";
import { setorParaDocumento } from "@/utils/setor";

export const CALIBRACAO_CERTIFICADO_FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const RESPONSAVEL_TECNICO = "Ícaro Heitor Piris Rezende";
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
  return String(value).trim() !== "" && String(value).trim() !== EMPTY;
};

const escPreserveBreaks = (value?: string | number | null) =>
  esc(value).replace(/\n/g, "<br>");

const date = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : EMPTY;

const decimal = (value?: number | null) => formatDecimalPtBr(value, 8) || EMPTY;

const incertezaReportada = (value?: number | null, casas?: number | null) =>
  formatDecimalPtBr(value, casas ?? 8, casas ?? 0) || EMPTY;

const condicaoAmbiental = (
  value?: number | null,
  incerteza?: number | null,
  unidade?: string | null
) =>
  value == null
    ? EMPTY
    : `${decimal(value)}${incerteza == null ? "" : ` ± ${decimal(incerteza)}`} ${
        unidade || ""
      }`.trim();

const resultadoCalibracao = (value?: string | null) => {
  const map: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Não conforme",
    sem_criterio: EMPTY,
    sem_declaracao_conformidade: EMPTY,
  };

  return value ? map[value] || value : EMPTY;
};

const regraDecisaoLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    aprovado_simples: "Aprovação simples",
    incerteza_favoravel: "Incerteza favorável",
    incerteza_contra: "Incerteza contra",
    zona_guarda: "Zona de guarda",
  };

  return value ? map[value] || value : EMPTY;
};

const getEnderecoEmpresa = (empresa: CalibracaoExecucao["empresa"]) => {
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

const getTipoEquipamento = (execucao: CalibracaoExecucao) =>
  execucao.equipamento?.tipo_equipamento?.nome ||
  execucao.equipamento?.tipo_texto ||
  EMPTY;

const getIdentificacaoEquipamento = (execucao: CalibracaoExecucao) =>
  execucao.equipamento?.tag ||
  execucao.equipamento?.patrimonio ||
  execucao.equipamento?.numero_serie ||
  EMPTY;

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

const buildPadroes = (execucao: CalibracaoExecucao) => {
  const padroes = Array.from(
    new Map(
      (execucao.tabelas || []).map((tabela) => [
        tabela.padrao_id || tabela.id,
        {
          nome: tabela.padrao_nome_snapshot,
          certificado: tabela.padrao_numero_certificado_snapshot,
          validade: tabela.padrao_validade_snapshot,
          identificacao: tabela.padrao_identificacao_snapshot,
          laboratorio: tabela.padrao_laboratorio_snapshot,
        },
      ])
    ).values()
  );

  return padroes.filter((padrao) =>
    [
      padrao.nome,
      padrao.certificado,
      padrao.validade,
      padrao.identificacao,
      padrao.laboratorio,
    ].some(hasValue)
  );
};

const buildNotasComplementares = (execucao: CalibracaoExecucao) => {
  const regras = Array.from(
    new Set(
      (execucao.tabelas || [])
        .map((tabela) => tabela.regra_decisao_snapshot)
        .filter(Boolean)
        .map((regra) => regraDecisaoLabel(regra))
    )
  );
  const notaConformidade = execucao.criterio_conformidade_aplicado
    ? `A declaração de conformidade foi emitida conforme as regras de decisão registradas nas tabelas desta calibração${
        regras.length ? `: ${regras.join(", ")}` : ""
      }.`
    : "Não foi emitida declaração de conformidade, pois não foi solicitado ou definido critério de aceitação.";

  return [
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão combinada da medição multiplicada pelo fator de abrangência k. Quando aplicável, o fator de abrangência é determinado conforme os graus de liberdade efetivos e a distribuição t de Student, para uma probabilidade de abrangência aproximada de 95%.",
    notaConformidade,
    execucao.observacoes || "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const getLeiturasColumns = (pontos: CalibracaoExecucaoPonto[]) => {
  const quantidade = Math.max(
    0,
    ...pontos.map((ponto) => ponto.leituras?.length || 0)
  );

  return Array.from({ length: quantidade }, (_, index) => index);
};

const formatPontoValue = (
  value: number | null | undefined,
  casas?: number | null
) => (value == null ? EMPTY : formatarNumeroComCasas(value, casas ?? 8));

const buildResultadoTabela = (execucao: CalibracaoExecucao, tabela: CalibracaoExecucaoTabela) => {
  const pontos = [...(tabela.pontos || [])].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );
  const leituraColumns = getLeiturasColumns(pontos);
  const casasResolucaoEquipamento = obterCasasResolucaoEquipamento(
    tabela.resolucao_equipamento_texto_snapshot,
    tabela.resolucao_equipamento_snapshot
  );
  const resolucao =
    tabela.resolucao_equipamento_texto_snapshot ||
    decimal(tabela.resolucao_equipamento_snapshot);
  const parametrosTabela = [
    hasValue(resolucao)
      ? {
          label: "Valor de uma divisão",
          value: `${resolucao}${hasValue(tabela.unidade_snapshot) ? ` ${tabela.unidade_snapshot}` : ""}`,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const criterioTexto = tabela.incluir_criterio_aceitacao_snapshot
    ? [
        tabela.criterio_aceitacao_tipo_snapshot,
        tabela.criterio_aceitacao_valor_minimo_snapshot != null
          ? `min ${decimal(tabela.criterio_aceitacao_valor_minimo_snapshot)}`
          : null,
        tabela.criterio_aceitacao_valor_maximo_snapshot != null
          ? `max ${decimal(tabela.criterio_aceitacao_valor_maximo_snapshot)}`
          : null,
        regraDecisaoLabel(tabela.regra_decisao_snapshot),
      ]
        .filter(Boolean)
        .join(" | ")
    : "";

  return `
    <section class="result-block">
      <h3 class="result-title">${esc(tabela.nome_snapshot)}</h3>
      <div class="result-meta">
        ${parametrosTabela
          .map(
            (parametro) => `
              <div>
                <span>${esc(parametro.label)}:</span>
                <strong>${esc(parametro.value)}</strong>
              </div>
            `
          )
          .join("")}
        ${criterioTexto ? `<div><span>Critério:</span><strong>${esc(criterioTexto)}</strong></div>` : ""}
      </div>
      <table class="data-table result-table">
        <thead>
          <tr>
            <th>Valor nominal / referência</th>
            ${leituraColumns
              .map((index) => `<th class="center">VM(${index + 1})</th>`)
              .join("")}
            <th class="center">Média</th>
            <th class="center">Tendência</th>
            <th class="center">Incerteza expandida</th>
            <th class="center">k</th>
            ${
              execucao.criterio_conformidade_aplicado
                ? '<th class="center">Resultado</th>'
                : ""
            }
            <th class="text-left">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${
            pontos.length
              ? pontos
                  .map((ponto) => {
                    const casasResultado =
                      ponto.casas_decimais_incerteza ?? casasResolucaoEquipamento;

                    return `
                      <tr>
                        <td>${esc(
                          ponto.valor_nominal_texto_snapshot ||
                            decimal(ponto.valor_nominal)
                        )}</td>
                        ${leituraColumns
                          .map((index) => {
                            const leitura = ponto.leituras?.[index];
                            return `<td class="center">${esc(
                              leitura?.valor_medido_texto ||
                                formatPontoValue(
                                  leitura?.valor_medido,
                                  leitura?.casas_decimais
                                )
                            )}</td>`;
                          })
                          .join("")}
                        <td class="center">${formatPontoValue(
                          ponto.media_valores_medidos,
                          casasResolucaoEquipamento
                        )}</td>
                        <td class="center">${formatPontoValue(
                          ponto.tendencia_corrigida ?? ponto.tendencia_bruta,
                          casasResultado
                        )}</td>
                        <td class="center">${incertezaReportada(
                          ponto.incerteza_expandida_reportada ??
                            ponto.incerteza_expandida,
                          ponto.casas_decimais_incerteza
                        )}</td>
                        <td class="center">${decimal(ponto.fator_abrangencia_k)}</td>
                        ${
                          execucao.criterio_conformidade_aplicado
                            ? `<td class="center">${esc(
                                resultadoCalibracao(ponto.resultado_conformidade)
                              )}</td>`
                            : ""
                        }
                        <td class="text-left">${esc(ponto.observacoes)}</td>
                      </tr>
                    `;
                  })
                  .join("")
              : `<tr><td colspan="${
                  6 + leituraColumns.length + (execucao.criterio_conformidade_aplicado ? 1 : 0)
                }" class="center">Nenhum ponto registrado.</td></tr>`
          }
        </tbody>
      </table>
    </section>
  `;
};

const buildPadroesTable = (
  padroes: ReturnType<typeof buildPadroes>
) => {
  const columns = [
    {
      key: "nome",
      label: "Nome",
      className: "text-left",
      value: (padrao: (typeof padroes)[number]) => padrao.nome,
      visible: padroes.some((padrao) => hasValue(padrao.nome)),
    },
    {
      key: "certificado",
      label: "Certificado",
      className: "nowrap",
      value: (padrao: (typeof padroes)[number]) => padrao.certificado,
      visible: padroes.some((padrao) => hasValue(padrao.certificado)),
    },
    {
      key: "validade",
      label: "Validade",
      className: "nowrap",
      value: (padrao: (typeof padroes)[number]) =>
        hasValue(padrao.validade) ? formatarDataPadrao(padrao.validade) : "",
      visible: padroes.some((padrao) => hasValue(padrao.validade)),
    },
    {
      key: "identificacao",
      label: "Identificação",
      className: "nowrap",
      value: (padrao: (typeof padroes)[number]) => padrao.identificacao,
      visible: padroes.some((padrao) => hasValue(padrao.identificacao)),
    },
    {
      key: "laboratorio",
      label: "Órgão calibrador",
      className: "",
      value: (padrao: (typeof padroes)[number]) => padrao.laboratorio,
      visible: padroes.some((padrao) => hasValue(padrao.laboratorio)),
    },
  ].filter((column) => column.visible);

  if (!padroes.length || !columns.length) {
    return `
      <table class="data-table">
        <tbody>
          <tr><td class="center">Nenhum padrão registrado.</td></tr>
        </tbody>
      </table>
    `;
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          ${columns
            .map(
              (column) =>
                `<th${column.className ? ` class="${column.className}"` : ""}>${esc(column.label)}</th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${padroes
          .map(
            (padrao) => `
              <tr>
                ${columns
                  .map((column) => {
                    const value = column.value(padrao);
                    return `<td${column.className ? ` class="${column.className}"` : ""}>${hasValue(value) ? esc(value) : ""}</td>`;
                  })
                  .join("")}
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
};

const signatureBlock = ({
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

  .result-block {
    margin-top: 15px;
    padding-top: 2px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .result-block + .result-block {
    margin-top: 20px;
  }

  .result-title {
    margin: 0 0 3px;
    font-size: 11.7px;
    font-weight: 750;
    color: var(--ink);
    break-after: avoid;
    page-break-after: avoid;
  }

  .result-meta {
    display: grid;
    gap: 2px;
    margin: 0 0 8px 20px;
    font-size: 10px;
    color: var(--value);
    line-height: 1.25;
  }

  .result-meta:empty {
    display: none;
  }

  .result-meta div {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }

  .result-meta span {
    min-width: 112px;
    color: var(--ink);
    font-weight: 750;
  }

  .result-meta strong {
    color: var(--value);
    font-weight: 500;
  }

  .result-table {
    margin-bottom: 4px;
  }

  .summary-signatures,
  .result-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

export const buildCalibracaoCertificadoHtml = (
  execucao: CalibracaoExecucao,
  logoSrc: string,
  assinaturas: AssinaturasDocumento = {}
) => {
  const empresa = execucao.empresa;
  const equipamento = execucao.equipamento;
  const numero = formatNumeroCertificadoCalibracao(execucao.numero_certificado);
  const padroes = buildPadroes(execucao);
  const responsavelNome =
    assinaturas.responsavel?.nome ||
    execucao.responsavel_tecnico_nome ||
    RESPONSAVEL_TECNICO;
  const responsavelRegistro =
    execucao.responsavel_tecnico_registro || RESPONSAVEL_TECNICO_CREA;

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
            <h1>Certificado de Calibração</h1>
            <div class="document-code">${esc(numero)}</div>
            <div class="document-meta">
              Emissão: ${date(execucao.data_emissao)}
              ${execucao.numero_revisao > 0 ? `<br>Revisão: ${esc(execucao.numero_revisao)}` : ""}
            </div>
          </div>
        </header>

        <section class="section">
          ${sectionTitle("1", "Dados do Contratante")}
          <div class="info-grid info-grid-2 client-identification">
            ${field("Nome:", empresa?.nome || empresa?.nome_fantasia)}
            ${field("Contato:", [empresa?.contato, empresa?.telefone || empresa?.celular].filter(Boolean).join(" / "))}
            ${field("Endereço:", getEnderecoEmpresa(empresa), true)}
            ${field("CPF/CNPJ:", empresa?.cpf_cnpj)}
            ${field("E-mail:", empresa?.email, true)}
            ${field("Fantasia:", empresa?.nome_fantasia)}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("2", "Instrumento / Equipamento Calibrado")}
          <div class="info-grid info-grid-3">
            ${optionalField("Tipo:", getTipoEquipamento(execucao))}
            ${optionalField("Identificação:", getIdentificacaoEquipamento(execucao))}
            ${optionalField("Modelo:", equipamento?.modelo)}
            ${optionalField("Fabricante:", equipamento?.fabricante)}
            ${optionalField("Número de Série:", equipamento?.numero_serie)}
            ${optionalField("Patrimônio:", equipamento?.patrimonio)}
            ${optionalField("TAG:", equipamento?.tag)}
            ${optionalField("Setor:", setorParaDocumento(equipamento?.setor))}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("3", "Condições Ambientais")}
          <div class="info-grid info-grid-3">
            ${field("Local:", formatarLocalCalibracao(execucao.local_calibracao))}
            ${field("Temperatura:", condicaoAmbiental(execucao.temperatura_ambiente, execucao.incerteza_temperatura, execucao.unidade_temperatura))}
            ${field("Umidade Relativa:", condicaoAmbiental(execucao.umidade_relativa, execucao.incerteza_umidade, execucao.unidade_umidade))}
            ${field("Pressão atmosférica:", condicaoAmbiental(execucao.pressao_atmosferica, execucao.incerteza_pressao, execucao.unidade_pressao))}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("4", "Padrões Utilizados")}
          ${buildPadroesTable(padroes)}
        </section>

        <section class="section">
          ${sectionTitle("5", "Procedimento de Calibração")}
          <div class="info-grid info-grid-3">
            ${field("Procedimento:", execucao.procedimento_nome_snapshot)}
            ${field("Versão interna:", execucao.procedimento_versao_snapshot)}
            ${field("Norma utilizada:", execucao.norma_utilizada_snapshot)}
            ${field("Critério de aceitação:", execucao.criterio_conformidade_aplicado ? "Aplicado" : "Não aplicado")}
          </div>
        </section>

        <section class="section">
          ${sectionTitle("6", "Informações Complementares")}
          <div class="info-box">${escPreserveBreaks(buildNotasComplementares(execucao))}</div>
        </section>

        <section class="section">
          ${sectionTitle("7", "Resultados")}
          ${(execucao.tabelas || [])
            .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
            .map((tabela) => buildResultadoTabela(execucao, tabela))
            .join("")}
        </section>

        <section class="section summary-signatures">
          ${sectionTitle("8", "Resumo da Calibração")}
          <div class="info-grid info-grid-3 summary-block">
            ${field("Local:", formatarLocalCalibracao(execucao.local_calibracao))}
            ${field("Data da Calibração:", date(execucao.data_calibracao))}
            ${field("Emitido em:", date(execucao.data_emissao))}
            ${field("Válido até:", formatarMesAno(execucao.validade_mes || execucao.data_validade))}
            ${field("Número:", numero)}
            ${execucao.numero_revisao > 0 ? field("Revisão:", execucao.numero_revisao) : ""}
            ${field("Resultado final:", resultadoCalibracao(execucao.resultado_geral))}
          </div>

          ${sectionTitle("9", "Assinaturas")}
          <div class="signature-area">
            ${signatureBlock({
              dataUrl: assinaturas.tecnico?.dataUrl,
              nome: assinaturas.tecnico?.nome || execucao.tecnico_executor_nome,
              funcao: "Técnico Executor",
              registro: execucao.tecnico_executor_registro,
            })}
            ${signatureBlock({
              dataUrl: assinaturas.responsavel?.dataUrl,
              nome: responsavelNome,
              funcao: "Responsável Técnico / Signatário Autorizado",
              registro: responsavelRegistro,
            })}
            ${signatureBlock({
              dataUrl: assinaturas.solicitante?.dataUrl,
              nome:
                assinaturas.solicitante?.nome ||
                execucao.responsavel_solicitante ||
                empresa?.contato ||
                empresa?.nome || empresa?.nome_fantasia,
              funcao: "Solicitante",
            })}
          </div>
        </section>
      </main>
    </body>
  </html>`;
};

import type {
  SegurancaEletricaExecucao,
  SegurancaEletricaResultado,
} from "@/services/segurancaEletricaService";
import { formatNumeroCertificadoSegurancaEletrica } from "@/services/segurancaEletricaService";
import { getEquipamentoLabel } from "@/utils/equipamentoDisplay";
import { formatDecimalSeguranca } from "@/utils/segurancaEletricaTemplate";
import type { AssinaturasDocumento } from "@/services/assinaturasService";

const FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";
const RESPONSAVEL_TECNICO_CREA = "CREA: 142085302-3";

const esc = (value?: string | number | null) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const date = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";

const resultLabel = (value?: string | null) => {
  if (value === "aprovado") return "APROVADO";
  if (value === "reprovado") return "REPROVADO";
  return "N/A";
};

const resultClass = (value?: string | null) => {
  if (value === "aprovado") return "approved";
  if (value === "reprovado") return "failed";
  return "na";
};

const field = (label: string, value?: string | number | null) =>
  `<div class="field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

const getEmpresaNome = (execucao: SegurancaEletricaExecucao) =>
  execucao.empresa?.nome_fantasia ||
  execucao.empresa?.nome ||
  "Nao informado";

const getEnderecoEmpresa = (execucao: SegurancaEletricaExecucao) =>
  [
    [execucao.empresa?.rua, execucao.empresa?.numero].filter(Boolean).join(", "),
    execucao.empresa?.bairro,
    [execucao.empresa?.cidade, execucao.empresa?.estado].filter(Boolean).join(" - "),
    execucao.empresa?.cep ? `CEP ${execucao.empresa.cep}` : "",
  ]
    .filter(Boolean)
    .join(" - ");

const formatValorRegistrado = (item: SegurancaEletricaResultado) =>
  item.valor_registrado_texto ||
  (item.valor_registrado == null
    ? "-"
    : formatDecimalSeguranca(item.valor_registrado));

const groupBy = (resultados: SegurancaEletricaResultado[]) =>
  resultados.reduce<Record<string, SegurancaEletricaResultado[]>>((acc, item) => {
    if (!acc[item.grupo]) acc[item.grupo] = [];
    acc[item.grupo].push(item);
    return acc;
  }, {});

const buildResultados = (resultados: SegurancaEletricaResultado[]) => {
  const grupos = groupBy(resultados);

  return Object.entries(grupos)
    .map(
      ([grupo, itens]) => `
        <tr class="group-row"><td colspan="6">${esc(grupo)}</td></tr>
        ${itens
          .map(
            (item) => `
              <tr>
                <td>${esc(item.caracteristica)}</td>
                <td class="center">${esc(item.unidade)}</td>
                <td class="numeric">${esc(item.valor_esperado_texto)}</td>
                <td class="numeric">${esc(formatValorRegistrado(item))}</td>
                <td class="numeric">${esc(item.desvio_texto || "N/A")}</td>
                <td class="center ${resultClass(item.resultado)}">${resultLabel(item.resultado)}</td>
              </tr>
            `
          )
          .join("")}
      `
    )
    .join("");
};

const styles = `
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:#111827;font:12px Arial,Helvetica,sans-serif}
  .document{width:1123px;min-height:1588px;padding:42px;background:#fff}
  header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-top:6px solid #c5161d;padding-top:14px;margin-bottom:14px}
  .logo{width:190px;height:auto}
  h1{font-size:22px;margin:0 0 6px;text-align:right;color:#111827}
  h2{font-size:15px;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:16px 0 8px;color:#111827}
  .meta{text-align:right;color:#6b7280;line-height:1.45}
  .meta strong{display:block;color:#111827;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;border:1px solid #e5e7eb;border-radius:6px;padding:10px}
  .field span{display:block;color:#6b7280;font-size:9px;font-weight:700;text-transform:uppercase;margin-bottom:2px}
  .field strong{display:block;color:#111827;font-size:12px;word-break:break-word}
  .note{white-space:pre-wrap;border-left:3px solid #c5161d;background:#fff7f7;padding:10px;line-height:1.45;border-radius:4px}
  .status{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;font-weight:700}
  .status.approved{background:#dcfce7;color:#166534}
  .status.failed{background:#fee2e2;color:#991b1b}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;page-break-inside:auto}
  thead{display:table-header-group}
  tr{page-break-inside:avoid}
  th,td{border:1px solid #e5e7eb;padding:5px 6px;text-align:left;vertical-align:middle}
  th{background:#f3f4f6;color:#111827;font-size:10px;text-transform:uppercase}
  .group-row td{background:#f9fafb;color:#111827;font-weight:700;text-align:center}
  .numeric{text-align:right;white-space:nowrap}
  .center{text-align:center}
  .approved{color:#166534;font-weight:700}
  .failed{color:#991b1b;font-weight:700}
  .na{color:#6b7280;font-weight:700}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:42px;text-align:center}
  .line{border-top:1px solid #777;padding-top:8px}
  .signature-image{height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:3px}
  .signature-image img{display:block;max-width:90%;max-height:62px;object-fit:contain}
  footer{border-top:1px solid #ddd;margin-top:28px;padding-top:8px;color:#6b7280;font-size:10px;text-align:center}
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

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${styles}</style></head>
  <body><main class="document">
    <header>
      <img class="logo" src="${logoSrc}" alt="ACI">
      <div>
        <h1>Avaliação de Segurança Elétrica</h1>
        <div class="meta"><strong>${esc(numero)}</strong>Emissão: ${esc(date(execucao.data_emissao))}</div>
      </div>
    </header>

    <h2>1. Identificação do Cliente</h2>
    <section class="grid">
      ${field("Cliente", getEmpresaNome(execucao))}
      ${field("CPF/CNPJ", execucao.empresa?.cpf_cnpj)}
      ${field("Endereço", getEnderecoEmpresa(execucao))}
      ${field("Cidade", execucao.empresa?.cidade)}
      ${field("UF", execucao.empresa?.estado)}
      ${field("CEP", execucao.empresa?.cep)}
    </section>

    <h2>2. Identificação do Equipamento</h2>
    <section class="grid">
      ${field("Equipamento", equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto)}
      ${field("Identificação", getEquipamentoLabel(equipamento))}
      ${field("Marca", equipamento?.fabricante)}
      ${field("Modelo", equipamento?.modelo)}
      ${field("Patrimônio", equipamento?.patrimonio)}
      ${field("Nº de Série", equipamento?.numero_serie)}
      ${field("Classe", execucao.classe_equipamento)}
      ${field("Parte aplicada", execucao.tipo_parte_aplicada)}
      ${field("Setor", equipamento?.setor)}
    </section>

    <h2>3. Condições Ambientais</h2>
    <section class="grid">
      ${field("Temperatura (ºC)", execucao.temperatura_ambiente_texto)}
      ${field("U.R. (%)", execucao.umidade_relativa_texto)}
      ${field("Instrumento", padrao?.nome_padrao || "Termo-higrômetro")}
    </section>

    <h2>4. Padrão Utilizado</h2>
    <section class="grid">
      ${field("Instrumento", padrao?.nome_padrao)}
      ${field("Nº Série", padrao?.numero_serie || padrao?.patrimonio || padrao?.tag)}
      ${field("Nº do Certificado", padrao?.numero_certificado)}
      ${field("Data Cal.", date(padrao?.data_calibracao))}
      ${field("Data Val. Cal.", date(padrao?.data_validade))}
      ${field("Órgão Calibrador", padrao?.laboratorio_calibrador)}
    </section>

    <h2>5. Resultado da Avaliação</h2>
    <div class="note">O equipamento encontra-se <span class="status ${resultClass(execucao.resultado_geral)}">${resultLabel(execucao.resultado_geral)}</span> conforme os resultados obtidos em anexo.

Este documento certifica que os padrões listados foram utilizados para avaliar o equipamento identificado acima, de acordo com os padrões adotados em procedimento específico e com a NBR IEC 60601-1. A exatidão e calibração dos instrumentos utilizados são direta ou indiretamente rastreáveis ao INMETRO, através de calibrações realizadas em intervalos periódicos. Este certificado refere-se somente aos itens avaliados, não sendo permitida sua reprodução parcial.

O resultado das medições apresentadas neste certificado refere-se ao resultado não corrigido.</div>

    <section class="grid" style="margin-top:10px">
      ${field("Data da realização do teste", date(execucao.data_teste))}
      ${field("Data da emissão", date(execucao.data_emissao))}
      ${field("Próxima certificação", date(execucao.data_validade))}
    </section>

    <h2>6. Resultado dos Testes de Segurança Elétrica - ${esc(execucao.classe_equipamento)} - ${esc(execucao.tipo_parte_aplicada)}</h2>
    <table>
      <thead>
        <tr>
          <th>Características</th>
          <th>Unidade</th>
          <th>Valor Esperado</th>
          <th>Valor Registrado</th>
          <th>Desvio</th>
          <th>Aprovação</th>
        </tr>
      </thead>
      <tbody>${buildResultados(resultados)}</tbody>
    </table>

    ${execucao.observacoes ? `<h2>7. Observações</h2><div class="note">${esc(execucao.observacoes)}</div>` : ""}

    <div class="sign">
      <div><div class="signature-image">${assinaturas.tecnico?.dataUrl ? `<img src="${assinaturas.tecnico.dataUrl}" alt="Assinatura do tecnico executor">` : ""}</div><div class="line">${esc(assinaturas.tecnico?.nome || execucao.tecnico_executor_nome)}<br>Técnico Executor</div></div>
      <div><div class="signature-image">${assinaturas.responsavel?.dataUrl ? `<img src="${assinaturas.responsavel.dataUrl}" alt="Assinatura do responsavel tecnico">` : ""}</div><div class="line">${esc(assinaturas.responsavel?.nome || execucao.responsavel_tecnico_nome)}<br>${esc(RESPONSAVEL_TECNICO_CREA)}<br>Responsável Técnico</div></div>
    </div>
    <footer>${esc(FOOTER)}</footer>
  </main></body></html>`;
};

import type { CalibracaoExecucao } from "@/services/calibracaoExecucoesService";
import { formatNumeroCertificadoCalibracao } from "@/services/calibracaoExecucoesService";
import { formatarDataPadrao, formatarLocalCalibracao, formatarMesAno } from "@/utils/calibracaoValidade";
import { formatarNumeroComCasas, formatDecimalPtBr, obterCasasResolucaoEquipamento } from "@/utils/numberUtils";

const FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";
const RESPONSAVEL_TECNICO = "Ícaro Heitor Piris Rezende";
const RESPONSAVEL_TECNICO_CREA = "CREA: 142085302-3";

const esc = (value?: string | number | null) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const date = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const decimal = (value?: number | null) => formatDecimalPtBr(value, 8) || "-";
const incertezaReportada = (value?: number | null, casas?: number | null) =>
  formatDecimalPtBr(value, casas ?? 8, casas ?? 0) || "-";
const condicaoAmbiental = (
  value?: number | null,
  incerteza?: number | null,
  unidade?: string | null
) =>
  value == null
    ? "-"
    : `${decimal(value)}${incerteza == null ? "" : ` ± ${decimal(incerteza)}`} ${unidade || ""}`;
const field = (label: string, value?: string | number | null) =>
  `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;

const styles = `
  *{box-sizing:border-box} body{margin:0;background:#fff;color:#1f2937;font:13px Arial,sans-serif}
  .document{width:1123px;min-height:1588px;padding:42px;background:#fff}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-top:6px solid #c5161d;padding-top:14px}
  img{width:190px} h1{font-size:22px;margin:0 0 6px;text-align:right} h2{font-size:16px;border-bottom:1px solid #ddd;padding-bottom:5px;margin:18px 0 8px}
  .meta{text-align:right;color:#6b7280}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;border:1px solid #e5e7eb;border-radius:6px;padding:10px}
  small{display:block;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:2px} strong{display:block}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;page-break-inside:auto} thead{display:table-header-group}
  tr{page-break-inside:avoid} th,td{border:1px solid #e5e7eb;padding:6px;text-align:left} th{background:#f3f4f6}
  .note{white-space:pre-wrap;border-left:3px solid #c5161d;background:#fff7f7;padding:10px;line-height:1.45}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:42px;text-align:center}.line{border-top:1px solid #777;padding-top:8px}
  footer{border-top:1px solid #ddd;margin-top:32px;padding-top:8px;color:#6b7280;font-size:10px;text-align:center}
`;

export const buildCalibracaoCertificadoHtml = (
  execucao: CalibracaoExecucao,
  logoSrc: string
) => {
  const empresa = execucao.empresa;
  const equipamento = execucao.equipamento;
  const numero = formatNumeroCertificadoCalibracao(execucao.numero_certificado);
  const padroes = Array.from(
    new Map(
      (execucao.tabelas || []).map((tabela) => [
        tabela.padrao_id,
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
  const notaConformidade = execucao.criterio_conformidade_aplicado
    ? `A declaracao de conformidade foi emitida conforme as regras de decisao registradas nas tabelas desta calibracao: ${Array.from(new Set((execucao.tabelas || []).map((tabela) => tabela.regra_decisao_snapshot).filter(Boolean))).join(", ")}.`
    : "Nao foi emitida declaracao de conformidade, pois nao foi solicitado ou definido criterio de aceitacao.";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${styles}</style></head>
  <body><main class="document">
    <header><img src="${logoSrc}" alt="ACI"><div><h1>Certificado de Calibracao</h1><div class="meta"><strong>${numero}</strong>${execucao.numero_revisao > 0 ? `<br>Revisao: ${execucao.numero_revisao}` : ""}<br>Emissao: ${date(execucao.data_emissao)}</div></div></header>
    <h2>1. Dados do Contratante</h2><section class="grid">
      ${field("Nome", empresa?.nome_fantasia || empresa?.nome)}${field("CPF/CNPJ", empresa?.cpf_cnpj)}
      ${field("Endereco", [empresa?.rua, empresa?.numero, empresa?.bairro, empresa?.cidade, empresa?.estado].filter(Boolean).join(", "))}
      ${field("Telefone", empresa?.telefone || empresa?.celular)}${field("Contato", empresa?.contato)}${field("E-mail", empresa?.email)}
    </section>
    <h2>2. Instrumento / Equipamento Calibrado</h2><section class="grid">
      ${field("Tipo", equipamento?.tipo_equipamento?.nome || equipamento?.tipo_texto)}${field("Identificacao", equipamento?.tag || equipamento?.patrimonio)}
      ${field("Modelo", equipamento?.modelo)}${field("Fabricante", equipamento?.fabricante)}${field("Numero de serie", equipamento?.numero_serie)}${field("Patrimonio", equipamento?.patrimonio)}
    </section>
    <h2>3. Condicoes Ambientais</h2><section class="grid">
      ${field("Local", formatarLocalCalibracao(execucao.local_calibracao))}${field("Temperatura", condicaoAmbiental(execucao.temperatura_ambiente, execucao.incerteza_temperatura, execucao.unidade_temperatura))}
      ${field("Umidade relativa", condicaoAmbiental(execucao.umidade_relativa, execucao.incerteza_umidade, execucao.unidade_umidade))}
    </section>
    <h2>4. Padroes Utilizados</h2><table><thead><tr><th>Nome</th><th>Certificado</th><th>Validade</th><th>Identificacao</th><th>Orgao calibrador</th></tr></thead>
      <tbody>${padroes.map((p) => `<tr><td>${esc(p.nome)}</td><td>${esc(p.certificado)}</td><td>${formatarDataPadrao(p.validade)}</td><td>${esc(p.identificacao)}</td><td>${esc(p.laboratorio)}</td></tr>`).join("")}</tbody></table>
    <h2>5. Procedimento de Calibracao</h2><section class="grid">${field("Procedimento", execucao.procedimento_nome_snapshot)}${field("Versao interna", execucao.procedimento_versao_snapshot)}${field("Norma utilizada", execucao.norma_utilizada_snapshot)}</section>
    <h2>6. Informacoes Complementares</h2><div class="note">A incerteza expandida de medicao relatada e declarada como a incerteza padrao combinada da medicao multiplicada pelo fator de abrangencia k. Quando aplicavel, o fator de abrangencia e determinado conforme os graus de liberdade efetivos e a distribuicao t de Student, para uma probabilidade de abrangencia aproximada de 95%.\n\n${notaConformidade}</div>
    <h2>7. Resultados</h2>
    ${(execucao.tabelas || []).map((tabela) => {
      const casasResolucaoEquipamento = obterCasasResolucaoEquipamento(
        tabela.resolucao_equipamento_texto_snapshot,
        tabela.resolucao_equipamento_snapshot
      );
      return `<h3>${esc(tabela.nome_snapshot)}</h3><div>Valor de uma divisao: ${esc(tabela.resolucao_equipamento_texto_snapshot || decimal(tabela.resolucao_equipamento_snapshot))} ${esc(tabela.unidade_snapshot)}</div>
      <table><thead><tr><th>Valor nominal/referencia</th><th>Media dos valores medidos</th><th>Tendencia</th><th>Incerteza expandida</th><th>k</th>${execucao.criterio_conformidade_aplicado ? "<th>Resultado</th>" : ""}</tr></thead>
      <tbody>${(tabela.pontos || []).map((ponto) => `<tr><td>${esc(ponto.valor_nominal_texto_snapshot || decimal(ponto.valor_nominal))}</td><td>${formatarNumeroComCasas(ponto.media_valores_medidos, casasResolucaoEquipamento)}</td><td>${formatarNumeroComCasas(ponto.tendencia_corrigida ?? ponto.tendencia_bruta, casasResolucaoEquipamento)}</td><td>${incertezaReportada(ponto.incerteza_expandida_reportada ?? ponto.incerteza_expandida, ponto.casas_decimais_incerteza)}</td><td>${decimal(ponto.fator_abrangencia_k)}</td>${execucao.criterio_conformidade_aplicado ? `<td>${esc(ponto.resultado_conformidade)}</td>` : ""}</tr>`).join("")}</tbody></table>`;
    }).join("")}
    <h2>Resumo da Calibracao</h2><section class="grid">${field("Local", formatarLocalCalibracao(execucao.local_calibracao))}${field("Data da calibracao", date(execucao.data_calibracao))}${field("Emitido em", date(execucao.data_emissao))}${field("Valido ate", formatarMesAno(execucao.validade_mes || execucao.data_validade))}${field("Numero", numero)}${execucao.numero_revisao > 0 ? field("Revisao", execucao.numero_revisao) : ""}${execucao.criterio_conformidade_aplicado ? field("Resultado geral", execucao.resultado_geral) : ""}</section>
    <div class="sign"><div class="line">${esc(execucao.tecnico_executor_nome)}<br>Tecnico Executor</div><div class="line">${esc(RESPONSAVEL_TECNICO)}<br>${esc(RESPONSAVEL_TECNICO_CREA)}<br>Responsavel Tecnico / Signatario Autorizado</div></div>
    <footer>${esc(FOOTER)}</footer>
  </main></body></html>`;
};

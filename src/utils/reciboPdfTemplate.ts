import type { Recibo } from "@/services/utilitariosService";

const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
};

const getEmpresaNome = (recibo: Recibo) =>
  recibo.empresa?.nome || recibo.empresa?.nome_fantasia || "-";

const getEmpresaDocumento = (recibo: Recibo) => recibo.empresa?.cpf_cnpj || "-";

const getEmpresaEndereco = (recibo: Recibo) =>
  [
    recibo.empresa?.rua,
    recibo.empresa?.numero ? `nº ${recibo.empresa.numero}` : null,
    recibo.empresa?.complemento,
    recibo.empresa?.bairro,
    recibo.empresa?.cidade,
    recibo.empresa?.estado,
    recibo.empresa?.cep ? `CEP ${recibo.empresa.cep}` : null,
  ]
    .filter(Boolean)
    .join(" - ") || "-";

const getEquipamentoNome = (recibo: Recibo) =>
  recibo.equipamento?.tipo_equipamento?.nome ||
  recibo.equipamento?.tipo_texto ||
  "Equipamento";

const getEquipamentoDescricao = (recibo: Recibo) =>
  [
    getEquipamentoNome(recibo),
    recibo.equipamento?.fabricante,
    recibo.equipamento?.modelo,
  ]
    .filter(Boolean)
    .join(" | ");

const getEquipamentoIdentificacao = (recibo: Recibo) =>
  [
    recibo.equipamento?.numero_serie
      ? `N. Série: ${recibo.equipamento.numero_serie}`
      : null,
    recibo.equipamento?.patrimonio
      ? `Patrimônio: ${recibo.equipamento.patrimonio}`
      : null,
    recibo.equipamento?.tag ? `TAG: ${recibo.equipamento.tag}` : null,
    recibo.equipamento?.setor ? `Setor: ${recibo.equipamento.setor}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "-";

const unidades = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
];
const especiais = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const dezenas = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const centenas = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

const numeroMenorMil = (valor: number): string => {
  if (valor === 0) return "";
  if (valor === 100) return "cem";

  const c = Math.floor(valor / 100);
  const resto = valor % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;
  const partes: string[] = [];

  if (c) partes.push(centenas[c]);
  if (resto >= 10 && resto < 20) partes.push(especiais[resto - 10]);
  else {
    if (d) partes.push(dezenas[d]);
    if (u) partes.push(unidades[u]);
  }

  return partes.filter(Boolean).join(" e ");
};

const numeroPorExtenso = (valor: number): string => {
  if (valor === 0) return "zero";

  const milhoes = Math.floor(valor / 1_000_000);
  const milhares = Math.floor((valor % 1_000_000) / 1000);
  const resto = valor % 1000;
  const partes: string[] = [];

  if (milhoes) {
    partes.push(`${numeroMenorMil(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  }
  if (milhares) {
    partes.push(milhares === 1 ? "mil" : `${numeroMenorMil(milhares)} mil`);
  }
  if (resto) partes.push(numeroMenorMil(resto));

  return partes.join(" e ");
};

const valorPorExtenso = (valor: number) => {
  const totalCentavos = Math.round(Number(valor || 0) * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const partes: string[] = [];

  if (reais) partes.push(`${numeroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  if (centavos) {
    partes.push(
      `${numeroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`
    );
  }

  return partes.length ? partes.join(" e ") : "zero real";
};

export const RECIBO_FOOTER_TEXT =
  "ACI Comercio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica - Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora - MG - CEP 36.080-370 - Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

export const buildReciboHtml = (
  recibo: Recibo,
  logoBase64: string,
  assinaturaDataUrl?: string | null
) => {
  const emissorNome = recibo.criado_por?.nome || "Responsável pelo recebimento";
  const clienteNome = getEmpresaNome(recibo);
  const cidade = recibo.empresa?.cidade || "Juiz de Fora";
  const estado = recibo.empresa?.estado || "MG";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            background: #fff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }
          .document {
            width: 1123px;
            min-height: 1588px;
            padding: 54px 62px 120px;
            position: relative;
          }
          .top-line {
            height: 7px;
            background: #d71920;
            border-radius: 999px;
            margin-bottom: 22px;
          }
          .header {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 24px;
            align-items: start;
            margin-bottom: 34px;
          }
          .logo {
            width: 260px;
            height: auto;
            display: block;
          }
          .title {
            text-align: right;
          }
          .title h1 {
            margin: 0;
            font-size: 42px;
            line-height: 1.05;
          }
          .title .number {
            margin-top: 8px;
            color: #6b7280;
            font-size: 18px;
            font-weight: 700;
          }
          .receipt-box {
            border: 2px solid #111827;
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 24px;
          }
          .main-text {
            font-size: 21px;
            line-height: 1.55;
            text-align: justify;
          }
          .amount {
            white-space: nowrap;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 18px;
          }
          .field {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 12px 14px;
            min-height: 62px;
          }
          .field.full { grid-column: 1 / -1; }
          .label {
            color: #6b7280;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .03em;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .value {
            font-size: 16px;
            font-weight: 700;
            line-height: 1.35;
          }
          .muted {
            color: #4b5563;
            font-weight: 500;
          }
          .date-line {
            margin: 34px 0 52px;
            text-align: center;
            font-size: 18px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            margin-top: 16px;
            page-break-inside: avoid;
          }
          .signature {
            min-height: 132px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            text-align: center;
          }
          .signature-image {
            height: 62px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            margin-bottom: 6px;
          }
          .signature-image img {
            max-width: 280px;
            max-height: 60px;
            object-fit: contain;
          }
          .signature-line {
            border-top: 1.6px solid #111827;
            padding-top: 8px;
            font-size: 14px;
            color: #374151;
          }
          .signature-name {
            font-weight: 800;
            color: #111827;
            font-size: 16px;
          }
          .notice {
            margin-top: 28px;
            border-left: 5px solid #d71920;
            background: #fff1f2;
            padding: 14px 16px;
            font-size: 14px;
            line-height: 1.45;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <main class="document">
          <div class="top-line"></div>
          <header class="header">
            <img class="logo" src="${logoBase64}" alt="ACI" />
            <div class="title">
              <h1>Recibo de Pagamento</h1>
              <div class="number">Nº ${escapeHtml(recibo.numero)}</div>
              <div class="number">Data: ${escapeHtml(formatDate(recibo.data_recibo))}</div>
            </div>
          </header>

          <section class="receipt-box">
            <div class="main-text">
              Recebemos de <strong>${escapeHtml(
                recibo.recebido_de || clienteNome
              )}</strong>, inscrito sob CPF/CNPJ <strong>${escapeHtml(
                getEmpresaDocumento(recibo)
              )}</strong>, a importância de <span class="amount">${escapeHtml(
                formatCurrency(recibo.valor)
              )}</span> (${escapeHtml(valorPorExtenso(recibo.valor))}), referente a
              <strong>${escapeHtml(recibo.referente)}</strong>.
            </div>

            <div class="grid">
              <div class="field">
                <div class="label">Cliente</div>
                <div class="value">${escapeHtml(clienteNome)}</div>
              </div>
              <div class="field">
                <div class="label">Forma de pagamento</div>
                <div class="value">${escapeHtml(recibo.forma_pagamento || "-")}</div>
              </div>
              <div class="field full">
                <div class="label">Endereço do cliente</div>
                <div class="value muted">${escapeHtml(getEmpresaEndereco(recibo))}</div>
              </div>
              <div class="field full">
                <div class="label">Equipamento</div>
                <div class="value">${escapeHtml(getEquipamentoDescricao(recibo))}</div>
                <div class="value muted">${escapeHtml(getEquipamentoIdentificacao(recibo))}</div>
              </div>
              <div class="field">
                <div class="label">Ordem de Serviço</div>
                <div class="value">${escapeHtml(
                  recibo.ordem_servico?.numero ? `OS ${recibo.ordem_servico.numero}` : "-"
                )}</div>
              </div>
              <div class="field">
                <div class="label">Orçamento</div>
                <div class="value">${escapeHtml(
                  recibo.orcamento?.numero ? `Orçamento ${recibo.orcamento.numero}` : "-"
                )}</div>
              </div>
              ${
                recibo.observacoes
                  ? `<div class="field full"><div class="label">Observações</div><div class="value muted">${escapeHtml(recibo.observacoes)}</div></div>`
                  : ""
              }
            </div>
          </section>

          <div class="date-line">${escapeHtml(cidade)}/${escapeHtml(
            estado
          )}, ${escapeHtml(formatDate(recibo.data_recibo))}.</div>

          <section class="signatures">
            <div class="signature">
              <div class="signature-image">${
                assinaturaDataUrl
                  ? `<img src="${assinaturaDataUrl}" alt="Assinatura do emissor" />`
                  : ""
              }</div>
              <div class="signature-line">
                <div class="signature-name">${escapeHtml(emissorNome)}</div>
                <div>Responsável pelo recebimento</div>
              </div>
            </div>
            <div class="signature">
              <div class="signature-line">
                <div class="signature-name">${escapeHtml(clienteNome)}</div>
                <div>Responsável pelo cliente</div>
              </div>
            </div>
          </section>

          <div class="notice">
            Este recibo comprova o pagamento do valor descrito acima, sem prejuízo das demais condições comerciais, técnicas ou documentais vinculadas ao serviço executado.
          </div>
        </main>
      </body>
    </html>
  `;
};

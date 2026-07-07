import type { EmpresaSupabase } from "@/services/empresasService";
import type { TermoLocacao } from "@/services/utilitariosService";

const ACI_DADOS = {
  nome: "ACI Comercio LTDA",
  cpfCnpj: "71.208.094/0001-37",
  endereco:
    "Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora - MG - CEP 36.080-370",
  telefone: "32 3221-7944",
  celular: "32 98477-7813",
  email: "acicomercio@yahoo.com.br",
};

export const TERMO_LOCACAO_FOOTER_TEXT =
  "ACI Comercio LTDA - Assistência Técnica Hospitalar e Engenharia Clínica - Rua José Martins da Silva, 215 - Cerâmica - Juiz de Fora - MG Cep 36.080-370 - Pabx 32 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

const escapeHtml = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const escapeText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "";
  return escapeHtml(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value || 0));

const getEmpresaNome = (empresa?: EmpresaSupabase | null) =>
  empresa?.nome_fantasia || empresa?.nome || "-";

const getEnderecoEmpresa = (empresa?: EmpresaSupabase | null) =>
  [
    empresa?.rua,
    empresa?.numero,
    empresa?.complemento,
    empresa?.bairro,
    empresa?.cidade,
    empresa?.estado,
    empresa?.cep ? `CEP ${empresa.cep}` : null,
  ]
    .filter(Boolean)
    .join(" - ") || "-";

const getLocadoraNome = (termo: TermoLocacao) =>
  termo.empresa_locadora ? getEmpresaNome(termo.empresa_locadora) : ACI_DADOS.nome;

const getLocadoraDocumento = (termo: TermoLocacao) =>
  termo.empresa_locadora?.cpf_cnpj || ACI_DADOS.cpfCnpj;

const getLocadoraEndereco = (termo: TermoLocacao) =>
  termo.empresa_locadora ? getEnderecoEmpresa(termo.empresa_locadora) : ACI_DADOS.endereco;

const getLocadoraContato = (termo: TermoLocacao) =>
  [
    termo.empresa_locadora?.telefone || ACI_DADOS.telefone,
    termo.empresa_locadora?.celular || ACI_DADOS.celular,
    termo.empresa_locadora?.email || ACI_DADOS.email,
  ]
    .filter(Boolean)
    .join(" | ");

const getEquipamentoNome = (termo: TermoLocacao) => {
  const equipamento = termo.equipamento;
  return (
    equipamento?.tipo_equipamento?.nome ||
    equipamento?.tipo_texto ||
    "Equipamento"
  );
};

const getEquipamentoIdentificacao = (termo: TermoLocacao) =>
  [
    termo.equipamento?.numero_serie
      ? `Série: ${termo.equipamento.numero_serie}`
      : null,
    termo.equipamento?.patrimonio
      ? `Patrimônio: ${termo.equipamento.patrimonio}`
      : null,
    termo.equipamento?.tag ? `TAG: ${termo.equipamento.tag}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "-";

const getModalidade = (termo: TermoLocacao) =>
  termo.modalidade_cobranca === "valor_mensal"
    ? "Valor mensal"
    : termo.tipo === "emprestimo"
      ? "Sem cobrança recorrente"
      : "Valor único";

const getValor = (termo: TermoLocacao) =>
  termo.modalidade_cobranca === "valor_mensal"
    ? `${formatCurrency(termo.valor_mensal)} por mês`
    : formatCurrency(termo.valor_unico);

const buildMensalidadesRows = (termo: TermoLocacao) => {
  if (termo.modalidade_cobranca !== "valor_mensal") return "";

  const rows = (termo.mensalidades || [])
    .map(
      (mensalidade) => `
        <tr>
          <td>${mensalidade.numero_parcela}</td>
          <td>${formatDate(mensalidade.data_vencimento)}</td>
          <td>${formatCurrency(mensalidade.valor)}</td>
          <td>${mensalidade.pago ? "Pago" : "Pendente"}</td>
          <td>${formatDate(mensalidade.data_pagamento)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section>
      <h2>4. Controle de mensalidades</h2>
      <table>
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Pagamento</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">Nenhuma mensalidade cadastrada.</td></tr>'}</tbody>
      </table>
    </section>
  `;
};

const buildClausulas = (termo: TermoLocacao) => {
  const isEmprestimo = termo.tipo === "emprestimo";
  const modalidadeLabel = getModalidade(termo);
  const valorLabel = getValor(termo);

  const clausulas = [
    {
      titulo: "Objeto",
      texto:
        "A ACI entrega ao cliente, em caráter temporário, o equipamento identificado neste termo, juntamente com seus acessórios expressamente relacionados no documento, para uso exclusivo nas atividades informadas pelo cliente e dentro das condições técnicas recomendadas pelo fabricante e pela ACI.",
    },
    {
      titulo: "Prazo e devolução",
      texto: `O uso inicia em ${formatDate(termo.data_inicio)}${
        termo.data_prevista_devolucao
          ? ` e possui previsão de devolução em ${formatDate(termo.data_prevista_devolucao)}`
          : ""
      }. A devolução deverá ocorrer no mesmo estado de conservação em que o equipamento foi recebido, ressalvado o desgaste natural decorrente do uso regular.`,
    },
    {
      titulo: "Condições comerciais",
      texto: isEmprestimo
        ? "Por se tratar de empréstimo, não haverá cobrança de locação, salvo se houver dano, extravio, perda de acessórios, necessidade de reparo decorrente de mau uso, atraso injustificado na devolução ou outra condição específica registrada neste termo."
        : `A modalidade comercial deste termo é ${modalidadeLabel}, com valor de ${valorLabel}. Os valores e vencimentos registrados no sistema prevalecem para controle financeiro e emissão de cobranças relacionadas ao período de uso.`,
    },
    {
      titulo: "Obrigações da ACI",
      texto:
        "A ACI se compromete a disponibilizar o equipamento em condições adequadas de uso, prestar orientações básicas de utilização quando necessário, informar restrições conhecidas de operação e registrar eventual apontamento feito pelo cliente no ato do recebimento ou durante o período de utilização.",
    },
    {
      titulo: "Obrigações do cliente",
      texto:
        "O cliente se responsabiliza pela guarda, conservação e uso correto do equipamento, comprometendo-se a não transferir, emprestar, sublocar, vender, alterar, abrir, violar lacres, remover identificações ou permitir intervenções técnicas de terceiros sem autorização prévia e expressa da ACI.",
    },
    {
      titulo: "Uso adequado e comunicação de falhas",
      texto:
        "O cliente deverá interromper o uso e comunicar imediatamente a ACI em caso de falha, queda, aquecimento anormal, dano aparente, comportamento irregular ou qualquer situação que possa comprometer segurança, desempenho ou integridade do equipamento. A comunicação tempestiva protege o cliente contra agravamento de defeitos não causados por mau uso.",
    },
    {
      titulo: "Responsabilidade por danos e perdas",
      texto:
        "Danos causados por queda, impacto, líquidos, mau uso, transporte inadequado, armazenamento indevido, uso em rede elétrica ou ambiente incompatível, perda, furto, roubo, extravio ou ausência de acessórios poderão ser cobrados do cliente, mediante avaliação técnica e apresentação de proposta ou documento de cobrança correspondente.",
    },
    {
      titulo: "Proteção ao cliente",
      texto:
        "O cliente não será responsabilizado por defeitos preexistentes, vícios ocultos, desgaste natural ou falhas técnicas não decorrentes de uso inadequado, desde que comunique a ACI assim que identificar o problema e preserve o equipamento para avaliação.",
    },
    {
      titulo: "Manutenção e intervenções",
      texto:
        "Qualquer manutenção, calibração, avaliação técnica ou substituição de componentes deverá ser realizada exclusivamente pela ACI ou por terceiro formalmente autorizado. Intervenções não autorizadas poderão gerar cobrança e perda de garantias operacionais aplicáveis.",
    },
    {
      titulo: "Retirada e devolução",
      texto:
        "A retirada, entrega ou devolução deverá ser registrada por responsável identificado. Na devolução, a ACI poderá realizar conferência física e funcional do equipamento, acessórios e condições de conservação, emitindo apontamentos quando houver divergência.",
    },
    {
      titulo: "Dados e confidencialidade",
      texto:
        "As partes se comprometem a utilizar os dados pessoais, comerciais e operacionais relacionados a este termo apenas para execução, controle, cobrança, atendimento técnico e cumprimento de obrigações legais ou regulatórias aplicáveis.",
    },
    {
      titulo: "Disposições gerais",
      texto:
        "Este termo não transfere propriedade do equipamento ao cliente. A tolerância de uma parte quanto ao descumprimento de qualquer obrigação não constitui renúncia de direito. Alterações relevantes deverão ser registradas por escrito ou em documento complementar.",
    },
    {
      titulo: "Foro",
      texto:
        "Para dirimir eventuais controvérsias relacionadas a este termo, as partes elegem o foro da comarca de Juiz de Fora/MG, salvo disposição legal obrigatória em sentido diverso.",
    },
  ];

  return clausulas
    .map(
      (clausula, index) => `
        <div class="clause">
          <h3>${index + 1}. ${escapeHtml(clausula.titulo)}</h3>
          <p>${escapeHtml(clausula.texto)}</p>
        </div>
      `
    )
    .join("");
};

export const buildTermoLocacaoHtml = (
  termo: TermoLocacao,
  logoBase64: string
) => {
  const titulo =
    termo.tipo === "emprestimo"
      ? "Termo de Empréstimo de Equipamento"
      : "Termo de Locação de Equipamento";
  const cliente = termo.empresa_locataria;
  const responsavelCliente =
    termo.responsavel_recebimento || cliente?.contato || "Responsável do cliente";
  const responsavelAci = termo.responsavel_entrega || "Responsável ACI";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 13mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 11.5px;
        line-height: 1.42;
      }
      .document {
        min-height: calc(297mm - 26mm);
        display: flex;
        flex-direction: column;
      }
      header {
        border-top: 4px solid #d71920;
        padding-top: 9px;
        display: grid;
        grid-template-columns: 310px 1fr;
        align-items: start;
        gap: 18px;
        min-height: 96px;
      }
      .logo {
        width: 292px;
        max-height: 86px;
        height: auto;
        object-fit: contain;
        object-position: left top;
      }
      .title { text-align: right; }
      h1 {
        margin: 0;
        color: #111827;
        font-size: 24px;
        line-height: 1.1;
      }
      .document-number {
        margin-top: 6px;
        color: #4b5563;
        font-weight: 700;
      }
      .subtitle {
        margin-top: 4px;
        color: #6b7280;
        font-size: 11px;
      }
      section { margin-top: 14px; break-inside: avoid; }
      h2 {
        margin: 0 0 7px;
        padding-bottom: 4px;
        border-bottom: 1px solid #d1d5db;
        color: #111827;
        font-size: 15px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border: 1px solid #d8dee8;
        border-radius: 6px;
        overflow: hidden;
      }
      .field {
        min-height: 48px;
        padding: 8px 10px;
        border-right: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
      }
      .field.full { grid-column: 1 / -1; }
      .label {
        margin-bottom: 2px;
        color: #6b7280;
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .value {
        color: #111827;
        font-size: 12px;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #d8dee8;
        page-break-inside: auto;
      }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td {
        padding: 7px;
        border: 1px solid #d8dee8;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f3f4f6;
        color: #374151;
        font-size: 9.5px;
        text-transform: uppercase;
      }
      .clause {
        margin-bottom: 8px;
        break-inside: avoid;
      }
      .clause h3 {
        margin: 0 0 3px;
        font-size: 12.2px;
      }
      .clause p {
        margin: 0;
        text-align: justify;
      }
      .observacoes {
        min-height: 58px;
        padding: 10px;
        border: 1px solid #d8dee8;
        border-radius: 6px;
        white-space: pre-wrap;
      }
      .notice {
        margin-top: 10px;
        padding: 9px 10px;
        border-left: 4px solid #d71920;
        background: #fff5f5;
        font-weight: 700;
      }
      .signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 42px;
        margin-top: 76px;
        break-inside: avoid;
      }
      .signature-line {
        min-height: 112px;
        border-top: 1px solid #6b7280;
        padding-top: 10px;
        text-align: center;
      }
      .signature-name {
        font-weight: 700;
      }
      .signature-role {
        color: #6b7280;
        font-size: 10px;
      }
      .date-line {
        margin-top: 20px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="document">
      <header>
        <img class="logo" src="${logoBase64}" />
        <div class="title">
          <h1>${escapeHtml(titulo)}</h1>
          <div class="document-number">Termo Nº ${escapeHtml(termo.numero)}</div>
          <div class="subtitle">Emitido para controle de entrega, uso, guarda e devolução de equipamento.</div>
        </div>
      </header>

      <section>
        <h2>1. Qualificação das partes</h2>
        <div class="grid">
          <div class="field">
            <div class="label">Locadora / cedente</div>
            <div class="value">${escapeHtml(getLocadoraNome(termo))}</div>
          </div>
          <div class="field">
            <div class="label">CPF/CNPJ</div>
            <div>${escapeHtml(getLocadoraDocumento(termo))}</div>
          </div>
          <div class="field full">
            <div class="label">Endereço e contato da locadora / cedente</div>
            <div>${escapeHtml(getLocadoraEndereco(termo))} | ${escapeHtml(getLocadoraContato(termo))}</div>
          </div>
          <div class="field">
            <div class="label">Cliente / recebedor</div>
            <div class="value">${escapeHtml(getEmpresaNome(cliente))}</div>
          </div>
          <div class="field">
            <div class="label">CPF/CNPJ</div>
            <div>${escapeHtml(cliente?.cpf_cnpj)}</div>
          </div>
          <div class="field full">
            <div class="label">Endereço do cliente</div>
            <div>${escapeHtml(getEnderecoEmpresa(cliente))}</div>
          </div>
          <div class="field">
            <div class="label">Contato do cliente</div>
            <div>${escapeHtml([cliente?.telefone, cliente?.celular, cliente?.email].filter(Boolean).join(" | "))}</div>
          </div>
          <div class="field">
            <div class="label">Responsável pelo recebimento</div>
            <div>${escapeHtml(responsavelCliente)}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>2. Equipamento cedido</h2>
        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Fabricante</th>
              <th>Modelo</th>
              <th>Identificação</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(getEquipamentoNome(termo))}</td>
              <td>${escapeHtml(termo.equipamento?.fabricante)}</td>
              <td>${escapeHtml(termo.equipamento?.modelo)}</td>
              <td>${escapeHtml(getEquipamentoIdentificacao(termo))}</td>
              <td>${escapeHtml(termo.equipamento?.status || "Ativo")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. Condições do termo</h2>
        <div class="grid">
          <div class="field">
            <div class="label">Tipo</div>
            <div class="value">${termo.tipo === "emprestimo" ? "Empréstimo" : "Locação"}</div>
          </div>
          <div class="field">
            <div class="label">Modalidade</div>
            <div>${escapeHtml(getModalidade(termo))}</div>
          </div>
          <div class="field">
            <div class="label">Valor</div>
            <div class="value">${escapeHtml(getValor(termo))}</div>
          </div>
          <div class="field">
            <div class="label">Inicio</div>
            <div>${formatDate(termo.data_inicio)}</div>
          </div>
          <div class="field">
            <div class="label">Previsão de devolução</div>
            <div>${formatDate(termo.data_prevista_devolucao)}</div>
          </div>
          <div class="field">
            <div class="label">Local de entrega</div>
            <div>${escapeHtml(termo.local_entrega)}</div>
          </div>
        </div>
      </section>

      ${buildMensalidadesRows(termo)}

      <section>
        <h2>${termo.modalidade_cobranca === "valor_mensal" ? "5" : "4"}. Cláusulas gerais</h2>
        ${buildClausulas(termo)}
      </section>

      <section>
        <h2>Observações complementares</h2>
        <div class="observacoes">${escapeText(termo.observacoes) || "Sem observações complementares."}</div>
        <div class="notice">Ao assinar este termo, as partes declaram ciência das condições de uso, guarda, conservação, pagamento quando aplicável e devolução do equipamento.</div>
      </section>

      <div class="date-line">Juiz de Fora/MG, _____ de __________________ de ________.</div>

      <div class="signatures">
        <div class="signature-line">
          <div class="signature-name">${escapeHtml(responsavelAci)}</div>
          <div class="signature-role">ACI Comercio LTDA</div>
        </div>
        <div class="signature-line">
          <div class="signature-name">${escapeHtml(responsavelCliente)}</div>
          <div class="signature-role">${escapeHtml(getEmpresaNome(cliente))}</div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};

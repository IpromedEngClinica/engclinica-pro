import aciLogo from "@/assets/aci-logo-hd.png";
import type {
  PlanoCicloDetalhes,
  PlanoCicloItem,
  PlanoRelatorioCicloOpcoes,
} from "@/services/planosService";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";
import { assinaturasService } from "@/services/assinaturasService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { calcularValidadeFimDoMes } from "@/utils/planoDatas";
import { getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";

const PLANO_RELATORIO_FOOTER =
  "ACI Comercio LTDA - Assistencia Tecnica Hospitalar e Engenharia Clinica - Rua Jose Martins da Silva, 215 - Ceramica - Juiz de Fora - MG - CEP 36.080-370 - PABX: (32) 3221-7944 - E-mail: acicomercio@yahoo.com.br - CNPJ: 71.208.094/0001-37";

type PreventivaClassificada = {
  item: PlanoCicloItem;
  os: OrdemServicoSupabase | null;
  naoConformes: string[];
  observacoes: string;
  aprovacao: string;
  conforme: boolean;
};

const escapeHtml = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const normalizeRelatorioPlanoFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const equipamentoNome = (item: PlanoCicloItem) =>
  item.equipamento?.tipo_equipamento?.nome ||
  item.equipamento?.tipo_texto ||
  "Equipamento";

const fabricanteModelo = (item: PlanoCicloItem) =>
  [item.equipamento?.fabricante, item.equipamento?.modelo].filter(Boolean).join(" / ") || "-";

const setorNome = (item: PlanoCicloItem) => item.setor?.nome_snapshot || "Sem setor";

const frequenciaLabel = (value?: string | null) =>
  getPlanoFrequenciaLabel(value);

const getChecklist = (os: OrdemServicoSupabase | null) => {
  const checklist = os?.checklist_preventiva;
  if (Array.isArray(checklist)) return checklist[0] || null;
  return checklist || null;
};

const formatAprovacao = (value?: string | null) => {
  const map: Record<string, string> = {
    aprovado: "Aprovado",
    nao_aprovado: "Nao aprovado",
    aprovado_com_restricao: "Aprovado com restricao",
  };
  return value ? map[value] || value : "-";
};

const formatResultadoCalibracao = (value?: string | null) => {
  const map: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Nao conforme",
    sem_declaracao_conformidade: "-",
    sem_criterio: "-",
  };

  return value ? map[value] || value : "-";
};

const classificarPreventiva = (
  item: PlanoCicloItem,
  os: OrdemServicoSupabase | null
): PreventivaClassificada => {
  const checklist = getChecklist(os);
  const itens = checklist?.itens || [];
  const tecnicos = itens.filter((resposta) => resposta.tipo_resposta !== "aprovacao_uso");
  const aprovacao = itens.find((resposta) => resposta.tipo_resposta === "aprovacao_uso");
  const tecnicosNaoConformes = tecnicos.filter((resposta) => resposta.resposta === "nao_conforme");
  const tecnicosOk = tecnicos.length > 0 && tecnicos.every((resposta) =>
    resposta.resposta === "conforme" || resposta.resposta === "nao_aplica"
  );
  const aprovado = aprovacao?.resposta === "aprovado";
  const conforme = Boolean(checklist && tecnicosOk && aprovado && tecnicosNaoConformes.length === 0);

  return {
    item,
    os,
    naoConformes: checklist
      ? tecnicosNaoConformes.map((resposta) => resposta.descricao)
      : ["Checklist nao encontrado"],
    observacoes: [
      checklist?.observacoes,
      ...tecnicosNaoConformes.map((resposta) => resposta.observacao).filter(Boolean),
    ].filter(Boolean).join("; "),
    aprovacao: formatAprovacao(aprovacao?.resposta || checklist?.resultado_geral),
    conforme,
  };
};

const renderRows = (rows: string[][]) =>
  rows.map((row) => `
    <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
  `).join("");

const renderSection = (title: string, headers: string[], rows: string[][]) => {
  if (!rows.length) return "";
  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${renderRows(rows)}</tbody>
    </table>
  `;
};

const proximaVisita = (data: string, frequencia: string) => {
  const mesesPorFrequencia: Record<string, number> = {
    semanal: 0,
    quinzenal: 0,
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    quadrimestral: 4,
    semestral: 6,
    anual: 12,
    bianual: 24,
  };
  const date = new Date(`${data}T00:00:00`);
  if (Number.isNaN(date.getTime())) return data;
  const meses = mesesPorFrequencia[frequencia] ?? 0;
  if (meses > 0) {
    date.setMonth(date.getMonth() + meses);
  } else if (frequencia === "semanal") {
    date.setDate(date.getDate() + 7);
  } else if (frequencia === "quinzenal") {
    date.setDate(date.getDate() + 15);
  }
  return date.toISOString().slice(0, 10);
};

const resultadoPreventiva = (item: PreventivaClassificada) =>
  item.conforme ? "Conforme" : "Nao conforme";

const classificarOsNaoConformidades = (os: OrdemServicoSupabase) => {
  const checklist = getChecklist(os);
  const itens = checklist?.itens || [];
  const naoConformes = itens.filter((item) => item.resposta === "nao_conforme");
  const aprovacao = itens.find((item) => item.tipo_resposta === "aprovacao_uso");
  const reprovado = aprovacao?.resposta === "nao_aprovado";
  return {
    naoConforme: naoConformes.length > 0 || reprovado,
    itensNaoConformes: naoConformes.map((item) => item.descricao),
    observacoes: [
      checklist?.observacoes,
      ...naoConformes.map((item) => item.observacao).filter(Boolean),
    ].filter(Boolean).join("; "),
    aprovacao: formatAprovacao(aprovacao?.resposta || checklist?.resultado_geral),
  };
};

export const gerarPdfRelatorioCicloPlano = async (
  detalhes: PlanoCicloDetalhes,
  opcoes?: Partial<PlanoRelatorioCicloOpcoes> & { save?: boolean }
) => {
  const { plano, ciclo, ordensPreventivas, ordensCorretivas, calibracoes } = detalhes;
  const [logo, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoUsuarioId: plano.responsavel_id,
      tecnicoNome: plano.responsavel?.nome,
      responsavelNome: plano.responsavel?.nome,
      empresaId: plano.empresa_id,
    }),
  ]);
  const assinaturaResponsavel = assinaturas.responsavel || assinaturas.tecnico;
  const itens = ciclo.itens || [];
  const osPorId = new Map(ordensPreventivas.map((os) => [os.id, os]));
  const calibracoesPorId = new Map(calibracoes.map((execucao) => [execucao.id, execucao]));
  const preventivas = itens
    .filter((item) => item.tipo_servico === "preventiva" && item.status === "concluido")
    .map((item) => classificarPreventiva(item, item.os_id ? osPorId.get(item.os_id) || null : null));
  const naoConformes = preventivas.filter((item) => !item.conforme);
  const corretivasClassificadas = ordensCorretivas.map((os) => ({
    os,
    classificacao: classificarOsNaoConformidades(os),
  }));
  const corretivasNaoConformes = corretivasClassificadas.filter((item) => item.classificacao.naoConforme);
  const calibracoesExecutadas = itens
    .filter((item) => item.tipo_servico === "calibracao" && item.status === "concluido" && item.calibracao_execucao_id)
    .map((item) => ({
      item,
      execucao: item.calibracao_execucao_id ? calibracoesPorId.get(item.calibracao_execucao_id) || null : null,
    }));
  const segurancasEletricas = itens.filter((item) =>
    item.tipo_servico === "seguranca_eletrica" && item.status === "concluido"
  );
  const naoLocalizadosPorEquipamento = Array.from(
    itens
      .filter((item) => item.status === "nao_localizado")
      .reduce((map, item) => map.set(item.equipamento_id, item), new Map<string, PlanoCicloItem>())
      .values()
  );
  const equipamentosPrevistos = new Set(itens.map((item) => item.equipamento_id)).size;
  const setores = Array.from(new Set(itens.map(setorNome))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const emitidoEmDate = opcoes?.emitidoEm || new Date().toISOString().slice(0, 10);
  const validadeMeses = Number(opcoes?.validadeMeses || ciclo.relatorio_validade_meses || 12);
  const validadeAte = calcularValidadeFimDoMes(ciclo.data_abertura, validadeMeses);
  const frequenciaPlanoLabel = frequenciaLabel(plano.frequencia);
  const naoConformesTotal = naoConformes.length + corretivasNaoConformes.length;

  const resumoSetores = setores.map((setor) => {
    const itensSetor = itens.filter((item) => setorNome(item) === setor);
    const equipamentos = new Set(itensSetor.map((item) => item.equipamento_id));
    const preventivasSetor = preventivas.filter((item) => setorNome(item.item) === setor);
    const calibracoesSetor = calibracoesExecutadas.filter((item) => setorNome(item.item) === setor);
    const segurancasSetor = segurancasEletricas.filter((item) => setorNome(item) === setor);
    const corretivasSetor = corretivasClassificadas.filter((item) =>
      itensSetor.some((cicloItem) => cicloItem.equipamento_id === item.os.equipamento_id)
    );
    return [
      setor,
      String(equipamentos.size),
      String(preventivasSetor.length),
      String(corretivasSetor.length),
      String(calibracoesSetor.length),
      String(segurancasSetor.length),
      String(preventivasSetor.filter((item) => !item.conforme).length + corretivasSetor.filter((item) => item.classificacao.naoConforme).length),
      String(new Set(itensSetor.filter((item) => item.status === "nao_localizado").map((item) => item.equipamento_id)).size),
    ];
  });

  const preventivasRows = preventivas.map((item, index) => [
    String(index + 1),
    equipamentoNome(item.item),
    fabricanteModelo(item.item),
    item.item.equipamento?.numero_serie || "-",
    item.item.equipamento?.patrimonio || "-",
    setorNome(item.item),
    item.os?.numero ? `OS ${item.os.numero}` : "-",
    formatDateTime(ciclo.data_abertura),
    resultadoPreventiva(item),
  ]);

  const corretivasRows = corretivasClassificadas.map(({ os, classificacao }, index) => [
    String(index + 1),
    os.equipamento?.tipo_equipamento?.nome || os.equipamento?.tipo_texto || "Equipamento",
    [os.equipamento?.fabricante, os.equipamento?.modelo].filter(Boolean).join(" / ") || "-",
    os.equipamento?.numero_serie || "-",
    os.equipamento?.setor || "-",
    os.numero ? `OS ${os.numero}` : "-",
    os.descricao_servico || os.problema_relatado || "-",
    formatDate(os.data_fechamento),
    classificacao.naoConforme ? "Nao conforme" : "Conforme",
  ]);

  const calibracoesRows = calibracoesExecutadas.map(({ item, execucao }, index) => [
    String(index + 1),
    equipamentoNome(item),
    fabricanteModelo(item),
    item.equipamento?.numero_serie || "-",
    item.equipamento?.patrimonio || "-",
    setorNome(item),
    execucao?.numero_certificado || "-",
    formatDate(execucao?.data_calibracao || item.concluido_em),
    formatDate(execucao?.data_validade || execucao?.validade_mes || null),
    formatResultadoCalibracao(execucao?.resultado_geral),
  ]);

  const segurancaRows = segurancasEletricas.map((item, index) => [
    String(index + 1),
    equipamentoNome(item),
    fabricanteModelo(item),
    item.equipamento?.numero_serie || "-",
    item.equipamento?.patrimonio || "-",
    setorNome(item),
    "-",
    formatDate(item.concluido_em),
    "Executado",
  ]);

  const naoConformesRows = [
    ...naoConformes.map((item, index) => [
      String(index + 1),
      equipamentoNome(item.item),
      item.item.equipamento?.numero_serie || "-",
      setorNome(item.item),
      "Preventiva",
      item.os?.numero ? `OS ${item.os.numero}` : "-",
      item.naoConformes.join("; ") || "-",
      item.observacoes || "-",
      item.aprovacao,
    ]),
    ...corretivasNaoConformes.map(({ os, classificacao }, index) => [
      String(naoConformes.length + index + 1),
      os.equipamento?.tipo_equipamento?.nome || os.equipamento?.tipo_texto || "Equipamento",
      os.equipamento?.numero_serie || "-",
      os.equipamento?.setor || "-",
      "Corretiva",
      os.numero ? `OS ${os.numero}` : "-",
      classificacao.itensNaoConformes.join("; ") || "-",
      classificacao.observacoes || "-",
      classificacao.aprovacao,
    ]),
  ];

  const naoLocalizadosRows = naoLocalizadosPorEquipamento.map((item, index) => [
    String(index + 1),
    equipamentoNome(item),
    fabricanteModelo(item),
    item.equipamento?.numero_serie || "-",
    item.equipamento?.patrimonio || "-",
    setorNome(item),
    item.motivo_nao_localizado || "Equipamento nao localizado",
  ]);

  let numeroSecao = 0;
  const secao = (titulo: string, headers: string[], rows: string[][]) => {
    if (!rows.length) return "";
    numeroSecao += 1;
    return renderSection(`${numeroSecao}. ${titulo}`, headers, rows);
  };
  const secoes = [
    secao("Preventivas executadas", ["#", "Equipamento", "Fabricante / Modelo", "N Serie", "Patrimonio", "Setor", "OS", "Data de abertura", "Resultado"], preventivasRows),
    secao("Manutencoes corretivas executadas", ["#", "Equipamento", "Fabricante / Modelo", "N Serie", "Setor", "OS", "Descricao do servico", "Data", "Resultado"], corretivasRows),
    secao("Calibracoes executadas", ["#", "Equipamento", "Fabricante / Modelo", "N Serie", "Patrimonio", "Setor", "Certificado", "Data", "Validade", "Resultado"], calibracoesRows),
    secao("Testes de seguranca eletrica executados", ["#", "Equipamento", "Fabricante / Modelo", "N Serie", "Patrimonio", "Setor", "Certificado", "Data", "Resultado"], segurancaRows),
    secao("Equipamentos nao conformes", ["#", "Equipamento", "N Serie", "Setor", "Servico", "Documento", "Itens nao conformes", "Observacoes", "Aprovacao"], naoConformesRows),
    secao("Equipamentos nao localizados", ["#", "Equipamento", "Fabricante / Modelo", "N Serie", "Patrimonio", "Setor", "Observacao"], naoLocalizadosRows),
    secao("Resumo por setor", ["Setor", "Previstos", "Preventivas", "Corretivas", "Calibracoes", "Seguranca eletrica", "Nao conformes", "Nao localizados"], resumoSetores),
  ].join("");
  const numeroProximaVisita = numeroSecao + 1;

  const html = `
    <div class="document">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #252525; font-family: Arial, sans-serif; }
        .document { width: 1123px; background: #fff; padding: 36px 42px 52px; font-family: Arial, sans-serif; }
        .topbar { height: 7px; background: #b91c1c; margin: -36px -42px 24px; }
        .header { display: grid; grid-template-columns: 240px 1fr; gap: 22px; align-items: center; margin-bottom: 18px; }
        .logo { width: 210px; height: auto; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 24px; letter-spacing: 0; color: #1f2937; }
        .title p { margin: 6px 0 0; font-size: 14px; color: #555; }
        .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 18px; }
        .meta div, .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
        .meta div.validity { background: #fff1f2; border-color: #fecdd3; }
        .label { display: block; color: #6b7280; font-size: 11px; margin-bottom: 3px; text-transform: uppercase; }
        .value { font-size: 13px; font-weight: 700; color: #262626; }
        .cards { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 14px 0 18px; }
        .card strong { display: block; font-size: 22px; margin-top: 4px; }
        .green { border-top: 4px solid #16a34a; }
        .red { border-top: 4px solid #dc2626; }
        .orange { border-top: 4px solid #f59e0b; }
        .gray { border-top: 4px solid #6b7280; }
        h2 { margin: 22px 0 8px; font-size: 16px; color: #1f2937; page-break-after: avoid; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th { text-align: left; background: #f3f4f6; color: #374151; padding: 7px; border-bottom: 1px solid #d1d5db; }
        td { vertical-align: top; padding: 7px; border-bottom: 1px solid #e5e7eb; color: #2f2f2f; }
        .empty { color: #6b7280; text-align: center; padding: 12px; }
        .signature { width: 340px; margin: 34px auto 0; text-align: center; page-break-inside: avoid; }
        .signature-image { height: 72px; display: flex; align-items: flex-end; justify-content: center; }
        .signature-image img { max-width: 300px; max-height: 68px; object-fit: contain; }
        .signature-line { border-top: 1px solid #9ca3af; padding-top: 7px; font-size: 12px; color: #374151; }
        .signature-line strong { display: block; font-size: 13px; color: #1f2937; }
      </style>
      <div class="topbar"></div>
      <section class="header">
        <img class="logo" src="${logo}" />
        <div class="title">
          <h1>RELATORIO DE EXECUCAO DO PLANO</h1>
          <p>Plano: ${escapeHtml(plano.titulo)}</p>
          <p>Ciclo: ${escapeHtml(ciclo.titulo)}</p>
        </div>
      </section>

      <section class="meta">
        <div><span class="label">Cliente</span><span class="value">${escapeHtml(plano.empresa?.nome_fantasia || plano.empresa?.nome)}</span></div>
        <div><span class="label">Unidade</span><span class="value">${escapeHtml(plano.empresa?.cidade || plano.empresa?.estado)}</span></div>
        <div><span class="label">Responsavel</span><span class="value">${escapeHtml(plano.responsavel?.nome)}</span></div>
        <div><span class="label">Emissao</span><span class="value">${formatDate(emitidoEmDate)}</span></div>
        <div class="validity"><span class="label">Validade ate</span><span class="value">${formatDate(validadeAte)}</span></div>
        <div><span class="label">Frequencia</span><span class="value">${escapeHtml(frequenciaPlanoLabel)}</span></div>
      </section>

      <section class="cards">
        <div class="card gray"><span class="label">Equipamentos previstos</span><strong>${equipamentosPrevistos}</strong></div>
        <div class="card gray"><span class="label">Preventivas executadas</span><strong>${preventivas.length}</strong></div>
        <div class="card gray"><span class="label">Corretivas executadas</span><strong>${corretivasClassificadas.length}</strong></div>
        <div class="card gray"><span class="label">Calibracoes executadas</span><strong>${calibracoesExecutadas.length}</strong></div>
        <div class="card gray"><span class="label">Seguranca eletrica</span><strong>${segurancasEletricas.length}</strong></div>
        <div class="card red"><span class="label">Nao conformes</span><strong>${naoConformesTotal}</strong></div>
        <div class="card orange"><span class="label">Nao localizados</span><strong>${naoLocalizadosPorEquipamento.length}</strong></div>
      </section>

      ${secoes}

      <h2>${numeroProximaVisita}. Proxima visita</h2>
      <section class="meta">
        <div><span class="label">Proxima visita prevista</span><span class="value">${formatDate(proximaVisita(ciclo.data_prevista, plano.frequencia))}</span></div>
        <div><span class="label">Frequencia do plano</span><span class="value">${escapeHtml(frequenciaPlanoLabel)}</span></div>
        <div class="validity"><span class="label">Validade do relatorio</span><span class="value">${formatDate(validadeAte)}</span></div>
      </section>

      <section class="signature">
        <div class="signature-image">${assinaturaResponsavel?.dataUrl ? `<img src="${assinaturaResponsavel.dataUrl}" alt="Assinatura do responsavel tecnico">` : ""}</div>
        <div class="signature-line">
          <strong>${escapeHtml(assinaturaResponsavel?.nome || plano.responsavel?.nome)}</strong>
          Responsavel tecnico
        </div>
      </section>

    </div>
  `;

  return renderHtmlToPdf({
    html,
    fileName: `relatorio_plano_${normalizeRelatorioPlanoFileName(plano.titulo)}_${normalizeRelatorioPlanoFileName(ciclo.titulo)}.pdf`,
    save: opcoes?.save ?? true,
    footerText: `${PLANO_RELATORIO_FOOTER} - Gerado em ${formatDateTime(new Date().toISOString())}`,
    footerHeightMm: 16,
  });
};

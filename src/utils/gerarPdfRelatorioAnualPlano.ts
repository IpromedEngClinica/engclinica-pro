import aciLogo from "@/assets/aci-logo-hd.png";
import type {
  PlanoEquipamento,
  PlanoRelatorioAnualDados,
  PlanoTipoServico,
} from "@/services/planosService";
import { imageToDataUrl } from "@/utils/pdfImageUtils";
import { renderHtmlToPdf } from "@/utils/pdfHtmlRenderer";
import { getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";
import { normalizeRelatorioPlanoFileName } from "@/utils/gerarPdfRelatorioCicloPlano";
import { assinaturasService } from "@/services/assinaturasService";

export type GerarRelatorioAnualPlanoOptions = {
  emitidoEm: string;
  validadeAte: string;
  validadeMeses: number;
  incluirPreventiva: boolean;
  incluirCalibracao: boolean;
  incluirSegurancaEletrica: boolean;
  exibirProximaVisita: boolean;
  exibirOcorrencias: boolean;
  agruparPorSetor: boolean;
  save?: boolean;
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

const servicoSigla: Record<PlanoTipoServico, string> = {
  preventiva: "MP",
  calibracao: "CAL",
  seguranca_eletrica: "SE",
};

const servicosEquipamento = (
  equipamento: PlanoEquipamento,
  opcoes: Pick<GerarRelatorioAnualPlanoOptions, "incluirPreventiva" | "incluirCalibracao" | "incluirSegurancaEletrica">
) => [
  opcoes.incluirPreventiva && equipamento.executar_preventiva ? "MP" : null,
  opcoes.incluirCalibracao && equipamento.executar_calibracao ? "CAL" : null,
  opcoes.incluirSegurancaEletrica && equipamento.executar_seguranca_eletrica ? "SE" : null,
].filter(Boolean) as string[];

const equipamentoNome = (item: PlanoEquipamento) =>
  item.equipamento?.tipo_equipamento?.nome || item.equipamento?.tipo_texto || "Equipamento";

const setorNome = (item: PlanoEquipamento) =>
  item.setor?.nome || item.equipamento?.setor || "Sem setor";

const monthKey = (dateIso: string) => dateIso.slice(0, 7);

const itemNaoConforme = (itemIdOs?: string | null) => Boolean(itemIdOs);

const osNaoConforme = (dados: PlanoRelatorioAnualDados, osId?: string | null) => {
  if (!osId) return false;
  const os = dados.detalhesCiclos
    .flatMap((detalhes) => [...detalhes.ordensPreventivas, ...detalhes.ordensCorretivas])
    .find((item) => item.id === osId);
  const checklist = Array.isArray(os?.checklist_preventiva)
    ? os?.checklist_preventiva[0]
    : os?.checklist_preventiva;
  const itens = checklist?.itens || [];
  return itens.some((item) => item.resposta === "nao_conforme" || item.resposta === "nao_aprovado");
};

const buildMarcadores = (
  item: PlanoEquipamento,
  mesKey: string,
  dados: PlanoRelatorioAnualDados,
  opcoes: GerarRelatorioAnualPlanoOptions
) => {
  const marcadores: string[] = [];
  const servicos = servicosEquipamento(item, opcoes);
  const planejado = dados.datasPrevistas.some((data) => monthKey(data) === mesKey);
  const ciclosMes = dados.ciclos.filter((ciclo) => monthKey(ciclo.data_prevista) === mesKey);

  servicos.forEach((servico) => {
    const tipo = servico === "MP" ? "preventiva" : servico === "CAL" ? "calibracao" : "seguranca_eletrica";
    const itensServico = ciclosMes.flatMap((ciclo) => ciclo.itens || []).filter((cicloItem) =>
      cicloItem.equipamento_id === item.equipamento_id && cicloItem.tipo_servico === tipo
    );
    const concluido = itensServico.some((cicloItem) => cicloItem.status === "concluido");
    const aberto = itensServico.some((cicloItem) => cicloItem.status === "aberto" || cicloItem.status === "pendente");
    const naoLocalizado = itensServico.some((cicloItem) => cicloItem.status === "nao_localizado");
    const naoConforme = opcoes.exibirOcorrencias && itensServico.some((cicloItem) => osNaoConforme(dados, cicloItem.os_id));

    if (naoLocalizado) marcadores.push("NL");
    if (concluido) marcadores.push(`${servico}-R`);
    else if (aberto) marcadores.push("EA");
    else if (planejado) marcadores.push(`${servico}-P`);
    if (naoConforme) marcadores.push("NC");
  });

  return Array.from(new Set(marcadores));
};

const chipClass = (marker: string) => {
  if (marker === "NL") return "chip nl";
  if (marker === "NC") return "chip nc";
  if (marker === "EA") return "chip ea";
  if (marker.endsWith("-R")) return "chip r";
  return "chip p";
};

const renderTabela = (
  equipamentos: PlanoEquipamento[],
  dados: PlanoRelatorioAnualDados,
  opcoes: GerarRelatorioAnualPlanoOptions
) => `
  <table>
    <thead>
      <tr>
        <th>#</th><th>Equipamento</th><th>N Serie</th><th>Patrimonio</th><th>Modelo</th><th>Fabricante</th><th>Servicos</th><th>Periodicidade</th>
        ${dados.meses.map((mes) => `<th class="month">${escapeHtml(mes.label)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${equipamentos.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(equipamentoNome(item))}</td>
          <td>${escapeHtml(item.equipamento?.numero_serie)}</td>
          <td>${escapeHtml(item.equipamento?.patrimonio)}</td>
          <td>${escapeHtml(item.equipamento?.modelo)}</td>
          <td>${escapeHtml(item.equipamento?.fabricante)}</td>
          <td>${servicosEquipamento(item, opcoes).map((servico) => `<span class="svc">${servico}</span>`).join("")}</td>
          <td>${escapeHtml(getPlanoFrequenciaLabel(dados.plano.frequencia))}</td>
          ${dados.meses.map((mes) => {
            const marcadores = buildMarcadores(item, mes.key, dados, opcoes);
            return `<td class="month-cell">${marcadores.map((marker) => `<span class="${chipClass(marker)}">${marker}</span>`).join("")}</td>`;
          }).join("")}
        </tr>
      `).join("")}
    </tbody>
  </table>
`;

export const gerarPdfRelatorioAnualPlano = async (
  dados: PlanoRelatorioAnualDados,
  opcoes: GerarRelatorioAnualPlanoOptions
) => {
  const [logo, assinaturas] = await Promise.all([
    imageToDataUrl(aciLogo),
    assinaturasService.resolverDocumento({
      tecnicoUsuarioId: dados.plano.responsavel_id,
      tecnicoNome: dados.plano.responsavel?.nome,
      responsavelNome: dados.plano.responsavel?.nome,
      empresaId: dados.plano.empresa_id,
    }),
  ]);
  const assinaturaResponsavel = assinaturas.responsavel || assinaturas.tecnico;
  const equipamentosOrdenados = [...dados.equipamentos].sort((a, b) => {
    const setorA = setorNome(a);
    const setorB = setorNome(b);
    if (setorA !== setorB) return setorA === "Sem setor" ? 1 : setorA.localeCompare(setorB, "pt-BR");
    return equipamentoNome(a).localeCompare(equipamentoNome(b), "pt-BR");
  });
  const grupos = opcoes.agruparPorSetor
    ? Array.from(new Set(equipamentosOrdenados.map(setorNome))).map((setor) => ({
        setor,
        equipamentos: equipamentosOrdenados.filter((item) => setorNome(item) === setor),
      }))
    : [{ setor: "Equipamentos", equipamentos: equipamentosOrdenados }];
  const proximaAposPeriodo = dados.datasPrevistas.find((data) => data > dados.dataFim) || null;

  const html = `
    <div class="document annual">
      <style>
        * { box-sizing: border-box; }
        .document { width: 1588px; background: #fff; padding: 34px 38px 44px; color: #252525; font-family: Arial, sans-serif; }
        .topbar { height: 7px; background: #b91c1c; margin: -34px -38px 22px; }
        .header { display: grid; grid-template-columns: 240px 1fr; align-items: center; gap: 24px; }
        .logo { width: 210px; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 24px; color: #1f2937; }
        .title p { margin: 5px 0 0; color: #555; font-size: 13px; }
        .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0 16px; }
        .meta div { border: 1px solid #e5e7eb; border-radius: 7px; padding: 8px 10px; background: #fafafa; }
        .meta div.validity { background: #fff1f2; border-color: #fecdd3; }
        .label { display: block; color: #6b7280; font-size: 10px; text-transform: uppercase; }
        .value { display: block; margin-top: 2px; font-size: 12px; font-weight: 700; }
        h2 { margin: 18px 0 8px; font-size: 15px; page-break-after: avoid; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
        th { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 5px 4px; text-align: left; }
        td { border: 1px solid #ececec; padding: 4px; vertical-align: top; overflow-wrap: anywhere; }
        th:nth-child(1), td:nth-child(1) { width: 24px; }
        th:nth-child(2), td:nth-child(2) { width: 118px; }
        th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { width: 70px; }
        th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6) { width: 74px; }
        th:nth-child(7), td:nth-child(7) { width: 56px; }
        th:nth-child(8), td:nth-child(8) { width: 68px; }
        .month { text-align: center; width: 48px; }
        .month-cell { text-align: center; min-height: 24px; }
        .chip, .svc { display: inline-block; margin: 1px; padding: 2px 3px; border-radius: 4px; font-size: 7.5px; font-weight: 700; white-space: nowrap; }
        .svc { background: #eef2ff; color: #3730a3; }
        .p { background: #dbeafe; color: #1e40af; }
        .r { background: #dcfce7; color: #166534; }
        .ea { background: #fef3c7; color: #92400e; }
        .nc { background: #fee2e2; color: #991b1b; }
        .nl { background: #ffedd5; color: #9a3412; }
        .legend { display: grid; grid-template-columns: repeat(5, auto); gap: 8px 16px; justify-content: start; margin-top: 14px; font-size: 11px; }
        .next { margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fafafa; font-size: 12px; }
        .signature { width: 340px; margin: 26px auto 0; text-align: center; page-break-inside: avoid; }
        .signature-image { height: 66px; display: flex; align-items: flex-end; justify-content: center; }
        .signature-image img { max-width: 300px; max-height: 62px; object-fit: contain; }
        .signature-line { border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; color: #374151; }
        .signature-line strong { display: block; font-size: 12px; color: #1f2937; }
      </style>
      <div class="topbar"></div>
      <section class="header">
        <img class="logo" src="${logo}" />
        <div class="title">
          <h1>CRONOGRAMA ANUAL DO PLANO DE MANUTENCAO</h1>
          <p>Plano: ${escapeHtml(dados.plano.titulo)}</p>
          <p>Periodo: ${formatDate(dados.dataInicio)} a ${formatDate(dados.dataFim)}</p>
        </div>
      </section>
      <section class="meta">
        <div><span class="label">Cliente</span><span class="value">${escapeHtml(dados.plano.empresa?.nome_fantasia || dados.plano.empresa?.nome)}</span></div>
        <div><span class="label">Setor ou unidade</span><span class="value">${escapeHtml(dados.plano.empresa?.cidade || dados.plano.empresa?.estado)}</span></div>
        <div><span class="label">Responsavel tecnico</span><span class="value">${escapeHtml(dados.plano.responsavel?.nome)}</span></div>
        <div><span class="label">Quantidade</span><span class="value">${dados.equipamentos.length}</span></div>
        <div><span class="label">Data de emissao</span><span class="value">${formatDate(opcoes.emitidoEm)}</span></div>
        <div class="validity"><span class="label">Validade ate</span><span class="value">${formatDate(opcoes.validadeAte)}</span></div>
        <div><span class="label">Frequencia</span><span class="value">${escapeHtml(getPlanoFrequenciaLabel(dados.plano.frequencia))}</span></div>
      </section>
      ${grupos.map((grupo) => `
        <h2>Setor: ${escapeHtml(grupo.setor)}</h2>
        ${renderTabela(grupo.equipamentos, dados, opcoes)}
      `).join("")}
      <h2>Legenda</h2>
      <div class="legend">
        <span><b>MP</b> = Manutencao Preventiva</span>
        <span><b>CAL</b> = Calibracao</span>
        <span><b>SE</b> = Seguranca Eletrica</span>
        <span><b>P</b> = Previsto</span>
        <span><b>R</b> = Realizado</span>
        <span><b>EA</b> = Em andamento</span>
        <span><b>NC</b> = Nao conformidade</span>
        <span><b>NL</b> = Nao localizado</span>
      </div>
      ${opcoes.exibirProximaVisita && proximaAposPeriodo ? `<div class="next"><b>Proxima visita prevista:</b> ${formatDate(proximaAposPeriodo)}</div>` : ""}
      <section class="signature">
        <div class="signature-image">${assinaturaResponsavel?.dataUrl ? `<img src="${assinaturaResponsavel.dataUrl}" alt="Assinatura do responsavel tecnico">` : ""}</div>
        <div class="signature-line">
          <strong>${escapeHtml(assinaturaResponsavel?.nome || dados.plano.responsavel?.nome)}</strong>
          Responsavel tecnico
        </div>
      </section>
    </div>
  `;

  return renderHtmlToPdf({
    html,
    fileName: `relatorio_anual_${normalizeRelatorioPlanoFileName(dados.plano.titulo)}_${dados.dataInicio}_${dados.dataFim}.pdf`,
    orientation: "l",
    save: opcoes.save ?? true,
  });
};

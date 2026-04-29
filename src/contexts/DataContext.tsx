import { createContext, useContext, useState, ReactNode } from "react";

const initialTipos = [
  "Monitor Multiparâmetro",
  "Ventilador Pulmonar",
  "Bisturi Elétrico",
  "Desfibrilador",
  "Bomba De Infusão",
];

const initialTiposOS = [
  "Manutenção Preventiva",
  "Calibração",
  "Manutenção Corretiva",
  "Visita Técnica",
  "Teste De Segurança Elétrica",
  "Instalação",
  "Certificação",
  "Garantia De Serviço",
  "Garantia De Fábrica",
  "Entrada De Equipamentos",
  "Orçamentar",
  "Orçamento Não Aprovado",
  "Reparo Externo",
  "Laudo De Obsolescência",
  "Devolução Sem Reparo",
  "Despesas",
  "Qualificação Térmica",
];

const initialEstadosOS = [
  "Aberta",
  "Fechada",
  "Cancelada",
  "Aguardando Peças",
  "Aguardando Aprovação Do Orçamento",
  "Serviço Finalizado",
  "Análise Completa",
  "Reparo Externo",
  "Orçamento Aprovado",
  "Entrada De Equipamentos Para Orçamento",
  "Orçamento Não Aprovado",
  "Liberado Para Entrega",
  "Enviado Para Autorizada",
  "Garantia De Serviço",
  "Garantia De Fábrica",
];

const initialPecas = [
  "Bateria",
  "Sensor SpO2",
  "Cabo De Força",
  "Filtro HEPA",
  "Válvula Reguladora",
];

const initialProtocolos: string[] = [];

export interface Empresa {
  id: number;
  nome: string;
  nomeFantasia: string;
  cpfCnpj: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contato: string;
  email: string;
  celular: string;
  telefone: string;
}

export interface Equipamento {
  id: number;
  tipo: string;
  fabricante: string;
  modelo: string;
  status: string;
  empresa: string;
  serie: string;
  patrimonio: string;
  setor: string;
  tag: string;
}

export interface OrdemServico {
  id: number;
  numero: string;
  dataCriacao: string;
  estado: string;
  responsavelTecnico: string;
  solicitante: string;
  equipamentoId: number | null;
  tipoServico: string;
  origemProblema: string;
  descricaoServico: string;
  acessorios: string[];
  observacoes: string;
}

export interface OrcamentoItemPeca {
  peca: string;
  quantidade: number;
  valorUnitario: number;
  garantiaDias: number;
}

export interface OrcamentoItemServico {
  tipoServico: string;
  tipoEquipamento: string;
  quantidade: number;
  valorUnitario: number;
  garantiaDias: number;
}

export type OrcamentoTipo = "Serviço" | "Peças" | "Peças + Serviços";
export type FormaPagamento = "Dinheiro" | "Cartão" | "Boleto" | "Pix";
export type ModoPagamento = "À vista" | "Parcelado" | "Entrada + Parcela";
export type TipoFrete = "CIF" | "FOB";
export type OrcamentoStatus = "Pendente" | "Aprovado" | "Reprovado" | "Faturado" | "Cancelado";

export const ORCAMENTO_STATUS: OrcamentoStatus[] = ["Pendente", "Aprovado", "Reprovado", "Faturado", "Cancelado"];

export interface ProtocoloRecolhimento {
  id: number;
  numero: string;
  dataCriacao: string;
  equipamentoId: number;
  empresa: string;
  recolhidoPor: string;
  defeitoRelatado: string;
  acessorios: string[];
  osId: number | null;
  osNumero: string;
}

export interface Orcamento {
  id: number;
  numero: string;
  osId: number | null;
  dataCriacao: string;
  tipo: OrcamentoTipo;
  solicitante: string;
  pecas: OrcamentoItemPeca[];
  servicos: OrcamentoItemServico[];
  formaPagamento: FormaPagamento;
  modoPagamento: ModoPagamento;
  numeroParcelas: number;
  valorEntrada: number;
  prazoEntrega: string;
  validadeDias: number;
  frete: TipoFrete;
  detalhes: string;
  responsavelOrcamentista: string;
  status: OrcamentoStatus;
  identificador: string;
}

const initialEmpresas: Empresa[] = [
  { id: 1, nome: "Hospital São Lucas", nomeFantasia: "São Lucas", cpfCnpj: "12.345.678/0001-01", cep: "01310-100", rua: "Av. Paulista", numero: "1000", complemento: "", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP", contato: "João Silva", email: "contato@saolucas.com", celular: "(11) 99999-1111", telefone: "(11) 3333-1111" },
  { id: 2, nome: "Clínica Santa Maria", nomeFantasia: "Santa Maria", cpfCnpj: "98.765.432/0001-02", cep: "20040-020", rua: "Rua da Assembleia", numero: "200", complemento: "Sala 5", bairro: "Centro", cidade: "Rio de Janeiro", estado: "RJ", contato: "Maria Souza", email: "admin@santamaria.com", celular: "(21) 98888-2222", telefone: "(21) 2222-2222" },
  { id: 3, nome: "Hospital Regional", nomeFantasia: "HR", cpfCnpj: "11.222.333/0001-03", cep: "30130-010", rua: "Av. Afonso Pena", numero: "500", complemento: "", bairro: "Centro", cidade: "Belo Horizonte", estado: "MG", contato: "Carlos Lima", email: "contato@hregional.com", celular: "(31) 97777-3333", telefone: "(31) 3333-3333" },
  { id: 4, nome: "UPA Centro", nomeFantasia: "UPA", cpfCnpj: "44.555.666/0001-04", cep: "80010-000", rua: "Rua XV de Novembro", numero: "100", complemento: "", bairro: "Centro", cidade: "Curitiba", estado: "PR", contato: "Ana Costa", email: "upa@centro.com", celular: "(41) 96666-4444", telefone: "(41) 4444-4444" },
  { id: 5, nome: "Clínica Vida", nomeFantasia: "Vida", cpfCnpj: "77.888.999/0001-05", cep: "90010-150", rua: "Rua dos Andradas", numero: "300", complemento: "", bairro: "Centro Histórico", cidade: "Porto Alegre", estado: "RS", contato: "Pedro Santos", email: "vida@clinica.com", celular: "(51) 95555-5555", telefone: "(51) 5555-5555" },
];

const initialEquipamentos: Equipamento[] = [
  { id: 1, tipo: "Monitor Multiparâmetro", fabricante: "Philips", modelo: "MX800", serie: "SN-001234", empresa: "Hospital São Lucas", status: "Ativo", tag: "TAG-001", patrimonio: "PAT-001", setor: "UTI" },
  { id: 2, tipo: "Ventilador Pulmonar", fabricante: "Dräger", modelo: "Savina 300", serie: "SN-005678", empresa: "Clínica Santa Maria", status: "Em manutenção", tag: "TAG-002", patrimonio: "PAT-002", setor: "Centro Cirúrgico" },
  { id: 3, tipo: "Bisturi Elétrico", fabricante: "WEM", modelo: "SS-501", serie: "SN-009012", empresa: "Hospital Regional", status: "Ativo", tag: "TAG-003", patrimonio: "PAT-003", setor: "Bloco Cirúrgico" },
  { id: 4, tipo: "Desfibrilador", fabricante: "CMOS Drake", modelo: "Life 400", serie: "SN-003456", empresa: "UPA Centro", status: "Desativado", tag: "TAG-004", patrimonio: "PAT-004", setor: "Emergência" },
  { id: 5, tipo: "Bomba de Infusão", fabricante: "B.Braun", modelo: "Infusomat", serie: "SN-007890", empresa: "Hospital São Lucas", status: "Ativo", tag: "TAG-005", patrimonio: "PAT-005", setor: "UTI" },
];

interface DataContextType {
  tipos: string[];
  addTipo: (tipo: string) => void;
  removeTipo: (index: number) => void;
  empresasList: Empresa[];
  empresas: string[];
  addEmpresa: (e: Omit<Empresa, "id">) => void;
  updateEmpresa: (id: number, e: Omit<Empresa, "id">) => void;
  equipamentos: Equipamento[];
  addEquipamento: (eq: Omit<Equipamento, "id">) => void;
  updateEquipamento: (id: number, eq: Omit<Equipamento, "id">) => void;
  tiposOS: string[];
  addTipoOS: (tipo: string) => void;
  removeTipoOS: (index: number) => void;
  estadosOS: string[];
  addEstadoOS: (estado: string) => void;
  removeEstadoOS: (index: number) => void;
  pecas: string[];
  addPeca: (peca: string) => void;
  removePeca: (index: number) => void;
  protocolos: string[];
  addProtocolo: (item: string) => void;
  removeProtocolo: (index: number) => void;
  protocolosRecolhimento: ProtocoloRecolhimento[];
  addProtocoloRecolhimento: (data: {
    equipamentoId: number;
    empresa: string;
    recolhidoPor: string;
    defeitoRelatado: string;
    acessorios: string[];
  }) => ProtocoloRecolhimento;
  ordensServico: OrdemServico[];
  addOrdemServico: (os: Omit<OrdemServico, "id" | "numero">) => void;
  updateOrdemServico: (id: number, os: Omit<OrdemServico, "id" | "numero">) => void;
  nextOSNumber: () => string;
  orcamentos: Orcamento[];
  addOrcamento: (orc: Omit<Orcamento, "id">) => void;
  updateOrcamento: (id: number, orc: Omit<Orcamento, "id">) => void;
  updateOrcamentoStatus: (id: number, status: OrcamentoStatus) => void;
  buildOrcamentoNumero: (osNumero?: string | null) => string;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [tipos, setTipos] = useState<string[]>(initialTipos);
  const [empresasList, setEmpresasList] = useState<Empresa[]>(initialEmpresas);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(initialEquipamentos);
  const [tiposOS, setTiposOS] = useState<string[]>(initialTiposOS);
  const [estadosOS, setEstadosOS] = useState<string[]>(
    [...initialEstadosOS].sort((a, b) => a.localeCompare(b, "pt-BR"))
  );
  const [pecas, setPecas] = useState<string[]>(initialPecas);
  const [protocolos, setProtocolos] = useState<string[]>(initialProtocolos);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [osCounter, setOsCounter] = useState(1);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [orcCounter, setOrcCounter] = useState(1);
  const [protocolosRecolhimento, setProtocolosRecolhimento] = useState<ProtocoloRecolhimento[]>([]);
  const [protocoloCounter, setProtocoloCounter] = useState(1);

  const addTipo = (tipo: string) => setTipos((prev) => [...prev, tipo]);
  const removeTipo = (index: number) => setTipos((prev) => prev.filter((_, i) => i !== index));

  const addEmpresa = (e: Omit<Empresa, "id">) => {
    setEmpresasList((prev) => [...prev, { ...e, id: Date.now() }]);
  };
  const updateEmpresa = (id: number, e: Omit<Empresa, "id">) => {
    setEmpresasList((prev) => prev.map((it) => (it.id === id ? { ...e, id } : it)));
  };

  const addEquipamento = (eq: Omit<Equipamento, "id">) => {
    setEquipamentos((prev) => [...prev, { ...eq, id: Date.now() }]);
  };
  const updateEquipamento = (id: number, eq: Omit<Equipamento, "id">) => {
    setEquipamentos((prev) => prev.map((it) => (it.id === id ? { ...eq, id } : it)));
  };

  const addTipoOS = (tipo: string) => setTiposOS((prev) => [...prev, tipo]);
  const removeTipoOS = (index: number) => setTiposOS((prev) => prev.filter((_, i) => i !== index));

  const addEstadoOS = (estado: string) =>
    setEstadosOS((prev) => [...prev, estado].sort((a, b) => a.localeCompare(b, "pt-BR")));
  const removeEstadoOS = (index: number) => setEstadosOS((prev) => prev.filter((_, i) => i !== index));

  const addPeca = (peca: string) => setPecas((prev) => [...prev, peca]);
  const removePeca = (index: number) => setPecas((prev) => prev.filter((_, i) => i !== index));

  const addProtocolo = (item: string) => setProtocolos((prev) => [...prev, item]);
  const removeProtocolo = (index: number) =>
    setProtocolos((prev) => prev.filter((_, i) => i !== index));

  const nextOSNumber = () => {
    const year = new Date().getFullYear();
    return `OS-${year}-${String(osCounter).padStart(4, "0")}`;
  };

  const addOrdemServico = (os: Omit<OrdemServico, "id" | "numero">) => {
    const numero = nextOSNumber();
    setOrdensServico((prev) => [...prev, { ...os, id: Date.now(), numero }]);
    setOsCounter((c) => c + 1);
  };
  const updateOrdemServico = (id: number, os: Omit<OrdemServico, "id" | "numero">) => {
    setOrdensServico((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...os } : it))
    );
  };

  const addProtocoloRecolhimento = (data: {
    equipamentoId: number;
    empresa: string;
    recolhidoPor: string;
    defeitoRelatado: string;
    acessorios: string[];
  }) => {
    const year = new Date().getFullYear();
    const numero = `PR-${year}-${String(protocoloCounter).padStart(4, "0")}`;
    const osNumero = nextOSNumber();
    const osId = Date.now();
    const dataCriacao = new Date().toISOString();

    const novaOS: OrdemServico = {
      id: osId,
      numero: osNumero,
      dataCriacao,
      estado: "Entrada De Equipamentos Para Orçamento",
      responsavelTecnico: "",
      solicitante: data.empresa,
      equipamentoId: data.equipamentoId,
      tipoServico: "Entrada De Equipamentos",
      origemProblema: data.defeitoRelatado,
      descricaoServico: `Protocolo de Recolhimento ${numero}\nRecolhido por: ${data.recolhidoPor}\nDefeito relatado: ${data.defeitoRelatado}`,
      acessorios: data.acessorios,
      observacoes: "",
    };
    setOrdensServico((prev) => [...prev, novaOS]);
    setOsCounter((c) => c + 1);

    const protocolo: ProtocoloRecolhimento = {
      id: Date.now() + 1,
      numero,
      dataCriacao,
      equipamentoId: data.equipamentoId,
      empresa: data.empresa,
      recolhidoPor: data.recolhidoPor,
      defeitoRelatado: data.defeitoRelatado,
      acessorios: data.acessorios,
      osId,
      osNumero,
    };
    setProtocolosRecolhimento((prev) => [...prev, protocolo]);
    setProtocoloCounter((c) => c + 1);
    return protocolo;
  };

  const buildOrcamentoNumero = (osNumero?: string | null) => {
    if (osNumero) return osNumero.replace(/^OS-/, "ORC-");
    const year = new Date().getFullYear();
    return `ORC-${year}-${String(orcCounter).padStart(4, "0")}`;
  };

  const addOrcamento = (orc: Omit<Orcamento, "id">) => {
    setOrcamentos((prev) => [...prev, { ...orc, id: Date.now() }]);
    if (!orc.osId) setOrcCounter((c) => c + 1);
  };
  const updateOrcamento = (id: number, orc: Omit<Orcamento, "id">) => {
    setOrcamentos((prev) => prev.map((it) => (it.id === id ? { ...orc, id } : it)));
  };
  const updateOrcamentoStatus = (id: number, status: OrcamentoStatus) => {
    setOrcamentos((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  };

  return (
    <DataContext.Provider
      value={{
        tipos,
        addTipo,
        removeTipo,
        empresasList,
        empresas: empresasList.map((e) => e.nome),
        addEmpresa,
        updateEmpresa,
        equipamentos,
        addEquipamento,
        updateEquipamento,
        tiposOS,
        addTipoOS,
        removeTipoOS,
        estadosOS,
        addEstadoOS,
        removeEstadoOS,
        pecas,
        addPeca,
        removePeca,
        protocolos,
        addProtocolo,
        removeProtocolo,
        protocolosRecolhimento,
        addProtocoloRecolhimento,
        ordensServico,
        addOrdemServico,
        updateOrdemServico,
        nextOSNumber,
        orcamentos,
        addOrcamento,
        updateOrcamento,
        updateOrcamentoStatus,
        buildOrcamentoNumero,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

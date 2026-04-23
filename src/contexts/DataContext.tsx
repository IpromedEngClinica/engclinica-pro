import { createContext, useContext, useState, ReactNode } from "react";

const initialTipos = [
  "Monitor Multiparâmetro",
  "Ventilador Pulmonar",
  "Bisturi Elétrico",
  "Desfibrilador",
  "Bomba De Infusão",
];

const initialEmpresas = [
  "Hospital São Lucas",
  "Clínica Santa Maria",
  "Hospital Regional",
  "UPA Centro",
  "Clínica Vida",
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
  dataCriacao: string; // ISO datetime-local string
  estado: string;
  responsavelTecnico: string;
  solicitante: string; // empresa
  equipamentoId: number | null;
  tipoServico: string;
  origemProblema: string;
  descricaoServico: string;
  acessorios: string[];
  observacoes: string;
}

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
  empresas: string[];
  equipamentos: Equipamento[];
  addEquipamento: (eq: Omit<Equipamento, "id">) => void;
  tiposOS: string[];
  addTipoOS: (tipo: string) => void;
  removeTipoOS: (index: number) => void;
  estadosOS: string[];
  addEstadoOS: (estado: string) => void;
  removeEstadoOS: (index: number) => void;
  ordensServico: OrdemServico[];
  addOrdemServico: (os: Omit<OrdemServico, "id" | "numero">) => void;
  nextOSNumber: () => string;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [tipos, setTipos] = useState<string[]>(initialTipos);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(initialEquipamentos);
  const [tiposOS, setTiposOS] = useState<string[]>(initialTiposOS);
  const [estadosOS, setEstadosOS] = useState<string[]>(initialEstadosOS);

  const addTipo = (tipo: string) => setTipos((prev) => [...prev, tipo]);
  const removeTipo = (index: number) => setTipos((prev) => prev.filter((_, i) => i !== index));

  const addEquipamento = (eq: Omit<Equipamento, "id">) => {
    setEquipamentos((prev) => [...prev, { ...eq, id: Date.now() }]);
  };

  const addTipoOS = (tipo: string) => setTiposOS((prev) => [...prev, tipo]);
  const removeTipoOS = (index: number) => setTiposOS((prev) => prev.filter((_, i) => i !== index));

  const addEstadoOS = (estado: string) => setEstadosOS((prev) => [...prev, estado]);
  const removeEstadoOS = (index: number) => setEstadosOS((prev) => prev.filter((_, i) => i !== index));

  return (
    <DataContext.Provider
      value={{
        tipos,
        addTipo,
        removeTipo,
        empresas: initialEmpresas,
        equipamentos,
        addEquipamento,
        tiposOS,
        addTipoOS,
        removeTipoOS,
        estadosOS,
        addEstadoOS,
        removeEstadoOS,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

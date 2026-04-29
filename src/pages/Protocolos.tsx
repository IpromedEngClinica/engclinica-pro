import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const Protocolos = () => {
  const { protocolos, addProtocolo, removeProtocolo } = useData();
  return (
    <CamposGerenciaisList
      title="Protocolos"
      description="Gerencie os tipos de protocolos disponíveis (recolhimento, entrega, etc.)"
      items={protocolos}
      onAdd={addProtocolo}
      onRemove={removeProtocolo}
      placeholder="Novo protocolo..."
      itemLabel="Protocolo"
    />
  );
};

export default Protocolos;

import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const TiposEquipamento = () => {
  const { tipos, addTipo, removeTipo, renameTipo } = useData();
  return (
    <CamposGerenciaisList
      title="Tipos de Equipamento"
      description="Gerencie os tipos de equipamento disponíveis no sistema"
      items={tipos}
      onAdd={addTipo}
      onRemove={removeTipo}
      onRename={renameTipo}
      placeholder="Novo tipo de equipamento..."
      itemLabel="Tipo de equipamento"
    />
  );
};

export default TiposEquipamento;

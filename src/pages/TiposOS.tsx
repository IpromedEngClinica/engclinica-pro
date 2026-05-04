import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const TiposOS = () => {
  const { tiposOS, addTipoOS, removeTipoOS, renameTipoOS } = useData();
  return (
    <CamposGerenciaisList
      title="Tipos de OS"
      description="Gerencie os tipos de ordem de serviço disponíveis no sistema"
      items={tiposOS}
      onAdd={addTipoOS}
      onRemove={removeTipoOS}
      onRename={renameTipoOS}
      placeholder="Novo tipo de OS..."
      itemLabel="Tipo de OS"
    />
  );
};

export default TiposOS;

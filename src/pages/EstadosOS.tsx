import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const EstadosOS = () => {
  const { estadosOS, addEstadoOS, removeEstadoOS, renameEstadoOS } = useData();
  return (
    <CamposGerenciaisList
      title="Estados da OS"
      description="Gerencie os estados das ordens de serviço disponíveis no sistema"
      items={estadosOS}
      onAdd={addEstadoOS}
      onRemove={removeEstadoOS}
      onRename={renameEstadoOS}
      placeholder="Novo estado da OS..."
      itemLabel="Estado da OS"
    />
  );
};

export default EstadosOS;

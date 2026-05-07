import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const EstadosOS = () => {
  const { estadosOS, addEstadoOS, removeEstadoOS, renameEstadoOS, ordensServico } = useData();
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
      canRemove={(index) => {
        const nome = estadosOS[index];
        const usados = ordensServico.filter((o) => o.estado === nome).length;
        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} OS com este estado. Renomeie ou altere-as antes.`,
          };
        }
        return { ok: true };
      }}
    />
  );
};

export default EstadosOS;

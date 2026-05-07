import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const TiposEquipamento = () => {
  const { tipos, addTipo, removeTipo, renameTipo, equipamentos } = useData();
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
      canRemove={(index) => {
        const nome = tipos[index];
        const usados = equipamentos.filter((e) => e.tipo === nome).length;
        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} equipamento(s) usando este tipo. Renomeie ou remova-os antes.`,
          };
        }
        return { ok: true };
      }}
    />
  );
};

export default TiposEquipamento;

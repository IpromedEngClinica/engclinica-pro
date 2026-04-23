import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const Pecas = () => {
  const { pecas, addPeca, removePeca } = useData();
  return (
    <CamposGerenciaisList
      title="Peças"
      description="Gerencie as peças disponíveis para uso em orçamentos"
      items={pecas}
      onAdd={addPeca}
      onRemove={removePeca}
      placeholder="Nova peça..."
      itemLabel="Peça"
    />
  );
};

export default Pecas;

import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const Pecas = () => {
  const { pecas, addPeca, removePeca, renamePeca, orcamentos } = useData();
  return (
    <CamposGerenciaisList
      title="Peças"
      description="Gerencie as peças disponíveis para uso em orçamentos"
      items={pecas}
      onAdd={addPeca}
      onRemove={removePeca}
      onRename={renamePeca}
      placeholder="Nova peça..."
      itemLabel="Peça"
      canRemove={(index) => {
        const nome = pecas[index];
        const usados = orcamentos.reduce(
          (acc, o) => acc + o.pecas.filter((p) => p.peca === nome).length,
          0,
        );
        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} item(ns) de orçamento usando esta peça. Renomeie ou remova-os antes.`,
          };
        }
        return { ok: true };
      }}
    />
  );
};

export default Pecas;
